# Garden Portal QA Account Setup Result

**Date:** 2026-04-29
**Status:** ACCOUNT SETUP COMPLETE; UI QA BLOCKED ON PUBLIC CLIENT CONFIG

## 2026-04-29 Automation Result

The Garden portal provisioning workflow ran successfully with service-role access.

Created or updated:

- `garden.customer.qa@unalabs.cloud` as customer QA user.
- `garden.staff.qa@gardencleaners.ca` as staff QA user.
- `hello@unalabs.cloud` as admin QA user.
- One `garden_cleaners_quotes` seed row for the QA customer.
- One `projects` seed row for the QA customer.

The originally requested password `Ubong` was rejected by Supabase because passwords must be at least six characters. The QA password was then updated to the owner-provided `Ubong,1234`.

Remaining blocker:

- Live portal UI shows `Portal auth unavailable`.
- Root cause: deployed Garden client bundle does not currently expose usable `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- The service-role key cannot be used in the browser.

## Supabase / Auth Access

- Supabase CLI/admin access: usable for project discovery; service-role key was used for provisioning.
- Local Supabase env vars: not persisted after provisioning.
- Cloudflare Pages secrets: present for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on `gardencleaners`, but encrypted and not readable locally.
- Service-role/admin credential: used transiently for provisioning and then removed from the shell process.

## Can Create Auth Users

Yes. The QA users were created/updated from this environment.

## Can Seed Data

Yes. Seed data was inserted/updated with service-role access.

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
| Customer | `garden.customer.qa@unalabs.cloud` | Provisioned |
| Staff | `garden.staff.qa@gardencleaners.ca` | Provisioned |
| Admin | `hello@unalabs.cloud` | Provisioned |

## Owner Action Needed

1. Create the three QA accounts in Supabase Auth and verify them.
2. Set the portal admin/staff env vars in Cloudflare Pages.
3. Seed one `garden_cleaners_quotes` record for `garden.customer.qa@unalabs.cloud`.
4. Seed one Garden-related `projects` row visible to `garden.customer.qa@unalabs.cloud`.
5. Securely hand off credentials or provide magic-link mailbox access. Do not place passwords in repo docs.
6. Notify QA to rerun `DOCS/GARDEN_CREDENTIALED_PORTAL_QA_PLAN.md`.

No production user data was changed.
