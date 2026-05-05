import { test, expect } from '@playwright/test';

test('security headers are set correctly', async ({ page }) => {
    await page.goto('http://localhost:3000'); // Adjust the URL as needed
    const response = await page.request.get('http://localhost:3000'); // Adjust the URL as needed

    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(response.headers()['x-xss-protection']).toBe('1; mode=block');
    expect(response.headers()['strict-transport-security']).toBeDefined();
});