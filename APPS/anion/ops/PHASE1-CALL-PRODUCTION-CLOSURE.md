# Phase 1 â€” Call Production Closure (Strict)

Last updated: 2026-05-21
Owner: anion-live-classroom
Reviewer: anion-qa-release

## Objective

Prove end-to-end lesson call readiness with authenticated evidence for parent, tutor, and student:
accepted booking -> lesson access -> Daily room/token -> join -> leave/rejoin.

## Preconditions

- One accepted booking exists with linked parent, tutor, and student.
- Test accounts are available for all three roles.
- Runtime under test has valid Daily credentials (`DAILY_API_KEY`, `DAILY_DOMAIN`) or blocker is explicitly recorded.
- Evidence is captured in this file before marking pass.

## Pass Criteria

Phase 1 is PASS only if all role flows pass:
- Parent can access lesson and join Daily room.
- Tutor can access lesson and join Daily room.
- Student can access lesson and join Daily room.
- Each role can leave and rejoin once on the same accepted booking.

If any role fails, Phase 1 is FAIL and blocker owner must be assigned.

## Execution Checklist

### 1) Parent Flow

- [ ] Sign in as parent.
- [ ] Confirm accepted booking is visible on parent surface.
- [ ] Navigate to lesson route (`/lesson/{bookingId}`).
- [ ] Verify access granted (no redirect/denied).
- [ ] Verify Daily room token request succeeds.
- [ ] Verify join succeeds and connected state appears.
- [ ] Leave lesson and rejoin once.

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
| Parent | 63404ecd-6b16-4466-bb15-745208cab970 | `/lesson/63404ecd-6b16-4466-bb15-745208cab970` not reached | not executed (auth session handoff blocked) | failed before join | not executed | n/a | 2026-05-20T17:11:24Z | Parent auth user + domain records were provisioned. **BLOCKER:** Admin-generated magic link redirects to `https://unalabs.cloud` (not `https://anion.unalabs.cloud`), so authenticated Anion session could not be established for live route proof. Daily join/leave evidence blocked. Privacy/Terms legal review pending. |
| Tutor | 63404ecd-6b16-4466-bb15-745208cab970 | `/lesson/63404ecd-6b16-4466-bb15-745208cab970` not reached | not executed (auth session handoff blocked) | failed before join | not executed | n/a | 2026-05-20T17:11:24Z | Tutor auth user + domain records were provisioned. **BLOCKER:** Same redirect-domain handoff issue prevented authenticated tutor runtime evidence in Anion. Daily join/leave evidence blocked. Privacy/Terms legal review pending. |
| Student | 63404ecd-6b16-4466-bb15-745208cab970 | `/lesson/63404ecd-6b16-4466-bb15-745208cab970` not reached | not executed (auth session handoff blocked) | failed before join | not executed | n/a | 2026-05-20T17:11:24Z | Student auth user now provisioned and linked. `bookings.student_id` drift was corrected in production and booking updated, but **BLOCKER:** runtime auth handoff still blocks route/token/join evidence. Daily join/leave evidence blocked. Privacy/Terms legal review pending. |

## Failure Classification

| Failure | Type | Owner | Blocking? | Fix PR/Commit | Notes |
|---|---|---|---|---|---|
| AUTH_PROVISIONING_ACCESS_MISSING | External auth provisioning access | Client/Ops | No | fixed in-session | Resolved in this cycle: valid `SUPABASE_API_TOKEN` supplied, project API keys retrieved, and parent/tutor/student users created via Auth Admin API |
| AUTH_REDIRECT_DOMAIN_MISMATCH | Runtime auth routing/config | Web/Ops | No | 0.2.10 + 0.2.12 | Callback hardening deployed; production callback sanity now redirects on `anion.unalabs.cloud`. Remaining Phase 1 blocker is authenticated role journey evidence, not callback-domain mismatch |
| DAILY_KEYS_UNVERIFIED | External runtime config | Client/Ops | Yes | n/a | Daily token/join/leave/rejoin checks remain blocked behind authenticated role access |
| M1_SETUP_ROLE_MATRIX_DEFECT | Code defect (fixed) | Web/Ops | No | working tree | `scripts/m1-complete-setup.ts` now provisions parent+tutor+student and creates auth users via `auth/v1/admin/users` (deprecated management endpoint removed) |
| BOOKING_SCHEMA_DRIFT_STUDENT_ID_MISSING | Production schema drift | Ops/DB | No | fixed in-session | `public.bookings.student_id` column + index added in production; accepted booking `63404ecd-6b16-4466-bb15-745208cab970` updated with student assignment |

## Phase 1 Verdict

- Verdict: [ ] PASS [x] FAIL
- Date: 2026-05-20
- Decider: anion-live-classroom (execution), anion-qa-release (pending review)
- Summary: Provisioning and booking prerequisites are complete and callback-domain hardening is deployed. Phase 1 remains FAIL because authenticated parent/tutor/student evidence for lesson access, Daily join, and leave/rejoin has not yet been re-run and captured with confirmed role test credentials.

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
