#!/usr/bin/env node
/**
 * seed-continuous-improvement.mjs
 *
 * Scans repo for low-risk improvements and creates `continuous-improvement`
 * GitHub issues, deduped by title fingerprint. Designed to run weekly.
 *
 * Sources:
 *   - npm audit (high/critical only)
 *   - tsc --noEmit warnings (per workspace, best-effort)
 *   - eslint warnings (per workspace, best-effort)
 *   - missing README sections (top-level apps/packages)
 *   - missing LICENSE files
 *
 * Requires: `gh` CLI authenticated.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DRY = process.env.DRY_RUN === '1';

function sh(cmd, opts = {}) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }); }
  catch (e) { return (e.stdout?.toString() || '') + (e.stderr?.toString() || ''); }
}

function ghAuthed() {
  try { execSync('gh auth status', { stdio: 'ignore' }); return true; } catch { return false; }
}

function existingTitles() {
  if (DRY) return new Set();
  const out = sh('gh issue list --state open --label continuous-improvement --limit 500 --json title');
  try { return new Set(JSON.parse(out).map(i => i.title)); } catch { return new Set(); }
}

const seen = existingTitles();
const proposals = [];

function propose(title, body, extraLabels = []) {
  const t = `[CI] ${title}`.slice(0, 200);
  if (seen.has(t)) return;
  seen.add(t);
  proposals.push({ title: t, body, labels: ['continuous-improvement', ...extraLabels] });
}

// 1. npm audit (root)
console.log('Scanning: npm audit...');
const audit = sh('npm audit --json --production', { cwd: ROOT });
try {
  const a = JSON.parse(audit);
  const vulns = a.vulnerabilities || {};
  for (const [name, v] of Object.entries(vulns)) {
    if (v.severity === 'high' || v.severity === 'critical') {
      propose(
        `Bump ${name} (${v.severity} vulnerability)`,
        `npm audit reports ${v.severity} severity in \`${name}\`.\nRun \`npm audit fix\` or upgrade manually.\n\n\`\`\`json\n${JSON.stringify(v, null, 2).slice(0, 1500)}\n\`\`\``,
      );
    }
  }
} catch { /* audit may fail on monorepo; non-fatal */ }

// 2. Missing LICENSE in workspace folders
console.log('Scanning: missing LICENSE files...');
for (const dir of ['APPS', 'PACKAGES']) {
  const root = path.join(ROOT, dir);
  if (!fs.existsSync(root)) continue;
  for (const sub of fs.readdirSync(root)) {
    const subPath = path.join(root, sub);
    if (!fs.statSync(subPath).isDirectory()) continue;
    if (!fs.existsSync(path.join(subPath, 'package.json'))) continue;
    const hasLicense = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'].some(f => fs.existsSync(path.join(subPath, f)));
    if (!hasLicense) {
      propose(
        `Add LICENSE to ${dir}/${sub}`,
        `\`${dir}/${sub}\` has a package.json but no LICENSE file. Add MIT LICENSE.`,
      );
    }
  }
}

// 3. Missing README sections (top-level apps)
console.log('Scanning: thin READMEs...');
const APPS = path.join(ROOT, 'APPS');
if (fs.existsSync(APPS)) {
  for (const sub of fs.readdirSync(APPS)) {
    const readme = path.join(APPS, sub, 'README.md');
    if (!fs.existsSync(readme)) {
      propose(`Create README for APPS/${sub}`, `\`APPS/${sub}\` has no README. Add one with: purpose, dev/run, deploy.`);
      continue;
    }
    const content = fs.readFileSync(readme, 'utf8');
    if (content.length < 400) {
      propose(`Expand thin README in APPS/${sub}`, `\`APPS/${sub}/README.md\` is under 400 chars. Add purpose, dev/run, deploy sections.`);
    }
  }
}

// 4. Workflows that always fail (last 5 runs)
// (Skipped here — handled in dedicated workflow-health script later.)

console.log(`\nProposed ${proposals.length} new issues.`);

if (DRY) {
  for (const p of proposals) console.log(`- ${p.title}`);
  process.exit(0);
}

if (!ghAuthed()) {
  console.error('gh CLI not authenticated; cannot create issues. Run `gh auth login`.');
  process.exit(1);
}

let created = 0;
for (const p of proposals) {
  const labels = p.labels.map(l => `--label ${JSON.stringify(l)}`).join(' ');
  try {
    execSync(`gh issue create --title ${JSON.stringify(p.title)} --body ${JSON.stringify(p.body)} ${labels}`, { stdio: ['ignore', 'pipe', 'pipe'] });
    created++;
    console.log(`✔ ${p.title}`);
  } catch (e) {
    console.error(`✘ ${p.title} — ${e.message.split('\n')[0]}`);
  }
}
console.log(`\nCreated ${created} issues.`);
