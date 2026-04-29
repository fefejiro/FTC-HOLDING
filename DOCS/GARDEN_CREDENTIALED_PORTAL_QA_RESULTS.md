# Garden Cleaners Credentialed Portal QA Results

**Date:** 2026-04-29
**Status:** PASS WITH PRODUCT MATURITY NOTES

## 2026-04-29 Provisioning Update

QA accounts and seed records were provisioned with the Garden service-role automation script. No service-role value was written to docs or repo files.

Provisioned accounts:

- Customer: `garden.customer.qa@unalabs.cloud`
- Staff: `garden.staff.qa@gardencleaners.ca`
- Admin: `hello@unalabs.cloud`

Seed records:

- `garden_cleaners_quotes`: seeded/updated for the QA customer.
- `projects`: seeded/updated for the QA customer so the current portal UI has a visible record once auth is available.

Credentialed UI QA was attempted against `https://gardencleaners.ca`. The initial run was blocked because the live portal rendered `Portal auth unavailable` with the message `Supabase public environment is not configured for this deployment.`

Fix applied:

- Rebuilt Garden with `NEXT_PUBLIC_SUPABASE_URL`.
- Rebuilt Garden with `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Patched `@ftc/supabase` so Next.js inlines explicit `NEXT_PUBLIC_*` values in browser bundles.
- Hid admin-only region save controls from staff users.

The service-role key is valid for server-side provisioning only and must not be used in the browser.

## Final Credentialed QA Result

- Account creation and seed data are complete.
- Live credentialed UI testing now passes.
- `DOCS/GARDEN_PORTAL_QA_ACCOUNT_SETUP_RESULT.md` has the current account setup status.

## Tests Run

Credentialed portal QA completed for:

- Customer login and customer seeded-record visibility.
- Staff login and absence of admin-only region controls.
- Admin login and operator queue control visibility.

## What Remains Verified Unauthenticated

- Public Garden site routes load.
- Public quote form works and has been verified in the public QA rerun.
- `/garden-cleaners/portal` and `/portal` load the shared regional portal shell.
- Unauthenticated users do not see customer/staff/admin data.

## Remaining Product Maturity Notes

1. Build a dedicated admin user management UI for creating, editing, disabling, assigning, and role-managing users.
2. Move Garden operational jobs into a Garden-specific jobs/assignments table instead of overloading `projects`.
3. Keep service-role access server-side only.
4. Rotate the pasted service-role key after QA closeout.

## Rerun Checklist

- [x] Confirm all three test accounts are provisioned.
- [x] Confirm seeded quote record exists.
- [x] Confirm seeded portal-visible project record exists.
- [x] Validate login and role resolution for customer, staff, and admin.
- [x] Validate customer record visibility.
- [x] Validate staff queue login and non-admin control hiding.
- [x] Validate admin-only controls.
- [x] Capture evidence and update this report with final pass/fail results.

App code and tests were updated to complete this QA pass.
