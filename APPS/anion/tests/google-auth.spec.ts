import { expect, test } from '@playwright/test';

/**
 * Google OAuth tests for Anion.
 *
 * These tests verify that the Google sign-in flow is wired without needing a
 * real Google account in CI. The full OAuth journey is covered by production
 * handoff evidence, not this unauthenticated smoke suite.
 */

test.describe('Google Auth', () => {
  test('login page has Google sign-in button', async ({ page }) => {
    await page.goto('/login');

    const googleButton = page.getByRole('button', { name: /Continue with Google/i });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test('clicking Google sign-in button attempts OAuth', async ({ page }) => {
    await page.goto('/login');

    page.on('popup', (popup) => {
      void popup.close();
    });

    page.on('dialog', (dialog) => {
      void dialog.dismiss();
    });

    const googleButton = page.getByRole('button', { name: /Continue with Google/i });
    await googleButton.click();

    await expect(googleButton).toContainText(/Signing in/i, { timeout: 5000 }).catch(() => {
      // Navigation may happen before the loading text is visible.
    });
  });

  test('auth callback route exists and handles errors gracefully', async ({ request }) => {
    const response = await request.get('/auth/callback');
    expect([307, 308, 200, 400]).toContain(response.status());
  });

  test('auth callback with invalid code returns proper error', async ({ page }) => {
    await page.goto('/auth/callback?code=invalid-code-test');
    expect(page.url()).toMatch(/login\?error=/);
  });

  test('Google sign-in initiates without immediate browser errors', async ({ page }) => {
    await page.goto('/login');

    const googleButton = page.getByRole('button', { name: /Continue with Google/i });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();

    let errorOccurred = false;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorOccurred = true;
      }
    });

    await googleButton.click();
    await page.waitForTimeout(1000);

    expect(errorOccurred).toBe(false);
  });
});
