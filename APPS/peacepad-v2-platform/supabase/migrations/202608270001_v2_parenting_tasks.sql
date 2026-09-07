-- Native port of the legacy shared Tasks workflow.  Tasks are real V2 data:
-- scoped to an active parenting space, versioned, audit-receipted and visible
-- only through the same explicit visibility boundary used by calendar layers.

create table if not exists peacepad_v2.parenting_task (
  parenting_task_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  region text not null check (region in ('ca', 'us')),
  created_by uuid not null references peacepad_v2.identity(identity_id),
  assigned_to_identity_id uuid references peacepad_v2.identity(identity_id),
  title text not null check (char_length(title) between 1 and 160),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'completed')),
  visibility jsonb not null default '{"scope":"private"}'::jsonb,
  completed_at timestamptz,
  completed_by uuid references peacepad_v2.identity(identity_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  check ((status = 'completed') = (completed_at is not null)),
  check ((status = 'completed') = (completed_by is not null))
);

create index if not exists parenting_task_family_due_idx
  on peacepad_v2.parenting_task (family_id, due_at, parenting_task_id)
  where deleted_at is null;

alter table peacepad_v2.parenting_task enable row level security;
revoke all on peacepad_v2.parenting_task from anon, authenticated;

create or replace function peacepad_v2.parenting_task_json(row_value peacepad_v2.parenting_task)
returns jsonb language sql stable set search_path = pg_catalog, peacepad_v2 as $$
  select jsonb_build_object(
    'id', row_value.parenting_task_id,
    'familyCircleId', row_value.family_id,
    'createdByIdentityId', row_value.created_by,
    'assignedToIdentityId', row_value.assigned_to_identity_id,
    'title', row_value.title,
    'dueAt', row_value.due_at,
    'status', row_value.status,
    'visibility', row_value.visibility,
    'completedAt', row_value.completed_at,
    'completedByIdentityId', row_value.completed_by,
    'schemaVersion', '2.0', 'version', row_value.version, 'region', row_value.region,
    'provenance', jsonb_build_object('createdAt', row_value.created_at,
      'createdBy', jsonb_build_object('identityId', row_value.created_by, 'sessionId', null), 'source', 'app')
  );
$$;

create or replace function peacepad_v2.task_visibility_allows(
  p_task peacepad_v2.parenting_task, p_identity_id uuid
) returns boolean language sql stable set search_path = pg_catalog, peacepad_v2 as $$
  select peacepad_v2.visibility_allows(
    p_task.visibility, p_task.created_by, p_identity_id, p_task.family_id, p_task.region
  );
$$;

create or replace function public.peacepad_v2_list_parenting_tasks(
  p_identity_id uuid, p_region text, p_family_id uuid
) returns jsonb language plpgsql security definer set search_path = pg_catalog, peacepad_v2 as $$
begin
  if not peacepad_v2.can_calendar(p_identity_id, p_family_id, p_region) then
    raise exception using errcode = '42501', message = 'FAMILY_ACCESS_DENIED';
  end if;
  return coalesce((
    select jsonb_agg(peacepad_v2.parenting_task_json(task_row) order by task_row.status, task_row.due_at nulls last, task_row.created_at)
    from peacepad_v2.parenting_task task_row
    where task_row.family_id = p_family_id and task_row.region = p_region and task_row.deleted_at is null
      and peacepad_v2.task_visibility_allows(task_row, p_identity_id)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.peacepad_v2_create_parenting_task(
  p_identity_id uuid, p_region text, p_family_id uuid, p_title text, p_due_at timestamptz,
  p_assigned_to_identity_id uuid, p_visibility jsonb, p_idempotency_key text, p_schema_version integer
) returns jsonb language plpgsql security definer set search_path = pg_catalog, peacepad_v2 as $$
declare task_row peacepad_v2.parenting_task%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if not peacepad_v2.can_calendar(p_identity_id, p_family_id, p_region) then raise exception using errcode = '42501', message = 'FAMILY_ACCESS_DENIED'; end if;
  if char_length(trim(p_title)) not between 1 and 160
    or not peacepad_v2.visibility_valid(p_visibility, p_family_id, p_region) then
    raise exception using errcode = '22023', message = 'PARENTING_TASK_INVALID';
  end if;
  if p_assigned_to_identity_id is not null and not exists (
    select 1 from peacepad_v2.participant_grant grant_row
    where grant_row.identity_id = p_assigned_to_identity_id and grant_row.family_id = p_family_id
      and grant_row.region = p_region and grant_row.revoked_at is null
  ) then raise exception using errcode = '22023', message = 'PARENTING_TASK_ASSIGNEE_INVALID'; end if;
  insert into peacepad_v2.parenting_task(
    parenting_task_id, family_id, region, created_by, assigned_to_identity_id, title, due_at, visibility
  ) values (
    gen_random_uuid(), p_family_id, p_region, p_identity_id, p_assigned_to_identity_id, trim(p_title), p_due_at, p_visibility
  ) returning * into task_row;
  response := peacepad_v2.parenting_task_json(task_row);
  perform peacepad_v2.record_write(p_identity_id, p_family_id, p_region, 'parenting_task.created', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_update_parenting_task(
  p_identity_id uuid, p_region text, p_task_id uuid, p_title text, p_due_at timestamptz,
  p_assigned_to_identity_id uuid, p_status text, p_visibility jsonb, p_expected_version integer,
  p_idempotency_key text, p_schema_version integer
) returns jsonb language plpgsql security definer set search_path = pg_catalog, peacepad_v2 as $$
declare task_row peacepad_v2.parenting_task%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  select * into task_row from peacepad_v2.parenting_task
    where parenting_task_id = p_task_id and region = p_region and deleted_at is null for update;
  if not found or not peacepad_v2.task_visibility_allows(task_row, p_identity_id) then
    raise exception using errcode = '42501', message = 'PARENTING_TASK_ACCESS_DENIED';
  end if;
  if task_row.version <> p_expected_version then raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;
  if char_length(trim(p_title)) not between 1 and 160 or p_status not in ('open', 'completed')
    or not peacepad_v2.visibility_valid(p_visibility, task_row.family_id, p_region) then
    raise exception using errcode = '22023', message = 'PARENTING_TASK_INVALID';
  end if;
  if p_assigned_to_identity_id is not null and not exists (
    select 1 from peacepad_v2.participant_grant grant_row
    where grant_row.identity_id = p_assigned_to_identity_id and grant_row.family_id = task_row.family_id
      and grant_row.region = p_region and grant_row.revoked_at is null
  ) then raise exception using errcode = '22023', message = 'PARENTING_TASK_ASSIGNEE_INVALID'; end if;
  if task_row.created_by <> p_identity_id and (
    task_row.title <> trim(p_title) or task_row.due_at is distinct from p_due_at
    or task_row.assigned_to_identity_id is distinct from p_assigned_to_identity_id
    or task_row.visibility is distinct from p_visibility
  ) then raise exception using errcode = '42501', message = 'PARENTING_TASK_OWNER_REQUIRED'; end if;
  update peacepad_v2.parenting_task set
    title = trim(p_title), due_at = p_due_at, assigned_to_identity_id = p_assigned_to_identity_id,
    visibility = p_visibility, status = p_status,
    completed_at = case when p_status = 'completed' then coalesce(task_row.completed_at, now()) else null end,
    completed_by = case when p_status = 'completed' then coalesce(task_row.completed_by, p_identity_id) else null end,
    updated_at = now(), version = version + 1
  where parenting_task_id = p_task_id returning * into task_row;
  response := peacepad_v2.parenting_task_json(task_row);
  perform peacepad_v2.record_write(p_identity_id, task_row.family_id, p_region, 'parenting_task.updated', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_delete_parenting_task(
  p_identity_id uuid, p_region text, p_task_id uuid, p_expected_version integer,
  p_idempotency_key text, p_schema_version integer
) returns jsonb language plpgsql security definer set search_path = pg_catalog, peacepad_v2 as $$
declare task_row peacepad_v2.parenting_task%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  select * into task_row from peacepad_v2.parenting_task
    where parenting_task_id = p_task_id and region = p_region and deleted_at is null for update;
  if not found or task_row.created_by <> p_identity_id then
    raise exception using errcode = '42501', message = 'PARENTING_TASK_OWNER_REQUIRED';
  end if;
  if task_row.version <> p_expected_version then raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;
  update peacepad_v2.parenting_task set deleted_at = now(), updated_at = now(), version = version + 1
    where parenting_task_id = p_task_id returning * into task_row;
  response := jsonb_build_object('id', p_task_id, 'status', 'deleted', 'version', task_row.version);
  perform peacepad_v2.record_write(p_identity_id, task_row.family_id, p_region, 'parenting_task.deleted', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

revoke all on function public.peacepad_v2_list_parenting_tasks(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_create_parenting_task(uuid,text,uuid,text,timestamptz,uuid,jsonb,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_update_parenting_task(uuid,text,uuid,text,timestamptz,uuid,text,jsonb,integer,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_delete_parenting_task(uuid,text,uuid,integer,text,integer) from public,anon,authenticated;
grant execute on function public.peacepad_v2_list_parenting_tasks(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_create_parenting_task(uuid,text,uuid,text,timestamptz,uuid,jsonb,text,integer) to service_role;
grant execute on function public.peacepad_v2_update_parenting_task(uuid,text,uuid,text,timestamptz,uuid,text,jsonb,integer,text,integer) to service_role;
grant execute on function public.peacepad_v2_delete_parenting_task(uuid,text,uuid,integer,text,integer) to service_role;
