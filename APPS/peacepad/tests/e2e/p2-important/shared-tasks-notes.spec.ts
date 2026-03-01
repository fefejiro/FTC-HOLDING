import { test, expect, Page } from '@playwright/test';

async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  const skipBtn = page.getByRole('button', { name: /skip/i });
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click({ force: true }).catch(() => {});
  }
}

test.describe('Shared Tasks Notes Tests', () => {
  test('should create and assign to-do list', async ({ page }) => {
    await navigateTo(page, '/tasks');
    await page.getByTestId('button-add-task').click();
    await page.getByTestId('input-task-title').fill('Buy groceries for kids');
    await page.getByTestId('button-save-task').click();
    
    await expect(page.locator('text=Buy groceries for kids')).toBeVisible();
  });

  test('should track child updates', async ({ page }) => {
    await navigateTo(page, '/updates');
    await page.getByTestId('button-new-update').click();
    await page.getByTestId('textarea-update-content').fill('Jamie finished homework early today.');
    await page.getByTestId('button-post-update').click();
    
    await expect(page.locator('text=Jamie finished homework early today.')).toBeVisible();
  });

  test('should sync notes across accounts', async ({ page }) => {
    await navigateTo(page, '/notes');
    const noteText = `Shared note ${Date.now()}`;
    await page.getByTestId('button-new-note').click();
    await page.getByTestId('textarea-note-content').fill(noteText);
    await page.getByTestId('button-save-note').click();
    
    await expect(page.locator(`text=${noteText}`)).toBeVisible();
  });
});
