# Anion Next 24 Hours Execution Board

This is the canonical execution surface for active Anion production handover work.

Use `CLIENT-HANDOVER.md` for deployment prerequisites and client-facing setup context.
Use `PRODUCTION-READINESS.md` for pass/fail launch controls.

Window: 2026-05-08 to 2026-05-09
Goal: Close external blockers and execute production deployment + signoff.

## Task 1: Provider + Runtime Inputs (Blocker Removal)
- Owner: Client Billing Owner + Provider Ops Owner + Platform Operator
- Priority: P0
- Scope:
  - Set Stripe live keys, price IDs, and webhook secret.
  - Set Daily API key + Daily domain.
  - Set Supabase public + service role keys and production auth allow-list callback.
  - Confirm Cloudflare custom domain + TLS Full (Strict).
- Acceptance criteria:
  - All Section 2 checkboxes in `PRODUCTION-READINESS.md` are marked complete.
  - `npm run preflight:prod` detects all required env vars with no missing keys.
- Run commands:
  - npm run preflight:prod

## Task 2: Production Deploy Gate
- Owner: Platform Operator
- Priority: P0
- Scope:
  - Deploy OpenNext worker to production runtime.
  - Run post-deploy verification checks against production URL.
  - Run optional Stripe webhook reachability and Daily room contract checks.
- Acceptance criteria:
  - `npm run deploy:worker` succeeds.
  - `npm run verify:prod` succeeds with `ANION_BASE_URL` set.
  - Optional checks pass when `CHECK_STRIPE_WEBHOOK=1` and `CHECK_DAILY_ROOM_SMOKE=1` are enabled.
- Run commands:
  - npm run deploy:worker
  - npm run verify:prod

## Task 3: Legal + Trust Gate Completion
- Owner: Client Legal/Counsel + Product Owner
- Priority: P0
- Scope:
  - Replace placeholder legal text in `docs/PRIVACY.md` and `docs/TERMS.md`.
  - Ensure production footer/routes expose privacy + terms links.
  - Confirm support contact mailbox is active and monitored.
- Acceptance criteria:
  - Legal signoff is recorded in `OWNER-SIGNOFF-TEMPLATE.md`.
  - Privacy + terms links are accessible on production domain.

## Task 4: Day-0 Ops Readiness
- Owner: Delivery and Operations lane
- Priority: P1
- Scope:
  - Configure uptime monitoring and Cloudflare/Stripe alert routing.
  - Assign rollback authority and confirm DR owner.
  - Execute Day-0 smoke and publish launch summary.
- Acceptance criteria:
  - `OPERATIONS-CHECKLIST-D0-D1-W1.md` Day-0 section fully checked.
  - Alert ownership and escalation path documented.

## Task 5: Final Go/No-Go Signoff
- Owner: Client Owner (final approver)
- Priority: P0
- Scope:
  - Capture Gate A/B/C/D approvers.
  - Record final GO/NO-GO decision, effective UTC time, and rollback authority.
- Acceptance criteria:
  - `OWNER-SIGNOFF-TEMPLATE.md` fully populated with final launch decision.

## Completion Gate for Next 24 Hours
- External provider/runtime blockers are closed.
- Production deploy + verify completed successfully.
- Legal/trust requirements approved and published.
- Day-0 operations ownership confirmed.
- Formal GO/NO-GO signoff recorded.
