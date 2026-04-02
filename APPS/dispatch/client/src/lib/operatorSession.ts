export type OperatorSession = {
  id: string;
  name: string;
  phone?: string | null;
  active?: boolean;
  token: string;
};

export const OPERATOR_SESSION_KEY = 'dispatch_operator_session';
export const OPERATOR_TOKEN_HEADER = 'x-dispatch-operator-token';

export function readOperatorSession(): OperatorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(OPERATOR_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OperatorSession>;
    if (!parsed?.id || !parsed?.name || !parsed?.token) return null;
    return {
      id: parsed.id,
      name: parsed.name,
      phone: parsed.phone ?? null,
      active: parsed.active ?? true,
      token: parsed.token,
    };
  } catch {
    return null;
  }
}

export function writeOperatorSession(session: OperatorSession) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OPERATOR_SESSION_KEY, JSON.stringify(session));
}

export function clearOperatorSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(OPERATOR_SESSION_KEY);
}

export function operatorFetch(input: string, init: RequestInit = {}) {
  const session = readOperatorSession();
  const headers = new Headers(init.headers ?? {});
  if (session?.token) {
    headers.set(OPERATOR_TOKEN_HEADER, session.token);
  }
  return fetch(input, { ...init, headers });
}

export function operatorEventSourceUrl(path = '/api/events') {
  const session = readOperatorSession();
  if (!session?.token) return path;
  const url = new URL(path, typeof window === 'undefined' ? 'https://dispatch.unalabs.cloud' : window.location.origin);
  url.searchParams.set('operatorToken', session.token);
  return typeof window === 'undefined' ? url.toString() : `${url.pathname}${url.search}`;
}
