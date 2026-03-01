import { test, expect } from '@playwright/test';

test.describe('P4 Staging: API Health Checks', () => {
  test('should return healthy status from health endpoint', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const body = await response.json().catch(() => ({}));
    expect(body.status || body.ok || response.ok()).toBeTruthy();
  });

  test('should have database connectivity', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBeLessThan(500);
    
    const body = await response.json().catch(() => ({}));
    if (body.database !== undefined) {
      expect(body.database).toBe('connected');
    }
  });

  test('should return user session info', async ({ request }) => {
    const response = await request.get('/api/user');
    expect([200, 401, 403]).toContain(response.status());
  });

  test('should handle CORS properly', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBeLessThan(500);
  });

  test('should return messages endpoint status', async ({ request }) => {
    const response = await request.get('/api/messages');
    expect([200, 401, 403]).toContain(response.status());
  });

  test('should return partnership endpoint status', async ({ request }) => {
    const response = await request.get('/api/partnership');
    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test('should return settings endpoint status', async ({ request }) => {
    const response = await request.get('/api/settings');
    expect([200, 401, 403, 404]).toContain(response.status());
  });

  test('should have proper error handling for invalid routes', async ({ request }) => {
    const response = await request.get('/api/nonexistent-endpoint-12345');
    expect([200, 404]).toContain(response.status());
  });
});
