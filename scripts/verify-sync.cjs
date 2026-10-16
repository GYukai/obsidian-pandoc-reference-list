// Exercise the installed plugin's actual sync functions without changing Zotero.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const helpers = fs.readFileSync(path.join(root, 'src/bib/helpers.ts'), 'utf8');
const managerSource = fs.readFileSync(path.join(root, 'src/bib/bibManager.ts'), 'utf8');
function section(source, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a);
  return source.slice(a, b);
}
function transpile(source) {
  return esbuild.transformSync(source, {loader:'ts', target:'es2020'}).code;
}
function harness({online = true, checkpoint = 1799913600000, exportError = false, invalidExport = false} = {}) {
  const start = 1800000000000;
  let now = start, downloads = 0, query;
  const files = new Map([['/cache/zotero-library-1.json', JSON.stringify([{id: 'existing'}])]]);
  const context = vm.createContext({
    Date: class extends Date { static now() { return now; } },
    console: {...console, warn() {}}, Pi: 23119,
    he(self, args, gen) {
      const iterator = gen.apply(self, args || []);
      return new Promise((resolve, reject) => {
        function step(action, value) {
          let result;
          try { result = iterator[action](value); } catch (error) { reject(error); return; }
          if (result.done) resolve(result.value);
          else Promise.resolve(result.value).then(v => step('next', v), e => step('throw', e));
        }
        step('next');
      });
    },
    ca: async () => online, al() {},
    la: {default: path},
    ot: {default: {
      existsSync: p => files.has(p),
      readFileSync: p => Buffer.from(files.get(p)),
      writeFileSync: (p, text) => files.set(p, text),
    }},
    Bh: {default: async url => {
      // The legacy endpoint was verified to return 404 with local BBT 9.0.63.
      if (url !== 'http://127.0.0.1:23119/better-bibtex/export?/library;id:1/library.json') throw new Error('HTTP 404');
      downloads++; now += 5000;
      if (exportError) throw new Error('HTTP 503');
      if (invalidExport) return '{"error":"export unavailable"}';
      return JSON.stringify([{id: 'existing'}, {id: 'new-paper'}]);
    }},
    Uh: (items, groupID) => items.map(item => ({...item, groupID})),
    EE: async (port, cache, group, since) => {
      query = {group, since}; now += 5000;
      const item = {id: 'new-paper'};
      return {list: [{id: 'existing'}, item], modified: new Map([[item.id, item]])};
    },
  });
  Object.assign(context, {
    DEFAULT_ZOTERO_PORT:23119, isZoteroRunning:context.ca, ensureDir:context.al,
    path, fs:context.ot.default, download:context.Bh.default, applyGroupID:context.Uh,
    refreshZBib:context.EE,
  });
  vm.runInContext(transpile(section(helpers, 'export async function getZBib(', 'export async function refreshZBib(').replace('export ','')),context);
  const manager = vm.runInContext(transpile('class Manager {' + section(managerSource, '  async loadGlobalZBib(', '  buildEngine(') + '}') + ';new Manager()', context);
  Object.assign(manager, {
    plugin: {settings: {zoteroGroups: [{id: 1, lastUpdate: checkpoint}]}, cacheDir: '/cache', saveSettings() {}, processReferences() {}},
    bibCache: new Map(), fileCache: new Map(), styleCache: new Map(),
    setFuse() {}, updateFuse() {}, async getLangAndStyle() {},
  });
  return {manager, start, files, stats: () => ({downloads, query})};
}
const tests = [
  ['startup preserves the cached checkpoint and recovers a previously added paper', async () => {
    const h = harness(), m = h.manager, checkpoint = m.plugin.settings.zoteroGroups[0].lastUpdate;
    await m.loadGlobalZBib(true);
    assert.equal(m.plugin.settings.zoteroGroups[0].lastUpdate, checkpoint);
    assert.equal(h.stats().downloads, 0);
    await m.refreshGlobalZBib();
    assert.equal(h.stats().query.since, checkpoint);
    assert(m.bibCache.has('new-paper'));
  }],
  ['offline cache loading does not advance the checkpoint', async () => {
    const h = harness({online: false}), m = h.manager;
    const checkpoint = m.plugin.settings.zoteroGroups[0].lastUpdate;
    await m.loadGlobalZBib(false);
    assert.equal(m.plugin.settings.zoteroGroups[0].lastUpdate, checkpoint);
    assert(m.bibCache.has('existing'));
    assert.equal(h.stats().downloads, 0);
  }],
  ['full export checkpoints before the request, with a one-second overlap', async () => {
    const h = harness(), m = h.manager;
    await m.loadGlobalZBib(false);
    assert.equal(h.stats().downloads, 1);
    assert(m.bibCache.has('new-paper'));
    assert.equal(m.plugin.settings.zoteroGroups[0].lastUpdate, h.start - 1000);
    assert.equal(JSON.parse(h.files.get('/cache/zotero-library-1.json')).length, 2);
  }],
  ['incremental sync does not skip modifications made during its request', async () => {
    const h = harness(), m = h.manager;
    await m.refreshGlobalZBib();
    assert.equal(m.plugin.settings.zoteroGroups[0].lastUpdate, h.start - 1000);
    assert(m.bibCache.has('new-paper'));
  }],
  ['missing checkpoint queries from the epoch', async () => {
    const h = harness({checkpoint: null});
    await h.manager.refreshGlobalZBib();
    assert.equal(h.stats().query.since, 0);
  }],
  ['failed export retains the cached references and checkpoint', async () => {
    const h = harness({exportError: true}), m = h.manager;
    const checkpoint = m.plugin.settings.zoteroGroups[0].lastUpdate;
    const disk = h.files.get('/cache/zotero-library-1.json');
    await m.loadGlobalZBib(false);
    assert(m.bibCache.has('existing'));
    assert.equal(m.plugin.settings.zoteroGroups[0].lastUpdate, checkpoint);
    assert.equal(h.files.get('/cache/zotero-library-1.json'), disk);
  }],
  ['invalid export data cannot overwrite a usable cache', async () => {
    const h = harness({invalidExport: true}), m = h.manager;
    const checkpoint = m.plugin.settings.zoteroGroups[0].lastUpdate;
    const disk = h.files.get('/cache/zotero-library-1.json');
    await m.loadGlobalZBib(false);
    assert(m.bibCache.has('existing'));
    assert.equal(m.plugin.settings.zoteroGroups[0].lastUpdate, checkpoint);
    assert.equal(h.files.get('/cache/zotero-library-1.json'), disk);
  }],
];
(async () => {
  let failures = 0;
  for (const [name, test] of tests) {
    try { await test(); console.log('PASS:', name); }
    catch (error) { failures++; console.log('FAIL:', name, '\n ', error.message); }
  }
  console.log(`${tests.length - failures}/${tests.length} passed`);
  process.exitCode = failures ? 1 : 0;
})();
