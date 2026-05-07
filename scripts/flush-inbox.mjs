#!/usr/bin/env node
/**
 * flush-inbox.mjs
 * Reads INBOX.md, converts each bullet into a GitHub Issue via `gh` CLI,
 * removes successful bullets from INBOX.md (failed ones stay).
 *
 * Bullet prefix → label mapping:
 *   - ci: ...      → continuous-improvement
 *   - bug: ...     → bug
 *   - idea: ...    → idea
 *   - <other>      → agent-ready
 *
 * Requires: `gh` CLI authenticated. Run from repo root.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const INBOX = path.resolve('INBOX.md');
const MARKER = '<!-- drop new bullets below this line -->';

if (!fs.existsSync(INBOX)) {
  console.error('INBOX.md not found at repo root.');
  process.exit(1);
}

try {
  execSync('gh auth status', { stdio: 'ignore' });
} catch {
  console.error('gh CLI not authenticated. Run `gh auth login` first.');
  process.exit(1);
}

const raw = fs.readFileSync(INBOX, 'utf8');
const lines = raw.split('\n');
const markerIdx = lines.indexOf(MARKER);
if (markerIdx === -1) {
  console.error('INBOX.md missing marker line; aborting.');
  process.exit(1);
}

const head = lines.slice(0, markerIdx + 1);
const body = lines.slice(markerIdx + 1);

const remaining = [];
let created = 0;
let failed = 0;

for (const line of body) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('>')) {
    remaining.push(line);
    continue;
  }
  const m = trimmed.match(/^[-*]\s*(.+)$/);
  if (!m) { remaining.push(line); continue; }
  let text = m[1].trim();
  let label = 'agent-ready';
  let titlePrefix = '[Agent-Ready]';
  if (/^ci:\s*/i.test(text)) { label = 'continuous-improvement'; titlePrefix = '[CI]'; text = text.replace(/^ci:\s*/i, ''); }
  else if (/^bug:\s*/i.test(text)) { label = 'bug'; titlePrefix = '[Bug]'; text = text.replace(/^bug:\s*/i, ''); }
  else if (/^idea:\s*/i.test(text)) { label = 'idea'; titlePrefix = '[Idea]'; text = text.replace(/^idea:\s*/i, ''); }

  const title = `${titlePrefix} ${text}`.slice(0, 200);
  const bodyText = `Captured from INBOX.md on ${new Date().toISOString()}.`;
  try {
    execSync(`gh issue create --title ${JSON.stringify(title)} --body ${JSON.stringify(bodyText)} --label ${JSON.stringify(label)}`, { stdio: ['ignore', 'pipe', 'pipe'] });
    created++;
    console.log(`✔ ${title}`);
  } catch (e) {
    failed++;
    console.error(`✘ ${title} — ${e.message.split('\n')[0]}`);
    remaining.push(line);
  }
}

fs.writeFileSync(INBOX, [...head, ...remaining].join('\n'));
console.log(`\nDone. Created ${created}, failed ${failed}.`);
