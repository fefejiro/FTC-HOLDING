-- A verified member may leave one family without deleting their PeacePad
-- identity. Shared coordination history stays attached to the family for any
-- remaining authorized member; the departing grant is revoked atomically.

create or replace function public.peacepad_v2_leave_family(
  p_identity_id uuid,
  p_region text,
  p_family_id uuid,
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
  family_row peacepad_v2.family_circle%rowtype;
  grant_row peacepad_v2.participant_grant%rowtype;
  existing_result jsonb;
  left_at timestamptz := now();
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_identity_id is null or p_family_id is null or p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'INVALID_REQUEST';
  end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'EXPECTED_VERSION_INVALID';
  end if;

  select * into account from peacepad_v2.identity
  where identity_id = p_identity_id for update;
  if not found or account.deleted_at is not null then
    raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND';
  end if;
  if account.region <> p_region then
    raise exception using errcode = '42501', message = 'REGION_MISMATCH';
  end if;

  select * into family_row from peacepad_v2.family_circle
  where family_id = p_family_id for update;
  if not found or family_row.deleted_at is not null or family_row.region <> p_region then
    raise exception using errcode = '42501', message = 'FAMILY_ACCESS_DENIED';
  end if;

  select * into grant_row from peacepad_v2.participant_grant
  where family_id = p_family_id and identity_id = p_identity_id for update;
  if not found or grant_row.revoked_at is not null then
    raise exception using errcode = '42501', message = 'FAMILY_ACCESS_DENIED';
  end if;
  if grant_row.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT';
  end if;

  update peacepad_v2.family_invitation
  set status = 'revoked', revoked_at = left_at,
      code_hash = uuid_send(gen_random_uuid()) || uuid_send(gen_random_uuid()),
      failed_attempts = 0, last_attempt_at = null, version = version + 1
  where family_id = p_family_id and created_by = p_identity_id and status = 'pending';

  update peacepad_v2.participant_grant
  set revoked_at = left_at, version = version + 1
  where participant_grant_id = grant_row.participant_grant_id;

  if not exists (
    select 1 from peacepad_v2.participant_grant remaining
    where remaining.family_id = p_family_id and remaining.revoked_at is null
  ) then
    update peacepad_v2.family_circle
    set deleted_at = left_at, family_name = 'Inactive family', version = version + 1
    where family_id = p_family_id;
  end if;

  response := jsonb_build_object(
    'familyCircleId', p_family_id,
    'participantGrantId', grant_row.participant_grant_id,
    'status', 'left',
    'leftAt', left_at,
    'version', grant_row.version + 1
  );
  perform peacepad_v2.record_write(
    p_identity_id, p_family_id, p_region, 'family.left',
    p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

revoke all on function public.peacepad_v2_leave_family(uuid, text, uuid, integer, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_leave_family(uuid, text, uuid, integer, text, integer) to service_role;

comment on function public.peacepad_v2_leave_family(uuid, text, uuid, integer, text, integer) is
  'Revokes only the caller family grant while retaining shared history for remaining authorized members.';
