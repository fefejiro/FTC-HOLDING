-- Shared parenting patterns and negotiated exceptions. Direct client access
-- remains denied; only the regional Edge API may call these scoped functions.
create table if not exists peacepad_v2.parenting_schedule_plan (
  parenting_schedule_plan_id uuid primary key default gen_random_uuid(),
  family_id uuid not null unique references peacepad_v2.family_circle(family_id) on delete cascade,
  calendar_layer_id uuid not null references peacepad_v2.calendar_layer(calendar_layer_id),
  region text not null check (region in ('ca','us')),
  created_by uuid not null references peacepad_v2.identity(identity_id),
  pattern text not null check (pattern in ('week_on_off','every_other_weekend','two_two_three')),
  start_date date not null,
  primary_parent_identity_id uuid not null references peacepad_v2.identity(identity_id),
  secondary_parent_identity_id uuid references peacepad_v2.identity(identity_id),
  timezone text not null check (char_length(timezone) between 1 and 80),
  status text not null check (status in ('active','paused')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  check (secondary_parent_identity_id is null or secondary_parent_identity_id <> primary_parent_identity_id)
);

create table if not exists peacepad_v2.parenting_schedule_exception (
  parenting_schedule_exception_id uuid primary key default gen_random_uuid(),
  family_id uuid not null references peacepad_v2.family_circle(family_id) on delete cascade,
  parenting_schedule_plan_id uuid not null references peacepad_v2.parenting_schedule_plan(parenting_schedule_plan_id) on delete cascade,
  region text not null check (region in ('ca','us')),
  requested_by uuid not null references peacepad_v2.identity(identity_id),
  assigned_parent_identity_id uuid not null references peacepad_v2.identity(identity_id),
  kind text not null check (kind in ('holiday','vacation','swap','other')),
  start_date date not null, end_date date not null, note text check (note is null or char_length(note) <= 500),
  status text not null default 'proposed' check (status in ('proposed','accepted','declined','cancelled')),
  resolved_by uuid references peacepad_v2.identity(identity_id), resolved_at timestamptz,
  created_at timestamptz not null default now(), version integer not null default 1 check (version > 0),
  check (end_date >= start_date)
);
create index if not exists parenting_schedule_exception_family_idx on peacepad_v2.parenting_schedule_exception(family_id, start_date desc);
alter table peacepad_v2.parenting_schedule_plan enable row level security;
alter table peacepad_v2.parenting_schedule_exception enable row level security;
revoke all on peacepad_v2.parenting_schedule_plan, peacepad_v2.parenting_schedule_exception from public, anon, authenticated;

create or replace function peacepad_v2.parenting_schedule_plan_json(r peacepad_v2.parenting_schedule_plan) returns jsonb language sql stable as $$
 select jsonb_build_object('id',r.parenting_schedule_plan_id,'familyCircleId',r.family_id,'calendarLayerId',r.calendar_layer_id,
  'createdByIdentityId',r.created_by,'pattern',r.pattern,'startDate',r.start_date,'primaryParentIdentityId',r.primary_parent_identity_id,
  'secondaryParentIdentityId',r.secondary_parent_identity_id,'timezone',r.timezone,'status',r.status,'updatedAt',r.updated_at,
  'schemaVersion','2.0','version',r.version,'region',r.region,'provenance',jsonb_build_object('createdAt',r.created_at,
  'createdBy',jsonb_build_object('identityId',r.created_by,'sessionId',null),'source','app'));
$$;
create or replace function peacepad_v2.parenting_schedule_exception_json(r peacepad_v2.parenting_schedule_exception) returns jsonb language sql stable as $$
 select jsonb_build_object('id',r.parenting_schedule_exception_id,'familyCircleId',r.family_id,'parentingSchedulePlanId',r.parenting_schedule_plan_id,
  'requestedByIdentityId',r.requested_by,'assignedParentIdentityId',r.assigned_parent_identity_id,'kind',r.kind,'startDate',r.start_date,
  'endDate',r.end_date,'note',r.note,'status',r.status,'resolvedByIdentityId',r.resolved_by,'resolvedAt',r.resolved_at,
  'schemaVersion','2.0','version',r.version,'region',r.region,'provenance',jsonb_build_object('createdAt',r.created_at,
  'createdBy',jsonb_build_object('identityId',r.requested_by,'sessionId',null),'source','app'));
$$;

create or replace function public.peacepad_v2_parenting_schedule_read(p_identity_id uuid,p_region text,p_family_id uuid,p_resource text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare plan_r peacepad_v2.parenting_schedule_plan%rowtype;
begin
 if not peacepad_v2.parent_core_access(p_identity_id,p_family_id,p_region) then raise exception using errcode='42501',message='FAMILY_ACCESS_DENIED'; end if;
 if p_resource='plan' then select * into plan_r from peacepad_v2.parenting_schedule_plan where family_id=p_family_id and region=p_region; return case when found then peacepad_v2.parenting_schedule_plan_json(plan_r) else null end; end if;
 if p_resource='exceptions' then return coalesce((select jsonb_agg(peacepad_v2.parenting_schedule_exception_json(r) order by r.start_date desc) from peacepad_v2.parenting_schedule_exception r where r.family_id=p_family_id and r.region=p_region),'[]'); end if;
 raise exception using errcode='22023',message='PARENTING_SCHEDULE_INVALID';
end; $$;

create or replace function public.peacepad_v2_parenting_schedule_write(p_identity_id uuid,p_region text,p_operation text,p_payload jsonb,p_expected_version integer,p_idempotency_key text,p_schema_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare prior jsonb; response jsonb; v_family_id uuid; plan_r peacepad_v2.parenting_schedule_plan%rowtype; exception_r peacepad_v2.parenting_schedule_exception%rowtype;
begin
 prior:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if prior is not null then return prior; end if;
 if p_schema_version<>2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
 v_family_id:=nullif(p_payload->>'familyCircleId','')::uuid;
 if v_family_id is null and p_operation='exception.resolve' then select r.family_id into v_family_id from peacepad_v2.parenting_schedule_exception r where r.parenting_schedule_exception_id=(p_payload->>'id')::uuid; end if;
 if v_family_id is null or not peacepad_v2.parent_core_access(p_identity_id,v_family_id,p_region) then raise exception using errcode='42501',message='FAMILY_ACCESS_DENIED'; end if;
 if p_operation='schedule.save' then
  if not peacepad_v2.parent_core_access((p_payload->>'primaryParentIdentityId')::uuid,v_family_id,p_region) or
    (nullif(p_payload->>'secondaryParentIdentityId','') is not null and not peacepad_v2.parent_core_access((p_payload->>'secondaryParentIdentityId')::uuid,v_family_id,p_region)) then raise exception using errcode='22023',message='PARENTING_SCHEDULE_INVALID'; end if;
  insert into peacepad_v2.parenting_schedule_plan(family_id,calendar_layer_id,region,created_by,pattern,start_date,primary_parent_identity_id,secondary_parent_identity_id,timezone,status)
   values(v_family_id,(p_payload->>'calendarLayerId')::uuid,p_region,p_identity_id,p_payload->>'pattern',(p_payload->>'startDate')::date,(p_payload->>'primaryParentIdentityId')::uuid,nullif(p_payload->>'secondaryParentIdentityId','')::uuid,p_payload->>'timezone',p_payload->>'status')
   on conflict (family_id) do update set calendar_layer_id=excluded.calendar_layer_id,pattern=excluded.pattern,start_date=excluded.start_date,primary_parent_identity_id=excluded.primary_parent_identity_id,secondary_parent_identity_id=excluded.secondary_parent_identity_id,timezone=excluded.timezone,status=excluded.status,updated_at=now(),version=peacepad_v2.parenting_schedule_plan.version+1
   where p_expected_version is null or peacepad_v2.parenting_schedule_plan.version=p_expected_version returning * into plan_r;
  if not found then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if; response:=peacepad_v2.parenting_schedule_plan_json(plan_r);
 elsif p_operation='exception.create' then
  insert into peacepad_v2.parenting_schedule_exception(family_id,parenting_schedule_plan_id,region,requested_by,assigned_parent_identity_id,kind,start_date,end_date,note)
   values(v_family_id,(p_payload->>'parentingSchedulePlanId')::uuid,p_region,p_identity_id,(p_payload->>'assignedParentIdentityId')::uuid,p_payload->>'kind',(p_payload->>'startDate')::date,(p_payload->>'endDate')::date,nullif(trim(p_payload->>'note'),'')) returning * into exception_r;
  response:=peacepad_v2.parenting_schedule_exception_json(exception_r);
 elsif p_operation='exception.resolve' then
  update peacepad_v2.parenting_schedule_exception set status=p_payload->>'resolution',resolved_by=p_identity_id,resolved_at=now(),version=version+1
   where parenting_schedule_exception_id=(p_payload->>'id')::uuid and region=p_region and version=p_expected_version and status='proposed' returning * into exception_r;
  if not found then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if; response:=peacepad_v2.parenting_schedule_exception_json(exception_r);
 else raise exception using errcode='22023',message='PARENTING_SCHEDULE_INVALID'; end if;
 perform peacepad_v2.record_write(p_identity_id,v_family_id,p_region,p_operation,p_schema_version,p_idempotency_key,response); return response;
end; $$;
revoke all on function public.peacepad_v2_parenting_schedule_read(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.peacepad_v2_parenting_schedule_write(uuid,text,text,jsonb,integer,text,integer) from public,anon,authenticated;
grant execute on function public.peacepad_v2_parenting_schedule_read(uuid,text,uuid,text) to service_role;
grant execute on function public.peacepad_v2_parenting_schedule_write(uuid,text,text,jsonb,integer,text,integer) to service_role;
