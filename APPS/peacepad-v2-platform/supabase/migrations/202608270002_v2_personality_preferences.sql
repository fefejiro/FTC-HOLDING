-- Optional, self-selected communication profile for the native V2 settings
-- surface. This is not a diagnostic assessment and never stores a guess about
-- another parent. The Edge API derives identity and region from the verified
-- session; direct client table access remains disabled.

create table if not exists peacepad_v2.personality_preference (
  identity_id uuid primary key references peacepad_v2.identity(identity_id) on delete cascade,
  region text not null check (region in ('ca', 'us')),
  personality_type text check (
    personality_type is null or personality_type in (
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP',
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP'
    )
  ),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

alter table peacepad_v2.personality_preference enable row level security;
revoke all on table peacepad_v2.personality_preference from public, anon, authenticated;
grant select, insert, update, delete on table peacepad_v2.personality_preference to service_role;

create or replace function peacepad_v2.personality_preference_json(
  p_identity_id uuid,
  p_region text,
  p_personality_type text,
  p_updated_at timestamptz,
  p_version integer
)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'identityId', p_identity_id,
    'region', p_region,
    'personalityType', p_personality_type,
    'updatedAt', p_updated_at,
    'version', p_version,
    'schemaVersion', '2.0'
  );
$$;

create or replace function public.peacepad_v2_get_personality_preference(
  p_identity_id uuid,
  p_region text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  account peacepad_v2.identity%rowtype;
  preference peacepad_v2.personality_preference%rowtype;
begin
  if p_identity_id is null or p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'INVALID_REQUEST';
  end if;
  select * into account from peacepad_v2.identity where identity_id = p_identity_id;
  if not found or account.deleted_at is not null then
    raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND';
  end if;
  if account.region <> p_region then
    raise exception using errcode = '42501', message = 'REGION_MISMATCH';
  end if;
  select * into preference from peacepad_v2.personality_preference
  where identity_id = p_identity_id and region = p_region;
  if not found then
    return peacepad_v2.personality_preference_json(p_identity_id, p_region, null, null, 0);
  end if;
  return peacepad_v2.personality_preference_json(
    preference.identity_id,
    preference.region,
    preference.personality_type,
    preference.updated_at,
    preference.version
  );
end;
$$;

create or replace function public.peacepad_v2_set_personality_preference(
  p_identity_id uuid,
  p_region text,
  p_personality_type text,
  p_expected_version integer,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  account peacepad_v2.identity%rowtype;
  preference peacepad_v2.personality_preference%rowtype;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_identity_id is null or p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'INVALID_REQUEST';
  end if;
  if p_schema_version <> 2 then
    raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH';
  end if;
  if p_expected_version is null or p_expected_version < 0 then
    raise exception using errcode = '22023', message = 'EXPECTED_VERSION_INVALID';
  end if;
  if p_personality_type is not null and p_personality_type not in (
    'INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP'
  ) then
    raise exception using errcode = '22023', message = 'PERSONALITY_TYPE_INVALID';
  end if;

  select * into account from peacepad_v2.identity
  where identity_id = p_identity_id for update;
  if not found or account.deleted_at is not null then
    raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND';
  end if;
  if account.region <> p_region then
    raise exception using errcode = '42501', message = 'REGION_MISMATCH';
  end if;

  select * into preference from peacepad_v2.personality_preference
  where identity_id = p_identity_id for update;
  if not found then
    if p_expected_version <> 0 then
      raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT';
    end if;
    insert into peacepad_v2.personality_preference(identity_id, region, personality_type)
    values (p_identity_id, p_region, p_personality_type)
    returning * into preference;
  else
    if preference.region <> p_region or preference.version <> p_expected_version then
      raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT';
    end if;
    update peacepad_v2.personality_preference
    set personality_type = p_personality_type,
        updated_at = now(),
        version = version + 1
    where identity_id = p_identity_id
    returning * into preference;
  end if;

  response := peacepad_v2.personality_preference_json(
    preference.identity_id,
    preference.region,
    preference.personality_type,
    preference.updated_at,
    preference.version
  );
  perform peacepad_v2.record_write(
    p_identity_id, null, p_region, 'personality.updated',
    p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

revoke all on function peacepad_v2.personality_preference_json(uuid, text, text, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_get_personality_preference(uuid, text) from public, anon, authenticated;
revoke all on function public.peacepad_v2_set_personality_preference(uuid, text, text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_get_personality_preference(uuid, text) to service_role;
grant execute on function public.peacepad_v2_set_personality_preference(uuid, text, text, integer, text, integer) to service_role;

comment on table peacepad_v2.personality_preference is
  'Optional self-selected communication profile; never an inferred diagnosis or co-parent guess.';
