#!/usr/bin/env node
/**
 * Seed evidence-backed continuous-improvement issues.
 *
 * This script discovers work; it never marks work agent-ready, edits code,
 * changes dependencies, or makes legal/licensing decisions.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CREATE_ISSUES = process.env.CREATE_ISSUES === '1';
const DRY = !CREATE_ISSUES;
const MAX_NEW_ISSUES = Number.parseInt(process.env.CI_SEED_LIMIT || '3', 10);

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
  } catch (error) {
    return `${error.stdout?.toString() || ''}${error.stderr?.toString() || ''}`;
  }
}

function ghAuthenticated() {
  try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function existingTitles() {
  if (DRY || !ghAuthenticated()) return new Set();
  const output = run('gh', [
    'issue', 'list', '--state', 'all', '--label', 'continuous-improvement',
    '--limit', '1000', '--json', 'title',
  ]);
  try {
    return new Set(JSON.parse(output).map((issue) => issue.title));
  } catch {
    return new Set();
  }
}

const knownAppLabels = new Set([
  'anion', 'garden-cleaners', 'job-reply-agent', 'og-trades', 'peacepad',
  'saywetin', 'una-labs',
]);
const seen = existingTitles();
const proposals = [];

function propose({ title, app, evidence, acceptance, verification, risk = 'Medium', boundaries }) {
  const normalizedTitle = `[CI] ${title}`.slice(0, 200);
  if (seen.has(normalizedTitle) || proposals.length >= MAX_NEW_ISSUES) return;
  seen.add(normalizedTitle);
  const labels = ['continuous-improvement', 'needs-triage'];
  if (knownAppLabels.has(app)) labels.push(`app:${app}`);
  proposals.push({
    title: normalizedTitle,
    labels,
    body: [
      '## Observed evidence', evidence,
      '', '## Acceptance criteria', ...acceptance.map((item) => `- [ ] ${item}`),
      '', '## Verification', `\`${verification}\``,
      '', '## Risk class', risk,
      '', '## Do not touch', boundaries,
      '', '> Discovery only. Add `agent-ready` only after owner review confirms low risk.',
    ].join('\n'),
  });
}

console.log('Scanning app README coverage...');
const appsRoot = path.join(ROOT, 'APPS');
if (fs.existsSync(appsRoot)) {
  for (const app of fs.readdirSync(appsRoot)) {
    const appPath = path.join(appsRoot, app);
    if (!fs.statSync(appPath).isDirectory() || !fs.existsSync(path.join(appPath, 'package.json'))) continue;
    const readmePath = path.join(appPath, 'README.md');
    const relativeReadme = `APPS/${app}/README.md`;
    if (!fs.existsSync(readmePath)) {
      propose({
        title: `Document verified run and deploy commands for APPS/${app}`,
        app,
        evidence: `\`${relativeReadme}\` is missing while \`APPS/${app}/package.json\` exists.`,
        acceptance: ['README states the verified product purpose.', 'Run, test, build, and deploy commands match package scripts and live configuration.', 'Unknown or unverified behavior is labeled explicitly.'],
        verification: `git diff --check -- ${relativeReadme}`,
        risk: 'Low - eligible for agent-ready review after scope confirmation',
        boundaries: 'Do not invent deployment status, credentials, URLs, or test results.',
      });
      continue;
    }
    const content = fs.readFileSync(readmePath, 'utf8');
    if (content.length < 400) {
      propose({
        title: `Verify and expand thin README in APPS/${app}`,
        app,
        evidence: `\`${relativeReadme}\` is ${content.length} characters and does not provide enough operational context.`,
        acceptance: ['Purpose and ownership are accurate.', 'Run/test/build/deploy commands are verified against the repository.', 'No production-readiness claim is added without evidence.'],
        verification: `git diff --check -- ${relativeReadme}`,
        risk: 'Low - eligible for agent-ready review after scope confirmation',
        boundaries: 'Documentation only; do not change runtime behavior or production configuration.',
      });
    }
  }
}

console.log(`Proposed ${proposals.length} new issues (limit ${MAX_NEW_ISSUES}).`);
if (DRY) {
  for (const proposal of proposals) console.log(`- ${proposal.title} [${proposal.labels.join(', ')}]`);
  console.log('Dry run only. Set CREATE_ISSUES=1 to create triage issues.');
  process.exit(0);
}

if (!ghAuthenticated()) {
  console.error('gh CLI is not authenticated; cannot create issues.');
  process.exit(1);
}

let created = 0;
for (const proposal of proposals) {
  const args = ['issue', 'create', '--title', proposal.title, '--body', proposal.body];
  for (const label of proposal.labels) args.push('--label', label);
  try {
    execFileSync('gh', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    created += 1;
    console.log(`Created: ${proposal.title}`);
  } catch (error) {
    console.error(`Failed: ${proposal.title} - ${error.message.split('\n')[0]}`);
  }
}
console.log(`Created ${created} issues.`);
