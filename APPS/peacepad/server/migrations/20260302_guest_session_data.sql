-- Guest session data table for session-scoped persistence + cleanup
-- Safe to run multiple times.

create table if not exists guest_session_data (
  id varchar primary key default gen_random_uuid()::text,
  guest_session_id varchar not null references guest_sessions(session_id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create index if not exists guest_session_data_session_id_idx
  on guest_session_data (guest_session_id);
