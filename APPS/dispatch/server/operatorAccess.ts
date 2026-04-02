import crypto from 'crypto';
import type { Request } from 'express';

const OPERATOR_TOKEN_HEADER = 'x-dispatch-operator-token';
const OPERATOR_TOKEN_QUERY_KEY = 'operatorToken';
const OPERATOR_TOKEN_VERSION = 'v1';
const OPERATOR_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function text(value: unknown) {
  return String(value || '').trim();
}

function getSecret() {
  return text(process.env.DISPATCH_OPERATOR_SESSION_SECRET) || text(process.env.DISPATCH_ADMIN_PROXY_KEY);
}

function signPayload(payload: string) {
  const secret = getSecret();
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function readToken(request: Request) {
  const headerToken = text(request.get(OPERATOR_TOKEN_HEADER));
  if (headerToken) return headerToken;
  const queryToken = request.query[OPERATOR_TOKEN_QUERY_KEY];
  return text(Array.isArray(queryToken) ? queryToken[0] : queryToken);
}

export function issueOperatorToken(operatorId: string, options?: { now?: number }) {
  const issuedAt = options?.now ?? Date.now();
  const expiresAt = issuedAt + OPERATOR_TOKEN_TTL_MS;
  const payload = `${OPERATOR_TOKEN_VERSION}.${operatorId}.${expiresAt}`;
  const signature = signPayload(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
}

export function getAuthenticatedOperatorId(request: Request) {
  const token = readToken(request);
  const secret = getSecret();
  if (!token || !secret) return null;

  const [version, operatorId, expiresAtRaw, signature] = token.split('.');
  if (!version || !operatorId || !expiresAtRaw || !signature) return null;
  if (version !== OPERATOR_TOKEN_VERSION) return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;

  const payload = `${version}.${operatorId}.${expiresAt}`;
  const expectedSignature = signPayload(payload);
  if (!expectedSignature || !safeEqual(signature, expectedSignature)) return null;
  return operatorId;
}

export function canAccessOperatorSurface(request: Request, operatorId?: string | null) {
  const authenticatedOperatorId = getAuthenticatedOperatorId(request);
  if (!authenticatedOperatorId) return false;
  if (!operatorId) return true;
  return authenticatedOperatorId === operatorId;
}
