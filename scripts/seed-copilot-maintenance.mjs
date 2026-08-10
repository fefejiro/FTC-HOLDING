#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const lanes = {
  security: {
    label: 'maintenance:security',
    title: 'Security maintenance pass',
    prompt: '.github/prompts/ftc-security-maintenance.prompt.md',
  },
  language: {
    label: 'maintenance:language',
    title: 'Language and accessibility maintenance pass',
    prompt: '.github/prompts/ftc-language-maintenance.prompt.md',
  },
  documentation: {
    label: 'maintenance:documentation',
    title: 'Documentation reality maintenance pass',
    prompt: '.github/prompts/ftc-documentation-maintenance.prompt.md',
  },
  general: {
    label: 'maintenance:general',
    title: 'General repository maintenance pass',
    prompt: '.github/prompts/ftc-general-maintenance.prompt.md',
  },
};

const dryRun = process.env.DRY_RUN === '1';
const repo = process.env.GITHUB_REPOSITORY;
const requestedLane = process.env.MAINTENANCE_LANE;
const weekdayLane = ['general', 'security', 'language', 'documentation', 'general', 'general', 'general'];
const laneName = requestedLane || weekdayLane[new Date().getUTCDay()];
const lane = lanes[laneName];

if (!lane) {
  console.error(`Unknown MAINTENANCE_LANE: ${laneName}. Expected ${Object.keys(lanes).join(', ')}.`);
  process.exit(1);
}

function gh(args, token = process.env.GH_TOKEN) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GH_TOKEN: token },
  }).trim();
}

function isoWeek(date) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return `${value.getUTCFullYear()}-W${String(Math.ceil((((value - yearStart) / 86400000) + 1) / 7)).padStart(2, '0')}`;
}

const cycle = isoWeek(new Date());
const title = `[Copilot maintenance][${cycle}] ${lane.title}`;
const body = `## Assigned agent\n\nUse the repository custom agent **FTC Portfolio Maintainer** and the playbook \`${lane.prompt}\`.\n\n## Lane\n\n${laneName}\n\n## Scope\n\nSelect exactly one evidence-backed, low-risk improvement in this lane. Keep it small enough for one reviewable pull request.\n\n## Safety\n\n- Do not deploy, publish, merge, change subscriptions, mutate production data, or handle credentials.\n- Do not weaken security or tests to obtain a pass.\n- Preserve unrelated work.\n- If no safe improvement is supported, close with an audit note.\n\n## Required evidence\n\nRecord the source/revision inspected, commands actually run, results, risks, and anything still unverified.`;

if (dryRun) {
  console.log(JSON.stringify({ repo: repo || '(dry-run)', lane: laneName, title, labels: ['continuous-improvement', 'agent-ready', lane.label] }, null, 2));
  process.exit(0);
}

if (!repo) {
  console.error('GITHUB_REPOSITORY is required outside dry-run mode.');
  process.exit(1);
}

const existing = JSON.parse(gh([
  'issue', 'list', '--repo', repo, '--state', 'open', '--search', `in:title "${title}"`, '--limit', '20', '--json', 'number,title',
]) || '[]').find((issue) => issue.title === title);

if (existing) {
  console.log(`Maintenance issue already open: #${existing.number} ${title}`);
  process.exit(0);
}

for (const label of ['continuous-improvement', 'agent-ready', lane.label]) {
  gh(['label', 'create', label, '--repo', repo, '--color', label === lane.label ? '6F42C1' : '1D76DB', '--force']);
}

const issueUrl = gh([
  'issue', 'create', '--repo', repo, '--title', title, '--body', body,
  '--label', 'continuous-improvement', '--label', 'agent-ready', '--label', lane.label,
]);
const match = issueUrl.match(/\/(\d+)$/);
if (!match) throw new Error(`Could not parse issue number from ${issueUrl}`);

const assignmentToken = process.env.COPILOT_ASSIGN_TOKEN;
if (!assignmentToken) {
  gh(['issue', 'edit', match[1], '--repo', repo, '--add-label', 'blocked']);
  gh(['issue', 'comment', match[1], '--repo', repo, '--body', 'Automated Copilot assignment is blocked: GitHub App installation tokens cannot assign coding agents. Configure the repository secret `COPILOT_ASSIGN_TOKEN` with a narrowly scoped user token after confirming GitHub Copilot coding-agent access, then rerun this lane.']);
  console.log(`Created ${issueUrl}; assignment is visibly blocked until COPILOT_ASSIGN_TOKEN is configured.`);
  process.exit(0);
}

try {
  gh(['issue', 'edit', match[1], '--repo', repo, '--add-assignee', 'copilot'], assignmentToken);
  console.log(`Created and assigned ${issueUrl} to Copilot.`);
} catch (error) {
  gh(['issue', 'edit', match[1], '--repo', repo, '--add-label', 'blocked']);
  gh(['issue', 'comment', match[1], '--repo', repo, '--body', 'Copilot assignment failed with the configured user token. Confirm that the token owner has GitHub Copilot coding-agent access and that the token can manage issues, then rerun this lane.']);
  console.error(`Created ${issueUrl}, but Copilot assignment failed and was marked blocked.`);
  console.error(error.stderr?.toString() || error.message);
  process.exit(1);
}
