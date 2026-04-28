#!/usr/bin/env node
// Approve a pending queue entry and publish it.
// Usage: node approval/approve.mjs --id=run-123 [--dry-run]
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.join('=') || true];
}));
const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';

const queuePath = resolve(root, 'approval/queue.json');
const queue = JSON.parse(await readFile(queuePath, 'utf8'));
let entry;
if (!args.id || args.id === 'latest') entry = queue[0];
else entry = queue.find(e => e.id === args.id);
if (!entry) { console.error(`No queue entry for id=${args.id || 'latest'}`); process.exit(2); }
if (entry.status === 'pending') entry.status = 'approved';
const idx = queue.findIndex(e => e.id === entry.id);
queue[idx] = entry;
await writeFile(queuePath, JSON.stringify(queue, null, 2));
console.log(`[approve] id=${entry.id} -> status=${entry.status}; invoking publish...`);
const pubArgs = ['publish/run.mjs', `--id=${entry.id}`];
if (dryRun) pubArgs.push('--dry-run');
const r = spawnSync('node', pubArgs, { cwd: root, stdio: 'inherit', shell: false });
process.exit(r.status || 0);
