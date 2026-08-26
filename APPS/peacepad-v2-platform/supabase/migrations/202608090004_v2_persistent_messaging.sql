-- Persisted, regional messaging for fictional PeacePad V2 staging accounts.
-- Message events are append-only. Corrections link to originals; originals are
-- never overwritten. Direct client table access remains disabled by RLS.

create table if not exists peacepad_v2.conversation (
  conversation_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  region text not null check (region in ('ca', 'us')),
  participant_identity_ids uuid[] not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references peacepad_v2.identity(identity_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  check (cardinality(participant_identity_ids) between 2 and 8)
);

create table if not exists peacepad_v2.message_event (
  message_event_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  conversation_id uuid not null references peacepad_v2.conversation(conversation_id),
  region text not null check (region in ('ca', 'us')),
  actor_identity_id uuid not null references peacepad_v2.identity(identity_id),
  event_type text not null check (event_type in ('sent', 'delivered', 'viewed', 'correction')),
  original_message_event_id uuid references peacepad_v2.message_event(message_event_id),
  body text,
  occurred_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  check (
    (event_type = 'sent' and original_message_event_id is null and body is not null)
    or (event_type = 'correction' and original_message_event_id is not null and body is not null)
    or (event_type in ('delivered', 'viewed') and original_message_event_id is not null and body is null)
  ),
  check (body is null or char_length(body) between 1 and 4000)
);

create index if not exists conversation_family_idx
  on peacepad_v2.conversation (family_id, created_at);
create index if not exists message_event_conversation_idx
  on peacepad_v2.message_event (conversation_id, occurred_at, message_event_id);
create unique index if not exists message_lifecycle_once_idx
  on peacepad_v2.message_event (original_message_event_id, actor_identity_id, event_type)
  where event_type in ('delivered', 'viewed');

alter table peacepad_v2.conversation enable row level security;
alter table peacepad_v2.message_event enable row level security;
revoke all on peacepad_v2.conversation from anon, authenticated;
revoke all on peacepad_v2.message_event from anon, authenticated;

create or replace function peacepad_v2.prevent_message_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'peacepad_v2.message_event is append-only';
end;
$$;

drop trigger if exists message_event_append_only on peacepad_v2.message_event;
create trigger message_event_append_only
before update or delete on peacepad_v2.message_event
for each row execute function peacepad_v2.prevent_message_mutation();

create or replace function peacepad_v2.can_message(
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
    from peacepad_v2.participant_grant participant
    join peacepad_v2.identity identity
      on identity.identity_id = participant.identity_id
     and identity.deleted_at is null
    where participant.identity_id = p_identity_id
      and participant.family_id = p_family_id
      and participant.region = p_region
      and participant.revoked_at is null
      and (
        'messages' = any(participant.permissions)
        or 'message.write' = any(participant.permissions)
        or 'family.manage' = any(participant.permissions)
      )
  );
$$;

create or replace function peacepad_v2.conversation_json(row_value peacepad_v2.conversation)
returns jsonb
language sql
stable
set search_path = pg_catalog, peacepad_v2
as $$
  select jsonb_build_object(
    'id', row_value.conversation_id,
    'familyCircleId', row_value.family_id,
    'participantIdentityIds', row_value.participant_identity_ids,
    'status', row_value.status,
    'schemaVersion', '2.0',
    'version', row_value.version,
    'region', row_value.region,
    'provenance', jsonb_build_object(
      'createdAt', row_value.created_at,
      'createdBy', jsonb_build_object('identityId', row_value.created_by, 'sessionId', null),
      'source', 'app'
    )
  );
$$;

create or replace function peacepad_v2.message_json(row_value peacepad_v2.message_event)
returns jsonb
language sql
stable
set search_path = pg_catalog, peacepad_v2
as $$
  select jsonb_build_object(
    'id', row_value.message_event_id,
    'familyCircleId', row_value.family_id,
    'conversationId', row_value.conversation_id,
    'eventType', row_value.event_type,
    'originalMessageEventId', row_value.original_message_event_id,
    'body', row_value.body,
    'occurredAt', row_value.occurred_at,
    'schemaVersion', '2.0',
    'version', row_value.version,
    'region', row_value.region,
    'provenance', jsonb_build_object(
      'createdAt', row_value.occurred_at,
      'createdBy', jsonb_build_object('identityId', row_value.actor_identity_id, 'sessionId', null),
      'source', 'app'
    )
  );
$$;

create or replace function public.peacepad_v2_create_conversation(
  p_identity_id uuid,
  p_region text,
  p_family_id uuid,
  p_participant_identity_ids uuid[],
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
  participants uuid[];
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if p_region not in ('ca', 'us') then raise exception using errcode = '22023', message = 'REGION_INVALID'; end if;
  select array_agg(distinct participant_id order by participant_id)
  into participants from unnest(p_participant_identity_ids) as item(participant_id);
  if cardinality(coalesce(participants, '{}')) not between 2 and 8 or not (p_identity_id = any(participants)) then
    raise exception using errcode = '22023', message = 'CONVERSATION_PARTICIPANTS_INVALID';
  end if;
  if not peacepad_v2.can_message(p_identity_id, p_family_id, p_region) then
    raise exception using errcode = '42501', message = 'FAMILY_ACCESS_DENIED';
  end if;
  if exists (
    select 1 from unnest(participants) as item(participant_id)
    where not peacepad_v2.can_message(participant_id, p_family_id, p_region)
  ) then raise exception using errcode = '42501', message = 'CONVERSATION_PARTICIPANT_DENIED'; end if;

  insert into peacepad_v2.conversation (
    conversation_id, family_id, region, participant_identity_ids, created_by
  ) values (
    gen_random_uuid(), p_family_id, p_region, participants, p_identity_id
  ) returning * into conversation_row;
  response := peacepad_v2.conversation_json(conversation_row);
  perform peacepad_v2.record_write(p_identity_id, p_family_id, p_region, 'conversation.created', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_list_conversations(
  p_identity_id uuid,
  p_region text,
  p_family_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
begin
  if not peacepad_v2.can_message(p_identity_id, p_family_id, p_region) then
    raise exception using errcode = '42501', message = 'FAMILY_ACCESS_DENIED';
  end if;
  return coalesce((
    select jsonb_agg(peacepad_v2.conversation_json(conversation_row) order by conversation_row.created_at)
    from peacepad_v2.conversation conversation_row
    where conversation_row.family_id = p_family_id
      and conversation_row.region = p_region
      and p_identity_id = any(conversation_row.participant_identity_ids)
  ), '[]'::jsonb);
end;
$$;

create or replace function peacepad_v2.authorized_conversation(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid
)
returns peacepad_v2.conversation
language plpgsql
stable
set search_path = pg_catalog, peacepad_v2
as $$
declare
  conversation_row peacepad_v2.conversation%rowtype;
begin
  select * into conversation_row from peacepad_v2.conversation
  where conversation_id = p_conversation_id and region = p_region;
  if not found or not (p_identity_id = any(conversation_row.participant_identity_ids))
    or not peacepad_v2.can_message(p_identity_id, conversation_row.family_id, p_region) then
    raise exception using errcode = '42501', message = 'CONVERSATION_ACCESS_DENIED';
  end if;
  return conversation_row;
end;
$$;

create or replace function public.peacepad_v2_send_message(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid,
  p_family_id uuid,
  p_body text,
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
  message_row peacepad_v2.message_event%rowtype;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(trim(p_body)) not between 1 and 4000 then raise exception using errcode = '22023', message = 'MESSAGE_BODY_INVALID'; end if;
  conversation_row := peacepad_v2.authorized_conversation(p_identity_id, p_region, p_conversation_id);
  if conversation_row.family_id <> p_family_id or conversation_row.status <> 'active' then
    raise exception using errcode = '42501', message = 'CONVERSATION_ACCESS_DENIED';
  end if;
  insert into peacepad_v2.message_event (
    message_event_id, family_id, conversation_id, region, actor_identity_id, event_type, body
  ) values (
    gen_random_uuid(), p_family_id, p_conversation_id, p_region, p_identity_id, 'sent', trim(p_body)
  ) returning * into message_row;
  response := peacepad_v2.message_json(message_row);
  perform peacepad_v2.record_write(p_identity_id, p_family_id, p_region, 'message.sent', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_record_message_event(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid,
  p_family_id uuid,
  p_original_message_event_id uuid,
  p_event_type text,
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
  original_row peacepad_v2.message_event%rowtype;
  message_row peacepad_v2.message_event%rowtype;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if p_event_type not in ('delivered', 'viewed') then raise exception using errcode = '22023', message = 'MESSAGE_EVENT_INVALID'; end if;
  conversation_row := peacepad_v2.authorized_conversation(p_identity_id, p_region, p_conversation_id);
  select * into original_row from peacepad_v2.message_event
  where message_event_id = p_original_message_event_id and event_type = 'sent';
  if not found or original_row.conversation_id <> p_conversation_id or original_row.family_id <> p_family_id
    or conversation_row.family_id <> p_family_id or original_row.actor_identity_id = p_identity_id then
    raise exception using errcode = '42501', message = 'MESSAGE_ACCESS_DENIED';
  end if;
  insert into peacepad_v2.message_event (
    message_event_id, family_id, conversation_id, region, actor_identity_id,
    event_type, original_message_event_id
  ) values (
    gen_random_uuid(), p_family_id, p_conversation_id, p_region, p_identity_id,
    p_event_type, p_original_message_event_id
  ) returning * into message_row;
  response := peacepad_v2.message_json(message_row);
  perform peacepad_v2.record_write(p_identity_id, p_family_id, p_region, 'message.' || p_event_type, p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_correct_message(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid,
  p_family_id uuid,
  p_original_message_event_id uuid,
  p_body text,
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
  original_row peacepad_v2.message_event%rowtype;
  message_row peacepad_v2.message_event%rowtype;
  effective_body text;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(trim(p_body)) not between 1 and 4000 then raise exception using errcode = '22023', message = 'MESSAGE_BODY_INVALID'; end if;
  conversation_row := peacepad_v2.authorized_conversation(p_identity_id, p_region, p_conversation_id);
  select * into original_row from peacepad_v2.message_event
  where message_event_id = p_original_message_event_id and event_type = 'sent';
  if not found or original_row.conversation_id <> p_conversation_id or original_row.family_id <> p_family_id
    or conversation_row.family_id <> p_family_id or original_row.actor_identity_id <> p_identity_id then
    raise exception using errcode = '42501', message = 'MESSAGE_ACCESS_DENIED';
  end if;
  select coalesce((
    select correction.body from peacepad_v2.message_event correction
    where correction.original_message_event_id = p_original_message_event_id
      and correction.event_type = 'correction'
    order by correction.occurred_at desc, correction.message_event_id desc limit 1
  ), original_row.body) into effective_body;
  if effective_body = trim(p_body) then raise exception using errcode = '22023', message = 'MESSAGE_CORRECTION_UNCHANGED'; end if;
  insert into peacepad_v2.message_event (
    message_event_id, family_id, conversation_id, region, actor_identity_id,
    event_type, original_message_event_id, body
  ) values (
    gen_random_uuid(), p_family_id, p_conversation_id, p_region, p_identity_id,
    'correction', p_original_message_event_id, trim(p_body)
  ) returning * into message_row;
  response := peacepad_v2.message_json(message_row);
  perform peacepad_v2.record_write(p_identity_id, p_family_id, p_region, 'message.corrected', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_list_messages(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
begin
  perform peacepad_v2.authorized_conversation(p_identity_id, p_region, p_conversation_id);
  return coalesce((
    select jsonb_agg(peacepad_v2.message_json(message_row) order by message_row.occurred_at, message_row.message_event_id)
    from peacepad_v2.message_event message_row
    where message_row.conversation_id = p_conversation_id and message_row.region = p_region
  ), '[]'::jsonb);
end;
$$;

create or replace function public.peacepad_v2_search_messages(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid,
  p_query text,
  p_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
begin
  perform peacepad_v2.authorized_conversation(p_identity_id, p_region, p_conversation_id);
  if char_length(trim(p_query)) not between 2 and 100 or p_limit not between 1 and 50 then
    raise exception using errcode = '22023', message = 'MESSAGE_SEARCH_INVALID';
  end if;
  return coalesce((
    select jsonb_agg(result.value order by result.occurred_at) from (
      select sent.occurred_at, jsonb_build_object(
        'originalMessageEventId', sent.message_event_id,
        'effectiveMessageEventId', coalesce(correction.message_event_id, sent.message_event_id),
        'body', coalesce(correction.body, sent.body),
        'occurredAt', sent.occurred_at,
        'corrected', correction.message_event_id is not null
      ) value
      from peacepad_v2.message_event sent
      left join lateral (
        select latest.message_event_id, latest.body
        from peacepad_v2.message_event latest
        where latest.original_message_event_id = sent.message_event_id
          and latest.event_type = 'correction'
        order by latest.occurred_at desc, latest.message_event_id desc limit 1
      ) correction on true
      where sent.conversation_id = p_conversation_id
        and sent.region = p_region
        and sent.event_type = 'sent'
        and coalesce(correction.body, sent.body) ilike '%' || trim(p_query) || '%'
      order by sent.occurred_at desc
      limit p_limit
    ) result
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.peacepad_v2_create_conversation(uuid, text, uuid, uuid[], text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_list_conversations(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.peacepad_v2_send_message(uuid, text, uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_record_message_event(uuid, text, uuid, uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_correct_message(uuid, text, uuid, uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_list_messages(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.peacepad_v2_search_messages(uuid, text, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_create_conversation(uuid, text, uuid, uuid[], text, integer) to service_role;
grant execute on function public.peacepad_v2_list_conversations(uuid, text, uuid) to service_role;
grant execute on function public.peacepad_v2_send_message(uuid, text, uuid, uuid, text, text, integer) to service_role;
grant execute on function public.peacepad_v2_record_message_event(uuid, text, uuid, uuid, uuid, text, text, integer) to service_role;
grant execute on function public.peacepad_v2_correct_message(uuid, text, uuid, uuid, uuid, text, text, integer) to service_role;
grant execute on function public.peacepad_v2_list_messages(uuid, text, uuid) to service_role;
grant execute on function public.peacepad_v2_search_messages(uuid, text, uuid, text, integer) to service_role;
