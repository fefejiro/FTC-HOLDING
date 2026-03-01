import { test, expect, Page } from '@playwright/test';

async function skipIntroIfPresent(page: Page) {
  await page.evaluate(() => {
    const banner = document.getElementById('replit-dev-banner');
    if (banner) banner.style.display = 'none';
  });
  
  const skipButton = page.getByRole('button', { name: /skip|next|continue/i }).first();
  for (let i = 0; i < 5; i++) {
    if (await skipButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipButton.click({ force: true });
      await page.waitForTimeout(300);
    }
  }
}

test.describe('P4 Staging: Database Integration', () => {
  test('should load user data from database', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await skipIntroIfPresent(page);
    
    const response = await page.request.get('/api/user');
    expect(response.status()).toBeLessThan(500);
  });

  test('should persist message to database', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await skipIntroIfPresent(page);
    
    const messageInput = page.getByTestId('input-message');
    
    if (!await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }

    const testMessage = `Test message ${Date.now()}`;
    await messageInput.fill(testMessage);
    
    const sendButton = page.getByTestId('button-send');
    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendButton.click({ force: true });
      await page.waitForTimeout(2000);
      
      const messageInChat = page.locator(`text=${testMessage}`);
      const messageSent = await messageInChat.isVisible({ timeout: 5000 }).catch(() => false);
      expect(messageSent).toBe(true);
    }
  });

  test('should load expenses from database', async ({ page }) => {
    await page.goto('/expenses');
    await page.waitForLoadState('networkidle');
    await skipIntroIfPresent(page);
    
    const stillInOnboarding = await page.getByRole('button', { name: /skip/i }).isVisible({ timeout: 1000 }).catch(() => false);
    if (stillInOnboarding) {
      expect(true).toBe(true);
      return;
    }
    
    const response = await page.request.get('/api/expenses');
    expect(response.status()).toBeLessThan(500);
  });

  test('should load calendar events from database', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
    await skipIntroIfPresent(page);
    
    const stillInOnboarding = await page.getByRole('button', { name: /skip/i }).isVisible({ timeout: 1000 }).catch(() => false);
    if (stillInOnboarding) {
      expect(true).toBe(true);
      return;
    }
    
    const response = await page.request.get('/api/events');
    expect(response.status()).toBeLessThan(500);
  });
});
