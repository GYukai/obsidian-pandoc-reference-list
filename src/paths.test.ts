import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathOptions, resolveBibliography, pandocOptions, importStyle, localPath } from './paths';
jest.mock('which', () => ({ __esModule: true, default: { sync: () => null } }));
let root: string;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'pandoc-paths-')); });
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
test('handles CRLF, quotes, spaces and duplicates without splitting drive letters', () => {
  expect(pathOptions('"C:\\Program Files\\Pandoc\\pandoc.exe"\r\n/a path\n/a path\n')).toEqual(['C:\\Program Files\\Pandoc\\pandoc.exe', '/a path']);
});
test('skips missing foreign paths and directories, then selects first readable vault file', () => {
  fs.writeFileSync(path.join(root, 'library.bib'), '@book{}');
  expect(resolveBibliography('C:\\missing\\library.bib\n.\nlibrary.bib', root)).toBe(path.join(root, 'library.bib'));
});
test('preserves configured priority and legacy absolute paths', () => {
  const a = path.join(root, 'a.bib'), b = path.join(root, 'b.bib');
  fs.writeFileSync(a, 'a'); fs.writeFileSync(b, 'b');
  expect(resolveBibliography(`${b}\n${a}`, root)).toBe(b);
  expect(resolveBibliography(a, root)).toBe(a);
});
test('reports all missing bibliography choices', () => {
  expect(() => resolveBibliography('one\ntwo', root)).toThrow('one, two');
});
test('ignores unusable executables and preserves executable order', () => {
  const exe = path.join(root, 'pandoc'); fs.writeFileSync(exe, '#!/bin/sh\n'); fs.chmodSync(exe, 0o755);
  expect(pandocOptions('/missing\n'+exe)).toEqual([exe]);
});
test('imports external CSL as a portable relative path without overwriting collisions', () => {
  const vault = path.join(root, 'vault'); fs.mkdirSync(vault);
  const source = path.join(root, 'custom.csl'); fs.writeFileSync(source, 'first');
  expect(importStyle(source, vault)).toBe('Citation Styles/custom.csl');
  expect(importStyle(source, vault)).toBe('Citation Styles/custom.csl');
  fs.writeFileSync(source, 'second');
  expect(importStyle(source, vault)).toBe('Citation Styles/custom-1.csl');
  expect(fs.readFileSync(path.join(vault, 'Citation Styles/custom.csl'), 'utf8')).toBe('first');
});
test('existing vault CSL keeps relative path and resolves from vault root', () => {
  const source = path.join(root, 'local.csl'); fs.writeFileSync(source, 'style');
  expect(importStyle(source, root)).toBe('local.csl');
  expect(localPath('Citation Styles\\custom.csl', root)).toBe(path.join(root, 'Citation Styles/custom.csl'));
});
test('rejects non CSL files', () => {
  const source = path.join(root, 'a.txt'); fs.writeFileSync(source, 'x');
  expect(() => importStyle(source, root)).toThrow('readable .csl');
});

test('accepts comma-separated paths and mixed legacy newlines', () => {
  expect(pathOptions('C:\\Program Files\\Pandoc\\pandoc.exe, /opt/homebrew/bin/pandoc\n/usr/local/bin/pandoc')).toEqual(['C:\\Program Files\\Pandoc\\pandoc.exe', '/opt/homebrew/bin/pandoc', '/usr/local/bin/pandoc']);
});
