-- A signed-in member may change only their own display name. Identity and
-- region are derived by the Edge API and every update uses optimistic version
-- control plus a content-free audit event.

create or replace function public.peacepad_v2_update_profile(
  p_identity_id uuid,
  p_region text,
  p_display_name text,
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
  existing_result jsonb;
  normalized_name text := trim(p_display_name);
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_identity_id is null or p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'INVALID_REQUEST';
  end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'EXPECTED_VERSION_INVALID';
  end if;
  if char_length(normalized_name) not between 1 and 120 or normalized_name ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'DISPLAY_NAME_INVALID';
  end if;

  select * into account from peacepad_v2.identity
  where identity_id = p_identity_id for update;
  if not found or account.deleted_at is not null then
    raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND';
  end if;
  if account.region <> p_region then
    raise exception using errcode = '42501', message = 'REGION_MISMATCH';
  end if;
  if account.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT';
  end if;

  update peacepad_v2.identity
  set display_name = normalized_name, version = version + 1
  where identity_id = p_identity_id
  returning * into account;

  response := jsonb_build_object(
    'identityId', account.identity_id,
    'displayName', account.display_name,
    'region', account.region,
    'version', account.version
  );
  perform peacepad_v2.record_write(
    p_identity_id, null, p_region, 'profile.updated',
    p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

revoke all on function public.peacepad_v2_update_profile(uuid, text, text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_update_profile(uuid, text, text, integer, text, integer) to service_role;

comment on function public.peacepad_v2_update_profile(uuid, text, text, integer, text, integer) is
  'Updates only the JWT-derived account display name with regional and version checks.';
