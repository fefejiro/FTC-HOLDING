#!/usr/bin/env node
// Orchestrate the full Phase 2 pipeline:
//   1. Read qa summary
//   2. Generate scripts per platform
//   3. Render audio per platform via ElevenLabs (only personas needed)
//   4. Render 9:16 video (if --video)
//   5. Append entry to approval/queue.json (Tier A auto-publish, B/C waits)

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.join('=') || true];
}));
// Video on by default; pass --no-video to skip
const renderVideo = args['no-video'] ? false : true;
const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';
// Limit to specific platforms via --only=instagram or --only=instagram,tiktok
const onlyArg = typeof args.only === 'string' ? args.only : '';
const onlyPlatforms = onlyArg ? onlyArg.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : null;
const includePlatform = (p) => !onlyPlatforms || onlyPlatforms.includes(p.toLowerCase());

function step(name, cmd, cmdArgs) {
  console.log(`\n=== ${name} ===`);
  const r = spawnSync(cmd, cmdArgs, { cwd: root, stdio: 'inherit', shell: false });
  if (r.status !== 0) { console.error(`[${name}] FAILED status=${r.status}`); process.exit(r.status || 1); }
}

// Step 0: refresh real QA bench results (unless --skip-bench).
// This ensures the social videos report ground-truth from the latest run,
// not yesterday's summary.json.
const skipBench = args['skip-bench'] === true || args['skip-bench'] === 'true';
if (!skipBench) {
  console.log('\n=== qa-bench (live) ===');
  const qaRoot = resolve(root, '../qa');
  const r = spawnSync('npm', ['run', 'qa:all'], { cwd: qaRoot, stdio: 'inherit', shell: true });
  if (r.status !== 0) console.warn(`[qa-bench] non-zero exit=${r.status} (continuing with last summary.json)`);
} else {
  console.log('\n=== qa-bench skipped (--skip-bench) — using existing summary.json ===');
}

step('qa-to-script', 'node', ['pipeline/qa-to-script.mjs']);

const manifest = JSON.parse(await readFile(resolve(root, 'pipeline/_scripts/manifest.json'), 'utf8'));
const audioOutDir = resolve(root, 'voice/_out', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(audioOutDir, { recursive: true });

for (const [platform, info] of Object.entries(manifest.scripts)) {
  if (!includePlatform(platform)) { console.log(`[skip-audio] ${platform} (filtered by --only)`); continue; }
  if (!info.persona) { console.log(`[skip-audio] ${platform} (no persona, text-only)`); continue; }
  const scriptPath = resolve(root, 'pipeline/_scripts', info.path);
  const outPath = resolve(audioOutDir, `${platform}.mp3`);
  step(`render-audio:${platform}`, 'node', ['voice/render.mjs', `--persona=${info.persona}`, `--in=${scriptPath}`, `--out=${outPath}`]);
  info.audio_path = outPath;
}

if (renderVideo) {
  for (const [platform, info] of Object.entries(manifest.scripts)) {
    if (!includePlatform(platform)) continue;
    if (!info.audio_path) continue;
    const videoOut = resolve(audioOutDir, `${platform}.mp4`);
    const bg = resolve(root, 'assets/bg-default.png');
    const scriptPath = resolve(root, 'pipeline/_scripts', info.path);
    const stepArgs = ['pipeline/render-9x16.mjs', `--audio=${info.audio_path}`, `--out=${videoOut}`, `--title=SayWetin QA ${manifest.overall}`, `--script=${scriptPath}`, `--platform=${platform}`];
    let bgExists = false; try { await stat(bg); bgExists = true; } catch {}
    if (bgExists) stepArgs.push(`--bg=${bg}`);
    step(`render-video:${platform}`, 'node', stepArgs);
    info.video_path = videoOut;
  }
}

const queuePath = resolve(root, 'approval/queue.json');
let queue = [];
try { queue = JSON.parse(await readFile(queuePath, 'utf8')); } catch {}
const entry = {
  id: `run-${Date.now()}`,
  generated_at: new Date().toISOString(),
  overall: manifest.overall,
  approval_tier: manifest.approval_tier,
  artifacts: manifest.scripts,
  status: manifest.approval_tier === 'A' ? 'auto-approved' : 'pending'
};
queue.unshift(entry);
queue = queue.slice(0, 50);
await mkdir(dirname(queuePath), { recursive: true });
await writeFile(queuePath, JSON.stringify(queue, null, 2));

console.log(`\n=== DONE ===`);
console.log(`Tier=${entry.approval_tier} status=${entry.status}`);
console.log(`Queue: ${queuePath}`);

// Auto-publish for Tier-A only.
if (entry.status === 'auto-approved') {
  console.log(`\n=== auto-publish (Tier A) ===`);
  const pubArgs = ['publish/run.mjs', `--id=${entry.id}`];
  if (dryRun) pubArgs.push('--dry-run');
  const r = spawnSync('node', pubArgs, { cwd: root, stdio: 'inherit', shell: false });
  if (r.status !== 0) console.error(`[auto-publish] non-zero exit=${r.status} (continuing)`);
} else {
  console.log(`\n=== auto-publish skipped (Tier ${entry.approval_tier}, status=${entry.status}) ===`);
  console.log(`Approve manually with: node approval/approve.mjs --id=${entry.id}`);
}
