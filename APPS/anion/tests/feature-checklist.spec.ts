import { expect, test } from '@playwright/test';

/**
 * Feature checklist tests for the current Anion handover scope.
 *
 * These tests document the implemented status without pretending that
 * authenticated production role evidence has already passed.
 */

test.describe('Video Call Feature', () => {
  test.skip(process.env.ANION_LOCAL_DEMO !== '1', 'Local demo video tests require ANION_LOCAL_DEMO=1.');

  test('local demo video room loads and displays video elements', async ({ page }) => {
    await page.goto('/api/local-demo/sign-in?role=tutor&next=/lesson/demo-accepted-lesson');

    const videoRoom = page.getByTestId('local-demo-video-room');
    await expect(videoRoom).toBeVisible({ timeout: 30_000 });

    const selfVideo = page.getByTestId('local-demo-self-video');
    await expect(selfVideo).toBeVisible();
  });

  test('production Daily iframe evidence requires authenticated role accounts', async () => {
    test.skip(true, 'Use npm run phase1:evidence with confirmed role accounts for production Daily proof.');
  });
});

test.describe('Background Customization Feature', () => {
  test('background customization is not exposed on public surfaces yet', async ({ page }) => {
    await page.goto('/pricing');

    const publicBackgroundCopy = page.getByText(/virtual background|lesson background|background picker/i);
    await expect(publicBackgroundCopy).toHaveCount(0);
  });
});

test.describe('Password Management Feature', () => {
  test('login uses OAuth and magic link without password fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByLabel(/Email address/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Email me a secure link/i })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /forgot password|reset password/i })).toHaveCount(0);
  });
});

test.describe('Feature Status Summary', () => {
  test('login surface documents no-password auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/No password is required/i)).toBeVisible();
  });
});
