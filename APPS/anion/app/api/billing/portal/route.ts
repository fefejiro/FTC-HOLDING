import { NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { createServerClient } from '@/app/lib/supabase/server';
import { validateCsrfRequest } from '@/app/lib/security/csrf';
import { enforceRateLimit } from '@/app/lib/security/rate-limit';
import { logger } from '@/app/lib/logger';
import { getOrCreateRequestId } from '@/app/lib/request-id';
import type { BillingPortalRequest } from '@/src/types/api/scaffolds';

function validatePayload(body: unknown): string[] {
  const errors: string[] = [];
  const payload = body as Partial<BillingPortalRequest> | null;

  if (!payload || typeof payload !== 'object') {
    return ['Body must be a JSON object.'];
  }
  if (!payload.accountId) errors.push('accountId is required.');
  if (!payload.returnUrl) errors.push('returnUrl is required.');
  return errors;
}

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  const route = '/api/billing/portal';
  const start = Date.now();

  const csrfResult = validateCsrfRequest(req);
  if (!csrfResult.ok) {
    logger.warn({ route, requestId, code: csrfResult.code, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: csrfResult.code, message: csrfResult.message, requestId }, { status: 403 });
  }

  const rateLimit = await enforceRateLimit(req, { scope: 'billing-portal', maxRequests: 20, windowMs: 60_000 });
  if (rateLimit.limited) {
    logger.warn({ route, requestId, code: 'RATE_LIMITED', latencyMs: Date.now() - start });
    const response = NextResponse.json({ ok: false, code: 'RATE_LIMITED', message: 'Too many billing portal requests.', requestId }, { status: 429 });
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    response.headers.set('X-RateLimit-Limit', '20');
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Driver', rateLimit.driver);
    return response;
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const validationErrors = validatePayload(body);
  if (validationErrors.length > 0) {
    logger.warn({ route, requestId, code: 'INVALID_BILLING_PORTAL_REQUEST', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'INVALID_BILLING_PORTAL_REQUEST', message: 'Malformed billing portal payload.', validationErrors, requestId }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    logger.warn({ route, requestId, code: 'UNAUTHENTICATED', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', requestId }, { status: 401 });
  }
  if (user.role !== 'parent') {
    logger.warn({ route, requestId, userId: user.profileId, code: 'FORBIDDEN', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'FORBIDDEN', requestId }, { status: 403 });
  }

  const payload = body as BillingPortalRequest;
  const supabase = await createServerClient();
  const { data: parentRow } = await supabase.from('parents').select('id').eq('profile_id', user.profileId).single();
  if (!parentRow) {
    logger.error({ route, requestId, userId: user.profileId, code: 'PARENT_NOT_FOUND', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'PARENT_NOT_FOUND', requestId }, { status: 404 });
  }

  const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('parent_id', parentRow.id).single();
  if (!sub?.stripe_customer_id) {
    logger.warn({ route, requestId, userId: user.profileId, code: 'NO_STRIPE_CUSTOMER', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'NO_STRIPE_CUSTOMER', message: 'No billing account found. Subscribe first.', requestId }, { status: 404 });
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: payload.returnUrl });
    logger.info({ route, requestId, userId: user.profileId, latencyMs: Date.now() - start });
    const response = NextResponse.json({ ok: true, url: portalSession.url });
    response.headers.set('X-RateLimit-Limit', '20');
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('X-RateLimit-Driver', rateLimit.driver);
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    logger.error({ route, requestId, userId: user.profileId, code: 'STRIPE_ERROR', message: msg, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'STRIPE_ERROR', requestId }, { status: 502 });
  }
}