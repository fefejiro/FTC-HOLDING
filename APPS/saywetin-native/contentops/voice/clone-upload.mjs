#!/usr/bin/env node
// Upload voice samples to ElevenLabs Voice Lab and patch profiles.json with new voice_ids.
// Expects: voice/samples/prof.mp3, voice/samples/male.mp3, voice/samples/female.mp3
// (Any subset is fine - missing personas are skipped.)

import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('ELEVENLABS_API_KEY not set'); process.exit(1); }

const profilesPath = resolve(__dirname, 'profiles.json');
const profiles = JSON.parse(await readFile(profilesPath, 'utf8'));
const samplesDir = resolve(__dirname, 'samples');

for (const [persona, cfg] of Object.entries(profiles.personas)) {
  const samplePath = resolve(samplesDir, `${persona}.mp3`);
  let exists = false;
  try { await stat(samplePath); exists = true; } catch {}
  if (!exists) { console.log(`[clone] skip ${persona}: no sample at ${samplePath}`); continue; }

  console.log(`[clone] uploading ${persona} sample -> ${samplePath}`);
  const fileBuf = await readFile(samplePath);
  const blob = new Blob([fileBuf], { type: 'audio/mpeg' });
  const fd = new FormData();
  fd.append('name', `FTC-${persona}-${cfg.label.replace(/\s+/g, '-')}`);
  fd.append('description', `Cloned Nigerian voice: ${cfg.label}`);
  fd.append('labels', JSON.stringify({ accent: 'nigerian', source: 'ftc-clone', persona }));
  fd.append('files', blob, `${persona}.mp3`);

  const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: { 'xi-api-key': KEY },
    body: fd
  });
  if (!res.ok) {
    console.error(`[clone] FAIL ${persona} status=${res.status} body=${await res.text()}`);
    continue;
  }
  const out = await res.json();
  const newId = out.voice_id;
  console.log(`[clone] OK ${persona} -> voice_id=${newId}`);
  cfg.voice_id = newId;
  cfg.cloned = true;
  cfg.cloned_at = new Date().toISOString();
}

await writeFile(profilesPath, JSON.stringify(profiles, null, 2) + '\n');
console.log(`[clone] profiles.json updated.`);
