# Anion Class App - Client Handover

> Status: supporting reference.
>
> Use `NEXT-24H-EXECUTION-BOARD.md` for the active engineering execution queue.
> This file stays focused on production handover prerequisites, setup context,
> and client-facing truth.

**Version:** 0.2.15
**Updated:** 2026-06-09
**Production URL:** https://anion.unalabs.cloud
**Milestones:** M1 Auth, M2 Bookings, M3 Stripe Billing, M4 Daily Live Classroom, M5 Admin Dashboard

## Current Handover Gate

As of 2026-06-09, production is reachable and Cloudflare Worker provider setting names for Supabase, Daily, and Stripe are present. The public browser auth-config blocker is fixed in production.

Handover is still blocked by evidence, not provider inventory:

- `SUPABASE_SERVICE_ROLE_KEY` must be replaced with the valid Supabase `service_role` key for project `aaaextkrfoqomzmjjkxe`; the current Worker secret value returned `Invalid API key` during fixture repair.
- Production parent/tutor/student domain fixture rows must be repaired after the service-role key is corrected.
- Authenticated parent visibility and parent call-denial evidence.
- Authenticated tutor Daily join, leave, and rejoin evidence.
- Authenticated student Daily join, leave, and rejoin evidence.
- Stripe test checkout, signed webhook, subscription sync, and billing portal evidence.
- Privacy/Terms legal signoff.

Run this gate before any client handover claim:

```powershell
ANION_BASE_URL=https://anion.unalabs.cloud npm run prod:doctor
```

Expected current result: blocked until the runtime blocker codes are resolved. This is intentional; `prod:doctor` fails closed when `/api/status` reports handover blockers.

Run strict production verification:

```powershell
$env:ANION_BASE_URL="https://anion.unalabs.cloud"
$env:CHECK_STRIPE_WEBHOOK="1"
$env:CHECK_DAILY_ROOM_SMOKE="1"
$env:EXPECTED_DAILY_ERROR_CODE="AUTO"
npm run verify:prod
```

Expected current result: pass, including:

- Auth callback redirects on `https://anion.unalabs.cloud`.
- Public browser Supabase config has `placeholder=no`.
- Stripe unsigned webhook returns `400 MISSING_SIGNATURE`.
- Daily room smoke returns a configured auth/CSRF gate, not provider-missing.

## Evidence Commands

After `prod:doctor` passes, run authenticated video-call evidence:

```powershell
$env:ANION_BASE_URL="https://anion.unalabs.cloud"
$env:NEXT_PUBLIC_SUPABASE_URL="https://aaaextkrfoqomzmjjkxe.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
$env:ANION_PHASE1_BOOKING_ID="..."
$env:ANION_PARENT_EMAIL="..."
$env:ANION_TUTOR_EMAIL="..."
$env:ANION_STUDENT_EMAIL="..."
npm run phase1:evidence
```

Required proof:

- Parent can see the accepted booking.
- Parent cannot join the Daily room.
- Tutor can join, leave, and rejoin.
- Student can join, leave, and rejoin.
- Tutor and student can join the same booking concurrently.
- Tutor writing board, student learning feed, and role dashboards are screenshot-captured.

After Stripe test-mode provider settings are present, run billing evidence:

```powershell
$env:ANION_BASE_URL="https://anion.unalabs.cloud"
$env:NEXT_PUBLIC_SUPABASE_URL="https://aaaextkrfoqomzmjjkxe.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
$env:STRIPE_SECRET_KEY="..."
$env:STRIPE_WEBHOOK_SECRET="..."
$env:STRIPE_PRICE_STARTER="..."
$env:ANION_PHASE1_BOOKING_ID="..."
$env:ANION_PARENT_EMAIL="..."
npm run billing:evidence
```

Required proof:

- App creates a checkout session.
- Stripe Checkout opens in test mode.
- Production webhook accepts a valid signed Stripe event.
- Subscription state is reflected in the app/admin surfaces.
- Billing portal session can be created.

## What Was Built

| Milestone | Feature | Status |
|-----------|---------|--------|
| M1 | Google OAuth, magic-link auth, route guards, role redirects | Done |
| M1 DB | RLS policies for profiles and user_roles | Applied to live DB |
| M2 | Booking request flow: parent creates, tutor accepts/declines | Done |
| M2 DB | Bookings table and RLS | Applied to live DB |
| M3 | Stripe checkout, billing portal, webhook subscription sync | Implemented; evidence pending |
| M3 DB | Subscriptions table and RLS | Applied to live DB |
| M4 | Daily.co live classroom: room creation, tutor/student video call, join/rejoin | Implemented; production evidence pending |
| M5 | Admin dashboard with live Supabase metrics | Done |

## Provider Setup Summary

### Supabase

- Live project ref: `aaaextkrfoqomzmjjkxe`.
- Public URL: `https://aaaextkrfoqomzmjjkxe.supabase.co`.
- Worker runtime bindings supply public URL, anon key, and service role key.
- Production callback to confirm in Supabase Auth allow-list: `https://anion.unalabs.cloud/auth/callback`.

### Daily.co

- Daily provider settings are present in Cloudflare Worker runtime.
- Daily domain is configured.
- Non-destructive production smoke verifies the route is configured and protected.
- Final proof still requires authenticated tutor/student join, leave, and rejoin evidence.

### Stripe

- Stripe settings are present in Cloudflare Worker runtime for test-mode handover.
- Plans required: Starter `$49/mo`, Growth `$89/mo`, Unlimited `$149/mo`.
- Webhook endpoint: `https://anion.unalabs.cloud/api/webhooks/stripe`.
- Required events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Signature gate passes by rejecting unsigned requests with `400 MISSING_SIGNATURE`.
- Final proof still requires `npm run billing:evidence`.

### Cloudflare

- Worker name: `anion-web`.
- Production route: `https://anion.unalabs.cloud`.
- Deploy command: `npm run deploy:worker`.
- Runtime public Supabase config is injected from Worker bindings; browser bundle guard prevents local placeholders from being served.

## User Journey

1. Parent signs in via `/login` using Google OAuth or secure email link.
2. Parent chooses a plan on `/pricing` and completes Stripe checkout.
3. Parent books a session on `/parent`.
4. Tutor accepts the session.
5. Tutor and student join `/lesson/[bookingId]` for the Daily call.
6. Parent sees accepted booking context but does not join the call.
7. Admin monitors users, bookings, and subscriptions on `/admin`.

## Known Limitations

- Background customization is not implemented.
- Phase 1 production call evidence is not yet captured with confirmed role accounts.
- Stripe billing evidence is not yet captured end to end in test mode.
- Privacy and Terms pages are placeholders pending legal signoff.
- Live billing keys should not be switched on until UB approves test-mode evidence.

## Support And Rollback

- Production health: `https://anion.unalabs.cloud/api/health`.
- Production status: `https://anion.unalabs.cloud/api/status`.
- Recovery docs:
  - `ops/DISASTER-RECOVERY.md`
  - `ops/MONITORING-ALERTS.md`
  - `ops/STRIPE-WEBHOOK-RECOVERY.md`
- Rollback: redeploy the previous Cloudflare Worker version from the Cloudflare dashboard or rerun `npm run deploy:worker` from a known-good commit.

## Additional Documentation

| Document | Purpose |
|----------|---------|
| `ops/PRODUCTION-READINESS.md` | Full pass/fail production checklist |
| `ops/PHASE1-CALL-PRODUCTION-CLOSURE.md` | Live-classroom evidence runbook |
| `ops/MONITORING-ALERTS.md` | Metrics, thresholds, alert routing |
| `ops/DISASTER-RECOVERY.md` | Backup, restore, incident response |
| `ops/STRIPE-WEBHOOK-RECOVERY.md` | Failed Stripe webhook replay procedure |
| `docs/PRIVACY.md` | Privacy policy placeholder pending legal review |
| `docs/TERMS.md` | Terms placeholder pending legal review |
