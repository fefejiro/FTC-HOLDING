# Anion Status

## Snapshot

<!-- AUTO:ANION_SNAPSHOT:START -->
- Updated at: 2026-05-21T17:12:00.000Z
- Overall: red
- Stage: phase1-call-closure-pending-auth-evidence
- Summary: Production runtime is live, verified, and newly deployed with callback-domain hardening and premium login UX. Phase 1 remains non-green because authenticated parent/tutor/student call journey evidence is still pending behind external configuration and confirmed role test-credential gates. Privacy/Terms legal review also remains open.
<!-- AUTO:ANION_SNAPSHOT:END -->

## Metrics

<!-- AUTO:ANION_METRICS:START -->
| Metric | Value | Status | Detail |
|---|---|---|---|
| Docs | ready | green | Product, architecture, ADR, status docs, CLIENT-HANDOVER.md, PRIVACY.md, TERMS.md, DISASTER-RECOVERY.md, MONITORING-ALERTS.md, and PRODUCTION-READINESS.md are in place. |
| Web Lane | deployed-and-verified-pending-role-journey-evidence | yellow | Core milestones are deployed and runtime probes pass in production; authenticated role journey evidence remains pending. |
| Database | 17-migrations-applied | green | All seventeen migrations applied to live Supabase project (foundation, auth-rls, bookings, subscriptions, security hardening, webhook events, classroom posts, student booking access, parent-student link RLS, parent linked-student visibility, booking student assignment, related profile visibility, tutor assigned-student visibility, parent-name visibility for related users, tutor-name visibility for families, classroom post student scoping, classroom post parent and admin timeline access). |
| Live Runtime | live-verified-phase1-open | yellow | Production health/status/auth-callback probes pass and worker deployment is current; authenticated role journeys are pending manual evidence runs. |
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
| Production readiness | red | Phase 1 authenticated call evidence is currently FAIL and critical go-live rows remain open in ops/PRODUCTION-READINESS.md. |
| Phase 1 call closure | red | Runtime callback hardening is deployed, but authenticated parent/tutor/student join and leave/rejoin evidence is still pending confirmed role test credentials. |
<!-- AUTO:ANION_CHECKS:END -->

## Connections

<!-- AUTO:ANION_CONNECTIONS:START -->
| Connection | Status | URL | Detail |
|---|---|---|---|
| Supabase | green | https://aaaextkrfoqomzmjjkxe.supabase.co | Live project, all migrations applied. |
<!-- AUTO:ANION_CONNECTIONS:END -->

## Logs

<!-- AUTO:ANION_LOGS:START -->
- Weekly status: APPS/anion/ops/weekly-status.md
- Release log: APPS/anion/ops/release-log.md
- Test evidence: DOCS/ANION/status/TEST_EVIDENCE.md
<!-- AUTO:ANION_LOGS:END -->

## Next Actions

<!-- AUTO:ANION_NEXT_ACTIONS:START -->
- Confirm Supabase Auth allow-list includes https://anion.unalabs.cloud/auth/callback and current production domain entries.
- Provision and confirm production parent/tutor/student role test credentials, then execute authenticated Phase 1 lesson journeys.
- Capture parent/tutor/student join and leave/rejoin evidence in ops/PHASE1-CALL-PRODUCTION-CLOSURE.md and flip verdict only after all role paths pass.
- Complete PRODUCTION-READINESS.md external blocker checklist (Stripe live keys/prices/webhook, Daily API key/domain, Supabase auth entries).
- Obtain legal review and sign-off on docs/PRIVACY.md and docs/TERMS.md before formal publication approval.
- Configure uptime monitor for /api/health endpoint (see MONITORING-ALERTS.md Setup Guide).
- Run quarterly disaster recovery test and update DISASTER-RECOVERY.md test log.
<!-- AUTO:ANION_NEXT_ACTIONS:END -->
