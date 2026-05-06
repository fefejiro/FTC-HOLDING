# Stripe Webhook Recovery Runbook

**App:** Anion Class App  
**Path:** `APPS/anion/`  
**Last updated:** 2026-05-09

---

## Overview

When the Stripe webhook handler (`/api/webhooks/stripe`) fails to process an event (e.g. DB outage, transient Stripe API error), the event payload is captured in the `stripe_webhook_events` table with `status = 'failed'`.  

This runbook explains how to safely replay those events once the underlying issue is resolved.

---

## 1 — Identify failed events

Run in Supabase SQL editor or via `psql`:

```sql
SELECT
  stripe_event_id,
  event_type,
  status,
  error_message,
  attempt_count,
  received_at,
  updated_at
FROM stripe_webhook_events
WHERE status IN ('pending', 'failed')
ORDER BY received_at ASC;
```

If you see rows, proceed to step 2.

---

## 2 — Verify the root cause is fixed

Before replaying:

- **Supabase outage** — confirm Supabase is healthy (`supabase.com/dashboard`).
- **Missing env vars** — confirm `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, etc. are set in Cloudflare Workers.
- **Logic bug** — deploy the fixed code first.

---

## 3 — Dry-run preview (always do this first)

```bash
cd APPS/anion

NEXT_PUBLIC_SUPABASE_URL=https://aaaextkrfoqomzmjjkxe.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
STRIPE_SECRET_KEY=sk_live_... \
WEBHOOK_URL=https://your-production-domain.com/api/webhooks/stripe \
node scripts/stripe-replay.mjs --dry-run
```

Output will list all `pending`/`failed` events without sending any requests. Review before proceeding.

To preview a single event:

```bash
node scripts/stripe-replay.mjs --dry-run --event-id evt_1ABC123...
```

---

## 4 — Replay all failed events

```bash
cd APPS/anion

NEXT_PUBLIC_SUPABASE_URL=https://aaaextkrfoqomzmjjkxe.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
STRIPE_SECRET_KEY=sk_live_... \
WEBHOOK_URL=https://your-production-domain.com/api/webhooks/stripe \
node scripts/stripe-replay.mjs
```

Default limit is 50 events per run. Use `--limit <n>` to adjust.

The script:
1. Fetches each failed event's canonical payload from Stripe (avoids stale data).
2. POSTs to your live webhook endpoint — full signature verification is bypassed for replay POSTs (the replay script sends the live event JSON directly).
3. On success → marks row `status = 'replayed'`.
4. On failure → increments `attempt_count`, logs the error.

---

## 5 — Replay a single specific event

```bash
node scripts/stripe-replay.mjs --event-id evt_1ABC123...
```

Useful when only one subscription is stuck.

---

## 6 — Manual SQL reconciliation (last resort)

If the replay script cannot reach the webhook (e.g. Cloudflare is down), you can manually sync the subscription directly:

```sql
-- Example: fix a stuck subscription
UPDATE subscriptions
SET
  status = 'active',
  stripe_subscription_id = 'sub_xxx',
  stripe_price_id = 'price_xxx',
  updated_at = now()
WHERE parent_id = '<parent-uuid>';
```

Only do this if you have confirmed the correct subscription state in the Stripe dashboard.

---

## 7 — Verify the fix

After replay, confirm:

```sql
-- Should return 0 rows
SELECT COUNT(*) FROM stripe_webhook_events WHERE status IN ('pending', 'failed');

-- Confirm subscription synced correctly
SELECT parent_id, status, plan_id, updated_at FROM subscriptions ORDER BY updated_at DESC LIMIT 10;
```

Also verify in the Stripe dashboard that the user's subscription is active.

---

## 8 — Stripe dashboard manual retry (alternative)

If you prefer not to use the replay script, you can replay any event directly from the Stripe dashboard:

1. Go to **Stripe Dashboard → Webhooks → [your endpoint]**
2. Find the failed event in the event list
3. Click **Resend**

Stripe will deliver the event again with a fresh signature — the webhook handler will process it normally.

---

## Appendix: `stripe_webhook_events` table schema

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Internal row ID |
| `stripe_event_id` | text | Stripe event ID (unique, used for idempotency) |
| `event_type` | text | e.g. `checkout.session.completed` |
| `payload` | jsonb | Full Stripe event JSON |
| `received_at` | timestamptz | When the event arrived |
| `status` | text | `pending`, `failed`, `succeeded`, `replayed` |
| `error_message` | text | Handler error detail |
| `attempt_count` | integer | Total handler attempts (including replays) |
| `updated_at` | timestamptz | Last updated |
