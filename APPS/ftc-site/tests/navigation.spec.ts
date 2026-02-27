import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  const routes = [
    { path: '/', title: 'From Manual Complexity to Intelligent Systems' },
    { path: '/about', title: 'Applied Artificial Intelligence' },
    { path: '/services', title: 'Services' },
    { path: '/services/enterprise-systems-infrastructure', title: 'Enterprise Systems & Infrastructure Consulting' },
    { path: '/services/intelligent-systems-automation', title: 'Intelligent Systems & Automation Engineering' },
    { path: '/services/product-technical-architecture', title: 'Product & Technical Architecture Advisory' },
    { path: '/case-studies', title: 'Case Studies' },
    { path: '/contact', title: 'Contact' },
  ];

  routes.forEach(route => {
    test(`visiting ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator('h1')).toHaveText(route.title);
    });
  });

  test('header links', async ({ page }) => {
    await page.goto('/');
    const linkNames = ['Home', 'About', 'Services', 'Case Studies', 'Contact'];
    for (const name of linkNames) {
      // Click the first matching link (to avoid clicking the duplicate Contact CTA button)
      await page.locator('header').getByRole('link', { name }).first().click();
      // "Home" stays at /, others navigate to /name-in-kebab-case
      const expectedPath = name === 'Home' ? '/' : `/${name.toLowerCase().replace(/ /g, '-')}`;
      await expect(page).toHaveURL(expectedPath);
    }
  });

  test('from /services click pillar cards', async ({ page }) => {
    await page.goto('/services');
    const cardLinks = [
      '/services/enterprise-systems-infrastructure',
      '/services/intelligent-systems-automation',
      '/services/product-technical-architecture',
    ];
    for (const href of cardLinks) {
      await page.locator(`a[href="${href}"]`).click();
      await expect(page).toHaveURL(href);
      await page.goBack();
    }
  });
});
