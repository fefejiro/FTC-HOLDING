-- Owner-private, metadata-only source-linked timeline for fictional V2 staging.
-- Entries reference canonical message or calendar rows without copying content.
-- There is no sharing, file, evidence, export, or legal-conclusion capability.

create table if not exists peacepad_v2.private_timeline_entry (
  timeline_entry_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  owner_identity_id uuid not null references peacepad_v2.identity(identity_id),
  case_binder_id uuid not null references peacepad_v2.case_binder(case_binder_id) on delete cascade,
  region text not null check (region in ('ca', 'us')),
  source_kind text not null check (source_kind in ('message-event', 'schedule-event')),
  message_event_id uuid references peacepad_v2.message_event(message_event_id) on delete restrict,
  schedule_event_id uuid references peacepad_v2.schedule_event(schedule_event_id) on delete restrict,
  source_event_type text not null check (
    source_event_type in ('sent', 'correction', 'parenting-time', 'appointment', 'holiday', 'change-request')
  ),
  occurred_at timestamptz not null,
  source_version integer check (source_version is null or source_version > 0),
  created_at timestamptz not null default now(),
  version integer not null default 1 check (version = 1),
  check (
    (source_kind = 'message-event' and message_event_id is not null and schedule_event_id is null
      and source_event_type in ('sent', 'correction') and source_version is null)
    or
    (source_kind = 'schedule-event' and schedule_event_id is not null and message_event_id is null
      and source_event_type in ('parenting-time', 'appointment', 'holiday', 'change-request')
      and source_version is not null)
  )
);

create unique index if not exists private_timeline_message_source_idx
  on peacepad_v2.private_timeline_entry(case_binder_id, message_event_id)
  where message_event_id is not null;
create unique index if not exists private_timeline_schedule_source_idx
  on peacepad_v2.private_timeline_entry(case_binder_id, schedule_event_id)
  where schedule_event_id is not null;
create index if not exists private_timeline_owner_cursor_idx
  on peacepad_v2.private_timeline_entry(owner_identity_id, case_binder_id, occurred_at desc, timeline_entry_id desc);

alter table peacepad_v2.private_timeline_entry enable row level security;
revoke all on table peacepad_v2.private_timeline_entry from public, anon, authenticated;

create or replace function peacepad_v2.private_timeline_json(row_value peacepad_v2.private_timeline_entry)
returns jsonb language sql stable set search_path=pg_catalog,peacepad_v2 as $$
  select jsonb_build_object(
    'id', row_value.timeline_entry_id,
    'familyCircleId', row_value.family_id,
    'ownerIdentityId', row_value.owner_identity_id,
    'caseBinderId', row_value.case_binder_id,
    'source', jsonb_build_object(
      'kind', row_value.source_kind,
      'sourceId', coalesce(row_value.message_event_id, row_value.schedule_event_id),
      'eventType', row_value.source_event_type,
      'sourceVersion', row_value.source_version
    ),
    'occurredAt', row_value.occurred_at,
    'schemaVersion', '2.0',
    'version', row_value.version,
    'region', row_value.region,
    'provenance', jsonb_build_object(
      'createdAt', row_value.created_at,
      'createdBy', jsonb_build_object(
        'identityId', row_value.owner_identity_id,
        'sessionId', row_value.owner_identity_id
      ),
      'source', 'app'
    )
  );
$$;

create or replace function public.peacepad_v2_list_private_timeline(
  p_identity_id uuid,
  p_region text,
  p_case_binder_id uuid,
  p_before timestamptz default null,
  p_limit integer default 50
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare binder_row peacepad_v2.case_binder%rowtype;
begin
  if p_region is null or p_region not in ('ca','us') or p_case_binder_id is null
    or p_limit is null or p_limit not between 1 and 100 then
    raise exception using errcode='22023',message='TIMELINE_REQUEST_INVALID';
  end if;
  select * into binder_row from peacepad_v2.case_binder
    where case_binder_id=p_case_binder_id and owner_identity_id=p_identity_id and region=p_region;
  if not found or not peacepad_v2.can_manage_private_records(
    p_identity_id,binder_row.family_id,p_region
  ) then
    raise exception using errcode='42501',message='CASE_BINDER_ACCESS_DENIED';
  end if;
  return coalesce((
    select jsonb_agg(peacepad_v2.private_timeline_json(entry_row)
      order by entry_row.occurred_at desc,entry_row.timeline_entry_id desc)
    from (
      select * from peacepad_v2.private_timeline_entry entry_row
      where entry_row.case_binder_id=p_case_binder_id
        and entry_row.owner_identity_id=p_identity_id
        and entry_row.region=p_region
        and (p_before is null or entry_row.occurred_at<p_before)
      order by entry_row.occurred_at desc,entry_row.timeline_entry_id desc
      limit p_limit
    ) entry_row
  ),'[]'::jsonb);
end;
$$;

create or replace function public.peacepad_v2_link_timeline_source(
  p_identity_id uuid,
  p_region text,
  p_family_id uuid,
  p_case_binder_id uuid,
  p_source_kind text,
  p_source_id uuid,
  p_idempotency_key text,
  p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare
  binder_row peacepad_v2.case_binder%rowtype;
  message_row peacepad_v2.message_event%rowtype;
  event_row peacepad_v2.schedule_event%rowtype;
  layer_row peacepad_v2.calendar_layer%rowtype;
  entry_row peacepad_v2.private_timeline_entry%rowtype;
  existing_result jsonb;
  response jsonb;
begin
  existing_result:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then
    raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  if p_region is null or p_region not in ('ca','us') or p_family_id is null
    or p_case_binder_id is null or p_source_id is null
    or p_source_kind is null or p_source_kind not in ('message-event','schedule-event') then
    raise exception using errcode='22023',message='TIMELINE_SOURCE_INVALID';
  end if;
  select * into binder_row from peacepad_v2.case_binder
    where case_binder_id=p_case_binder_id and family_id=p_family_id
      and owner_identity_id=p_identity_id and region=p_region for update;
  if not found or not peacepad_v2.can_manage_private_records(p_identity_id,p_family_id,p_region) then
    raise exception using errcode='42501',message='CASE_BINDER_ACCESS_DENIED'; end if;
  if binder_row.status<>'active' then
    raise exception using errcode='22023',message='CASE_BINDER_ARCHIVED'; end if;

  if p_source_kind='message-event' then
    select * into message_row from peacepad_v2.message_event
      where message_event_id=p_source_id and family_id=p_family_id and region=p_region
        and event_type in ('sent','correction');
    if not found then raise exception using errcode='22023',message='TIMELINE_SOURCE_INVALID'; end if;
    begin
      perform peacepad_v2.authorized_conversation(p_identity_id,p_region,message_row.conversation_id);
    exception when others then
      raise exception using errcode='42501',message='TIMELINE_SOURCE_ACCESS_DENIED';
    end;
    insert into peacepad_v2.private_timeline_entry(
      timeline_entry_id,family_id,owner_identity_id,case_binder_id,region,source_kind,
      message_event_id,source_event_type,occurred_at
    ) values(
      gen_random_uuid(),p_family_id,p_identity_id,p_case_binder_id,p_region,p_source_kind,
      p_source_id,message_row.event_type,message_row.occurred_at
    ) returning * into entry_row;
  else
    select event_value.* into event_row from peacepad_v2.schedule_event event_value
      join peacepad_v2.calendar_layer layer_value
        on layer_value.calendar_layer_id=event_value.calendar_layer_id
      where event_value.schedule_event_id=p_source_id and event_value.family_id=p_family_id
        and event_value.region=p_region and event_value.deleted_at is null
        and layer_value.deleted_at is null;
    if not found then raise exception using errcode='22023',message='TIMELINE_SOURCE_INVALID'; end if;
    select * into layer_row from peacepad_v2.calendar_layer
      where calendar_layer_id=event_row.calendar_layer_id and deleted_at is null;
    if not found or not peacepad_v2.visibility_allows(
      coalesce(event_row.visibility_override,layer_row.visibility),layer_row.owner_identity_id,
      p_identity_id,p_family_id,p_region
    ) then
      raise exception using errcode='42501',message='TIMELINE_SOURCE_ACCESS_DENIED';
    end if;
    insert into peacepad_v2.private_timeline_entry(
      timeline_entry_id,family_id,owner_identity_id,case_binder_id,region,source_kind,
      schedule_event_id,source_event_type,occurred_at,source_version
    ) values(
      gen_random_uuid(),p_family_id,p_identity_id,p_case_binder_id,p_region,p_source_kind,
      p_source_id,event_row.event_type,event_row.starts_at,event_row.version
    ) returning * into entry_row;
  end if;
  response:=peacepad_v2.private_timeline_json(entry_row);
  perform peacepad_v2.record_write(
    p_identity_id,p_family_id,p_region,'timeline_entry.linked',p_schema_version,p_idempotency_key,response
  );
  return response;
exception
  when unique_violation then
    raise exception using errcode='23505',message='TIMELINE_SOURCE_ALREADY_LINKED';
end;
$$;

revoke all on function peacepad_v2.private_timeline_json(peacepad_v2.private_timeline_entry) from public,anon,authenticated;
revoke all on function public.peacepad_v2_list_private_timeline(uuid,text,uuid,timestamptz,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_link_timeline_source(uuid,text,uuid,uuid,text,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.peacepad_v2_list_private_timeline(uuid,text,uuid,timestamptz,integer) to service_role;
grant execute on function public.peacepad_v2_link_timeline_source(uuid,text,uuid,uuid,text,uuid,text,integer) to service_role;
