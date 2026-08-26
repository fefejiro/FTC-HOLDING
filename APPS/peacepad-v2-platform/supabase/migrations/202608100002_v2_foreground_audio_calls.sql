-- Persisted one-to-one foreground audio-call lifecycle foundation.
--
-- This migration intentionally contains no signaling, SDP, ICE, TURN, media,
-- recording, transcription, public join code, or arbitrary participant input.
-- The callee is derived from an active two-person canonical conversation and
-- both participants must hold active call permission in the same region and
-- family. Direct mobile-role access remains denied.

create table if not exists peacepad_v2.audio_call_session (
  call_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  conversation_id uuid not null references peacepad_v2.conversation(conversation_id),
  region text not null check (region in ('ca', 'us')),
  caller_identity_id uuid not null references peacepad_v2.identity(identity_id) on delete restrict,
  callee_identity_id uuid not null references peacepad_v2.identity(identity_id) on delete restrict,
  status text not null default 'ringing' check (status in ('ringing', 'active', 'declined', 'ended', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '60 seconds'),
  accepted_at timestamptz,
  ended_at timestamptz,
  ended_by_identity_id uuid references peacepad_v2.identity(identity_id) on delete restrict,
  end_reason text check (end_reason is null or end_reason in (
    'declined', 'caller_cancelled', 'participant_ended', 'ring_timeout', 'authorization_revoked'
  )),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  check (caller_identity_id <> callee_identity_id),
  check (expires_at > created_at),
  check (
    (status = 'ringing' and accepted_at is null and ended_at is null and ended_by_identity_id is null and end_reason is null)
    or (status = 'active' and accepted_at is not null and ended_at is null and ended_by_identity_id is null and end_reason is null)
    or (status = 'declined' and accepted_at is null and ended_at is not null and ended_by_identity_id = callee_identity_id and end_reason = 'declined')
    or (status = 'expired' and accepted_at is null and ended_at is not null and ended_by_identity_id is null and end_reason = 'ring_timeout')
    or (status = 'ended' and ended_at is not null and end_reason in ('caller_cancelled', 'participant_ended', 'authorization_revoked'))
  )
);

create unique index if not exists audio_call_one_live_conversation_idx
  on peacepad_v2.audio_call_session (conversation_id)
  where status in ('ringing', 'active');
create index if not exists audio_call_participant_current_idx
  on peacepad_v2.audio_call_session (region, caller_identity_id, callee_identity_id, created_at desc)
  where status in ('ringing', 'active');
create index if not exists audio_call_expiry_idx
  on peacepad_v2.audio_call_session (region, expires_at)
  where status = 'ringing';

alter table peacepad_v2.audio_call_session enable row level security;
revoke all on table peacepad_v2.audio_call_session from public, anon, authenticated;

create or replace function peacepad_v2.can_call(
  p_identity_id uuid,
  p_family_id uuid,
  p_region text
)
returns boolean
language sql
stable
set search_path = pg_catalog, peacepad_v2
as $$
  select exists (
    select 1
    from peacepad_v2.participant_grant grant_row
    join peacepad_v2.identity identity_row
      on identity_row.identity_id = grant_row.identity_id
     and identity_row.region = p_region
     and identity_row.deleted_at is null
    join peacepad_v2.family_circle family_row
      on family_row.family_id = grant_row.family_id
     and family_row.region = p_region
     and family_row.deleted_at is null
    where grant_row.identity_id = p_identity_id
      and grant_row.family_id = p_family_id
      and grant_row.region = p_region
      and grant_row.revoked_at is null
      and (
        'calls' = any(grant_row.permissions)
        or 'call.start' = any(grant_row.permissions)
        or 'family.manage' = any(grant_row.permissions)
      )
  );
$$;

create or replace function peacepad_v2.authorized_audio_call_conversation(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid
)
returns peacepad_v2.conversation
language plpgsql
set search_path = pg_catalog, peacepad_v2
as $$
declare
  conversation_row peacepad_v2.conversation%rowtype;
  participant_id uuid;
begin
  select * into conversation_row
  from peacepad_v2.conversation
  where conversation_id = p_conversation_id
    and region = p_region
    and status = 'active'
  for share;

  if not found
     or cardinality(conversation_row.participant_identity_ids) <> 2
     or not (p_identity_id = any(conversation_row.participant_identity_ids)) then
    raise exception using errcode = '42501', message = 'CALL_ACCESS_DENIED';
  end if;

  foreach participant_id in array conversation_row.participant_identity_ids loop
    perform 1
    from peacepad_v2.participant_grant grant_row
    join peacepad_v2.identity identity_row
      on identity_row.identity_id = grant_row.identity_id
     and identity_row.region = p_region
     and identity_row.deleted_at is null
    join peacepad_v2.family_circle family_row
      on family_row.family_id = grant_row.family_id
     and family_row.region = p_region
     and family_row.deleted_at is null
    where grant_row.identity_id = participant_id
      and grant_row.family_id = conversation_row.family_id
      and grant_row.region = p_region
      and grant_row.revoked_at is null
      and (
        'calls' = any(grant_row.permissions)
        or 'call.start' = any(grant_row.permissions)
        or 'family.manage' = any(grant_row.permissions)
      )
    for share of grant_row, identity_row, family_row;
    if not found then
      raise exception using errcode = '42501', message = 'CALL_ACCESS_DENIED';
    end if;
  end loop;
  return conversation_row;
end;
$$;

create or replace function peacepad_v2.audio_call_json(row_value peacepad_v2.audio_call_session)
returns jsonb
language sql
stable
set search_path = pg_catalog, peacepad_v2
as $$
  select jsonb_build_object(
    'id', row_value.call_id,
    'familyCircleId', row_value.family_id,
    'conversationId', row_value.conversation_id,
    'callerIdentityId', row_value.caller_identity_id,
    'calleeIdentityId', row_value.callee_identity_id,
    'type', 'audio',
    'status', row_value.status,
    'createdAt', row_value.created_at,
    'expiresAt', row_value.expires_at,
    'acceptedAt', row_value.accepted_at,
    'endedAt', row_value.ended_at,
    'endedByIdentityId', row_value.ended_by_identity_id,
    'endReason', row_value.end_reason,
    'schemaVersion', '2.0',
    'version', row_value.version,
    'region', row_value.region
  );
$$;

create or replace function peacepad_v2.expire_audio_calls(
  p_region text,
  p_conversation_id uuid default null
)
returns integer
language plpgsql
set search_path = pg_catalog, peacepad_v2, extensions
as $$
declare
  affected integer;
begin
  if p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'REGION_INVALID';
  end if;

  with expired as (
    update peacepad_v2.audio_call_session call_row
    set status = 'expired',
        ended_at = now(),
        end_reason = 'ring_timeout',
        updated_at = now(),
        version = call_row.version + 1
    where call_row.region = p_region
      and call_row.status = 'ringing'
      and call_row.expires_at <= now()
      and (p_conversation_id is null or call_row.conversation_id = p_conversation_id)
    returning call_row.*
  ), audited as (
    insert into peacepad_v2.audit_event (
      audit_event_id, identity_id, family_id, region, event_type, schema_version, idempotency_key
    )
    select gen_random_uuid(), expired.caller_identity_id, expired.family_id, expired.region,
      'call.expired', 2,
      substring(encode(extensions.digest('call.expired:' || expired.call_id::text, 'sha256'), 'hex') from 1 for 48)
    from expired
    on conflict (identity_id, idempotency_key) do nothing
    returning 1
  )
  select count(*) into affected from expired;
  return affected;
end;
$$;

create or replace function public.peacepad_v2_create_audio_call(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  conversation_row peacepad_v2.conversation%rowtype;
  call_row peacepad_v2.audio_call_session%rowtype;
  callee_id uuid;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if p_region not in ('ca', 'us') then raise exception using errcode = '22023', message = 'REGION_INVALID'; end if;

  conversation_row := peacepad_v2.authorized_audio_call_conversation(p_identity_id, p_region, p_conversation_id);
  select participant into callee_id
  from unnest(conversation_row.participant_identity_ids) as participant
  where participant <> p_identity_id;
  if callee_id is null then raise exception using errcode = '42501', message = 'CALL_ACCESS_DENIED'; end if;

  perform pg_advisory_xact_lock(hashtextextended('audio-call:' || p_conversation_id::text, 0));
  perform peacepad_v2.expire_audio_calls(p_region, p_conversation_id);
  if exists (
    select 1 from peacepad_v2.audio_call_session
    where conversation_id = p_conversation_id and region = p_region and status in ('ringing', 'active')
  ) then raise exception using errcode = 'P0001', message = 'CALL_ALREADY_ACTIVE'; end if;

  insert into peacepad_v2.audio_call_session (
    call_id, family_id, conversation_id, region, caller_identity_id, callee_identity_id
  ) values (
    gen_random_uuid(), conversation_row.family_id, p_conversation_id, p_region, p_identity_id, callee_id
  ) returning * into call_row;
  response := peacepad_v2.audio_call_json(call_row);
  perform peacepad_v2.record_write(
    p_identity_id, call_row.family_id, p_region, 'call.created', p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

create or replace function public.peacepad_v2_accept_audio_call(
  p_identity_id uuid,
  p_region text,
  p_call_id uuid,
  p_expected_version integer,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  call_row peacepad_v2.audio_call_session%rowtype;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  perform peacepad_v2.expire_audio_calls(p_region, null);
  select * into call_row from peacepad_v2.audio_call_session
  where call_id = p_call_id and region = p_region for update;
  if not found or call_row.callee_identity_id <> p_identity_id then
    raise exception using errcode = '42501', message = 'CALL_ACCESS_DENIED'; end if;
  perform peacepad_v2.authorized_audio_call_conversation(p_identity_id, p_region, call_row.conversation_id);
  if call_row.status <> 'ringing' then raise exception using errcode = 'P0001', message = 'CALL_STATE_INVALID'; end if;
  if p_expected_version is null or call_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;

  update peacepad_v2.audio_call_session
  set status = 'active', accepted_at = now(), updated_at = now(), version = version + 1
  where call_id = p_call_id returning * into call_row;
  response := peacepad_v2.audio_call_json(call_row);
  perform peacepad_v2.record_write(
    p_identity_id, call_row.family_id, p_region, 'call.accepted', p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

create or replace function public.peacepad_v2_decline_audio_call(
  p_identity_id uuid,
  p_region text,
  p_call_id uuid,
  p_expected_version integer,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  call_row peacepad_v2.audio_call_session%rowtype;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  perform peacepad_v2.expire_audio_calls(p_region, null);
  select * into call_row from peacepad_v2.audio_call_session
  where call_id = p_call_id and region = p_region for update;
  if not found or call_row.callee_identity_id <> p_identity_id then
    raise exception using errcode = '42501', message = 'CALL_ACCESS_DENIED'; end if;
  perform peacepad_v2.authorized_audio_call_conversation(p_identity_id, p_region, call_row.conversation_id);
  if call_row.status <> 'ringing' then raise exception using errcode = 'P0001', message = 'CALL_STATE_INVALID'; end if;
  if p_expected_version is null or call_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;

  update peacepad_v2.audio_call_session
  set status = 'declined', ended_at = now(), ended_by_identity_id = p_identity_id,
      end_reason = 'declined', updated_at = now(), version = version + 1
  where call_id = p_call_id returning * into call_row;
  response := peacepad_v2.audio_call_json(call_row);
  perform peacepad_v2.record_write(
    p_identity_id, call_row.family_id, p_region, 'call.declined', p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

create or replace function public.peacepad_v2_end_audio_call(
  p_identity_id uuid,
  p_region text,
  p_call_id uuid,
  p_expected_version integer,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  call_row peacepad_v2.audio_call_session%rowtype;
  existing_result jsonb;
  response jsonb;
  reason text;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  perform peacepad_v2.expire_audio_calls(p_region, null);
  select * into call_row from peacepad_v2.audio_call_session
  where call_id = p_call_id and region = p_region for update;
  if not found or p_identity_id not in (call_row.caller_identity_id, call_row.callee_identity_id) then
    raise exception using errcode = '42501', message = 'CALL_ACCESS_DENIED'; end if;
  perform peacepad_v2.authorized_audio_call_conversation(p_identity_id, p_region, call_row.conversation_id);
  if call_row.status not in ('ringing', 'active')
     or (call_row.status = 'ringing' and call_row.caller_identity_id <> p_identity_id) then
    raise exception using errcode = 'P0001', message = 'CALL_STATE_INVALID'; end if;
  if p_expected_version is null or call_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;
  reason := case when call_row.status = 'ringing' then 'caller_cancelled' else 'participant_ended' end;

  update peacepad_v2.audio_call_session
  set status = 'ended', ended_at = now(), ended_by_identity_id = p_identity_id,
      end_reason = reason, updated_at = now(), version = version + 1
  where call_id = p_call_id returning * into call_row;
  response := peacepad_v2.audio_call_json(call_row);
  perform peacepad_v2.record_write(
    p_identity_id, call_row.family_id, p_region, 'call.ended', p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

create or replace function public.peacepad_v2_get_current_audio_call(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  call_row peacepad_v2.audio_call_session%rowtype;
begin
  perform peacepad_v2.authorized_audio_call_conversation(p_identity_id, p_region, p_conversation_id);
  perform peacepad_v2.expire_audio_calls(p_region, p_conversation_id);
  select * into call_row from peacepad_v2.audio_call_session
  where conversation_id = p_conversation_id
    and region = p_region
    and p_identity_id in (caller_identity_id, callee_identity_id)
    and status in ('ringing', 'active')
  order by created_at desc limit 1;
  return case when found then peacepad_v2.audio_call_json(call_row) else null end;
end;
$$;

create or replace function peacepad_v2.close_calls_after_grant_revocation()
returns trigger
language plpgsql
set search_path = pg_catalog, peacepad_v2
as $$
begin
  if old.revoked_at is null and new.revoked_at is not null then
    with closed as (
      update peacepad_v2.audio_call_session call_row
      set status = 'ended', ended_at = now(), ended_by_identity_id = null,
          end_reason = 'authorization_revoked', updated_at = now(), version = call_row.version + 1
      where call_row.family_id = new.family_id
        and call_row.region = new.region
        and new.identity_id in (call_row.caller_identity_id, call_row.callee_identity_id)
        and call_row.status in ('ringing', 'active')
      returning call_row.*
    )
    insert into peacepad_v2.audit_event (
      audit_event_id, identity_id, family_id, region, event_type, schema_version, idempotency_key
    )
    select gen_random_uuid(), new.identity_id, closed.family_id, closed.region,
      'call.authorization_revoked', 2,
      substring(encode(extensions.digest('call.authorization_revoked:' || closed.call_id::text, 'sha256'), 'hex') from 1 for 48)
    from closed
    on conflict (identity_id, idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists participant_grant_close_audio_calls on peacepad_v2.participant_grant;
create trigger participant_grant_close_audio_calls
after update of revoked_at on peacepad_v2.participant_grant
for each row execute function peacepad_v2.close_calls_after_grant_revocation();

create or replace function peacepad_v2.close_calls_after_conversation_archive()
returns trigger
language plpgsql
set search_path = pg_catalog, peacepad_v2
as $$
begin
  if old.status = 'active' and new.status <> 'active' then
    with closed as (
      update peacepad_v2.audio_call_session call_row
      set status = 'ended', ended_at = now(), ended_by_identity_id = null,
          end_reason = 'authorization_revoked', updated_at = now(), version = call_row.version + 1
      where call_row.conversation_id = new.conversation_id
        and call_row.region = new.region
        and call_row.status in ('ringing', 'active')
      returning call_row.*
    )
    insert into peacepad_v2.audit_event (
      audit_event_id, identity_id, family_id, region, event_type, schema_version, idempotency_key
    )
    select gen_random_uuid(), closed.caller_identity_id, closed.family_id, closed.region,
      'call.authorization_revoked', 2,
      substring(encode(extensions.digest('call.authorization_revoked:' || closed.call_id::text, 'sha256'), 'hex') from 1 for 48)
    from closed
    on conflict (identity_id, idempotency_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists conversation_archive_close_audio_calls on peacepad_v2.conversation;
create trigger conversation_archive_close_audio_calls
after update of status on peacepad_v2.conversation
for each row execute function peacepad_v2.close_calls_after_conversation_archive();

revoke all on function peacepad_v2.can_call(uuid, uuid, text) from public, anon, authenticated;
revoke all on function peacepad_v2.authorized_audio_call_conversation(uuid, text, uuid) from public, anon, authenticated;
revoke all on function peacepad_v2.audio_call_json(peacepad_v2.audio_call_session) from public, anon, authenticated;
revoke all on function peacepad_v2.expire_audio_calls(text, uuid) from public, anon, authenticated;
revoke all on function public.peacepad_v2_create_audio_call(uuid, text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_accept_audio_call(uuid, text, uuid, integer, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_decline_audio_call(uuid, text, uuid, integer, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_end_audio_call(uuid, text, uuid, integer, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_get_current_audio_call(uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.peacepad_v2_create_audio_call(uuid, text, uuid, text, integer) to service_role;
grant execute on function public.peacepad_v2_accept_audio_call(uuid, text, uuid, integer, text, integer) to service_role;
grant execute on function public.peacepad_v2_decline_audio_call(uuid, text, uuid, integer, text, integer) to service_role;
grant execute on function public.peacepad_v2_end_audio_call(uuid, text, uuid, integer, text, integer) to service_role;
grant execute on function public.peacepad_v2_get_current_audio_call(uuid, text, uuid) to service_role;

comment on table peacepad_v2.audio_call_session is
  'Authorized one-to-one foreground audio-call lifecycle metadata. Contains no signaling, media, recording, transcription, public join code, or user-entered reason.';
