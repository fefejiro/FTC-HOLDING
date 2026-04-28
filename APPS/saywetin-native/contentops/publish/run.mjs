#!/usr/bin/env node
// Publish a queue entry to all configured platforms.
//
// Usage:
//   node publish/run.mjs --id=run-123          # live publish (requires tokens)
//   node publish/run.mjs --id=run-123 --dry-run
//   node publish/run.mjs --id=latest --dry-run
//
// Env vars (live mode only — missing token = platform skipped):
//   TIKTOK_ACCESS_TOKEN
//   IG_ACCESS_TOKEN, IG_USER_ID
//   X_BEARER_TOKEN
//   LINKEDIN_ACCESS_TOKEN, LINKEDIN_AUTHOR_URN
//
// Always safe to run: a missing token marks the platform 'skipped (no token)'.
// Dry-run mode never makes any network call.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tiktokPublish } from './adapters/tiktok.mjs';
import { instagramPublish } from './adapters/instagram.mjs';
import { xPublish } from './adapters/x.mjs';
import { linkedinPublish } from './adapters/linkedin.mjs';

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

console.log(`[publish] id=${entry.id} tier=${entry.approval_tier} status=${entry.status} dryRun=${dryRun}`);

const adapters = {
  tiktok: tiktokPublish,
  instagram: instagramPublish,
  x: xPublish,
  linkedin: linkedinPublish,
};

entry.publish = entry.publish || {};
for (const [platform, info] of Object.entries(entry.artifacts)) {
  const adapter = adapters[platform];
  if (!adapter) { console.log(`  [${platform}] no adapter, skipped`); continue; }
  const text = await readFile(resolve(root, 'pipeline/_scripts', info.path), 'utf8');
  const media = info.video_path || info.audio_path || null;
  try {
    const res = await adapter({ text, media, dryRun });
    entry.publish[platform] = { ok: true, ...res, at: new Date().toISOString() };
    console.log(`  [${platform}] ${res.status || 'OK'}${res.url ? ' ' + res.url : ''}`);
  } catch (err) {
    entry.publish[platform] = { ok: false, error: err.message, at: new Date().toISOString() };
    console.error(`  [${platform}] FAIL ${err.message}`);
  }
}

entry.status = dryRun ? `${entry.status}+dry-run` : 'published';
const idx = queue.findIndex(e => e.id === entry.id);
if (idx >= 0) queue[idx] = entry;
await writeFile(queuePath, JSON.stringify(queue, null, 2));

// Archive
const archDir = resolve(root, 'approval/_archive');
await mkdir(archDir, { recursive: true });
await writeFile(resolve(archDir, `${entry.id}.json`), JSON.stringify(entry, null, 2));

console.log(`[publish] DONE id=${entry.id} status=${entry.status}`);
