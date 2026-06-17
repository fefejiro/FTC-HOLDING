# Anion Weekly Status

- Updated at: 2026-06-16T00:00:00.000Z
- Focus: Recurring class plan PR1, one-on-one classroom hardening PR2, whiteboard MVP PR3, and Phase 1 evidence handoff
- Docs: active execution runbook is `ops/PHASE1-CALL-PRODUCTION-CLOSURE.md`
- Web lane: production app is live at https://anion.unalabs.cloud with health check returning 200 OK
- Auth hardening: user-facing login is Google-only, with redirect targets pinned to `/auth/callback` and optional canonical domain fallback via `NEXT_PUBLIC_AUTH_REDIRECT_URL`/`NEXT_PUBLIC_SITE_URL`
- UX quality: login surface updated to premium production styling while preserving smoke-test selectors and fallback/error states
- Build pipeline: `npm run ci:check` passes locally and OpenNext worker artifact generation now succeeds after dependency and tsconfig warning cleanup
- Deployment: worker released to production route `anion.unalabs.cloud`; post-deploy strict `verify:prod` passes with Supabase browser placeholder `no`, Stripe signature gate, and Daily configured-gate smoke.
- 2026-06-16 deploy: recurring class plans, one-on-one classroom hardening,
  runtime whiteboard, and status alignment are deployed in Worker version
  `46b60191-b129-4165-a6d4-c4260199e906`; strict `verify:prod` passed 7/7.
- Phase 1 result: local Daily classroom contract is green for assigned tutor/student call participation, parent call denial, background controls, retry, and rejoin behavior; authenticated production evidence is still pending.
- Supabase service role: Cloudflare Worker `SUPABASE_SERVICE_ROLE_KEY` was replaced from the Supabase CLI project key and validated against Supabase REST on 2026-06-14; it is no longer tracked as a runtime blocker.
- Runtime alignment: live `/api/status` reports `phase: phase1-call-closure-pending-production-evidence`, release `0.2.19`, and only the Stripe subscription-state plus authenticated-video blockers.
- Product trust: public `/privacy` and `/terms` routes are available; legal sign-off still pending
- Recurring classes: admin can create a recurring class plan locally, generating
  the next 8 weeks of accepted bookings with Africa/Lagos time, 50-minute class
  default, and 10-minute buffer conflict checks. Schema and code are deployed;
  real-role recurring-plan verification is still pending.
- One-on-one classroom hardening: Daily room creation now caps rooms to two
  participants, and the room token route blocks joins before the 10-minute
  pre-class window or after class end plus a 15-minute grace period. This is
  deployed; authenticated Google role evidence is still pending.
- Whiteboard MVP: lesson rooms now include a booking-scoped shared canvas with
  pen, eraser, clear board, persisted event replay, and Supabase realtime sync.
  Schema and UI are deployed; tutor/student sync plus reload-restore evidence
  is blocked until real Google-auth role sessions exist.
- Auth evidence blocker: production Supabase currently has zero Google-auth
  users. `phase1:provision-google-qa` stops on the old `example.com` fixture
  accounts because they do not have Google identities.
- Validation: blocker evidence captured in runbook and status artifacts moved to red/non-green state
- Mobile lane: still deferred until a later client-driven scope change
- Governance: overall status remains non-green while critical rows in `ops/PRODUCTION-READINESS.md` are open
