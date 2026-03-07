import { test as setup, expect } from '@playwright/test';

const STORAGE_STATE_PATH = 'tests/.auth/guest.json';
setup.setTimeout(90_000);

setup('bootstrap onboarding session', async ({ page }) => {
  console.log('[Setup] Starting onboarding bootstrap flow...');

  await page.goto('/onboarding');
  await page.waitForLoadState('domcontentloaded');

  // Hide Replit dev banner if present (it can intercept clicks)
  await page.evaluate(() => {
    const banner = document.getElementById('replit-dev-banner');
    if (banner) banner.style.display = 'none';
  });

  await expect(page.getByTestId("button-start-conversation")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("button-start-conversation").click();

  await expect(page.getByTestId("button-accept-terms")).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(750);

  const requiredCheckboxes = [
    "checkbox-accept-terms",
    "checkbox-accept-privacy",
    "checkbox-accept-nda",
  ];

  for (const testId of requiredCheckboxes) {
    await page.getByTestId(testId).click({ force: true });
  }

  await expect(page.getByTestId("button-accept-terms")).toBeEnabled({ timeout: 5000 });
  await page.getByTestId("button-accept-terms").click();

  try {
    await page.waitForURL(/prep-chat|chat|dashboard/, { timeout: 30000 });
    console.log('[Setup] Successfully reached app shell:', page.url());
  } catch {
    console.log('[Setup] Did not reach expected URL, current URL:', page.url());
    await page.goto('/chat');
    await page.waitForLoadState('domcontentloaded');
  }

  console.log('[Setup] Saving authentication state...');
  await page.context().storageState({ path: STORAGE_STATE_PATH });

  // Seed partnership for tests that require it
  console.log('[Setup] Checking if partnership seeding is needed...');
  try {
    const userResponse = await page.request.get('/api/auth/user');
    if (userResponse.ok()) {
      const user = await userResponse.json();
      if (user?.id) {
        console.log('[Setup] User ID:', user.id);

        const checkResponse = await page.request.get(`/api/test/check-partnership?userId=${user.id}`);
        const checkResult = await checkResponse.json();

        if (!checkResult.hasPartnership) {
          console.log('[Setup] No partnership found, creating test partnership...');
          const seedResponse = await page.request.post('/api/test/seed-partnership', {
            data: { userId: user.id },
          });

          if (seedResponse.ok()) {
            const seedResult = await seedResponse.json();
            console.log('[Setup] Partnership created:', seedResult.partnershipId);
            await page.reload();
            await page.waitForLoadState('domcontentloaded');
            await page.context().storageState({ path: STORAGE_STATE_PATH });
          } else {
            console.log('[Setup] Partnership seeding failed:', await seedResponse.text());
          }
        } else {
          console.log('[Setup] Partnership already exists:', checkResult.partnershipId);
        }
      }
    }
  } catch (error) {
    console.log('[Setup] Partnership seeding error (non-fatal):', error);
  }

  console.log('[Setup] Authentication complete!');
});
