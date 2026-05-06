import { NextResponse } from 'next/server';
import { stripe, getPlan } from '@/app/lib/stripe';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { createServerClient } from '@/app/lib/supabase/server';
import { validateCsrfRequest } from '@/app/lib/security/csrf';
import { enforceRateLimit } from '@/app/lib/security/rate-limit';
import { logger } from '@/app/lib/logger';
import { getOrCreateRequestId } from '@/app/lib/request-id';
import type { BillingCheckoutRequest } from '@/src/types/api/scaffolds';

function validatePayload(body: unknown): string[] {
  const errors: string[] = [];
  const payload = body as Partial<BillingCheckoutRequest> | null;

  if (!payload || typeof payload !== 'object') {
    return ['Body must be a JSON object.'];
  }
  if (!payload.bookingId) errors.push('bookingId is required.');
  if (!payload.planId) errors.push('planId is required.');
  if (!payload.successUrl) errors.push('successUrl is required.');
  if (!payload.cancelUrl) errors.push('cancelUrl is required.');

  return errors;
}

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  const route = '/api/billing/checkout';
  const start = Date.now();

  const csrfResult = validateCsrfRequest(req);
  if (!csrfResult.ok) {
    logger.warn({ route, requestId, code: csrfResult.code, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: csrfResult.code, message: csrfResult.message, requestId }, { status: 403 });
  }

  const rateLimit = await enforceRateLimit(req, { scope: 'billing-checkout', maxRequests: 20, windowMs: 60_000 });
  if (rateLimit.limited) {
    logger.warn({ route, requestId, code: 'RATE_LIMITED', latencyMs: Date.now() - start });
    const response = NextResponse.json({ ok: false, code: 'RATE_LIMITED', message: 'Too many checkout requests.', requestId }, { status: 429 });
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    response.headers.set('X-RateLimit-Limit', '20');
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Driver', rateLimit.driver);
    return response;
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const validationErrors = validatePayload(body);
  if (validationErrors.length > 0) {
    logger.warn({ route, requestId, code: 'INVALID_BILLING_CHECKOUT_REQUEST', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'INVALID_BILLING_CHECKOUT_REQUEST', message: 'Malformed billing checkout payload.', validationErrors, requestId }, { status: 400 });
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

  const payload = body as BillingCheckoutRequest;
  const plan = getPlan(payload.planId);
  if (!plan) {
    logger.warn({ route, requestId, userId: user.profileId, code: 'INVALID_PLAN_ID', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'INVALID_PLAN_ID', message: `Unknown plan: ${payload.planId}`, requestId }, { status: 400 });
  }
  if (!plan.stripePriceId) {
    logger.error({ route, requestId, userId: user.profileId, code: 'PLAN_NOT_CONFIGURED', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'PLAN_NOT_CONFIGURED', message: 'Stripe price ID not configured for this plan.', requestId }, { status: 503 });
  }

  const supabase = await createServerClient();
  const { data: parentRow } = await supabase.from('parents').select('id').eq('profile_id', user.profileId).single();
  if (!parentRow) {
    logger.error({ route, requestId, userId: user.profileId, code: 'PARENT_NOT_FOUND', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'PARENT_NOT_FOUND', requestId }, { status: 404 });
  }

  const { data: sub } = await supabase.from('subscriptions').select('stripe_customer_id').eq('parent_id', parentRow.id).single();

  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { profileId: user.profileId, parentId: parentRow.id } });
    customerId = customer.id;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: payload.successUrl,
      cancel_url: payload.cancelUrl,
      metadata: { bookingId: payload.bookingId, planId: payload.planId, profileId: user.profileId, parentId: parentRow.id },
      subscription_data: { metadata: { planId: payload.planId, parentId: parentRow.id, profileId: user.profileId } },
    });

    logger.info({ route, requestId, userId: user.profileId, latencyMs: Date.now() - start });
    const response = NextResponse.json({ ok: true, url: session.url });
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