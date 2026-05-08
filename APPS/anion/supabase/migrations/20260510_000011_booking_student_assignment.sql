-- M4 family-specific booking ownership: tie bookings to a specific student.

alter table if exists public.bookings
  add column if not exists student_id uuid references public.students(id) on delete set null;

create index if not exists idx_bookings_student_id on public.bookings(student_id);

drop policy if exists bookings_insert_parent_own on public.bookings;
create policy bookings_insert_parent_own
  on public.bookings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.parents pr
      join public.profiles p on p.id = pr.profile_id
      where pr.id = bookings.parent_id
        and p.auth_user_id = auth.uid()
    )
    and (
      bookings.student_id is null
      or exists (
        select 1
        from public.parent_student_links l
        where l.parent_id = bookings.parent_id
          and l.student_id = bookings.student_id
      )
    )
  );

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
      where p.auth_user_id = auth.uid()
        and (
          bookings.student_id = s.id
          or (
            bookings.student_id is null
            and exists (
              select 1
              from public.parent_student_links l
              where l.student_id = s.id
                and l.parent_id = bookings.parent_id
            )
          )
        )
    )
  );
