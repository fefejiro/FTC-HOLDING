import { expect, test } from '@playwright/test';

/**
 * Anion public-route smoke tests.
 *
 * These run in CI against a Next.js production server started from the
 * `next build` output. Supabase env vars are set to placeholder values so
 * the build succeeds without real credentials; auth-gated routes are not
 * exercised here.
 */
test.describe('Anion public routes', () => {
  test('home page loads and shows primary heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Class scheduling');
  });

  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign in');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('pricing page loads with plan cards', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1')).toContainText("Invest in your child");
  });

  test('tutors page loads', async ({ page }) => {
    await page.goto('/tutors');
    await expect(page.locator('h1')).toContainText('Tutor directory');
  });
});
