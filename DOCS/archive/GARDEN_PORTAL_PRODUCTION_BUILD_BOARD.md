# Garden Portal Production Build Execution Board

**Date:** 2026-04-29
**Audience:** Founder, Dev, QA

---

## Phase 1: Production Access/Handoff Guardrails
- **Goal:** Ensure all production access is gated, with explicit owner handoff and no test/QA credentials in production.
- **Owner/Dev Lane:** Owner, Dev 1
- **Files/Modules:** Supabase Auth config, .env.production, deployment scripts, DOCS/GARDEN_PORTAL_QA_ACCOUNT_SETUP_RESULT.md
- **Acceptance Criteria:**
  - All production credentials are unique and not reused from QA/test.
  - Owner receives and verifies production admin access.
  - All access/handoff steps are documented and acknowledged.
- **QA Required:** Owner verification of access, no automated QA.
- **Rollback Notes:** Remove/rotate any credentials if test/QA credentials are found in production.

---

## Phase 2: Admin User Management
- **Goal:** Enable admin to manage users, roles, and permissions from the portal.
- **Owner/Dev Lane:** Dev 1, Dev 2
- **Files/Modules:** src/pages/admin, src/components/admin, Supabase RLS policies, admin dashboard modules
- **Acceptance Criteria:**
  - Admin can view, invite, and deactivate users.
  - Role assignment and permission changes are reflected in Supabase.
  - All actions are logged.
- **QA Required:** Manual admin flows, negative tests for permission boundaries.
- **Rollback Notes:** Revert to previous user management state if new flows break access.

---

## Phase 3: Quote-to-Job Pipeline
- **Goal:** Implement full quote submission, review, and conversion to job record.
- **Owner/Dev Lane:** Dev 2, QA
- **Files/Modules:** src/pages/quotes, src/pages/jobs, Supabase tables (quotes, jobs), quote/job service modules
- **Acceptance Criteria:**
  - Quotes can be submitted, reviewed, and converted to jobs.
  - Status changes are tracked and visible to admin/staff.
  - Data integrity between quote and job records.
- **QA Required:** End-to-end quote-to-job flow, data validation, negative tests.
- **Rollback Notes:** Restore previous quote/job schema and flows if data loss or corruption is detected.

---

## Phase 4: Staff Assignment/Status Workflow
- **Goal:** Enable staff to view assigned jobs, update status, and track progress.
- **Owner/Dev Lane:** Dev 2, QA
- **Files/Modules:** src/pages/staff, staff dashboard, job assignment modules, Supabase RLS
- **Acceptance Criteria:**
  - Staff can see only their assigned jobs.
  - Status updates are reflected in real time.
  - No cross-role data leakage.
- **QA Required:** Staff login, assignment, and status update flows; negative access tests.
- **Rollback Notes:** Remove new assignment logic if staff access is broken or data is exposed.

---

## Phase 5: Customer Request/Status View
- **Goal:** Allow customers to view their requests, job status, and history securely.
- **Owner/Dev Lane:** Dev 3, QA
- **Files/Modules:** src/pages/customer, customer dashboard, Supabase RLS, status timeline modules
- **Acceptance Criteria:**
  - Customers can see only their own requests and job status.
  - No access to other customer or staff data.
  - Status timeline is accurate and up to date.
- **QA Required:** Customer login, request/status view, negative access tests.
- **Rollback Notes:** Disable new customer dashboard if data exposure or access issues are found.

---

## Phase 6: Audit Logs/Security Hardening
- **Goal:** Implement audit logging for all sensitive actions and review security posture.
- **Owner/Dev Lane:** Dev 1, Dev 3
- **Files/Modules:** audit log service/module, Supabase logs, RLS policy review, DOCS/SECURITY.md
- **Acceptance Criteria:**
  - All admin/staff/customer actions are logged with timestamp and actor.
  - RLS policies reviewed and enforced for all tables.
  - No critical security findings in review.
- **QA Required:** Log review, security test, RLS policy validation.
- **Rollback Notes:** Revert to previous logging/security config if regressions or log failures occur.

---

## Explicit Notes
- **Key rotation:** Deferred until final handoff window. No production key rotation until all build phases are complete and owner is ready for final handoff.
- **QA credentials:** No QA/test credentials are to be shared or reused as production credentials under any circumstances.

---

## Final Checklist: Ready to Hand Client Access
- [ ] All production credentials are unique and securely stored.
- [ ] Owner has verified admin access and can manage users.
- [ ] All core flows (quote, job, staff, customer) are live and tested.
- [ ] Audit logs and RLS policies are in place and validated.
- [ ] No test/QA credentials or data remain in production.
- [ ] Security review is complete and no critical issues remain.
- [ ] Owner signs off on production access and handoff.

---

> This board is founder-facing and execution-ready. No app code is included. All actions must be documented and owner-acknowledged before production handoff.
