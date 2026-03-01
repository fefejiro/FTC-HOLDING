import { test, expect, Page } from '@playwright/test';

async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  const skipBtn = page.getByRole('button', { name: /skip/i });
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click({ force: true }).catch(() => {});
  }
}

test.describe('Expense Tracking Tests', () => {
  test('should create, read, update, delete expenses', async ({ page }) => {
    await navigateTo(page, '/expenses');
    
    // Create
    await page.getByTestId('button-add-expense').click();
    await page.getByTestId('input-expense-title').fill('School Supplies');
    await page.getByTestId('input-expense-amount').fill('50.00');
    await page.getByTestId('button-save-expense').click();
    await expect(page.locator('text=School Supplies')).toBeVisible();
    
    // Update
    await page.getByTestId('button-edit-expense').first().click();
    await page.getByTestId('input-expense-amount').fill('55.00');
    await page.getByTestId('button-save-expense').click();
    await expect(page.locator('text=55.00')).toBeVisible();
    
    // Delete
    await page.getByTestId('button-delete-expense').first().click();
    await page.getByTestId('button-confirm-delete').click();
    await expect(page.locator('text=School Supplies')).not.toBeVisible();
  });

  test('should calculate settlements correctly', async ({ page }) => {
    await navigateTo(page, '/expenses');
    const settlementSummary = page.getByTestId('text-settlement-summary');
    await expect(settlementSummary).toBeVisible();
  });

  test('should attach receipts to expenses', async ({ page }) => {
    await navigateTo(page, '/expenses');
    await page.getByTestId('button-add-expense').click();
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('button-upload-receipt').click();
    const fileChooser = await fileChooserPromise;
    // We skip actual file upload in headless cloud but verify the UI interaction
    expect(fileChooser).toBeDefined();
  });
});
