-- PeacePad v2 module engine tracking tables
-- Safe to run multiple times.

create table if not exists pp_v2_module_runs (
  id varchar primary key default gen_random_uuid()::text,
  user_id varchar references users(id),
  session_id varchar,
  module_id varchar not null,
  started_at timestamp not null default now(),
  finished_at timestamp,
  conflict_level integer,
  safety_flags jsonb not null default '[]'::jsonb,
  input_hash varchar(64),
  output_hash varchar(64),
  status varchar not null default 'started',
  error_code varchar
);

create index if not exists pp_v2_module_runs_module_id_idx
  on pp_v2_module_runs (module_id);

create index if not exists pp_v2_module_runs_started_at_idx
  on pp_v2_module_runs (started_at);

create table if not exists pp_v2_launcher_state (
  id varchar primary key default gen_random_uuid()::text,
  user_id varchar references users(id),
  session_id varchar,
  pinned_modules jsonb not null default '[]'::jsonb,
  recent_modules jsonb not null default '[]'::jsonb,
  usage_counts jsonb not null default '{}'::jsonb,
  updated_at timestamp not null default now()
);

create index if not exists pp_v2_launcher_state_user_id_idx
  on pp_v2_launcher_state (user_id);

create index if not exists pp_v2_launcher_state_session_id_idx
  on pp_v2_launcher_state (session_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pp_v2_launcher_state_identity_check'
  ) then
    alter table pp_v2_launcher_state
      add constraint pp_v2_launcher_state_identity_check
      check (user_id is not null or session_id is not null);
  end if;
end $$;
