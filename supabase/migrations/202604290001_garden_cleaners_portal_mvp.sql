-- Phase 21: Garden Cleaners Portal MVP Backend Foundation
-- Adds profiles, jobs, job assignments for Garden Cleaners

create table if not exists garden_cleaners_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  email text not null unique,
  role text not null check (role in ('admin', 'staff', 'customer')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists garden_cleaners_jobs (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references garden_cleaners_quotes(id) on delete set null,
  customer_email text not null,
  address text not null,
  city text,
  region text,
  service_type text,
  service_frequency text,
  property_type text,
  status text not null default 'pending',
  status_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists garden_cleaners_job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references garden_cleaners_jobs(id) on delete cascade,
  staff_profile_id uuid not null references garden_cleaners_profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  status text not null default 'assigned',
  status_updated_at timestamptz not null default now()
);

-- RLS: Only admin can see all, staff see assigned, customer sees own
alter table garden_cleaners_profiles enable row level security;
alter table garden_cleaners_jobs enable row level security;
alter table garden_cleaners_job_assignments enable row level security;

-- Profiles: user can read/update own profile
create policy "self_read_profile" on garden_cleaners_profiles for select using (auth.uid()::uuid = auth_user_id);
create policy "self_update_profile" on garden_cleaners_profiles for update using (auth.uid()::uuid = auth_user_id);
-- Admin can read all
create policy "admin_read_profiles" on garden_cleaners_profiles for select using (role = 'admin');

-- Jobs: admin can read/update all, staff see assigned, customer sees own
create policy "admin_read_jobs" on garden_cleaners_jobs for select using (exists (select 1 from garden_cleaners_profiles p where p.email = auth.jwt() ->> 'email' and p.role = 'admin'));
create policy "admin_update_jobs" on garden_cleaners_jobs for update using (exists (select 1 from garden_cleaners_profiles p where p.email = auth.jwt() ->> 'email' and p.role = 'admin'));
create policy "customer_read_own_jobs" on garden_cleaners_jobs for select using (customer_email = auth.jwt() ->> 'email');
create policy "staff_read_assigned_jobs" on garden_cleaners_jobs for select using (exists (select 1 from garden_cleaners_job_assignments a join garden_cleaners_profiles p on a.staff_profile_id = p.id where a.job_id = garden_cleaners_jobs.id and p.email = auth.jwt() ->> 'email' and p.role = 'staff'));

-- Job assignments: staff can read/update own assignments, admin can read all
create policy "admin_read_assignments" on garden_cleaners_job_assignments for select using (exists (select 1 from garden_cleaners_profiles p where p.email = auth.jwt() ->> 'email' and p.role = 'admin'));
create policy "staff_read_own_assignments" on garden_cleaners_job_assignments for select using (exists (select 1 from garden_cleaners_profiles p where p.email = auth.jwt() ->> 'email' and p.role = 'staff' and garden_cleaners_job_assignments.staff_profile_id = p.id));
create policy "staff_update_own_assignment_status" on garden_cleaners_job_assignments for update using (exists (select 1 from garden_cleaners_profiles p where p.email = auth.jwt() ->> 'email' and p.role = 'staff' and garden_cleaners_job_assignments.staff_profile_id = p.id));

-- Triggers for updated_at
create or replace function set_garden_cleaners_jobs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists garden_cleaners_jobs_updated_at on garden_cleaners_jobs;
create trigger garden_cleaners_jobs_updated_at before update on garden_cleaners_jobs for each row execute function set_garden_cleaners_jobs_updated_at();

create or replace function set_garden_cleaners_job_assignments_status_updated_at()
returns trigger as $$
begin
  new.status_updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists garden_cleaners_job_assignments_status_updated_at on garden_cleaners_job_assignments;
create trigger garden_cleaners_job_assignments_status_updated_at before update on garden_cleaners_job_assignments for each row execute function set_garden_cleaners_job_assignments_status_updated_at();

-- End Phase 21
