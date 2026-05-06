import { NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { createServerClient } from '@/app/lib/supabase/server';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/app/lib/rate-limit';
import { writeAudit } from '@/app/lib/audit';
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
  // --- Rate limiting ---
  const ip = getClientIp(req);
  const rl = checkRateLimit(`billing-portal:${ip}`, RATE_LIMITS.billingPortal);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMITS.billingPortal.limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
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

  void writeAudit({
    action: 'billing.portal_initiated',
    actorId: user.profileId,
    actorRole: user.role,
    resourceType: 'billing_portal_session',
    resourceId: portalSession.id,
    metadata: { stripe_customer_id: sub.stripe_customer_id },
  });

  return NextResponse.json({ ok: true, url: portalSession.url });
}
