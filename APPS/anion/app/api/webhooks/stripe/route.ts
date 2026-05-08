import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/app/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/app/lib/logger';
import { getOrCreateRequestId } from '@/app/lib/request-id';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/app/lib/rate-limit';
import { writeAudit } from '@/app/lib/audit';

// Webhook handler must read the raw request body for signature verification.
export const runtime = 'nodejs';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function captureFailedEvent(
  supabase: ReturnType<typeof getServiceClient>,
  event: Stripe.Event,
  errorMessage: string,
) {
  await supabase.from('stripe_webhook_events').upsert(
    {
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event as unknown as Record<string, unknown>,
      status: 'failed',
      error_message: errorMessage,
      attempt_count: 1,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'stripe_event_id',
      ignoreDuplicates: false,
    },
  );
}

async function syncSubscription(
  supabase: ReturnType<typeof getServiceClient>,
  subscription: Stripe.Subscription,
) {
  const parentId = subscription.metadata?.parentId;
  if (!parentId) return;

  const item = subscription.items.data[0];
  const stripePriceId = item?.price?.id ?? null;
  const planId = subscription.metadata?.planId ?? 'starter';

  const status =
    subscription.status === 'active' || subscription.status === 'trialing'
      ? subscription.status
      : subscription.status === 'past_due'
        ? 'past_due'
        : subscription.status === 'canceled'
          ? 'canceled'
          : 'inactive';

  await supabase.from('subscriptions').upsert(
    {
      parent_id: parentId,
      stripe_customer_id: String(subscription.customer),
      stripe_subscription_id: subscription.id,
      stripe_price_id: stripePriceId,
      plan_id: planId,
      status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current_period_start: (subscription as any).current_period_start
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? new Date((subscription as any).current_period_start * 1000).toISOString()
        : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      current_period_end: (subscription as any).current_period_end
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'parent_id' },
  );
}

export async function POST(req: Request) {
  const requestId = getOrCreateRequestId(req);
  const route = '/api/webhooks/stripe';
  const start = Date.now();
  const ip = getClientIp(req);
  const rl = checkRateLimit(`stripe-webhook:${ip}`, RATE_LIMITS.stripeWebhook);

  if (!rl.allowed) {
    const retryAfter = Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000));
    logger.warn({ route, requestId, code: 'RATE_LIMITED', latencyMs: Date.now() - start });
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', retryAfter, requestId },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(RATE_LIMITS.stripeWebhook.limit),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error({ route, requestId, code: 'WEBHOOK_NOT_CONFIGURED' });
    return NextResponse.json({ ok: false, code: 'WEBHOOK_NOT_CONFIGURED' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    logger.warn({ route, requestId, code: 'MISSING_SIGNATURE', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'MISSING_SIGNATURE' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    logger.warn({ route, requestId, code: 'INVALID_SIGNATURE', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'INVALID_SIGNATURE', message: msg }, { status: 400 });
  }

  let supabase: ReturnType<typeof getServiceClient>;
  try {
    supabase = getServiceClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    logger.error({ route, requestId, code: 'DB_INIT_FAILED', message: msg, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'DB_INIT_FAILED' }, { status: 500 });
  }

  try {
    const { error: claimError } = await supabase
      .from('webhook_events')
      .insert({ id: event.id, event_type: event.type });
    if (claimError?.code === '23505') {
      logger.info({ route, requestId, eventType: event.type, duplicate: true, latencyMs: Date.now() - start });
      return NextResponse.json({ ok: true, received: true, duplicate: true, type: event.type });
    }
    if (claimError) {
      throw new Error(claimError.message);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await syncSubscription(supabase, sub);
          void writeAudit({
            action: 'billing.subscription_updated',
            resourceType: 'subscription',
            resourceId: sub.id,
            metadata: { event_type: event.type, plan_id: sub.metadata?.planId, status: sub.status },
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(supabase, sub);
        void writeAudit({
          action: 'billing.subscription_updated',
          resourceType: 'subscription',
          resourceId: sub.id,
          metadata: { event_type: event.type, plan_id: sub.metadata?.planId, status: sub.status },
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(supabase, sub);
        void writeAudit({
          action: 'billing.subscription_deleted',
          resourceType: 'subscription',
          resourceId: sub.id,
          metadata: { event_type: event.type, status: sub.status },
        });
        break;
      }
      default:
        // Unhandled event type — acknowledge without error
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    try {
      await supabase.from('webhook_events').delete().eq('id', event.id);
      await captureFailedEvent(supabase, event, msg);
    } catch (captureErr) {
      logger.error({
        route,
        requestId,
        code: 'WEBHOOK_FAILURE_CAPTURE_ERROR',
        message: captureErr instanceof Error ? captureErr.message : String(captureErr),
        latencyMs: Date.now() - start,
      });
    }
    logger.error({
      route,
      requestId,
      code: 'HANDLER_ERROR',
      eventType: event.type,
      message: msg,
      latencyMs: Date.now() - start,
    });
    return NextResponse.json({ ok: false, code: 'HANDLER_ERROR', message: msg }, { status: 500 });
  }

  logger.info({ route, requestId, eventType: event.type, latencyMs: Date.now() - start });
  return NextResponse.json({ ok: true, received: true, type: event.type });
}
