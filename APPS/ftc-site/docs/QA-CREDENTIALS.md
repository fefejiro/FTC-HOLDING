# QA Credential Setup for Garden Cleaners & Una Labs

## Overview
This document describes how to set up local/staging QA credentials for running credentialed E2E tests in the FTC Site repo. **Do not use real production credentials.**

## Principles
- **Never commit real passwords or secrets.**
- **Do not insert directly into `auth.users` with raw SQL.**
- Use the Supabase Dashboard, Admin API, or approved seed tooling to create Auth users.
- After Auth users exist, link them to Garden Cleaners profiles using the SQL snippet below.

## Required Roles & Accounts
You must create three QA users in Supabase Auth:
- **Admin**: e.g. `hello@unalabs.cloud`
- **Staff**: e.g. `garden.staff.qa@gardencleaners.ca`
- **Customer**: e.g. `garden.customer.qa@unalabs.cloud`

## Required Environment Variables
Add these to your `.env.local` (see `.env.example`):
```
GARDEN_QA_ADMIN_EMAIL=hello@unalabs.cloud
GARDEN_QA_STAFF_EMAIL=garden.staff.qa@gardencleaners.ca
GARDEN_QA_CUSTOMER_EMAIL=garden.customer.qa@unalabs.cloud
GARDEN_QA_PASSWORD=your-local-qa-password

# Optional for Una Labs admin E2E
UNA_QA_ADMIN_EMAIL=your-una-admin-email
UNA_QA_ADMIN_PASSWORD=your-una-admin-password
```

## Linking Auth Users to Garden Profiles
After creating Auth users, run this SQL in the Supabase SQL editor to link them to the correct roles:

```sql
-- Link existing Auth users to garden_cleaners_profiles for QA E2E
insert into garden_cleaners_profiles (auth_user_id, email, role, display_name)
select u.id, u.email, 'admin', 'QA Admin'
from auth.users u where u.email = 'hello@unalabs.cloud'
on conflict (email) do update set role = 'admin';

insert into garden_cleaners_profiles (auth_user_id, email, role, display_name)
select u.id, u.email, 'staff', 'QA Staff'
from auth.users u where u.email = 'garden.staff.qa@gardencleaners.ca'
on conflict (email) do update set role = 'staff';

insert into garden_cleaners_profiles (auth_user_id, email, role, display_name)
select u.id, u.email, 'customer', 'QA Customer'
from auth.users u where u.email = 'garden.customer.qa@unalabs.cloud'
on conflict (email) do update set role = 'customer';
```
- This assumes the users already exist in Supabase Auth.
- Do **not** include plaintext or fake passwords in SQL.

## Running Credentialed E2E Tests
1. Ensure all required env vars are set in `.env.local`.
2. Run:
   - `npm run build`
   - `npm run lint`
   - `npm run test:e2e -- --list`
   - `npx playwright test tests/garden-portal-credentialed.spec.ts`

## Notes
- These instructions are for local/staging only. Never use real production credentials for QA automation.
- If you need to reset a QA user password, use the Supabase Dashboard or Admin API.
- For Una Labs admin E2E, see the test file for required env vars and setup.
