-- PeacePad v2 conversation orchestrator persistence tables
-- Additive and safe to run multiple times.

create table if not exists pp_v2_conversation_sessions (
  session_id uuid primary key default gen_random_uuid(),
  user_id varchar references users(id),
  created_at timestamp not null default now(),
  last_active_at timestamp not null default now()
);

create index if not exists pp_v2_conversation_sessions_user_id_idx
  on pp_v2_conversation_sessions (user_id);

create index if not exists pp_v2_conversation_sessions_last_active_at_idx
  on pp_v2_conversation_sessions (last_active_at);

create table if not exists pp_v2_conversation_messages (
  id varchar primary key default gen_random_uuid()::text,
  session_id uuid not null references pp_v2_conversation_sessions(session_id) on delete cascade,
  role varchar not null,
  text text not null,
  mode varchar not null,
  intent_id varchar,
  created_at timestamp not null default now()
);

create index if not exists pp_v2_conversation_messages_session_created_at_idx
  on pp_v2_conversation_messages (session_id, created_at);

create index if not exists pp_v2_conversation_messages_role_idx
  on pp_v2_conversation_messages (role);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pp_v2_conversation_messages_role_check'
  ) then
    alter table pp_v2_conversation_messages
      add constraint pp_v2_conversation_messages_role_check
      check (role in ('user', 'assistant'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pp_v2_conversation_messages_mode_check'
  ) then
    alter table pp_v2_conversation_messages
      add constraint pp_v2_conversation_messages_mode_check
      check (mode in ('narration', 'task'));
  end if;
end $$;

create table if not exists pp_v2_coparent_profiles (
  id varchar primary key default gen_random_uuid()::text,
  user_id varchar references users(id),
  label varchar,
  coparent_style varchar,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamp not null default now()
);

create index if not exists pp_v2_coparent_profiles_user_id_idx
  on pp_v2_coparent_profiles (user_id);
