# Garden Portal QA Account Setup Result

**Date:** 2026-04-29
**Status:** BLOCKED

## Supabase / Auth Access

- Supabase CLI/admin access: not usable for project administration from this environment.
- Local Supabase env vars: missing (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- Cloudflare Pages secrets: present for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on `gardencleaners`, but encrypted and not readable locally.
- Service-role/admin credential: missing. This is required for safe Supabase Auth user creation and privileged seed data.

## Can Create Auth Users

No. The QA users cannot be created from this environment because no readable Supabase project credentials or service-role/admin key are available.

## Can Seed Data

No. Seed data cannot be inserted from this environment without Supabase API credentials, service-role access, SQL editor access, or Supabase CLI access.

Important data-model note:

- Quote intake persistence uses `garden_cleaners_quotes`.
- The current live portal UI loads authenticated portal records from `projects`.
- Full credentialed portal QA therefore needs seed coverage in both places: one quote record in `garden_cleaners_quotes` and one Garden-related portal-visible record in `projects`.

## Required Env Vars / Access

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or Supabase dashboard admin access for Auth/user setup
- `NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS` including `garden.admin.qa@unalabs.cloud`
- `NEXT_PUBLIC_GARDEN_PORTAL_STAFF_EMAILS` if staff emails are not using `@gardencleaners.ca`

## QA Accounts Planned

| Role | Email | Status |
|---|---|---|
| Customer | `garden.customer.qa@unalabs.cloud` | Blocked |
| Staff | `garden.staff.qa@gardencleaners.ca` | Blocked |
| Admin | `garden.admin.qa@unalabs.cloud` | Blocked |

## Owner Action Needed

1. Create the three QA accounts in Supabase Auth and verify them.
2. Set the portal admin/staff env vars in Cloudflare Pages.
3. Seed one `garden_cleaners_quotes` record for `garden.customer.qa@unalabs.cloud`.
4. Seed one Garden-related `projects` row visible to `garden.customer.qa@unalabs.cloud`.
5. Securely hand off credentials or provide magic-link mailbox access. Do not place passwords in repo docs.
6. Notify QA to rerun `DOCS/GARDEN_CREDENTIALED_PORTAL_QA_PLAN.md`.

No production user data was changed.
