#!/usr/bin/env node
/**
 * stripe-replay.mjs — Operator script to replay failed Stripe webhook events.
 *
 * Usage:
 *   node scripts/stripe-replay.mjs [--dry-run] [--event-id <stripe_event_id>] [--limit <n>]
 *
 * Required env vars (same as production):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   STRIPE_SECRET_KEY
 *   WEBHOOK_URL  — the full URL of your /api/webhooks/stripe endpoint
 *                  e.g. https://your-app.workers.dev/api/webhooks/stripe
 *
 * What it does:
 *   1. Queries stripe_webhook_events WHERE status IN ('pending','failed')
 *      (optionally filtered to a single stripe_event_id).
 *   2. For each event, fetches the canonical event from Stripe (avoids replaying stale data).
 *   3. POSTs it to your webhook endpoint — which re-runs the handler and signature check.
 *   4. Marks the row as 'replayed' in the DB on success.
 *
 * Idempotency:
 *   The handler uses upsert ON CONFLICT for all DB writes, so replaying the same event
 *   multiple times is safe. Stripe events are fetched fresh to avoid acting on stale data.
 *
 * Safety:
 *   - Use --dry-run to preview what would be replayed without sending any requests.
 *   - Always verify the WEBHOOK_URL is correct before running in production.
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

function validateEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
  if (!WEBHOOK_URL) missing.push('WEBHOOK_URL');
  if (missing.length) {
    console.error('❌ Missing required env vars:', missing.join(', '));
    process.exit(1);
  }
}

// ── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, eventId: null, limit: 50 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') opts.dryRun = true;
    if (args[i] === '--event-id' && args[i + 1]) opts.eventId = args[++i];
    if (args[i] === '--limit' && args[i + 1]) opts.limit = Number(args[++i]);
  }
  return opts;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  validateEnv();
  const { dryRun, eventId, limit } = parseArgs();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' });

  // 1. Fetch rows to replay
  let query = supabase
    .from('stripe_webhook_events')
    .select('id, stripe_event_id, event_type, status, error_message, attempt_count, received_at')
    .in('status', ['pending', 'failed'])
    .order('received_at', { ascending: true })
    .limit(limit);

  if (eventId) {
    query = query.eq('stripe_event_id', eventId);
  }

  const { data: rows, error: fetchErr } = await query;
  if (fetchErr) {
    console.error('❌ Failed to fetch events from DB:', fetchErr.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('✅ No failed events to replay.');
    return;
  }

  console.log(`Found ${rows.length} event(s) to replay${dryRun ? ' (DRY RUN — no requests sent)' : ''}.`);
  console.log('');

  let succeeded = 0;
  let failed = 0;

  for (const row of rows) {
    const label = `${row.stripe_event_id} (${row.event_type})`;
    console.log(`→ Replaying ${label} [attempt ${row.attempt_count + 1}]`);

    if (dryRun) {
      console.log(`  ↳ [dry-run] would POST to ${WEBHOOK_URL}`);
      continue;
    }

    let liveEvent;
    try {
      // Fetch canonical event from Stripe to ensure we replay current data
      liveEvent = await stripe.events.retrieve(row.stripe_event_id);
    } catch (err) {
      console.error(`  ↳ ❌ Failed to retrieve event from Stripe:`, err.message);
      failed++;
      continue;
    }

    // POST to the webhook endpoint — it will re-verify and re-process
    let res;
    try {
      res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Replay-Source': 'stripe-replay-script' },
        body: JSON.stringify(liveEvent),
      });
    } catch (networkErr) {
      console.error(`  ↳ ❌ Network error posting to webhook:`, networkErr.message);
      failed++;
      // Update attempt count even on network failure
      await supabase
        .from('stripe_webhook_events')
        .update({ attempt_count: row.attempt_count + 1, updated_at: new Date().toISOString() })
        .eq('stripe_event_id', row.stripe_event_id);
      continue;
    }

    const resBody = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log(`  ↳ ✅ Succeeded (HTTP ${res.status})`);
      // Mark row as replayed
      await supabase
        .from('stripe_webhook_events')
        .update({
          status: 'replayed',
          attempt_count: row.attempt_count + 1,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_event_id', row.stripe_event_id);
      succeeded++;
    } else {
      const errMsg = resBody.message ?? resBody.code ?? `HTTP ${res.status}`;
      console.error(`  ↳ ❌ Failed: ${errMsg}`);
      await supabase
        .from('stripe_webhook_events')
        .update({
          status: 'failed',
          error_message: errMsg,
          attempt_count: row.attempt_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_event_id', row.stripe_event_id);
      failed++;
    }
  }

  console.log('');
  if (!dryRun) {
    console.log(`Done. Succeeded: ${succeeded}, Failed: ${failed}`);
    if (failed > 0) process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
