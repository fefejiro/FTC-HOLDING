#!/usr/bin/env node
// Render text -> mp3 using a configured persona.
// Usage: node render.mjs --persona=prof --text="Hello" --out=./_out/clip.mp3
//        node render.mjs --persona=male --in=./scripts/instagram.txt --out=./_out/ig.mp3

import { readFile, writeFile, mkdir, readdir, copyFile, stat } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.ELEVENLABS_API_KEY;
const MOCK = process.env.MOCK_TTS === '1' || process.env.MOCK_TTS === 'true';
if (!KEY && !MOCK) { console.error('ELEVENLABS_API_KEY not set (set MOCK_TTS=1 to use cached audio)'); process.exit(1); }

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.join('=')];
}));
const persona = args.persona || 'male';
const outPath = args.out
  ? (args.out.match(/^[a-zA-Z]:[\\/]/) ? args.out : resolve(process.cwd(), args.out))
  : resolve(__dirname, `_out/${persona}-${Date.now()}.mp3`);

const profiles = JSON.parse(await readFile(resolve(__dirname, 'profiles.json'), 'utf8'));
const cfg = profiles.personas[persona];
if (!cfg) { console.error(`Unknown persona: ${persona}. Known: ${Object.keys(profiles.personas).join(', ')}`); process.exit(2); }

let text = args.text;
if (!text && args.in) {
  const inPath = args.in.match(/^[a-zA-Z]:[\\/]/) ? args.in : resolve(process.cwd(), args.in);
  text = (await readFile(inPath, 'utf8')).trim();
}
if (!text) { console.error('Provide --text="..." or --in=path/to/script.txt'); process.exit(3); }

const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(cfg.voice_id)}?output_format=${encodeURIComponent(profiles.output_format)}`;
const body = {
  text,
  model_id: profiles.model_id,
  voice_settings: cfg.settings
};

console.log(`[render] persona=${persona} voice=${cfg.voice_id} chars=${text.length} -> ${outPath}`);

if (MOCK) {
  // Find the most recent cached mp3 with the same basename (e.g. tiktok.mp3) and copy it.
  const outDir = resolve(__dirname, '_out');
  const target = basename(outPath); // e.g. tiktok.mp3
  let best = null;
  try {
    const runs = await readdir(outDir);
    for (const run of runs) {
      const candidate = resolve(outDir, run, target);
      try {
        const s = await stat(candidate);
        if (s.isFile() && (!best || s.mtimeMs > best.mtimeMs)) best = { path: candidate, mtimeMs: s.mtimeMs, size: s.size };
      } catch {}
    }
  } catch {}
  if (!best) { console.error(`[render:MOCK] no cached '${target}' found under ${outDir}`); process.exit(5); }
  await mkdir(dirname(outPath), { recursive: true });
  await copyFile(best.path, outPath);
  console.log(`[render:MOCK] copied cached audio bytes=${best.size} from=${best.path}`);
  process.exit(0);
}

const res = await fetch(url, {
  method: 'POST',
  headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
  body: JSON.stringify(body)
});
if (!res.ok) {
  console.error(`[render] FAIL ${res.status} ${await res.text()}`);
  process.exit(4);
}
const buf = Buffer.from(await res.arrayBuffer());
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, buf);
console.log(`[render] OK bytes=${buf.length} file=${outPath}`);
