import { cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { writeServiceWorker } from './build-worker.js';

const source = new URL('../site/', import.meta.url);
const output = new URL('../dist/', import.meta.url);

await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });
await writeServiceWorker(fileURLToPath(output));
