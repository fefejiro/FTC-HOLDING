#!/usr/bin/env node
// List all voices available in the configured ElevenLabs workspace.
// Reads ELEVENLABS_API_KEY from process env (set via SetEnvironmentVariable).

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('ELEVENLABS_API_KEY not set in environment.');
  process.exit(1);
}

const res = await fetch('https://api.elevenlabs.io/v1/voices', {
  headers: { 'xi-api-key': KEY }
});
if (!res.ok) {
  console.error(`/v1/voices failed: ${res.status} ${await res.text()}`);
  process.exit(2);
}
const data = await res.json();
console.log(`Total voices: ${data.voices.length}`);
for (const v of data.voices) {
  const lbl = Object.entries(v.labels || {}).map(([k, val]) => `${k}=${val}`).join(',');
  console.log(`  ${v.voice_id} | ${v.name} | ${v.category} | ${lbl}`);
}
