#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const root = process.cwd();

const browserAssetRoots = [
  join(root, '.open-next', 'assets', '_next', 'static'),
  join(root, '.next', 'static'),
];

const serverArtifacts = [
  join(root, '.open-next', 'cloudflare', 'next-env.mjs'),
  join(root, '.open-next', 'middleware', 'handler.mjs'),
  join(root, '.open-next', 'server-functions', 'default', 'APPS', 'anion', 'handler.mjs'),
];

const browserForbidden = [
  'https://placeholder.supabase.co',
  'placeholder-anon-key-for-local-demo',
  'placeholder-anon-key-for-smoke',
];

const serverRuntimeWarnings = [
  'https://placeholder.supabase.co',
  'placeholder-anon-key-for-local-demo',
  'placeholder-anon-key-for-smoke',
  'http://localhost:4178',
];

function walkFiles(dir, files = []) {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, files);
    } else if (entry.isFile() && /\.(js|mjs|html)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function readTarget(filePath) {
  if (!existsSync(filePath)) return '';
  const stats = statSync(filePath);
  if (!stats.isFile() || stats.size > 50_000_000) return '';
  return readFileSync(filePath, 'utf8');
}

const browserFiles = browserAssetRoots.flatMap((assetRoot) => walkFiles(assetRoot));
const browserViolations = [];

for (const filePath of browserFiles) {
  const content = readTarget(filePath);
  if (!content) continue;

  for (const phrase of browserForbidden) {
    if (content.includes(phrase)) {
      browserViolations.push({ target: filePath, phrase });
    }
  }
}

const serverWarnings = [];

for (const filePath of serverArtifacts) {
  const content = readTarget(filePath);
  if (!content) continue;

  for (const phrase of serverRuntimeWarnings) {
    if (content.includes(phrase)) {
      serverWarnings.push({ target: filePath, phrase });
    }
  }
}

console.log(`Worker browser-bundle guard checked ${browserFiles.length} browser artifact(s).`);

if (browserFiles.length === 0) {
  console.error('No browser static artifacts found. Run npm run build:worker first.');
  process.exit(1);
}

if (browserViolations.length > 0) {
  console.error('Browser-delivered bundle contains local/demo Supabase placeholders:');
  for (const violation of browserViolations) {
    console.error(`- ${violation.phrase} in ${violation.target}`);
  }
  console.error('Remove client-side build-time public Supabase env usage before deploying.');
  process.exit(1);
}

if (serverWarnings.length > 0) {
  console.warn('Server runtime artifacts still contain local fallback markers.');
  console.warn('This is acceptable only when Cloudflare Worker runtime secrets are configured and verify:prod passes.');
  for (const warning of serverWarnings.slice(0, 8)) {
    console.warn(`- ${warning.phrase} in ${warning.target}`);
  }
}

console.log('Worker browser-bundle guard passed.');
