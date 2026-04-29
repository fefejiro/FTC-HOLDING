# Garden Cleaners 48-Hour MVP Handoff Sprint Board

**Date:** 2026-04-29
**Status:** NO-GO (pending blockers below)


## Current Sprint Status


## Release Checklist (48-Hour MVP)
1. Frontend role-gated MVP UI complete.
2. Build passes when existing Supabase public env vars are supplied in the shell.
3. Dev 2 local shell still lacks env vars, but this is not a product/code blocker.
- [x] Backend/data foundation complete
- [x] Migration file created: supabase/migrations/202604290001_garden_cleaners_portal_mvp.sql
- Playwright tests need to be rerun from quoted correct path.
- [x] Supabase migration applied to production.
- [x] Role profiles seeded/confirmed for admin, staff, and customer QA users.
- Final E2E must pass.
- Deploy must complete.
- [x] API routes for quote-to-job, assignment, status update, staff/customer job visibility
- [x] Frontend role-gated MVP UI implemented
- NO-GO (pending blockers above)
- [x] Build passes with NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in env (Dev 1 verified)
- [x] Seed/confirm role profiles
- [ ] Production deploy complete and accessible
- [ ] Public (unauthenticated) QA passed
- [ ] Credentialed (admin/staff/customer) QA passed
- [ ] Admin, staff, and customer lifecycle flows passed

---

## Final E2E QA Script (Executable)
1. **Submit Quote (Customer):**
   - Go to public quote form
   - Fill in required fields and submit
   - Confirm submission acknowledgment
2. **Convert Quote to Job (Admin):**
   - Log in as admin
   - Locate new quote in admin dashboard
   - Convert quote to job record
   - Confirm job record created
3. **Assign Staff (Admin):**
   - In admin dashboard, assign job to staff member
   - Confirm staff assignment is visible
4. **Update Status (Staff):**
   - Log in as assigned staff
   - View assigned job
   - Update job status (e.g., in progress, complete)
   - Confirm status update is saved
5. **View Status (Customer):**
   - Log in as customer
   - View job/request status and timeline
   - Confirm status matches staff/admin updates

---

## Blockers
- [ ] Playwright tests need to be rerun from quoted correct path
- [x] Migration applied to production Supabase
- [x] Seed/confirm role profiles
- [ ] Final E2E QA must pass
- [ ] Production deploy not complete
- [ ] Dev 2 gap audit not complete or signed off
- [ ] Owner has not created/approved production accounts
- [ ] Credentialed portal QA not rerun in production
- [ ] Security checks and key rotation not complete
- [ ] Any failed step in release checklist or E2E QA

---

## GO/NO-GO Status
**Current:** NO-GO (remains until Playwright/manual E2E, deploy, and final owner approval are complete)

---

## Client Walkthrough Script
### What to Show
- Public quote submission and acknowledgment
- Admin dashboard: quote review, conversion to job, staff assignment
- Staff dashboard: assigned jobs, status update
- Customer portal: request/job status and timeline

### What Not to Claim
- Do not claim full production readiness if any checklist item or E2E QA step is incomplete
- Do not claim advanced features (e.g., notifications, reporting) unless live and tested
- Do not claim security review is complete unless all checks are signed off

### Known Limitations
- No production handoff until all blockers are resolved and status is GO
- Key rotation is deferred until just before external handoff
- Some flows may be blocked by missing credentials or unseeded data

---

> This board is the single source of truth for 48-hour MVP handoff readiness. GO/NO-GO is always honest and current. No secrets or passwords included.
