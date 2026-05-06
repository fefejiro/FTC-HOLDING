#!/usr/bin/env node
/**
 * stripe-replay.mjs
 * Inventory helper for failed Stripe webhook events.
 * This script does not post events programmatically; it prints safe manual replay steps.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

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

function requireEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!WEBHOOK_URL) missing.push('WEBHOOK_URL');
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

async function main() {
  requireEnv();
  const { dryRun, eventId, limit } = parseArgs();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

  let query = supabase
    .from('stripe_webhook_events')
    .select('stripe_event_id, event_type, status, error_message, attempt_count, received_at')
    .in('status', ['pending', 'failed'])
    .order('received_at', { ascending: true })
    .limit(limit);

  if (eventId) {
    query = query.eq('stripe_event_id', eventId);
  }

  const { data: events, error } = await query;
  if (error) throw new Error(`Unable to query stripe_webhook_events: ${error.message}`);

  if (!events || events.length === 0) {
    console.log('No failed/pending events found.');
    return;
  }

  for (const event of events) {
    console.log(`- ${event.stripe_event_id} (${event.event_type}) status=${event.status} attempts=${event.attempt_count}`);
    if (event.error_message) {
      console.log(`  error: ${event.error_message}`);
    }

    if (dryRun) continue;

    console.log(`  replay: Stripe Dashboard > Webhooks > resend event ${event.stripe_event_id}`);
    console.log(`  target endpoint: ${WEBHOOK_URL}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
