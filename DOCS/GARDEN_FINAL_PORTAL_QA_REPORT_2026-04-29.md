
# Garden Cleaners Final Credentialed Portal QA Report

**Date:** 2026-04-29
**Workspace:** C:\FTC HOLDING\_restore_repo

---

## 1. Executive Summary
- **Portal maturity:** Partial. Auth shell and role-lane intent are live, but full role execution is blocked by missing/partial credential setup and test data.
- **Overall status:**
	- **Public/unauthenticated QA:** PASS WITH ISSUES — public flows work, but some issues remain.
	- **Credentialed portal QA:** BLOCKED — no Supabase CLI/env/Auth credentials available; no role-based flows could be tested.
- **Top risks:** Route leakage (staff route), incomplete credential pack, and unverified role separation.

---

## 2. Credential Setup Status
- **QA credential pack:** Not provisioned. No verified test credentials for customer, staff, or admin roles at time of test.
- **Blocker:** No Supabase CLI access, environment variables, or Auth credentials available for any role. Cannot create QA accounts or seed test data.
- **Impact:** All credentialed portal QA is BLOCKED. Role-based flows and permissions are unverified due to lack of access, not failed tests.

---

## 3. Customer Portal Findings
- **Access:** Portal sign-in form is present at /garden-cleaners/portal and /portal.
- **Behavior:** Without credentials, customer cannot view quotes, status, or self-service actions.
- **Missing:** No verified customer dashboard, status timeline, or self-service flows.
- **Unverified:** All customer-specific flows are untested due to credential blocker (not failed).

---

## 4. Staff/Worker Portal Findings
- **Access:** No standalone /garden-cleaners/worker route; staff lane intent is visible in shared portal.
- **Behavior:** No staff credentials available; queue visibility and assignment controls unverified.
- **Missing:** No verified staff dashboard or job assignment flows.
- **Unverified:** All staff-specific flows are untested due to credential blocker (not failed).

---

## 5. Admin/Operator Findings
- **Access:** No standalone /garden-cleaners/admin route; admin lane is intended in shared portal.
- **Behavior:** No admin credentials available; admin queue and privileged controls unverified.
- **Missing:** No verified admin dashboard or privileged update flows.
- **Unverified:** All admin-specific flows are untested due to credential blocker (not failed).

---

## 6. Quote/Job Lifecycle Verified
- **Verified:** Public quote form works; submission acknowledged on live site.
- **Unverified:** No end-to-end proof that quotes appear in admin/staff queue or can be managed through full lifecycle.
- **Blocked:** Full lifecycle (customer → staff → admin) cannot be tested until credentialed access and seeded data exist.

---

## 7. Access Control / Permission Findings
- **Positive:** Portal sign-in form blocks unauthenticated access to all role lanes.
- **Negative:** No evidence of role separation, record scoping, or permission enforcement due to missing credentials.
- **Risks:** RLS policy misconfiguration or missing env vars could block or expose data; not testable in this run.

---

## 8. Missing or Partial Modules
- Standalone login/dashboard routes are not live.
- No credentialed dashboards or role-specific modules are present.
- No customer, staff, or admin test accounts or seeded records.
- No evidence of authenticated role separation or queue management.

---

## 9. Owner Action Checklist
To unblock credentialed portal QA and enable full verification, the following actions are required:
1. Create QA accounts for customer, staff, and admin roles in Supabase Auth UI.
2. Seed at least one Garden quote/job record for each role.
3. Set required environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS`, etc.).
4. Securely hand off credentials (or magic-link mailbox) to QA/dev team.
5. Confirm Supabase CLI/env access or provide a QA-accessible test environment.
6. Rerun Dev 2 QA plan and credentialed portal tests with evidence capture.

---

> This report is founder-facing and summarizes the current state of the Garden Cleaners credentialed portal as of 2026-04-29. No code changes were made.
