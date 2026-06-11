import { expect, test } from '@playwright/test';

/**
 * Anion E2E smoke tests.
 *
 * These tests are designed to run with placeholder Supabase credentials,
 * so they never require a live Supabase or Stripe connection:
 *   - Public routes (login, pricing) render normally without auth.
 *   - Protected routes return a redirect to /login when there is no session;
 *     Supabase's auth.getUser() returns null immediately when no session
 *     cookie is present, so no real network call is made.
 *   - The billing checkout API returns 401 UNAUTHENTICATED before Stripe
 *     is touched, so no real Stripe key is needed.
 *
 * TODO: When a staging environment is available, add authenticated flows
 * (parent dashboard interaction, lesson room entry, Stripe redirect).
 */

test.describe('Health', () => {
  test('GET /api/health returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe('anion-web');
  });
});

test.describe('API contract - daily room', () => {
  test('POST /api/daily/room with malformed body returns 400 INVALID_DAILY_ROOM_REQUEST', async ({
    request,
  }) => {
    const response = await request.post('/api/daily/room', {
      headers: {
        origin: 'http://localhost:4178',
      },
      data: {
        bookingId: 'smoke-test-booking',
      },
    });
    expect(response.status()).toBe(400);
    const body = (await response.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe('INVALID_DAILY_ROOM_REQUEST');
  });

  test('POST /api/daily/room without auth returns 401 UNAUTHENTICATED', async ({
    request,
  }) => {
    const response = await request.post('/api/daily/room', {
      headers: {
        origin: 'http://localhost:4178',
      },
      data: {
        bookingId: 'smoke-test-booking',
        participantRole: 'student',
      },
    });
    expect(response.status()).toBe(401);
    const body = (await response.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe('UNAUTHENTICATED');
  });
});

test.describe('Public routes', () => {
  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign in');
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByLabel(/Email address/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Email me a secure link/i })).toHaveCount(0);
  });

  test('pricing page renders all three plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toContainText('Invest in learning that sticks');
    await expect(page.getByRole('button', { name: 'Get Starter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Growth' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Unlimited' })).toBeVisible();
  });
});

test.describe('Auth gating — unauthenticated redirects', () => {
  test('/parent redirects to /login', async ({ page }) => {
    await page.goto('/parent');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/lesson/:sessionId redirects to /login', async ({ page }) => {
    await page.goto('/lesson/smoke-test-session-id');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('API contract — billing/checkout', () => {
  test('POST /api/billing/checkout without auth returns 401 UNAUTHENTICATED', async ({
    request,
  }) => {
    const response = await request.post('/api/billing/checkout', {
      headers: {
        origin: 'http://localhost:4178',
      },
      data: {
        bookingId: 'smoke-test-booking',
        planId: 'starter',
        successUrl: 'http://localhost/success',
        cancelUrl: 'http://localhost/cancel',
      },
    });
    expect(response.status()).toBe(401);
    const body = (await response.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe('UNAUTHENTICATED');
  });
});
