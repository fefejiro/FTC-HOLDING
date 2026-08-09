-- Fictional-staging account deletion and immediate authorization revocation.
-- Supabase access JWTs can remain cryptographically valid until expiry, so
-- every PeacePad session lookup and write also rejects deleted identities.

create or replace function public.peacepad_v2_get_region_binding(p_identity_id uuid)
returns table(identity_id uuid, region text, created_at timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, peacepad_v2
as $$
  select binding.identity_id, binding.region, binding.created_at
  from peacepad_v2.region_binding as binding
  join peacepad_v2.identity as identity
    on identity.identity_id = binding.identity_id
   and identity.deleted_at is null
  where binding.identity_id = p_identity_id;
$$;

create or replace function public.peacepad_v2_delete_account(
  p_identity_id uuid,
  p_region text,
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
  deletion_time timestamptz := now();
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(p_idempotency_key) not between 8 and 160 then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID'; end if;
  if p_expected_version < 1 then raise exception using errcode = '22023', message = 'EXPECTED_VERSION_INVALID'; end if;

  select * into account
  from peacepad_v2.identity
  where identity_id = p_identity_id
  for update;
  if not found then raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND'; end if;
  if account.deleted_at is not null then raise exception using errcode = '42501', message = 'IDENTITY_DELETED'; end if;
  if account.region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;
  if account.version <> p_expected_version then raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;

  update peacepad_v2.participant_grant
  set revoked_at = coalesce(revoked_at, deletion_time),
      version = case when revoked_at is null then version + 1 else version end
  where identity_id = p_identity_id;

  update peacepad_v2.family_invitation
  set status = 'revoked', revoked_at = deletion_time, version = version + 1
  where created_by = p_identity_id and status = 'pending';

  update peacepad_v2.family_circle family
  set deleted_at = deletion_time,
      family_name = 'Deleted family',
      version = version + 1
  where family.created_by = p_identity_id
    and family.deleted_at is null
    and not exists (
      select 1 from peacepad_v2.participant_grant grant_record
      where grant_record.family_id = family.family_id
        and grant_record.identity_id <> p_identity_id
        and grant_record.revoked_at is null
    );

  update peacepad_v2.identity
  set display_name = 'Deleted account',
      deleted_at = deletion_time,
      version = version + 1
  where identity_id = p_identity_id;

  response := jsonb_build_object(
    'identityId', p_identity_id,
    'region', p_region,
    'status', 'deleted',
    'deletedAt', deletion_time,
    'version', account.version + 1
  );
  perform peacepad_v2.record_write(
    p_identity_id, null, p_region, 'account.deleted',
    p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

revoke all on function public.peacepad_v2_delete_account(uuid, text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_delete_account(uuid, text, integer, text, integer) to service_role;
