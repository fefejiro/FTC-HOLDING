#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const repoCandidates = [
  root,
  path.join(root, 'APPS', 'peacepad'),
  path.join(root, 'APPS', 'saywetin'),
  path.join(root, 'APPS', 'ftc-site'),
].filter((repoPath) => fs.existsSync(path.join(repoPath, '.git')));

const sensitiveEnvKeys = new Set([
  'OPENAI_API_KEY',
  'MAILJET_API_KEY',
  'MAILJET_SECRET_KEY',
  'VAPID_PRIVATE_KEY',
  'ACRCLOUD_ACCESS_KEY',
  'ACRCLOUD_ACCESS_SECRET',
  'GENIUS_API_KEY',
  'SESSION_SECRET',
]);

const likelyPlaceholder = (value) => {
  const v = value.trim().replace(/^['"]|['"]$/g, '');
  if (!v) return true;
  return /example|placeholder|changeme|change_me|your_|redacted|dummy|test|local[_-]?dev|local[_-]?placeholder|not[_-]?set|<.*>/.test(v.toLowerCase());
};

const isTextFile = (contentBuffer) => {
  const sample = contentBuffer.subarray(0, 8000);
  for (const byte of sample) {
    if (byte === 0) return false;
  }
  return true;
};

const trackedFiles = (repoPath) => {
  try {
    const output = execSync('git ls-files -z', {
      cwd: repoPath,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'buffer',
    });

    return output
      .toString('utf8')
      .split('\0')
      .filter(Boolean)
      .map((relativePath) => path.join(repoPath, relativePath));
  } catch {
    return [];
  }
};

const findings = [];

for (const repoPath of repoCandidates) {
  const files = trackedFiles(repoPath);

  for (const filePath of files) {
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    if (!stat.isFile() || stat.size > 2 * 1024 * 1024) {
      continue;
    }

    let buffer;
    try {
      buffer = fs.readFileSync(filePath);
    } catch {
      continue;
    }

    if (!isTextFile(buffer)) {
      continue;
    }

    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const lineNumber = index + 1;
      const line = lines[index];

      const envMatch = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*(?:#.*)?$/);
      if (envMatch) {
        const key = envMatch[1];
        const value = envMatch[2];

        if (sensitiveEnvKeys.has(key) && !likelyPlaceholder(value)) {
          findings.push({
            filePath,
            lineNumber,
            reason: `${key} assignment`,
          });
        }
      }

      const openAiKeyMatches = line.match(/\bsk-[A-Za-z0-9]{20,}\b/g);
      if (openAiKeyMatches) {
        findings.push({
          filePath,
          lineNumber,
          reason: 'OpenAI-style key literal',
        });
      }

    }
  }
}

if (findings.length > 0) {
  console.error('Secret audit failed. Redacted findings:');
  for (const finding of findings) {
    const rel = path.relative(root, finding.filePath).replace(/\\/g, '/');
    console.error(`- ${rel}:${finding.lineNumber} [${finding.reason}]`);
  }
  process.exit(1);
}

console.log('Secret audit passed: no non-placeholder secrets detected in tracked files.');
