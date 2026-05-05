# Garden Cleaners Portal QA Credential Setup

**Last updated:** 2026-04-29

---

## Overview
This document defines the exact credential and account setup required for QA of the Garden Cleaners portal (https://gardencleaners.ca/garden-cleaners/portal). It covers test account requirements, role mapping, Supabase/Auth setup, environment variables, and owner actions needed for full coverage of client, staff, and admin flows.

---

## Required Test Accounts
| Role    | Purpose                  | Email Example                | Password (set for QA) |
|---------|--------------------------|------------------------------|-----------------------|
| Client  | Customer portal access   | test.client1@example.com     | [set by owner]        |
| Staff   | Staff/cleaner access     | test.staff1@gardencleaners.ca| [set by owner]        |
| Admin   | Operator/admin access    | hello@unalabs.cloud          | [set by owner]        |

- At least one account per role must exist and be verified in Supabase Auth.
- Staff accounts must use @gardencleaners.ca domain or be listed in the STAFF_EMAILS env var.
- Admin account must match the configured admin email (see below).

---

## Email Addresses to Create/Use
- **Client:** Any non-staff, non-admin email (e.g., test.client1@example.com)
- **Staff:** Any email ending with @gardencleaners.ca (e.g., test.staff1@gardencleaners.ca) or explicitly listed in env var
- **Admin:** hello@unalabs.cloud (must match env var and RLS policy)

---

## Environment Variables (set in deployment)
- `NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS` — comma-separated list of admin emails (must include hello@unalabs.cloud)
- `NEXT_PUBLIC_GARDEN_PORTAL_STAFF_EMAILS` — comma-separated list of staff emails (optional, for non-@gardencleaners.ca staff)
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` — must be set for Supabase client

---

## Supabase/Auth Setup Steps
1. **Create users in Supabase Auth** for each test email (client, staff, admin). Set passwords and verify emails.
2. **Set environment variables** in the deployment for admin/staff emails as above.
3. **Ensure RLS policies** in Supabase match the admin email (hello@unalabs.cloud) for full access to garden_cleaners_quotes.
4. **Seed test data** (optional):
   - Add test projects/quotes with each test email as the client.
   - Assign staff and admin as owners for some projects to test assignment flows.

---

## Role Mapping Rules
- **Admin:** Email matches `NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS` (e.g., hello@unalabs.cloud)
- **Staff:** Email matches `NEXT_PUBLIC_GARDEN_PORTAL_STAFF_EMAILS` or ends with @gardencleaners.ca
- **Client:** Any other email

---

## Seed Data Required
- At least one project/quote per test account (client, staff, admin) for full portal flow coverage.
- Projects should have a variety of statuses (new, triaged, scheduled, completed, cancelled).
- Assign owners and regions as needed to test assignment and routing.

---

## Owner Actions Required
- Create and verify all test accounts in Supabase Auth.
- Set and confirm all required environment variables in deployment.
- Seed test data as above.
- Confirm RLS policies allow correct access for each role.

---

## Risks if Credentials Are Not Created Correctly
- Portal flows will be blocked or incomplete for one or more roles.
- Staff/admin features (assignment, status change, region edit) will not be testable.
- RLS policy misconfiguration may block all access or expose data to wrong users.
- QA coverage will be partial or invalid if test data is missing or roles are not mapped as expected.

---

**Contact:** Owner/operator for credential setup: hello@unalabs.cloud
