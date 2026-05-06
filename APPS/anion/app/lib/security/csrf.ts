import { isOriginAllowed } from './http';

export type CsrfValidationResult = {
  ok: boolean;
  code?: 'CSRF_MISSING_ORIGIN' | 'CSRF_INVALID_ORIGIN' | 'CSRF_CROSS_SITE_BLOCKED';
  message?: string;
};

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function validateCsrfRequest(request: Request): CsrfValidationResult {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return { ok: true };
  }

  if (process.env.SECURITY_CSRF_MODE === 'off') {
    return { ok: true };
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    return {
      ok: false,
      code: 'CSRF_MISSING_ORIGIN',
      message: 'Missing Origin header for state-changing request.',
    };
  }

  const requestOrigin = new URL(request.url).origin;
  if (!isOriginAllowed(origin, requestOrigin)) {
    return {
      ok: false,
      code: 'CSRF_INVALID_ORIGIN',
      message: 'Request origin is not allowed.',
    };
  }

  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite === 'cross-site') {
    return {
      ok: false,
      code: 'CSRF_CROSS_SITE_BLOCKED',
      message: 'Cross-site state-changing request blocked.',
    };
  }

  return { ok: true };
}
