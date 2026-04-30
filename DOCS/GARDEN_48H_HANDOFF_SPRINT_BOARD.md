# Garden Cleaners 48-Hour MVP Handoff Sprint Board

**Date:** 2026-04-29
**Status:** CONTROLLED WALKTHROUGH GO / FULL CLIENT HANDOFF NO-GO


## Current Sprint Status


## Release Checklist (48-Hour MVP)
1. Frontend role-gated MVP UI complete.
2. Build passes when existing Supabase public env vars are supplied in the shell.
3. Dev 2 local shell still lacks env vars, but this is not a product/code blocker.
- [x] Backend/data foundation complete
- [x] Migration file created: supabase/migrations/202604290001_garden_cleaners_portal_mvp.sql
- [x] Playwright tests rerun from correct path against live production domain.
- [x] Supabase migration applied to production.
- [x] Role profiles seeded/confirmed for admin, staff, and customer QA users.
- [x] Final automated E2E passed for public + credentialed portal smoke.
- [x] Production deploy complete.
- [x] API routes for quote-to-job, assignment, status update, staff/customer job visibility
- [x] Frontend role-gated MVP UI implemented
- Controlled walkthrough GO; full client handoff remains NO-GO until owner production account/security approval.
- [x] Build passes with NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in env (Dev 1 verified)
- [x] Seed/confirm role profiles
- [x] Production deploy complete and accessible (`https://9b781a19.gardencleaners.pages.dev`, custom domain `https://gardencleaners.ca`)
- [x] Public (unauthenticated) QA passed
- [x] Credentialed (admin/staff/customer) QA passed
- [x] Admin, staff, and customer seeded visibility flows passed

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

## Handoff Polish Blockers (Final)
- Live QA: PASS (16 total, 14 passed, 0 failed, 2 skipped)
- Portal UI polish: COMPLETE
- Auth email subject/body: COMPLETE (FTC Client Portal)
- Sender display name: OPEN (still shows Una Labs; Supabase default mailer limitation)
- Controlled walkthrough: CONDITIONAL GO pending owner acceptance of sender display-name limitation
- Full handoff: NO-GO until production admin login confirmation and final security/email gate
- Note: Custom SMTP is required before polished final handoff unless owner formally accepts current sender display-name limitation.

Controlled internal testing may continue.

---

## Blockers
- [x] Playwright tests rerun from quoted correct path
- [x] Migration applied to production Supabase
- [x] Seed/confirm role profiles
- [x] Final automated E2E QA passed
- [x] Production deploy complete
- [x] Dev 2 gap audit complete
- [ ] Owner has not created/approved production accounts
- [x] Credentialed portal QA rerun in production
- [ ] Security checks and key rotation not complete
- [ ] Any failed step in release checklist or E2E QA

---

## Production Admin Accounts

- Client owner/admin: `uby400@gmail.com`
- Founder/internal admin: `fejiro.efiuvwere@gmail.com`
- Status: invite/password reset prepared; both users must set their own passwords.
   - Note: fefiuvwere@gmail.com retired/replaced due to email delivery issue. fejiro.efiuvwere@gmail.com is now the founder/internal admin account.
- QA/test accounts must not be used for client handoff.


Full client handoff remains NO-GO until:
- uby400@gmail.com invite/reset accepted
- fejiro.efiuvwere@gmail.com invite/reset accepted
- both admin logins verified
- final security gate complete

Controlled walkthrough can proceed after both account invite/reset flows are ready.

---

## GO/NO-GO Status
**Current:** Controlled walkthrough CONDITIONAL GO pending owner acceptance of the Supabase default-mailer sender display-name limitation. Full client handoff remains NO-GO until both production admins confirm access and final security/email gate is done.

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
