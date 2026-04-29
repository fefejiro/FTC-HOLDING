# Garden Cleaners Credentialed Portal QA Results

**Date:** 2026-04-29
**Status:** BLOCKED ON PUBLIC SUPABASE CLIENT CONFIG

## 2026-04-29 Provisioning Update

QA accounts and seed records were provisioned with the Garden service-role automation script. No service-role value was written to docs or repo files.

Provisioned accounts:

- Customer: `garden.customer.qa@unalabs.cloud`
- Staff: `garden.staff.qa@gardencleaners.ca`
- Admin: `hello@unalabs.cloud`

Seed records:

- `garden_cleaners_quotes`: seeded/updated for the QA customer.
- `projects`: seeded/updated for the QA customer so the current portal UI has a visible record once auth is available.

Credentialed UI QA was attempted against `https://gardencleaners.ca`. Result: blocked. The live portal renders `Portal auth unavailable` with the message `Supabase public environment is not configured for this deployment.`

Required next deploy configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The service-role key is valid for server-side provisioning only and must not be used in the browser.

## Blocker

- Account creation and seed data are complete.
- Live credentialed UI testing is blocked because the deployed Garden portal client cannot initialize Supabase Auth.
- `DOCS/GARDEN_PORTAL_QA_ACCOUNT_SETUP_RESULT.md` has the current account setup status.

## Tests Not Run

Credentialed portal QA could not complete for:

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

1. Deploy Garden with usable public Supabase client config.
2. Confirm admin/staff role env vars are configured.
3. Rerun `DOCS/GARDEN_CREDENTIALED_PORTAL_QA_PLAN.md`.

## Rerun Checklist

- [x] Confirm all three test accounts are provisioned.
- [x] Confirm seeded quote record exists.
- [x] Confirm seeded portal-visible project record exists.
- [ ] Validate login and role resolution for customer, staff, and admin.
- [ ] Validate customer record scoping.
- [ ] Validate staff queue permissions.
- [ ] Validate admin-only controls.
- [ ] Capture evidence and update this report with final pass/fail results.

No app code changes were made.
