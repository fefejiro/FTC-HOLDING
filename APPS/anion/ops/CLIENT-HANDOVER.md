# Anion Class App — Client Handover

**Version:** 0.2.0  
**Delivered:** 2026-05-07  
**Milestones:** M1 Auth · M2 Bookings · M3 Stripe Billing · M4 Daily Live Classroom · M5 Admin Dashboard

---

## What Was Built

| Milestone | Feature | Status |
|-----------|---------|--------|
| M1 | Magic-link auth (PKCE), route guards, role redirect | ✅ Done |
| M1 DB | RLS policies for profiles + user\_roles | ✅ Applied to live DB |
| M2 | Booking request flow — parent creates, tutor accepts/declines | ✅ Done |
| M2 DB | Bookings table + RLS | ✅ Applied to live DB |
| M3 | Stripe checkout, billing portal, webhook subscription sync | ✅ Done |
| M3 DB | Subscriptions table + RLS | ✅ Applied to live DB |
| M4 | Daily.co live classroom (room creation, video call, join flow) | ✅ Done |
| M5 | Admin dashboard with live Supabase metrics | ✅ Done |

---

## Production Setup Checklist

Complete these steps before going live. They require access to third-party dashboards.

### 1. Supabase Auth — Allow-list your production domain

In [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/auth/url-configuration):

- **Site URL:** `https://your-production-domain.com`
- **Redirect URLs:** Add `https://your-production-domain.com/auth/callback`

### 2. Stripe — Create products and price IDs

In [Stripe Dashboard → Products](https://dashboard.stripe.com/products):

Create three recurring monthly prices and note each **Price ID** (`price_xxxxx`):

| Plan | Monthly Price | Sessions |
|------|-------------|---------|
| Starter | $49 | 4/month |
| Growth | $89 | 8/month |
| Unlimited | $149 | Unlimited |

### 3. Stripe — Register the webhook

In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks):

- **Endpoint URL:** `https://your-production-domain.com/api/webhooks/stripe`
- **Events to listen for:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- After saving, copy the **Signing Secret** — this is your `STRIPE_WEBHOOK_SECRET`.

### 4. Daily.co — Get your API key

In [Daily.co Dashboard → Developers](https://dashboard.daily.co/developers):

- Copy your **API Key** → `DAILY_API_KEY`
- Your domain (e.g. `yourcompany.daily.co`) → `DAILY_DOMAIN`

---

## Environment Variables

Set all of these in your Cloudflare Workers environment (or `.env.local` for local dev):

```env
# Supabase (already set)
NEXT_PUBLIC_SUPABASE_URL=https://aaaextkrfoqomzmjjkxe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# Stripe — fill in after completing Step 2 and 3 above
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_GROWTH=price_...
STRIPE_PRICE_UNLIMITED=price_...

# Daily.co — fill in after completing Step 4 above
DAILY_API_KEY=...
DAILY_DOMAIN=yourcompany.daily.co
```

---

## Deploying to Cloudflare Workers

```powershell
cd "C:\FTC HOLDING\APPS\anion"

# Build for Cloudflare (OpenNext adapter)
npm run build:worker

# Deploy
npm run deploy:worker
```

Set each env var in the Cloudflare dashboard under **Workers & Pages → anion → Settings → Variables** (or via `wrangler secret put VARIABLE_NAME`).

---

## Database Migrations

All migrations have been applied to the live Supabase project. Files are in `supabase/migrations/`:

| File | Status |
|------|--------|
| `20260505_000001_init_foundation.sql` | ✅ Applied |
| `20260506_000002_auth_rls.sql` | ✅ Applied |
| `20260506_000003_bookings_m2.sql` | ✅ Applied |
| `20260507_000004_subscriptions_m3.sql` | ✅ Applied |
| `20260509_000006_stripe_webhook_events.sql` | ⏳ Apply before going live |

To apply future migrations, use the Supabase Management API (see `scripts/run-migrations.cjs`).

---

## User Roles

| Role | Access |
|------|--------|
| `parent` | Book sessions, manage subscription, join lessons |
| `tutor` | Accept/decline bookings, join lessons |
| `student` | View their sessions |
| `admin` | Operator dashboard with platform metrics |

Roles are set in the `user_roles` table. To make a user an admin:

```sql
INSERT INTO user_roles (profile_id, role)
SELECT id, 'admin' FROM profiles WHERE email = 'admin@yourdomain.com';
```

---

## User Journey (End-to-End)

1. **Parent signs up** → `/login` → magic link email → `/auth/callback` → `/parent`
2. **Parent chooses a plan** → `/pricing` → Stripe checkout → subscription synced via webhook
3. **Parent books a session** → `/parent` → tutor accepts → booking status = `accepted`
4. **Both join the lesson** → `/lesson/[bookingId]` → Daily.co video call
5. **Admin monitors** → `/admin` → live user/booking/subscription metrics

---

## What the Client Needs to Do

- [ ] Add production domain to Supabase Auth allow-list
- [ ] Create 3 Stripe prices and copy IDs into env vars
- [ ] Register Stripe webhook endpoint and copy signing secret
- [ ] Get Daily.co API key and domain
- [ ] Set all env vars in Cloudflare Workers
- [ ] Run `npm run build:worker && npm run deploy:worker`
- [ ] Test: sign up, book, subscribe, join lesson, admin view

---

## Operational Recovery

If Stripe webhook events fail to process (e.g. DB outage, transient error), events are captured in the `stripe_webhook_events` table for safe replay.

**See the full runbook:** [`ops/STRIPE-WEBHOOK-RECOVERY.md`](./STRIPE-WEBHOOK-RECOVERY.md)

Quick replay command:

```bash
cd APPS/anion
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... STRIPE_SECRET_KEY=... \
WEBHOOK_URL=https://your-production-domain.com/api/webhooks/stripe \
node scripts/stripe-replay.mjs --dry-run  # preview first
node scripts/stripe-replay.mjs             # then replay
```

---

## Support Contacts

- **Supabase project ref:** `aaaextkrfoqomzmjjkxe`
- **GitHub repo:** `https://github.com/fefejiro/FTC-HOLDING`
- **App path in monorepo:** `APPS/anion/`
