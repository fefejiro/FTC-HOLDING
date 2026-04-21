import { test, expect } from '@playwright/test';

test('Application starts correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/Your App Title/);
});

test('Key functionality is operational', async ({ page }) => {
    await page.goto('http://localhost:3000');
    const button = page.locator('text=Start');
    await expect(button).toBeVisible();
    await button.click();
    await expect(page.locator('text=Welcome')).toBeVisible();
});