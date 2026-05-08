-- Garden Cleaners portal baseline schema + RLS
-- Apply manually in Supabase SQL editor (or via migration runner).

create extension if not exists pgcrypto;

create table if not exists public.garden_cleaners_quotes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  address text not null,
  city text not null,
  region text not null default 'Unspecified',
  postal_code text,
  property_type text not null,
  service_type text not null,
  service_frequency text not null,
  preferred_date date not null,
  preferred_time text,
  message text not null,
  add_ons jsonb,
  status text not null default 'new' check (status in ('new', 'approved', 'rejected', 'converted')),
  source text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.garden_cleaners_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  email text not null unique,
  display_name text,
  role text not null default 'client' check (role in ('admin', 'staff', 'client')),
  is_active boolean not null default true,
  service_region text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.garden_cleaners_jobs (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.garden_cleaners_quotes(id) on delete set null,
  customer_email text not null,
  address text,
  city text,
  region text,
  service_type text,
  service_frequency text,
  property_type text,
  staff_profile_id uuid references public.garden_cleaners_profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  status_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint garden_cleaners_jobs_quote_id_unique unique (quote_id)
);

create table if not exists public.garden_cleaners_job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.garden_cleaners_jobs(id) on delete cascade,
  staff_profile_id uuid not null references public.garden_cleaners_profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed', 'cancelled')),
  status_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.garden_cleaners_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,
  target_email text,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_gc_quotes_status_created_at on public.garden_cleaners_quotes (status, created_at desc);
create index if not exists idx_gc_quotes_email on public.garden_cleaners_quotes (email);
create index if not exists idx_gc_jobs_customer_email on public.garden_cleaners_jobs (customer_email);
create index if not exists idx_gc_jobs_staff_profile_id on public.garden_cleaners_jobs (staff_profile_id);
create index if not exists idx_gc_jobs_status on public.garden_cleaners_jobs (status);
create index if not exists idx_gc_assignments_job_id on public.garden_cleaners_job_assignments (job_id);
create index if not exists idx_gc_assignments_staff_profile_id on public.garden_cleaners_job_assignments (staff_profile_id);
create index if not exists idx_gc_profiles_auth_user_id on public.garden_cleaners_profiles (auth_user_id);
create index if not exists idx_gc_audit_created_at on public.garden_cleaners_audit_log (created_at desc);

alter table public.garden_cleaners_quotes enable row level security;
alter table public.garden_cleaners_profiles enable row level security;
alter table public.garden_cleaners_jobs enable row level security;
alter table public.garden_cleaners_job_assignments enable row level security;
alter table public.garden_cleaners_audit_log enable row level security;

-- Helper predicates based on jwt email / uid. Service role bypasses RLS by design.
create or replace function public.gc_is_admin() returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.garden_cleaners_profiles p
    where p.email = lower(coalesce((auth.jwt() ->> 'email'), ''))
      and p.role = 'admin'
      and p.is_active = true
  );
$$;

create or replace function public.gc_is_staff() returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.garden_cleaners_profiles p
    where p.auth_user_id = auth.uid()
      and p.role = 'staff'
      and p.is_active = true
  );
$$;

-- Quotes
drop policy if exists gc_quotes_insert_public on public.garden_cleaners_quotes;
create policy gc_quotes_insert_public
on public.garden_cleaners_quotes
for insert
with check (true);

drop policy if exists gc_quotes_admin_select on public.garden_cleaners_quotes;
create policy gc_quotes_admin_select
on public.garden_cleaners_quotes
for select
using (public.gc_is_admin());

drop policy if exists gc_quotes_admin_update on public.garden_cleaners_quotes;
create policy gc_quotes_admin_update
on public.garden_cleaners_quotes
for update
using (public.gc_is_admin())
with check (public.gc_is_admin());

-- Profiles
drop policy if exists gc_profiles_admin_select on public.garden_cleaners_profiles;
create policy gc_profiles_admin_select
on public.garden_cleaners_profiles
for select
using (public.gc_is_admin());

drop policy if exists gc_profiles_self_select on public.garden_cleaners_profiles;
create policy gc_profiles_self_select
on public.garden_cleaners_profiles
for select
using (auth_user_id = auth.uid());

drop policy if exists gc_profiles_admin_modify on public.garden_cleaners_profiles;
create policy gc_profiles_admin_modify
on public.garden_cleaners_profiles
for all
using (public.gc_is_admin())
with check (public.gc_is_admin());

-- Jobs
drop policy if exists gc_jobs_admin_all on public.garden_cleaners_jobs;
create policy gc_jobs_admin_all
on public.garden_cleaners_jobs
for all
using (public.gc_is_admin())
with check (public.gc_is_admin());

drop policy if exists gc_jobs_customer_select on public.garden_cleaners_jobs;
create policy gc_jobs_customer_select
on public.garden_cleaners_jobs
for select
using (customer_email = lower(coalesce((auth.jwt() ->> 'email'), '')));

drop policy if exists gc_jobs_staff_select on public.garden_cleaners_jobs;
create policy gc_jobs_staff_select
on public.garden_cleaners_jobs
for select
using (
  exists (
    select 1 from public.garden_cleaners_profiles p
    where p.id = staff_profile_id
      and p.auth_user_id = auth.uid()
      and p.role = 'staff'
      and p.is_active = true
  )
);

drop policy if exists gc_jobs_staff_update_assigned on public.garden_cleaners_jobs;
create policy gc_jobs_staff_update_assigned
on public.garden_cleaners_jobs
for update
using (
  exists (
    select 1 from public.garden_cleaners_profiles p
    where p.id = staff_profile_id
      and p.auth_user_id = auth.uid()
      and p.role = 'staff'
      and p.is_active = true
  )
)
with check (
  exists (
    select 1 from public.garden_cleaners_profiles p
    where p.id = staff_profile_id
      and p.auth_user_id = auth.uid()
      and p.role = 'staff'
      and p.is_active = true
  )
);

-- Job assignments
drop policy if exists gc_assignments_admin_all on public.garden_cleaners_job_assignments;
create policy gc_assignments_admin_all
on public.garden_cleaners_job_assignments
for all
using (public.gc_is_admin())
with check (public.gc_is_admin());

drop policy if exists gc_assignments_staff_select on public.garden_cleaners_job_assignments;
create policy gc_assignments_staff_select
on public.garden_cleaners_job_assignments
for select
using (
  exists (
    select 1 from public.garden_cleaners_profiles p
    where p.id = staff_profile_id
      and p.auth_user_id = auth.uid()
      and p.role = 'staff'
      and p.is_active = true
  )
);

-- Audit log
drop policy if exists gc_audit_admin_select on public.garden_cleaners_audit_log;
create policy gc_audit_admin_select
on public.garden_cleaners_audit_log
for select
using (public.gc_is_admin());

drop policy if exists gc_audit_admin_insert on public.garden_cleaners_audit_log;
create policy gc_audit_admin_insert
on public.garden_cleaners_audit_log
for insert
with check (public.gc_is_admin() or public.gc_is_staff());
