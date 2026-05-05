#!/usr/bin/env node
// QA report -> short-form social scripts (TikTok/IG/X/LinkedIn).
// Reads: ../../qa/_report/summary.json
// Writes: ./_scripts/{tiktok,instagram,x,linkedin}.txt + ./_scripts/manifest.json

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const summaryPath = resolve(__dirname, '../../qa/_report/summary.json');
const outDir = resolve(__dirname, './_scripts');

const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
const layers = summary.layers || summary.results || [];
const passed = layers.filter(l => l.ok === true || l.status === 'PASS' || l.passed).map(l => l.name);
const failed = layers.filter(l => l.ok === false || l.status === 'FAIL' || l.failed).map(l => l.name);
const overall = failed.length === 0 ? 'GREEN' : (passed.length === 0 ? 'RED' : 'YELLOW');

const ts = new Date().toISOString().slice(0, 10);
const headline = overall === 'GREEN'
  ? `SayWetin shipped clean today. ${passed.length} layers green, zero red.`
  : overall === 'YELLOW'
    ? `SayWetin partial pass today. ${passed.length} green, ${failed.length} red - here's what we caught before users did.`
    : `SayWetin caught ${failed.length} issues today before any user saw them. This is why we test in production-shape.`;

const tiktok = [
  headline,
  '',
  `Layers passing: ${passed.join(', ') || 'none'}`,
  failed.length ? `Layers we fixed today: ${failed.join(', ')}` : '',
  '',
  'Built in Lagos. Tested every 5 minutes. Shipped when green.',
  '',
  'Follow for more behind-the-scenes engineering.'
].filter(Boolean).join('\n');

const instagram = [
  headline,
  '',
  'Stack we test:',
  '- Unit + API + Contract layers',
  '- UAT (real user journeys)',
  '- BAT (paying-tier flows)',
  '- Performance (p99 latency)',
  '- Security (audit + headers)',
  '- E2E (cold launch on device)',
  '',
  `Today's score: ${passed.length}/${passed.length + failed.length} green.`,
  '',
  '#SayWetin #BuildInPublic #NaijaTech'
].join('\n');

const x = `${overall === 'GREEN' ? '🟢' : overall === 'YELLOW' ? '🟡' : '🔴'} SayWetin QA ${ts}: ${passed.length} green / ${failed.length} red.\n\nWhy we test every 5 minutes: shipping bad code to Nigerian users on flaky data is not the move.\n\nBuilt in Lagos. Tested in production-shape.`;

const linkedin = [
  `SayWetin engineering update - ${ts}`,
  '',
  headline,
  '',
  'Our automated QA bench runs nine independent layers on a fixed schedule:',
  'unit, API integration, contract validation, UAT scenarios, BAT acceptance, performance benchmarking, security scanning, end-to-end device flows, and an always-on smoke loop.',
  '',
  failed.length
    ? `Today we identified ${failed.length} layer(s) needing attention: ${failed.join(', ')}. These were caught before any user impact - the value of investing in test infrastructure compounds quickly.`
    : `All ${passed.length} layers passed clean. This is what shipping discipline looks like at scale.`,
  '',
  '#EngineeringExcellence #QualityAssurance #BuildInPublic'
].join('\n');

await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'tiktok.txt'), tiktok);
await writeFile(resolve(outDir, 'instagram.txt'), instagram);
await writeFile(resolve(outDir, 'x.txt'), x);
await writeFile(resolve(outDir, 'linkedin.txt'), linkedin);

const manifest = {
  generated_at: new Date().toISOString(),
  overall,
  passed,
  failed,
  scripts: {
    tiktok: { path: 'tiktok.txt', persona: 'male', est_seconds: Math.ceil(tiktok.length / 14) },
    instagram: { path: 'instagram.txt', persona: 'female', est_seconds: Math.ceil(instagram.length / 14) },
    x: { path: 'x.txt', persona: null, est_seconds: 0 },
    linkedin: { path: 'linkedin.txt', persona: 'prof', est_seconds: Math.ceil(linkedin.length / 14) }
  },
  approval_tier: failed.length > 0 ? 'B' : 'A'
};
await writeFile(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`[qa-to-script] overall=${overall} passed=${passed.length} failed=${failed.length}`);
console.log(`[qa-to-script] manifest -> ${resolve(outDir, 'manifest.json')}`);
