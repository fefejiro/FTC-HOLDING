-- Expense receipts are owner-private until they are attached to a shared expense.
-- They deliberately do not reuse Case Binder or conversation attachment authorization.

create table if not exists peacepad_v2.expense_receipt_attachment (
  receipt_attachment_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id) on delete cascade,
  owner_identity_id uuid not null references peacepad_v2.identity(identity_id),
  region text not null check (region in ('ca','us')),
  object_path text not null unique check (object_path ~ '^(ca|us)/expense-receipts/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|pdf)$'),
  original_file_name text not null check (char_length(original_file_name) between 1 and 180),
  media_type text not null check (media_type in ('image/jpeg','image/png','application/pdf')),
  byte_length bigint not null check (byte_length between 1 and 26214400),
  status text not null default 'awaiting-upload' check (status in ('awaiting-upload','available','expired')),
  expires_at timestamptz not null,
  linked_expense_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  version integer not null default 1 check (version > 0)
);

alter table peacepad_v2.family_expense
  drop constraint if exists family_expense_receipt_attachment_id_fkey;
alter table peacepad_v2.family_expense
  add constraint family_expense_receipt_attachment_id_fkey
  foreign key (receipt_attachment_id) references peacepad_v2.expense_receipt_attachment(receipt_attachment_id);
alter table peacepad_v2.expense_receipt_attachment
  drop constraint if exists expense_receipt_linked_expense_fkey;
alter table peacepad_v2.expense_receipt_attachment
  add constraint expense_receipt_linked_expense_fkey
  foreign key (linked_expense_id) references peacepad_v2.family_expense(expense_id) on delete set null;

create unique index if not exists expense_receipt_unlinked_once_idx
  on peacepad_v2.expense_receipt_attachment(receipt_attachment_id) where linked_expense_id is null;
alter table peacepad_v2.expense_receipt_attachment enable row level security;
revoke all on table peacepad_v2.expense_receipt_attachment from public,anon,authenticated;
grant select,insert,update,delete on table peacepad_v2.expense_receipt_attachment to service_role;

create or replace function peacepad_v2.expense_receipt_json(r peacepad_v2.expense_receipt_attachment)
returns jsonb language sql stable set search_path=pg_catalog,peacepad_v2 as $$
 select jsonb_build_object('id',r.receipt_attachment_id,'familyCircleId',r.family_id,'ownerIdentityId',r.owner_identity_id,
  'target',jsonb_build_object('kind','expense-receipt'),'originalFileName',r.original_file_name,'mediaType',r.media_type,
  'byteLength',r.byte_length,'status',r.status,'linkedExpenseId',r.linked_expense_id,'schemaVersion','2.0','version',r.version,
  'region',r.region,'provenance',jsonb_build_object('createdAt',r.created_at,'createdBy',jsonb_build_object('identityId',r.owner_identity_id,'sessionId',r.owner_identity_id),'source','app'));
$$;

create or replace function public.peacepad_v2_prepare_expense_receipt(
 p_identity_id uuid,p_region text,p_family_id uuid,p_original_file_name text,p_media_type text,p_byte_length bigint,p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare r peacepad_v2.expense_receipt_attachment%rowtype; prior jsonb; rid uuid:=gen_random_uuid(); ext text;
begin
 prior:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if prior is not null then return prior; end if;
 if p_schema_version is distinct from 2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
 if not peacepad_v2.parent_core_access(p_identity_id,p_family_id,p_region) then raise exception using errcode='42501',message='FAMILY_ACCESS_DENIED'; end if;
 if trim(p_original_file_name)='' or char_length(trim(p_original_file_name))>180 or p_original_file_name like '%/%' or position(chr(92) in p_original_file_name)>0 or p_original_file_name like '%..%'
   or p_media_type not in ('image/jpeg','image/png','application/pdf') or p_byte_length not between 1 and 26214400 then raise exception using errcode='22023',message='RECEIPT_INTENT_INVALID'; end if;
 ext:=case p_media_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'pdf' end;
 insert into peacepad_v2.expense_receipt_attachment(receipt_attachment_id,family_id,owner_identity_id,region,object_path,original_file_name,media_type,byte_length,expires_at)
 values(rid,p_family_id,p_identity_id,p_region,format('%s/expense-receipts/%s/%s.%s',p_region,p_identity_id,rid,ext),trim(p_original_file_name),p_media_type,p_byte_length,now()+interval '15 minutes') returning * into r;
 prior:=peacepad_v2.expense_receipt_json(r)||jsonb_build_object('expiresAt',r.expires_at,'uploadTransport','supabase-signed','uploadUrl',null,'objectPath',r.object_path);
 perform peacepad_v2.record_write(p_identity_id,p_family_id,p_region,'expense_receipt.prepared',p_schema_version,p_idempotency_key,prior); return prior;
end; $$;

create or replace function public.peacepad_v2_get_expense_receipt_intent(p_identity_id uuid,p_region text,p_receipt_attachment_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare r peacepad_v2.expense_receipt_attachment%rowtype;
begin select * into r from peacepad_v2.expense_receipt_attachment where receipt_attachment_id=p_receipt_attachment_id and region=p_region;
 if not found or r.owner_identity_id<>p_identity_id then raise exception using errcode='42501',message='RECEIPT_ACCESS_DENIED'; end if;
 return peacepad_v2.expense_receipt_json(r)||jsonb_build_object('objectPath',r.object_path,'expiresAt',r.expires_at); end; $$;

create or replace function public.peacepad_v2_complete_expense_receipt(
 p_identity_id uuid,p_region text,p_receipt_attachment_id uuid,p_observed_media_type text,p_observed_byte_length bigint,p_idempotency_key text,p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare r peacepad_v2.expense_receipt_attachment%rowtype; prior jsonb;
begin
 prior:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if prior is not null then return prior; end if;
 select * into r from peacepad_v2.expense_receipt_attachment where receipt_attachment_id=p_receipt_attachment_id and region=p_region for update;
 if not found or r.owner_identity_id<>p_identity_id then raise exception using errcode='42501',message='RECEIPT_ACCESS_DENIED'; end if;
 if r.status='available' then return peacepad_v2.expense_receipt_json(r); end if;
 if r.status<>'awaiting-upload' or r.expires_at<=now() or p_observed_media_type is distinct from r.media_type or p_observed_byte_length is distinct from r.byte_length then raise exception using errcode='22023',message='RECEIPT_OBJECT_MISMATCH'; end if;
 update peacepad_v2.expense_receipt_attachment set status='available',completed_at=now(),version=version+1 where receipt_attachment_id=r.receipt_attachment_id returning * into r;
 prior:=peacepad_v2.expense_receipt_json(r); perform peacepad_v2.record_write(p_identity_id,r.family_id,p_region,'expense_receipt.completed',p_schema_version,p_idempotency_key,prior); return prior;
end; $$;

create or replace function public.peacepad_v2_authorize_expense_receipt_download(p_identity_id uuid,p_region text,p_receipt_attachment_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare r peacepad_v2.expense_receipt_attachment%rowtype;
begin select * into r from peacepad_v2.expense_receipt_attachment where receipt_attachment_id=p_receipt_attachment_id and region=p_region;
 if not found or r.status<>'available' then raise exception using errcode='42501',message='RECEIPT_ACCESS_DENIED'; end if;
 if r.linked_expense_id is null then
   if r.owner_identity_id<>p_identity_id then raise exception using errcode='42501',message='RECEIPT_ACCESS_DENIED'; end if;
 elsif not peacepad_v2.parent_core_access(p_identity_id,r.family_id,p_region) then raise exception using errcode='42501',message='RECEIPT_ACCESS_DENIED'; end if;
 return peacepad_v2.expense_receipt_json(r)||jsonb_build_object('objectPath',r.object_path); end; $$;

create or replace function peacepad_v2.link_expense_receipt()
returns trigger language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare r peacepad_v2.expense_receipt_attachment%rowtype;
begin
 if new.receipt_attachment_id is null then return new; end if;
 select * into r from peacepad_v2.expense_receipt_attachment where receipt_attachment_id=new.receipt_attachment_id for update;
 if not found or r.family_id<>new.family_id or r.region<>new.region or r.owner_identity_id<>new.created_by or r.status<>'available' or r.linked_expense_id is not null then raise exception using errcode='22023',message='RECEIPT_ATTACHMENT_INVALID'; end if;
 update peacepad_v2.expense_receipt_attachment set linked_expense_id=new.expense_id,version=version+1 where receipt_attachment_id=r.receipt_attachment_id;
 return new;
end; $$;
drop trigger if exists family_expense_link_receipt on peacepad_v2.family_expense;
create trigger family_expense_link_receipt before insert on peacepad_v2.family_expense for each row execute function peacepad_v2.link_expense_receipt();

revoke all on function peacepad_v2.expense_receipt_json(peacepad_v2.expense_receipt_attachment),peacepad_v2.link_expense_receipt() from public,anon,authenticated;
revoke all on function public.peacepad_v2_prepare_expense_receipt(uuid,text,uuid,text,text,bigint,text,integer),public.peacepad_v2_get_expense_receipt_intent(uuid,text,uuid),public.peacepad_v2_complete_expense_receipt(uuid,text,uuid,text,bigint,text,integer),public.peacepad_v2_authorize_expense_receipt_download(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.peacepad_v2_prepare_expense_receipt(uuid,text,uuid,text,text,bigint,text,integer),public.peacepad_v2_get_expense_receipt_intent(uuid,text,uuid),public.peacepad_v2_complete_expense_receipt(uuid,text,uuid,text,bigint,text,integer),public.peacepad_v2_authorize_expense_receipt_download(uuid,text,uuid) to service_role;
