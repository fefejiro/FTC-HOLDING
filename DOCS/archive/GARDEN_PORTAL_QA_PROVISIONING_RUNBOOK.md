# Garden Portal QA Provisioning Runbook

**Last updated:** 2026-04-29

## Purpose
Use this when Garden Cleaners needs repeatable QA accounts and seed records without manually clicking through Supabase every time.

This is a fallback/operator tool. The product target is still admin user management inside the portal UI.

## What The Script Does

`npm run qa:garden:provision`:

- Creates or updates one customer QA Auth user.
- Creates or updates one staff QA Auth user.
- Creates or updates one admin QA Auth user.
- Seeds one `garden_cleaners_quotes` QA row.
- Seeds one `projects` row visible in the current Garden portal UI.
- Prints non-secret account emails to the terminal.
- Does not write passwords or service-role keys to disk.

## Required Local Env Vars

Set these in the current PowerShell session only:

```powershell
$env:SUPABASE_URL="https://aaaextkrfoqomzmjjkxe.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<copy from Supabase Project Settings > API > service_role>"
$env:GARDEN_QA_PASSWORD="<temporary QA password>"
```

Optional overrides:

```powershell
$env:GARDEN_QA_CUSTOMER_EMAIL="garden.customer.qa@unalabs.cloud"
$env:GARDEN_QA_STAFF_EMAIL="garden.staff.qa@gardencleaners.ca"
$env:GARDEN_QA_ADMIN_EMAIL="hello@unalabs.cloud"
$env:GARDEN_QA_SEED_TAG="garden-portal-qa-2026-04-29"
```

## Run

```powershell
Set-Location "C:\FTC HOLDING\_restore_repo"
npm run qa:garden:provision
```

Dry run:

```powershell
node scripts/garden-portal-qa-provision.mjs --dry-run
```

## Clear Secrets After Running

```powershell
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
Remove-Item Env:GARDEN_QA_PASSWORD
```

## What Still Requires Product Build

The script does not create the full admin portal UI. Admin user creation, role editing, assignment, disabling, and deletion should be implemented in the Garden portal using the secure API architecture documented in `DOCS/GARDEN_PORTAL_ADMIN_USER_MANAGEMENT_SPEC.md`.
