export const DEMO_MODE = 'demo';
const DEMO_SESSION_KEY = 'dispatch_demo_session';

export type DemoAwareRequest = {
  demoMode?: boolean | null;
  demoSessionId?: string | null;
};

export function isDemoMode(search: string) {
  return new URLSearchParams(search).get('mode') === DEMO_MODE;
}

export function getDemoSessionId(search: string) {
  return new URLSearchParams(search).get('demoSession') || null;
}

export function makeDemoSessionId() {
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readStoredDemoSessionId() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(DEMO_SESSION_KEY);
}

export function storeDemoSessionId(value: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(DEMO_SESSION_KEY, value);
}

export function clearStoredDemoSessionId() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(DEMO_SESSION_KEY);
}

export function requestMatchesDemoMode(
  request: DemoAwareRequest,
  demoMode: boolean,
  demoSessionId?: string | null,
) {
  if (demoMode) {
    if (!request.demoMode) return false;
    if (!demoSessionId) return true;
    return request.demoSessionId === demoSessionId;
  }
  return !request.demoMode;
}
