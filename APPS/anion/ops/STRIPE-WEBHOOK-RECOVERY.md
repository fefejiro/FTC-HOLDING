# Stripe Webhook Recovery Runbook

When `/api/webhooks/stripe` fails to process an event, the app writes the failed payload to `stripe_webhook_events` with `status='failed'`.

## 1) Find failed events

```sql
select
  stripe_event_id,
  event_type,
  status,
  error_message,
  attempt_count,
  received_at,
  updated_at
from stripe_webhook_events
where status in ('pending', 'failed')
order by received_at asc;
```

## 2) Confirm the root cause is fixed

- Supabase service role key and Stripe webhook secret are configured.
- The failing app release has been replaced.
- Any upstream outage is resolved.

## 3) Dry-run event inventory

```bash
cd APPS/anion
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
WEBHOOK_URL=https://<your-domain>/api/webhooks/stripe \
node scripts/stripe-replay.mjs --dry-run
```

## 4) Replay from Stripe (safe path)

For each failed event id from step 1:

1. Open Stripe Dashboard → Developers → Webhooks → your endpoint.
2. Locate the event id.
3. Click **Resend**.

Stripe sends a fresh signed webhook request, so signature verification remains intact.

## 5) Verify recovery

```sql
select count(*) as remaining_failed
from stripe_webhook_events
where status in ('pending', 'failed');
```

If retries are successful, rows transition to `status='succeeded'`.
