create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.projects add column if not exists client_name text;
alter table public.projects add column if not exists client_email text;
alter table public.projects add column if not exists domain text;
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists budget_range text;
alter table public.projects add column if not exists timeline text;
alter table public.projects add column if not exists tier text default 'unknown';
alter table public.projects add column if not exists status text default 'scoping';
alter table public.projects add column if not exists live_url text;
alter table public.projects add column if not exists repo_path text;
alter table public.projects add column if not exists handover_doc text;
alter table public.projects add column if not exists notes text;
alter table public.projects add column if not exists updated_at timestamptz not null default now();

update public.projects
set client_email = coalesce(client_email, email)
where client_email is null
  and coalesce(email, '') <> '';

update public.projects
set client_name = coalesce(client_name, name)
where client_name is null
  and coalesce(name, '') <> '';

update public.projects
set tier = 'unknown'
where tier is null
  or tier not in ('T0', 'T1', 'T2', 'unknown');

update public.projects
set status = 'scoping'
where status is null
  or status not in ('scoping', 'building', 'live', 'paused', 'intake', 'scoped', 'awaiting_approval', 'active', 'review', 'complete', 'support');

alter table public.projects drop constraint if exists projects_tier_check;
alter table public.projects
  add constraint projects_tier_check
  check (tier in ('T0', 'T1', 'T2', 'unknown'));

alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects
  add constraint projects_status_check
  check (status in ('scoping', 'building', 'live', 'paused', 'intake', 'scoped', 'awaiting_approval', 'active', 'review', 'complete', 'support'));

alter table public.projects enable row level security;

drop policy if exists "projects_service_role_all" on public.projects;
create policy "projects_service_role_all"
on public.projects
for all
to service_role
using (true)
with check (true);

drop policy if exists "projects_anon_insert" on public.projects;
create policy "projects_anon_insert"
on public.projects
for insert
to anon
with check (true);

drop policy if exists "projects_authenticated_select" on public.projects;
create policy "projects_authenticated_select"
on public.projects
for select
to authenticated
using (true);

drop policy if exists "projects_authenticated_update" on public.projects;
create policy "projects_authenticated_update"
on public.projects
for update
to authenticated
using (true)
with check (true);

drop policy if exists "projects_authenticated_delete" on public.projects;
create policy "projects_authenticated_delete"
on public.projects
for delete
to authenticated
using (true);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();