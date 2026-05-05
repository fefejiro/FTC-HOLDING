import type { Request } from 'express';

function text(value: unknown) {
  return String(value || '').trim();
}

function hostAllowsLocalAdmin(request: Request) {
  const host = text(request.hostname).toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
}

export function hasTrustedAdminProxy(request: Request): boolean {
  const expected = text(process.env.DISPATCH_ADMIN_PROXY_KEY);
  if (!expected) return false;
  const received = text(request.get('x-dispatch-admin-proxy-key'));
  return received.length > 0 && received === expected;
}

export function canAccessAdminSurface(request: Request): boolean {
  if (hostAllowsLocalAdmin(request)) return true;
  return hasTrustedAdminProxy(request);
}
