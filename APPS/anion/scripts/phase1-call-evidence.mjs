#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const baseUrl = (process.env.ANION_BASE_URL || 'https://anion.unalabs.cloud').replace(/\/+$/, '');
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const defaultPhase1BookingId = '63404ecd-6b16-4466-bb15-745208cab970';
const bookingId = process.env.ANION_PHASE1_BOOKING_ID || defaultPhase1BookingId;
const outputDir =
  process.env.ANION_EVIDENCE_DIR ||
  path.join(process.cwd(), 'test-results', `phase1-call-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const storageStateDir = process.env.ANION_EVIDENCE_STORAGE_DIR || path.join(process.cwd(), 'test-results', 'phase1-auth-states');
const chromeProfileDir = process.env.ANION_EVIDENCE_CHROME_PROFILE_DIR || path.join(process.cwd(), 'test-results', 'phase1-chrome-profiles');
const postClassroomEvidence = process.env.ANION_EVIDENCE_POST_CLASSROOM === '1';
const authMode = (process.env.ANION_PHASE1_AUTH_MODE || (serviceRoleKey ? 'service-role' : 'manual')).toLowerCase();
const useChromeProfiles = process.env.ANION_EVIDENCE_USE_CHROME_PROFILES === '1';
const browserChannel = process.env.ANION_EVIDENCE_BROWSER_CHANNEL || 'chrome';

const roleInputs = {
  parent: process.env.ANION_PARENT_EMAIL || '',
  tutor: process.env.ANION_TUTOR_EMAIL || '',
  student: process.env.ANION_STUDENT_EMAIL || '',
  admin: process.env.ANION_ADMIN_EMAIL || '',
};

const expectedPaths = {
  parent: '/parent',
  tutor: '/tutor',
  student: '/student',
  admin: '/admin',
};

const storageStatePaths = {
  parent: process.env.ANION_PARENT_STORAGE_STATE || path.join(storageStateDir, 'parent.json'),
  tutor: process.env.ANION_TUTOR_STORAGE_STATE || path.join(storageStateDir, 'tutor.json'),
  student: process.env.ANION_STUDENT_STORAGE_STATE || path.join(storageStateDir, 'student.json'),
  admin: process.env.ANION_ADMIN_STORAGE_STATE || path.join(storageStateDir, 'admin.json'),
};

const chromeProfilePaths = {
  parent: process.env.ANION_PARENT_CHROME_PROFILE || path.join(chromeProfileDir, 'parent'),
  tutor: process.env.ANION_TUTOR_CHROME_PROFILE || path.join(chromeProfileDir, 'tutor'),
  student: process.env.ANION_STUDENT_CHROME_PROFILE || path.join(chromeProfileDir, 'student'),
  admin: process.env.ANION_ADMIN_CHROME_PROFILE || path.join(chromeProfileDir, 'admin'),
};

const results = [];
const screenshots = [];
let booking = null;
let browserHeadless = true;

function record(role, check, ok, detail = '') {
  results.push({ role, check, ok, detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${role} ${check}${detail ? `: ${detail}` : ''}`);
}

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
}

function safeName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function screenshot(page, name) {
  const file = path.join(outputDir, `${safeName(name)}.png`);
  await page.screenshot({ path: file, fullPage: true }).catch(() => {});
  screenshots.push(file);
  return file;
}

async function supabaseRest(pathname, init = {}) {
  const response = await fetch(`${supabaseUrl}${pathname}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`Supabase REST ${pathname} failed: HTTP ${response.status} ${text}`);
  }
  return body;
}

async function loadBooking() {
  if (authMode === 'manual' && (!supabaseUrl || !serviceRoleKey)) {
    booking = { id: bookingId, subject: null, status: 'unknown' };
    record(
      'system',
      'booking fixture loaded',
      true,
      `skipped Supabase lookup in manual auth mode; route/API checks will verify booking ${bookingId}`,
    );
    return;
  }

  const rows = await supabaseRest(
    `/rest/v1/bookings?select=id,subject,status,parent_id,tutor_id,student_id,requested_start_at,duration_minutes&id=eq.${encodeURIComponent(bookingId)}&limit=1`,
  );
  if (!Array.isArray(rows) || !rows[0]) {
    throw new Error(`Booking ${bookingId} was not found in production Supabase.`);
  }
  booking = rows[0];
  record('system', 'booking fixture loaded', true, `${booking.subject} / ${booking.status}`);
  if (booking.status !== 'accepted') {
    record('system', 'booking is accepted', false, `status=${booking.status}`);
  } else {
    record('system', 'booking is accepted', true, booking.id);
  }
}

async function generateMagicLink(email) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email,
      options: {
        redirect_to: `${baseUrl}/auth/callback`,
      },
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.action_link) {
    throw new Error(`Could not generate magic link for ${email}: HTTP ${response.status} ${JSON.stringify(body)}`);
  }
  if (body.hashed_token && body.verification_type) {
    const callback = new URL(`${baseUrl}/auth/callback`);
    callback.searchParams.set('token_hash', String(body.hashed_token));
    callback.searchParams.set('type', String(body.verification_type));
    return callback.toString();
  }

  const link = new URL(String(body.action_link));
  link.searchParams.set('redirect_to', `${baseUrl}/auth/callback`);
  return link.toString();
}

async function signInRole(browser, role, email) {
  if (authMode === 'manual') {
    return signInManualRole(browser, role);
  }

  const context = await browser.newContext({
    baseURL: baseUrl,
    permissions: ['camera', 'microphone'],
  });
  const page = await context.newPage();
  const link = await generateMagicLink(email);

  await page.goto(link, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  const expectedPath = expectedPaths[role];
  const pathOk = new URL(page.url()).pathname === expectedPath;
  await screenshot(page, `${role}-signed-in`);
  record(role, 'sign-in routed to role dashboard', pathOk, page.url());

  if (!pathOk) {
    throw new Error(`${role} sign-in did not land on ${expectedPath}; current URL is ${page.url()}`);
  }

  return { context, page };
}

async function signInManualRole(browser, role) {
  if (useChromeProfiles && fs.existsSync(chromeProfilePaths[role])) {
    const context = await chromium.launchPersistentContext(chromeProfilePaths[role], {
      channel: browserChannel,
      headless: browserHeadless,
      baseURL: baseUrl,
      permissions: ['camera', 'microphone'],
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    });
    const page = context.pages()[0] ?? await context.newPage();
    const expectedPath = expectedPaths[role];
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    const pathOk = new URL(page.url()).pathname === expectedPath;
    await context.storageState({ path: storageStatePaths[role] });
    await screenshot(page, `${role}-signed-in`);
    record(role, 'sign-in routed to role dashboard', pathOk, `${page.url()} (manual chrome-profile auth)`);

    if (!pathOk) {
      await context.close();
      throw new Error(`${role} Chrome profile did not land on ${expectedPath}; current URL is ${page.url()}`);
    }

    return { context, page };
  }

  fs.mkdirSync(storageStateDir, { recursive: true });
  const storageState = storageStatePaths[role];
  fs.mkdirSync(path.dirname(storageState), { recursive: true });
  const hasStoredSession = fs.existsSync(storageState);
  const context = await browser.newContext({
    baseURL: baseUrl,
    permissions: ['camera', 'microphone'],
    ...(hasStoredSession ? { storageState } : {}),
  });
  const page = await context.newPage();
  const expectedPath = expectedPaths[role];

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  let pathOk = new URL(page.url()).pathname === expectedPath;

  if (!pathOk) {
    if (browserHeadless) {
      await context.close();
      throw new Error(
        `${role} manual auth requires an existing storage state at ${storageState} or ANION_EVIDENCE_HEADED=1 for interactive Google sign-in.`,
      );
    }

    console.log(`\nManual auth required: sign in as ${role}${roleInputs[role] ? ` (${roleInputs[role]})` : ''}.`);
    console.log(`Expected landing path: ${expectedPath}`);
    console.log(`Storage state will be saved to: ${storageState}\n`);
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 10 * 60 * 1000 });
    pathOk = true;
  }

  await context.storageState({ path: storageState });
  await screenshot(page, `${role}-signed-in`);
  record(role, 'sign-in routed to role dashboard', pathOk, `${page.url()} (manual ${hasStoredSession ? 'stored-session' : 'interactive'} auth)`);

  if (!pathOk) {
    throw new Error(`${role} sign-in did not land on ${expectedPath}; current URL is ${page.url()}`);
  }

  return { context, page };
}

async function bodyText(page) {
  return (await page.locator('body').textContent().catch(() => '')) || '';
}

async function expectTexts(page, role, labels) {
  const text = await bodyText(page);
  for (const label of labels) {
    const ok = text.toLowerCase().includes(label.toLowerCase());
    record(role, `surface text "${label}"`, ok, page.url());
  }
  if (booking?.subject) {
    const ok = text.toLowerCase().includes(String(booking.subject).toLowerCase());
    record(role, 'accepted booking subject visible', ok, booking.subject);
  }
}

async function directDailyTokenCheck(page, role) {
  const apiResult = await page.evaluate(
    async ({ id, participantRole }) => {
      const response = await fetch('/api/daily/room', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: id, participantRole }),
      });
      const body = await response.json().catch(() => null);
      return {
        status: response.status,
        ok: body?.ok === true,
        code: body?.code,
        roomName: body?.roomName,
        tokenPresent: typeof body?.token === 'string' && body.token.length > 0,
        localMode: body?.localMode === true,
      };
    },
    { id: bookingId, participantRole: role },
  );
  record(
    role,
    'daily token API grants assigned role',
    apiResult.status === 200 && apiResult.ok && apiResult.roomName === `anion-${bookingId}`,
    `HTTP ${apiResult.status}, room=${apiResult.roomName ?? '(none)'}, tokenPresent=${apiResult.tokenPresent || apiResult.localMode}`,
  );
}

async function verifyVideoSurface(page, role) {
  const surface = page.locator('[data-testid="daily-custom-call-room"], [data-testid="local-demo-video-room"]').first();
  await surface.waitFor({ state: 'visible', timeout: 30_000 });

  const localVideo = page.locator('[data-testid="daily-local-video"], [data-testid="local-demo-self-video"]').first();
  await localVideo.waitFor({ state: 'visible', timeout: 30_000 });

  const surfaceId = await surface.getAttribute('data-testid').catch(() => '(unknown)');
  record(role, 'video surface visible', true, surfaceId ?? '(unknown)');
}

async function verifyBackgroundControls(page, role) {
  const surface = page.locator('[data-testid="daily-custom-call-room"], [data-testid="local-demo-video-room"]').first();
  const checks = [
    ['background-option-soft-blur', 'Soft blur active', 'soft-blur'],
    ['background-option-strong-blur', 'Strong blur active', 'strong-blur'],
    ['background-option-none', 'Background off', 'none'],
  ];

  for (const [testId, expectedStatus, expectedMode] of checks) {
    await page.getByTestId(testId).click();
    await page.waitForFunction(
      (expected) => document.querySelector('[data-testid="background-status"]')?.textContent?.includes(expected),
      expectedStatus,
      { timeout: 20_000 },
    );
    const mode = await surface.getAttribute('data-background-mode').catch(() => null);
    record(role, `background ${expectedMode}`, mode === expectedMode, `status=${expectedStatus}, mode=${mode ?? '(missing)'}`);
  }
}

async function parentEvidence(browser) {
  const { context, page } = await signInRole(browser, 'parent', roleInputs.parent);
  try {
    await page.goto('/parent', { waitUntil: 'networkidle' });
    await screenshot(page, 'parent-dashboard');
    await expectTexts(page, 'parent', ['Parent Dashboard', 'Booking Status', 'Linked Students', 'Learning Activity']);

    await page.goto(`/lesson/${bookingId}`, { waitUntil: 'networkidle' });
    await screenshot(page, 'parent-lesson-denied-or-redirected');
    const deniedRoute = new URL(page.url()).pathname !== `/lesson/${bookingId}`;
    record('parent', 'lesson route denied', deniedRoute, page.url());

    const apiResult = await page.evaluate(async (id) => {
      const response = await fetch('/api/daily/room', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookingId: id, participantRole: 'student' }),
      });
      const body = await response.json().catch(() => null);
      return { status: response.status, code: body?.code };
    }, bookingId);
    record(
      'parent',
      'daily token denied',
      apiResult.status === 403 && apiResult.code === 'LESSON_ACCESS_DENIED',
      `HTTP ${apiResult.status}, code=${apiResult.code ?? '(none)'}`,
    );
  } finally {
    await context.close();
  }
}

async function maybePostClassroomEvidence(page, role) {
  if (!postClassroomEvidence) {
    record(role, 'classroom write mutation', true, 'skipped; set ANION_EVIDENCE_POST_CLASSROOM=1 to publish a controlled evidence post');
    return;
  }

  const marker = `Anion handover evidence ${role} ${new Date().toISOString()}`;
  if (role === 'tutor') {
    const studentSelect = page.locator('select[name="studentId"]').first();
    if ((await studentSelect.count()) > 0) {
      await studentSelect.selectOption({ index: 1 }).catch(() => {});
    }
  }
  await page.locator('textarea[name="body"]').first().fill(marker);
  await page.getByRole('button', { name: /Post to Feed/i }).first().click();
  await page.waitForLoadState('networkidle').catch(() => {});
  await screenshot(page, `${role}-classroom-posted`);
  const text = await bodyText(page);
  record(role, 'controlled classroom post visible', text.includes(marker), marker);
}

async function participantEvidence(browser, role) {
  const { context, page } = await signInRole(browser, role, roleInputs[role]);
  try {
    await page.goto(`/${role}`, { waitUntil: 'networkidle' });
    await screenshot(page, `${role}-dashboard`);
    await expectTexts(
      page,
      role,
      role === 'tutor'
        ? ['Tutor Dashboard', 'Teacher Writing Board', 'Booking Requests']
        : ['Student Dashboard', 'Learning Feed', 'Upcoming Lessons'],
    );
    await maybePostClassroomEvidence(page, role);
    await directDailyTokenCheck(page, role);

    await page.goto(`/lesson/${bookingId}`, { waitUntil: 'networkidle' });
    await ensureLessonJoinAttempt(page);
    await page.waitForSelector('[data-testid="lesson-call-status"]', { timeout: 30_000 });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="lesson-call-status"]')?.textContent?.includes('Connected'),
      null,
      { timeout: 90_000 },
    );
    await screenshot(page, `${role}-lesson-connected`);
    await expectTexts(page, role, ['Live Classroom', 'Lesson Context', 'Classroom Timeline']);
    record(role, 'daily join connected', true, page.url());
    await verifyVideoSurface(page, role);
    await verifyBackgroundControls(page, role);

    await page.getByTestId('leave-lesson-button').click();
    await page.waitForSelector('[data-testid="rejoin-lesson-button"]', { timeout: 15_000 });
    await screenshot(page, `${role}-lesson-left`);
    record(role, 'leave available', true, 'left state visible');

    await page.getByTestId('rejoin-lesson-button').click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="lesson-call-status"]')?.textContent?.includes('Connected'),
      null,
      { timeout: 90_000 },
    );
    await screenshot(page, `${role}-lesson-rejoined`);
    record(role, 'rejoin connected', true, page.url());
  } catch (error) {
    await screenshot(page, `${role}-failure`);
    record(role, 'journey', false, error instanceof Error ? error.message : String(error));
  } finally {
    await context.close();
  }
}

async function concurrentJoinEvidence(browser) {
  const tutor = await signInRole(browser, 'tutor', roleInputs.tutor);
  const student = await signInRole(browser, 'student', roleInputs.student);
  try {
    await Promise.all([
      tutor.page.goto(`/lesson/${bookingId}`, { waitUntil: 'networkidle' }),
      student.page.goto(`/lesson/${bookingId}`, { waitUntil: 'networkidle' }),
    ]);
    await Promise.all([
      ensureLessonJoinAttempt(tutor.page),
      ensureLessonJoinAttempt(student.page),
    ]);
    await Promise.all([
      tutor.page.waitForFunction(
        () => document.querySelector('[data-testid="lesson-call-status"]')?.textContent?.includes('Connected'),
        null,
        { timeout: 90_000 },
      ),
      student.page.waitForFunction(
        () => document.querySelector('[data-testid="lesson-call-status"]')?.textContent?.includes('Connected'),
        null,
        { timeout: 90_000 },
      ),
    ]);
    await screenshot(tutor.page, 'concurrent-tutor-connected');
    await screenshot(student.page, 'concurrent-student-connected');
    record('system', 'tutor and student concurrent join', true, bookingId);
  } catch (error) {
    await screenshot(tutor.page, 'concurrent-tutor-failure');
    await screenshot(student.page, 'concurrent-student-failure');
    record('system', 'tutor and student concurrent join', false, error instanceof Error ? error.message : String(error));
  } finally {
    await tutor.context.close();
    await student.context.close();
  }
}

async function ensureLessonJoinAttempt(page) {
  await page
    .waitForSelector('[data-testid="lesson-call-status"], [data-testid="rejoin-lesson-button"]', { timeout: 10_000 })
    .catch(() => {});
  const rejoinButton = page.getByTestId('rejoin-lesson-button').first();
  if ((await rejoinButton.count().catch(() => 0)) > 0 && await rejoinButton.isVisible().catch(() => false)) {
    await rejoinButton.click();
    await page.waitForLoadState('networkidle').catch(() => {});
  }
}

async function adminEvidence(browser) {
  if (!roleInputs.admin) {
    record('admin', 'dashboard evidence', true, 'skipped; set ANION_ADMIN_EMAIL to include admin proof');
    return;
  }

  const { context, page } = await signInRole(browser, 'admin', roleInputs.admin);
  try {
    await page.goto('/admin', { waitUntil: 'networkidle' });
    await screenshot(page, 'admin-dashboard');
    await expectTexts(page, 'admin', ['Operator Dashboard', 'Users', 'Bookings', 'Subscriptions', 'Parent-Student Links']);
  } finally {
    await context.close();
  }
}

function writeReports() {
  const report = {
    baseUrl,
    authMode,
    booking,
    bookingId,
    generatedAt: new Date().toISOString(),
    postClassroomEvidence,
    screenshots: screenshots.map((file) => path.relative(process.cwd(), file)),
    results,
  };
  const reportPath = path.join(outputDir, 'phase1-call-evidence.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const lines = [
    '# Anion Phase 1 Call Evidence',
    '',
    `- Base URL: ${baseUrl}`,
    `- Booking ID: ${bookingId}`,
    `- Booking subject: ${booking?.subject ?? '(unknown)'}`,
    `- Generated: ${report.generatedAt}`,
    `- Classroom write mutation: ${postClassroomEvidence ? 'enabled' : 'skipped'}`,
    '',
    '## Results',
    '',
    '| Role | Check | Status | Detail |',
    '| --- | --- | --- | --- |',
    ...results.map((result) => `| ${result.role} | ${result.check} | ${result.ok ? 'PASS' : 'FAIL'} | ${String(result.detail).replace(/\|/g, '/')} |`),
    '',
    '## Screenshots',
    '',
    ...screenshots.map((file) => `- ${path.relative(process.cwd(), file)}`),
    '',
  ];
  const markdownPath = path.join(outputDir, 'phase1-call-evidence.md');
  fs.writeFileSync(markdownPath, lines.join('\n'));
  return { reportPath, markdownPath };
}

async function main() {
  if (!['service-role', 'manual'].includes(authMode)) {
    throw new Error(`ANION_PHASE1_AUTH_MODE must be "service-role" or "manual"; received "${authMode}".`);
  }

  requireEnv('ANION_PHASE1_BOOKING_ID', bookingId);

  if (authMode === 'service-role') {
    requireEnv('NEXT_PUBLIC_SUPABASE_URL', supabaseUrl);
    requireEnv('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey);
    requireEnv('ANION_PARENT_EMAIL', roleInputs.parent);
    requireEnv('ANION_TUTOR_EMAIL', roleInputs.tutor);
    requireEnv('ANION_STUDENT_EMAIL', roleInputs.student);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Evidence output: ${outputDir}`);
  console.log(`Auth mode: ${authMode}`);
  await loadBooking();

  const manualStorageReady =
    authMode !== 'manual' ||
    ['parent', 'tutor', 'student'].every((role) => fs.existsSync(storageStatePaths[role]));
  browserHeadless = process.env.ANION_EVIDENCE_HEADED === '1' || (authMode === 'manual' && !manualStorageReady) ? false : true;

  const browser = await chromium.launch({
    headless: browserHeadless,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });

  try {
    await parentEvidence(browser);
    await participantEvidence(browser, 'tutor');
    await participantEvidence(browser, 'student');
    await concurrentJoinEvidence(browser);
    await adminEvidence(browser);
  } finally {
    await browser.close();
  }

  const { reportPath, markdownPath } = writeReports();
  const failures = results.filter((result) => !result.ok);
  console.log(`Evidence report: ${reportPath}`);
  console.log(`Evidence summary: ${markdownPath}`);

  if (failures.length > 0) {
    console.error(`Phase 1 evidence failed: ${failures.length}/${results.length} checks failed.`);
    process.exit(1);
  }

  console.log(`Phase 1 evidence passed: ${results.length}/${results.length} checks passed.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
