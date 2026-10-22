import fs from 'fs';
import path from 'path';
import which from 'which';

export function pathOptions(value = ''): string[] {
  return [...new Set(value.split(/[,\r\n]+/).map(s => s.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean))];
}

export function localPath(value: string, root?: string): string {
  // Never reinterpret another OS's absolute path as a vault-relative path.
  if (process.platform !== 'win32' && path.win32.isAbsolute(value)) return value;
  return path.isAbsolute(value) ? value : root ? path.resolve(root, value.replace(/\\/g, '/')) : value;
}

export function readableFile(value: string): boolean {
  try { fs.accessSync(value, fs.constants.R_OK); return fs.statSync(value).isFile(); }
  catch { return false; }
}

export function resolveBibliography(value: string, root?: string): string {
  for (const option of pathOptions(value)) {
    const file = localPath(option, root);
    if (readableFile(file)) return file;
  }
  throw new Error(`No readable bibliography file found. Checked: ${pathOptions(value).join(', ')}`);
}

export function pandocOptions(value: string): string[] {
  const options = pathOptions(value);
  const detected = which.sync('pandoc', { nothrow: true });
  if (detected) options.push(detected);
  return [...new Set(options)].filter(file => {
    try { fs.accessSync(file, fs.constants.X_OK); return fs.statSync(file).isFile(); }
    catch { return false; }
  });
}

export function importStyle(source: string, root: string): string {
  if (path.extname(source).toLowerCase() !== '.csl' || !readableFile(source)) {
    throw new Error('Please select a readable .csl style file.');
  }
  const relative = path.relative(root, source);
  if (relative && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) {
    return relative.split(path.sep).join('/');
  }
  const folder = path.join(root, 'Citation Styles');
  fs.mkdirSync(folder, { recursive: true });
  const parsed = path.parse(source);
  let target = path.join(folder, parsed.base), i = 1;
  while (fs.existsSync(target)) {
    if (fs.readFileSync(target).equals(fs.readFileSync(source))) break;
    target = path.join(folder, `${parsed.name}-${i++}.csl`);
  }
  if (!fs.existsSync(target)) fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  return path.relative(root, target).split(path.sep).join('/');
}
