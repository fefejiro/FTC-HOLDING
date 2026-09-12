-- The caller must subscribe before the callee accepts. Keep private topic
-- authorization participant-bound, but allow the ringing handshake state.

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
    where call_row.call_id = topic_call_id
      and call_row.version = topic_version
      and call_row.status in ('ringing', 'active')
      and p_identity_id in (call_row.caller_identity_id, call_row.callee_identity_id)
      and p_identity_id = any(conversation_row.participant_identity_ids)
      and ('calls' = any(grant_row.permissions)
        or 'call.start' = any(grant_row.permissions)
        or 'family.manage' = any(grant_row.permissions))
  );
end;
$$;

revoke all on function peacepad_v2.can_subscribe_audio_call_topic(uuid, text, text) from public, anon, authenticated;
grant execute on function peacepad_v2.can_subscribe_audio_call_topic(uuid, text, text) to authenticated;
