-- Generalize the proven one-to-one call lifecycle from audio to audio|video.
-- Signaling remains bounded and ephemeral; no media or transcript is stored.

alter table peacepad_v2.audio_call_session
  add column if not exists media_type text not null default 'audio'
  check (media_type in ('audio','video'));

create or replace function peacepad_v2.audio_call_json(row_value peacepad_v2.audio_call_session)
returns jsonb language sql stable set search_path=pg_catalog,peacepad_v2 as $$
 select jsonb_build_object(
  'id',row_value.call_id,'familyCircleId',row_value.family_id,'conversationId',row_value.conversation_id,
  'callerIdentityId',row_value.caller_identity_id,'calleeIdentityId',row_value.callee_identity_id,
  'type',row_value.media_type,'status',row_value.status,'createdAt',row_value.created_at,'expiresAt',row_value.expires_at,
  'acceptedAt',row_value.accepted_at,'endedAt',row_value.ended_at,'endedByIdentityId',row_value.ended_by_identity_id,
  'endReason',row_value.end_reason,'schemaVersion','2.0','version',row_value.version,'region',row_value.region);
$$;

create or replace function public.peacepad_v2_create_media_call(
 p_identity_id uuid,p_region text,p_conversation_id uuid,p_media_type text,p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare conversation_row peacepad_v2.conversation%rowtype; call_row peacepad_v2.audio_call_session%rowtype;
 callee_id uuid; existing_result jsonb; response jsonb;
begin
 existing_result:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key);
 if existing_result is not null then return existing_result; end if;
 if p_schema_version<>2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
 if p_media_type not in ('audio','video') then raise exception using errcode='22023',message='CALL_MEDIA_TYPE_INVALID'; end if;
 conversation_row:=peacepad_v2.authorized_audio_call_conversation(p_identity_id,p_region,p_conversation_id);
 select participant into callee_id from unnest(conversation_row.participant_identity_ids) participant where participant<>p_identity_id;
 if callee_id is null then raise exception using errcode='42501',message='CALL_ACCESS_DENIED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('media-call:'||p_conversation_id::text,0));
 perform peacepad_v2.expire_audio_calls(p_region,p_conversation_id);
 if exists(select 1 from peacepad_v2.audio_call_session where conversation_id=p_conversation_id and region=p_region and status in ('ringing','active')) then
  raise exception using errcode='P0001',message='CALL_ALREADY_ACTIVE';
 end if;
 insert into peacepad_v2.audio_call_session(call_id,family_id,conversation_id,region,caller_identity_id,callee_identity_id,media_type)
  values(gen_random_uuid(),conversation_row.family_id,p_conversation_id,p_region,p_identity_id,callee_id,p_media_type) returning * into call_row;
 response:=peacepad_v2.audio_call_json(call_row);
 perform peacepad_v2.record_write(p_identity_id,call_row.family_id,p_region,'call.created',p_schema_version,p_idempotency_key,response);
 return response;
end; $$;

revoke all on function public.peacepad_v2_create_media_call(uuid,text,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.peacepad_v2_create_media_call(uuid,text,uuid,text,text,integer) to service_role;
