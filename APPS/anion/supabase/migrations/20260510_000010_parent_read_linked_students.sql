-- M4 parent visibility: parents can read student records linked to them.

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
      from public.parents pr
      join public.profiles p on p.id = pr.profile_id
      join public.parent_student_links l on l.parent_id = pr.id
      where p.auth_user_id = auth.uid()
        and l.student_id = students.id
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'admin'
    )
  );
