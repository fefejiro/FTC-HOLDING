-- Authorize issuance of short-lived regional TURN credentials for an active call.
--
-- The database returns only content-free authorization metadata. TURN URLs,
-- shared secrets, derived usernames, and temporary credentials stay in the
-- regional Edge runtime and are never persisted or audited.

create or replace function public.peacepad_v2_authorize_audio_call_turn(
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
begin
  if p_schema_version is distinct from 2 then
    raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH';
  end if;
  if p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'REGION_INVALID';
  end if;

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
  return jsonb_build_object(
    'callId', call_row.call_id,
    'version', call_row.version,
    'region', call_row.region
  );
end;
$$;

revoke all on function public.peacepad_v2_authorize_audio_call_turn(uuid, text, uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.peacepad_v2_authorize_audio_call_turn(uuid, text, uuid, integer, integer)
  to service_role;

comment on function public.peacepad_v2_authorize_audio_call_turn(uuid, text, uuid, integer, integer) is
  'Content-free authorization for regional short-lived TURN credential issuance. No TURN secret or credential enters PostgreSQL.';
