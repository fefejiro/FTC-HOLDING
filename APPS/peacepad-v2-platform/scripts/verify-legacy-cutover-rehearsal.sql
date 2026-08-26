-- Fictional-only proof for import-legacy-cutover.sql. This is a disposable
-- rehearsal: no production source, project, account, credentials, or records.

begin;

create temporary table legacy_cutover_user (
  legacy_user_id text primary key, email text, display_name text, created_at timestamptz not null
);
create temporary table legacy_cutover_identity_claim (
  legacy_user_id text primary key, identity_id uuid not null
);
create temporary table legacy_cutover_consent (
  legacy_user_id text not null, consent_type text not null, granted boolean not null, recorded_at timestamptz not null,
  primary key (legacy_user_id, consent_type), check (consent_type in ('terms', 'privacy', 'third_party_ai'))
);
create temporary table legacy_cutover_partnership (
  legacy_partnership_id text primary key, user1_id text not null, user2_id text not null, allow_audio boolean not null, created_at timestamptz not null
);
create temporary table legacy_cutover_conversation (
  legacy_conversation_id text primary key, legacy_partnership_id text not null, created_by_legacy_user_id text not null, created_at timestamptz not null
);
create temporary table legacy_cutover_conversation_member (
  legacy_conversation_id text not null, legacy_user_id text not null, primary key (legacy_conversation_id, legacy_user_id)
);
create temporary table legacy_cutover_message (
  message_id text primary key, legacy_conversation_id text not null, sender_legacy_user_id text not null, body text, message_type text not null, is_deleted boolean not null, occurred_at timestamptz not null
);
create temporary table legacy_cutover_event (
  event_id text primary key, legacy_partnership_id text not null, created_by_legacy_user_id text not null, title text not null, description text,
  starts_at timestamptz not null, ends_at timestamptz not null, target_event_type text not null, status text not null, created_at timestamptz not null
);
create temporary table legacy_cutover_task (
  task_id text primary key, legacy_partnership_id text not null, created_by_legacy_user_id text not null,
  assigned_to_legacy_user_id text, title text not null, completed boolean not null, due_date_text text,
  location_text text, created_at timestamptz not null, source_fingerprint text
);
create temporary table legacy_cutover_record (
  record_id text primary key, source_table text not null, legacy_partnership_id text not null,
  created_by_legacy_user_id text not null, title text not null, content text not null,
  created_at timestamptz not null, source_fingerprint text
);
create temporary table legacy_cutover_expense (
  expense_id text primary key, legacy_partnership_id text not null, paid_by_legacy_user_id text not null,
  description text not null, amount_text text not null, category text not null, status text not null,
  participant_snapshot jsonb not null, settlement_snapshot jsonb not null, created_at timestamptz not null,
  updated_at timestamptz not null, source_fingerprint text
);
create temporary table legacy_cutover_attachment (
  attachment_id text primary key, source_parent_table text not null, source_parent_id text not null,
  legacy_partnership_id text not null, owner_legacy_user_id text not null, original_file_name text not null,
  media_type text not null, byte_length bigint not null, content_sha256 text not null, source_locator text not null,
  target_case_binder_id uuid not null, target_attachment_id uuid not null, target_object_path text not null,
  source_fingerprint text
);

insert into auth.users(id) values
  ('90000000-0000-4000-8000-000000000001'), ('90000000-0000-4000-8000-000000000002');
insert into legacy_cutover_user values
  ('10000000-0000-4000-8000-000000000001', 'alex@example.test', 'Alex Example', '2026-01-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000002', 'blair@example.test', 'Blair Example', '2026-01-01T00:00:00Z');
insert into legacy_cutover_identity_claim values
  ('10000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000002');
insert into legacy_cutover_consent values
  ('10000000-0000-4000-8000-000000000001', 'terms', true, '2026-01-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000001', 'privacy', true, '2026-01-01T00:00:00Z'),
  ('10000000-0000-4000-8000-000000000002', 'terms', true, '2026-01-02T00:00:00Z');
insert into legacy_cutover_partnership values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', true, '2026-01-02T00:00:00Z');
insert into legacy_cutover_conversation values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '2026-01-03T00:00:00Z');
insert into legacy_cutover_conversation_member values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');
insert into legacy_cutover_message values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Fictional rehearsal message', 'text', false, '2026-01-03T01:00:00Z');
insert into legacy_cutover_event values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Fictional appointment', 'Fictional only', '2026-02-01T09:00:00Z', '2026-02-01T10:00:00Z', 'appointment', 'planned', '2026-01-04T00:00:00Z');
insert into legacy_cutover_task values
  ('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',
   'Fictional school form',false,'2026-02-02','Fictional location','2026-01-05T00:00:00Z',null);
update legacy_cutover_task set source_fingerprint=encode(extensions.digest(concat_ws(chr(31),task_id,legacy_partnership_id,
  created_by_legacy_user_id,coalesce(assigned_to_legacy_user_id,''),title,completed::text,coalesce(due_date_text,''),
  coalesce(location_text,''),created_at::text),'sha256'),'hex');
insert into legacy_cutover_record values
  ('61000000-0000-4000-8000-000000000001','notes','20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001','Fictional shared note','Fictional rehearsal content',
   '2026-01-05T01:00:00Z',null);
update legacy_cutover_record set source_fingerprint=encode(extensions.digest(concat_ws(chr(31),record_id,source_table,
  legacy_partnership_id,created_by_legacy_user_id,title,content,created_at::text),'sha256'),'hex');
insert into legacy_cutover_expense values
  ('70000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001','Fictional school expense','25.00','school','pending',
   '[{"legacyUserId":"10000000-0000-4000-8000-000000000002","owedAmount":"12.50"}]',
   '[]','2026-01-06T00:00:00Z','2026-01-06T00:00:00Z',null);
update legacy_cutover_expense set source_fingerprint=encode(extensions.digest(concat_ws(chr(31),expense_id,
  legacy_partnership_id,paid_by_legacy_user_id,description,amount_text,category,status,participant_snapshot::text,
  settlement_snapshot::text,created_at::text,updated_at::text),'sha256'),'hex');
insert into legacy_cutover_attachment values
  ('legacy-receipt-1','expenses','70000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
   'fictional-receipt.pdf','application/pdf',128,'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
   'legacy://expenses/70000000-0000-4000-8000-000000000001/receipt',
   '80000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002',
   'ca/90000000-0000-4000-8000-000000000001/80000000-0000-4000-8000-000000000001/80000000-0000-4000-8000-000000000002.pdf',null);
update legacy_cutover_attachment set source_fingerprint=encode(extensions.digest(concat_ws(chr(31),attachment_id,
  source_parent_table,source_parent_id,legacy_partnership_id,owner_legacy_user_id,original_file_name,media_type,
  byte_length::text,content_sha256,source_locator,target_case_binder_id::text,target_attachment_id::text,
  target_object_path),'sha256'),'hex');

\set cutover_region 'ca'
\set consent_policy_version 'fictional-rehearsal-v1'
\set migration_batch_id 'fictional-batch-2026-08-14'
\ir import-legacy-cutover.sql

do $$
begin
  if (select count(*) from peacepad_v2.identity where identity_id in ('90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002')) <> 2 then raise exception 'CUTOVER_REHEARSAL_IDENTITY_COUNT'; end if;
  if (select count(*) from peacepad_v2.consent_record where identity_id in ('90000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000002')) <> 3 then raise exception 'CUTOVER_REHEARSAL_CONSENT_COUNT'; end if;
  if (select count(*) from peacepad_v2.family_circle where family_id = '20000000-0000-4000-8000-000000000001') <> 1 then raise exception 'CUTOVER_REHEARSAL_FAMILY_COUNT'; end if;
  if (select count(*) from peacepad_v2.participant_grant where family_id = '20000000-0000-4000-8000-000000000001') <> 2 then raise exception 'CUTOVER_REHEARSAL_GRANT_COUNT'; end if;
  if (select count(*) from peacepad_v2.conversation where conversation_id = '30000000-0000-4000-8000-000000000001') <> 1 then raise exception 'CUTOVER_REHEARSAL_CONVERSATION_COUNT'; end if;
  if (select count(*) from peacepad_v2.message_event where message_event_id = '40000000-0000-4000-8000-000000000001' and body = 'Fictional rehearsal message') <> 1 then raise exception 'CUTOVER_REHEARSAL_MESSAGE_FINGERPRINT'; end if;
  if (select count(*) from peacepad_v2.calendar_layer where family_id = '20000000-0000-4000-8000-000000000001') <> 1 then raise exception 'CUTOVER_REHEARSAL_LAYER_COUNT'; end if;
  if (select count(*) from peacepad_v2.schedule_event where schedule_event_id = '50000000-0000-4000-8000-000000000001' and title = 'Fictional appointment') <> 1 then raise exception 'CUTOVER_REHEARSAL_EVENT_FINGERPRINT'; end if;
  if not exists (select 1 from peacepad_v2.participant_grant where family_id = '20000000-0000-4000-8000-000000000001' and 'calls' = any(permissions)) then raise exception 'CUTOVER_REHEARSAL_AUDIO_PERMISSION'; end if;
  if (select count(*) from peacepad_v2.legacy_source_map where migration_batch_id='fictional-batch-2026-08-14') <> 11 then raise exception 'CUTOVER_REHEARSAL_SOURCE_MAP_COUNT'; end if;
  if (select count(*) from peacepad_v2.legacy_record_archive where archive_id='61000000-0000-4000-8000-000000000001' and title='Fictional shared note') <> 1 then raise exception 'CUTOVER_REHEARSAL_RECORD_ARCHIVE'; end if;
  if (select count(*) from peacepad_v2.legacy_task_archive where archive_id='60000000-0000-4000-8000-000000000001' and title='Fictional school form') <> 1 then raise exception 'CUTOVER_REHEARSAL_TASK_ARCHIVE'; end if;
  if (select count(*) from peacepad_v2.legacy_expense_archive where archive_id='70000000-0000-4000-8000-000000000001' and amount_text='25.00') <> 1 then raise exception 'CUTOVER_REHEARSAL_EXPENSE_ARCHIVE'; end if;
  if (select count(*) from peacepad_v2.legacy_attachment_manifest where migration_batch_id='fictional-batch-2026-08-14' and copy_status='pending-copy') <> 1 then raise exception 'CUTOVER_REHEARSAL_ATTACHMENT_MANIFEST'; end if;
  if public.peacepad_v2_reconcile_legacy_attachment('fictional-batch-2026-08-14','legacy-receipt-1',128,
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') <> 'verified' then raise exception 'CUTOVER_REHEARSAL_ATTACHMENT_RECONCILIATION'; end if;
  if not exists (select 1 from peacepad_v2.legacy_attachment_manifest where legacy_attachment_id='legacy-receipt-1'
    and copy_status='verified' and copied_byte_length=byte_length and copied_sha256=content_sha256 and verified_at is not null) then
    raise exception 'CUTOVER_REHEARSAL_ATTACHMENT_VERIFICATION_STATE'; end if;
  if exists (select 1 from information_schema.columns where table_schema='peacepad_v2'
    and table_name in ('legacy_source_map','legacy_record_archive','legacy_task_archive','legacy_expense_archive','legacy_attachment_manifest')
    and column_name ~* '(password|recording|transcript|secret|token)') then raise exception 'CUTOVER_REHEARSAL_FORBIDDEN_ARCHIVE_COLUMN'; end if;
end;
$$;

rollback;
\echo LEGACY_CUTOVER_REHEARSAL_POSTGRES_VERIFIED
