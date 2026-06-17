-- M4 classroom collaboration: booking-scoped realtime whiteboard events.

create table if not exists public.whiteboard_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id) on delete cascade,
  author_role text not null check (author_role in ('student', 'tutor')),
  event_type text not null check (event_type in ('stroke', 'erase', 'clear')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_whiteboard_events_booking_created_at
  on public.whiteboard_events(booking_id, created_at asc);

create index if not exists idx_whiteboard_events_author_profile_id
  on public.whiteboard_events(author_profile_id);

alter table if exists public.whiteboard_events enable row level security;

drop policy if exists whiteboard_events_select_assigned_student_tutor on public.whiteboard_events;
create policy whiteboard_events_select_assigned_student_tutor
  on public.whiteboard_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = whiteboard_events.booking_id
        and b.status = 'accepted'
        and (
          b.student_id = public.current_student_id()
          or b.tutor_id = public.current_tutor_id()
        )
    )
  );

drop policy if exists whiteboard_events_insert_assigned_student_tutor on public.whiteboard_events;
create policy whiteboard_events_insert_assigned_student_tutor
  on public.whiteboard_events
  for insert
  to authenticated
  with check (
    author_profile_id = public.current_profile_id()
    and (
      (
        author_role = 'student'
        and exists (
          select 1
          from public.bookings b
          where b.id = whiteboard_events.booking_id
            and b.status = 'accepted'
            and b.student_id = public.current_student_id()
        )
      )
      or (
        author_role = 'tutor'
        and exists (
          select 1
          from public.bookings b
          where b.id = whiteboard_events.booking_id
            and b.status = 'accepted'
            and b.tutor_id = public.current_tutor_id()
        )
      )
    )
  );

alter publication supabase_realtime add table public.whiteboard_events;
