-- Anion Phase 1 RLS Baseline
-- Applies ownership-scoped access for profile, tutor discovery, and booking workflows.

-- Helper claims for policy predicates.
create or replace function public.anion_is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from anion_user_roles ur
    join anion_profiles p on p.id = ur.profile_id
    where p.auth_user_id = auth.uid()
      and ur.role = 'admin'
  );
$$;

create or replace function public.anion_profile_id()
returns uuid
language sql
stable
as $$
  select p.id
  from anion_profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.anion_parent_id()
returns uuid
language sql
stable
as $$
  select ap.id
  from anion_parents ap
  where ap.profile_id = public.anion_profile_id()
  limit 1;
$$;

create or replace function public.anion_student_id()
returns uuid
language sql
stable
as $$
  select s.id
  from anion_students s
  where s.profile_id = public.anion_profile_id()
  limit 1;
$$;

create or replace function public.anion_tutor_id()
returns uuid
language sql
stable
as $$
  select t.id
  from anion_tutors t
  where t.profile_id = public.anion_profile_id()
  limit 1;
$$;

alter table anion_profiles enable row level security;
alter table anion_user_roles enable row level security;
alter table anion_students enable row level security;
alter table anion_tutors enable row level security;
alter table anion_parents enable row level security;
alter table anion_parent_student_links enable row level security;
alter table anion_bookings enable row level security;

drop policy if exists anion_profiles_select_own_or_admin on anion_profiles;
create policy anion_profiles_select_own_or_admin
on anion_profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.anion_is_admin()
  or exists (
    select 1
    from anion_tutors t
    where t.profile_id = anion_profiles.id
  )
);

drop policy if exists anion_profiles_insert_own on anion_profiles;
create policy anion_profiles_insert_own
on anion_profiles
for insert
to authenticated
with check (auth_user_id = auth.uid());

drop policy if exists anion_profiles_update_own_or_admin on anion_profiles;
create policy anion_profiles_update_own_or_admin
on anion_profiles
for update
to authenticated
using (auth_user_id = auth.uid() or public.anion_is_admin())
with check (auth_user_id = auth.uid() or public.anion_is_admin());

drop policy if exists anion_roles_select_own_or_admin on anion_user_roles;
create policy anion_roles_select_own_or_admin
on anion_user_roles
for select
to authenticated
using (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
);

drop policy if exists anion_students_select_scoped on anion_students;
create policy anion_students_select_scoped
on anion_students
for select
to authenticated
using (
  profile_id = public.anion_profile_id()
  or exists (
    select 1
    from anion_parent_student_links l
    where l.student_id = anion_students.id
      and l.parent_id = public.anion_parent_id()
  )
  or exists (
    select 1
    from anion_bookings b
    where b.student_id = anion_students.id
      and b.tutor_id = public.anion_tutor_id()
  )
  or public.anion_is_admin()
);

drop policy if exists anion_students_insert_own_or_admin on anion_students;
create policy anion_students_insert_own_or_admin
on anion_students
for insert
to authenticated
with check (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
);

drop policy if exists anion_students_update_own_or_admin on anion_students;
create policy anion_students_update_own_or_admin
on anion_students
for update
to authenticated
using (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
)
with check (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
);

drop policy if exists anion_tutors_select_authenticated on anion_tutors;
create policy anion_tutors_select_authenticated
on anion_tutors
for select
to authenticated
using (true);

drop policy if exists anion_tutors_insert_own_or_admin on anion_tutors;
create policy anion_tutors_insert_own_or_admin
on anion_tutors
for insert
to authenticated
with check (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
);

drop policy if exists anion_tutors_update_own_or_admin on anion_tutors;
create policy anion_tutors_update_own_or_admin
on anion_tutors
for update
to authenticated
using (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
)
with check (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
);

drop policy if exists anion_parents_select_own_or_admin on anion_parents;
create policy anion_parents_select_own_or_admin
on anion_parents
for select
to authenticated
using (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
);

drop policy if exists anion_parents_insert_own_or_admin on anion_parents;
create policy anion_parents_insert_own_or_admin
on anion_parents
for insert
to authenticated
with check (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
);

drop policy if exists anion_parents_update_own_or_admin on anion_parents;
create policy anion_parents_update_own_or_admin
on anion_parents
for update
to authenticated
using (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
)
with check (
  profile_id = public.anion_profile_id()
  or public.anion_is_admin()
);

drop policy if exists anion_parent_student_links_select_scoped on anion_parent_student_links;
create policy anion_parent_student_links_select_scoped
on anion_parent_student_links
for select
to authenticated
using (
  parent_id = public.anion_parent_id()
  or student_id = public.anion_student_id()
  or public.anion_is_admin()
);

drop policy if exists anion_parent_student_links_insert_own_or_admin on anion_parent_student_links;
create policy anion_parent_student_links_insert_own_or_admin
on anion_parent_student_links
for insert
to authenticated
with check (
  parent_id = public.anion_parent_id()
  or public.anion_is_admin()
);

drop policy if exists anion_bookings_select_scoped on anion_bookings;
create policy anion_bookings_select_scoped
on anion_bookings
for select
to authenticated
using (
  tutor_id = public.anion_tutor_id()
  or student_id = public.anion_student_id()
  or parent_id = public.anion_parent_id()
  or public.anion_is_admin()
);

drop policy if exists anion_bookings_insert_scoped on anion_bookings;
create policy anion_bookings_insert_scoped
on anion_bookings
for insert
to authenticated
with check (
  public.anion_is_admin()
  or (
    parent_id = public.anion_parent_id()
    and exists (
      select 1
      from anion_parent_student_links l
      where l.parent_id = anion_bookings.parent_id
        and l.student_id = anion_bookings.student_id
    )
  )
  or (
    parent_id is null
    and student_id = public.anion_student_id()
  )
);

drop policy if exists anion_bookings_update_scoped on anion_bookings;
create policy anion_bookings_update_scoped
on anion_bookings
for update
to authenticated
using (
  tutor_id = public.anion_tutor_id()
  or student_id = public.anion_student_id()
  or parent_id = public.anion_parent_id()
  or public.anion_is_admin()
)
with check (
  tutor_id = public.anion_tutor_id()
  or student_id = public.anion_student_id()
  or parent_id = public.anion_parent_id()
  or public.anion_is_admin()
);
