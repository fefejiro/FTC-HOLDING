#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const targets = [
  join(root, '.open-next', 'cloudflare', 'next-env.mjs'),
  join(root, '.open-next', 'worker.js'),
  join(root, '.open-next', 'middleware', 'handler.mjs'),
  join(root, '.open-next', 'server-functions', 'default', 'APPS', 'anion', 'handler.mjs'),
];

const forbidden = [
  'https://placeholder.supabase.co',
  'placeholder-anon-key-for-local-demo',
  'http://localhost:4178',
];

const expected = [
  'https://aaaextkrfoqomzmjjkxe.supabase.co',
  'https://anion.unalabs.cloud',
];

function readTarget(filePath) {
  if (!existsSync(filePath)) return '';
  const stats = statSync(filePath);
  if (!stats.isFile() || stats.size > 50_000_000) return '';
  return readFileSync(filePath, 'utf8');
}

const checked = [];
const violations = [];
const combined = [];

for (const target of targets) {
  const content = readTarget(target);
  if (!content) continue;
  checked.push(target);
  combined.push(content);

  for (const phrase of forbidden) {
    if (content.includes(phrase)) {
      violations.push({ target, phrase });
    }
  }
}

const allText = combined.join('\n');
const missingExpected = expected.filter((phrase) => !allText.includes(phrase));

console.log(`Worker bundle production-env guard checked ${checked.length} artifact(s).`);

if (checked.length === 0) {
  console.error('No OpenNext worker artifacts found. Run npm run build:worker first.');
  process.exit(1);
}

if (violations.length > 0) {
  console.error('Production Worker bundle contains local/demo placeholders:');
  for (const violation of violations) {
    console.error(`- ${violation.phrase} in ${violation.target}`);
  }
  console.error('Rebuild with real production Supabase and site env values before deploying.');
  process.exit(1);
}

if (missingExpected.length > 0) {
  console.error(`Production Worker bundle is missing expected production marker(s): ${missingExpected.join(', ')}`);
  process.exit(1);
}

console.log('Worker bundle production-env guard passed.');
