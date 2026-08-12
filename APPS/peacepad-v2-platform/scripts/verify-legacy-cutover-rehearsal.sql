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

\set cutover_region 'ca'
\set consent_policy_version 'fictional-rehearsal-v1'
\ir import-legacy-cutover.sql

do $$
begin
  if (select count(*) from peacepad_v2.identity where region = 'ca') <> 2 then raise exception 'CUTOVER_REHEARSAL_IDENTITY_COUNT'; end if;
  if (select count(*) from peacepad_v2.consent_record where region = 'ca') <> 3 then raise exception 'CUTOVER_REHEARSAL_CONSENT_COUNT'; end if;
  if (select count(*) from peacepad_v2.family_circle where region = 'ca') <> 1 then raise exception 'CUTOVER_REHEARSAL_FAMILY_COUNT'; end if;
  if (select count(*) from peacepad_v2.participant_grant where region = 'ca') <> 2 then raise exception 'CUTOVER_REHEARSAL_GRANT_COUNT'; end if;
  if (select count(*) from peacepad_v2.conversation where region = 'ca') <> 1 then raise exception 'CUTOVER_REHEARSAL_CONVERSATION_COUNT'; end if;
  if (select count(*) from peacepad_v2.message_event where region = 'ca' and body = 'Fictional rehearsal message') <> 1 then raise exception 'CUTOVER_REHEARSAL_MESSAGE_FINGERPRINT'; end if;
  if (select count(*) from peacepad_v2.calendar_layer where region = 'ca') <> 1 then raise exception 'CUTOVER_REHEARSAL_LAYER_COUNT'; end if;
  if (select count(*) from peacepad_v2.schedule_event where region = 'ca' and title = 'Fictional appointment') <> 1 then raise exception 'CUTOVER_REHEARSAL_EVENT_FINGERPRINT'; end if;
  if not exists (select 1 from peacepad_v2.participant_grant where region = 'ca' and 'calls' = any(permissions)) then raise exception 'CUTOVER_REHEARSAL_AUDIO_PERMISSION'; end if;
end;
$$;

rollback;
\echo LEGACY_CUTOVER_REHEARSAL_POSTGRES_VERIFIED
