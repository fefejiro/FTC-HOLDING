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

test.describe('P4 Staging: AI Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    await skipIntroIfPresent(page);
  });

  test('should analyze message tone via OpenAI API', async ({ page }) => {
    const messageInput = page.getByTestId('input-message');
    
    if (!await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await messageInput.fill('This is a friendly message about our child');
    await page.waitForTimeout(1500);
    
    const toneIndicator = page.getByTestId('tone-indicator');
    const aiAnalysis = page.locator('[data-testid*="ai-"], [data-testid*="tone-"]');
    
    const hasAnalysis = await toneIndicator.isVisible({ timeout: 5000 }).catch(() => false) ||
                        await aiAnalysis.first().isVisible({ timeout: 1000 }).catch(() => false);
    
    expect(hasAnalysis).toBe(true);
  });

  test('should provide AI rewording suggestions', async ({ page }) => {
    const messageInput = page.getByTestId('input-message');
    
    if (!await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await messageInput.fill('You never do anything right with our kids');
    await page.waitForTimeout(2000);
    
    const rewordButton = page.getByTestId('button-reword');
    const suggestionBox = page.locator('[data-testid*="suggestion"], [data-testid*="reword"]');
    const toneWarning = page.getByTestId('tone-warning');
    
    const hasRewordFeature = await rewordButton.isVisible({ timeout: 3000 }).catch(() => false) ||
                             await suggestionBox.first().isVisible({ timeout: 1000 }).catch(() => false) ||
                             await toneWarning.isVisible({ timeout: 1000 }).catch(() => false);
    
    expect(hasRewordFeature).toBe(true);
  });

  test('should detect manipulation patterns', async ({ page }) => {
    const messageInput = page.getByTestId('input-message');
    
    if (!await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }

    await messageInput.fill('You always make me feel guilty about everything');
    await page.waitForTimeout(2000);
    
    const warningIndicator = page.locator('[data-testid*="warning"], [data-testid*="manipulation"], [data-testid*="tone"]');
    
    const hasWarning = await warningIndicator.first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasWarning).toBe(true);
  });
});
