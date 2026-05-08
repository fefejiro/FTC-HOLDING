-- M4 classroom support: allow linked students to read accepted bookings for lesson join UX.

drop policy if exists bookings_select_student_linked_accepted on public.bookings;
create policy bookings_select_student_linked_accepted
  on public.bookings
  for select
  to authenticated
  using (
    status = 'accepted'
    and exists (
      select 1
      from public.students s
      join public.profiles p on p.id = s.profile_id
      join public.parent_student_links l on l.student_id = s.id
      where p.auth_user_id = auth.uid()
        and l.parent_id = bookings.parent_id
    )
  );
