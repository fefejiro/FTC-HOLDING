# Anion Weekly Status

- Updated at: 2026-05-26T14:30:00.000Z
- Focus: Phase 1 call production closure execution and hard-blocker documentation
- Docs: active execution runbook is `ops/PHASE1-CALL-PRODUCTION-CLOSURE.md`
- Web lane: production app is live at https://anion.unalabs.cloud with health check returning 200 OK
- Auth hardening: login flow now supports both magic-link and Google, with redirect targets pinned to `/auth/callback` and optional canonical domain fallback via `NEXT_PUBLIC_AUTH_REDIRECT_URL`/`NEXT_PUBLIC_SITE_URL`
- UX quality: login surface updated to premium production styling while preserving smoke-test selectors and fallback/error states
- Build pipeline: `npm run ci:check` passes locally and OpenNext worker artifact generation now succeeds after dependency and tsconfig warning cleanup
- Deployment: worker released to production route `anion.unalabs.cloud`; post-deploy `verify:prod` passed 6/6 (health/status/auth-callback + optional Stripe/Daily smoke contracts)
- Phase 1 result: local Daily classroom contract is green for assigned tutor/student call participation, parent call denial, retry, and rejoin behavior; authenticated production evidence is still pending because confirmed role test credentials and external config gates remain open.
- Runtime alignment: local `/api/status` now reports `phase: phase1-call-closure-pending-production-evidence`; production status should be updated only after deploy.
- Product trust: public `/privacy` and `/terms` routes are available; legal sign-off still pending
- Validation: blocker evidence captured in runbook and status artifacts moved to red/non-green state
- Mobile lane: still deferred until a later client-driven scope change
- Governance: overall status remains non-green while critical rows in `ops/PRODUCTION-READINESS.md` are open
