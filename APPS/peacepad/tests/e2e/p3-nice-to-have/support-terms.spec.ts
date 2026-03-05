import { test, expect } from '@playwright/test';

test.describe('P3 Nice-to-Have: Public Support and Terms Pages', () => {
  test('GET /support returns 200 and renders heading', async ({ page }) => {
    const response = await page.goto('/support');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'PeacePad Support' })).toBeVisible();
  });

  test('GET /terms returns 200 and renders heading', async ({ page }) => {
    const response = await page.goto('/terms');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'PeacePad Terms of Service' })).toBeVisible();
  });
});
