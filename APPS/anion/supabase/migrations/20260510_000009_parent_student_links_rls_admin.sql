-- M4 access control: secure parent/student/link tables and allow admin relationship management.

alter table if exists public.parents enable row level security;
alter table if exists public.students enable row level security;
alter table if exists public.parent_student_links enable row level security;

drop policy if exists parents_select_own_or_admin on public.parents;
create policy parents_select_own_or_admin
  on public.parents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = parents.profile_id
        and p.auth_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

drop policy if exists students_select_own_or_admin on public.students;
create policy students_select_own_or_admin
  on public.students
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = students.profile_id
        and p.auth_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

drop policy if exists parent_student_links_select_related_or_admin on public.parent_student_links;
create policy parent_student_links_select_related_or_admin
  on public.parent_student_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.parents pr
      join public.profiles p on p.id = pr.profile_id
      where pr.id = parent_student_links.parent_id
        and p.auth_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.students s
      join public.profiles p on p.id = s.profile_id
      where s.id = parent_student_links.student_id
        and p.auth_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

drop policy if exists parent_student_links_insert_admin_only on public.parent_student_links;
create policy parent_student_links_insert_admin_only
  on public.parent_student_links
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

drop policy if exists parent_student_links_delete_admin_only on public.parent_student_links;
create policy parent_student_links_delete_admin_only
  on public.parent_student_links
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'admin'
    )
  );
