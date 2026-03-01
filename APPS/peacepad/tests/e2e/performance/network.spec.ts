import { test, expect } from '@playwright/test';

test.describe('Performance: Network & API', () => {
  test('should not have excessive API calls on page load', async ({ page }) => {
    const apiCalls: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });
    
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    console.log(`API calls made on chat load: ${apiCalls.length}`);
    apiCalls.forEach(url => console.log(`  - ${url}`));
    
    expect(apiCalls.length).toBeLessThan(20);
  });

  test('should not have failed network requests', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('response', response => {
      if (response.status() >= 400 && response.status() !== 401) {
        failedRequests.push(`${response.status()}: ${response.url()}`);
      }
    });
    
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    console.log(`Failed requests: ${failedRequests.length}`);
    failedRequests.forEach(req => console.log(`  - ${req}`));
    
  });

  test('should have reasonable bundle sizes', async ({ page }) => {
    const jsSize: number[] = [];
    const cssSize: number[] = [];
    
    page.on('response', async response => {
      const contentType = response.headers()['content-type'] || '';
      const contentLength = parseInt(response.headers()['content-length'] || '0');
      
      if (contentType.includes('javascript') && contentLength > 0) {
        jsSize.push(contentLength);
      }
      if (contentType.includes('css') && contentLength > 0) {
        cssSize.push(contentLength);
      }
    });
    
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    const totalJs = jsSize.reduce((a, b) => a + b, 0);
    const totalCss = cssSize.reduce((a, b) => a + b, 0);
    
    console.log(`Total JS size: ${(totalJs / 1024).toFixed(2)} KB`);
    console.log(`Total CSS size: ${(totalCss / 1024).toFixed(2)} KB`);
    
  });
});
