import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const sqlFile = path.join(root, 'supabase', 'tests', 'anion_phase1_rls_smoke.sql');
const reportFile = path.join(root, 'DOCS', 'ANION', 'status', 'RLS_SMOKE_LAST_RUN.md');

function run(command, timeoutMs = 120000) {
  return execSync(command, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs,
  });
}

function normalizeError(error) {
  const stdout = error?.stdout ? String(error.stdout) : '';
  const stderr = error?.stderr ? String(error.stderr) : '';
  const message = error?.message ? String(error.message) : 'Unknown error';
  return { stdout, stderr, message, combined: `${stdout}\n${stderr}\n${message}`.trim() };
}

function writeReport({ status, summary, details, commands, startedAt, endedAt }) {
  const content = [
    '# Anion RLS Smoke Last Run',
    '',
    `- Status: ${status}`,
    `- Started: ${startedAt}`,
    `- Ended: ${endedAt}`,
    `- Summary: ${summary}`,
    '',
    '## Commands',
    ...commands.map((command) => `- ${command}`),
    '',
    '## Details',
    '```text',
    details,
    '```',
    '',
  ].join('\n');

  fs.writeFileSync(reportFile, content, 'utf8');
}

function main() {
  const startedAt = new Date().toISOString();
  const commands = [
    'npx --yes supabase@latest --version',
    'npx --yes supabase@latest projects list',
    'npx --yes supabase@latest db query --linked -f supabase/tests/anion_phase1_rls_smoke.sql -o table',
  ];

  if (!fs.existsSync(sqlFile)) {
    const endedAt = new Date().toISOString();
    const summary = `Smoke SQL file is missing: ${sqlFile}`;
    writeReport({
      status: 'failed',
      summary,
      details: summary,
      commands,
      startedAt,
      endedAt,
    });
    throw new Error(summary);
  }

  try {
    const version = run(commands[0], 60000).trim();
    const projectList = run(commands[1], 120000).trim();
    const smokeOutput = run(commands[2], 300000).trim();
    const endedAt = new Date().toISOString();

    writeReport({
      status: 'passed',
      summary: 'Linked Anion RLS smoke SQL executed successfully.',
      details: [
        `Supabase CLI: ${version}`,
        '',
        'Project list:',
        projectList,
        '',
        'Smoke output:',
        smokeOutput,
      ].join('\n'),
      commands,
      startedAt,
      endedAt,
    });

    console.log('Anion RLS smoke test passed.');
    console.log(`Report: ${path.relative(root, reportFile)}`);
  } catch (error) {
    const endedAt = new Date().toISOString();
    const normalized = normalizeError(error);
    const isNetworkTimeout =
      normalized.combined.includes('connectex') ||
      normalized.combined.includes('ETIMEDOUT') ||
      normalized.combined.includes('timed out') ||
      normalized.combined.includes('failed to connect as temp role') ||
      normalized.combined.includes('pooler.supabase.com');

    const summary = isNetworkTimeout
      ? 'Smoke run blocked by network timeout to Supabase pooler endpoint.'
      : 'Smoke run failed before completion.';

    writeReport({
      status: isNetworkTimeout ? 'blocked' : 'failed',
      summary,
      details: normalized.combined,
      commands,
      startedAt,
      endedAt,
    });

    console.error(summary);
    console.error(`Report: ${path.relative(root, reportFile)}`);
    process.exit(1);
  }
}

main();
