#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const projectRef = process.env.SUPABASE_PROJECT_REF || 'aaaextkrfoqomzmjjkxe';
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${projectRef}.supabase.co`).replace(/\/+$/, '');
const baseUrl = (process.env.ANION_BASE_URL || 'https://anion.unalabs.cloud').replace(/\/+$/, '');
const storageStateDir = process.env.ANION_EVIDENCE_STORAGE_DIR || path.join(process.cwd(), 'test-results', 'phase1-auth-states');
const chromeProfileDir = process.env.ANION_EVIDENCE_CHROME_PROFILE_DIR || path.join(process.cwd(), 'test-results', 'phase1-chrome-profiles');
const timeoutMs = Number(process.env.ANION_GOOGLE_CAPTURE_TIMEOUT_MS || 10 * 60 * 1000);
const pollMs = Number(process.env.ANION_GOOGLE_CAPTURE_POLL_MS || 3000);
const browserChannel = process.env.ANION_EVIDENCE_BROWSER_CHANNEL || 'chrome';
const captureBrowser = (process.env.ANION_GOOGLE_CAPTURE_BROWSER || 'playwright').toLowerCase();

const roles = [
  ['parent', process.env.ANION_PARENT_EMAIL || ''],
  ['tutor', process.env.ANION_TUTOR_EMAIL || ''],
  ['student', process.env.ANION_STUDENT_EMAIL || ''],
];

function requireEnv(name, value) {
  if (!value) throw new Error(`${name} is required.`);
}

function maskEmail(email) {
  const [name, domain] = String(email).split('@');
  if (!name || !domain) return '(invalid email)';
  return `${name.slice(0, 2)}***@${domain}`;
}

function getServiceRoleKeyFromCli() {
  const result = spawnSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', projectRef, '--output-format', 'json'],
    { encoding: 'utf8', shell: process.platform === 'win32' },
  );

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'supabase projects api-keys failed').trim());
  }

  const parsed = JSON.parse(result.stdout);
  const keys = Array.isArray(parsed?.keys) ? parsed.keys : Array.isArray(parsed) ? parsed : [];
  const serviceRole = keys.find((key) => key.id === 'service_role' && key.api_key)
    || keys.find((key) => key.name === 'service_role' && key.api_key)
    || keys.find((key) => key.type === 'secret' && key.secret_jwt_template?.role === 'service_role' && key.api_key);

  if (!serviceRole?.api_key) {
    throw new Error('Supabase service_role key was not returned by the CLI.');
  }

  return serviceRole.api_key;
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getServiceRoleKeyFromCli();

async function request(pathname) {
  const response = await fetch(`${supabaseUrl}${pathname}`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`Supabase ${pathname} failed: HTTP ${response.status} ${text}`);
  }
  return body;
}

async function findAuthUser(email) {
  const direct = await request(`/auth/v1/admin/users?email=${encodeURIComponent(email)}`);
  const directUsers = Array.isArray(direct?.users) ? direct.users : [];
  const directMatch = directUsers.find((user) => user.email?.toLowerCase() === email.toLowerCase());
  if (directMatch) return directMatch;

  for (let page = 1; page <= 10; page += 1) {
    const listed = await request(`/auth/v1/admin/users?page=${page}&per_page=100`);
    const users = Array.isArray(listed?.users) ? listed.users : [];
    const match = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < 100) break;
  }

  return null;
}

function hasGoogleIdentity(user) {
  return Array.isArray(user?.identities) && user.identities.some((identity) => identity.provider === 'google');
}

async function launchBrowser() {
  try {
    return await chromium.launch({
      channel: browserChannel,
      headless: false,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    });
  } catch (error) {
    if (browserChannel !== 'chrome') throw error;
    console.warn('Could not launch Chrome channel, falling back to bundled Chromium.');
    return chromium.launch({
      headless: false,
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    });
  }
}

function findSystemChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);

  const chromePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!chromePath) {
    throw new Error('Could not find chrome.exe. Set CHROME_PATH or use ANION_GOOGLE_CAPTURE_BROWSER=playwright.');
  }
  return chromePath;
}

function openSystemChrome(role) {
  const chromePath = findSystemChrome();
  const profileDir = path.join(chromeProfileDir, role);
  fs.mkdirSync(profileDir, { recursive: true });
  const child = spawn(
    chromePath,
    [
      `--user-data-dir=${profileDir}`,
      '--new-window',
      `${baseUrl}/login`,
    ],
    {
      encoding: 'utf8',
      shell: false,
      detached: true,
      stdio: 'ignore',
    },
  );

  child.unref();

  console.log(`Chrome profile: ${path.relative(process.cwd(), profileDir)}`);
  return profileDir;
}

async function waitForGoogleIdentity(email) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const user = await findAuthUser(email);
    if (hasGoogleIdentity(user)) return user;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`Timed out waiting for Google identity for ${maskEmail(email)}.`);
}

async function captureRole(browser, role, email) {
  const existing = await findAuthUser(email);
  if (hasGoogleIdentity(existing)) {
    console.log(`[PASS] ${role} already has Google identity: ${maskEmail(email)}`);
    return;
  }

  if (captureBrowser === 'system') {
    console.log('');
    console.log(`Sign in required for ${role}: ${maskEmail(email)}`);
    console.log('A normal Chrome window will open. Click "Continue with Google" and use the exact account for this role.');
    console.log('Leave the terminal running until it prints PASS. Close the Chrome window after PASS before evidence runs.');
    openSystemChrome(role);
    const user = await waitForGoogleIdentity(email);
    console.log(`[PASS] ${role} Google identity captured: ${maskEmail(email)} (${String(user.id).slice(0, 8)}...)`);
    return;
  }

  fs.mkdirSync(storageStateDir, { recursive: true });
  const storageState = path.join(storageStateDir, `${role}.json`);
  const context = await browser.newContext({
    baseURL: baseUrl,
    permissions: ['camera', 'microphone'],
  });
  const page = await context.newPage();

  console.log('');
  console.log(`Sign in required for ${role}: ${maskEmail(email)}`);
  console.log('Use the exact account for this role. If Google shows another account, choose "Use another account".');
  console.log('After the app redirects back, leave the browser open until this terminal prints PASS.');

  await page.goto('/login', { waitUntil: 'networkidle' });
  const googleButton = page.getByRole('button', { name: /google/i }).first();
  if ((await googleButton.count().catch(() => 0)) > 0) {
    await googleButton.click().catch(() => {});
  }

  const user = await waitForGoogleIdentity(email);
  await context.storageState({ path: storageState });
  await context.close();

  console.log(`[PASS] ${role} Google identity captured: ${maskEmail(email)} (${String(user.id).slice(0, 8)}...)`);
  console.log(`Storage state: ${path.relative(process.cwd(), storageState)}`);
}

async function main() {
  for (const [role, email] of roles) {
    requireEnv(`ANION_${role.toUpperCase()}_EMAIL`, email);
  }

  console.log('Capturing Anion Phase 1 Google QA identities');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Project: ${projectRef}`);
  console.log(`Capture browser: ${captureBrowser}`);
  if (captureBrowser === 'playwright') {
    console.log(`Browser channel: ${browserChannel}`);
  }

  let browser = null;
  try {
    if (captureBrowser === 'playwright') {
      browser = await launchBrowser();
    } else if (captureBrowser !== 'system') {
      throw new Error('ANION_GOOGLE_CAPTURE_BROWSER must be "playwright" or "system".');
    }

    for (const [role, email] of roles) {
      await captureRole(browser, role, email);
    }
  } finally {
    if (browser) await browser.close();
  }

  console.log('');
  console.log('All Google QA identities are present. Next: npm run phase1:provision-google-qa');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
