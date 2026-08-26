-- Owner-private Case Binders and metadata-only attachment preparation.
-- No file bytes, upload URL, shared evidence, timeline, or export capability
-- exists in this migration. Direct client table access remains denied.

create table if not exists peacepad_v2.case_binder (
  case_binder_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  owner_identity_id uuid not null references peacepad_v2.identity(identity_id),
  region text not null check (region in ('ca', 'us')),
  name text not null check (char_length(name) between 3 and 120),
  child_label text not null check (char_length(child_label) between 2 and 120),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create table if not exists peacepad_v2.attachment_upload_intent (
  attachment_upload_intent_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  owner_identity_id uuid not null references peacepad_v2.identity(identity_id),
  case_binder_id uuid not null references peacepad_v2.case_binder(case_binder_id) on delete cascade,
  region text not null check (region in ('ca', 'us')),
  original_file_name text not null check (char_length(original_file_name) between 1 and 180),
  media_type text not null check (media_type in ('image/jpeg', 'image/png', 'application/pdf', 'text/plain')),
  byte_length bigint not null check (byte_length between 1 and 26214400),
  expires_at timestamptz not null,
  status text not null default 'metadata-prepared' check (status = 'metadata-prepared'),
  upload_transport text not null default 'disabled' check (upload_transport = 'disabled'),
  upload_url text check (upload_url is null),
  created_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  check (expires_at <= created_at + interval '15 minutes')
);

create index if not exists case_binder_owner_idx
  on peacepad_v2.case_binder(owner_identity_id, family_id, created_at);
create index if not exists attachment_intent_expiry_idx
  on peacepad_v2.attachment_upload_intent(owner_identity_id, expires_at);

alter table peacepad_v2.case_binder enable row level security;
alter table peacepad_v2.attachment_upload_intent enable row level security;
revoke all on table peacepad_v2.case_binder from public, anon, authenticated;
revoke all on table peacepad_v2.attachment_upload_intent from public, anon, authenticated;

create or replace function peacepad_v2.can_manage_private_records(
  p_identity_id uuid, p_family_id uuid, p_region text
) returns boolean language sql stable set search_path=pg_catalog,peacepad_v2 as $$
  select exists (
    select 1 from peacepad_v2.participant_grant grant_row
    join peacepad_v2.identity identity_row on identity_row.identity_id=grant_row.identity_id
    join peacepad_v2.family_circle family_row on family_row.family_id=grant_row.family_id
    where grant_row.identity_id=p_identity_id and grant_row.family_id=p_family_id
      and grant_row.region=p_region and identity_row.region=p_region and family_row.region=p_region
      and grant_row.revoked_at is null and identity_row.deleted_at is null and family_row.deleted_at is null
  );
$$;

create or replace function peacepad_v2.case_binder_json(row_value peacepad_v2.case_binder)
returns jsonb language sql stable set search_path=pg_catalog,peacepad_v2 as $$
  select jsonb_build_object(
    'id',row_value.case_binder_id,'familyCircleId',row_value.family_id,
    'ownerIdentityId',row_value.owner_identity_id,'name',row_value.name,
    'childLabel',row_value.child_label,'status',row_value.status,
    'schemaVersion','2.0','version',row_value.version,'region',row_value.region,
    'provenance',jsonb_build_object('createdAt',row_value.created_at,
      'createdBy',jsonb_build_object('identityId',row_value.owner_identity_id,
        'sessionId',row_value.owner_identity_id),'source','app'));
$$;

create or replace function peacepad_v2.attachment_intent_json(row_value peacepad_v2.attachment_upload_intent)
returns jsonb language sql stable set search_path=pg_catalog,peacepad_v2 as $$
  select jsonb_build_object(
    'id',row_value.attachment_upload_intent_id,'familyCircleId',row_value.family_id,
    'ownerIdentityId',row_value.owner_identity_id,
    'target',jsonb_build_object('kind','private-binder','binderId',row_value.case_binder_id),
    'originalFileName',row_value.original_file_name,'mediaType',row_value.media_type,
    'byteLength',row_value.byte_length,'expiresAt',row_value.expires_at,
    'status',row_value.status,'uploadTransport',row_value.upload_transport,
    'uploadUrl',row_value.upload_url,'schemaVersion','2.0','version',row_value.version,
    'region',row_value.region,'provenance',jsonb_build_object('createdAt',row_value.created_at,
      'createdBy',jsonb_build_object('identityId',row_value.owner_identity_id,
        'sessionId',row_value.owner_identity_id),'source','app'));
$$;

create or replace function public.peacepad_v2_list_case_binders(
  p_identity_id uuid,p_region text,p_family_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
begin
  if not peacepad_v2.can_manage_private_records(p_identity_id,p_family_id,p_region) then
    raise exception using errcode='42501',message='FAMILY_ACCESS_DENIED';
  end if;
  return coalesce((select jsonb_agg(peacepad_v2.case_binder_json(row_value) order by row_value.created_at)
    from peacepad_v2.case_binder row_value where row_value.owner_identity_id=p_identity_id
      and row_value.family_id=p_family_id and row_value.region=p_region),'[]'::jsonb);
end;
$$;

create or replace function public.peacepad_v2_create_case_binder(
  p_identity_id uuid,p_region text,p_family_id uuid,p_name text,p_child_label text,
  p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare binder_row peacepad_v2.case_binder%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  if p_region is null or p_region not in ('ca','us') or p_family_id is null then
    raise exception using errcode='22023',message='REGION_INVALID'; end if;
  if not peacepad_v2.can_manage_private_records(p_identity_id,p_family_id,p_region) then
    raise exception using errcode='42501',message='FAMILY_ACCESS_DENIED'; end if;
  if p_name is null or char_length(trim(p_name)) not between 3 and 120
    or p_child_label is null or char_length(trim(p_child_label)) not between 2 and 120 then
    raise exception using errcode='22023',message='CASE_BINDER_INVALID'; end if;
  insert into peacepad_v2.case_binder(case_binder_id,family_id,owner_identity_id,region,name,child_label)
    values(gen_random_uuid(),p_family_id,p_identity_id,p_region,trim(p_name),trim(p_child_label)) returning * into binder_row;
  response:=peacepad_v2.case_binder_json(binder_row);
  perform peacepad_v2.record_write(p_identity_id,p_family_id,p_region,'case_binder.created',p_schema_version,p_idempotency_key,response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_archive_case_binder(
  p_identity_id uuid,p_region text,p_case_binder_id uuid,p_expected_version integer,
  p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare binder_row peacepad_v2.case_binder%rowtype; existing_result jsonb; response jsonb;
begin
  existing_result:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  if p_expected_version is null or p_expected_version<1 then raise exception using errcode='22023',message='EXPECTED_VERSION_INVALID'; end if;
  select * into binder_row from peacepad_v2.case_binder
    where case_binder_id=p_case_binder_id and owner_identity_id=p_identity_id and region=p_region for update;
  if not found or not peacepad_v2.can_manage_private_records(p_identity_id,binder_row.family_id,p_region) then
    raise exception using errcode='42501',message='CASE_BINDER_ACCESS_DENIED'; end if;
  if binder_row.version<>p_expected_version then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
  if binder_row.status<>'active' then raise exception using errcode='22023',message='CASE_BINDER_INVALID'; end if;
  update peacepad_v2.case_binder set status='archived',updated_at=now(),version=version+1
    where case_binder_id=p_case_binder_id returning * into binder_row;
  response:=peacepad_v2.case_binder_json(binder_row);
  perform peacepad_v2.record_write(p_identity_id,binder_row.family_id,p_region,'case_binder.archived',p_schema_version,p_idempotency_key,response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_prepare_attachment_intent(
  p_identity_id uuid,p_region text,p_family_id uuid,p_case_binder_id uuid,
  p_original_file_name text,p_media_type text,p_byte_length bigint,
  p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare binder_row peacepad_v2.case_binder%rowtype; intent_row peacepad_v2.attachment_upload_intent%rowtype;
  existing_result jsonb; response jsonb; normalized_name text;
begin
  existing_result:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  normalized_name:=trim(p_original_file_name);
  if normalized_name is null or char_length(normalized_name) not between 1 and 180
    or normalized_name like '%/%' or position(chr(92) in normalized_name)>0 or normalized_name like '%..%'
    or p_media_type not in ('image/jpeg','image/png','application/pdf','text/plain')
    or p_byte_length is null or p_byte_length not between 1 and 26214400 then
    raise exception using errcode='22023',message='ATTACHMENT_INTENT_INVALID'; end if;
  select * into binder_row from peacepad_v2.case_binder where case_binder_id=p_case_binder_id
    and family_id=p_family_id and owner_identity_id=p_identity_id and region=p_region for update;
  if not found or not peacepad_v2.can_manage_private_records(p_identity_id,p_family_id,p_region) then
    raise exception using errcode='42501',message='CASE_BINDER_ACCESS_DENIED'; end if;
  if binder_row.status<>'active' then raise exception using errcode='22023',message='CASE_BINDER_ARCHIVED'; end if;
  insert into peacepad_v2.attachment_upload_intent(
    attachment_upload_intent_id,family_id,owner_identity_id,case_binder_id,region,
    original_file_name,media_type,byte_length,expires_at
  ) values(gen_random_uuid(),p_family_id,p_identity_id,p_case_binder_id,p_region,
    normalized_name,p_media_type,p_byte_length,now()+interval '15 minutes') returning * into intent_row;
  response:=peacepad_v2.attachment_intent_json(intent_row);
  perform peacepad_v2.record_write(p_identity_id,p_family_id,p_region,'attachment_intent.prepared',p_schema_version,p_idempotency_key,response);
  return response;
end;
$$;

-- Account deletion must remove private data before identity anonymization.
create or replace function public.peacepad_v2_delete_private_records(p_identity_id uuid,p_region text)
returns void language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
begin
  delete from peacepad_v2.attachment_upload_intent where owner_identity_id=p_identity_id and region=p_region;
  delete from peacepad_v2.case_binder where owner_identity_id=p_identity_id and region=p_region;
end;
$$;

create or replace function peacepad_v2.delete_private_records_before_identity_tombstone()
returns trigger language plpgsql set search_path=pg_catalog,peacepad_v2 as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    perform public.peacepad_v2_delete_private_records(old.identity_id,old.region);
  end if;
  return new;
end;
$$;

drop trigger if exists identity_delete_private_records on peacepad_v2.identity;
create trigger identity_delete_private_records
before update of deleted_at on peacepad_v2.identity
for each row execute function peacepad_v2.delete_private_records_before_identity_tombstone();

revoke all on function peacepad_v2.can_manage_private_records(uuid,uuid,text) from public,anon,authenticated;
revoke all on function peacepad_v2.case_binder_json(peacepad_v2.case_binder) from public,anon,authenticated;
revoke all on function peacepad_v2.attachment_intent_json(peacepad_v2.attachment_upload_intent) from public,anon,authenticated;
revoke all on function public.peacepad_v2_list_case_binders(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_create_case_binder(uuid,text,uuid,text,text,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_archive_case_binder(uuid,text,uuid,integer,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_prepare_attachment_intent(uuid,text,uuid,uuid,text,text,bigint,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_delete_private_records(uuid,text) from public,anon,authenticated;
revoke all on function peacepad_v2.delete_private_records_before_identity_tombstone() from public,anon,authenticated;
grant execute on function public.peacepad_v2_list_case_binders(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_create_case_binder(uuid,text,uuid,text,text,text,integer) to service_role;
grant execute on function public.peacepad_v2_archive_case_binder(uuid,text,uuid,integer,text,integer) to service_role;
grant execute on function public.peacepad_v2_prepare_attachment_intent(uuid,text,uuid,uuid,text,text,bigint,text,integer) to service_role;
grant execute on function public.peacepad_v2_delete_private_records(uuid,text) to service_role;
