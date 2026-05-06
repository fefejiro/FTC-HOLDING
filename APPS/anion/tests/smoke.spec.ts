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

test.describe('Public routes', () => {
  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign in');
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send magic link' })).toBeVisible();
  });

  test('pricing page renders all three plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toContainText('Invest in your child');
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
