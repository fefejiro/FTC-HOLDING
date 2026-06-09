-- Production hardening: avoid recursive RLS lookups for role and lesson access.

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_has_role(expected_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = public.current_profile_id()
      and ur.role = expected_role
  )
$$;

create or replace function public.current_parent_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pr.id
  from public.parents pr
  where pr.profile_id = public.current_profile_id()
  limit 1
$$;

create or replace function public.current_tutor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.tutors t
  where t.profile_id = public.current_profile_id()
  limit 1
$$;

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.students s
  where s.profile_id = public.current_profile_id()
  limit 1
$$;

alter table if exists public.profiles enable row level security;
alter table if exists public.user_roles enable row level security;
alter table if exists public.parents enable row level security;
alter table if exists public.students enable row level security;
alter table if exists public.tutors enable row level security;
alter table if exists public.parent_student_links enable row level security;
alter table if exists public.bookings enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = auth_user_id);

drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own
  on public.user_roles
  for select
  to authenticated
  using (profile_id = public.current_profile_id());

drop policy if exists parents_select_own_or_admin on public.parents;
create policy parents_select_own_or_admin
  on public.parents
  for select
  to authenticated
  using (profile_id = public.current_profile_id() or public.current_user_has_role('admin'));

drop policy if exists students_select_own_or_admin on public.students;
create policy students_select_own_or_admin
  on public.students
  for select
  to authenticated
  using (
    profile_id = public.current_profile_id()
    or public.current_user_has_role('admin')
    or exists (
      select 1
      from public.parent_student_links l
      where l.student_id = students.id
        and l.parent_id = public.current_parent_id()
    )
    or exists (
      select 1
      from public.bookings b
      where b.student_id = students.id
        and b.tutor_id = public.current_tutor_id()
    )
  );

drop policy if exists tutors_select_own_or_admin on public.tutors;
create policy tutors_select_own_or_admin
  on public.tutors
  for select
  to authenticated
  using (
    profile_id = public.current_profile_id()
    or public.current_user_has_role('admin')
    or exists (
      select 1
      from public.bookings b
      where b.tutor_id = tutors.id
        and b.parent_id = public.current_parent_id()
    )
    or exists (
      select 1
      from public.bookings b
      where b.tutor_id = tutors.id
        and b.student_id = public.current_student_id()
    )
  );

drop policy if exists parent_student_links_select_related_or_admin on public.parent_student_links;
create policy parent_student_links_select_related_or_admin
  on public.parent_student_links
  for select
  to authenticated
  using (
    parent_id = public.current_parent_id()
    or student_id = public.current_student_id()
    or public.current_user_has_role('admin')
  );

drop policy if exists parent_student_links_insert_admin_only on public.parent_student_links;
create policy parent_student_links_insert_admin_only
  on public.parent_student_links
  for insert
  to authenticated
  with check (public.current_user_has_role('admin'));

drop policy if exists parent_student_links_delete_admin_only on public.parent_student_links;
create policy parent_student_links_delete_admin_only
  on public.parent_student_links
  for delete
  to authenticated
  using (public.current_user_has_role('admin'));

drop policy if exists bookings_select_parent_own on public.bookings;
create policy bookings_select_parent_own
  on public.bookings
  for select
  to authenticated
  using (parent_id = public.current_parent_id());

drop policy if exists bookings_select_tutor_own on public.bookings;
create policy bookings_select_tutor_own
  on public.bookings
  for select
  to authenticated
  using (tutor_id = public.current_tutor_id());

drop policy if exists bookings_select_student_linked_accepted on public.bookings;
create policy bookings_select_student_linked_accepted
  on public.bookings
  for select
  to authenticated
  using (
    status = 'accepted'
    and (
      student_id = public.current_student_id()
      or (
        student_id is null
        and exists (
          select 1
          from public.parent_student_links l
          where l.student_id = public.current_student_id()
            and l.parent_id = bookings.parent_id
        )
      )
    )
  );

drop policy if exists bookings_insert_parent_own on public.bookings;
create policy bookings_insert_parent_own
  on public.bookings
  for insert
  to authenticated
  with check (
    parent_id = public.current_parent_id()
    and (
      student_id is null
      or exists (
        select 1
        from public.parent_student_links l
        where l.parent_id = bookings.parent_id
          and l.student_id = bookings.student_id
      )
    )
  );

drop policy if exists bookings_update_tutor_status on public.bookings;
create policy bookings_update_tutor_status
  on public.bookings
  for update
  to authenticated
  using (tutor_id = public.current_tutor_id())
  with check (tutor_id = public.current_tutor_id() and status in ('accepted', 'declined'));

-- Keep profile visibility non-recursive. Relationship screens should tolerate
-- missing related display names rather than making auth/profile lookup fragile.
drop policy if exists profiles_select_admin_all on public.profiles;
drop policy if exists profiles_select_parent_linked_students on public.profiles;
drop policy if exists profiles_select_tutor_booking_students on public.profiles;
drop policy if exists profiles_select_student_linked_parents on public.profiles;
drop policy if exists profiles_select_tutor_booking_parents on public.profiles;
drop policy if exists profiles_select_parent_booking_tutors on public.profiles;
drop policy if exists profiles_select_student_booking_tutors on public.profiles;
