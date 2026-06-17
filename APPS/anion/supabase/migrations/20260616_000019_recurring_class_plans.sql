-- Recurring class plans: manual setup once, accepted bookings generated automatically.

create table if not exists public.class_plans (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  subject text not null,
  timezone text not null default 'Africa/Lagos',
  days_of_week integer[] not null,
  start_time text not null,
  duration_minutes integer not null default 50 check (duration_minutes >= 30 and duration_minutes <= 240),
  buffer_minutes integer not null default 10 check (buffer_minutes >= 0 and buffer_minutes <= 120),
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_length(days_of_week, 1) > 0),
  check (days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]),
  check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  check (end_date is null or end_date >= start_date)
);

alter table if exists public.bookings
  add column if not exists class_plan_id uuid references public.class_plans(id) on delete set null,
  add column if not exists booking_kind text not null default 'one_off' check (booking_kind in ('one_off', 'recurring')),
  add column if not exists buffer_minutes integer not null default 10 check (buffer_minutes >= 0 and buffer_minutes <= 120);

create index if not exists idx_class_plans_parent_id on public.class_plans(parent_id);
create index if not exists idx_class_plans_student_id on public.class_plans(student_id);
create index if not exists idx_class_plans_tutor_id on public.class_plans(tutor_id);
create index if not exists idx_class_plans_status on public.class_plans(status);
create index if not exists idx_bookings_class_plan_id on public.bookings(class_plan_id);
create index if not exists idx_bookings_tutor_start on public.bookings(tutor_id, requested_start_at);
create index if not exists idx_bookings_student_start on public.bookings(student_id, requested_start_at);

alter table if exists public.class_plans enable row level security;

drop policy if exists class_plans_select_related_or_admin on public.class_plans;
create policy class_plans_select_related_or_admin
  on public.class_plans
  for select
  to authenticated
  using (
    parent_id = public.current_parent_id()
    or student_id = public.current_student_id()
    or tutor_id = public.current_tutor_id()
    or public.current_user_has_role('admin')
  );

drop policy if exists class_plans_insert_admin_only on public.class_plans;
create policy class_plans_insert_admin_only
  on public.class_plans
  for insert
  to authenticated
  with check (public.current_user_has_role('admin'));

drop policy if exists class_plans_update_admin_only on public.class_plans;
create policy class_plans_update_admin_only
  on public.class_plans
  for update
  to authenticated
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));

drop policy if exists class_plans_delete_admin_only on public.class_plans;
create policy class_plans_delete_admin_only
  on public.class_plans
  for delete
  to authenticated
  using (public.current_user_has_role('admin'));

drop policy if exists bookings_select_admin_all on public.bookings;
create policy bookings_select_admin_all
  on public.bookings
  for select
  to authenticated
  using (public.current_user_has_role('admin'));

drop policy if exists bookings_insert_admin_recurring on public.bookings;
create policy bookings_insert_admin_recurring
  on public.bookings
  for insert
  to authenticated
  with check (
    public.current_user_has_role('admin')
    and booking_kind = 'recurring'
    and status = 'accepted'
    and class_plan_id is not null
  );

drop policy if exists bookings_update_admin_all on public.bookings;
create policy bookings_update_admin_all
  on public.bookings
  for update
  to authenticated
  using (public.current_user_has_role('admin'))
  with check (public.current_user_has_role('admin'));
