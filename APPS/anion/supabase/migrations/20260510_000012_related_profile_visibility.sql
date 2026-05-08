-- M4 usability: expose related profile names to admins, linked parents, and assigned tutors.

drop policy if exists profiles_select_admin_all on public.profiles;
create policy profiles_select_admin_all
  on public.profiles
  for select
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

drop policy if exists profiles_select_parent_linked_students on public.profiles;
create policy profiles_select_parent_linked_students
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      join public.parent_student_links l on l.student_id = s.id
      join public.parents pr on pr.id = l.parent_id
      join public.profiles parent_profile on parent_profile.id = pr.profile_id
      where s.profile_id = profiles.id
        and parent_profile.auth_user_id = auth.uid()
    )
  );

drop policy if exists profiles_select_tutor_booking_students on public.profiles;
create policy profiles_select_tutor_booking_students
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      join public.bookings b on b.student_id = s.id
      join public.tutors t on t.id = b.tutor_id
      join public.profiles tutor_profile on tutor_profile.id = t.profile_id
      where s.profile_id = profiles.id
        and tutor_profile.auth_user_id = auth.uid()
    )
  );
