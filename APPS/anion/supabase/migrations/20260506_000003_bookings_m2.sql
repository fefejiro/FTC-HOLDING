-- M2 booking vertical slice: parent booking requests + tutor decision workflow.

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parents(id) on delete cascade,
  tutor_id uuid not null references public.tutors(id) on delete cascade,
  subject text not null,
  requested_start_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes >= 30 and duration_minutes <= 240),
  notes text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_parent_id on public.bookings(parent_id);
create index if not exists idx_bookings_tutor_id on public.bookings(tutor_id);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_requested_start_at on public.bookings(requested_start_at);

alter table if exists public.bookings enable row level security;

-- Parent can read only their own bookings.
drop policy if exists bookings_select_parent_own on public.bookings;
create policy bookings_select_parent_own
  on public.bookings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.parents pr
      join public.profiles p on p.id = pr.profile_id
      where pr.id = bookings.parent_id
        and p.auth_user_id = auth.uid()
    )
  );

-- Tutor can read only bookings assigned to them.
drop policy if exists bookings_select_tutor_own on public.bookings;
create policy bookings_select_tutor_own
  on public.bookings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tutors t
      join public.profiles p on p.id = t.profile_id
      where t.id = bookings.tutor_id
        and p.auth_user_id = auth.uid()
    )
  );

-- Parent can create bookings only for themselves.
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
  );

-- Tutor can update status only for their assigned bookings.
drop policy if exists bookings_update_tutor_status on public.bookings;
create policy bookings_update_tutor_status
  on public.bookings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.tutors t
      join public.profiles p on p.id = t.profile_id
      where t.id = bookings.tutor_id
        and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tutors t
      join public.profiles p on p.id = t.profile_id
      where t.id = bookings.tutor_id
        and p.auth_user_id = auth.uid()
    )
    and status in ('accepted', 'declined')
  );