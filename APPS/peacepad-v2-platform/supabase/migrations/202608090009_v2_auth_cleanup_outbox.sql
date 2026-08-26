-- Durable Supabase Auth cleanup after PeacePad application-account deletion.
-- Application identities remain anonymized record anchors and therefore must
-- not cascade from auth.users.

alter table peacepad_v2.identity
  drop constraint if exists identity_identity_id_fkey;

alter table peacepad_v2.identity
  add column if not exists auth_principal_deleted_at timestamptz;

create table if not exists peacepad_v2.auth_cleanup_outbox (
  identity_id uuid primary key references peacepad_v2.identity(identity_id),
  region text not null check (region in ('ca', 'us')),
  requested_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text check (last_error_code is null or last_error_code in ('AUTH_DELETE_FAILED', 'AUTH_USER_NOT_FOUND'))
);

create index if not exists auth_cleanup_outbox_ready
  on peacepad_v2.auth_cleanup_outbox(region, next_attempt_at, requested_at);

alter table peacepad_v2.auth_cleanup_outbox enable row level security;
revoke all on table peacepad_v2.auth_cleanup_outbox from public, anon, authenticated;
grant select, insert, update, delete on table peacepad_v2.auth_cleanup_outbox to service_role;

create or replace function peacepad_v2.queue_auth_cleanup()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    insert into peacepad_v2.auth_cleanup_outbox(identity_id, region)
    values (new.identity_id, new.region)
    on conflict (identity_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists identity_auth_cleanup_queue on peacepad_v2.identity;
create trigger identity_auth_cleanup_queue
after update of deleted_at on peacepad_v2.identity
for each row execute function peacepad_v2.queue_auth_cleanup();

insert into peacepad_v2.auth_cleanup_outbox(identity_id, region)
select identity.identity_id, identity.region
from peacepad_v2.identity identity
where identity.deleted_at is not null
  and identity.auth_principal_deleted_at is null
on conflict (identity_id) do nothing;

create or replace function public.peacepad_v2_ack_auth_cleanup(p_identity_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
begin
  if p_identity_id is null then
    raise exception using errcode = '22023', message = 'INVALID_REQUEST';
  end if;
  update peacepad_v2.identity
  set auth_principal_deleted_at = coalesce(auth_principal_deleted_at, now())
  where identity_id = p_identity_id and deleted_at is not null;
  if not found then
    raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND';
  end if;
  delete from peacepad_v2.auth_cleanup_outbox where identity_id = p_identity_id;
  return true;
end;
$$;

create or replace function public.peacepad_v2_claim_auth_cleanup(
  p_region text,
  p_limit integer,
  p_lease_seconds integer
)
returns table(identity_id uuid, region text, attempt_count integer, lease_token uuid)
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
begin
  if p_region is null or p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'REGION_MISMATCH';
  end if;
  if p_limit is null or p_limit not between 1 and 10 then
    raise exception using errcode = '22023', message = 'INVALID_REQUEST';
  end if;
  if p_lease_seconds is null or p_lease_seconds not between 30 and 300 then
    raise exception using errcode = '22023', message = 'INVALID_REQUEST';
  end if;

  return query
  with candidates as (
    select cleanup.identity_id
    from peacepad_v2.auth_cleanup_outbox cleanup
    where cleanup.region = p_region
      and cleanup.next_attempt_at <= now()
      and (cleanup.lease_expires_at is null or cleanup.lease_expires_at <= now())
    order by cleanup.next_attempt_at, cleanup.requested_at
    for update skip locked
    limit p_limit
  )
  update peacepad_v2.auth_cleanup_outbox cleanup
  set attempt_count = cleanup.attempt_count + 1,
      last_attempt_at = now(),
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds)
  from candidates
  where cleanup.identity_id = candidates.identity_id
  returning cleanup.identity_id, cleanup.region, cleanup.attempt_count, cleanup.lease_token;
end;
$$;

create or replace function public.peacepad_v2_finish_auth_cleanup(
  p_identity_id uuid,
  p_lease_token uuid,
  p_succeeded boolean,
  p_failure_code text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  cleanup peacepad_v2.auth_cleanup_outbox%rowtype;
begin
  if p_identity_id is null or p_lease_token is null or p_succeeded is null then
    raise exception using errcode = '22023', message = 'INVALID_REQUEST';
  end if;
  if not p_succeeded and (p_failure_code is null or p_failure_code not in ('AUTH_DELETE_FAILED', 'AUTH_USER_NOT_FOUND')) then
    raise exception using errcode = '22023', message = 'INVALID_REQUEST';
  end if;

  select * into cleanup
  from peacepad_v2.auth_cleanup_outbox
  where identity_id = p_identity_id
    and lease_token = p_lease_token
    and lease_expires_at > now()
  for update;
  if not found then
    raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT';
  end if;

  if p_succeeded then
    update peacepad_v2.identity
    set auth_principal_deleted_at = coalesce(auth_principal_deleted_at, now())
    where identity_id = p_identity_id and deleted_at is not null;
    delete from peacepad_v2.auth_cleanup_outbox where identity_id = p_identity_id;
    return jsonb_build_object('status', 'completed');
  end if;

  update peacepad_v2.auth_cleanup_outbox
  set next_attempt_at = now() + make_interval(mins => least(1440, power(2, least(cleanup.attempt_count, 10))::integer)),
      lease_token = null,
      lease_expires_at = null,
      last_error_code = p_failure_code
  where identity_id = p_identity_id;
  return jsonb_build_object('status', 'pending', 'attemptCount', cleanup.attempt_count);
end;
$$;

revoke all on function public.peacepad_v2_ack_auth_cleanup(uuid) from public, anon, authenticated;
revoke all on function public.peacepad_v2_claim_auth_cleanup(text, integer, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_finish_auth_cleanup(uuid, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.peacepad_v2_ack_auth_cleanup(uuid) to service_role;
grant execute on function public.peacepad_v2_claim_auth_cleanup(text, integer, integer) to service_role;
grant execute on function public.peacepad_v2_finish_auth_cleanup(uuid, uuid, boolean, text) to service_role;
