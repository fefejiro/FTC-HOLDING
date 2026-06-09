# Phase 1 â€” Call Production Closure (Strict)

Last updated: 2026-06-09
Owner: anion-live-classroom
Reviewer: anion-qa-release

## Objective

Prove end-to-end lesson call readiness with authenticated evidence for tutor and student:
accepted booking -> lesson access -> Daily room/token -> join -> leave/rejoin.

Parents must be able to see accepted booking context, but they are not live-call participants in the current product rule.

## Preconditions

- One accepted booking exists with linked parent, tutor, and student.
- Test accounts are available for parent visibility plus tutor/student call participation.
- Runtime under test has valid Daily credentials (`DAILY_API_KEY`, `DAILY_DOMAIN`) or blocker is explicitly recorded.
- Evidence is captured by the automated command and linked from this file before marking pass.
- Automated evidence command is available after provider secrets and role emails are confirmed:

```powershell
npm run phase1:evidence
```

Required env vars: `ANION_BASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANION_PHASE1_BOOKING_ID`, `ANION_PARENT_EMAIL`, `ANION_TUTOR_EMAIL`, and `ANION_STUDENT_EMAIL`. Optional: `ANION_ADMIN_EMAIL` for admin dashboard evidence and `ANION_EVIDENCE_POST_CLASSROOM=1` for a controlled classroom-feed write proof.

## Pass Criteria

Phase 1 is PASS only if all required role flows pass:
- Parent can see the accepted booking but is not allowed to join the Daily room.
- Tutor can access lesson and join Daily room.
- Student can access lesson and join Daily room.
- Tutor and student can each leave and rejoin once on the same accepted booking.
- Tutor and student can join the same accepted booking concurrently.
- Tutor writing board, student learning feed, and role dashboards are screenshot-captured.

If any role fails, Phase 1 is FAIL and blocker owner must be assigned.

## Execution Checklist

### 1) Parent Visibility Flow

- [ ] Sign in as parent.
- [ ] Confirm accepted booking is visible on parent surface.
- [ ] Confirm parent UI does not present call participation as an allowed action.
- [ ] Verify direct lesson-route access redirects or denies access.
- [ ] Verify direct Daily room token request returns `403 LESSON_ACCESS_DENIED`.

### 2) Tutor Flow

- [ ] Sign in as tutor.
- [ ] Confirm accepted booking is visible on tutor surface.
- [ ] Navigate to lesson route (`/lesson/{bookingId}`).
- [ ] Verify access granted.
- [ ] Verify Daily room token request succeeds.
- [ ] Verify join succeeds.
- [ ] Leave lesson and rejoin once.

### 3) Student Flow

- [ ] Sign in as student.
- [ ] Confirm accepted booking is visible on student surface.
- [ ] Navigate to lesson route (`/lesson/{bookingId}`).
- [ ] Verify accepted-booking access policy passes.
- [ ] Verify Daily room token request succeeds.
- [ ] Verify join succeeds.
- [ ] Leave lesson and rejoin once.

## Evidence Table

| Role | Booking ID | Lesson Route | Token/Room Result | Join Result | Leave/Rejoin Result | Request IDs | Timestamp | Notes |
|---|---|---|---|---|---|---|---|---|
| Parent visibility | 63404ecd-6b16-4466-bb15-745208cab970 | denied/redirected to `/parent` | `403 LESSON_ACCESS_DENIED` | n/a | n/a | n/a | 2026-06-09 | PASS in `ops/evidence/phase1-password-evidence-2026-06-09T1835Z/phase1-password-evidence.md`; parent dashboard and call denial verified. |
| Tutor | 63404ecd-6b16-4466-bb15-745208cab970 | `/lesson/63404ecd-6b16-4466-bb15-745208cab970` renders lesson context | `200`, room `anion-63404ecd-6b16-4466-bb15-745208cab970`, token present | blocked by evidence-machine access to `https://c.daily.co` | blocked | n/a | 2026-06-09 | Daily API token proof passes after Daily plan fallback; hosted Daily call UI assets reset/time out from this machine, so iframe join is not yet proven. |
| Student | 63404ecd-6b16-4466-bb15-745208cab970 | `/lesson/63404ecd-6b16-4466-bb15-745208cab970` renders lesson context | `200`, room `anion-63404ecd-6b16-4466-bb15-745208cab970`, token present | blocked by evidence-machine access to `https://c.daily.co` | blocked | n/a | 2026-06-09 | Daily API token proof passes after Daily plan fallback; hosted Daily call UI assets reset/time out from this machine, so iframe join is not yet proven. |

## Failure Classification

| Failure | Type | Owner | Blocking? | Fix PR/Commit | Notes |
|---|---|---|---|---|---|
| AUTH_PROVISIONING_ACCESS_MISSING | External auth provisioning access | Client/Ops | No | fixed in-session | Resolved in this cycle: valid `SUPABASE_API_TOKEN` supplied, project API keys retrieved, and parent/tutor/student users created via Auth Admin API |
| AUTH_REDIRECT_DOMAIN_MISMATCH | Runtime auth routing/config | Web/Ops | No | 0.2.10 + 0.2.12 | Callback hardening deployed; production callback sanity now redirects on `anion.unalabs.cloud`. Remaining Phase 1 blocker is authenticated role journey evidence, not callback-domain mismatch |
| PARENT_CALL_PARTICIPATION_RULE | Product access rule | Web/Product | No | working tree | Parent call participation removed from current success criteria. Parent visibility remains required; Daily room access is restricted to assigned tutor and student. |
| DAILY_KEYS_UNVERIFIED | External runtime config | Client/Ops | No | fixed in-session | 2026-06-08 Cloudflare Worker `anion-web` secret inventory includes Daily API key/domain. Daily evidence still waits on authenticated role flow, not provider setup. |
| M1_SETUP_ROLE_MATRIX_DEFECT | Code defect (fixed) | Web/Ops | No | working tree | `scripts/m1-complete-setup.ts` now provisions parent+tutor+student and creates auth users via `auth/v1/admin/users` (deprecated management endpoint removed) |
| BOOKING_SCHEMA_DRIFT_STUDENT_ID_MISSING | Production schema drift | Ops/DB | No | fixed in-session | `public.bookings.student_id` column + index added in production; accepted booking `63404ecd-6b16-4466-bb15-745208cab970` updated with student assignment |
| PROVIDER_SECRETS_MISSING | External runtime config | Client/Ops | No | fixed in-session | 2026-06-08 `prod:doctor` confirms Cloudflare Worker `anion-web` has Supabase, Daily, and Stripe provider secrets. |
| SUPABASE_PUBLIC_BUNDLE_PLACEHOLDER | Build/runtime config | Web/Ops | No | 0.2.15 | 2026-06-09 fixed in production. `verify:prod` reports lazy auth chunk `placeholder=no`, `prodUrl=yes`, and callback sanity redirects on `anion.unalabs.cloud`. |
| SUPABASE_SERVICE_ROLE_INVALID | External runtime config | Client/Ops | Yes | pending client secret update | 2026-06-09 one-time token-protected fixture repair endpoint returned `Invalid API key` when using Worker `SUPABASE_SERVICE_ROLE_KEY`; the secret name exists but the value is not a valid service role key for project `aaaextkrfoqomzmjjkxe`. |
| PHASE1_DOMAIN_FIXTURE_MISSING | Production data fixture | Ops/DB | No | fixed in production DB | 2026-06-09 parent/tutor/student profiles, roles, domain rows, parent-student link, and accepted booking were repaired via production DB connection. Password-session evidence now reaches dashboards and Daily token API. |
| NON_RECURSIVE_RLS_REQUIRED | Production RLS defect | Ops/DB | No | `20260609_000018_non_recursive_role_rls.sql` | Production RLS had enabled tables without complete policies and recursive profile policies. Fixed with non-recursive helper functions and role/domain policies. |
| DAILY_RECORDING_PLAN_LIMIT | Provider plan limit | Daily/Ops | No | 0.2.17 | Daily rejected `enable_recording: "cloud"` on the current plan. Room creation now retries without cloud recording so video can still work. |
| DAILY_CALL_UI_CDN_UNREACHABLE | Evidence-machine network/provider CDN reachability | Network/Ops | Yes | pending network/browser proof | Daily API works and `anion.daily.co` works, but `https://c.daily.co` timed out/reset from the evidence machine, leaving iframe join stuck at Connecting. Need a network/browser that can load Daily hosted call UI assets to prove join/leave/rejoin. |
| EVIDENCE_RUNNER_WEAK_ASSERTIONS | Tooling defect | Web/Ops | No | working tree | 2026-06-08 evidence runner hardened to fail closed on sign-in, assert dashboard surfaces, capture direct Daily token proof, prove concurrent tutor/student join, and write JSON plus Markdown reports. |

## Phase 1 Verdict

- Verdict: [ ] PASS [x] FAIL
- Date: 2026-06-09
- Decider: anion-live-classroom (execution), anion-qa-release (pending review)
- Summary: Local Daily classroom implementation, API contract tests, and local video tests are green. Production health/status are reachable, callback routing is production-domain safe, public browser config is fixed, production RLS/domain fixture is repaired, parent denial passes, and tutor/student Daily token issuance passes. Phase 1 remains FAIL because full Daily iframe join/leave/rejoin cannot be proven from this evidence machine while `https://c.daily.co` is unreachable, and Stripe billing evidence remains blocked by invalid Worker `SUPABASE_SERVICE_ROLE_KEY`.

## Same-day Truth Alignment Required

When Phase 1 evidence is updated, update all of these the same day:
- `app/api/status/route.ts`
- `ops/status-summary.json`
- `ops/weekly-status.md`
- `ops/release-log.md`
- `ops/ROADMAP.md`
- `AGENTS.md`
- `README.md`

No document or endpoint should claim overall green while critical blockers in `ops/PRODUCTION-READINESS.md` remain open.
