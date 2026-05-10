import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.UNALABS_ADMIN_EMAIL || 'mike.fejiro@gmail.com';
const NONADMIN_EMAIL = process.env.UNALABS_NONADMIN_EMAIL || 'fejiro.efiuvwere@gmail.com';
const ADMIN_PASSWORD = process.env.UNALABS_ADMIN_PASSWORD || '';
const NONADMIN_PASSWORD = process.env.UNALABS_NONADMIN_PASSWORD || '';

const BASE_URL = 'https://unalabs.cloud';

// Helper: check for dark theme
async function expectDarkTheme(page) {
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
  expect(bg).toContain('radial-gradient');
  const color = await page.evaluate(() => getComputedStyle(document.body).color);
  expect(color).toBe('rgb(255, 255, 255)');
}

test.describe('Una Labs End-to-End', () => {
  test('Home page renders with dark theme', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Una Labs/);
    await expectDarkTheme(page);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=Product')).toBeVisible();
  });

  test('Login page renders with dark theme', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('text=Login')).toBeVisible();
    await expectDarkTheme(page);
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
  });

  test('Non-admin login routes to /products', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Simulate Google OAuth (replace with real Playwright Google login if available)
    // For demo: skip actual Google login, check fallback routing logic
    await page.evaluate(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: { user: { email: 'fejiro.efiuvwere@gmail.com' } }
      }));
    });
    await page.goto(`${BASE_URL}/auth/callback`);
    await page.waitForURL(`${BASE_URL}/products`);
    await expect(page.locator('h1')).toContainText(/Products built/i);
    await expectDarkTheme(page);
  });

  test('Admin login routes to ops.unalabs.cloud', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    // Simulate Google OAuth (replace with real Playwright Google login if available)
    await page.evaluate(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: { user: { email: 'mike.fejiro@gmail.com' } }
      }));
    });
    await page.goto(`${BASE_URL}/auth/callback`);
    await page.waitForURL('https://ops.unalabs.cloud', { timeout: 10000 });
    // Can't check content after cross-origin, but can check URL
  });

  test('Garden Cleaners portal is independent', async ({ page }) => {
    await page.goto('https://gardencleaners.ca/portal');
    await expect(page.locator('text=Garden Cleaners')).toBeVisible();
    await expect(page.locator('text=Regional Portal')).toBeVisible();
    // Should not redirect to una labs
  });

  test('Legacy GC portal path redirects to canonical', async ({ page }) => {
    await page.goto(`${BASE_URL}/garden-cleaners/portal`);
    await page.waitForURL('https://gardencleaners.ca/portal', { timeout: 10000 });
  });
});
