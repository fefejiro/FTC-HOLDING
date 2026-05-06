import { NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { createServerClient } from '@/app/lib/supabase/server';
import { validateCsrfRequest } from '@/app/lib/security/csrf';
import { enforceRateLimit } from '@/app/lib/security/rate-limit';
import type { BillingPortalRequest } from '@/src/types/api/scaffolds';

function validatePayload(body: unknown): string[] {
  const errors: string[] = [];
  const payload = body as Partial<BillingPortalRequest> | null;

  if (!payload || typeof payload !== 'object') {
    return ['Body must be a JSON object.'];
  }
  if (!payload.accountId) {
    errors.push('accountId is required.');
  }
  if (!payload.returnUrl) {
    errors.push('returnUrl is required.');
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
    scope: 'billing-portal',
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (rateLimit.limited) {
    const response = NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', message: 'Too many billing portal requests.' },
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
      { ok: false, code: 'INVALID_BILLING_PORTAL_REQUEST', message: 'Malformed billing portal payload.', validationErrors },
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

  const payload = body as BillingPortalRequest;
  const supabase = await createServerClient();

  const { data: parentRow } = await supabase
    .from('parents')
    .select('id')
    .eq('profile_id', user.profileId)
    .single();
  if (!parentRow) {
    return NextResponse.json({ ok: false, code: 'PARENT_NOT_FOUND' }, { status: 404 });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('parent_id', parentRow.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ ok: false, code: 'NO_STRIPE_CUSTOMER', message: 'No billing account found. Subscribe first.' }, { status: 404 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: payload.returnUrl,
  });

  const response = NextResponse.json({ ok: true, url: portalSession.url });
  response.headers.set('X-RateLimit-Limit', '20');
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
  response.headers.set('X-RateLimit-Driver', rateLimit.driver);
  return response;
}
