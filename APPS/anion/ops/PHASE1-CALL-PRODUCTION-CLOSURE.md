# Phase 1 â€” Call Production Closure (Strict)

Last updated: 2026-06-16
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

If the service-role key is unavailable, use the manual Google-auth evidence path:

```powershell
npm run phase1:evidence:manual
```

This opens headed browser contexts for real parent, tutor, and student Google sign-in, stores reusable Playwright auth states under `test-results/phase1-auth-states/`, and then runs the same strict parent denial, tutor/student video, background, leave/rejoin, and concurrent-join checks. This mode does not mark Phase 1 green unless the role journeys pass.

## Pass Criteria

Phase 1 is PASS only if all required role flows pass:
- Parent can see the accepted booking but is not allowed to join the Daily room.
- Tutor can access lesson and join Daily room.
- Student can access lesson and join Daily room.
- Tutor and student can each leave and rejoin once on the same accepted booking.
- Tutor and student can join the same accepted booking concurrently.
- Tutor writing board, student learning feed, visible video surface, background switching, and role dashboards are screenshot-captured.

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
| Tutor | 63404ecd-6b16-4466-bb15-745208cab970 | pending rerun | token proof previously passed | pending custom call UI evidence | pending | n/a | 2026-06-14 | Lesson room now uses Anion first-party Daily call UI and evidence runner checks visible video plus background switching; production role env was not available in this shell to rerun full evidence. |
| Student | 63404ecd-6b16-4466-bb15-745208cab970 | pending rerun | token proof previously passed | pending custom call UI evidence | pending | n/a | 2026-06-14 | Lesson room now uses Anion first-party Daily call UI and evidence runner checks visible video plus background switching; production role env was not available in this shell to rerun full evidence. |
| System | fresh QA booking attempt | n/a | n/a | blocked before evidence run | n/a | n/a | 2026-06-16 | PR1/PR2/PR3 deployed in Worker version `46b60191-b129-4165-a6d4-c4260199e906`; `verify:prod` passed 7/7. `phase1:provision-google-qa` could not create a fresh evidence booking because the resolved parent/tutor/student fixture users are `example.com` auth users with no Google identity. Production Supabase currently has zero Google-auth users, so real Google role sign-in is the blocker. |

## Failure Classification

| Failure | Type | Owner | Blocking? | Fix PR/Commit | Notes |
|---|---|---|---|---|---|
| AUTH_PROVISIONING_ACCESS_MISSING | External auth provisioning access | Client/Ops | No | fixed in-session | Resolved in this cycle: valid `SUPABASE_API_TOKEN` supplied, project API keys retrieved, and parent/tutor/student users created via Auth Admin API |
| AUTH_REDIRECT_DOMAIN_MISMATCH | Runtime auth routing/config | Web/Ops | No | 0.2.10 + 0.2.12 + ftc-site edge redirect | Callback hardening deployed; production callback sanity now redirects on `anion.unalabs.cloud`. 2026-06-15: deployed a root/auth-callback OAuth payload redirect on the live `unalabs.cloud` Pages project so accidental `https://unalabs.cloud/?code=...` callbacks return `307` to `https://anion.unalabs.cloud/auth/callback` before rendering Una Labs; browser proof with a dummy code reached Anion and failed only at code exchange. Supabase Auth URL configuration should still be corrected through the dashboard or Management API when a Management PAT is available. Remaining Phase 1 blocker is authenticated role journey evidence, not callback-domain mismatch. |
| PARENT_CALL_PARTICIPATION_RULE | Product access rule | Web/Product | No | working tree | Parent call participation removed from current success criteria. Parent visibility remains required; Daily room access is restricted to assigned tutor and student. |
| DAILY_KEYS_UNVERIFIED | External runtime config | Client/Ops | No | fixed in-session | 2026-06-08 Cloudflare Worker `anion-web` secret inventory includes Daily API key/domain. Daily evidence still waits on authenticated role flow, not provider setup. |
| M1_SETUP_ROLE_MATRIX_DEFECT | Code defect (fixed) | Web/Ops | No | working tree | `scripts/m1-complete-setup.ts` now provisions parent+tutor+student and creates auth users via `auth/v1/admin/users` (deprecated management endpoint removed) |
| BOOKING_SCHEMA_DRIFT_STUDENT_ID_MISSING | Production schema drift | Ops/DB | No | fixed in-session | `public.bookings.student_id` column + index added in production; accepted booking `63404ecd-6b16-4466-bb15-745208cab970` updated with student assignment |
| PROVIDER_SECRETS_MISSING | External runtime config | Client/Ops | No | fixed in-session | 2026-06-08 `prod:doctor` confirms Cloudflare Worker `anion-web` has Supabase, Daily, and Stripe provider secrets. |
| SUPABASE_PUBLIC_BUNDLE_PLACEHOLDER | Build/runtime config | Web/Ops | No | 0.2.15 | 2026-06-09 fixed in production. `verify:prod` reports lazy auth chunk `placeholder=no`, `prodUrl=yes`, and callback sanity redirects on `anion.unalabs.cloud`. |
| SUPABASE_SERVICE_ROLE_INVALID | External runtime config | Client/Ops | No | 0.2.19 | Resolved 2026-06-14: project service_role key was retrieved through Supabase CLI, validated against Supabase REST with HTTP 200, and uploaded to Cloudflare Worker secret `SUPABASE_SERVICE_ROLE_KEY`. |
| PHASE1_DOMAIN_FIXTURE_MISSING | Production data fixture | Ops/DB | No | fixed in production DB | 2026-06-09 parent/tutor/student profiles, roles, domain rows, parent-student link, and accepted booking were repaired via production DB connection. Password-session evidence now reaches dashboards and Daily token API. |
| NON_RECURSIVE_RLS_REQUIRED | Production RLS defect | Ops/DB | No | `20260609_000018_non_recursive_role_rls.sql` | Production RLS had enabled tables without complete policies and recursive profile policies. Fixed with non-recursive helper functions and role/domain policies. |
| DAILY_RECORDING_PLAN_LIMIT | Provider plan limit | Daily/Ops | No | 0.2.17 | Daily rejected `enable_recording: "cloud"` on the current plan. Room creation now retries without cloud recording so video can still work. |
| DAILY_CALL_UI_CDN_UNREACHABLE | Evidence-machine network/provider CDN reachability | Web/Ops | No | 0.2.18 | Mitigated by replacing the hosted Daily prebuilt iframe with an Anion first-party Daily call-object UI, so the lesson surface no longer depends on `https://c.daily.co` call UI assets. |
| PHASE1_AUTHENTICATED_VIDEO_EVIDENCE_PENDING | Evidence gap | QA/Ops | Yes | pending role evidence run | `npm run phase1:evidence` now checks visible video, background switching, leave/rejoin, and concurrent tutor/student join. `npm run phase1:evidence:manual` can collect the same proof through real Google-auth sessions when service-role secrets are unavailable. 2026-06-16 `phase1:provision-google-qa` stopped because the resolved fixture users have no Google identity; production Supabase has zero Google-auth users. Dedicated parent, tutor, and student accounts must complete real Google OAuth once before provisioning and evidence can pass. |
| WHITEBOARD_PRODUCTION_EVIDENCE_PENDING | Evidence gap | QA/Ops | Yes | pending role evidence run | PR3 schema and UI are deployed, but tutor/student realtime drawing and reload-restore proof cannot be captured until real Google-auth tutor/student sessions exist. |
| EVIDENCE_RUNNER_WEAK_ASSERTIONS | Tooling defect | Web/Ops | No | working tree | 2026-06-08 evidence runner hardened to fail closed on sign-in, assert dashboard surfaces, capture direct Daily token proof, prove concurrent tutor/student join, and write JSON plus Markdown reports. |

## Phase 1 Verdict

- Verdict: [ ] PASS [x] FAIL
- Date: 2026-06-09
- Decider: anion-live-classroom (execution), anion-qa-release (pending review)
- Summary: Local Daily classroom implementation, API contract tests, local video tests, recurring plan engine, one-on-one room hardening, and whiteboard MVP are green. Production health/status are reachable, callback routing is production-domain safe, public browser config is fixed, production RLS/domain fixture is repaired, parent denial passes, tutor/student Daily token issuance previously passed, and Worker version `46b60191-b129-4165-a6d4-c4260199e906` is live. The lesson room now uses Anion's first-party Daily call UI, two-person room caps, join-window enforcement, and the deployed whiteboard canvas. Phase 1 remains FAIL until real Google-auth parent/tutor/student accounts exist and authenticated tutor/student join, leave, rejoin, concurrent join, whiteboard sync/reload, and Stripe billing evidence are captured.

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
