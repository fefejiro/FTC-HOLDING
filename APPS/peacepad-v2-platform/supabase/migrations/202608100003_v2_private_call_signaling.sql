-- Private, server-relayed call signaling authorization metadata.
-- Signal payloads (including SDP and ICE) are never passed to PostgreSQL,
-- written to audit, or sent through database-origin Broadcast/replay.

create table if not exists peacepad_v2.audio_call_signal_window (
  call_id uuid not null references peacepad_v2.audio_call_session(call_id) on delete cascade,
  identity_id uuid not null references peacepad_v2.identity(identity_id) on delete cascade,
  window_started_at timestamptz not null,
  signal_count integer not null check (signal_count > 0),
  expires_at timestamptz not null,
  primary key (call_id, identity_id),
  check (expires_at > window_started_at)
);

create index if not exists audio_call_signal_window_expiry_idx
  on peacepad_v2.audio_call_signal_window (expires_at);
alter table peacepad_v2.audio_call_signal_window enable row level security;
revoke all on table peacepad_v2.audio_call_signal_window from public, anon, authenticated;

create or replace function peacepad_v2.can_subscribe_audio_call_topic(
  p_identity_id uuid,
  p_topic text,
  p_extension text
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  topic_call_id uuid;
  topic_version integer;
begin
  if p_identity_id is null
     or p_extension <> 'broadcast'
     or p_topic !~ '^peacepad:call:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}:v[1-9][0-9]{0,8}$' then
    return false;
  end if;
  topic_call_id := split_part(p_topic, ':', 3)::uuid;
  topic_version := substring(split_part(p_topic, ':', 4) from 2)::integer;
  return exists (
      select 1
      from peacepad_v2.audio_call_session call_row
      join peacepad_v2.conversation conversation_row
        on conversation_row.conversation_id = call_row.conversation_id
       and conversation_row.family_id = call_row.family_id
       and conversation_row.region = call_row.region
       and conversation_row.status = 'active'
      join peacepad_v2.participant_grant grant_row
        on grant_row.family_id = call_row.family_id
       and grant_row.identity_id = p_identity_id
       and grant_row.region = call_row.region
       and grant_row.revoked_at is null
      join peacepad_v2.identity identity_row
        on identity_row.identity_id = p_identity_id
       and identity_row.region = call_row.region
       and identity_row.deleted_at is null
      join peacepad_v2.family_circle family_row
        on family_row.family_id = call_row.family_id
       and family_row.region = call_row.region
       and family_row.deleted_at is null
      where call_row.call_id = topic_call_id
        and call_row.version = topic_version
        and call_row.status = 'active'
        and p_identity_id in (call_row.caller_identity_id, call_row.callee_identity_id)
        and p_identity_id = any(conversation_row.participant_identity_ids)
        and (
          'calls' = any(grant_row.permissions)
          or 'call.start' = any(grant_row.permissions)
          or 'family.manage' = any(grant_row.permissions)
        )
    );
end;
$$;

create or replace function public.peacepad_v2_authorize_audio_call_signal(
  p_identity_id uuid,
  p_region text,
  p_call_id uuid,
  p_expected_version integer,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  call_row peacepad_v2.audio_call_session%rowtype;
  peer_identity_id uuid;
  current_count integer;
  signal_expires_at timestamptz := clock_timestamp() + interval '15 seconds';
begin
  if p_schema_version is distinct from 2 then
    raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH';
  end if;
  if p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'REGION_INVALID';
  end if;

  delete from peacepad_v2.audio_call_signal_window where expires_at <= clock_timestamp();
  select * into call_row
  from peacepad_v2.audio_call_session
  where call_id = p_call_id and region = p_region
  for update;
  if not found or p_identity_id not in (call_row.caller_identity_id, call_row.callee_identity_id) then
    raise exception using errcode = '42501', message = 'CALL_ACCESS_DENIED';
  end if;
  if call_row.status <> 'active' then
    raise exception using errcode = 'P0001', message = 'CALL_STATE_INVALID';
  end if;
  if p_expected_version is null or call_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT';
  end if;

  perform peacepad_v2.authorized_audio_call_conversation(
    p_identity_id, p_region, call_row.conversation_id
  );
  peer_identity_id := case when p_identity_id = call_row.caller_identity_id
    then call_row.callee_identity_id else call_row.caller_identity_id end;

  insert into peacepad_v2.audio_call_signal_window (
    call_id, identity_id, window_started_at, signal_count, expires_at
  ) values (
    p_call_id, p_identity_id, clock_timestamp(), 1, clock_timestamp() + interval '2 minutes'
  )
  on conflict (call_id, identity_id) do update
  set window_started_at = case
        when audio_call_signal_window.window_started_at <= clock_timestamp() - interval '10 seconds'
          then clock_timestamp() else audio_call_signal_window.window_started_at end,
      signal_count = case
        when audio_call_signal_window.window_started_at <= clock_timestamp() - interval '10 seconds'
          then 1 else audio_call_signal_window.signal_count + 1 end,
      expires_at = clock_timestamp() + interval '2 minutes'
  returning signal_count into current_count;
  if current_count > 30 then
    raise exception using errcode = 'P0001', message = 'SIGNAL_RATE_LIMITED';
  end if;

  return jsonb_build_object(
    'callId', call_row.call_id,
    'peerIdentityId', peer_identity_id,
    'topic', 'peacepad:call:' || call_row.call_id::text || ':v' || call_row.version::text,
    'version', call_row.version,
    'expiresAt', signal_expires_at,
    'region', call_row.region
  );
end;
$$;

create or replace function peacepad_v2.clear_audio_call_signal_window()
returns trigger
language plpgsql
set search_path = pg_catalog, peacepad_v2
as $$
begin
  if old.status in ('ringing', 'active') and new.status not in ('ringing', 'active') then
    delete from peacepad_v2.audio_call_signal_window where call_id = new.call_id;
  end if;
  return new;
end;
$$;

drop trigger if exists audio_call_clear_signal_window on peacepad_v2.audio_call_session;
create trigger audio_call_clear_signal_window
after update of status on peacepad_v2.audio_call_session
for each row execute function peacepad_v2.clear_audio_call_signal_window();

do $realtime_policy$
begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists peacepad_call_private_listen on realtime.messages';
    execute 'drop policy if exists peacepad_call_no_client_send on realtime.messages';
    execute $policy$
      create policy peacepad_call_private_listen
      on realtime.messages
      for select
      to authenticated
      using (
        peacepad_v2.can_subscribe_audio_call_topic(
          (select auth.uid()),
          (select realtime.topic()),
          realtime.messages.extension
        )
      )
    $policy$;
    execute $policy$
      create policy peacepad_call_no_client_send
      on realtime.messages
      as restrictive
      for insert
      to anon, authenticated
      with check (
        (select realtime.topic()) !~ '^peacepad:call:'
      )
    $policy$;
  end if;
end;
$realtime_policy$;

revoke all on function peacepad_v2.can_subscribe_audio_call_topic(uuid, text, text) from public, anon, authenticated;
grant execute on function peacepad_v2.can_subscribe_audio_call_topic(uuid, text, text) to authenticated;
revoke all on function public.peacepad_v2_authorize_audio_call_signal(uuid, text, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_authorize_audio_call_signal(uuid, text, uuid, integer, integer) to service_role;
revoke all on function peacepad_v2.clear_audio_call_signal_window() from public, anon, authenticated;

comment on table peacepad_v2.audio_call_signal_window is
  'Content-free rate metadata for private server-relayed call signaling. No SDP, ICE, payload, sender-selected target, or replay content is stored.';
