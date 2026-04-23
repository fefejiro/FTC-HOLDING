# Anion Status

## Snapshot

<!-- AUTO:ANION_SNAPSHOT:START -->
- Updated at: 2026-04-23T23:59:30.000Z
- Overall: yellow
- Stage: foundation
- Summary: Foundation slice now includes Supabase-backed profile/tutor/booking adapters plus baseline owner-scoped RLS migration, with demo fallback still available.
<!-- AUTO:ANION_SNAPSHOT:END -->

## Metrics

<!-- AUTO:ANION_METRICS:START -->
| Metric | Value | Status | Detail |
|---|---|---|---|
| Docs | ready | green | Product, architecture, ADR, and status docs are in place. |
| Web Shell | functional foundation | green | Web shell now renders concrete Phase 1 surfaces for auth roles, discovery, bookings, and profile setup. |
| Mobile Shell | scaffolded | green | React Native structure exists with TODO-backed screen stubs. |
| Phase 1 foundation flows | implemented | green | Role switching, tutor discovery, booking request state, and parent/student setup are wired with shared seed contracts. |
| Auth scaffolding | supabase-ready | green | Shared auth and Supabase clients now support Vite envs, magic-link session scaffolding, and demo-mode fallback. |
| Data persistence | supabase-backed with fallback | green | Current user profile bundle, tutor discovery, and booking read/write now query Supabase first and fall back to seed data. |
| RLS baseline | defined in migration | yellow | Anion profile, role, student, parent, tutor, link, and booking tables now have owner-scoped policy definitions in SQL migration 202604230003. |
| Live Runtime | pending | yellow | No live deployment or telemetry feed yet. |
<!-- AUTO:ANION_METRICS:END -->

## Checks

<!-- AUTO:ANION_CHECKS:START -->
| Check | Status | Detail |
|---|---|---|
| Governance wrapper skill | green | Repo-level project governance skill exists and can be reused on future scaffolds. |
| Status sync contract | green | Repo sync script and master snapshot placeholder are part of the foundation scope. |
| Implementation readiness | green | Phase 1 foundation flows compile and render, and Supabase-backed reads/writes are now wired with fallback behavior. |
| Build validation | green | `npm run build` passes for APPS/anion after the shared auth integration update. |
<!-- AUTO:ANION_CHECKS:END -->

## Connections

<!-- AUTO:ANION_CONNECTIONS:START -->
| Connection | Status | URL | Detail |
|---|---|---|---|
| Planned web runtime | yellow | https://example.com/health | Replace with Cloudflare Pages health contract when the app is deployed. |
<!-- AUTO:ANION_CONNECTIONS:END -->

## Logs

<!-- AUTO:ANION_LOGS:START -->
- Weekly status: APPS/anion/ops/weekly-status.md
- Release log: APPS/anion/ops/release-log.md
- Test evidence: DOCS/ANION/status/TEST_EVIDENCE.md
<!-- AUTO:ANION_LOGS:END -->

## Next Actions

<!-- AUTO:ANION_NEXT_ACTIONS:START -->
- Apply migration 202604230003 to your Supabase environment and validate RLS behavior with parent/student/tutor test users.
- Remove or reduce demo fallback paths once Supabase test data and auth role onboarding are stable.
- Attach a live status feed and deployed health endpoint.
<!-- AUTO:ANION_NEXT_ACTIONS:END -->
