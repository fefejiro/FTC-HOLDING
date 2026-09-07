import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'public', '_worker.js');
const destination = resolve(root, 'out', '_worker.js');

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
