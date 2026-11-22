import { createHash } from 'node:crypto';
import { cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const source = new URL('../site/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
const worker = await readFile(new URL('./sw.js', import.meta.url), 'utf8');
const files = (await readdir(source, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map(({ name, parentPath }) => pathToFileURL(join(parentPath, name)).href.slice(source.href.length))
  .sort();

const hash = createHash('sha256').update(worker);
for (const file of files) {
  const data = await readFile(new URL(file, source));
  hash.update(JSON.stringify([file, data.length]));
  hash.update(data);
}
const version = hash.digest('hex').slice(0, 16);
await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });
await writeFile(new URL('sw.js', output), worker
  .replace('/* BUILD_FILES */ []', JSON.stringify(files))
  .replace('__BUILD_VERSION__', version));
