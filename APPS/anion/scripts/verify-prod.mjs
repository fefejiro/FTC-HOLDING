#!/usr/bin/env node

import process from 'node:process';

const args = process.argv.slice(2);

function parseArgs(argv) {
  const parsed = {
    baseUrl: process.env.ANION_BASE_URL ?? process.env.ANION_PROD_BASE_URL ?? '',
    checkStripeWebhook: process.env.CHECK_STRIPE_WEBHOOK === '1',
    checkDailyRoom: process.env.CHECK_DAILY_ROOM_SMOKE === '1',
    // This is the expected contract response for POST /api/daily/room with empty JSON body.
    expectedDailyErrorCode: process.env.EXPECTED_DAILY_ERROR_CODE ?? 'INVALID_DAILY_ROOM_REQUEST',
    expectedAuthRedirectPaths: (process.env.VERIFY_AUTH_REDIRECT_PATHS ?? '/login,/dashboard')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  };

  for (let i = 0; i < argv.length;) {
    const token = argv[i];
    if (token === '--base-url') {
      if (i + 1 < argv.length) {
        parsed.baseUrl = argv[i + 1] ?? '';
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (token === '--check-stripe-webhook') {
      parsed.checkStripeWebhook = true;
      i += 1;
      continue;
    }
    if (token === '--check-daily-room') {
      parsed.checkDailyRoom = true;
      i += 1;
      continue;
    }
    i += 1;
  }

  parsed.baseUrl = parsed.baseUrl.trim().replace(/\/+$/, '');
  return parsed;
}

const config = parseArgs(args);
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}${detail ? `: ${detail}` : ''}`);
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const bodyText = await response.text();
    return { response, bodyText };
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonSafe(raw) {
  try {
    return raw.length ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function extractPathname(location, baseUrl) {
  if (!location) return '';
  try {
    return new URL(location, baseUrl).pathname;
  } catch {
    return '';
  }
}

async function checkHealth(baseUrl) {
  const url = `${baseUrl}/api/health`;
  try {
    const { response, bodyText } = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'manual',
    });
    const body = parseJsonSafe(bodyText);
    const ok = response.status === 200 && body?.ok === true;
    record('GET /api/health', ok, `HTTP ${response.status}`);
  } catch (error) {
    record('GET /api/health', false, error instanceof Error ? error.message : String(error));
  }
}

async function checkStatus(baseUrl) {
  const url = `${baseUrl}/api/status`;
  try {
    const { response, bodyText } = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'manual',
    });
    const body = parseJsonSafe(bodyText);
    const ok = response.status === 200 && body?.ok === true;
    record('GET /api/status', ok, `HTTP ${response.status}`);
  } catch (error) {
    record('GET /api/status', false, error instanceof Error ? error.message : String(error));
  }
}

async function checkAuthCallback(baseUrl) {
  const url = `${baseUrl}/auth/callback`;
  try {
    const { response } = await fetchWithTimeout(url, {
      method: 'GET',
      redirect: 'manual',
    });
    const location = response.headers.get('location') ?? '';
    const pathname = extractPathname(location, baseUrl);
    const isRedirect = response.status >= 300 && response.status < 400;
    // Allow exact redirect paths and nested paths (for apps that mount dashboard/login deeper).
    const matchesExpectedRedirectPath = config.expectedAuthRedirectPaths.some(
      (expectedPath) => pathname === expectedPath || (expectedPath !== '/' && pathname.startsWith(`${expectedPath}/`)),
    );
    const ok = isRedirect && matchesExpectedRedirectPath;
    record('Auth callback URL sanity (/auth/callback)', ok, `HTTP ${response.status}${location ? ` -> ${location}` : ''}`);
  } catch (error) {
    record(
      'Auth callback URL sanity (/auth/callback)',
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function checkStripeWebhook(baseUrl) {
  const url = `${baseUrl}/api/webhooks/stripe`;
  try {
    const { response } = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{}',
      redirect: 'manual',
    });

    // Reachability-only check: this confirms route wiring exists without requiring a valid signature.
    const ok = response.status !== 404;
    record('Stripe webhook endpoint reachability (optional)', ok, `HTTP ${response.status}`);
  } catch (error) {
    record(
      'Stripe webhook endpoint reachability (optional)',
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function checkDailyRoomContract(baseUrl) {
  const url = `${baseUrl}/api/daily/room`;
  try {
    const { response, bodyText } = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{}',
      redirect: 'manual',
    });

    const body = parseJsonSafe(bodyText);
    const returnedCode = typeof body?.code === 'string' ? body.code : '(missing)';
    const ok = response.status === 400 && returnedCode === config.expectedDailyErrorCode;
    record('Daily room contract smoke (optional, non-destructive)', ok, `HTTP ${response.status}, code=${returnedCode}`);
  } catch (error) {
    record(
      'Daily room contract smoke (optional, non-destructive)',
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

function printSummaryAndExit() {
  const failures = results.filter((result) => !result.ok);
  console.log('\n=== Production Verification Summary ===');
  for (const result of results) {
    console.log(`- [${result.ok ? 'PASS' : 'FAIL'}] ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
  }

  if (failures.length > 0) {
    console.error(`\nProduction verification failed: ${failures.length}/${results.length} checks failed.`);
    process.exit(1);
  }

  console.log(`\nProduction verification passed: ${results.length}/${results.length} checks passed.`);
}

async function main() {
  if (!config.baseUrl) {
    record('Base URL configuration', false, 'Set ANION_BASE_URL or pass --base-url https://your-domain');
    printSummaryAndExit();
    return;
  }

  record('Base URL configuration', true, `Using ${config.baseUrl}`);

  await checkHealth(config.baseUrl);
  await checkStatus(config.baseUrl);
  await checkAuthCallback(config.baseUrl);

  if (config.checkStripeWebhook) {
    await checkStripeWebhook(config.baseUrl);
  } else {
    record('Stripe webhook endpoint reachability (optional)', true, 'Skipped (set CHECK_STRIPE_WEBHOOK=1 to enable)');
  }

  if (config.checkDailyRoom) {
    await checkDailyRoomContract(config.baseUrl);
  } else {
    record('Daily room contract smoke (optional, non-destructive)', true, 'Skipped (set CHECK_DAILY_ROOM_SMOKE=1 to enable)');
  }

  printSummaryAndExit();
}

main().catch((error) => {
  console.error('Production verification script crashed:', error);
  process.exit(1);
});
