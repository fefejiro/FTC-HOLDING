# M1 Closure + Client Handover — Minimal Viability Checklist

**Target State:** Auth-gated app with role routing and dashboards ready for client use.  
**Scope:** M0 + M1 only. M2-M5 deferred to Phase 2.  
**Last Updated:** 2026-05-21

---

## Why M1-Only for Initial Handover?

**Rationale:**
- Proves foundational auth/SSR architecture is production-stable
- Lets client use app for admin/tutor/parent role setup and testing
- Stripe (M3) and Daily (M4) can be configured after client validation
- Booking flow (M2) can follow once roles are verified in production

**M2-M5 path:** Triggered once client confirms M1 is stable (target: 1 week)

---

## Phase 1 — Close M1: Verify Auth & RLS (Today)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1.1 | Apply Supabase migrations (17 files) to production | You | ☐ |
| 1.2 | Enable RLS policies on all M1 tables (`profiles`, `user_roles`, `bookings`, `subscriptions`) | You | ☐ |
| 1.3 | Test auth flow end-to-end: signup → magic-link → callback → dashboard | You | ☐ |
| 1.4 | Verify role routing: parent → /parent, tutor → /tutor, admin → /admin | You | ☐ |
| 1.5 | Confirm no console errors or unhandled rejections in all role dashboards | You | ☐ |
| 1.6 | Test cross-browser (Chrome, Firefox, Safari) if possible; mobile (iPhone/Android) | You | ☐ |
| 1.7 | Document all env vars & secrets that are NOW set (for client comms) | You | ☐ |

---

## Phase 2 — Production Deploy & Validation (Today)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 2.1 | `npm run build` succeeds; bundle size OK | You | ✅ Done |
| 2.2 | `npx tsc --noEmit` passes (0 errors) | You | ✅ Done |
| 2.3 | Deploy to Cloudflare Workers: `npm run deploy:worker` | You | ☐ |
| 2.4 | Verify `/api/health` returns 200 on production URL | You | ✅ Existing: `https://anion.unalabs.cloud/api/health` |
| 2.5 | Test production auth callback: sign up with test email, verify magic-link works | You | ☐ |
| 2.6 | Confirm production Supabase project URL in `wrangler.jsonc` is correct | You | ☐ |
| 2.7 | Verify NO test/staging keys leaked in git (scan for `pk_test`, `sk_test`, `service_role` patterns) | You | ☐ |

---

## Phase 3 — Client Handover Prep (Today)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 3.1 | Create [CLIENT-HANDOVER.md](./CLIENT-HANDOVER.md) with: app URL, login instructions, role descriptions | You | ☐ |
| 3.2 | Provide client with: test parent email, test tutor email, instructions to create passwords | You | ☐ |
| 3.3 | Document known limitations (M2 booking, M3 billing, M4 video not yet live) | You | ☐ |
| 3.4 | Schedule 30-min client walkthrough: homepage → login → dashboard navigation | You | ☐ |
| 3.5 | Capture client sign-off: "M1 works as expected for my initial setup" | You | ☐ |

---

## Phase 4 — Operations & Monitoring (Post-Handover)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 4.1 | Set up Cloudflare error notifications (email on Worker 500s) | You | ☐ |
| 4.2 | Set up Supabase backup alerts (daily check) | You | ☐ |
| 4.3 | Document incident playbook: what to do if auth breaks | You | ☐ |
| 4.4 | Create status page or status dashboard link for client | You | ☐ |

---

## M2-M5 Path Forward (Phase 2 — Next Week)

Once client confirms M1 is stable:

1. **M2 Booking System** (3-5 days)
   - Tutor discovery UI
   - Booking request + acceptance flow
   - Tutor/parent notifications

2. **M3 Billing** (3-5 days)
   - Stripe product & pricing setup
   - Checkout session wiring
   - Subscription state in Supabase

3. **M4 Live Classroom** (5-7 days)
   - Daily.co room provisioning
   - Join flow from booked lesson
   - Session recording config

4. **M5 Stabilization** (3-5 days)
   - Operator dashboard
   - E2E smoke tests
   - Release readiness gates

---

## Sign-off

| Role | Name | Date | Status |
|------|------|------|--------|
| Dev Lead | (You) | | |
| Client | (awaiting) | | |

---

**Next Step:** Complete Phase 1 today. Report back on any blockers.
