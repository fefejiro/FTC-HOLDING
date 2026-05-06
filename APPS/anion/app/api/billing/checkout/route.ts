import { NextResponse } from 'next/server';
import { stripe, getPlan } from '@/app/lib/stripe';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { createServerClient } from '@/app/lib/supabase/server';
import { validateCsrfRequest } from '@/app/lib/security/csrf';
import { enforceRateLimit } from '@/app/lib/security/rate-limit';
import type { BillingCheckoutRequest } from '@/src/types/api/scaffolds';

function validatePayload(body: unknown): string[] {
  const errors: string[] = [];
  const payload = body as Partial<BillingCheckoutRequest> | null;

  if (!payload || typeof payload !== 'object') {
    return ['Body must be a JSON object.'];
  }
  if (!payload.bookingId) {
    errors.push('bookingId is required.');
  }
  if (!payload.planId) {
    errors.push('planId is required.');
  }
  if (!payload.successUrl) {
    errors.push('successUrl is required.');
  }
  if (!payload.cancelUrl) {
    errors.push('cancelUrl is required.');
  }

  return errors;
}

export async function POST(req: Request) {
  const csrfResult = validateCsrfRequest(req);
  if (!csrfResult.ok) {
    return NextResponse.json(
      { ok: false, code: csrfResult.code, message: csrfResult.message },
      { status: 403 },
    );
  }

  const rateLimit = await enforceRateLimit(req, {
    scope: 'billing-checkout',
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (rateLimit.limited) {
    const response = NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', message: 'Too many checkout requests.' },
      { status: 429 },
    );
    response.headers.set('Retry-After', String(rateLimit.retryAfterSeconds));
    response.headers.set('X-RateLimit-Limit', '20');
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Driver', rateLimit.driver);
    return response;
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const validationErrors = validatePayload(body);

  if (validationErrors.length > 0) {
    return NextResponse.json(
      { ok: false, code: 'INVALID_BILLING_CHECKOUT_REQUEST', message: 'Malformed billing checkout payload.', validationErrors },
      { status: 400 },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED' }, { status: 401 });
  }
  if (user.role !== 'parent') {
    return NextResponse.json({ ok: false, code: 'FORBIDDEN' }, { status: 403 });
  }

  const payload = body as BillingCheckoutRequest;
  const plan = getPlan(payload.planId);
  if (!plan) {
    return NextResponse.json({ ok: false, code: 'INVALID_PLAN_ID', message: `Unknown plan: ${payload.planId}` }, { status: 400 });
  }
  if (!plan.stripePriceId) {
    return NextResponse.json({ ok: false, code: 'PLAN_NOT_CONFIGURED', message: 'Stripe price ID not configured for this plan.' }, { status: 503 });
  }

  const supabase = await createServerClient();

  // Resolve parent record
  const { data: parentRow } = await supabase
    .from('parents')
    .select('id')
    .eq('profile_id', user.profileId)
    .single();
  if (!parentRow) {
    return NextResponse.json({ ok: false, code: 'PARENT_NOT_FOUND' }, { status: 404 });
  }

  // Get or create Stripe customer
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('parent_id', parentRow.id)
    .single();

  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { profileId: user.profileId, parentId: parentRow.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: payload.successUrl,
    cancel_url: payload.cancelUrl,
    metadata: {
      bookingId: payload.bookingId,
      planId: payload.planId,
      profileId: user.profileId,
      parentId: parentRow.id,
    },
    subscription_data: {
      metadata: {
        planId: payload.planId,
        parentId: parentRow.id,
        profileId: user.profileId,
      },
    },
  });

  const response = NextResponse.json({ ok: true, url: session.url });
  response.headers.set('X-RateLimit-Limit', '20');
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  response.headers.set('X-RateLimit-Driver', rateLimit.driver);
  return response;
}
