const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert/strict');
const { pathToFileURL } = require('url');
const esbuild = require('esbuild');
(async () => {
 const output = path.resolve('.verify-paths.mjs');
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pwc-integration-'));
 try {
  esbuild.buildSync({entryPoints:['src/bib/helpers.ts'], bundle:true, platform:'node',format:'esm', outfile:output,external:['execa','download','which']});
  const h = await import(pathToFileURL(output).href);
  fs.writeFileSync(path.join(root,'refs.bib'), '@book{portable, title={Portable citations}, author={Doe, Jane}, year={2026}}');
  const bib = await h.bibToCSL('C:\\missing\\refs.bib\nrefs.bib', ['/missing/pandoc', process.execPath, require('which').sync('pandoc')].join('\n'), () => root);
  assert.equal(bib[0].id, 'portable');
  fs.mkdirSync(path.join(root,'Citation Styles'));
  fs.writeFileSync(path.join(root,'Citation Styles/test.csl'), '<style>portable</style>');
  const cache = new Map();
  assert.equal(await h.getCSLStyle(cache, root, '', 'Citation Styles/test.csl', root), '<style>portable</style>');
  assert.equal(cache.get('Citation Styles/test.csl'), '<style>portable</style>');
  console.log('PASS: actual Pandoc conversion falls back after missing and failing candidates; vault-relative CSL loads with correct cache key.');
 } finally { fs.rmSync(output,{force:true});fs.rmSync(root,{recursive:true,force:true}); }
})().catch(e => {console.error(e);process.exitCode=1;});
