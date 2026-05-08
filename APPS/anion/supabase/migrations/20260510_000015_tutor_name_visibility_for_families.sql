-- M4 identity consistency: expose tutor names to parents and students for related bookings.

drop policy if exists profiles_select_parent_booking_tutors on public.profiles;
create policy profiles_select_parent_booking_tutors
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tutors t
      join public.bookings b on b.tutor_id = t.id
      join public.parents pr on pr.id = b.parent_id
      join public.profiles parent_profile on parent_profile.id = pr.profile_id
      where t.profile_id = profiles.id
        and parent_profile.auth_user_id = auth.uid()
    )
  );

drop policy if exists profiles_select_student_booking_tutors on public.profiles;
create policy profiles_select_student_booking_tutors
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tutors t
      join public.bookings b on b.tutor_id = t.id
      join public.students s on true
      join public.profiles student_profile on student_profile.id = s.profile_id
      where t.profile_id = profiles.id
        and student_profile.auth_user_id = auth.uid()
        and (
          b.student_id = s.id
          or (
            b.student_id is null
            and exists (
              select 1
              from public.parent_student_links l
              where l.student_id = s.id
                and l.parent_id = b.parent_id
            )
          )
        )
    )
  );
