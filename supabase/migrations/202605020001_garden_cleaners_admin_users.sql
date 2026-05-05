-- Phase 22: Garden Cleaners Admin User Management
-- Extends profiles table with admin-required fields and adds audit log

-- Extend garden_cleaners_profiles with operational fields
alter table garden_cleaners_profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists service_region text,
  add column if not exists created_by text,
  add column if not exists updated_by text;

-- Audit log for all privileged admin actions
create table if not exists garden_cleaners_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,
  target_email text,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- RLS: only admin can read audit log; inserts only from service role
alter table garden_cleaners_audit_log enable row level security;

create policy "admin_read_audit_log" on garden_cleaners_audit_log
  for select
  using (
    exists (
      select 1 from garden_cleaners_profiles p
      where p.email = auth.jwt() ->> 'email'
        and p.role = 'admin'
        and p.is_active = true
    )
  );

-- Admin can read all profiles (update existing policy to also check is_active for non-admins)
-- Drop and recreate admin_read_profiles to avoid duplicates
drop policy if exists "admin_read_profiles" on garden_cleaners_profiles;
create policy "admin_read_profiles" on garden_cleaners_profiles
  for select
  using (
    exists (
      select 1 from garden_cleaners_profiles p
      where p.email = auth.jwt() ->> 'email'
        and p.role = 'admin'
        and p.is_active = true
    )
  );

-- Admin can update any profile (role, is_active, etc.)
create policy "admin_update_profiles" on garden_cleaners_profiles
  for update
  using (
    exists (
      select 1 from garden_cleaners_profiles p
      where p.email = auth.jwt() ->> 'email'
        and p.role = 'admin'
        and p.is_active = true
    )
  );

-- Admin can insert new profiles (when inviting users)
create policy "admin_insert_profiles" on garden_cleaners_profiles
  for insert
  with check (
    exists (
      select 1 from garden_cleaners_profiles p
      where p.email = auth.jwt() ->> 'email'
        and p.role = 'admin'
        and p.is_active = true
    )
  );

-- Update set_garden_cleaners_jobs_updated_at to cover profiles too
create or replace function set_garden_cleaners_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists garden_cleaners_profiles_updated_at on garden_cleaners_profiles;
create trigger garden_cleaners_profiles_updated_at
  before update on garden_cleaners_profiles
  for each row execute function set_garden_cleaners_profiles_updated_at();

-- End Phase 22
