-- Garden Cleaners RLS verification checklist
-- Run in Supabase SQL editor after applying 001_schema_and_rls.sql.

-- 1) Ensure RLS is enabled
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'garden_cleaners_quotes',
    'garden_cleaners_profiles',
    'garden_cleaners_jobs',
    'garden_cleaners_job_assignments',
    'garden_cleaners_audit_log'
  )
order by tablename;

-- 2) Ensure expected policies exist
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename like 'garden_cleaners_%'
order by tablename, policyname;

-- 3) Sanity checks on status constraints
select conname, conrelid::regclass as table_name, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid::regclass::text in (
  'public.garden_cleaners_quotes',
  'public.garden_cleaners_jobs',
  'public.garden_cleaners_job_assignments',
  'public.garden_cleaners_profiles'
)
and contype = 'c'
order by table_name::text, conname;

-- 4) Verify unique quote->job conversion guard
select conname, conrelid::regclass as table_name, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid::regclass::text = 'public.garden_cleaners_jobs'
  and contype = 'u';

-- 5) Quick row counts (for operator confidence)
select 'quotes' as table_name, count(*) from public.garden_cleaners_quotes
union all
select 'profiles' as table_name, count(*) from public.garden_cleaners_profiles
union all
select 'jobs' as table_name, count(*) from public.garden_cleaners_jobs
union all
select 'job_assignments' as table_name, count(*) from public.garden_cleaners_job_assignments
union all
select 'audit_log' as table_name, count(*) from public.garden_cleaners_audit_log;
