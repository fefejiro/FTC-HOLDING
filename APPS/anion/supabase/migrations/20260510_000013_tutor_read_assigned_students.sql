-- M4 tutor usability: tutors can read student rows for bookings assigned to them.

drop policy if exists students_select_tutor_assigned on public.students;
create policy students_select_tutor_assigned
  on public.students
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      join public.tutors t on t.id = b.tutor_id
      join public.profiles p on p.id = t.profile_id
      where b.student_id = students.id
        and p.auth_user_id = auth.uid()
    )
  );
