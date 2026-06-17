# Anion Class App — Production Readiness Checklist

**Version:** 1.0  
**Last Updated:** 2026-06-17
**Run before:** Every production deployment or client handover

Fill in **Pass**, **Fail**, or **N/A** for each item. Any **Fail** must be resolved before proceeding.

Production closure rule: do not mark overall project status as green while critical blocker rows in this checklist remain open.

For lesson call production closure evidence, run and complete `ops/PHASE1-CALL-PRODUCTION-CLOSURE.md` in parallel with this checklist.

Current machine-checkable gate:

```powershell
npm run prod:doctor
```

2026-06-16 result: production health/status and Cloudflare Worker provider-secret inventory are reachable for Supabase, Daily, and Stripe. Strict verification passed for public browser config, auth callback, webhook signature gate, and CSRF-protected Daily smoke after Worker version `46b60191-b129-4165-a6d4-c4260199e906` deployed. The recurring class plan and whiteboard schemas were applied directly with `supabase db query --linked` because the historical migration table is not aligned with Anion's local migration filenames. Handover remains blocked on real Google-auth parent/tutor/student evidence, full tutor/student join-background-leave-rejoin proof, whiteboard sync/reload proof, Stripe subscription-state evidence, and legal signoff.

2026-06-17 update: Google OAuth handoff from `https://anion.unalabs.cloud/login` reaches Google Accounts successfully. A production gap was found where Supabase Auth users existed but missing `profiles` rows caused Anion to treat them as unauthenticated. `/auth/callback` now provisions a default profile, parent role, and parent row after successful OAuth. Existing `fejiro.efiuvwere@gmail.com` and `peacepad@peacepad.ca` auth users were backfilled with profiles and parent rows. Worker version `475abf62-81ae-4460-8ce5-70f658521ade` is live. Handover remains blocked on dedicated parent/tutor/student role evidence, whiteboard sync/reload proof, Stripe subscription-state evidence, and legal signoff.

2026-06-17 late update: Phase 1 production role fixture now uses three Google-auth users: `fejiro.efiuvwere@gmail.com` as parent, `peacepad@peacepad.ca` as tutor, and `justsayemma112@gmail.com` as student. Accepted booking `e3b85332-a29b-4b4d-8b83-ef8c12e96cde` was created for evidence. Service-role evidence now proves parent dashboard, tutor dashboard, student dashboard, accepted booking visibility, parent lesson denial, and assigned tutor/student Daily token issuance. The video journey still fails because the rendered lesson remains in the "Session ended / Rejoin lesson" state during automation and never reaches the `Connected` status. Worker version `36eca01c-c5a6-425e-8b81-8aeebc172c0b` is live with callback token-hash support and explicit rejoin-state reset. Handover remains blocked on live tutor/student connected video proof, whiteboard sync/reload proof, Stripe subscription-state evidence, and legal signoff.

---

## Section 1 — Build Gate

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 1.1 | `npm run build` completes without errors | Exit 0, 0 errors | ✅ 2026-05-21 — Verified during `npm run ci:check` |
| 1.2 | TypeScript check: `npx tsc --noEmit` | 0 errors | ✅ 2026-05-21 — Verified during `npm run ci:check` |
| 1.3 | No `console.error` or unhandled promise rejections in build output | Clean output | |
| 1.4 | Bundle size within acceptable limit | No pages > 500 KB gzipped | ✅ 2026-05-21 — Largest first-load shared JS ~102 KB |

---

## Section 2 — External Blocker Checklist

All third-party credentials must be configured before deployment. **No deployment should proceed until all items below are checked.**

### 2A — Stripe

| # | Check | Action Required | Done? |
|---|-------|----------------|-------|
| S1 | Stripe test mode is configured for handover evidence | Use Stripe test dashboard | ☐ |
| S2 | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set to `pk_test_...` | Cloudflare Workers env vars | ☐ |
| S3 | `STRIPE_SECRET_KEY` is set to `sk_test_...` | Cloudflare Workers env vars (secret) | ☐ |
| S4 | Three prices created: Starter / Growth / Unlimited | [Stripe → Products](https://dashboard.stripe.com/products) | ☐ |
| S5 | `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_UNLIMITED` set to `price_...` values | Cloudflare Workers env vars | ☐ |
| S6 | Webhook endpoint registered: `https://[domain]/api/webhooks/stripe` | [Stripe → Webhooks](https://dashboard.stripe.com/webhooks) | ☐ |
| S7 | Webhook listens for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` | Stripe webhook config | ☐ |
| S8 | `STRIPE_WEBHOOK_SECRET` is set to `whsec_...` (from webhook signing secret) | Cloudflare Workers env vars (secret) | ☐ |
| S9 | Webhook signature gate configured | `CHECK_STRIPE_WEBHOOK=1 npm run verify:prod` returns `400 MISSING_SIGNATURE` | PASS 2026-06-09 |
| S10 | Billing evidence passes | `npm run billing:evidence` stores JSON/Markdown report | ☐ |

### 2B — Daily.co

| # | Check | Action Required | Done? |
|---|-------|----------------|-------|
| D1 | Daily.co account is active and domain is provisioned | [Daily.co Dashboard](https://dashboard.daily.co) | ☐ |
| D2 | `DAILY_API_KEY` is set | Cloudflare Workers env vars (secret) | ☐ |
| D3 | `DAILY_DOMAIN` is set to `yourcompany.daily.co` | Cloudflare Workers env vars | PASS 2026-06-08 |
| D4 | Test room creation contract is protected and configured | `CHECK_DAILY_ROOM_SMOKE=1 EXPECTED_DAILY_ERROR_CODE=AUTO npm run verify:prod` returns a configured auth/CSRF gate, not provider-missing | PASS 2026-06-09 |
| D5 | Assigned tutor/student receive production Daily room token | Password-session evidence calls `/api/daily/room` for accepted booking | PASS 2026-06-09 |
| D6 | Anion Daily call UI loads in evidence browser | `npm run phase1:evidence` captures visible local video, background switching, join, leave, and rejoin for tutor and student | BLOCKED 2026-06-17 - Google auth users now exist and app-profile provisioning is fixed, but dedicated parent/tutor/student role evidence still has to be captured |
| D7 | Whiteboard sync/reload evidence passes | Authenticated tutor/student draw, realtime sync, reload restored board | PENDING - schema and UI deployed; requires real Google-auth role sessions |

### 2C — Supabase

| # | Check | Action Required | Done? |
|---|-------|----------------|-------|
| SB1 | `NEXT_PUBLIC_SUPABASE_URL` is set | `npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL --name anion-web` (value: `https://aaaextkrfoqomzmjjkxe.supabase.co`) | ☐ |
| SB2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set | `npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --name anion-web` (value: from [Supabase → Settings → API → anon/public key](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/settings/api)) | ☐ |
| SB3 | `SUPABASE_SERVICE_ROLE_KEY` is set | `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name anion-web` (value: from [Supabase -> Settings -> API -> service_role key](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/settings/api)) | PASS 2026-06-14 - refreshed through Supabase CLI and Wrangler |
| SB3b | `SUPABASE_SERVICE_ROLE_KEY` is valid for project `aaaextkrfoqomzmjjkxe` | Service-role admin/API call succeeds without `Invalid API key` | PASS 2026-06-14 - Supabase REST returned HTTP 200 before upload |
| SB3a | Production Worker serves real public Supabase config to browser auth chunks | `npm run build:worker` passes browser bundle guard; `verify:prod` reports `placeholder=no` for lazy auth chunk | PASS 2026-06-09 |
| SB4 | Production domain added to Supabase Auth allow-list | [Supabase → Auth → URL Configuration](https://supabase.com/dashboard/project/aaaextkrfoqomzmjjkxe/auth/url-configuration) | PENDING - mitigated 2026-06-15 by deployed `unalabs.cloud` edge redirect; dashboard/PAT correction still required |
| SB5 | Redirect URL `https://[domain]/auth/callback` is in the allow-list | Same as above | PENDING - `https://anion.unalabs.cloud/auth/callback` is app-generated and bridge-verified, but Supabase allow-list must be confirmed directly |
| SB6 | All current schemas applied to live database (currently through 020) | Check `class_plans`, booking recurring columns, and `whiteboard_events` exist | PASS 2026-06-16 - `20260616_000019_recurring_class_plans.sql` and `20260616_000020_whiteboard_events_mvp.sql` applied with `supabase db query --linked`; migration history still needs cleanup/repair because old local filenames use duplicate date prefixes |
| SB7 | RLS policies verified: profiles, bookings, subscriptions, user_roles | Run `SELECT * FROM pg_policies` | PASS 2026-06-09 for Phase 1 role evidence; profile recursion fixed |

### 2D — Cloudflare

| # | Check | Action Required | Done? |
|---|-------|----------------|-------|
| CF1 | Custom domain configured and DNS propagated | [Cloudflare → Pages → Custom domains](https://dash.cloudflare.com) | ☐ |
| CF2 | SSL/TLS set to Full (Strict) | Cloudflare → SSL/TLS | ☐ |
| CF3 | All env vars and secrets set in Workers environment | Cloudflare → Workers → Settings → Variables | ☐ |
| CF4 | Worker deployment succeeds: `npm run deploy:worker` | Deployment log shows success | PASS 2026-06-16 - Version `46b60191-b129-4165-a6d4-c4260199e906` live |
| CF5 | `/api/health` returns `{"ok":true}` | `curl https://anion.unalabs.cloud/api/health` | ✅ 2026-05-21 — Verified 200 |

---

## Section 3 — Functional Smoke Tests

| # | Check | Expected | Result |
|---|-------|----------|--------|
| 3.1 | `GET https://[domain]/api/health` | `200 { "ok": true }` | ✅ `https://anion.unalabs.cloud/api/health` returns 200 (2026-05-20) |
| 3.2 | `GET https://[domain]/api/status` | `200` with status map | ✅ 2026-05-21 — Verified 200 via `npm run verify:prod` |
| 3.3 | Homepage loads without error | Page renders, no console errors | ✅ 2026-05-21 — Included in post-deploy smoke pass |
| 3.4 | Google OAuth sign-in flow completes | Session established, redirects to role dashboard | PARTIAL 2026-06-17 - Google handoff reaches Google Accounts and auth users are profile-provisioned; full role-dashboard evidence still pending |
| 3.5 | Parent role redirected to `/parent` | Correct dashboard shown | |
| 3.6 | Tutor role redirected to `/tutor` | Correct dashboard shown | |
| 3.7 | Admin role can access `/admin` | Metrics visible | |
| 3.8 | `GET /pricing` loads subscription plans | 3 plans visible with correct prices | ✅ 2026-05-21 — Build/runtime route verification completed |
| 3.9 | Stripe checkout session initiated | Redirects to Stripe-hosted checkout page | |
| 3.10 | Billing portal accessible for active subscriber | Redirects to Stripe billing portal | |
| 3.11 | Tutor booking request accepts/declines | Status updates in DB | |
| 3.12 | Daily.co room created for accepted booking | Assigned tutor/student receive room URL and token; parent direct access denied | PASS for token/room/parent denial 2026-06-09; custom video join/background/leave/rejoin evidence pending |
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
| 5.1 | Privacy Policy is linked from the app footer or sign-up page | Link present and page loads | ⚠️ Placeholder only; legal review pending. |
| 5.2 | Terms of Service are linked from the app | Link present and page loads | ⚠️ Placeholder only; legal review pending. |
| 5.3 | Cookie consent banner (if serving EU/UK users) | Banner shown on first visit | |
| 5.4 | Data deletion contact is documented and reachable | Email in Privacy Policy responds | |
| 5.5 | PRIVACY.md reviewed by legal counsel before launch | Legal sign-off obtained | ❌ Not reviewed. |
| 5.6 | TERMS.md reviewed by legal counsel before launch | Legal sign-off obtained | ❌ Not reviewed. |

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
