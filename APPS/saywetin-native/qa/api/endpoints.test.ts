/**
 * API integration layer
 *
 * Hits the live Railway service. Validates HTTP shape, status codes,
 * and side-effect surfaces (DB read endpoints).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { config } from '../config.mjs';

const base = config.apiBase;

describe(`API integration @ ${base}`, () => {
  beforeAll(() => {
    if (!base) throw new Error('API_BASE_URL missing');
  });

  it('GET /api/health -> 200 ok', async () => {
    const r = await fetch(`${base}/api/health`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe('ok');
  });

  it('GET /api/status -> reports configured services', async () => {
    const r = await fetch(`${base}/api/status`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty('database');
    expect(body.database.connected).toBe(true);
    expect(body.database.schemaReady).toBe(true);
  });

  it('GET /api/listening-history -> 200 array', async () => {
    const r = await fetch(`${base}/api/listening-history`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('POST /api/identify-by-text -> 200 OR 503 (until OpenAI key set)', async () => {
    const r = await fetch(`${base}/api/identify-by-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'i go love you forever burna boy' }),
    });
    expect([200, 503]).toContain(r.status);
    const body = await r.json().catch(() => ({}));
    if (r.status === 200) {
      expect(body.success).toBe(true);
      expect(body.recognizedTrack?.title).toBeTruthy();
    } else {
      expect(body.error || body.code).toBeTruthy();
    }
  });

  it('POST /api/identify-by-text rejects empty query', async () => {
    const r = await fetch(`${base}/api/identify-by-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '' }),
    });
    expect([400, 422]).toContain(r.status);
  });
});
