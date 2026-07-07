# Anion Status

## Snapshot

<!-- AUTO:ANION_SNAPSHOT:START -->
- Updated at: 2026-06-16T00:00:00.000Z
- Overall: red
- Stage: phase1-call-closure-pending-auth-evidence
- Summary: Production runtime is live on Worker version 46b60191-b129-4165-a6d4-c4260199e906. Parent/tutor/student auth, domain roles, linked student, accepted booking, dashboards, parent call denial, and tutor/student Daily token issuance were previously verified. The lesson room now uses Anion's first-party Daily call UI with background controls, two-person Daily room creation, join-window enforcement, and a deployed booking-scoped whiteboard canvas. The recurring class plan and whiteboard schemas were applied directly to production Supabase through migration 020, but Supabase migration history still needs cleanup because older local migration filenames use duplicate date prefixes. Handover is still not green because production has zero Google-auth users, so authenticated video join/background/leave/rejoin evidence, whiteboard sync/reload evidence, Stripe subscription-state evidence, and Privacy/Terms legal signoff remain open.
<!-- AUTO:ANION_SNAPSHOT:END -->

## Metrics

<!-- AUTO:ANION_METRICS:START -->
| Metric | Value | Status | Detail |
|---|---|---|---|
| Docs | ready | green | Product, architecture, ADR, status docs, CLIENT-HANDOVER.md, PRIVACY.md, TERMS.md, DISASTER-RECOVERY.md, MONITORING-ALERTS.md, and PRODUCTION-READINESS.md are in place. |
| Web Lane | deployed-role-journeys-partial | yellow | Core milestones are deployed. Authenticated role dashboards, parent denial, and tutor/student Daily token issuance pass in production; custom Daily video UI evidence still needs an authenticated role run. |
| Database | schema-through-020-applied-history-needs-repair | yellow | Recurring class plan and whiteboard schemas are applied in live Supabase. Supabase migration history is not clean because older Anion migration filenames use duplicate date prefixes; repair before relying on supabase db push. |
| Live Runtime | live-verified-phase1-partial | yellow | Production health/status/auth-callback probes pass and public browser auth config is production-safe. Domain fixture rows and accepted booking are repaired; Worker version 46b60191-b129-4165-a6d4-c4260199e906 is live; authenticated Google evidence and Stripe subscription-state evidence remain blocked. |
| Trust Docs | policy-routes-live-legal-signoff-pending | yellow | Public /privacy and /terms routes plus cookie consent banner are implemented. Final legal review and sign-off are still required before formal publication approval. |
<!-- AUTO:ANION_METRICS:END -->

## Checks

<!-- AUTO:ANION_CHECKS:START -->
| Check | Status | Detail |
|---|---|---|
| TypeScript | green | npx tsc --noEmit passes with zero errors. |
| Next.js build | green | npm run ci:check passes cleanly in APPS/anion. |
| Git commits | green | Ops and handoff docs were updated for M1 closure and production readiness tracking. |
| Client handover | green | ops/CLIENT-HANDOVER.md updated with external blocker checklist for Stripe, Daily, Supabase, and Cloudflare. |
| Privacy & Terms | yellow | docs/PRIVACY.md and docs/TERMS.md created as placeholders. Legal review required before publication. |
| Disaster recovery | green | ops/DISASTER-RECOVERY.md documents RTO/RPO targets, backup strategy, restore runbooks, and incident response. |
| Monitoring & alerts | green | ops/MONITORING-ALERTS.md documents metrics, thresholds, alert routing, and ownership. |
| Production readiness | yellow | prod:doctor confirms required secret names exist. Deployed release 0.2.20 reports authenticated video evidence, whiteboard production evidence, and Stripe subscription-state evidence as runtime blockers. |
| Phase 1 call closure | red | Password-based production evidence proves parent/tutor/student dashboards, linked booking visibility, parent Daily denial, and tutor/student Daily token issuance. PR2 deployed hardening now limits newly created Daily rooms to two participants and blocks joins outside the scheduled window. Full custom video join/background/leave/rejoin evidence is blocked until real Google-auth role users exist. |
| One-on-one classroom hardening | yellow | PR2 is deployed: assigned tutor/student token access, 10-minute pre-class join opening, class end plus 15-minute close window, and two-participant Daily room creation. Authenticated role proof remains pending. |
| Whiteboard MVP | yellow | PR3 is deployed: whiteboard_events schema, lesson-room canvas, pen, eraser, clear board, persisted event replay, and Supabase realtime insert sync. Authenticated tutor/student sync plus reload-restore proof remains pending. |
| Recurring class plans | yellow | PR1 schema and code are deployed: class_plans migration, admin creation form, 8-week accepted booking generation, Africa/Lagos time conversion, and tutor/student buffer conflict checks. Real-role recurring-plan verification remains pending. |
<!-- AUTO:ANION_CHECKS:END -->

## Connections

<!-- AUTO:ANION_CONNECTIONS:START -->
| Connection | Status | URL | Detail |
|---|---|---|---|
| Supabase | green | https://aaaextkrfoqomzmjjkxe.supabase.co | Live project. Schema is applied through recurring class plans and whiteboard events; Supabase migration history cleanup is still recommended. |
<!-- AUTO:ANION_CONNECTIONS:END -->

## Logs

<!-- AUTO:ANION_LOGS:START -->
- Weekly status: APPS/anion/ops/weekly-status.md
- Release log: APPS/anion/ops/release-log.md
- Test evidence: DOCS/ANION/status/TEST_EVIDENCE.md
<!-- AUTO:ANION_LOGS:END -->

## Next Actions

<!-- AUTO:ANION_NEXT_ACTIONS:START -->
- Have dedicated parent, tutor, and student accounts complete real Google OAuth sign-in once on https://anion.unalabs.cloud/login; production currently has zero Google-auth users.
- Use npm run phase1:provision-google-qa after the dedicated parent/tutor/student Google QA accounts have signed in once, then set ANION_PHASE1_BOOKING_ID to the generated accepted booking.
- Verify one admin-created recurring plan against real parent/student/tutor rows and confirm generated bookings across parent, tutor, and student dashboards.
- Verify tutor/student whiteboard sync and reload-restore behavior on one accepted booking.
- Run npm run phase1:evidence with valid service-role and role-account env vars, or npm run phase1:evidence:manual with real Google-auth sessions, to capture tutor/student custom video join, background switching, leave, and rejoin evidence.
- Capture parent/tutor/student join and leave/rejoin evidence in ops/PHASE1-CALL-PRODUCTION-CLOSURE.md and flip verdict only after authenticated role paths pass.
- Keep npm run build:worker bundle guard and CHECK_STRIPE_WEBHOOK=1 CHECK_DAILY_ROOM_SMOKE=1 EXPECTED_DAILY_ERROR_CODE=AUTO npm run verify:prod green before each handover claim.
- Complete PRODUCTION-READINESS.md remaining external checklist rows for authenticated Supabase allow-list confirmation, billing evidence, and role journey evidence.
- Run npm run billing:evidence after Stripe provider settings are available and store the generated JSON/Markdown report.
- Obtain legal review and sign-off on docs/PRIVACY.md and docs/TERMS.md before formal publication approval.
- Configure uptime monitor for /api/health endpoint (see MONITORING-ALERTS.md Setup Guide).
- Run quarterly disaster recovery test and update DISASTER-RECOVERY.md test log.
<!-- AUTO:ANION_NEXT_ACTIONS:END -->
