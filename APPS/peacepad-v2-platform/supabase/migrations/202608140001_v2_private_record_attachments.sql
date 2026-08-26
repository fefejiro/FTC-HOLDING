-- Owner-private Case Binder file storage. File bytes live only in a private
-- Supabase Storage bucket; PostgreSQL keeps bounded metadata and authorization
-- state. Signed upload URLs and download URLs are created by the Edge API and
-- are never persisted in PostgreSQL or audit records.

alter table peacepad_v2.attachment_upload_intent
  add column if not exists object_path text,
  add column if not exists completed_at timestamptz;

alter table peacepad_v2.attachment_upload_intent
  drop constraint if exists attachment_upload_intent_status_check,
  drop constraint if exists attachment_upload_intent_upload_transport_check,
  drop constraint if exists attachment_upload_intent_upload_url_check,
  drop constraint if exists attachment_upload_intent_object_path_check;

alter table peacepad_v2.attachment_upload_intent
  add constraint attachment_upload_intent_status_check
    check (status in ('metadata-prepared', 'awaiting-upload', 'completed', 'expired')),
  add constraint attachment_upload_intent_upload_transport_check
    check (upload_transport in ('disabled', 'supabase-signed')),
  add constraint attachment_upload_intent_upload_url_check
    check (upload_url is null),
  add constraint attachment_upload_intent_object_path_check
    check (
      (upload_transport = 'disabled' and object_path is null)
      or (
        upload_transport = 'supabase-signed'
        and object_path ~ '^(ca|us)/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|pdf|txt)$'
      )
    );

create unique index if not exists attachment_upload_intent_object_path_unique
  on peacepad_v2.attachment_upload_intent(object_path)
  where object_path is not null;

create table if not exists peacepad_v2.private_attachment (
  attachment_id uuid primary key references peacepad_v2.attachment_upload_intent(attachment_upload_intent_id) on delete cascade,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  owner_identity_id uuid not null references peacepad_v2.identity(identity_id),
  case_binder_id uuid not null references peacepad_v2.case_binder(case_binder_id) on delete cascade,
  region text not null check (region in ('ca', 'us')),
  object_path text not null unique check (
    object_path ~ '^(ca|us)/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|pdf|txt)$'
  ),
  original_file_name text not null check (char_length(original_file_name) between 1 and 180),
  media_type text not null check (media_type in ('image/jpeg', 'image/png', 'application/pdf', 'text/plain')),
  byte_length bigint not null check (byte_length between 1 and 26214400),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create index if not exists private_attachment_owner_binder_idx
  on peacepad_v2.private_attachment(owner_identity_id, case_binder_id, created_at);

create table if not exists peacepad_v2.private_storage_cleanup_outbox (
  object_path text primary key,
  identity_id uuid not null,
  region text not null check (region in ('ca', 'us')),
  requested_at timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz,
  last_error_code text check (last_error_code is null or last_error_code = 'STORAGE_DELETE_FAILED')
);

create index if not exists private_storage_cleanup_ready_idx
  on peacepad_v2.private_storage_cleanup_outbox(region, next_attempt_at, requested_at);

alter table peacepad_v2.private_attachment enable row level security;
alter table peacepad_v2.private_storage_cleanup_outbox enable row level security;
revoke all on table peacepad_v2.private_attachment from public, anon, authenticated;
revoke all on table peacepad_v2.private_storage_cleanup_outbox from public, anon, authenticated;
grant select, insert, update, delete on table peacepad_v2.private_attachment to service_role;
grant select, insert, update, delete on table peacepad_v2.private_storage_cleanup_outbox to service_role;

create or replace function peacepad_v2.private_attachment_json(row_value peacepad_v2.private_attachment)
returns jsonb language sql stable set search_path=pg_catalog,peacepad_v2 as $$
  select jsonb_build_object(
    'id',row_value.attachment_id,'familyCircleId',row_value.family_id,
    'ownerIdentityId',row_value.owner_identity_id,
    'target',jsonb_build_object('kind','private-binder','binderId',row_value.case_binder_id),
    'originalFileName',row_value.original_file_name,'mediaType',row_value.media_type,
    'byteLength',row_value.byte_length,'status',row_value.status,
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
    'uploadUrl',null,'objectPath',row_value.object_path,
    'schemaVersion','2.0','version',row_value.version,'region',row_value.region,
    'provenance',jsonb_build_object('createdAt',row_value.created_at,
      'createdBy',jsonb_build_object('identityId',row_value.owner_identity_id,
        'sessionId',row_value.owner_identity_id),'source','app'));
$$;

create or replace function public.peacepad_v2_prepare_attachment_intent(
  p_identity_id uuid,p_region text,p_family_id uuid,p_case_binder_id uuid,
  p_original_file_name text,p_media_type text,p_byte_length bigint,
  p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare binder_row peacepad_v2.case_binder%rowtype; intent_row peacepad_v2.attachment_upload_intent%rowtype;
  existing_result jsonb; response jsonb; normalized_name text; intent_id uuid := gen_random_uuid(); extension text;
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
  extension := case p_media_type when 'image/jpeg' then '.jpg' when 'image/png' then '.png'
    when 'application/pdf' then '.pdf' else '.txt' end;
  insert into peacepad_v2.attachment_upload_intent(
    attachment_upload_intent_id,family_id,owner_identity_id,case_binder_id,region,
    original_file_name,media_type,byte_length,expires_at,status,upload_transport,object_path
  ) values(intent_id,p_family_id,p_identity_id,p_case_binder_id,p_region,
    normalized_name,p_media_type,p_byte_length,now()+interval '15 minutes','awaiting-upload','supabase-signed',
    format('%s/%s/%s/%s%s',p_region,p_identity_id,p_case_binder_id,intent_id,extension)) returning * into intent_row;
  response:=peacepad_v2.attachment_intent_json(intent_row);
  perform peacepad_v2.record_write(p_identity_id,p_family_id,p_region,'attachment_intent.prepared',p_schema_version,p_idempotency_key,response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_complete_private_attachment(
  p_identity_id uuid,p_region text,p_attachment_intent_id uuid,
  p_observed_media_type text,p_observed_byte_length bigint,
  p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare intent_row peacepad_v2.attachment_upload_intent%rowtype; attachment_row peacepad_v2.private_attachment%rowtype;
  existing_result jsonb; response jsonb;
begin
  existing_result:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  select * into intent_row from peacepad_v2.attachment_upload_intent
    where attachment_upload_intent_id=p_attachment_intent_id and owner_identity_id=p_identity_id and region=p_region for update;
  if not found or not peacepad_v2.can_manage_private_records(p_identity_id,intent_row.family_id,p_region) then
    raise exception using errcode='42501',message='ATTACHMENT_ACCESS_DENIED'; end if;
  if intent_row.status='completed' then
    select * into attachment_row from peacepad_v2.private_attachment where attachment_id=p_attachment_intent_id;
    if not found then raise exception using errcode='55000',message='ATTACHMENT_STATE_INVALID'; end if;
    return peacepad_v2.private_attachment_json(attachment_row);
  end if;
  if intent_row.status<>'awaiting-upload' or intent_row.expires_at<=now() or intent_row.object_path is null then
    raise exception using errcode='22023',message='ATTACHMENT_INTENT_EXPIRED'; end if;
  if p_observed_media_type is distinct from intent_row.media_type
    or p_observed_byte_length is distinct from intent_row.byte_length then
    raise exception using errcode='22023',message='ATTACHMENT_OBJECT_MISMATCH'; end if;
  insert into peacepad_v2.private_attachment(
    attachment_id,family_id,owner_identity_id,case_binder_id,region,object_path,
    original_file_name,media_type,byte_length
  ) values(intent_row.attachment_upload_intent_id,intent_row.family_id,intent_row.owner_identity_id,
    intent_row.case_binder_id,intent_row.region,intent_row.object_path,intent_row.original_file_name,
    intent_row.media_type,intent_row.byte_length) returning * into attachment_row;
  update peacepad_v2.attachment_upload_intent set status='completed',completed_at=now(),version=version+1
    where attachment_upload_intent_id=p_attachment_intent_id;
  response:=peacepad_v2.private_attachment_json(attachment_row);
  perform peacepad_v2.record_write(p_identity_id,intent_row.family_id,p_region,'attachment.uploaded',p_schema_version,p_idempotency_key,response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_list_private_attachments(
  p_identity_id uuid,p_region text,p_case_binder_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare binder_row peacepad_v2.case_binder%rowtype;
begin
  select * into binder_row from peacepad_v2.case_binder where case_binder_id=p_case_binder_id
    and owner_identity_id=p_identity_id and region=p_region;
  if not found or not peacepad_v2.can_manage_private_records(p_identity_id,binder_row.family_id,p_region) then
    raise exception using errcode='42501',message='CASE_BINDER_ACCESS_DENIED'; end if;
  return coalesce((select jsonb_agg(peacepad_v2.private_attachment_json(row_value) order by row_value.created_at desc)
    from peacepad_v2.private_attachment row_value where row_value.case_binder_id=p_case_binder_id
      and row_value.owner_identity_id=p_identity_id and row_value.region=p_region),'[]'::jsonb);
end;
$$;

create or replace function public.peacepad_v2_get_attachment_intent_for_completion(
  p_identity_id uuid,p_region text,p_attachment_intent_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare intent_row peacepad_v2.attachment_upload_intent%rowtype;
begin
  select * into intent_row from peacepad_v2.attachment_upload_intent
    where attachment_upload_intent_id=p_attachment_intent_id and owner_identity_id=p_identity_id and region=p_region;
  if not found or not peacepad_v2.can_manage_private_records(p_identity_id,intent_row.family_id,p_region) then
    raise exception using errcode='42501',message='ATTACHMENT_ACCESS_DENIED'; end if;
  if intent_row.status<>'awaiting-upload' or intent_row.expires_at<=now() then
    raise exception using errcode='22023',message='ATTACHMENT_INTENT_EXPIRED'; end if;
  return peacepad_v2.attachment_intent_json(intent_row);
end;
$$;

create or replace function public.peacepad_v2_authorize_private_attachment_download(
  p_identity_id uuid,p_region text,p_attachment_id uuid
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare attachment_row peacepad_v2.private_attachment%rowtype;
begin
  select * into attachment_row from peacepad_v2.private_attachment where attachment_id=p_attachment_id
    and owner_identity_id=p_identity_id and region=p_region;
  if not found or not peacepad_v2.can_manage_private_records(p_identity_id,attachment_row.family_id,p_region) then
    raise exception using errcode='42501',message='ATTACHMENT_ACCESS_DENIED'; end if;
  return peacepad_v2.private_attachment_json(attachment_row) || jsonb_build_object('objectPath',attachment_row.object_path);
end;
$$;

create or replace function public.peacepad_v2_list_private_storage_paths_for_account(
  p_identity_id uuid,p_region text
) returns text[] language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
begin
  if not exists(select 1 from peacepad_v2.identity where identity_id=p_identity_id and region=p_region and deleted_at is null) then
    raise exception using errcode='42501',message='IDENTITY_NOT_BOUND'; end if;
  return coalesce((select array_agg(paths.object_path order by paths.object_path) from (
    select object_path from peacepad_v2.private_attachment where owner_identity_id=p_identity_id and region=p_region
    union select object_path from peacepad_v2.attachment_upload_intent
      where owner_identity_id=p_identity_id and region=p_region and object_path is not null
  ) paths),'{}'::text[]);
end;
$$;

create or replace function public.peacepad_v2_delete_private_records(p_identity_id uuid,p_region text)
returns void language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
begin
  insert into peacepad_v2.private_storage_cleanup_outbox(object_path,identity_id,region)
  select paths.object_path,p_identity_id,p_region from (
    select object_path from peacepad_v2.private_attachment where owner_identity_id=p_identity_id and region=p_region
    union select object_path from peacepad_v2.attachment_upload_intent
      where owner_identity_id=p_identity_id and region=p_region and object_path is not null
  ) paths on conflict(object_path) do nothing;
  delete from peacepad_v2.attachment_upload_intent where owner_identity_id=p_identity_id and region=p_region;
  delete from peacepad_v2.case_binder where owner_identity_id=p_identity_id and region=p_region;
end;
$$;

create or replace function public.peacepad_v2_ack_private_storage_cleanup(p_identity_id uuid,p_object_paths text[])
returns integer language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare removed integer;
begin
  if p_identity_id is null or p_object_paths is null then raise exception using errcode='22023',message='INVALID_REQUEST'; end if;
  delete from peacepad_v2.private_storage_cleanup_outbox where identity_id=p_identity_id and object_path=any(p_object_paths);
  get diagnostics removed=row_count;
  return removed;
end;
$$;

create or replace function public.peacepad_v2_claim_private_storage_cleanup(p_region text,p_limit integer,p_lease_seconds integer)
returns table(object_path text,identity_id uuid,region text,attempt_count integer,lease_token uuid)
language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
begin
  if p_region not in ('ca','us') or p_limit not between 1 and 25 or p_lease_seconds not between 30 and 300 then
    raise exception using errcode='22023',message='INVALID_REQUEST'; end if;
  return query with candidates as (
    select cleanup.object_path from peacepad_v2.private_storage_cleanup_outbox cleanup
    where cleanup.region=p_region and cleanup.next_attempt_at<=now()
      and (cleanup.lease_expires_at is null or cleanup.lease_expires_at<=now())
    order by cleanup.next_attempt_at,cleanup.requested_at for update skip locked limit p_limit
  ) update peacepad_v2.private_storage_cleanup_outbox cleanup
    set attempt_count=cleanup.attempt_count+1,last_attempt_at=now(),lease_token=gen_random_uuid(),
      lease_expires_at=now()+make_interval(secs=>p_lease_seconds)
    from candidates where cleanup.object_path=candidates.object_path
    returning cleanup.object_path,cleanup.identity_id,cleanup.region,cleanup.attempt_count,cleanup.lease_token;
end;
$$;

create or replace function public.peacepad_v2_finish_private_storage_cleanup(
  p_object_path text,p_lease_token uuid,p_succeeded boolean
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare cleanup peacepad_v2.private_storage_cleanup_outbox%rowtype;
begin
  select * into cleanup from peacepad_v2.private_storage_cleanup_outbox where object_path=p_object_path
    and lease_token=p_lease_token and lease_expires_at>now() for update;
  if not found then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
  if p_succeeded then
    delete from peacepad_v2.private_storage_cleanup_outbox where object_path=p_object_path;
    return jsonb_build_object('status','completed');
  end if;
  update peacepad_v2.private_storage_cleanup_outbox set
    next_attempt_at=now()+make_interval(mins=>least(1440,power(2,least(cleanup.attempt_count,10))::integer)),
    lease_token=null,lease_expires_at=null,last_error_code='STORAGE_DELETE_FAILED'
    where object_path=p_object_path;
  return jsonb_build_object('status','pending','attemptCount',cleanup.attempt_count);
end;
$$;

-- Managed Supabase projects expose the storage schema. Disposable PostgreSQL
-- verification fixtures may not, so bucket/policy setup is conditional while
-- every application authorization invariant above remains fully testable.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    execute $bucket$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
      values('peacepad-private-records','peacepad-private-records',false,26214400,
        array['image/jpeg','image/png','application/pdf','text/plain'])
      on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,
        allowed_mime_types=excluded.allowed_mime_types$bucket$;
  end if;
end $$;

revoke all on function peacepad_v2.private_attachment_json(peacepad_v2.private_attachment) from public,anon,authenticated;
revoke all on function public.peacepad_v2_complete_private_attachment(uuid,text,uuid,text,bigint,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_list_private_attachments(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_get_attachment_intent_for_completion(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_authorize_private_attachment_download(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_list_private_storage_paths_for_account(uuid,text) from public,anon,authenticated;
revoke all on function public.peacepad_v2_ack_private_storage_cleanup(uuid,text[]) from public,anon,authenticated;
revoke all on function public.peacepad_v2_claim_private_storage_cleanup(text,integer,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_finish_private_storage_cleanup(text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.peacepad_v2_complete_private_attachment(uuid,text,uuid,text,bigint,text,integer) to service_role;
grant execute on function public.peacepad_v2_list_private_attachments(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_get_attachment_intent_for_completion(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_authorize_private_attachment_download(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_list_private_storage_paths_for_account(uuid,text) to service_role;
grant execute on function public.peacepad_v2_ack_private_storage_cleanup(uuid,text[]) to service_role;
grant execute on function public.peacepad_v2_claim_private_storage_cleanup(text,integer,integer) to service_role;
grant execute on function public.peacepad_v2_finish_private_storage_cleanup(text,uuid,boolean) to service_role;
