#!/usr/bin/env node
/**
 * Self-test smoke runner for SayWetin backend.
 *
 * Why: The agent needs to verify recognition without a human tapping the orb.
 * What: hits health, identify-by-text, and (optionally) /api/listen with a
 * fixture audio file. Prints pass/fail per check + raw payload so the agent
 * can iterate without founder feedback.
 *
 * Run:  node tools/agent-test/smoke-api.mjs
 * With audio fixture (path to m4a/mp3/wav):
 *   node tools/agent-test/smoke-api.mjs --audio C:\path\to\sample.m4a
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { argv, exit } from 'node:process';

const API = process.env.API_BASE_URL?.trim() ||
  'https://saywetin-api-production.up.railway.app';

const args = Object.fromEntries(
  argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith('--')) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const checks = [];
const record = (name, ok, detail = '') =>
  checks.push({ name, ok, detail });

async function check(name, fn) {
  process.stdout.write(`  ... ${name} `);
  try {
    const detail = await fn();
    record(name, true, detail);
    console.log(`PASS ${detail ? `(${detail})` : ''}`);
  } catch (err) {
    record(name, false, err.message);
    console.log(`FAIL — ${err.message}`);
  }
}

async function main() {
  console.log(`SayWetin backend smoke @ ${API}`);

  await check('health', async () => {
    const r = await fetch(`${API}/api/health`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const body = await r.json();
    if (body.status !== 'ok') throw new Error(`unexpected ${JSON.stringify(body)}`);
    return 'status ok';
  });

  await check('identify-by-text (well-known lyric)', async () => {
    const r = await fetch(`${API}/api/identify-by-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'i go love you forever burna boy' }),
    });
    const body = await r.json().catch(() => ({}));
    // Treat intentionally-disabled AI as a documented gate, not a failure.
    if (r.status === 503 && body?.errorCode === 'AI_NOT_CONFIGURED') {
      return 'SKIPPED (AI_NOT_CONFIGURED — OPENAI_API_KEY not set)';
    }
    if (!r.ok) throw new Error(`HTTP ${r.status} ${body.error || ''}`);
    if (!body.success) throw new Error(`success=false ${body.error || ''}`);
    if (!body.recognizedTrack?.title) throw new Error('no recognizedTrack');
    return `${body.recognizedTrack.artist} — ${body.recognizedTrack.title}`;
  });

  if (args.audio && existsSync(args.audio)) {
    await check(`listen (audio fixture ${args.audio})`, async () => {
      const buf = await readFile(args.audio);
      const fd = new FormData();
      fd.append('duration', '8000');
      fd.append('audio', new Blob([buf], { type: 'audio/mp4' }), 'sample.m4a');
      const r = await fetch(`${API}/api/listen`, { method: 'POST', body: fd });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`HTTP ${r.status} ${body.error || ''}`);
      if (!body.success) throw new Error(`success=false ${body.error || ''}`);
      if (!body.recognizedTrack?.title) throw new Error('no recognizedTrack');
      return `${body.recognizedTrack.artist} — ${body.recognizedTrack.title} (${body.recognizedTrack.confidenceScore || '?'}%)`;
    });
  } else if (args.audio) {
    record('listen (audio fixture)', false, `file not found: ${args.audio}`);
    console.log(`  ... listen SKIPPED — audio fixture not found at ${args.audio}`);
  }

  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;
  console.log(`\n${passed}/${checks.length} passed${failed ? ` — ${failed} failed` : ''}`);
  exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('smoke runner crashed:', err);
  exit(2);
});
