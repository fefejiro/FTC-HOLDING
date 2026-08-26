-- Persisted regional calendar layers and schedule events for fictional V2 staging.
-- Layers begin private. Sharing is explicit and constrained to active grants in
-- the same family. Direct client table access remains disabled by RLS.

create table if not exists peacepad_v2.calendar_layer (
  calendar_layer_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  region text not null check (region in ('ca', 'us')),
  owner_identity_id uuid not null references peacepad_v2.identity(identity_id),
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('parenting-time', 'expenses-requests', 'events-activities', 'calls', 'custom')),
  icon text not null check (icon in ('calendar', 'clock', 'receipt', 'activity', 'phone', 'custom')),
  color_token text not null check (color_token in ('teal', 'violet', 'amber', 'rose', 'blue', 'green')),
  visibility jsonb not null default '{"scope":"private"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table if not exists peacepad_v2.schedule_event (
  schedule_event_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  calendar_layer_id uuid not null references peacepad_v2.calendar_layer(calendar_layer_id),
  region text not null check (region in ('ca', 'us')),
  created_by uuid not null references peacepad_v2.identity(identity_id),
  child_profile_ids uuid[] not null default '{}',
  event_type text not null check (event_type in ('parenting-time', 'appointment', 'holiday', 'change-request')),
  title text not null check (char_length(title) between 1 and 160),
  description text check (description is null or char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('planned', 'requested', 'accepted', 'declined', 'cancelled')),
  recurrence jsonb,
  visibility_override jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  check (ends_at > starts_at),
  check (cardinality(child_profile_ids) <= 20)
);

create index if not exists calendar_layer_family_idx
  on peacepad_v2.calendar_layer (family_id, created_at) where deleted_at is null;
create index if not exists schedule_event_family_time_idx
  on peacepad_v2.schedule_event (family_id, starts_at, schedule_event_id) where deleted_at is null;
create index if not exists schedule_event_layer_idx
  on peacepad_v2.schedule_event (calendar_layer_id) where deleted_at is null;

alter table peacepad_v2.calendar_layer enable row level security;
alter table peacepad_v2.schedule_event enable row level security;
revoke all on peacepad_v2.calendar_layer from anon, authenticated;
revoke all on peacepad_v2.schedule_event from anon, authenticated;

create or replace function peacepad_v2.can_calendar(p_identity_id uuid, p_family_id uuid, p_region text)
returns boolean language sql stable set search_path = pg_catalog, peacepad_v2 as $$
  select exists (
    select 1 from peacepad_v2.participant_grant grant_row
    join peacepad_v2.identity identity_row
      on identity_row.identity_id = grant_row.identity_id and identity_row.deleted_at is null
    where grant_row.identity_id = p_identity_id
      and grant_row.family_id = p_family_id
      and grant_row.region = p_region
      and grant_row.revoked_at is null
      and ('calendar' = any(grant_row.permissions)
        or 'calendar.write' = any(grant_row.permissions)
        or 'family.manage' = any(grant_row.permissions))
  );
$$;

create or replace function peacepad_v2.visibility_valid(p_visibility jsonb, p_family_id uuid, p_region text)
returns boolean language plpgsql stable set search_path = pg_catalog, peacepad_v2 as $$
declare grant_id_text text;
begin
  if p_visibility is null or jsonb_typeof(p_visibility) <> 'object'
    or p_visibility ->> 'scope' not in ('private', 'family', 'selected') then return false; end if;
  if p_visibility ->> 'scope' <> 'selected' then
    return not (p_visibility ? 'participantGrantIds');
  end if;
  if jsonb_typeof(p_visibility -> 'participantGrantIds') <> 'array'
    or jsonb_array_length(p_visibility -> 'participantGrantIds') < 1
    or jsonb_array_length(p_visibility -> 'participantGrantIds') > 20 then return false; end if;
  for grant_id_text in select jsonb_array_elements_text(p_visibility -> 'participantGrantIds') loop
    begin
      if not exists (
        select 1 from peacepad_v2.participant_grant grant_row
        where grant_row.participant_grant_id = grant_id_text::uuid
          and grant_row.family_id = p_family_id and grant_row.region = p_region
          and grant_row.revoked_at is null
      ) then return false; end if;
    exception when invalid_text_representation then return false;
    end;
  end loop;
  return true;
end;
$$;

create or replace function peacepad_v2.visibility_allows(
  p_visibility jsonb, p_owner_identity_id uuid, p_identity_id uuid, p_family_id uuid, p_region text
) returns boolean language sql stable set search_path = pg_catalog, peacepad_v2 as $$
  select p_identity_id = p_owner_identity_id or (
    peacepad_v2.can_calendar(p_identity_id, p_family_id, p_region) and (
      p_visibility ->> 'scope' = 'family'
      or (p_visibility ->> 'scope' = 'selected' and exists (
        select 1 from peacepad_v2.participant_grant grant_row
        where grant_row.identity_id = p_identity_id and grant_row.family_id = p_family_id
          and grant_row.region = p_region and grant_row.revoked_at is null
          and (p_visibility -> 'participantGrantIds') ? grant_row.participant_grant_id::text
      ))
    )
  );
$$;

create or replace function peacepad_v2.recurrence_valid(p_recurrence jsonb)
returns boolean language sql immutable as $$
  select p_recurrence is null or (
    jsonb_typeof(p_recurrence) = 'object'
    and p_recurrence ->> 'frequency' in ('daily', 'weekly', 'monthly', 'yearly')
    and (p_recurrence ->> 'interval') ~ '^[0-9]+$'
    and (p_recurrence ->> 'interval')::integer between 1 and 100
    and jsonb_typeof(p_recurrence -> 'weekdays') = 'array'
    and not exists (
      select 1 from jsonb_array_elements_text(p_recurrence -> 'weekdays') as weekday(value)
      where value not in ('MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU')
    )
    and (not (p_recurrence ? 'count') or p_recurrence -> 'count' = 'null'::jsonb
      or ((p_recurrence ->> 'count') ~ '^[0-9]+$' and (p_recurrence ->> 'count')::integer between 1 and 1000))
    and (not (p_recurrence ? 'until') or p_recurrence -> 'until' = 'null'::jsonb
      or jsonb_typeof(p_recurrence -> 'until') = 'string')
  );
$$;

create or replace function peacepad_v2.calendar_layer_json(row_value peacepad_v2.calendar_layer)
returns jsonb language sql stable set search_path = pg_catalog, peacepad_v2 as $$
  select jsonb_build_object(
    'id', row_value.calendar_layer_id, 'familyCircleId', row_value.family_id,
    'ownerIdentityId', row_value.owner_identity_id, 'name', row_value.name,
    'kind', row_value.kind, 'icon', row_value.icon, 'colorToken', row_value.color_token,
    'visibility', row_value.visibility, 'schemaVersion', '2.0', 'version', row_value.version,
    'region', row_value.region, 'provenance', jsonb_build_object(
      'createdAt', row_value.created_at,
      'createdBy', jsonb_build_object('identityId', row_value.owner_identity_id, 'sessionId', null),
      'source', 'app'));
$$;

create or replace function peacepad_v2.schedule_event_json(row_value peacepad_v2.schedule_event)
returns jsonb language sql stable set search_path = pg_catalog, peacepad_v2 as $$
  select jsonb_build_object(
    'id', row_value.schedule_event_id, 'familyCircleId', row_value.family_id,
    'calendarLayerId', row_value.calendar_layer_id, 'childProfileIds', row_value.child_profile_ids,
    'eventType', row_value.event_type, 'title', row_value.title, 'description', row_value.description,
    'startsAt', row_value.starts_at, 'endsAt', row_value.ends_at, 'status', row_value.status,
    'recurrence', row_value.recurrence, 'visibilityOverride', row_value.visibility_override,
    'schemaVersion', '2.0', 'version', row_value.version, 'region', row_value.region,
    'provenance', jsonb_build_object('createdAt', row_value.created_at,
      'createdBy', jsonb_build_object('identityId', row_value.created_by, 'sessionId', null), 'source', 'app'));
$$;

create or replace function public.peacepad_v2_list_calendar_layers(p_identity_id uuid, p_region text, p_family_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, peacepad_v2 as $$
begin
  if not peacepad_v2.can_calendar(p_identity_id, p_family_id, p_region) then
    raise exception using errcode = '42501', message = 'FAMILY_ACCESS_DENIED'; end if;
  return coalesce((select jsonb_agg(peacepad_v2.calendar_layer_json(layer_row) order by layer_row.created_at)
    from peacepad_v2.calendar_layer layer_row where layer_row.family_id = p_family_id
      and layer_row.region = p_region and layer_row.deleted_at is null
      and peacepad_v2.visibility_allows(layer_row.visibility, layer_row.owner_identity_id, p_identity_id, p_family_id, p_region)), '[]'::jsonb);
end;
$$;

create or replace function public.peacepad_v2_create_calendar_layer(
  p_identity_id uuid, p_region text, p_family_id uuid, p_name text, p_kind text,
  p_icon text, p_color_token text, p_visibility jsonb, p_idempotency_key text, p_schema_version integer
) returns jsonb language plpgsql security definer set search_path = pg_catalog, peacepad_v2 as $$
declare layer_row peacepad_v2.calendar_layer%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode='22023', message='SCHEMA_MISMATCH'; end if;
  if not peacepad_v2.can_calendar(p_identity_id, p_family_id, p_region) then raise exception using errcode='42501', message='FAMILY_ACCESS_DENIED'; end if;
  if char_length(trim(p_name)) not between 1 and 80 then raise exception using errcode='22023', message='CALENDAR_LAYER_INVALID'; end if;
  if p_kind not in ('parenting-time','expenses-requests','events-activities','calls','custom')
    or p_icon not in ('calendar','clock','receipt','activity','phone','custom')
    or p_color_token not in ('teal','violet','amber','rose','blue','green')
    or not peacepad_v2.visibility_valid(p_visibility, p_family_id, p_region) then
    raise exception using errcode='22023', message='CALENDAR_LAYER_INVALID'; end if;
  insert into peacepad_v2.calendar_layer(calendar_layer_id,family_id,region,owner_identity_id,name,kind,icon,color_token,visibility)
  values(gen_random_uuid(),p_family_id,p_region,p_identity_id,trim(p_name),p_kind,p_icon,p_color_token,p_visibility) returning * into layer_row;
  response := peacepad_v2.calendar_layer_json(layer_row);
  perform peacepad_v2.record_write(p_identity_id,p_family_id,p_region,'calendar_layer.created',p_schema_version,p_idempotency_key,response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_update_calendar_layer(
  p_identity_id uuid, p_region text, p_layer_id uuid, p_name text, p_kind text, p_icon text,
  p_color_token text, p_visibility jsonb, p_expected_version integer, p_idempotency_key text, p_schema_version integer
) returns jsonb language plpgsql security definer set search_path = pg_catalog, peacepad_v2 as $$
declare layer_row peacepad_v2.calendar_layer%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  select * into layer_row from peacepad_v2.calendar_layer where calendar_layer_id=p_layer_id and region=p_region and deleted_at is null for update;
  if not found or (layer_row.owner_identity_id <> p_identity_id and not exists (
    select 1 from peacepad_v2.participant_grant g where g.identity_id=p_identity_id and g.family_id=layer_row.family_id
      and g.region=p_region and g.revoked_at is null and 'family.manage'=any(g.permissions))) then
    raise exception using errcode='42501',message='CALENDAR_ACCESS_DENIED'; end if;
  if layer_row.version <> p_expected_version then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
  if char_length(trim(p_name)) not between 1 and 80 or p_kind not in ('parenting-time','expenses-requests','events-activities','calls','custom')
    or p_icon not in ('calendar','clock','receipt','activity','phone','custom') or p_color_token not in ('teal','violet','amber','rose','blue','green')
    or not peacepad_v2.visibility_valid(p_visibility,layer_row.family_id,p_region) then raise exception using errcode='22023',message='CALENDAR_LAYER_INVALID'; end if;
  update peacepad_v2.calendar_layer set name=trim(p_name),kind=p_kind,icon=p_icon,color_token=p_color_token,
    visibility=p_visibility,updated_at=now(),version=version+1 where calendar_layer_id=p_layer_id returning * into layer_row;
  response:=peacepad_v2.calendar_layer_json(layer_row);
  perform peacepad_v2.record_write(p_identity_id,layer_row.family_id,p_region,'calendar_layer.updated',p_schema_version,p_idempotency_key,response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_delete_calendar_layer(
  p_identity_id uuid,p_region text,p_layer_id uuid,p_expected_version integer,p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare layer_row peacepad_v2.calendar_layer%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if existing_result is not null then return existing_result; end if;
  if p_schema_version<>2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  select * into layer_row from peacepad_v2.calendar_layer where calendar_layer_id=p_layer_id and region=p_region and deleted_at is null for update;
  if not found or layer_row.owner_identity_id<>p_identity_id then raise exception using errcode='42501',message='CALENDAR_ACCESS_DENIED'; end if;
  if layer_row.version<>p_expected_version then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
  if exists(select 1 from peacepad_v2.schedule_event where calendar_layer_id=p_layer_id and deleted_at is null) then raise exception using errcode='23503',message='CALENDAR_LAYER_NOT_EMPTY'; end if;
  update peacepad_v2.calendar_layer set deleted_at=now(),updated_at=now(),version=version+1 where calendar_layer_id=p_layer_id returning * into layer_row;
  response:=jsonb_build_object('id',p_layer_id,'status','deleted','version',layer_row.version);
  perform peacepad_v2.record_write(p_identity_id,layer_row.family_id,p_region,'calendar_layer.deleted',p_schema_version,p_idempotency_key,response); return response;
end;
$$;

create or replace function peacepad_v2.event_visibility_valid(p_override jsonb, p_layer peacepad_v2.calendar_layer)
returns boolean language plpgsql stable set search_path=pg_catalog,peacepad_v2 as $$
declare grant_text text;
begin
  if p_override is null then return true; end if;
  if not peacepad_v2.visibility_valid(p_override,p_layer.family_id,p_layer.region) then return false; end if;
  if p_layer.visibility->>'scope'='private' then return p_override->>'scope'='private'; end if;
  if p_layer.visibility->>'scope'='selected' then
    if p_override->>'scope'='private' then return true; end if;
    if p_override->>'scope'<>'selected' then return false; end if;
    for grant_text in select jsonb_array_elements_text(p_override->'participantGrantIds') loop
      if not ((p_layer.visibility->'participantGrantIds') ? grant_text) then return false; end if;
    end loop;
  end if;
  return true;
end;
$$;

create or replace function public.peacepad_v2_list_schedule_events(p_identity_id uuid,p_region text,p_family_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
begin
  if not peacepad_v2.can_calendar(p_identity_id,p_family_id,p_region) then raise exception using errcode='42501',message='FAMILY_ACCESS_DENIED'; end if;
  return coalesce((select jsonb_agg(peacepad_v2.schedule_event_json(event_row) order by event_row.starts_at,event_row.schedule_event_id)
    from peacepad_v2.schedule_event event_row join peacepad_v2.calendar_layer layer_row on layer_row.calendar_layer_id=event_row.calendar_layer_id
    where event_row.family_id=p_family_id and event_row.region=p_region and event_row.deleted_at is null and layer_row.deleted_at is null
      and peacepad_v2.visibility_allows(coalesce(event_row.visibility_override,layer_row.visibility),layer_row.owner_identity_id,p_identity_id,p_family_id,p_region)), '[]'::jsonb);
end;
$$;

create or replace function public.peacepad_v2_create_schedule_event(
  p_identity_id uuid,p_region text,p_family_id uuid,p_calendar_layer_id uuid,p_child_profile_ids uuid[],p_event_type text,
  p_title text,p_description text,p_starts_at timestamptz,p_ends_at timestamptz,p_status text,p_recurrence jsonb,p_visibility_override jsonb,
  p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare layer_row peacepad_v2.calendar_layer%rowtype; event_row peacepad_v2.schedule_event%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if existing_result is not null then return existing_result; end if;
  if p_schema_version<>2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  select * into layer_row from peacepad_v2.calendar_layer where calendar_layer_id=p_calendar_layer_id and family_id=p_family_id and region=p_region and deleted_at is null;
  if not found or not peacepad_v2.visibility_allows(layer_row.visibility,layer_row.owner_identity_id,p_identity_id,p_family_id,p_region) then raise exception using errcode='42501',message='CALENDAR_ACCESS_DENIED'; end if;
  if char_length(trim(p_title)) not between 1 and 160 or p_ends_at<=p_starts_at or p_event_type not in ('parenting-time','appointment','holiday','change-request')
    or p_status not in ('planned','requested','accepted','declined','cancelled') or cardinality(coalesce(p_child_profile_ids,'{}'))>20
    or not peacepad_v2.recurrence_valid(p_recurrence) or not peacepad_v2.event_visibility_valid(p_visibility_override,layer_row) then raise exception using errcode='22023',message='SCHEDULE_EVENT_INVALID'; end if;
  insert into peacepad_v2.schedule_event(schedule_event_id,family_id,calendar_layer_id,region,created_by,child_profile_ids,event_type,title,description,starts_at,ends_at,status,recurrence,visibility_override)
  values(gen_random_uuid(),p_family_id,p_calendar_layer_id,p_region,p_identity_id,coalesce(p_child_profile_ids,'{}'),p_event_type,trim(p_title),nullif(trim(p_description),''),p_starts_at,p_ends_at,p_status,p_recurrence,p_visibility_override) returning * into event_row;
  response:=peacepad_v2.schedule_event_json(event_row); perform peacepad_v2.record_write(p_identity_id,p_family_id,p_region,'schedule_event.created',p_schema_version,p_idempotency_key,response); return response;
end;
$$;

create or replace function public.peacepad_v2_update_schedule_event(
  p_identity_id uuid,p_region text,p_event_id uuid,p_calendar_layer_id uuid,p_child_profile_ids uuid[],p_event_type text,p_title text,p_description text,
  p_starts_at timestamptz,p_ends_at timestamptz,p_status text,p_recurrence jsonb,p_visibility_override jsonb,p_expected_version integer,p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare layer_row peacepad_v2.calendar_layer%rowtype; event_row peacepad_v2.schedule_event%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if existing_result is not null then return existing_result; end if;
  if p_schema_version<>2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  select * into event_row from peacepad_v2.schedule_event where schedule_event_id=p_event_id and region=p_region and deleted_at is null for update;
  if not found or event_row.created_by<>p_identity_id then raise exception using errcode='42501',message='CALENDAR_ACCESS_DENIED'; end if;
  if event_row.version<>p_expected_version then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
  select * into layer_row from peacepad_v2.calendar_layer where calendar_layer_id=p_calendar_layer_id and family_id=event_row.family_id and region=p_region and deleted_at is null;
  if not found or not peacepad_v2.visibility_allows(layer_row.visibility,layer_row.owner_identity_id,p_identity_id,event_row.family_id,p_region) then raise exception using errcode='42501',message='CALENDAR_ACCESS_DENIED'; end if;
  if char_length(trim(p_title)) not between 1 and 160 or p_ends_at<=p_starts_at or p_event_type not in ('parenting-time','appointment','holiday','change-request')
    or p_status not in ('planned','requested','accepted','declined','cancelled') or cardinality(coalesce(p_child_profile_ids,'{}'))>20
    or not peacepad_v2.recurrence_valid(p_recurrence) or not peacepad_v2.event_visibility_valid(p_visibility_override,layer_row) then raise exception using errcode='22023',message='SCHEDULE_EVENT_INVALID'; end if;
  update peacepad_v2.schedule_event set calendar_layer_id=p_calendar_layer_id,child_profile_ids=coalesce(p_child_profile_ids,'{}'),event_type=p_event_type,
    title=trim(p_title),description=nullif(trim(p_description),''),starts_at=p_starts_at,ends_at=p_ends_at,status=p_status,recurrence=p_recurrence,
    visibility_override=p_visibility_override,updated_at=now(),version=version+1 where schedule_event_id=p_event_id returning * into event_row;
  response:=peacepad_v2.schedule_event_json(event_row); perform peacepad_v2.record_write(p_identity_id,event_row.family_id,p_region,'schedule_event.updated',p_schema_version,p_idempotency_key,response); return response;
end;
$$;

create or replace function public.peacepad_v2_delete_schedule_event(
  p_identity_id uuid,p_region text,p_event_id uuid,p_expected_version integer,p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare event_row peacepad_v2.schedule_event%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if existing_result is not null then return existing_result; end if;
  if p_schema_version<>2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  select * into event_row from peacepad_v2.schedule_event where schedule_event_id=p_event_id and region=p_region and deleted_at is null for update;
  if not found or event_row.created_by<>p_identity_id then raise exception using errcode='42501',message='CALENDAR_ACCESS_DENIED'; end if;
  if event_row.version<>p_expected_version then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
  update peacepad_v2.schedule_event set deleted_at=now(),updated_at=now(),version=version+1 where schedule_event_id=p_event_id returning * into event_row;
  response:=jsonb_build_object('id',p_event_id,'status','deleted','version',event_row.version);
  perform peacepad_v2.record_write(p_identity_id,event_row.family_id,p_region,'schedule_event.deleted',p_schema_version,p_idempotency_key,response); return response;
end;
$$;

revoke all on function public.peacepad_v2_list_calendar_layers(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_create_calendar_layer(uuid,text,uuid,text,text,text,text,jsonb,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_update_calendar_layer(uuid,text,uuid,text,text,text,text,jsonb,integer,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_delete_calendar_layer(uuid,text,uuid,integer,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_list_schedule_events(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_create_schedule_event(uuid,text,uuid,uuid,uuid[],text,text,text,timestamptz,timestamptz,text,jsonb,jsonb,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_update_schedule_event(uuid,text,uuid,uuid,uuid[],text,text,text,timestamptz,timestamptz,text,jsonb,jsonb,integer,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_delete_schedule_event(uuid,text,uuid,integer,text,integer) from public,anon,authenticated;
grant execute on function public.peacepad_v2_list_calendar_layers(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_create_calendar_layer(uuid,text,uuid,text,text,text,text,jsonb,text,integer) to service_role;
grant execute on function public.peacepad_v2_update_calendar_layer(uuid,text,uuid,text,text,text,text,jsonb,integer,text,integer) to service_role;
grant execute on function public.peacepad_v2_delete_calendar_layer(uuid,text,uuid,integer,text,integer) to service_role;
grant execute on function public.peacepad_v2_list_schedule_events(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_create_schedule_event(uuid,text,uuid,uuid,uuid[],text,text,text,timestamptz,timestamptz,text,jsonb,jsonb,text,integer) to service_role;
grant execute on function public.peacepad_v2_update_schedule_event(uuid,text,uuid,uuid,uuid[],text,text,text,timestamptz,timestamptz,text,jsonb,jsonb,integer,text,integer) to service_role;
grant execute on function public.peacepad_v2_delete_schedule_event(uuid,text,uuid,integer,text,integer) to service_role;
