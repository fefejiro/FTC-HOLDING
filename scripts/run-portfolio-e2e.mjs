import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const configPath = path.join(root, process.env.PORTFOLIO_E2E_CONFIG || 'tests/e2e/portfolio-sites.json');
const outputPath = path.join(root, process.env.PORTFOLIO_E2E_OUTPUT || 'APPS/una-labs-site/public/ops/portfolio-e2e-status.json');
const timeoutMs = Number(process.env.PORTFOLIO_E2E_TIMEOUT_MS || 15000);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function countCommits(days) {
  const cmd = `git rev-list --count --since="${days} days ago" HEAD`;
  try {
    const output = execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const value = Number(output);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function normalizeUrl(baseUrl, routePath) {
  const normalizedBase = String(baseUrl || '').replace(/\/$/, '');
  const normalizedPath = String(routePath || '/').startsWith('/') ? String(routePath) : `/${routePath}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function runCheck(site, check) {
  const startedAt = new Date();
  const started = Date.now();
  const url = normalizeUrl(site.baseUrl, check.path || '/');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'FTC-Portfolio-E2E/1.0',
      },
    });

    const html = await response.text();
    const title = extractTitle(html);
    const expectedStatuses = Array.isArray(check.expectedStatuses) && check.expectedStatuses.length > 0
      ? check.expectedStatuses
      : [200];
    const statusOk = expectedStatuses.includes(response.status);
    const titleOk = check.titleIncludes
      ? title.toLowerCase().includes(String(check.titleIncludes).toLowerCase())
      : true;

    return {
      id: check.id,
      label: check.label || check.id,
      url,
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - started,
      statusCode: response.status,
      expectedStatuses,
      title,
      titleIncludes: check.titleIncludes || null,
      passed: statusOk && titleOk,
      detail: statusOk && titleOk
        ? `PASS ${response.status}${title ? ` | ${title}` : ''}`
        : `FAIL expected ${expectedStatuses.join('/')} got ${response.status}${check.titleIncludes ? ` | title must include '${check.titleIncludes}'` : ''}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id: check.id,
      label: check.label || check.id,
      url,
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - started,
      statusCode: null,
      expectedStatuses: check.expectedStatuses || [200],
      title: '',
      titleIncludes: check.titleIncludes || null,
      passed: false,
      detail: `FAIL ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runSite(site) {
  if (!site.enabled) {
    return {
      id: site.id,
      label: site.label,
      enabled: false,
      status: 'pending',
      reason: site.reason || 'Not enabled yet.',
      checksTotal: Array.isArray(site.checks) ? site.checks.length : 0,
      checksPassed: 0,
      checksFailed: 0,
      passRate: 0,
      checks: [],
    };
  }

  const checks = [];
  for (const check of site.checks || []) {
    checks.push(await runCheck(site, check));
  }

  const checksPassed = checks.filter((check) => check.passed).length;
  const checksFailed = checks.length - checksPassed;
  const passRate = checks.length ? Number(((checksPassed / checks.length) * 100).toFixed(2)) : 0;

  return {
    id: site.id,
    label: site.label,
    enabled: true,
    status: checksFailed > 0 ? 'failing' : 'passing',
    reason: checksFailed > 0 ? `${checksFailed} checks failing.` : 'All checks passing.',
    checksTotal: checks.length,
    checksPassed,
    checksFailed,
    passRate,
    checks,
  };
}

async function main() {
  const runStarted = Date.now();
  const now = new Date();
  const config = readJson(configPath);

  const suites = [];
  for (const site of config.sites || []) {
    suites.push(await runSite(site));
  }

  const activeSuites = suites.filter((suite) => suite.enabled);
  const pendingSuites = suites.filter((suite) => !suite.enabled);

  const checksTotal = activeSuites.reduce((sum, suite) => sum + suite.checksTotal, 0);
  const checksPassed = activeSuites.reduce((sum, suite) => sum + suite.checksPassed, 0);
  const checksFailed = activeSuites.reduce((sum, suite) => sum + suite.checksFailed, 0);
  const passRate = checksTotal ? Number(((checksPassed / checksTotal) * 100).toFixed(2)) : 0;

  const commits14d = countCommits(14);
  const commits30d = countCommits(30);

  const payload = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    generator: 'scripts/run-portfolio-e2e.mjs',
    summary: {
      overallStatus: checksFailed > 0 ? 'red' : 'green',
      checksTotal,
      checksPassed,
      checksFailed,
      passRate,
      activeSuites: activeSuites.length,
      pendingSuites: pendingSuites.length,
      cycleDurationMs: Date.now() - runStarted,
    },
    velocity: {
      commits14d,
      commits30d,
      signal: commits14d >= 25 ? 'high' : commits14d >= 10 ? 'medium' : 'low',
    },
    suites,
    nextActions: [
      'Enable pending suites when canonical production URLs are confirmed.',
      'Wire this script to CI on a schedule (recommended every 15 minutes).',
      'Commit or publish this JSON artifact so the dashboard can display latest status.',
    ],
  };

  writeJson(outputPath, payload);

  console.log('Portfolio E2E metrics updated.');
  console.log(`- Config: ${path.relative(root, configPath)}`);
  console.log(`- Output: ${path.relative(root, outputPath)}`);
  console.log(`- Active suites: ${activeSuites.length}`);
  console.log(`- Pending suites: ${pendingSuites.length}`);
  console.log(`- Checks: ${checksPassed}/${checksTotal} passed (${passRate}%)`);
  console.log(`- Velocity: 14d=${commits14d}, 30d=${commits30d}`);

  if (checksFailed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
