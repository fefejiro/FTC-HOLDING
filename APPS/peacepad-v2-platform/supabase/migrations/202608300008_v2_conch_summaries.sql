create table if not exists peacepad_v2.conch_summary (
  conch_summary_id uuid primary key,
  conch_session_id uuid not null unique references peacepad_v2.conch_session(conch_session_id) on delete cascade,
  family_id uuid not null,
  region text not null check (region in ('ca', 'us')),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

alter table peacepad_v2.conch_summary enable row level security;
revoke all on table peacepad_v2.conch_summary from public, anon, authenticated;

create or replace function peacepad_v2.conch_summary_json(r peacepad_v2.conch_summary)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', r.conch_summary_id,
    'conchSessionId', r.conch_session_id,
    'familyCircleId', r.family_id,
    'body', r.body,
    'createdByIdentityId', r.created_by,
    'updatedByIdentityId', r.updated_by,
    'createdAt', r.created_at,
    'updatedAt', r.updated_at,
    'schemaVersion', '2.0',
    'version', r.version,
    'region', r.region,
    'provenance', jsonb_build_object(
      'createdAt', r.created_at,
      'createdBy', jsonb_build_object('identityId', r.created_by, 'sessionId', null),
      'source', 'app'
    )
  );
$$;

create or replace function public.peacepad_v2_get_conch_summary(
  p_identity_id uuid,
  p_region text,
  p_conch_session_id uuid
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, peacepad_v2 as $$
declare session_r peacepad_v2.conch_session%rowtype; summary_r peacepad_v2.conch_summary%rowtype;
begin
  select * into session_r from peacepad_v2.conch_session
   where conch_session_id = p_conch_session_id and region = p_region and p_identity_id = any(participant_identity_ids);
  if not found then raise exception using errcode = '42501', message = 'CONVERSATION_ACCESS_DENIED'; end if;
  if not (session_r.participant_identity_ids <@ session_r.summary_consent_identity_ids) then return null; end if;
  select * into summary_r from peacepad_v2.conch_summary where conch_session_id = p_conch_session_id and region = p_region;
  return case when found then peacepad_v2.conch_summary_json(summary_r) else null end;
end;
$$;

create or replace function public.peacepad_v2_save_conch_summary(
  p_identity_id uuid,
  p_region text,
  p_conch_session_id uuid,
  p_body text,
  p_expected_version integer,
  p_idempotency_key text,
  p_schema_version integer
) returns jsonb
language plpgsql security definer set search_path = pg_catalog, peacepad_v2 as $$
declare prior jsonb; session_r peacepad_v2.conch_session%rowtype; summary_r peacepad_v2.conch_summary%rowtype; response jsonb;
begin
  prior := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if prior is not null then return prior; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 1000 then raise exception using errcode = '22023', message = 'CONCH_SUMMARY_INVALID'; end if;
  select * into session_r from peacepad_v2.conch_session
   where conch_session_id = p_conch_session_id and region = p_region and p_identity_id = any(participant_identity_ids) for update;
  if not found then raise exception using errcode = '42501', message = 'CONVERSATION_ACCESS_DENIED'; end if;
  if not (session_r.participant_identity_ids <@ session_r.summary_consent_identity_ids) then
    raise exception using errcode = '42501', message = 'CONCH_SUMMARY_CONSENT_REQUIRED';
  end if;
  select * into summary_r from peacepad_v2.conch_summary where conch_session_id = p_conch_session_id for update;
  if found then
    if p_expected_version is null or p_expected_version <> summary_r.version then raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;
    update peacepad_v2.conch_summary set body = trim(p_body), updated_by = p_identity_id, updated_at = now(), version = version + 1
     where conch_summary_id = summary_r.conch_summary_id returning * into summary_r;
  else
    if p_expected_version is not null then raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;
    insert into peacepad_v2.conch_summary(conch_summary_id, conch_session_id, family_id, region, body, created_by, updated_by)
     values(gen_random_uuid(), p_conch_session_id, session_r.family_id, p_region, trim(p_body), p_identity_id, p_identity_id)
     returning * into summary_r;
  end if;
  response := peacepad_v2.conch_summary_json(summary_r);
  perform peacepad_v2.record_write(p_identity_id, session_r.family_id, p_region, 'conch.summary_saved', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function peacepad_v2.delete_conch_summary_after_consent_withdrawal()
returns trigger language plpgsql security definer set search_path = pg_catalog, peacepad_v2 as $$
begin
  if not (new.participant_identity_ids <@ new.summary_consent_identity_ids) then
    delete from peacepad_v2.conch_summary where conch_session_id = new.conch_session_id;
  end if;
  return new;
end;
$$;

drop trigger if exists conch_summary_consent_withdrawal on peacepad_v2.conch_session;
create trigger conch_summary_consent_withdrawal
after update of summary_consent_identity_ids on peacepad_v2.conch_session
for each row execute function peacepad_v2.delete_conch_summary_after_consent_withdrawal();

revoke all on function public.peacepad_v2_get_conch_summary(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.peacepad_v2_save_conch_summary(uuid, text, uuid, text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_get_conch_summary(uuid, text, uuid) to service_role;
grant execute on function public.peacepad_v2_save_conch_summary(uuid, text, uuid, text, integer, text, integer) to service_role;
