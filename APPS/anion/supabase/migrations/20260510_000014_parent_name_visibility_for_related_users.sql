-- M4 identity consistency: expose related parent names to linked students and assigned tutors.

drop policy if exists profiles_select_student_linked_parents on public.profiles;
create policy profiles_select_student_linked_parents
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.parents pr
      join public.parent_student_links l on l.parent_id = pr.id
      join public.students s on s.id = l.student_id
      join public.profiles student_profile on student_profile.id = s.profile_id
      where pr.profile_id = profiles.id
        and student_profile.auth_user_id = auth.uid()
    )
  );

drop policy if exists profiles_select_tutor_booking_parents on public.profiles;
create policy profiles_select_tutor_booking_parents
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.parents pr
      join public.bookings b on b.parent_id = pr.id
      join public.tutors t on t.id = b.tutor_id
      join public.profiles tutor_profile on tutor_profile.id = t.profile_id
      where pr.profile_id = profiles.id
        and tutor_profile.auth_user_id = auth.uid()
    )
  );
