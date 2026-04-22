/**
 * Thin test helpers that expose the private signal-sending logic from
 * live-lyrics.tsx without rendering the full page component.
 *
 * These duplicate the minimal logic so the smoke tests remain isolated
 * and fast (no React tree, no query client, no router needed).
 */

const SESSION_KEY = 'saywetin_live_signal_sid';

export function getLiveSignalSessionIdForTest(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sid_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    window.localStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return `sid_ephemeral_${Date.now()}`;
  }
}

export async function sendLiveSignalForTest(payload: {
  type: 'tap' | 'flag' | 'resync' | 'dwell' | 'exit' | 'fallback';
  trackId?: string;
  lineId?: string;
  dwellMs?: number;
  reason?: string;
}) {
  await fetch('/v1/signals', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': getLiveSignalSessionIdForTest(),
    },
    body: JSON.stringify(payload),
  });
}
