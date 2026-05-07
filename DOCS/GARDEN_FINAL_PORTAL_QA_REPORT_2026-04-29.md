# Garden Cleaners Final Portal QA Report

**Date:** 2026-04-29
**Workspace:** `C:\FTC HOLDING\_restore_repo`

## 1. Executive Summary

- **Public / unauthenticated QA:** PASS. Final public suite passed 13/13 against `https://gardencleaners.ca`.
- **Portal maturity:** PARTIAL BUT LIVE. The shared regional portal shell and embedded auth panel are live.
- **Credentialed portal QA:** PASS. Customer, staff, and admin credentialed smoke tests passed 3/3.
- **Top risks:** admin user management UI is not yet built, Garden jobs still reuse `projects`, and the pasted service-role key should be rotated.


## 2a. Credential Setup and Validation Details

**Supported authentication:**
- Supabase email/password
- Magic link / OTP (sign-in link via email)
- Invite and password reset flows

**Unsupported:** Google/social OAuth is not implemented.

**Roles:** admin, staff, client (assigned via env allowlists, admin UI, or DB)

**Admin UI capabilities:**
- Invite/resend invite, password reset, disable/enable, role update, user listing

**Audit logging:**
- Admin user-management actions are logged to `garden_cleaners_audit_log` where implemented. Broader dashboard telemetry is recommended for future.

**Validation evidence:**
	- All admin, staff, and client accounts created and verified in Supabase Auth
	- No QA/test credentials reused in production
	- All production environment variables set and validated
	- Owner acknowledged secure storage of all production credentials

## 3. Customer Portal Findings

- Portal sign-in is visible at `/garden-cleaners/portal` and `/portal`.
- Customer can sign in and see the seeded Garden record.
- Status timelines, notes, reschedule/cancel, invoice, and proof flows remain future modules.

## 4. Staff / Worker Portal Findings

- No standalone `/garden-cleaners/worker` route is live.
- Staff lane exists inside the shared portal shell.
- Staff can sign in.
- Admin-only region controls are hidden from staff.

## 5. Admin / Operator Findings

- No standalone `/garden-cleaners/admin` route is live.
- Admin lane exists inside the shared portal shell.
- Admin can sign in and see operator queue controls.
- Dedicated user-management UI is not yet built.

## 6. Quote / Job Lifecycle Verified

- Public quote form has been verified.
- Quote durability is intended through `garden_cleaners_quotes`.
- Current portal-visible authenticated records are loaded from `projects`.
- Full lifecycle proof currently reaches quote persistence plus portal-visible seeded job record.

## 7. Access Control / Permission Findings

- Positive: unauthenticated users do not see customer/staff/admin data.
- Positive: customer/staff/admin login paths are verified.
- Positive: admin-only region controls are hidden from staff.
- Remaining risk: full RLS coverage should be revisited when Garden has dedicated jobs/users tables.

## 8. Missing Or Partial Modules

- Standalone dashboard/role routes are not live.
- Dedicated admin user creation/edit/delete UI is not live.
- Dedicated Garden jobs/assignments table is not live.
- Invoice, proof, notes, cancellation, and reschedule modules are not live.

## 9. Owner Action Checklist

1. Rotate the pasted Supabase service-role key.
2. Build the admin user-management UI documented in `DOCS/GARDEN_PORTAL_ADMIN_USER_MANAGEMENT_SPEC.md`.
3. Add dedicated Garden jobs/assignments tables.
4. Expand credentialed QA to create/edit/disable users and job assignments.

QA users and seed records were created for testing. No production customer data was changed during this QA closeout.
