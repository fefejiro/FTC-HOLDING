# Anion Next 24 Hours Execution Board

This is the canonical execution surface for active Anion production handover work.

Use `CLIENT-HANDOVER.md` for deployment prerequisites and client-facing setup context.
Use `PRODUCTION-READINESS.md` for pass/fail launch controls.

Window: refreshed 2026-06-08
Goal: Close external blockers, execute authenticated role evidence, and reach production handover signoff.

## Current Production Doctor Snapshot

Command:

```powershell
npm run prod:doctor
```

Result on 2026-06-08:

- Production `/api/health`: PASS.
- Production `/api/status`: PASS, phase `phase1-call-closure-pending-production-evidence`.
- Cloudflare Worker `anion-web` secret inventory: PASS, 3 secrets visible.
- Supabase auth/data secrets: PASS.
- Daily video classroom: BLOCKED, missing `DAILY_API_KEY` and `DAILY_DOMAIN`.
- Stripe billing: BLOCKED, missing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, and `STRIPE_PRICE_UNLIMITED`.

Do not mark Anion handover-green until `prod:doctor` passes and the authenticated parent/tutor/student role journey evidence is captured in `PHASE1-CALL-PRODUCTION-CLOSURE.md`.

## Task 1: Provider + Runtime Inputs (Blocker Removal)
- Owner: Client Billing Owner + Provider Ops Owner + Platform Operator
- Priority: P0
- Scope:
  - Set Stripe test-mode keys, price IDs, and webhook secret for handover evidence.
  - Set Daily API key + Daily domain.
  - Set Supabase public + service role keys and production auth allow-list callback.
  - Confirm Cloudflare custom domain + TLS Full (Strict).
- Acceptance criteria:
  - All Section 2 checkboxes in `PRODUCTION-READINESS.md` are marked complete.
  - `npm run prod:doctor` passes with no blocker rows.
  - `npm run preflight:prod` detects all required env vars with no missing keys.
- Run commands:
  - npm run prod:doctor
  - npm run preflight:prod

## Task 2: Production Deploy Gate
- Owner: Platform Operator
- Priority: P0
- Scope:
  - Deploy OpenNext worker to production runtime.
  - Run post-deploy verification checks against production URL.
  - Run optional Stripe webhook signature-gate and Daily room contract checks.
- Acceptance criteria:
  - `npm run deploy:worker` succeeds.
  - `npm run verify:prod` succeeds with `ANION_BASE_URL` set.
  - Optional checks pass when `CHECK_STRIPE_WEBHOOK=1` and `CHECK_DAILY_ROOM_SMOKE=1` are enabled.
  - Stripe optional check returns `400 MISSING_SIGNATURE`, not `WEBHOOK_NOT_CONFIGURED`.
- Run commands:
  - npm run deploy:worker
  - npm run verify:prod

## Task 2B: Authenticated Video-Call Evidence
- Owner: Platform Operator + Client Test Account Owner
- Priority: P0
- Scope:
  - Confirm parent, tutor, and student credentials are valid in production.
  - Confirm one accepted booking links the same parent, tutor, and student.
  - Capture parent booking visibility and parent call denial.
  - Capture tutor Daily join, leave, and rejoin.
  - Capture student Daily join, leave, and rejoin.
- Acceptance criteria:
  - `PHASE1-CALL-PRODUCTION-CLOSURE.md` evidence table has current request IDs/timestamps for all role paths.
  - `/api/status` phase is updated only after evidence passes and the worker is redeployed.
- Run commands:
  - npm run phase1:evidence

## Task 2C: Stripe Billing Evidence
- Owner: Platform Operator + Client Billing Owner
- Priority: P0
- Scope:
  - Prove app checkout session creation against Stripe test mode.
  - Prove Stripe-hosted Checkout page opens.
  - Prove production webhook accepts a valid signed Stripe event.
  - Prove subscription sync is visible in Supabase.
  - Prove billing portal session creation for the parent account.
- Acceptance criteria:
  - `npm run billing:evidence` passes and stores JSON/Markdown evidence under `test-results/`.
  - Admin subscription metrics are captured in handover screenshots.
- Run commands:
  - npm run billing:evidence

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
