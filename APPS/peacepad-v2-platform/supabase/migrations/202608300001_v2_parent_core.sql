-- PeacePad Native V2 parent-facing core persistence.
-- Direct client access stays denied. The regional Edge function is the only
-- service-role caller and every mutation is identity/family/region scoped,
-- idempotent, versioned and written to the existing audit ledger.

create table if not exists peacepad_v2.child_profile (
  child_profile_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id) on delete cascade,
  region text not null check (region in ('ca','us')),
  display_name text not null check (char_length(display_name) between 2 and 80),
  created_by uuid not null references peacepad_v2.identity(identity_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0)
);

create table if not exists peacepad_v2.child_update (
  child_update_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id) on delete cascade,
  child_profile_id uuid not null references peacepad_v2.child_profile(child_profile_id) on delete cascade,
  region text not null check (region in ('ca','us')),
  author_identity_id uuid not null references peacepad_v2.identity(identity_id),
  kind text not null check (kind in ('general','health','school','activity','handover')),
  title text not null check (char_length(title) between 1 and 100),
  body text not null check (char_length(body) between 1 and 1500),
  occurred_at timestamptz not null,
  visibility jsonb not null default '{"scope":"private"}'::jsonb,
  created_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create table if not exists peacepad_v2.family_expense (
  expense_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id) on delete cascade,
  region text not null check (region in ('ca','us')),
  created_by uuid not null references peacepad_v2.identity(identity_id),
  child_profile_ids uuid[] not null default '{}',
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  category text not null check (category in ('education','health','childcare','activity','clothing','food','travel','other')),
  amount_minor bigint not null check (amount_minor > 0 and amount_minor <= 100000000),
  currency text not null check (currency in ('CAD','USD')),
  incurred_at timestamptz not null,
  status text not null default 'open' check (status in ('open','settlement-requested','settled','disputed','cancelled')),
  splits jsonb not null check (jsonb_typeof(splits) = 'array' and jsonb_array_length(splits) between 1 and 10),
  receipt_attachment_id uuid references peacepad_v2.private_attachment(attachment_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create table if not exists peacepad_v2.expense_settlement (
  settlement_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id) on delete cascade,
  expense_id uuid not null references peacepad_v2.family_expense(expense_id) on delete cascade,
  region text not null check (region in ('ca','us')),
  requested_by uuid not null references peacepad_v2.identity(identity_id),
  requested_from uuid not null references peacepad_v2.identity(identity_id),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency in ('CAD','USD')),
  status text not null default 'pending' check (status in ('pending','confirmed','disputed','cancelled')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  version integer not null default 1 check (version > 0),
  check (requested_by <> requested_from)
);

create table if not exists peacepad_v2.scheduled_call (
  scheduled_call_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id) on delete cascade,
  conversation_id uuid not null references peacepad_v2.conversation(conversation_id) on delete cascade,
  region text not null check (region in ('ca','us')),
  created_by uuid not null references peacepad_v2.identity(identity_id),
  participant_identity_ids uuid[] not null,
  media_type text not null check (media_type in ('audio','video')),
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 5 and 240),
  note text check (note is null or char_length(note) <= 240),
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed','missed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  check (cardinality(participant_identity_ids) = 2)
);

create table if not exists peacepad_v2.conch_session (
  conch_session_id uuid primary key,
  family_id uuid not null references peacepad_v2.family_circle(family_id) on delete cascade,
  conversation_id uuid not null references peacepad_v2.conversation(conversation_id) on delete cascade,
  region text not null check (region in ('ca','us')),
  participant_identity_ids uuid[] not null,
  created_by uuid not null references peacepad_v2.identity(identity_id),
  media_type text not null check (media_type in ('audio','video')),
  status text not null default 'invited' check (status in ('invited','active','declined','ended','expired')),
  consented_identity_ids uuid[] not null default '{}',
  current_speaker_identity_id uuid references peacepad_v2.identity(identity_id),
  turn_started_at timestamptz,
  turn_duration_seconds integer not null check (turn_duration_seconds between 30 and 600),
  recording_enabled boolean not null default false check (recording_enabled = false),
  transcript_enabled boolean not null default false check (transcript_enabled = false),
  summary_consent_identity_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz,
  version integer not null default 1 check (version > 0),
  check (cardinality(participant_identity_ids) = 2)
);

create table if not exists peacepad_v2.conch_turn (
  conch_turn_id uuid primary key,
  conch_session_id uuid not null references peacepad_v2.conch_session(conch_session_id) on delete cascade,
  region text not null check (region in ('ca','us')),
  speaker_identity_id uuid not null references peacepad_v2.identity(identity_id),
  started_at timestamptz not null,
  ended_at timestamptz,
  outcome text check (outcome is null or outcome in ('passed','ended','timeout')),
  reactions jsonb not null default '[]'::jsonb check (jsonb_typeof(reactions) = 'array'),
  created_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create index if not exists child_profile_family_idx on peacepad_v2.child_profile(family_id, created_at) where deleted_at is null;
create index if not exists child_update_family_idx on peacepad_v2.child_update(family_id, occurred_at desc);
create index if not exists family_expense_family_idx on peacepad_v2.family_expense(family_id, incurred_at desc);
create index if not exists expense_settlement_family_idx on peacepad_v2.expense_settlement(family_id, requested_at desc);
create index if not exists scheduled_call_family_idx on peacepad_v2.scheduled_call(family_id, starts_at);
create unique index if not exists conch_one_live_conversation_idx on peacepad_v2.conch_session(conversation_id) where status in ('invited','active');

alter table peacepad_v2.child_profile enable row level security;
alter table peacepad_v2.child_update enable row level security;
alter table peacepad_v2.family_expense enable row level security;
alter table peacepad_v2.expense_settlement enable row level security;
alter table peacepad_v2.scheduled_call enable row level security;
alter table peacepad_v2.conch_session enable row level security;
alter table peacepad_v2.conch_turn enable row level security;
revoke all on peacepad_v2.child_profile, peacepad_v2.child_update, peacepad_v2.family_expense,
  peacepad_v2.expense_settlement, peacepad_v2.scheduled_call, peacepad_v2.conch_session,
  peacepad_v2.conch_turn from public, anon, authenticated;

create or replace function peacepad_v2.parent_core_access(p_identity_id uuid, p_family_id uuid, p_region text)
returns boolean language sql stable set search_path = pg_catalog, peacepad_v2 as $$
  select exists(select 1 from peacepad_v2.participant_grant g join peacepad_v2.identity i on i.identity_id=g.identity_id
    where g.identity_id=p_identity_id and g.family_id=p_family_id and g.region=p_region and g.revoked_at is null and i.deleted_at is null);
$$;

create or replace function peacepad_v2.child_profile_json(r peacepad_v2.child_profile) returns jsonb language sql stable as $$
 select jsonb_build_object('id',r.child_profile_id,'familyCircleId',r.family_id,'displayName',r.display_name,
  'managedByAdultIdentityIds',array[r.created_by],'directLoginEnabled',false,'schemaVersion','2.0','version',r.version,'region',r.region,
  'provenance',jsonb_build_object('createdAt',r.created_at,'createdBy',jsonb_build_object('identityId',r.created_by,'sessionId',null),'source','app'));
$$;
create or replace function peacepad_v2.child_update_json(r peacepad_v2.child_update) returns jsonb language sql stable as $$
 select jsonb_build_object('id',r.child_update_id,'familyCircleId',r.family_id,'childProfileId',r.child_profile_id,'authorIdentityId',r.author_identity_id,
  'kind',r.kind,'title',r.title,'body',r.body,'occurredAt',r.occurred_at,'visibility',r.visibility,'schemaVersion','2.0','version',r.version,'region',r.region,
  'provenance',jsonb_build_object('createdAt',r.created_at,'createdBy',jsonb_build_object('identityId',r.author_identity_id,'sessionId',null),'source','app'));
$$;
create or replace function peacepad_v2.expense_json(r peacepad_v2.family_expense) returns jsonb language sql stable as $$
 select jsonb_build_object('id',r.expense_id,'familyCircleId',r.family_id,'createdByIdentityId',r.created_by,'childProfileIds',r.child_profile_ids,
  'title',r.title,'description',r.description,'category',r.category,'amountMinor',r.amount_minor,'currency',r.currency,'incurredAt',r.incurred_at,
  'status',r.status,'splits',r.splits,'receiptAttachmentId',r.receipt_attachment_id,'schemaVersion','2.0','version',r.version,'region',r.region,
  'provenance',jsonb_build_object('createdAt',r.created_at,'createdBy',jsonb_build_object('identityId',r.created_by,'sessionId',null),'source','app'));
$$;
create or replace function peacepad_v2.settlement_json(r peacepad_v2.expense_settlement) returns jsonb language sql stable as $$
 select jsonb_build_object('id',r.settlement_id,'familyCircleId',r.family_id,'expenseId',r.expense_id,'requestedByIdentityId',r.requested_by,
  'requestedFromIdentityId',r.requested_from,'amountMinor',r.amount_minor,'currency',r.currency,'status',r.status,'requestedAt',r.requested_at,
  'resolvedAt',r.resolved_at,'schemaVersion','2.0','version',r.version,'region',r.region,
  'provenance',jsonb_build_object('createdAt',r.requested_at,'createdBy',jsonb_build_object('identityId',r.requested_by,'sessionId',null),'source','app'));
$$;
create or replace function peacepad_v2.scheduled_call_json(r peacepad_v2.scheduled_call) returns jsonb language sql stable as $$
 select jsonb_build_object('id',r.scheduled_call_id,'familyCircleId',r.family_id,'conversationId',r.conversation_id,'createdByIdentityId',r.created_by,
  'participantIdentityIds',r.participant_identity_ids,'mediaType',r.media_type,'startsAt',r.starts_at,'durationMinutes',r.duration_minutes,
  'note',r.note,'status',r.status,'schemaVersion','2.0','version',r.version,'region',r.region,
  'provenance',jsonb_build_object('createdAt',r.created_at,'createdBy',jsonb_build_object('identityId',r.created_by,'sessionId',null),'source','app'));
$$;
create or replace function peacepad_v2.conch_session_json(r peacepad_v2.conch_session) returns jsonb language sql stable as $$
 select jsonb_build_object('id',r.conch_session_id,'familyCircleId',r.family_id,'conversationId',r.conversation_id,'participantIdentityIds',r.participant_identity_ids,
  'createdByIdentityId',r.created_by,'mediaType',r.media_type,'status',r.status,'consentedIdentityIds',r.consented_identity_ids,
  'currentSpeakerIdentityId',r.current_speaker_identity_id,'turnStartedAt',r.turn_started_at,'turnDurationSeconds',r.turn_duration_seconds,
  'recordingEnabled',false,'transcriptEnabled',false,'summaryConsentIdentityIds',r.summary_consent_identity_ids,'endedAt',r.ended_at,
  'schemaVersion','2.0','version',r.version,'region',r.region,'provenance',jsonb_build_object('createdAt',r.created_at,
  'createdBy',jsonb_build_object('identityId',r.created_by,'sessionId',null),'source','app'));
$$;
create or replace function peacepad_v2.conch_turn_json(r peacepad_v2.conch_turn) returns jsonb language sql stable as $$
 select jsonb_build_object('id',r.conch_turn_id,'conchSessionId',r.conch_session_id,'speakerIdentityId',r.speaker_identity_id,
  'startedAt',r.started_at,'endedAt',r.ended_at,'outcome',r.outcome,'reactions',r.reactions,'schemaVersion','2.0','version',r.version,
  'region',r.region,'provenance',jsonb_build_object('createdAt',r.created_at,'createdBy',jsonb_build_object('identityId',r.speaker_identity_id,'sessionId',null),'source','app'));
$$;

create or replace function public.peacepad_v2_parent_core_list(p_identity_id uuid,p_region text,p_family_id uuid,p_resource text,p_filter uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
begin
 if not peacepad_v2.parent_core_access(p_identity_id,p_family_id,p_region) then raise exception using errcode='42501',message='FAMILY_ACCESS_DENIED'; end if;
 if p_resource='children' then return coalesce((select jsonb_agg(peacepad_v2.child_profile_json(r) order by r.created_at) from peacepad_v2.child_profile r where r.family_id=p_family_id and r.region=p_region and r.deleted_at is null),'[]'); end if;
 if p_resource='child-updates' then return coalesce((select jsonb_agg(peacepad_v2.child_update_json(r) order by r.occurred_at desc) from peacepad_v2.child_update r where r.family_id=p_family_id and r.region=p_region and (p_filter is null or r.child_profile_id=p_filter)),'[]'); end if;
 if p_resource='expenses' then return coalesce((select jsonb_agg(peacepad_v2.expense_json(r) order by r.incurred_at desc) from peacepad_v2.family_expense r where r.family_id=p_family_id and r.region=p_region),'[]'); end if;
 if p_resource='settlements' then return coalesce((select jsonb_agg(peacepad_v2.settlement_json(r) order by r.requested_at desc) from peacepad_v2.expense_settlement r where r.family_id=p_family_id and r.region=p_region),'[]'); end if;
 if p_resource='scheduled-calls' then return coalesce((select jsonb_agg(peacepad_v2.scheduled_call_json(r) order by r.starts_at) from peacepad_v2.scheduled_call r where r.family_id=p_family_id and r.region=p_region),'[]'); end if;
 if p_resource='balance' then return (select jsonb_build_object('familyCircleId',p_family_id,'identityId',p_identity_id,'currency','CAD',
   'owesMinor',coalesce(sum(case when requested_from=p_identity_id and status='pending' then amount_minor else 0 end),0),
   'owedMinor',coalesce(sum(case when requested_by=p_identity_id and status='pending' then amount_minor else 0 end),0),
   'netMinor',coalesce(sum(case when requested_by=p_identity_id and status='pending' then amount_minor when requested_from=p_identity_id and status='pending' then -amount_minor else 0 end),0),'calculatedAt',now()) from peacepad_v2.expense_settlement where family_id=p_family_id and region=p_region); end if;
 raise exception using errcode='22023',message='PARENT_CORE_RESOURCE_INVALID';
end; $$;

create or replace function public.peacepad_v2_get_current_conch(p_identity_id uuid,p_region text,p_conversation_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare r peacepad_v2.conch_session%rowtype;
begin
 select * into r from peacepad_v2.conch_session where conversation_id=p_conversation_id and region=p_region and p_identity_id=any(participant_identity_ids) and status in ('invited','active') order by created_at desc limit 1;
 return case when found then peacepad_v2.conch_session_json(r) else null end;
end; $$;

create or replace function public.peacepad_v2_get_current_conch_turn(p_identity_id uuid,p_region text,p_conch_session_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare session_r peacepad_v2.conch_session%rowtype; turn_r peacepad_v2.conch_turn%rowtype;
begin
 select * into session_r from peacepad_v2.conch_session where conch_session_id=p_conch_session_id and region=p_region and p_identity_id=any(participant_identity_ids);
 if not found then raise exception using errcode='42501',message='CONVERSATION_ACCESS_DENIED'; end if;
 select * into turn_r from peacepad_v2.conch_turn where conch_session_id=p_conch_session_id and ended_at is null order by started_at desc limit 1;
 return case when found then peacepad_v2.conch_turn_json(turn_r) else null end;
end; $$;

create or replace function public.peacepad_v2_parent_core_write(p_identity_id uuid,p_region text,p_operation text,p_payload jsonb,p_expected_version integer,p_idempotency_key text,p_schema_version integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare prior jsonb; response jsonb; v_family_id uuid; child_r peacepad_v2.child_profile%rowtype; update_r peacepad_v2.child_update%rowtype;
 expense_r peacepad_v2.family_expense%rowtype; settlement_r peacepad_v2.expense_settlement%rowtype; call_r peacepad_v2.scheduled_call%rowtype;
 conch_r peacepad_v2.conch_session%rowtype; turn_r peacepad_v2.conch_turn%rowtype; conversation_r peacepad_v2.conversation%rowtype; other_id uuid;
begin
 prior:=peacepad_v2.prior_write_result(p_identity_id,p_idempotency_key); if prior is not null then return prior; end if;
 if p_schema_version<>2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
 v_family_id:=nullif(p_payload->>'familyCircleId','')::uuid;
 if v_family_id is null and p_operation like 'child.%' then select r.family_id into v_family_id from peacepad_v2.child_profile r where r.child_profile_id=(p_payload->>'id')::uuid; end if;
 if v_family_id is null and p_operation like 'settlement.%' then select r.family_id into v_family_id from peacepad_v2.expense_settlement r where r.settlement_id=(p_payload->>'id')::uuid; end if;
 if v_family_id is null and p_operation like 'scheduled-call.%' then select r.family_id into v_family_id from peacepad_v2.scheduled_call r where r.scheduled_call_id=(p_payload->>'id')::uuid; end if;
 if v_family_id is null and p_operation like 'conch.%' then select r.family_id into v_family_id from peacepad_v2.conch_session r where r.conch_session_id=(p_payload->>'id')::uuid; end if;
 if v_family_id is null or not peacepad_v2.parent_core_access(p_identity_id,v_family_id,p_region) then raise exception using errcode='42501',message='FAMILY_ACCESS_DENIED'; end if;

 if p_operation='child.create' then
  insert into peacepad_v2.child_profile values(gen_random_uuid(),v_family_id,p_region,trim(p_payload->>'displayName'),p_identity_id,now(),now(),null,1) returning * into child_r;
  response:=peacepad_v2.child_profile_json(child_r);
 elsif p_operation='child.update' then
  update peacepad_v2.child_profile set display_name=trim(p_payload->>'displayName'),updated_at=now(),version=version+1 where child_profile_id=(p_payload->>'id')::uuid and region=p_region and version=p_expected_version returning * into child_r;
  if not found then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if; response:=peacepad_v2.child_profile_json(child_r);
 elsif p_operation='child-update.create' then
  insert into peacepad_v2.child_update(child_update_id,family_id,child_profile_id,region,author_identity_id,kind,title,body,occurred_at,visibility)
   values(gen_random_uuid(),v_family_id,(p_payload->>'childProfileId')::uuid,p_region,p_identity_id,p_payload->>'kind',trim(p_payload->>'title'),trim(p_payload->>'body'),(p_payload->>'occurredAt')::timestamptz,p_payload->'visibility') returning * into update_r;
  response:=peacepad_v2.child_update_json(update_r);
 elsif p_operation='expense.create' then
  insert into peacepad_v2.family_expense(expense_id,family_id,region,created_by,child_profile_ids,title,description,category,amount_minor,currency,incurred_at,splits,receipt_attachment_id)
   values(gen_random_uuid(),v_family_id,p_region,p_identity_id,array(select jsonb_array_elements_text(coalesce(p_payload->'childProfileIds','[]'))::uuid),trim(p_payload->>'title'),nullif(trim(p_payload->>'description'),''),p_payload->>'category',(p_payload->>'amountMinor')::bigint,p_payload->>'currency',(p_payload->>'incurredAt')::timestamptz,p_payload->'splits',nullif(p_payload->>'receiptAttachmentId','')::uuid) returning * into expense_r;
  response:=peacepad_v2.expense_json(expense_r);
 elsif p_operation='expense.update' then
  update peacepad_v2.family_expense set title=trim(p_payload->>'title'),description=nullif(trim(p_payload->>'description'),''),category=p_payload->>'category',status=p_payload->>'status',updated_at=now(),version=version+1 where expense_id=(p_payload->>'id')::uuid and region=p_region and version=p_expected_version returning * into expense_r;
  if not found then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if; response:=peacepad_v2.expense_json(expense_r);
 elsif p_operation='settlement.request' then
  if not peacepad_v2.parent_core_access((p_payload->>'requestedFromIdentityId')::uuid,v_family_id,p_region) then raise exception using errcode='22023',message='SETTLEMENT_PARTICIPANT_INVALID'; end if;
  insert into peacepad_v2.expense_settlement(settlement_id,family_id,expense_id,region,requested_by,requested_from,amount_minor,currency)
   values(gen_random_uuid(),v_family_id,(p_payload->>'expenseId')::uuid,p_region,p_identity_id,(p_payload->>'requestedFromIdentityId')::uuid,(p_payload->>'amountMinor')::bigint,p_payload->>'currency') returning * into settlement_r;
  update peacepad_v2.family_expense set status='settlement-requested',updated_at=now(),version=version+1 where expense_id=settlement_r.expense_id;
  response:=peacepad_v2.settlement_json(settlement_r);
 elsif p_operation='settlement.resolve' then
  update peacepad_v2.expense_settlement set status=p_payload->>'resolution',resolved_at=now(),version=version+1 where settlement_id=(p_payload->>'id')::uuid and region=p_region and requested_from=p_identity_id and version=p_expected_version returning * into settlement_r;
  if not found then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
  update peacepad_v2.family_expense set status=case settlement_r.status when 'confirmed' then 'settled' when 'disputed' then 'disputed' else 'open' end,updated_at=now(),version=version+1 where expense_id=settlement_r.expense_id;
  response:=peacepad_v2.settlement_json(settlement_r);
 elsif p_operation='scheduled-call.create' then
  select * into conversation_r from peacepad_v2.conversation where conversation_id=(p_payload->>'conversationId')::uuid and family_id=v_family_id and region=p_region and p_identity_id=any(participant_identity_ids);
  if not found then raise exception using errcode='42501',message='CONVERSATION_ACCESS_DENIED'; end if;
  insert into peacepad_v2.scheduled_call(scheduled_call_id,family_id,conversation_id,region,created_by,participant_identity_ids,media_type,starts_at,duration_minutes,note)
   values(gen_random_uuid(),v_family_id,conversation_r.conversation_id,p_region,p_identity_id,conversation_r.participant_identity_ids,p_payload->>'mediaType',(p_payload->>'startsAt')::timestamptz,(p_payload->>'durationMinutes')::integer,nullif(trim(p_payload->>'note'),'')) returning * into call_r;
  response:=peacepad_v2.scheduled_call_json(call_r);
 elsif p_operation='scheduled-call.cancel' then
  update peacepad_v2.scheduled_call set status='cancelled',updated_at=now(),version=version+1 where scheduled_call_id=(p_payload->>'id')::uuid and region=p_region and version=p_expected_version and p_identity_id=any(participant_identity_ids) returning * into call_r;
  if not found then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if; response:=peacepad_v2.scheduled_call_json(call_r);
 elsif p_operation='conch.create' then
  select * into conversation_r from peacepad_v2.conversation where conversation_id=(p_payload->>'conversationId')::uuid and family_id=v_family_id and region=p_region and p_identity_id=any(participant_identity_ids);
  if not found or cardinality(conversation_r.participant_identity_ids)<>2 then raise exception using errcode='42501',message='CONVERSATION_ACCESS_DENIED'; end if;
  insert into peacepad_v2.conch_session(conch_session_id,family_id,conversation_id,region,participant_identity_ids,created_by,media_type,consented_identity_ids,turn_duration_seconds)
   values(gen_random_uuid(),v_family_id,conversation_r.conversation_id,p_region,conversation_r.participant_identity_ids,p_identity_id,p_payload->>'mediaType',array[p_identity_id],(p_payload->>'turnDurationSeconds')::integer) returning * into conch_r;
  response:=peacepad_v2.conch_session_json(conch_r);
 elsif p_operation='conch.respond' then
  update peacepad_v2.conch_session set status=case when p_payload->>'response'='accept' then 'active' else 'declined' end,
   consented_identity_ids=case when p_payload->>'response'='accept' then array(select distinct unnest(consented_identity_ids||array[p_identity_id])) else consented_identity_ids end,
   current_speaker_identity_id=case when p_payload->>'response'='accept' then created_by else null end,turn_started_at=case when p_payload->>'response'='accept' then now() else null end,updated_at=now(),version=version+1
   where conch_session_id=(p_payload->>'id')::uuid and p_identity_id=any(participant_identity_ids) and version=p_expected_version returning * into conch_r;
   if not found then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
   if p_payload->>'response'='accept' then
    insert into peacepad_v2.conch_turn(conch_turn_id,conch_session_id,region,speaker_identity_id,started_at,reactions)
     values(gen_random_uuid(),conch_r.conch_session_id,p_region,conch_r.current_speaker_identity_id,conch_r.turn_started_at,'[]') returning * into turn_r;
   end if;
   response:=peacepad_v2.conch_session_json(conch_r);
 elsif p_operation='conch.consent' then
  update peacepad_v2.conch_session set summary_consent_identity_ids=case when (p_payload->>'summaryConsent')::boolean then array(select distinct unnest(summary_consent_identity_ids||array[p_identity_id])) else array_remove(summary_consent_identity_ids,p_identity_id) end,updated_at=now(),version=version+1
   where conch_session_id=(p_payload->>'id')::uuid and p_identity_id=any(participant_identity_ids) and version=p_expected_version returning * into conch_r;
  if not found then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if; response:=peacepad_v2.conch_session_json(conch_r);
 elsif p_operation='conch.react' then
  select * into conch_r from peacepad_v2.conch_session where conch_session_id=(p_payload->>'id')::uuid and status='active' and p_identity_id=any(participant_identity_ids) and version=p_expected_version for update;
  if not found then raise exception using errcode='40001',message='CONCH_TURN_INVALID'; end if;
  update peacepad_v2.conch_turn set reactions=(select coalesce(jsonb_agg(item),'[]'::jsonb) from jsonb_array_elements(reactions) item where item->>'identityId'<>p_identity_id::text)
    || jsonb_build_array(jsonb_build_object('identityId',p_identity_id,'reaction',p_payload->>'reaction','reactedAt',now())),version=version+1
   where conch_turn_id=(p_payload->>'turnId')::uuid and conch_session_id=conch_r.conch_session_id and ended_at is null returning * into turn_r;
  if not found then raise exception using errcode='40001',message='CONCH_TURN_INVALID'; end if; response:=peacepad_v2.conch_turn_json(turn_r);
 elsif p_operation='conch.pass' then
  select * into conch_r from peacepad_v2.conch_session where conch_session_id=(p_payload->>'id')::uuid and status='active' and current_speaker_identity_id=p_identity_id and version=p_expected_version for update;
  if not found then raise exception using errcode='40001',message='CONCH_TURN_INVALID'; end if;
  update peacepad_v2.conch_turn set ended_at=now(),outcome='passed',version=version+1 where conch_session_id=conch_r.conch_session_id and speaker_identity_id=p_identity_id and ended_at is null returning * into turn_r;
  if not found then raise exception using errcode='40001',message='CONCH_TURN_INVALID'; end if;
  select x into other_id from unnest(conch_r.participant_identity_ids) x where x<>p_identity_id limit 1;
  update peacepad_v2.conch_session set current_speaker_identity_id=other_id,turn_started_at=now(),updated_at=now(),version=version+1 where conch_session_id=conch_r.conch_session_id returning * into conch_r;
  insert into peacepad_v2.conch_turn(conch_turn_id,conch_session_id,region,speaker_identity_id,started_at,reactions)
   values(gen_random_uuid(),conch_r.conch_session_id,p_region,other_id,conch_r.turn_started_at,'[]');
  response:=jsonb_build_object('session',peacepad_v2.conch_session_json(conch_r),'turn',peacepad_v2.conch_turn_json(turn_r));
 elsif p_operation='conch.end' then
  update peacepad_v2.conch_turn set ended_at=now(),outcome='ended',version=version+1 where conch_session_id=(p_payload->>'id')::uuid and ended_at is null;
  update peacepad_v2.conch_session set status='ended',ended_at=now(),current_speaker_identity_id=null,turn_started_at=null,updated_at=now(),version=version+1 where conch_session_id=(p_payload->>'id')::uuid and p_identity_id=any(participant_identity_ids) and version=p_expected_version returning * into conch_r;
  if not found then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if; response:=peacepad_v2.conch_session_json(conch_r);
 else raise exception using errcode='22023',message='PARENT_CORE_OPERATION_INVALID';
 end if;
 perform peacepad_v2.record_write(p_identity_id,v_family_id,p_region,p_operation,p_schema_version,p_idempotency_key,response);
 return response;
end; $$;

revoke all on function public.peacepad_v2_parent_core_list(uuid,text,uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_get_current_conch(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_get_current_conch_turn(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.peacepad_v2_parent_core_write(uuid,text,text,jsonb,integer,text,integer) from public,anon,authenticated;
grant execute on function public.peacepad_v2_parent_core_list(uuid,text,uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_get_current_conch(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_get_current_conch_turn(uuid,text,uuid) to service_role;
grant execute on function public.peacepad_v2_parent_core_write(uuid,text,text,jsonb,integer,text,integer) to service_role;
