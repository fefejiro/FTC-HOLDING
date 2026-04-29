# Garden Cleaners Portal Migration Apply Plan

## 1. Is migration safe to apply?
- The migration (202604290001_garden_cleaners_portal_mvp.sql) is safe to apply to a production Supabase instance that does not already have conflicting tables (garden_cleaners_profiles, garden_cleaners_jobs, garden_cleaners_job_assignments).
- It is idempotent (uses `create table if not exists`).
- No destructive changes to existing tables.

## 2. Dependencies/Preconditions
- Must have `garden_cleaners_quotes` table present (from previous migration).
- Supabase Auth must be enabled and working.
- No existing tables with the same names and incompatible schema.
- All API routes expect these tables to exist.

## 3. RLS Behavior and Risks
- RLS is enabled for all new tables.
- Only admin can see all jobs/assignments; staff see only assigned jobs; customers see only their own jobs.
- Profiles table: users can read/update their own profile; admin can read all.
- Risk: If profiles are not seeded or mapped to correct auth_user_id/email/role, access will fail for all roles.
- Risk: If RLS policies are misconfigured, data leakage or lockout could occur. Review policies after apply.

## 4. Required Seed Rows
- At least one admin profile (role: 'admin')
- At least one staff profile (role: 'staff')
- At least one customer profile (role: 'customer')
- (Optional) One job and one assignment for smoke/E2E test

## 5. SQL Seed Template (use placeholder emails, never real credentials)
```sql
insert into garden_cleaners_profiles (id, auth_user_id, email, role, display_name) values
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'admin@example.com', 'admin', 'Admin User'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'staff@example.com', 'staff', 'Staff User'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'customer@example.com', 'customer', 'Customer User');

-- Optional: seed a job and assignment
insert into garden_cleaners_jobs (id, customer_email, address, city, region, service_type, service_frequency, property_type, status)
  values (gen_random_uuid(), 'customer@example.com', '123 Main St', 'Oshawa', 'Oshawa', 'standard', 'weekly', 'residential', 'pending');

insert into garden_cleaners_job_assignments (id, job_id, staff_profile_id)
  select gen_random_uuid(), j.id, s.id from garden_cleaners_jobs j, garden_cleaners_profiles s where j.customer_email = 'customer@example.com' and s.email = 'staff@example.com';
```

## 6. Rollback Plan
- To rollback, drop the new tables:
```sql
drop table if exists garden_cleaners_job_assignments cascade;
drop table if exists garden_cleaners_jobs cascade;
drop table if exists garden_cleaners_profiles cascade;
```
- Review for any dependent objects before dropping.

## 7. Post-Apply Verification SQL
```sql
-- Check tables exist
select * from garden_cleaners_profiles limit 1;
select * from garden_cleaners_jobs limit 1;
select * from garden_cleaners_job_assignments limit 1;

-- Check RLS policies
select * from pg_policies where tablename in ('garden_cleaners_profiles','garden_cleaners_jobs','garden_cleaners_job_assignments');

-- Check seeded roles
select email, role from garden_cleaners_profiles;
```

## 8. Final Recommendation
- **APPLY** (if preconditions are met and you have a backup)
- HOLD if you have existing tables with conflicting names or cannot seed required profiles.

---
No secrets or passwords in this document.
