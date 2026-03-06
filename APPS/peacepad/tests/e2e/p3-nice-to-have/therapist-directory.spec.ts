import { test, expect } from '@playwright/test';

test.describe('P3 Nice-to-Have: Therapist Directory', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('peacepad_privacy_mode', 'false');
      localStorage.removeItem('peacepad_last_location');
    });
  });

  test('GET /therapist-directory returns 200 and renders accessible search controls', async ({ page }) => {
    const response = await page.goto('/therapist-directory');
    expect(response?.status()).toBe(200);

    await expect(page.getByTestId('text-find-support-title')).toBeVisible();
    await expect(page.getByTestId('text-crisis-section')).toBeVisible();

    const locationInput = page.getByTestId('input-postal-code');
    await expect(locationInput).toBeVisible();
    await expect(locationInput).toHaveAttribute('id', 'support-location-input');
    await expect(locationInput).toHaveAttribute('name', 'locationSearch');
    await expect(locationInput).toHaveAttribute('aria-label', 'Search by city or postal code');

    await expect(page.getByTestId('button-use-location')).toBeVisible();
    await expect(page.getByTestId('select-resource-type')).toHaveAttribute('aria-label', 'Filter by service type');
    await expect(page.getByTestId('select-gender-focus')).toHaveAttribute('aria-label', 'Filter by gender focus');
  });

  test('filter controls open and expose the expected options', async ({ page }) => {
    await page.goto('/therapist-directory');

    await page.getByTestId('select-resource-type').click();
    await expect(page.getByRole('option', { name: 'Therapists' })).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByTestId('select-gender-focus').click();
    await expect(page.getByRole('option', { name: 'All Genders' })).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
