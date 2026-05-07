# Anion Next 24 Hours Execution Board

This is the canonical execution surface for active Anion work.

Use `CLIENT-HANDOVER.md` for deployment prerequisites and client-facing setup context.
Use `M2-M5-IMPLEMENTATION-PLAN.md` for structured implementation sequencing.

Window: 2026-05-06 to 2026-05-07
Goal: Close M1 hardening and ship one M2 end-to-end vertical slice.

## Task 1: Close M1 Hardening
- Owner: Auth and Platform lane
- Priority: P0
- Scope:
  - Apply RLS policy migration to target Supabase project.
  - Verify authenticated reads on profiles and user_roles with policy-only access.
  - Remove temporary service-role fallback from server auth lookup.
  - Confirm magic-link callback redirect settings for each environment.
- Acceptance criteria:
  - Signed-in user can reach dashboard and role route with no service-role fallback path.
  - Unauthenticated user is redirected to /login from protected routes.
  - Callback error path still redirects to /login?error=auth_callback_failed.
- Run commands:
  - npm run check
  - npm run build

## Task 2: M2 Vertical Slice (Booking Core)
- Owner: Product Web lane
- Priority: P0
- Scope:
  - Tutor list query and filter baseline.
  - Parent creates booking request.
  - Tutor accepts or declines booking.
  - Parent sees booking state transition.
- Acceptance criteria:
  - Booking lifecycle can move from requested to accepted and declined.
  - Parent and tutor role routes show role-scoped booking data only.
  - Data writes and reads are auditable via Supabase rows.
- Run commands:
  - npm run check
  - npm run build

## Task 3: Smoke Automation Baseline
- Owner: QA and Release lane
- Priority: P1
- Scope:
  - Add smoke test coverage for callback login success path.
  - Add smoke test coverage for /dashboard role redirect.
  - Add smoke test coverage for booking create and one state transition.
- Acceptance criteria:
  - Smoke suite runs headless and returns pass or fail with clear failure step.
  - Test evidence is captured in ops artifacts.
- Run commands:
  - npm run check
  - npm run build

## Task 4: Docs and Release Hygiene
- Owner: Delivery and Governance lane
- Priority: P1
- Scope:
  - Update roadmap, status summary, weekly status, and release log with actual state.
  - Add release note delta for M1 hardening closure.
- Acceptance criteria:
  - Status docs match implementation state with no stale milestone labels.
  - Next action list references M2 vertical slice and smoke automation.

## Task 5: Production Readiness Hand-off Closure
- Owner: Delivery and Platform lane
- Priority: P1
- Scope:
  - Complete Supabase production auth allow-list configuration.
  - Confirm Stripe prices and webhook configuration are mapped into runtime env vars.
  - Confirm Daily credentials are set in runtime environment.
  - Run build and deploy workflow once runtime variables are present.
- Acceptance criteria:
  - Sign-up, booking, subscription, lesson join, and admin view are verified in production path.
  - Handover checklist items in `CLIENT-HANDOVER.md` are resolved or explicitly deferred with owner and ETA.

## Completion Gate for Next 24 Hours
- M1 hardening is closed and temporary fallback is removed.
- M2 vertical slice is merged and manually validated in local runtime.
- Smoke automation baseline is operational for auth and booking core.
- Production readiness hand-off dependencies are tracked to closure or explicit defer.
