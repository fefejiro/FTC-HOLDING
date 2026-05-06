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
  requestId: string,
) {
  try {
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
  } catch (captureErr) {
    logger.error({
      route: '/api/webhooks/stripe',
      requestId,
      code: 'FAILED_EVENT_CAPTURE_ERROR',
      message: captureErr instanceof Error ? captureErr.message : String(captureErr),
    });
  }
}

async function markEventSucceeded(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string,
  requestId: string,
) {
  try {
    await supabase
      .from('stripe_webhook_events')
      .update({ status: 'succeeded', updated_at: new Date().toISOString() })
      .eq('stripe_event_id', eventId);
  } catch (err) {
    logger.error({
      route: '/api/webhooks/stripe',
      requestId,
      code: 'FAILED_EVENT_MARK_SUCCEEDED',
      message: err instanceof Error ? err.message : String(err),
    });
  }
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
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
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

  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle();

  if (existingEvent) {
    logger.info({ route, requestId, eventType: event.type, code: 'DUPLICATE_EVENT', latencyMs: Date.now() - start });
    return NextResponse.json({ ok: true, received: true, duplicate: true });
  }

  try {
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

    await markEventSucceeded(supabase, event.id, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    await captureFailedEvent(supabase, event, msg, requestId);
    logger.error({ route, requestId, code: 'HANDLER_ERROR', eventType: event.type, message: msg, latencyMs: Date.now() - start });
    return NextResponse.json({ ok: false, code: 'HANDLER_ERROR', message: msg }, { status: 500 });
  }

  await supabase
    .from('webhook_events')
    .upsert({ id: event.id, event_type: event.type }, { ignoreDuplicates: true });

  logger.info({ route, requestId, eventType: event.type, latencyMs: Date.now() - start });
  return NextResponse.json({ ok: true, received: true, type: event.type });
}
