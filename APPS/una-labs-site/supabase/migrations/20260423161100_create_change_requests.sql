create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'closed'))
);

alter table public.change_requests enable row level security;

drop policy if exists "change_requests_service_role_all" on public.change_requests;
create policy "change_requests_service_role_all"
on public.change_requests
for all
to service_role
using (true)
with check (true);

drop policy if exists "change_requests_authenticated_select" on public.change_requests;
create policy "change_requests_authenticated_select"
on public.change_requests
for select
to authenticated
using (true);

drop policy if exists "change_requests_authenticated_insert" on public.change_requests;
create policy "change_requests_authenticated_insert"
on public.change_requests
for insert
to authenticated
with check (true);

drop policy if exists "change_requests_authenticated_update" on public.change_requests;
create policy "change_requests_authenticated_update"
on public.change_requests
for update
to authenticated
using (true)
with check (true);