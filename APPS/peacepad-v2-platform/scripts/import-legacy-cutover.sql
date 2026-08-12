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

select set_config('peacepad_v2.cutover_region', :'cutover_region', true);
select set_config('peacepad_v2.consent_policy_version', :'consent_policy_version', true);

do $$
begin
  if current_setting('peacepad_v2.cutover_region', true) not in ('ca', 'us') then
    raise exception 'LEGACY_CUTOVER_REGION_INVALID';
  end if;
  if char_length(trim(current_setting('peacepad_v2.consent_policy_version', true))) not between 1 and 40 then
    raise exception 'LEGACY_CUTOVER_CONSENT_POLICY_INVALID';
  end if;
  if to_regclass('pg_temp.legacy_cutover_user') is null
    or to_regclass('pg_temp.legacy_cutover_identity_claim') is null
    or to_regclass('pg_temp.legacy_cutover_consent') is null
    or to_regclass('pg_temp.legacy_cutover_partnership') is null
    or to_regclass('pg_temp.legacy_cutover_conversation') is null
    or to_regclass('pg_temp.legacy_cutover_conversation_member') is null
    or to_regclass('pg_temp.legacy_cutover_message') is null
    or to_regclass('pg_temp.legacy_cutover_event') is null then
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
  if (select count(*) from legacy_cutover_conversation) <> (select count(*) from peacepad_v2.conversation where region = current_setting('peacepad_v2.cutover_region', true)) then
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

select 'LEGACY_CUTOVER_IMPORT_STAGED' as result,
  (select count(*) from peacepad_v2.identity where region = :'cutover_region') as identities,
  (select count(*) from peacepad_v2.family_circle where region = :'cutover_region') as families,
  (select count(*) from peacepad_v2.conversation where region = :'cutover_region') as conversations,
  (select count(*) from peacepad_v2.message_event where region = :'cutover_region') as messages,
  (select count(*) from peacepad_v2.schedule_event where region = :'cutover_region') as events;
