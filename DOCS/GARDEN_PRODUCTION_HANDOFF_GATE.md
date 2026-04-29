
# Garden Cleaners Production Handoff Gate

## Status Summary
1. Frontend role-gated MVP UI complete.
2. Build passes when existing Supabase public env vars are supplied in the shell.
3. Dev 2 local shell still lacks env vars, but this is not a product/code blocker.

## Remaining Blockers
- Playwright tests need to be rerun from quoted correct path.
- Supabase migration has been applied to production.
- Role profiles have been seeded/confirmed for admin, staff, and customer QA users.
- Final E2E must pass.
- Deploy must complete.

## GO/NO-GO
- NO-GO (pending all blockers above)

---

**No secrets or credentials in this document.**

---

## Required Docs/Evidence Before Client Handoff
- GARDEN_CLIENT_PRODUCTION_HANDOFF.md
- GARDEN_CLIENT_ACCESS_PACK.md
- GARDEN_PORTAL_PRODUCTION_BUILD_BOARD.md
- GARDEN_PORTAL_PRODUCTION_GAP_AUDIT.md (must exist and be signed off)
- GARDEN_PRODUCTION_HANDOFF_GATE.md (this doc)
- GARDEN_AUTH_AND_PORTAL_ARCHITECTURE.md
- GARDEN_CREDENTIALED_PORTAL_QA_RESULTS.md
- GARDEN_FINAL_PORTAL_QA_REPORT_2026-04-29.md
- GARDEN_48H_HANDOFF_SPRINT_BOARD.md (single source of truth for MVP handoff)

---

## Required Production Account Setup
- Owner must create and verify all production admin, staff, and customer accounts in Supabase Auth.
- No QA/test credentials may be reused in production.
- All production environment variables must be set and validated.
- Owner must securely store and acknowledge all production credentials.

---

## Required QA Checks
- Credentialed portal QA must be rerun with production accounts and evidence captured.
- All core flows (admin, staff, customer, quote/job) must be tested in production environment.
- QA evidence must be attached to GARDEN_CREDENTIALED_PORTAL_QA_RESULTS.md and GARDEN_FINAL_PORTAL_QA_REPORT_2026-04-29.md.
- Release checklist and E2E QA script in [GARDEN_48H_HANDOFF_SPRINT_BOARD.md](GARDEN_48H_HANDOFF_SPRINT_BOARD.md) must be fully passed.

---

## Required Security Checks
- RLS policies must be reviewed and validated in production.
- Audit logging must be enabled and verified for all sensitive actions.
- No test/QA data or credentials may remain in production.
- Key rotation must be scheduled and completed before final external handoff.

---

## Key Rotation
- Deferred until just before final external handoff, but required for GO.

---


## GO / NO-GO Decision Table (48-Hour MVP)
| Requirement                                 | Status   | Evidence/Doc                                    |
|---------------------------------------------|----------|------------------------------------------------|
| Backend/data foundation complete            | YES      | GARDEN_48H_HANDOFF_SPRINT_BOARD.md             |
| Migration file created                      | YES      | supabase/migrations/202604290001_garden_cleaners_portal_mvp.sql |
| API routes for core flows                   | YES      | GARDEN_48H_HANDOFF_SPRINT_BOARD.md             |
| Frontend role-gated MVP UI implemented      | YES      | GARDEN_48H_HANDOFF_SPRINT_BOARD.md             |
| Build passes with env (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY) | YES | Sprint board / build logs                      |
| Migration applied to production Supabase    | YES      | Applied via Supabase Management API; history recorded |
| Seed/confirm role profiles                  | YES      | Admin/staff/customer QA profiles verified      |
| Playwright tests rerun from correct path    | NO       | Sprint board / test logs                        |
| Release checklist complete                  | NO       | GARDEN_48H_HANDOFF_SPRINT_BOARD.md             |
| E2E QA script fully passed                  | NO       | GARDEN_48H_HANDOFF_SPRINT_BOARD.md             |
| Production deploy complete                  | NO       | Deploy logs / sprint board                      |
| Production build board complete             | YES      | GARDEN_PORTAL_PRODUCTION_BUILD_BOARD.md         |
| Gap audit complete and signed off           | NO       | GARDEN_PORTAL_PRODUCTION_GAP_AUDIT.md           |
| Production account setup complete           | NO       | Owner confirmation                              |
| Credentialed portal QA rerun in production  | NO       | GARDEN_CREDENTIALED_PORTAL_QA_RESULTS.md        |
| Security checks and audit logs verified     | NO       | QA/security review docs                         |
| Key rotation completed                      | NO       | Owner/Dev 1 confirmation                        |
| Owner approval for handoff                  | NO       | Owner signoff                                   |

**Current Status:** NO-GO (remains until Playwright/manual E2E, deploy, and owner approval are complete)

**Blockers:**
- Any incomplete item in release checklist or E2E QA script (see sprint board)
- Dev 2 gap audit not complete or signed off
- Owner has not approved or created production accounts
- Credentialed portal QA not rerun in production
- Security checks and key rotation not complete

---

> Handoff is not approved. All blockers must be resolved and status set to GO before client access is granted. See [GARDEN_48H_HANDOFF_SPRINT_BOARD.md](GARDEN_48H_HANDOFF_SPRINT_BOARD.md) for live status.
