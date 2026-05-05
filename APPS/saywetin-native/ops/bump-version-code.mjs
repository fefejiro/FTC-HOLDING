#!/usr/bin/env node
// Bump versionCode in android/app/build.gradle by +1 and (optionally) bump
// versionName patch in app.json so the two never drift.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const gradlePath = resolve(root, 'android/app/build.gradle');
const appJsonPath = resolve(root, 'app.json');

let g = await readFile(gradlePath, 'utf8');
const m = g.match(/versionCode\s+(\d+)/);
if (!m) { console.error('versionCode not found'); process.exit(1); }
const next = Number(m[1]) + 1;
g = g.replace(/versionCode\s+\d+/, `versionCode ${next}`);
await writeFile(gradlePath, g);
console.log(`[bump] versionCode -> ${next}`);

try {
  const aj = JSON.parse(await readFile(appJsonPath, 'utf8'));
  if (aj?.expo?.android) {
    aj.expo.android.versionCode = next;
    await writeFile(appJsonPath, JSON.stringify(aj, null, 2) + '\n');
    console.log(`[bump] app.json android.versionCode -> ${next}`);
  }
} catch (e) {
  console.warn(`[bump] app.json sync skipped: ${e.message}`);
}
