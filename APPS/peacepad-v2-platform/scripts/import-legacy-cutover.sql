-- Reversible, operator-run import for a reviewed *read-only* legacy snapshot.
--
-- This file intentionally has no connection string, credentials, production
-- project reference, or transaction control. An operator must load the six
-- TEMP tables below from an approved immutable snapshot, run this file inside
-- one explicit transaction, validate the resulting counts/fingerprint, and
-- commit only after the documented cutover approvals. The source snapshot is
-- never read by this script and legacy credentials are never migrated.
--
-- Required psql variables:
--   -v cutover_region=ca -v consent_policy_version=reviewed-policy-version
--   -v migration_batch_id=reviewed-immutable-snapshot-id
--
-- Required TEMP tables (all IDs from the legacy snapshot are text):
--   legacy_cutover_user(legacy_user_id, email, display_name, created_at)
--   legacy_cutover_identity_claim(legacy_user_id, identity_id)
--   legacy_cutover_consent(legacy_user_id, consent_type, granted, recorded_at)
--   legacy_cutover_partnership(legacy_partnership_id, user1_id, user2_id, allow_audio, created_at)
--   legacy_cutover_conversation(legacy_conversation_id, legacy_partnership_id, created_by_legacy_user_id, created_at)
--   legacy_cutover_conversation_member(legacy_conversation_id, legacy_user_id)
--   legacy_cutover_message(message_id, legacy_conversation_id, sender_legacy_user_id, body, message_type, is_deleted, occurred_at)
--   legacy_cutover_event(event_id, legacy_partnership_id, created_by_legacy_user_id, title, description, starts_at, ends_at, target_event_type, status, created_at)
--   legacy_cutover_record(record_id, source_table, legacy_partnership_id, created_by_legacy_user_id, title, content, created_at, source_fingerprint)
--   legacy_cutover_task(task_id, legacy_partnership_id, created_by_legacy_user_id, assigned_to_legacy_user_id, title, completed, due_date_text, location_text, created_at, source_fingerprint)
--   legacy_cutover_expense(expense_id, legacy_partnership_id, paid_by_legacy_user_id, description, amount_text, category, status, participant_snapshot, settlement_snapshot, created_at, updated_at, source_fingerprint)
--   legacy_cutover_attachment(attachment_id, source_parent_table, source_parent_id, legacy_partnership_id, owner_legacy_user_id, original_file_name, media_type, byte_length, content_sha256, source_locator, target_case_binder_id, target_attachment_id, target_object_path, source_fingerprint)
--
-- identity_claim records are created only after a user has authenticated with
-- Supabase and the verified-email claim has been reviewed. consent records are
-- likewise supplied only when their original time and policy meaning are
-- reviewable. Missing data must cause re-consent/re-scoping, never invention.

\if :{?cutover_region}
\else
  \quit
\endif
\if :{?consent_policy_version}
\else
  \quit
\endif
\if :{?migration_batch_id}
\else
  \quit
\endif

select set_config('peacepad_v2.cutover_region', :'cutover_region', true);
select set_config('peacepad_v2.consent_policy_version', :'consent_policy_version', true);
select set_config('peacepad_v2.migration_batch_id', :'migration_batch_id', true);

do $$
begin
  if current_setting('peacepad_v2.cutover_region', true) not in ('ca', 'us') then
    raise exception 'LEGACY_CUTOVER_REGION_INVALID';
  end if;
  if char_length(trim(current_setting('peacepad_v2.consent_policy_version', true))) not between 1 and 40 then
    raise exception 'LEGACY_CUTOVER_CONSENT_POLICY_INVALID';
  end if;
  if char_length(trim(current_setting('peacepad_v2.migration_batch_id', true))) not between 1 and 80 then
    raise exception 'LEGACY_CUTOVER_BATCH_INVALID';
  end if;
  if to_regclass('pg_temp.legacy_cutover_user') is null
    or to_regclass('pg_temp.legacy_cutover_identity_claim') is null
    or to_regclass('pg_temp.legacy_cutover_consent') is null
    or to_regclass('pg_temp.legacy_cutover_partnership') is null
    or to_regclass('pg_temp.legacy_cutover_conversation') is null
    or to_regclass('pg_temp.legacy_cutover_conversation_member') is null
    or to_regclass('pg_temp.legacy_cutover_message') is null
    or to_regclass('pg_temp.legacy_cutover_event') is null
    or to_regclass('pg_temp.legacy_cutover_record') is null
    or to_regclass('pg_temp.legacy_cutover_task') is null
    or to_regclass('pg_temp.legacy_cutover_expense') is null
    or to_regclass('pg_temp.legacy_cutover_attachment') is null then
    raise exception 'LEGACY_CUTOVER_STAGE_MISSING';
  end if;
end;
$$;

-- Reject ambiguous claims, unknown Auth users, malformed legacy UUIDs, and
-- unsafe rows before inserting a single V2 record.
do $$
begin
  if exists (
    select 1 from legacy_cutover_identity_claim
    group by legacy_user_id having count(*) <> 1
  ) then raise exception 'LEGACY_CUTOVER_IDENTITY_CLAIM_AMBIGUOUS'; end if;
  if exists (
    select 1 from legacy_cutover_user user_row
    left join legacy_cutover_identity_claim claim_row on claim_row.legacy_user_id = user_row.legacy_user_id
    where claim_row.identity_id is null
  ) then raise exception 'LEGACY_CUTOVER_IDENTITY_CLAIM_MISSING'; end if;
  if exists (
    select 1 from legacy_cutover_identity_claim claim_row
    left join auth.users auth_row on auth_row.id = claim_row.identity_id
    where auth_row.id is null
  ) then raise exception 'LEGACY_CUTOVER_AUTH_USER_MISSING'; end if;
  if exists (
    select 1 from legacy_cutover_partnership
    where legacy_partnership_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) or exists (
    select 1 from legacy_cutover_conversation
    where legacy_conversation_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) or exists (
    select 1 from legacy_cutover_message
    where message_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) or exists (
    select 1 from legacy_cutover_event
    where event_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then raise exception 'LEGACY_CUTOVER_UUID_INVALID'; end if;
  if exists (select 1 from legacy_cutover_task where task_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    or exists (select 1 from legacy_cutover_record where record_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
    or exists (select 1 from legacy_cutover_expense where expense_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    raise exception 'LEGACY_CUTOVER_ARCHIVE_UUID_INVALID';
  end if;
  if exists (
    select 1 from legacy_cutover_message
    where message_type <> 'text' or is_deleted or body is null or char_length(body) not between 1 and 4000
  ) then raise exception 'LEGACY_CUTOVER_MESSAGE_REQUIRES_REVIEW'; end if;
  if exists (
    select 1 from legacy_cutover_event
    where target_event_type not in ('parenting-time', 'appointment', 'holiday', 'change-request')
      or status not in ('planned', 'requested', 'accepted', 'declined', 'cancelled')
      or ends_at <= starts_at or char_length(title) not between 1 and 160
      or (description is not null and char_length(description) > 2000)
  ) then raise exception 'LEGACY_CUTOVER_EVENT_REQUIRES_REVIEW'; end if;
  if exists (
    select 1 from legacy_cutover_task task_row
    left join legacy_cutover_partnership partnership_row on partnership_row.legacy_partnership_id=task_row.legacy_partnership_id
    left join legacy_cutover_identity_claim creator_claim on creator_claim.legacy_user_id=task_row.created_by_legacy_user_id
    left join legacy_cutover_identity_claim assignee_claim on assignee_claim.legacy_user_id=task_row.assigned_to_legacy_user_id
    where partnership_row.legacy_partnership_id is null or creator_claim.identity_id is null
      or (task_row.assigned_to_legacy_user_id is not null and assignee_claim.identity_id is null)
      or char_length(task_row.title) not between 1 and 240
      or task_row.source_fingerprint is distinct from encode(extensions.digest(concat_ws(chr(31),task_row.task_id,task_row.legacy_partnership_id,
        task_row.created_by_legacy_user_id,coalesce(task_row.assigned_to_legacy_user_id,''),task_row.title,task_row.completed::text,
        coalesce(task_row.due_date_text,''),coalesce(task_row.location_text,''),task_row.created_at::text),'sha256'),'hex')
  ) then raise exception 'LEGACY_CUTOVER_TASK_REQUIRES_REVIEW'; end if;
  if exists (
    select 1 from legacy_cutover_record record_row
    left join legacy_cutover_partnership partnership_row on partnership_row.legacy_partnership_id=record_row.legacy_partnership_id
    left join legacy_cutover_identity_claim creator_claim on creator_claim.legacy_user_id=record_row.created_by_legacy_user_id
    where partnership_row.legacy_partnership_id is null or creator_claim.identity_id is null
      or record_row.source_table not in ('notes','child_updates')
      or char_length(record_row.title) not between 1 and 240 or char_length(record_row.content) not between 1 and 10000
      or record_row.source_fingerprint is distinct from encode(extensions.digest(concat_ws(chr(31),record_row.record_id,
        record_row.source_table,record_row.legacy_partnership_id,record_row.created_by_legacy_user_id,
        record_row.title,record_row.content,record_row.created_at::text),'sha256'),'hex')
  ) then raise exception 'LEGACY_CUTOVER_RECORD_REQUIRES_REVIEW'; end if;
  if exists (
    select 1 from legacy_cutover_expense expense_row
    left join legacy_cutover_partnership partnership_row on partnership_row.legacy_partnership_id=expense_row.legacy_partnership_id
    left join legacy_cutover_identity_claim paid_claim on paid_claim.legacy_user_id=expense_row.paid_by_legacy_user_id
    where partnership_row.legacy_partnership_id is null or paid_claim.identity_id is null
      or char_length(expense_row.description) not between 1 and 500
      or jsonb_typeof(expense_row.participant_snapshot)<>'array' or jsonb_typeof(expense_row.settlement_snapshot)<>'array'
      or char_length(expense_row.participant_snapshot::text)>100000 or char_length(expense_row.settlement_snapshot::text)>100000
      or (expense_row.participant_snapshot::text || expense_row.settlement_snapshot::text) ~* '"(password|token|secret|recording|transcript)[^"]*"[[:space:]]*:'
      or expense_row.source_fingerprint is distinct from encode(extensions.digest(concat_ws(chr(31),expense_row.expense_id,
        expense_row.legacy_partnership_id,expense_row.paid_by_legacy_user_id,expense_row.description,expense_row.amount_text,
        expense_row.category,expense_row.status,expense_row.participant_snapshot::text,expense_row.settlement_snapshot::text,
        expense_row.created_at::text,expense_row.updated_at::text),'sha256'),'hex')
  ) then raise exception 'LEGACY_CUTOVER_EXPENSE_REQUIRES_REVIEW'; end if;
  if exists (
    select 1 from legacy_cutover_attachment attachment_row
    left join legacy_cutover_partnership partnership_row on partnership_row.legacy_partnership_id=attachment_row.legacy_partnership_id
    left join legacy_cutover_identity_claim owner_claim on owner_claim.legacy_user_id=attachment_row.owner_legacy_user_id
    where partnership_row.legacy_partnership_id is null or owner_claim.identity_id is null
      or attachment_row.source_parent_table not in ('messages','expenses','record_metadata')
      or attachment_row.media_type not in ('image/jpeg','image/png','application/pdf','text/plain')
      or attachment_row.byte_length not between 1 and 26214400
      or attachment_row.content_sha256 !~ '^[0-9a-f]{64}$'
      or attachment_row.source_locator !~ '^legacy://[A-Za-z0-9._/-]+$'
      or attachment_row.target_object_path !~ ('^' || current_setting('peacepad_v2.cutover_region',true) || '/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|pdf|txt)$')
      or attachment_row.source_fingerprint is distinct from encode(extensions.digest(concat_ws(chr(31),attachment_row.attachment_id,
        attachment_row.source_parent_table,attachment_row.source_parent_id,attachment_row.legacy_partnership_id,
        attachment_row.owner_legacy_user_id,attachment_row.original_file_name,attachment_row.media_type,
        attachment_row.byte_length::text,attachment_row.content_sha256,attachment_row.source_locator,
        attachment_row.target_case_binder_id::text,attachment_row.target_attachment_id::text,
        attachment_row.target_object_path),'sha256'),'hex')
  ) then raise exception 'LEGACY_CUTOVER_ATTACHMENT_REQUIRES_REVIEW'; end if;
end;
$$;

-- Do not merge into an already-populated target. A real rerun must use a fresh
-- disposable target or an explicit reviewed reconciliation plan.
do $$
begin
  if exists (select 1 from legacy_cutover_identity_claim claim_row join peacepad_v2.identity i on i.identity_id = claim_row.identity_id)
    or exists (select 1 from legacy_cutover_partnership partnership_row join peacepad_v2.family_circle f on f.family_id = partnership_row.legacy_partnership_id::uuid)
    or exists (select 1 from legacy_cutover_conversation conversation_row join peacepad_v2.conversation c on c.conversation_id = conversation_row.legacy_conversation_id::uuid)
    or exists (select 1 from legacy_cutover_message message_row join peacepad_v2.message_event m on m.message_event_id = message_row.message_id::uuid)
    or exists (select 1 from legacy_cutover_event event_row join peacepad_v2.schedule_event e on e.schedule_event_id = event_row.event_id::uuid)
    or exists (select 1 from peacepad_v2.legacy_source_map where migration_batch_id=current_setting('peacepad_v2.migration_batch_id',true))
  then raise exception 'LEGACY_CUTOVER_TARGET_NOT_EMPTY'; end if;
end;
$$;

insert into peacepad_v2.identity(identity_id, region, display_name, created_at)
select claim_row.identity_id, :'cutover_region',
  left(coalesce(nullif(trim(user_row.display_name), ''), 'PeacePad member'), 120),
  user_row.created_at
from legacy_cutover_user user_row
join legacy_cutover_identity_claim claim_row on claim_row.legacy_user_id = user_row.legacy_user_id;

insert into peacepad_v2.consent_record(consent_record_id, identity_id, region, consent_type, granted, policy_version, recorded_at)
select (substr(md5('v2-cutover-consent:' || consent_row.legacy_user_id || ':' || consent_row.consent_type),1,8) || '-' ||
        substr(md5('v2-cutover-consent:' || consent_row.legacy_user_id || ':' || consent_row.consent_type),9,4) || '-4' ||
        substr(md5('v2-cutover-consent:' || consent_row.legacy_user_id || ':' || consent_row.consent_type),14,3) || '-a' ||
        substr(md5('v2-cutover-consent:' || consent_row.legacy_user_id || ':' || consent_row.consent_type),18,3) || '-' ||
        substr(md5('v2-cutover-consent:' || consent_row.legacy_user_id || ':' || consent_row.consent_type),21,12))::uuid,
  claim_row.identity_id, :'cutover_region', consent_row.consent_type, consent_row.granted,
  :'consent_policy_version', consent_row.recorded_at
from legacy_cutover_consent consent_row
join legacy_cutover_identity_claim claim_row on claim_row.legacy_user_id = consent_row.legacy_user_id;

insert into peacepad_v2.family_circle(family_id, region, family_name, created_by, created_at)
select partnership_row.legacy_partnership_id::uuid, :'cutover_region',
  'PeacePad family ' || left(partnership_row.legacy_partnership_id, 8),
  creator_claim.identity_id, partnership_row.created_at
from legacy_cutover_partnership partnership_row
join legacy_cutover_identity_claim creator_claim on creator_claim.legacy_user_id = partnership_row.user1_id;

insert into peacepad_v2.participant_grant(participant_grant_id, family_id, identity_id, region, role, permissions, granted_by, granted_at)
select (substr(md5('v2-cutover-grant:' || partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id),1,8) || '-' ||
        substr(md5('v2-cutover-grant:' || partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id),9,4) || '-4' ||
        substr(md5('v2-cutover-grant:' || partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id),14,3) || '-a' ||
        substr(md5('v2-cutover-grant:' || partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id),18,3) || '-' ||
        substr(md5('v2-cutover-grant:' || partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id),21,12))::uuid,
  partnership_row.legacy_partnership_id::uuid, member_claim.identity_id, :'cutover_region', 'parent',
  case when partnership_row.allow_audio then array['message.write','calendar.write','calls'] else array['message.write','calendar.write'] end,
  creator_claim.identity_id, partnership_row.created_at
from legacy_cutover_partnership partnership_row
cross join lateral (values (partnership_row.user1_id), (partnership_row.user2_id)) as member_row(legacy_user_id)
join legacy_cutover_identity_claim member_claim on member_claim.legacy_user_id = member_row.legacy_user_id
join legacy_cutover_identity_claim creator_claim on creator_claim.legacy_user_id = partnership_row.user1_id;

do $$
begin
  if exists (
    select 1 from legacy_cutover_conversation conversation_row
    join legacy_cutover_partnership partnership_row on partnership_row.legacy_partnership_id = conversation_row.legacy_partnership_id
    left join legacy_cutover_conversation_member member_row on member_row.legacy_conversation_id = conversation_row.legacy_conversation_id
    left join legacy_cutover_identity_claim member_claim on member_claim.legacy_user_id = member_row.legacy_user_id
    where member_claim.identity_id is null
    group by conversation_row.legacy_conversation_id
  ) then raise exception 'LEGACY_CUTOVER_CONVERSATION_MEMBER_UNCLAIMED'; end if;
  if exists (
    select 1 from legacy_cutover_conversation conversation_row
    join legacy_cutover_conversation_member member_row on member_row.legacy_conversation_id = conversation_row.legacy_conversation_id
    join legacy_cutover_identity_claim member_claim on member_claim.legacy_user_id = member_row.legacy_user_id
    left join legacy_cutover_partnership partnership_row on partnership_row.legacy_partnership_id = conversation_row.legacy_partnership_id
      and member_row.legacy_user_id in (partnership_row.user1_id, partnership_row.user2_id)
    where partnership_row.legacy_partnership_id is null
  ) then raise exception 'LEGACY_CUTOVER_CONVERSATION_SCOPE_INVALID'; end if;
end;
$$;

insert into peacepad_v2.conversation(conversation_id, family_id, region, participant_identity_ids, status, created_by, created_at, updated_at)
select conversation_row.legacy_conversation_id::uuid, conversation_row.legacy_partnership_id::uuid, :'cutover_region',
  array_agg(member_claim.identity_id order by member_claim.identity_id), 'active', creator_claim.identity_id,
  conversation_row.created_at, conversation_row.created_at
from legacy_cutover_conversation conversation_row
join legacy_cutover_conversation_member member_row on member_row.legacy_conversation_id = conversation_row.legacy_conversation_id
join legacy_cutover_identity_claim member_claim on member_claim.legacy_user_id = member_row.legacy_user_id
join legacy_cutover_identity_claim creator_claim on creator_claim.legacy_user_id = conversation_row.created_by_legacy_user_id
group by conversation_row.legacy_conversation_id, conversation_row.legacy_partnership_id, creator_claim.identity_id, conversation_row.created_at
having count(distinct member_claim.identity_id) between 2 and 8;

do $$
begin
  if exists (
    select 1
    from legacy_cutover_conversation source_row
    left join peacepad_v2.conversation target_row
      on target_row.conversation_id = source_row.legacy_conversation_id::uuid
     and target_row.region = current_setting('peacepad_v2.cutover_region', true)
    where target_row.conversation_id is null
  ) then
    raise exception 'LEGACY_CUTOVER_CONVERSATION_CARDINALITY_INVALID';
  end if;
  if exists (
    select 1 from legacy_cutover_message message_row
    left join legacy_cutover_conversation conversation_row on conversation_row.legacy_conversation_id = message_row.legacy_conversation_id
    left join legacy_cutover_identity_claim sender_claim on sender_claim.legacy_user_id = message_row.sender_legacy_user_id
    where conversation_row.legacy_conversation_id is null or sender_claim.identity_id is null
  ) then raise exception 'LEGACY_CUTOVER_MESSAGE_SCOPE_INVALID'; end if;
end;
$$;

insert into peacepad_v2.message_event(message_event_id, family_id, conversation_id, region, actor_identity_id, event_type, body, occurred_at)
select message_row.message_id::uuid, conversation_row.legacy_partnership_id::uuid, conversation_row.legacy_conversation_id::uuid,
  :'cutover_region', sender_claim.identity_id, 'sent', message_row.body, message_row.occurred_at
from legacy_cutover_message message_row
join legacy_cutover_conversation conversation_row on conversation_row.legacy_conversation_id = message_row.legacy_conversation_id
join legacy_cutover_identity_claim sender_claim on sender_claim.legacy_user_id = message_row.sender_legacy_user_id;

insert into peacepad_v2.calendar_layer(calendar_layer_id, family_id, region, owner_identity_id, name, kind, icon, color_token, visibility, created_at, updated_at)
select (substr(md5('v2-cutover-layer:' || partnership_row.legacy_partnership_id),1,8) || '-' ||
        substr(md5('v2-cutover-layer:' || partnership_row.legacy_partnership_id),9,4) || '-4' ||
        substr(md5('v2-cutover-layer:' || partnership_row.legacy_partnership_id),14,3) || '-a' ||
        substr(md5('v2-cutover-layer:' || partnership_row.legacy_partnership_id),18,3) || '-' ||
        substr(md5('v2-cutover-layer:' || partnership_row.legacy_partnership_id),21,12))::uuid,
  partnership_row.legacy_partnership_id::uuid, :'cutover_region', creator_claim.identity_id,
  'Imported schedule', 'events-activities', 'calendar', 'teal', '{"scope":"family"}'::jsonb,
  partnership_row.created_at, partnership_row.created_at
from legacy_cutover_partnership partnership_row
join legacy_cutover_identity_claim creator_claim on creator_claim.legacy_user_id = partnership_row.user1_id;

insert into peacepad_v2.schedule_event(schedule_event_id, family_id, calendar_layer_id, region, created_by, child_profile_ids, event_type, title, description, starts_at, ends_at, status, created_at, updated_at)
select event_row.event_id::uuid, event_row.legacy_partnership_id::uuid,
  (substr(md5('v2-cutover-layer:' || event_row.legacy_partnership_id),1,8) || '-' ||
   substr(md5('v2-cutover-layer:' || event_row.legacy_partnership_id),9,4) || '-4' ||
   substr(md5('v2-cutover-layer:' || event_row.legacy_partnership_id),14,3) || '-a' ||
   substr(md5('v2-cutover-layer:' || event_row.legacy_partnership_id),18,3) || '-' ||
   substr(md5('v2-cutover-layer:' || event_row.legacy_partnership_id),21,12))::uuid,
  :'cutover_region', creator_claim.identity_id, '{}', event_row.target_event_type, event_row.title,
  nullif(event_row.description, ''), event_row.starts_at, event_row.ends_at, event_row.status,
  event_row.created_at, event_row.created_at
from legacy_cutover_event event_row
join legacy_cutover_identity_claim creator_claim on creator_claim.legacy_user_id = event_row.created_by_legacy_user_id;

insert into peacepad_v2.legacy_record_archive(
  archive_id,migration_batch_id,legacy_record_id,source_table,family_id,created_by_identity_id,title,content,
  region,source_created_at,source_fingerprint
)
select record_row.record_id::uuid,:'migration_batch_id',record_row.record_id,record_row.source_table,
  record_row.legacy_partnership_id::uuid,creator_claim.identity_id,record_row.title,record_row.content,
  :'cutover_region',record_row.created_at,record_row.source_fingerprint
from legacy_cutover_record record_row
join legacy_cutover_identity_claim creator_claim on creator_claim.legacy_user_id=record_row.created_by_legacy_user_id;

insert into peacepad_v2.legacy_task_archive(
  archive_id,migration_batch_id,legacy_task_id,family_id,created_by_identity_id,assigned_to_identity_id,
  title,completed,due_date_text,location_text,region,source_created_at,source_fingerprint
)
select task_row.task_id::uuid,:'migration_batch_id',task_row.task_id,task_row.legacy_partnership_id::uuid,
  creator_claim.identity_id,assignee_claim.identity_id,task_row.title,task_row.completed,
  nullif(task_row.due_date_text,''),nullif(task_row.location_text,''),:'cutover_region',task_row.created_at,task_row.source_fingerprint
from legacy_cutover_task task_row
join legacy_cutover_identity_claim creator_claim on creator_claim.legacy_user_id=task_row.created_by_legacy_user_id
left join legacy_cutover_identity_claim assignee_claim on assignee_claim.legacy_user_id=task_row.assigned_to_legacy_user_id;

insert into peacepad_v2.legacy_expense_archive(
  archive_id,migration_batch_id,legacy_expense_id,family_id,paid_by_identity_id,description,amount_text,
  currency_code,category,status,participant_snapshot,settlement_snapshot,region,source_created_at,source_updated_at,source_fingerprint
)
select expense_row.expense_id::uuid,:'migration_batch_id',expense_row.expense_id,expense_row.legacy_partnership_id::uuid,
  paid_claim.identity_id,expense_row.description,expense_row.amount_text,'CAD',expense_row.category,expense_row.status,
  expense_row.participant_snapshot,expense_row.settlement_snapshot,:'cutover_region',expense_row.created_at,
  expense_row.updated_at,expense_row.source_fingerprint
from legacy_cutover_expense expense_row
join legacy_cutover_identity_claim paid_claim on paid_claim.legacy_user_id=expense_row.paid_by_legacy_user_id;

insert into peacepad_v2.legacy_attachment_manifest(
  migration_batch_id,legacy_attachment_id,source_parent_table,source_parent_id,family_id,owner_identity_id,
  original_file_name,media_type,byte_length,content_sha256,source_locator,target_case_binder_id,target_attachment_id,
  target_object_path,region,source_fingerprint
)
select :'migration_batch_id',attachment_row.attachment_id,attachment_row.source_parent_table,attachment_row.source_parent_id,
  attachment_row.legacy_partnership_id::uuid,owner_claim.identity_id,attachment_row.original_file_name,
  attachment_row.media_type,attachment_row.byte_length,attachment_row.content_sha256,attachment_row.source_locator,
  attachment_row.target_case_binder_id,attachment_row.target_attachment_id,attachment_row.target_object_path,
  :'cutover_region',attachment_row.source_fingerprint
from legacy_cutover_attachment attachment_row
join legacy_cutover_identity_claim owner_claim on owner_claim.legacy_user_id=attachment_row.owner_legacy_user_id;

insert into peacepad_v2.legacy_source_map(
  migration_batch_id,source_system,source_table,source_id,target_table,target_id,region,source_fingerprint
)
select :'migration_batch_id','legacy-peacepad-express-postgresql','users',user_row.legacy_user_id,'identity',claim_row.identity_id,:'cutover_region',
  encode(extensions.digest(concat_ws(chr(31),user_row.legacy_user_id,lower(coalesce(user_row.email,'')),coalesce(user_row.display_name,''),user_row.created_at::text),'sha256'),'hex')
from legacy_cutover_user user_row join legacy_cutover_identity_claim claim_row using(legacy_user_id)
union all select :'migration_batch_id','legacy-peacepad-express-postgresql','partnerships',legacy_partnership_id,'family_circle',legacy_partnership_id::uuid,:'cutover_region',
  encode(extensions.digest(concat_ws(chr(31),legacy_partnership_id,user1_id,user2_id,allow_audio::text,created_at::text),'sha256'),'hex') from legacy_cutover_partnership
union all select :'migration_batch_id','legacy-peacepad-express-postgresql','conversation_members',
  partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id,'participant_grant',
  (substr(md5('v2-cutover-grant:' || partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id),1,8) || '-' ||
   substr(md5('v2-cutover-grant:' || partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id),9,4) || '-4' ||
   substr(md5('v2-cutover-grant:' || partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id),14,3) || '-a' ||
   substr(md5('v2-cutover-grant:' || partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id),18,3) || '-' ||
   substr(md5('v2-cutover-grant:' || partnership_row.legacy_partnership_id || ':' || member_row.legacy_user_id),21,12))::uuid,
  :'cutover_region',encode(extensions.digest(concat_ws(chr(31),partnership_row.legacy_partnership_id,member_row.legacy_user_id,
    partnership_row.allow_audio::text,partnership_row.created_at::text),'sha256'),'hex')
  from legacy_cutover_partnership partnership_row
  cross join lateral (values (partnership_row.user1_id),(partnership_row.user2_id)) as member_row(legacy_user_id)
union all select :'migration_batch_id','legacy-peacepad-express-postgresql','conversations',legacy_conversation_id,'conversation',legacy_conversation_id::uuid,:'cutover_region',
  encode(extensions.digest(concat_ws(chr(31),legacy_conversation_id,legacy_partnership_id,created_by_legacy_user_id,created_at::text),'sha256'),'hex') from legacy_cutover_conversation
union all select :'migration_batch_id','legacy-peacepad-express-postgresql','messages',message_id,'message_event',message_id::uuid,:'cutover_region',
  encode(extensions.digest(concat_ws(chr(31),message_id,legacy_conversation_id,sender_legacy_user_id,body,message_type,is_deleted::text,occurred_at::text),'sha256'),'hex') from legacy_cutover_message
union all select :'migration_batch_id','legacy-peacepad-express-postgresql','events',event_id,'schedule_event',event_id::uuid,:'cutover_region',
  encode(extensions.digest(concat_ws(chr(31),event_id,legacy_partnership_id,created_by_legacy_user_id,title,coalesce(description,''),starts_at::text,ends_at::text,target_event_type,status,created_at::text),'sha256'),'hex') from legacy_cutover_event
union all select :'migration_batch_id','legacy-peacepad-express-postgresql',source_table,record_id,'legacy_record_archive',record_id::uuid,:'cutover_region',source_fingerprint from legacy_cutover_record
union all select :'migration_batch_id','legacy-peacepad-express-postgresql','tasks',task_id,'legacy_task_archive',task_id::uuid,:'cutover_region',source_fingerprint from legacy_cutover_task
union all select :'migration_batch_id','legacy-peacepad-express-postgresql','expenses',expense_id,'legacy_expense_archive',expense_id::uuid,:'cutover_region',source_fingerprint from legacy_cutover_expense;

select 'LEGACY_CUTOVER_IMPORT_STAGED' as result,
  (select count(*) from peacepad_v2.identity where region = :'cutover_region') as identities,
  (select count(*) from peacepad_v2.family_circle where region = :'cutover_region') as families,
  (select count(*) from peacepad_v2.conversation where region = :'cutover_region') as conversations,
  (select count(*) from peacepad_v2.message_event where region = :'cutover_region') as messages,
  (select count(*) from peacepad_v2.schedule_event where region = :'cutover_region') as events,
  (select count(*) from peacepad_v2.legacy_record_archive where migration_batch_id=:'migration_batch_id') as archived_records,
  (select count(*) from peacepad_v2.legacy_task_archive where migration_batch_id=:'migration_batch_id') as archived_tasks,
  (select count(*) from peacepad_v2.legacy_expense_archive where migration_batch_id=:'migration_batch_id') as archived_expenses,
  (select count(*) from peacepad_v2.legacy_attachment_manifest where migration_batch_id=:'migration_batch_id') as attachment_manifest_rows,
  (select count(*) from peacepad_v2.legacy_source_map where migration_batch_id=:'migration_batch_id') as stable_source_maps;
