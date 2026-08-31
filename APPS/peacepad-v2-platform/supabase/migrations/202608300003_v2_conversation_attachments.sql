-- Shared conversation attachments use a separate authorization surface from
-- owner-private Case Binder files. Bytes remain in private storage and are
-- exposed only through short-lived signed URLs after participant checks.

create table if not exists peacepad_v2.conversation_attachment_intent (
  attachment_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  conversation_id uuid not null references peacepad_v2.conversation(conversation_id) on delete cascade,
  owner_identity_id uuid not null references peacepad_v2.identity(identity_id),
  region text not null check (region in ('ca','us')),
  object_path text not null unique check (object_path ~ '^(ca|us)/conversations/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|pdf|txt|m4a|mp4|webm)$'),
  original_file_name text not null check (char_length(original_file_name) between 1 and 180),
  media_type text not null check (media_type in ('image/jpeg','image/png','application/pdf','text/plain','audio/m4a','audio/mp4','audio/webm')),
  byte_length bigint not null check (byte_length between 1 and 26214400),
  expires_at timestamptz not null,
  completed_at timestamptz,
  status text not null default 'awaiting-upload' check (status in ('awaiting-upload','completed','expired')),
  created_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create table if not exists peacepad_v2.conversation_attachment (
  attachment_id uuid primary key references peacepad_v2.conversation_attachment_intent(attachment_id) on delete cascade,
  family_id uuid not null references peacepad_v2.family_circle(family_id),
  conversation_id uuid not null references peacepad_v2.conversation(conversation_id) on delete cascade,
  owner_identity_id uuid not null references peacepad_v2.identity(identity_id),
  region text not null check (region in ('ca','us')),
  object_path text not null unique,
  original_file_name text not null,
  media_type text not null,
  byte_length bigint not null,
  occurred_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create index if not exists conversation_attachment_feed_idx on peacepad_v2.conversation_attachment(conversation_id,occurred_at desc);
alter table peacepad_v2.conversation_attachment_intent enable row level security;
alter table peacepad_v2.conversation_attachment enable row level security;
revoke all on table peacepad_v2.conversation_attachment_intent, peacepad_v2.conversation_attachment from public,anon,authenticated;
grant select,insert,update,delete on table peacepad_v2.conversation_attachment_intent, peacepad_v2.conversation_attachment to service_role;

create or replace function peacepad_v2.conversation_attachment_json(r peacepad_v2.conversation_attachment)
returns jsonb language sql stable set search_path=pg_catalog,peacepad_v2 as $$
 select jsonb_build_object('id',r.attachment_id,'familyCircleId',r.family_id,'ownerIdentityId',r.owner_identity_id,
  'target',jsonb_build_object('kind','conversation','conversationId',r.conversation_id),
  'originalFileName',r.original_file_name,'mediaType',r.media_type,'byteLength',r.byte_length,'status','available',
  'occurredAt',r.occurred_at,'schemaVersion','2.0','version',r.version,'region',r.region,
  'provenance',jsonb_build_object('createdAt',r.occurred_at,'createdBy',jsonb_build_object('identityId',r.owner_identity_id,'sessionId',r.owner_identity_id),'source','app'));
$$;

create or replace function public.peacepad_v2_prepare_conversation_attachment(
 p_identity_id uuid,p_region text,p_family_id uuid,p_conversation_id uuid,p_original_file_name text,p_media_type text,
 p_byte_length bigint,p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare c peacepad_v2.conversation%rowtype; r peacepad_v2.conversation_attachment_intent%rowtype; prior jsonb; aid uuid:=gen_random_uuid(); ext text;
begin
 prior:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if prior is not null then return prior; end if;
 if p_schema_version is distinct from 2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
 c:=peacepad_v2.authorized_conversation(p_identity_id,p_region,p_conversation_id);
 if c.family_id<>p_family_id then raise exception using errcode='42501',message='CONVERSATION_ACCESS_DENIED'; end if;
 if trim(p_original_file_name)='' or char_length(trim(p_original_file_name))>180 or p_original_file_name like '%/%'
   or position(chr(92) in p_original_file_name)>0 or p_original_file_name like '%..%'
   or p_media_type not in ('image/jpeg','image/png','application/pdf','text/plain','audio/m4a','audio/mp4','audio/webm')
   or p_byte_length not between 1 and 26214400 then raise exception using errcode='22023',message='ATTACHMENT_INTENT_INVALID'; end if;
 ext:=case p_media_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'application/pdf' then 'pdf'
  when 'text/plain' then 'txt' when 'audio/m4a' then 'm4a' when 'audio/mp4' then 'mp4' else 'webm' end;
 insert into peacepad_v2.conversation_attachment_intent(attachment_id,family_id,conversation_id,owner_identity_id,region,object_path,original_file_name,media_type,byte_length,expires_at)
 values(aid,p_family_id,p_conversation_id,p_identity_id,p_region,format('%s/conversations/%s/%s.%s',p_region,p_conversation_id,aid,ext),trim(p_original_file_name),p_media_type,p_byte_length,now()+interval '15 minutes') returning * into r;
 prior:=jsonb_build_object('id',r.attachment_id,'familyCircleId',r.family_id,'ownerIdentityId',r.owner_identity_id,
  'target',jsonb_build_object('kind','conversation','conversationId',r.conversation_id),'originalFileName',r.original_file_name,
  'mediaType',r.media_type,'byteLength',r.byte_length,'expiresAt',r.expires_at,'status','awaiting-upload',
  'uploadTransport','supabase-signed','uploadUrl',null,'objectPath',r.object_path,'schemaVersion','2.0','version',r.version,'region',r.region);
 perform peacepad_v2.record_write(p_identity_id,p_family_id,p_region,'conversation_attachment.prepared',p_schema_version,p_idempotency_key,prior); return prior;
end; $$;

create or replace function public.peacepad_v2_get_conversation_attachment_intent(p_identity_id uuid,p_region text,p_attachment_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare r peacepad_v2.conversation_attachment_intent%rowtype; c peacepad_v2.conversation%rowtype;
begin
 select * into r from peacepad_v2.conversation_attachment_intent where attachment_id=p_attachment_id and region=p_region;
 if not found then raise exception using errcode='42501',message='ATTACHMENT_ACCESS_DENIED'; end if;
 c:=peacepad_v2.authorized_conversation(p_identity_id,p_region,r.conversation_id);
 return jsonb_build_object('id',r.attachment_id,'objectPath',r.object_path,'mediaType',r.media_type,'byteLength',r.byte_length,'status',r.status,'expiresAt',r.expires_at);
end; $$;

create or replace function public.peacepad_v2_complete_conversation_attachment(
 p_identity_id uuid,p_region text,p_attachment_id uuid,p_observed_media_type text,p_observed_byte_length bigint,p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare i peacepad_v2.conversation_attachment_intent%rowtype; a peacepad_v2.conversation_attachment%rowtype; c peacepad_v2.conversation%rowtype; prior jsonb;
begin
 prior:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if prior is not null then return prior; end if;
 select * into i from peacepad_v2.conversation_attachment_intent where attachment_id=p_attachment_id and region=p_region for update;
 if not found then raise exception using errcode='42501',message='ATTACHMENT_ACCESS_DENIED'; end if;
 c:=peacepad_v2.authorized_conversation(p_identity_id,p_region,i.conversation_id);
 if i.status='completed' then select * into a from peacepad_v2.conversation_attachment where attachment_id=p_attachment_id; return peacepad_v2.conversation_attachment_json(a); end if;
 if i.owner_identity_id<>p_identity_id or i.status<>'awaiting-upload' or i.expires_at<=now()
  or p_observed_media_type is distinct from i.media_type or p_observed_byte_length is distinct from i.byte_length
 then raise exception using errcode='22023',message='ATTACHMENT_OBJECT_MISMATCH'; end if;
 insert into peacepad_v2.conversation_attachment(attachment_id,family_id,conversation_id,owner_identity_id,region,object_path,original_file_name,media_type,byte_length)
 values(i.attachment_id,i.family_id,i.conversation_id,i.owner_identity_id,i.region,i.object_path,i.original_file_name,i.media_type,i.byte_length) returning * into a;
 update peacepad_v2.conversation_attachment_intent set status='completed',completed_at=now(),version=version+1 where attachment_id=p_attachment_id;
 prior:=peacepad_v2.conversation_attachment_json(a); perform peacepad_v2.record_write(p_identity_id,i.family_id,p_region,'conversation_attachment.completed',p_schema_version,p_idempotency_key,prior); return prior;
end; $$;

create or replace function public.peacepad_v2_list_conversation_attachments(p_identity_id uuid,p_region text,p_conversation_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
begin perform peacepad_v2.authorized_conversation(p_identity_id,p_region,p_conversation_id);
 return coalesce((select jsonb_agg(peacepad_v2.conversation_attachment_json(a) order by a.occurred_at desc) from peacepad_v2.conversation_attachment a where a.conversation_id=p_conversation_id and a.region=p_region),'[]'::jsonb); end; $$;

create or replace function public.peacepad_v2_authorize_conversation_attachment_download(p_identity_id uuid,p_region text,p_attachment_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare a peacepad_v2.conversation_attachment%rowtype;
begin select * into a from peacepad_v2.conversation_attachment where attachment_id=p_attachment_id and region=p_region;
 if not found then raise exception using errcode='42501',message='ATTACHMENT_ACCESS_DENIED'; end if;
 perform peacepad_v2.authorized_conversation(p_identity_id,p_region,a.conversation_id);
 return peacepad_v2.conversation_attachment_json(a)||jsonb_build_object('objectPath',a.object_path); end; $$;

revoke all on function peacepad_v2.conversation_attachment_json(peacepad_v2.conversation_attachment) from public,anon,authenticated;
revoke all on function public.peacepad_v2_prepare_conversation_attachment(uuid,text,uuid,uuid,text,text,bigint,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_get_conversation_attachment_intent(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_complete_conversation_attachment(uuid,text,uuid,text,bigint,text,integer) from public,anon,authenticated;
revoke all on function public.peacepad_v2_list_conversation_attachments(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_authorize_conversation_attachment_download(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.peacepad_v2_prepare_conversation_attachment(uuid,text,uuid,uuid,text,text,bigint,text,integer) to service_role;
grant execute on function public.peacepad_v2_get_conversation_attachment_intent(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_complete_conversation_attachment(uuid,text,uuid,text,bigint,text,integer) to service_role;
grant execute on function public.peacepad_v2_list_conversation_attachments(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_authorize_conversation_attachment_download(uuid,text,uuid) to service_role;
