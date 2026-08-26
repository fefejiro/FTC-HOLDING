-- Per-identity, per-conversation Message Check preference for fictional staging.
-- The default is off. Draft content is never stored by this schema.

create table if not exists peacepad_v2.message_check_preference (
  message_check_preference_id uuid primary key,
  identity_id uuid not null references peacepad_v2.identity(identity_id),
  conversation_id uuid not null references peacepad_v2.conversation(conversation_id),
  region text not null check (region in ('ca', 'us')),
  enabled boolean not null default false,
  ai_assistance_enabled boolean not null default false check (ai_assistance_enabled = false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  unique (identity_id, conversation_id)
);

alter table peacepad_v2.message_check_preference enable row level security;
revoke all on peacepad_v2.message_check_preference from anon, authenticated;

create or replace function peacepad_v2.delete_message_check_preferences_for_deleted_identity()
returns trigger language plpgsql set search_path=pg_catalog,peacepad_v2 as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    delete from peacepad_v2.message_check_preference where identity_id=new.identity_id;
  end if;
  return new;
end;
$$;

drop trigger if exists identity_message_check_cleanup on peacepad_v2.identity;
create trigger identity_message_check_cleanup
after update of deleted_at on peacepad_v2.identity
for each row execute function peacepad_v2.delete_message_check_preferences_for_deleted_identity();

create or replace function peacepad_v2.message_check_json(
  p_identity_id uuid,
  p_conversation_id uuid,
  p_region text,
  p_id text,
  p_enabled boolean,
  p_created_at timestamptz,
  p_version integer
) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', p_id,
    'identityId', p_identity_id,
    'conversationId', p_conversation_id,
    'enabled', p_enabled,
    'aiAssistanceEnabled', false,
    'schemaVersion', '2.0',
    'version', p_version,
    'region', p_region,
    'provenance', jsonb_build_object(
      'createdAt', p_created_at,
      'createdBy', jsonb_build_object('identityId', p_identity_id, 'sessionId', null),
      'source', 'app'
    )
  );
$$;

create or replace function public.peacepad_v2_get_message_check(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare conversation_row peacepad_v2.conversation%rowtype; preference_row peacepad_v2.message_check_preference%rowtype;
begin
  conversation_row := peacepad_v2.authorized_conversation(p_identity_id,p_region,p_conversation_id);
  select * into preference_row from peacepad_v2.message_check_preference
    where identity_id=p_identity_id and conversation_id=p_conversation_id and region=p_region;
  if not found then
    return peacepad_v2.message_check_json(
      p_identity_id,p_conversation_id,p_region,
      'message-check:' || p_identity_id::text || ':' || p_conversation_id::text,
      false,conversation_row.created_at,0
    );
  end if;
  return peacepad_v2.message_check_json(
    preference_row.identity_id,preference_row.conversation_id,preference_row.region,
    preference_row.message_check_preference_id::text,preference_row.enabled,
    preference_row.created_at,preference_row.version
  );
end;
$$;

create or replace function public.peacepad_v2_set_message_check(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid,
  p_enabled boolean,
  p_ai_assistance_enabled boolean,
  p_expected_version integer,
  p_idempotency_key text,
  p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare conversation_row peacepad_v2.conversation%rowtype; preference_row peacepad_v2.message_check_preference%rowtype;
  existing_result jsonb; existing_event_type text; response jsonb;
begin
  if p_schema_version is distinct from 2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  if p_region is null or p_region not in ('ca','us') then raise exception using errcode='22023',message='REGION_INVALID'; end if;
  if p_enabled is null then raise exception using errcode='22023',message='MESSAGE_CHECK_INVALID'; end if;
  if p_ai_assistance_enabled is distinct from false then raise exception using errcode='42501',message='AI_CONSENT_REQUIRED'; end if;
  if p_expected_version is null or p_expected_version<0 then raise exception using errcode='22023',message='EXPECTED_VERSION_INVALID'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 160 then
    raise exception using errcode='22023',message='IDEMPOTENCY_KEY_INVALID';
  end if;
  select event.event_type,event.result into existing_event_type,existing_result
  from peacepad_v2.audit_event event
  where event.identity_id=p_identity_id and event.idempotency_key=p_idempotency_key;
  if found then
    if existing_event_type<>'message_check.updated' then
      raise exception using errcode='23505',message='IDEMPOTENCY_CONFLICT';
    end if;
    return existing_result;
  end if;
  conversation_row:=peacepad_v2.authorized_conversation(p_identity_id,p_region,p_conversation_id);
  perform pg_advisory_xact_lock(hashtextextended(p_identity_id::text || ':' || p_conversation_id::text,0));
  select * into preference_row from peacepad_v2.message_check_preference
    where identity_id=p_identity_id and conversation_id=p_conversation_id and region=p_region for update;
  if not found then
    if p_expected_version<>0 then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
    insert into peacepad_v2.message_check_preference(
      message_check_preference_id,identity_id,conversation_id,region,enabled,ai_assistance_enabled
    ) values(gen_random_uuid(),p_identity_id,p_conversation_id,p_region,p_enabled,false)
    returning * into preference_row;
  else
    if preference_row.version<>p_expected_version then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
    update peacepad_v2.message_check_preference set enabled=p_enabled,ai_assistance_enabled=false,
      updated_at=now(),version=version+1
    where message_check_preference_id=preference_row.message_check_preference_id returning * into preference_row;
  end if;
  response:=peacepad_v2.message_check_json(
    preference_row.identity_id,preference_row.conversation_id,preference_row.region,
    preference_row.message_check_preference_id::text,preference_row.enabled,
    preference_row.created_at,preference_row.version
  );
  perform peacepad_v2.record_write(p_identity_id,conversation_row.family_id,p_region,'message_check.updated',p_schema_version,p_idempotency_key,response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_authorize_message_preview(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid
) returns boolean language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare conversation_row peacepad_v2.conversation%rowtype;
begin
  conversation_row:=peacepad_v2.authorized_conversation(p_identity_id,p_region,p_conversation_id);
  return exists(
    select 1 from peacepad_v2.message_check_preference preference_row
    where preference_row.identity_id=p_identity_id
      and preference_row.conversation_id=p_conversation_id
      and preference_row.region=p_region
      and preference_row.enabled=true
      and preference_row.ai_assistance_enabled=false
  );
end;
$$;

revoke all on function public.peacepad_v2_get_message_check(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_set_message_check(uuid,text,uuid,boolean,boolean,integer,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_authorize_message_preview(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.peacepad_v2_get_message_check(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_set_message_check(uuid,text,uuid,boolean,boolean,integer,text,integer) to service_role;
grant execute on function public.peacepad_v2_authorize_message_preview(uuid,text,uuid) to service_role;
