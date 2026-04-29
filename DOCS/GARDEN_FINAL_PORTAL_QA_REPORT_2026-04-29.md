# Garden Cleaners Final Portal QA Report

**Date:** 2026-04-29
**Workspace:** `C:\FTC HOLDING\_restore_repo`

## 1. Executive Summary

- **Public / unauthenticated QA:** PASS WITH ISSUES. Public flows work, and immediate public issues found during the rerun were fixed and verified.
- **Portal maturity:** PARTIAL. The shared regional portal shell and embedded auth panel are live.
- **Credentialed portal QA:** BLOCKED. Customer/staff/admin role behavior is unverified due access, not failed.
- **Top risks:** incomplete credential pack, missing seed data for portal-visible records, and unverified role separation.

## 2. Credential Setup Status

- QA credential pack is not provisioned.
- No local Supabase URL/key, service-role/admin credential, or Auth credentials are available.
- Cloudflare Pages has encrypted public Supabase secrets for `gardencleaners`, but they cannot be read locally and are not sufficient for safe Auth user creation.
- Auth users and seed data cannot be created from this environment.

## 3. Customer Portal Findings

- Portal sign-in is visible at `/garden-cleaners/portal` and `/portal`.
- Customer records, status timelines, notes, reschedule/cancel, invoice, and proof flows are unverified because no customer credentials exist.
- Customer behavior is access restricted, not failed.

## 4. Staff / Worker Portal Findings

- No standalone `/garden-cleaners/worker` route is live.
- Staff lane intent exists inside the shared portal shell.
- Staff queue visibility, assignment, and status-update behavior are unverified because no staff credentials exist.

## 5. Admin / Operator Findings

- No standalone `/garden-cleaners/admin` route is live.
- Admin lane intent exists inside the shared portal shell.
- Admin queue visibility, region edits, assignment, and privileged status updates are unverified because no admin credentials exist.

## 6. Quote / Job Lifecycle Verified

- Public quote form has been verified.
- Quote durability is intended through `garden_cleaners_quotes`.
- Current portal-visible authenticated records are loaded from `projects`.
- Full lifecycle proof requires both a `garden_cleaners_quotes` seed record and a Garden-related `projects` seed record.

## 7. Access Control / Permission Findings

- Positive: unauthenticated users do not see customer/staff/admin data.
- Unverified: role-based record scoping, staff controls, admin-only controls, and RLS behavior.
- Risk: role env vars or RLS policies may block valid users or expose records if configured incorrectly; this cannot be confirmed until credentials exist.

## 8. Missing Or Partial Modules

- Credentialed QA accounts are missing.
- Seed data is missing.
- Standalone dashboard/role routes are not live.
- Credentialed role lanes exist in the shared portal shell but have not been verified.

## 9. Owner Action Checklist

1. Create QA accounts for customer, staff, and admin in Supabase Auth.
2. Seed one Garden quote record in `garden_cleaners_quotes`.
3. Seed one Garden-related portal-visible record in `projects`.
4. Set required env vars, including `NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS` and any staff email overrides.
5. Securely hand off credentials or magic-link mailbox access to QA.
6. Rerun `DOCS/GARDEN_CREDENTIALED_PORTAL_QA_PLAN.md`.

No production user data was changed during this QA closeout.
