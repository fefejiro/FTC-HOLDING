-- Migration: stripe_webhook_events — failed-event capture table
-- Purpose: capture Stripe webhook events that failed handler processing
-- so operators can replay them after fixing the underlying issue.

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id  text NOT NULL,
  event_type    text NOT NULL,
  -- full Stripe event JSON payload for replay
  payload       jsonb NOT NULL,
  -- when the event arrived
  received_at   timestamptz NOT NULL DEFAULT now(),
  -- handler outcome
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'succeeded', 'failed', 'replayed')),
  -- error detail from failed handler attempt
  error_message text,
  -- number of processing attempts (including initial + replays)
  attempt_count integer NOT NULL DEFAULT 1,
  -- last time this row was updated
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate captures for the same Stripe event
CREATE UNIQUE INDEX IF NOT EXISTS stripe_webhook_events_event_id_uq
  ON stripe_webhook_events (stripe_event_id);

-- Fast lookups for replay scripts
CREATE INDEX IF NOT EXISTS stripe_webhook_events_status_idx
  ON stripe_webhook_events (status)
  WHERE status IN ('pending', 'failed');

-- RLS: only service-role can read/write (no public access)
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (service role bypasses RLS by default in Supabase,
-- but we keep RLS enabled to block anon/authenticated roles).
-- No policies needed — absence of policies means all non-service-role access is denied.

COMMENT ON TABLE stripe_webhook_events IS
  'Captures Stripe webhook events for failed-handler replay. '
  'Rows with status=failed can be replayed via scripts/stripe-replay.mjs.';
