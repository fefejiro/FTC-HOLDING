#!/usr/bin/env node
// Windows-compatible port of patch-voice-recorder-agp.sh
// Run with: node scripts/patch-voice-recorder-agp.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const FILES = {
  'capacitor-android': path.join(root, 'node_modules/@capacitor/android/capacitor/build.gradle'),
  'capacitor-voice-recorder': path.join(root, 'node_modules/capacitor-voice-recorder/android/build.gradle'),
  'capawesome-foreground-service': path.join(root, 'node_modules/@capawesome-team/capacitor-android-foreground-service/android/build.gradle'),
};

function removeBuildscriptBlock(content) {
  const lines = content.split('\n');
  const result = [];
  let inBuildscript = false;
  let braceCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inBuildscript && trimmed.startsWith('buildscript') && line.includes('{')) {
      inBuildscript = true;
      braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      if (braceCount <= 0) inBuildscript = false;
      continue;
    }

    if (inBuildscript) {
      braceCount += (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      if (braceCount <= 0) inBuildscript = false;
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

let patched = 0;
let skipped = 0;

for (const [name, filePath] of Object.entries(FILES)) {
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${name} not found at ${filePath}`);
    skipped++;
    continue;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const patched_content = removeBuildscriptBlock(original);

  if (patched_content !== original) {
    fs.writeFileSync(filePath, patched_content, 'utf8');
    console.log(`PATCHED: ${name} - removed buildscript block`);
    patched++;
  } else {
    console.log(`OK: ${name} - no buildscript block found (already clean)`);
    skipped++;
  }
}

console.log(`\nDone! ${patched} patched, ${skipped} skipped.`);
console.log('All Capacitor plugins will now inherit AGP from the root build.gradle.');
