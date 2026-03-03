-- Guest trial schema extension (Option A)
-- Safe to run multiple times.

alter table guest_sessions
  add column if not exists guest_id varchar(36);

update guest_sessions
set guest_id = gen_random_uuid()::text
where guest_id is null;

alter table guest_sessions
  alter column guest_id set default gen_random_uuid()::text;

alter table guest_sessions
  alter column guest_id set not null;

create unique index if not exists guest_sessions_guest_id_key
  on guest_sessions (guest_id);

alter table guest_sessions
  add column if not exists last_seen_at timestamp;

update guest_sessions
set last_seen_at = coalesce(last_active, created_at, now())
where last_seen_at is null;

alter table guest_sessions
  alter column last_seen_at set default now();

alter table guest_sessions
  alter column last_seen_at set not null;

alter table guest_sessions
  add column if not exists upgraded_to_user_id varchar;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_sessions_upgraded_to_user_id_fkey'
  ) then
    alter table guest_sessions
      add constraint guest_sessions_upgraded_to_user_id_fkey
      foreign key (upgraded_to_user_id)
      references users(id);
  end if;
end $$;
