# Anion Test Evidence

## Foundation Validation
- 2026-04-23: `npm --prefix APPS/anion run build` passed after Supabase-backed profile, tutor, and booking adapter changes.
- 2026-04-23: `npm run status:anion:sync` passed from repo root and updated [DOCS/ANION/status/STATUS.md](DOCS/ANION/status/STATUS.md).
- 2026-04-23: `npm --prefix APPS/anion run status:sync` failed due to workspace-relative path assumptions in `scripts/update-anion-status.mjs`.
- 2026-04-23: Path handling fixed in [scripts/update-anion-status.mjs](scripts/update-anion-status.mjs) to auto-detect repo root from any cwd.

## Future Test Lanes
- Tutor discovery smoke
- Booking flow smoke
- Lesson room readiness smoke
- Subscription flow smoke

## RLS Smoke Setup
- SQL smoke file created: [supabase/tests/anion_phase1_rls_smoke.sql](supabase/tests/anion_phase1_rls_smoke.sql)
- Run order: Apply migration `supabase/migrations/202604230003_anion_phase1_rls.sql`.
- Run order: Execute the smoke SQL file against a non-production database.
- Run order: Confirm parent, student, tutor, and admin visibility and booking insert rules.
- 2026-04-23: Attempted linked execution with `npx --yes supabase@latest db query --linked -f supabase/tests/anion_phase1_rls_smoke.sql`.
- 2026-04-23: Blocked by network connectivity to `aws-1-us-east-2.pooler.supabase.com:5432` (connect timeout during temporary login-role initialization).
- 2026-04-23: Immediate rerun command once network restrictions are relaxed: `npx --yes supabase@latest db query --linked -f supabase/tests/anion_phase1_rls_smoke.sql -o table`.
- 2026-04-23: Added automated runner command `npm run test:anion:rls:smoke` (writes run evidence to [DOCS/ANION/status/RLS_SMOKE_LAST_RUN.md](DOCS/ANION/status/RLS_SMOKE_LAST_RUN.md)).
