# Garden Cleaners Credentialed Portal QA Results

**Date:** 2026-04-29
**Status:** BLOCKED

## Blocker

- No local Supabase project URL/key, service-role/admin credential, or Auth credentials are available for customer, staff, or admin roles.
- Cloudflare Pages has encrypted public Supabase secrets, but those values cannot be read locally and are not enough to create Auth users safely.
- `DOCS/GARDEN_PORTAL_QA_ACCOUNT_SETUP_RESULT.md` confirms account creation and seed data are blocked pending owner/Supabase admin action.

## Tests Not Run

Credentialed portal QA could not be executed for:

- Customer login and customer-only record visibility
- Staff login, queue visibility, assignment, and status updates
- Admin login, broader queue visibility, region edits, and admin-only controls
- Negative role-permission tests
- Full quote/job lifecycle inside authenticated lanes

## What Remains Verified Unauthenticated

- Public Garden site routes load.
- Public quote form works and has been verified in the public QA rerun.
- `/garden-cleaners/portal` and `/portal` load the shared regional portal shell.
- Unauthenticated users do not see customer/staff/admin data.

## Owner Action Required

1. Provide working Supabase Auth credentials or magic-link mailbox access for customer, staff, and admin test accounts.
2. Seed both quote persistence data (`garden_cleaners_quotes`) and current portal-visible data (`projects`) for the QA customer.
3. Confirm admin/staff role env vars are configured.
4. Rerun `DOCS/GARDEN_CREDENTIALED_PORTAL_QA_PLAN.md`.

## Rerun Checklist

- [ ] Confirm receipt of all three test accounts.
- [ ] Confirm seeded quote record exists.
- [ ] Confirm seeded portal-visible project record exists.
- [ ] Validate login and role resolution for customer, staff, and admin.
- [ ] Validate customer record scoping.
- [ ] Validate staff queue permissions.
- [ ] Validate admin-only controls.
- [ ] Capture evidence and update this report with final pass/fail results.

No app code changes were made.
