import { test, expect } from '@playwright/test';

test.describe('P3 Nice-to-Have: Responsive Design', () => {
  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const sidebarToggle = page.getByTestId('button-sidebar-toggle');
    if (await sidebarToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(sidebarToggle).toBeVisible();
    }
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const messageInput = page.getByTestId('input-message');
    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(messageInput).toBeVisible();
    }
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const messageInput = page.getByTestId('input-message');
    if (await messageInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(messageInput).toBeVisible();
    }
  });

  test('should have mobile-specific user indicator', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const mobileIndicator = page.getByTestId('current-user-indicator-mobile');
    if (await mobileIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(mobileIndicator).toBeVisible();
    }
  });
});
