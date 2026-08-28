-- Replace legacy permissive portal policies. A signed-in client may see only
-- its own project records; the two Una Labs owner accounts retain operations
-- access. Server-side worker writes continue under service_role.

drop policy if exists "projects_authenticated_select" on public.projects;
drop policy if exists "projects_authenticated_update" on public.projects;
drop policy if exists "projects_authenticated_delete" on public.projects;
drop policy if exists "admin read all projects" on public.projects;
drop policy if exists "admin_read_all_projects" on public.projects;
drop policy if exists "admin_update_projects" on public.projects;
drop policy if exists "users read own projects" on public.projects;

create policy "projects_owner_select"
on public.projects
for select to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) in ('mike.fejiro@gmail.com', 'fejiro.efiuvwere@gmail.com')
  or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(email, client_email, ''))
);

create policy "projects_owner_update"
on public.projects
for update to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('mike.fejiro@gmail.com', 'fejiro.efiuvwere@gmail.com'))
with check (lower(coalesce(auth.jwt() ->> 'email', '')) in ('mike.fejiro@gmail.com', 'fejiro.efiuvwere@gmail.com'));

create policy "projects_owner_delete"
on public.projects
for delete to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('mike.fejiro@gmail.com', 'fejiro.efiuvwere@gmail.com'));

drop policy if exists "admin read all milestones" on public.milestones;
drop policy if exists "admin_read_all_milestones" on public.milestones;
create policy "milestones_owner_select"
on public.milestones
for select to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('mike.fejiro@gmail.com', 'fejiro.efiuvwere@gmail.com'));

drop policy if exists "anon insert milestones" on public.milestones;
create policy "milestones_owner_insert"
on public.milestones
for insert to authenticated
with check (lower(coalesce(auth.jwt() ->> 'email', '')) in ('mike.fejiro@gmail.com', 'fejiro.efiuvwere@gmail.com'));

drop policy if exists "admin_read_all_invoices" on public.invoices;
drop policy if exists "admin_update_invoices" on public.invoices;
drop policy if exists "service_insert_invoices" on public.invoices;
create policy "invoices_owner_select"
on public.invoices
for select to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('mike.fejiro@gmail.com', 'fejiro.efiuvwere@gmail.com'));

create policy "invoices_owner_update"
on public.invoices
for update to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('mike.fejiro@gmail.com', 'fejiro.efiuvwere@gmail.com'))
with check (lower(coalesce(auth.jwt() ->> 'email', '')) in ('mike.fejiro@gmail.com', 'fejiro.efiuvwere@gmail.com'));

create policy "invoices_service_insert"
on public.invoices
for insert to service_role
with check (true);
