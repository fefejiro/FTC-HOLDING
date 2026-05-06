import { NextResponse, type NextRequest } from 'next/server';

const API_CORS_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const API_CORS_HEADERS = 'Content-Type, Authorization, X-CSRF-Token';

export function getAllowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.SECURITY_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowLocalhost =
    env.SECURITY_ALLOW_LOCALHOST_ORIGINS === '1' ||
    (env.NODE_ENV !== 'production' && env.CF_PAGES !== '1');

  if (allowLocalhost) {
    configured.push('http://localhost:4178', 'http://127.0.0.1:4178', 'http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return Array.from(new Set(configured));
}

export function isOriginAllowed(origin: string, requestOrigin?: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!origin || origin === 'null') return false;
  if (requestOrigin && origin === requestOrigin) return true;

  const allowedOrigins = getAllowedOrigins(env);
  if (allowedOrigins.includes('*')) {
    return env.NODE_ENV !== 'production';
  }

  return allowedOrigins.includes(origin);
}

export function applyApiSecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Vary', 'Origin');

  const origin = request.headers.get('origin');
  if (!origin) {
    return response;
  }

  const requestOrigin = new URL(request.url).origin;
  if (isOriginAllowed(origin, requestOrigin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', API_CORS_METHODS);
    response.headers.set('Access-Control-Allow-Headers', API_CORS_HEADERS);
  }

  return response;
}

export function handleApiCorsPreflight(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const requestOrigin = new URL(request.url).origin;
  const allowed = origin ? isOriginAllowed(origin, requestOrigin) : false;

  const response = NextResponse.json({}, { status: allowed ? 204 : 403 });
  response.headers.set('Vary', 'Origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  if (allowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', API_CORS_METHODS);
    response.headers.set('Access-Control-Allow-Headers', API_CORS_HEADERS);
  }
  return response;
}

export function isApiRequestOriginDenied(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const requestOrigin = new URL(request.url).origin;
  return !isOriginAllowed(origin, requestOrigin);
}
