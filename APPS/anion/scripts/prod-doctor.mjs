#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';

const workerName = process.env.ANION_WORKER_NAME || 'anion-web';
const baseUrl = (process.env.ANION_BASE_URL || 'https://anion.unalabs.cloud').replace(/\/+$/, '');

const requiredSecretGroups = [
  {
    name: 'Supabase auth/data',
    required: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    blocks: ['login', 'dashboards', 'role evidence'],
  },
  {
    name: 'Daily video classroom',
    required: ['DAILY_API_KEY', 'DAILY_DOMAIN'],
    blocks: ['tutor video join', 'student video join', 'leave/rejoin production evidence'],
  },
  {
    name: 'Stripe billing',
    required: [
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_PRICE_STARTER',
      'STRIPE_PRICE_GROWTH',
      'STRIPE_PRICE_UNLIMITED',
    ],
    blocks: ['checkout', 'billing portal', 'subscription sync'],
  },
];

const checks = [];
const statusBlockers = new Set([
  'supabase_service_role_invalid',
  'stripe_subscription_state_unverified',
  'daily_call_ui_cdn_unreachable',
  'phase1_domain_fixture_missing',
  'confirmed_phase1_test_credentials',
  'supabase_auth_allow_list',
]);

function record(name, ok, detail, severity = 'info') {
  checks.push({ name, ok, detail, severity });
  const label = ok ? 'PASS' : severity === 'blocker' ? 'BLOCKED' : 'WARN';
  console.log(`[${label}] ${name}${detail ? `: ${detail}` : ''}`);
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function fetchJson(path, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { accept: 'application/json' },
        redirect: 'manual',
        signal: controller.signal,
      });
      const text = await response.text();
      return { response, body: parseJsonSafe(text), text, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

function describeFetchError(error) {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : '';
  return `${error.message}${cause}`;
}

async function checkProductionHttp() {
  try {
    const health = await fetchJson('/api/health');
    record('Production /api/health', health.response.status === 200 && health.body?.ok === true, `HTTP ${health.response.status}, attempts=${health.attempts}`);
  } catch (error) {
    record('Production /api/health', false, describeFetchError(error), 'blocker');
  }

  try {
    const status = await fetchJson('/api/status');
    const phase = typeof status.body?.phase === 'string' ? status.body.phase : '(missing phase)';
    record('Production /api/status', status.response.status === 200 && status.body?.ok === true, `HTTP ${status.response.status}, phase=${phase}, attempts=${status.attempts}`);
    const externalConfig = Array.isArray(status.body?.blockers?.externalConfig)
      ? status.body.blockers.externalConfig.filter((blocker) => statusBlockers.has(blocker))
      : [];
    if (externalConfig.length > 0) {
      record('Runtime handover blockers', false, externalConfig.join(', '), 'blocker');
    } else {
      record('Runtime handover blockers', true, 'none reported by /api/status');
    }
  } catch (error) {
    record('Production /api/status', false, describeFetchError(error), 'blocker');
  }
}

function listWorkerSecrets() {
  const result = spawnSync('npx', ['wrangler', 'secret', 'list', '--name', workerName], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || 'wrangler secret list failed').trim();
    record('Cloudflare secret inventory', false, detail, 'blocker');
    return null;
  }

  const parsed = parseJsonSafe(result.stdout);
  if (!Array.isArray(parsed)) {
    record('Cloudflare secret inventory', false, 'Could not parse wrangler secret list JSON output.', 'blocker');
    return null;
  }

  const names = new Set(parsed.map((entry) => entry?.name).filter((name) => typeof name === 'string'));
  record('Cloudflare secret inventory', true, `${names.size} secrets visible for ${workerName}`);
  return names;
}

function checkSecretGroups(names) {
  if (!names) return;

  for (const group of requiredSecretGroups) {
    const missing = group.required.filter((name) => !names.has(name));
    const ok = missing.length === 0;
    record(
      `${group.name} secrets`,
      ok,
      ok
        ? `${group.required.length}/${group.required.length} present`
        : `missing ${missing.join(', ')}; blocks ${group.blocks.join(', ')}`,
      ok ? 'info' : 'blocker',
    );
  }
}

async function main() {
  console.log(`\nAnion production doctor`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Worker: ${workerName}\n`);

  await checkProductionHttp();
  const names = listWorkerSecrets();
  checkSecretGroups(names);

  const blockers = checks.filter((check) => !check.ok && check.severity === 'blocker');
  console.log('\n=== Anion Production Doctor Summary ===');
  for (const check of checks) {
    console.log(`- [${check.ok ? 'PASS' : check.severity === 'blocker' ? 'BLOCKED' : 'WARN'}] ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
  }

  if (blockers.length > 0) {
    console.log('\nProduction is reachable, but Anion is not handover-green yet.');
    console.log('Next required action: resolve the blocker codes above, then run authenticated parent/tutor/student role evidence.');
    process.exit(1);
  }

  console.log('\nProduction prerequisites are present. Proceed to authenticated role evidence.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
