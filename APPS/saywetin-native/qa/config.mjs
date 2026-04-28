/**
 * Shared config for every QA layer. Override via env.
 *  API_BASE_URL  - Railway service base (no trailing slash)
 *  AUDIO_FIXTURE - absolute path to an m4a/mp3 sample for /api/listen
 *  PERF_DURATION - seconds per perf scenario (default 15)
 *  PERF_CONNECTIONS - concurrent connections (default 25)
 *  E2E_DEVICE - adb serial OR avd name; if empty, e2e is skipped
 *  E2E_PLATFORM - "android" | "ios"; default android
 */
export const config = {
  apiBase:
    (process.env.API_BASE_URL || '').replace(/\/$/, '') ||
    'https://saywetin-api-production.up.railway.app',
  audioFixture: process.env.AUDIO_FIXTURE || '',
  perf: {
    durationSec: Number(process.env.PERF_DURATION || 15),
    connections: Number(process.env.PERF_CONNECTIONS || 25),
    pipelining: Number(process.env.PERF_PIPELINING || 1),
    p99BudgetMs: Number(process.env.PERF_P99_BUDGET_MS || 1500),
    minRps: Number(process.env.PERF_MIN_RPS || 30),
  },
  security: {
    auditLevel: process.env.AUDIT_LEVEL || 'high',
    requiredHeaders: [
      'x-content-type-options',
      'strict-transport-security',
    ],
  },
  e2e: {
    device: process.env.E2E_DEVICE || '',
    platform: (process.env.E2E_PLATFORM || 'android').toLowerCase(),
    appId: process.env.E2E_APP_ID || 'com.saywetin.app',
  },
};
