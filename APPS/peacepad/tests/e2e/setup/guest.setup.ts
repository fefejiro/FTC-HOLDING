import { test as setup, expect } from '@playwright/test';

const STORAGE_STATE_PATH = 'tests/.auth/guest.json';

setup('authenticate as guest user', async ({ page }) => {
  console.log('[Setup] Starting guest authentication flow...');
  
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  
  // Hide Replit dev banner if present (it can intercept clicks)
  await page.evaluate(() => {
    const banner = document.getElementById('replit-dev-banner');
    if (banner) banner.style.display = 'none';
  });
  
  const skipIntroButton = page.getByRole('button', { name: /skip|next|continue/i }).first();
  for (let i = 0; i < 5; i++) {
    if (await skipIntroButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[Setup] Clicking skip/next button in intro slideshow');
      await skipIntroButton.click({ force: true });
      await page.waitForTimeout(500);
    }
  }

  const consentCheckboxes = page.locator('input[type="checkbox"]');
  const checkboxCount = await consentCheckboxes.count();
  if (checkboxCount > 0) {
    console.log(`[Setup] Found ${checkboxCount} consent checkboxes, checking all...`);
    for (let i = 0; i < checkboxCount; i++) {
      await consentCheckboxes.nth(i).check({ force: true, timeout: 2000 }).catch(() => {});
    }
    
    const acceptButton = page.getByRole('button', { name: /accept|continue|agree|i agree/i });
    if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[Setup] Clicking accept consent button');
      await acceptButton.click({ force: true });
      await page.waitForTimeout(1000);
    }
  }

  const enterButton = page.getByTestId('button-enter-peacepad');
  if (await enterButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('[Setup] Found GuestEntry page, clicking Enter PeacePad button');
    await enterButton.click({ force: true });
    await page.waitForTimeout(2000);
  }

  const guestLoginButton = page.getByRole('button', { name: /try as guest|guest|start exploring/i });
  if (await guestLoginButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[Setup] Found guest login button on landing page');
    await guestLoginButton.click({ force: true });
    await page.waitForTimeout(2000);
    
    const enterAfterClick = page.getByTestId('button-enter-peacepad');
    if (await enterAfterClick.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enterAfterClick.click({ force: true });
      await page.waitForTimeout(2000);
    }
  }

  const continueButton = page.getByRole('button', { name: /continue|next|finish|let's go/i });
  for (let i = 0; i < 3; i++) {
    if (await continueButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('[Setup] Clicking continue in onboarding wizard');
      await continueButton.click({ force: true });
      await page.waitForTimeout(1000);
    }
  }

  try {
    await page.waitForURL(/chat|dashboard|home/, { timeout: 15000 });
    console.log('[Setup] Successfully reached main app, URL:', page.url());
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
        
        // Check if partnership exists
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
            
            // Reload the page to pick up the new partnership
            await page.reload();
            await page.waitForLoadState('domcontentloaded');
            
            // Save updated storage state with partnership context
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
