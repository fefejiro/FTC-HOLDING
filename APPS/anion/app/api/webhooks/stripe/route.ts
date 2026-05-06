import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/app/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Webhook handler must read the raw request body for signature verification.
export const runtime = 'nodejs';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Capture a failed webhook event into stripe_webhook_events for later replay.
 * Idempotent — uses stripe_event_id as unique key, increments attempt_count on conflict.
 */
async function captureFailedEvent(
  supabase: ReturnType<typeof getServiceClient>,
  event: Stripe.Event,
  errorMessage: string,
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
    // Log but don't throw — we must not fail the response because of capture errors
    console.error('[stripe-webhook] Failed to capture event for replay:', captureErr);
  }
}

/**
 * Mark a previously captured event as succeeded after successful replay.
 * Idempotent — safe to call multiple times.
 */
async function markEventSucceeded(
  supabase: ReturnType<typeof getServiceClient>,
  eventId: string,
) {
  try {
    await supabase
      .from('stripe_webhook_events')
      .update({ status: 'succeeded', updated_at: new Date().toISOString() })
      .eq('stripe_event_id', eventId);
  } catch (err) {
    console.error('[stripe-webhook] Failed to mark event succeeded:', err);
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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ ok: false, code: 'WEBHOOK_NOT_CONFIGURED' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ ok: false, code: 'MISSING_SIGNATURE' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error('[stripe-webhook] Signature verification failed:', msg);
    return NextResponse.json({ ok: false, code: 'INVALID_SIGNATURE', message: msg }, { status: 400 });
  }

  let supabase: ReturnType<typeof getServiceClient>;
  try {
    supabase = getServiceClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error('[stripe-webhook] Supabase service client init failed:', msg);
    return NextResponse.json({ ok: false, code: 'DB_INIT_FAILED' }, { status: 500 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await syncSubscription(supabase, sub);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(supabase, sub);
        break;
      }
      default:
        // Unhandled event type — acknowledge without error
        break;
    }

    // Mark event as succeeded if it was previously captured for replay
    await markEventSucceeded(supabase, event.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    console.error(`[stripe-webhook] Handler error for ${event.type}:`, msg);

    // Capture failed event for operator replay
    await captureFailedEvent(supabase, event, msg);

    return NextResponse.json({ ok: false, code: 'HANDLER_ERROR', message: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, received: true, type: event.type });
}

