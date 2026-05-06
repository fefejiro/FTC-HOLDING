import { NextResponse } from 'next/server';
import { stripe } from '@/app/lib/stripe';
import { getCurrentUser } from '@/app/lib/auth/getCurrentUser';
import { createServerClient } from '@/app/lib/supabase/server';
import { logger } from '@/app/lib/logger';
import { getOrCreateRequestId } from '@/app/lib/request-id';
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
  const requestId = getOrCreateRequestId(req);
  const route = '/api/billing/portal';
  const start = Date.now();
  const ip = getClientIp(req);
  const rl = checkRateLimit(`billing-portal:${ip}`, RATE_LIMITS.billingPortal);

  if (!rl.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    logger.warn({ route, requestId, code: 'RATE_LIMITED', latencyMs: Date.now() - start });
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', retryAfter, requestId },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMITS.billingPortal.limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const validationErrors = validatePayload(body);

  if (validationErrors.length > 0) {
    logger.warn({ route, requestId, code: 'INVALID_BILLING_PORTAL_REQUEST', latencyMs: Date.now() - start });
    return NextResponse.json(
      { ok: false, code: 'INVALID_BILLING_PORTAL_REQUEST', message: 'Malformed billing portal payload.', validationErrors, requestId },
      { status: 400 },
    );
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

  const { data: parentRow } = await supabase
    .from('parents')
    .select('id')
    .eq('profile_id', user.profileId)
    .single();
  if (!parentRow) {
    logger.error({ route, requestId, userId: user.profileId, code: 'PARENT_NOT_FOUND', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'PARENT_NOT_FOUND', requestId }, { status: 404 });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('parent_id', parentRow.id)
    .single();

  if (!sub?.stripe_customer_id) {
    logger.warn({ route, requestId, userId: user.profileId, code: 'NO_STRIPE_CUSTOMER', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'NO_STRIPE_CUSTOMER', message: 'No billing account found. Subscribe first.', requestId }, { status: 404 });
  }

  try {
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

    logger.info({ route, requestId, userId: user.profileId, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: true, url: portalSession.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    logger.error({ route, requestId, userId: user.profileId, code: 'STRIPE_ERROR', message: msg, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'STRIPE_ERROR', requestId }, { status: 502 });
  }
}
