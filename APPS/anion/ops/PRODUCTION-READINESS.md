# Anion Class App — Production Readiness Checklist

**Version:** 1.0  
**Last Updated:** 2026-05-20  
**Run before:** Every production deployment or client handover

Fill in **Pass**, **Fail**, or **N/A** for each item. Any **Fail** must be resolved before proceeding.

---

## Section 1 — Build Gate

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 1.1 | `npm run build` completes without errors | Exit 0, 0 errors | |
| 1.2 | TypeScript check: `npx tsc --noEmit` | 0 errors | |
| 1.3 | No `console.error` or unhandled promise rejections in build output | Clean output | |
| 1.4 | Bundle size within acceptable limit | No pages > 500 KB gzipped | |

---

## Section 2 — External Blocker Checklist

All third-party credentials must be configured before deployment. **No deployment should proceed until all items below are checked.**

### 2A — Stripe

| # | Check | Action Required | Done? |
|---|-------|----------------|-------|
| S1 | Stripe account is in **live mode** (not test mode) | Toggle in Stripe dashboard | ☐ |
| S2 | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set to `pk_live_...` | Cloudflare Workers env vars | ☐ |
| S3 | `STRIPE_SECRET_KEY` is set to `sk_live_...` | Cloudflare Workers env vars (secret) | ☐ |
| S4 | Three prices created: Starter / Growth / Unlimited | [Stripe → Products](https://dashboard.stripe.com/products) | ☐ |
| S5 | `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_UNLIMITED` set to `price_...` values | Cloudflare Workers env vars | ☐ |
| S6 | Webhook endpoint registered: `https://[domain]/api/webhooks/stripe` | [Stripe → Webhooks](https://dashboard.stripe.com/webhooks) | ☐ |
| S7 | Webhook listens for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` | Stripe webhook config | ☐ |
| S8 | `STRIPE_WEBHOOK_SECRET` is set to `whsec_...` (from webhook signing secret) | Cloudflare Workers env vars (secret) | ☐ |
| S9 | Test webhook delivery successful (Stripe sends ping → endpoint returns 200) | Stripe webhook dashboard → Send test event | ☐ |

### 2B — Daily.co

| # | Check | Action Required | Done? |
|---|-------|----------------|-------|
| D1 | Daily.co account is active and domain is provisioned | [Daily.co Dashboard](https://dashboard.daily.co) | ☐ |
| D2 | `DAILY_API_KEY` is set | Cloudflare Workers env vars (secret) | ☐ |
| D3 | `DAILY_DOMAIN` is set to `yourcompany.daily.co` | Cloudflare Workers env vars | ☐ |
| D4 | Test room creation: `POST /api/daily/room` returns room URL | Use smoke test step 3.2 | ☐ |

### 2C — Supabase

| # | Check | Action Required | Done? |
|---|-------|----------------|-------|
| SB1 | `NEXT_PUBLIC_SUPABASE_URL` is set | `npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL --name anion-web` (value: `https://aaaextkrfoqomzmjjkxe.supabase.co`) | ☐ |
| SB2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set | `npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --name anion-web` (value: from [Supabase → Settings → API → anon/public key](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/settings/api)) | ☐ |
| SB3 | `SUPABASE_SERVICE_ROLE_KEY` is set | `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name anion-web` (value: from [Supabase → Settings → API → service_role key](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/settings/api)) | ☐ |
| SB4 | Production domain added to Supabase Auth allow-list | [Supabase → Auth → URL Configuration](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/auth/url-configuration) | ☐ |
| SB5 | Redirect URL `https://[domain]/auth/callback` is in the allow-list | Same as above | ☐ |
| SB6 | All current migrations applied to live database (currently 17) | Check `supabase/migrations/` vs applied | ☐ |
| SB7 | RLS policies verified: profiles, bookings, subscriptions, user_roles | Run `SELECT * FROM pg_policies` | ☐ |

### 2D — Cloudflare

| # | Check | Action Required | Done? |
|---|-------|----------------|-------|
| CF1 | Custom domain configured and DNS propagated | [Cloudflare → Pages → Custom domains](https://dash.cloudflare.com) | ☐ |
| CF2 | SSL/TLS set to Full (Strict) | Cloudflare → SSL/TLS | ☐ |
| CF3 | All env vars and secrets set in Workers environment | Cloudflare → Workers → Settings → Variables | ☐ |
| CF4 | Worker deployment succeeds: `npm run deploy:worker` | Deployment log shows success | ✅ 2026-05-20 — Version 61951451 live |
| CF5 | `/api/health` returns `{"ok":true}` | `curl https://anion.unalabs.cloud/api/health` | ✅ 2026-05-20 — Verified 200 |

---

## Section 3 — Functional Smoke Tests

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 3.1 | `GET https://[domain]/api/health` | `200 { "ok": true }` | ✅ `https://anion.unalabs.cloud/api/health` returns 200 (2026-05-20) |
| 3.2 | `GET https://[domain]/api/status` | `200` with status map | |
| 3.3 | Homepage loads without error | Page renders, no console errors | |
| 3.4 | Magic-link sign-in flow completes | Session established, redirects to role dashboard | |
| 3.5 | Parent role redirected to `/parent` | Correct dashboard shown | |
| 3.6 | Tutor role redirected to `/tutor` | Correct dashboard shown | |
| 3.7 | Admin role can access `/admin` | Metrics visible | |
| 3.8 | `GET /pricing` loads subscription plans | 3 plans visible with correct prices | |
| 3.9 | Stripe checkout session initiated | Redirects to Stripe-hosted checkout page | |
| 3.10 | Billing portal accessible for active subscriber | Redirects to Stripe billing portal | |
| 3.11 | Tutor booking request accepts/declines | Status updates in DB | |
| 3.12 | Daily.co room created for accepted booking | Room URL returned, video call joinable | |
| 3.13 | 404 page renders for unknown routes | Custom not-found page | |

---

## Section 4 — Security Gates

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 4.1 | No secret keys committed to git | `git grep -r "sk_live\|whsec_\|service_role"` returns nothing | |
| 4.2 | Admin route (`/admin`) blocked for non-admin users | Returns 403 or redirect to login | |
| 4.3 | Direct API calls without auth token return 401 | `curl /api/bookings` without session → 401 | |
| 4.4 | Stripe webhook rejects requests without valid signature | POST without `stripe-signature` header → 400 | |
| 4.5 | Supabase RLS enforced: users cannot read other users' data | Cross-user query returns empty, not forbidden data | |
| 4.6 | HTTPS enforced (no HTTP downgrade) | HTTP redirects to HTTPS | |

---

## Section 5 — Legal & Trust Gates

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 5.1 | Privacy Policy is linked from the app footer or sign-up page | Link present and page loads | |
| 5.2 | Terms of Service are linked from the app | Link present and page loads | |
| 5.3 | Cookie consent banner (if serving EU/UK users) | Banner shown on first visit | |
| 5.4 | Data deletion contact is documented and reachable | Email in Privacy Policy responds | |
| 5.5 | PRIVACY.md reviewed by legal counsel before launch | Legal sign-off obtained | |
| 5.6 | TERMS.md reviewed by legal counsel before launch | Legal sign-off obtained | |

---

## Section 6 — Operational Readiness

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 6.1 | Uptime monitor configured for `/api/health` | Monitor active, alert routing set | |
| 6.2 | Cloudflare error notifications enabled | Email/Slack alert on Worker errors | |
| 6.3 | Stripe webhook delivery alerts enabled | Email on webhook failure | |
| 6.4 | Supabase backup verified as current | Last backup < 24h ago | |
| 6.5 | MONITORING-ALERTS.md is reviewed and owners assigned | All owner fields populated | |
| 6.6 | DISASTER-RECOVERY.md runbooks are reviewed | Owner confirmed runbooks are understood | |
| 6.7 | Support contact email is live and monitored | Test email delivered and read | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Platform Operator | | | |
| Client / Sponsor | | | |
| QA / Release | | | |

---

## Related Docs

- [CLIENT-HANDOVER.md](./CLIENT-HANDOVER.md) — full setup instructions
- [MONITORING-ALERTS.md](./MONITORING-ALERTS.md) — metrics and alert configuration
- [DISASTER-RECOVERY.md](./DISASTER-RECOVERY.md) — backup, restore, incident response
- [M5-SMOKE-TEST-CHECKLIST.md](./M5-SMOKE-TEST-CHECKLIST.md) — pre-release smoke test
- [docs/PRIVACY.md](../docs/PRIVACY.md) — privacy policy
- [docs/TERMS.md](../docs/TERMS.md) — terms of service
