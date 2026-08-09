-- Atomic fictional-staging transactions for the first persisted /api/v2
-- identity, consent, family, and invitation journey. These functions are
-- callable only by the regional Edge Function's service-role client.

alter table peacepad_v2.audit_event
  add column if not exists result jsonb;

create or replace function peacepad_v2.prior_write_result(
  p_identity_id uuid,
  p_idempotency_key text
)
returns jsonb
language sql
stable
set search_path = pg_catalog, peacepad_v2
as $$
  select event.result
  from peacepad_v2.audit_event event
  where event.identity_id = p_identity_id
    and event.idempotency_key = p_idempotency_key;
$$;

create or replace function peacepad_v2.record_write(
  p_identity_id uuid,
  p_family_id uuid,
  p_region text,
  p_event_type text,
  p_schema_version integer,
  p_idempotency_key text,
  p_result jsonb
)
returns void
language plpgsql
set search_path = pg_catalog, peacepad_v2
as $$
begin
  insert into peacepad_v2.audit_event (
    audit_event_id, identity_id, family_id, region, event_type,
    schema_version, idempotency_key, result
  ) values (
    gen_random_uuid(), p_identity_id, p_family_id, p_region, p_event_type,
    p_schema_version, p_idempotency_key, p_result
  );
end;
$$;

create or replace function public.peacepad_v2_bootstrap_identity(
  p_identity_id uuid,
  p_region text,
  p_display_name text,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  existing_result jsonb;
  existing_region text;
  response jsonb;
begin
  if p_region not in ('ca', 'us') then raise exception using errcode = '22023', message = 'REGION_INVALID'; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(trim(p_display_name)) not between 1 and 120 then raise exception using errcode = '22023', message = 'DISPLAY_NAME_INVALID'; end if;
  if char_length(p_idempotency_key) not between 8 and 160 then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID'; end if;

  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;

  select identity.region into existing_region
  from peacepad_v2.identity identity
  where identity.identity_id = p_identity_id;
  if existing_region is not null and existing_region <> p_region then
    raise exception using errcode = '42501', message = 'REGION_MISMATCH';
  end if;

  insert into peacepad_v2.identity (identity_id, region, display_name)
  values (p_identity_id, p_region, trim(p_display_name))
  on conflict (identity_id) do update
    set display_name = excluded.display_name,
        version = peacepad_v2.identity.version + 1
    where peacepad_v2.identity.region = excluded.region
      and peacepad_v2.identity.deleted_at is null;

  insert into peacepad_v2.region_binding (identity_id, region)
  values (p_identity_id, p_region)
  on conflict (identity_id) do nothing;

  response := jsonb_build_object(
    'identityId', p_identity_id,
    'region', p_region,
    'displayName', trim(p_display_name)
  );
  perform peacepad_v2.record_write(p_identity_id, null, p_region, 'identity.bootstrapped', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_record_consent(
  p_identity_id uuid,
  p_region text,
  p_consent_type text,
  p_granted boolean,
  p_policy_version text,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  consent_id uuid := gen_random_uuid();
  bound_region text;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  select region into bound_region from peacepad_v2.identity where identity_id = p_identity_id and deleted_at is null;
  if bound_region is null then raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND'; end if;
  if bound_region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(p_idempotency_key) not between 8 and 160 then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID'; end if;
  if p_consent_type not in ('terms', 'privacy', 'third_party_ai') then raise exception using errcode = '22023', message = 'CONSENT_TYPE_INVALID'; end if;
  if char_length(p_policy_version) not between 1 and 40 then raise exception using errcode = '22023', message = 'POLICY_VERSION_INVALID'; end if;

  insert into peacepad_v2.consent_record (
    consent_record_id, identity_id, region, consent_type, granted,
    policy_version, schema_version
  ) values (
    consent_id, p_identity_id, p_region, p_consent_type, p_granted,
    p_policy_version, p_schema_version
  );
  response := jsonb_build_object('consentRecordId', consent_id, 'consentType', p_consent_type, 'granted', p_granted, 'policyVersion', p_policy_version);
  perform peacepad_v2.record_write(p_identity_id, null, p_region, 'consent.recorded', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_create_family(
  p_identity_id uuid,
  p_region text,
  p_family_name text,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  family_id uuid := gen_random_uuid();
  grant_id uuid := gen_random_uuid();
  bound_region text;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  select region into bound_region from peacepad_v2.identity where identity_id = p_identity_id and deleted_at is null;
  if bound_region is null then raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND'; end if;
  if bound_region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(p_idempotency_key) not between 8 and 160 then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID'; end if;
  if char_length(trim(p_family_name)) not between 1 and 120 then raise exception using errcode = '22023', message = 'FAMILY_NAME_INVALID'; end if;

  insert into peacepad_v2.family_circle (family_id, region, family_name, created_by)
  values (family_id, p_region, trim(p_family_name), p_identity_id);
  insert into peacepad_v2.participant_grant (
    participant_grant_id, family_id, identity_id, region, role,
    permissions, granted_by
  ) values (
    grant_id, family_id, p_identity_id, p_region, 'parent',
    array['family.manage', 'invitation.manage', 'message.write', 'calendar.write'], p_identity_id
  );
  response := jsonb_build_object('familyId', family_id, 'participantGrantId', grant_id, 'region', p_region, 'familyName', trim(p_family_name));
  perform peacepad_v2.record_write(p_identity_id, family_id, p_region, 'family.created', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_create_invitation(
  p_identity_id uuid,
  p_region text,
  p_family_id uuid,
  p_code_hash bytea,
  p_invited_role text,
  p_permissions text[],
  p_expires_at timestamptz,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  invitation_id uuid := gen_random_uuid();
  grant_region text;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(p_idempotency_key) not between 8 and 160 then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID'; end if;
  if octet_length(p_code_hash) <> 32 then raise exception using errcode = '22023', message = 'INVITATION_HASH_INVALID'; end if;
  if p_invited_role not in ('parent', 'caregiver', 'professional') then raise exception using errcode = '22023', message = 'INVITATION_ROLE_INVALID'; end if;
  if cardinality(coalesce(p_permissions, '{}')) > 8 then raise exception using errcode = '22023', message = 'INVITATION_PERMISSIONS_INVALID'; end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '168 hours' then raise exception using errcode = '22023', message = 'INVITATION_EXPIRY_INVALID'; end if;

  select participant.region into grant_region
  from peacepad_v2.participant_grant participant
  where participant.family_id = p_family_id
    and participant.identity_id = p_identity_id
    and participant.revoked_at is null
    and 'invitation.manage' = any(participant.permissions);
  if grant_region is null then raise exception using errcode = '42501', message = 'FAMILY_ACCESS_DENIED'; end if;
  if grant_region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;

  insert into peacepad_v2.family_invitation (
    invitation_id, family_id, region, created_by, code_hash, invited_role,
    permissions, expires_at
  ) values (
    invitation_id, p_family_id, p_region, p_identity_id, p_code_hash,
    p_invited_role, coalesce(p_permissions, '{}'), p_expires_at
  );
  response := jsonb_build_object('invitationId', invitation_id, 'familyId', p_family_id, 'region', p_region, 'invitedRole', p_invited_role, 'permissions', coalesce(p_permissions, '{}'), 'expiresAt', p_expires_at, 'createdAt', now(), 'status', 'pending', 'version', 1);
  perform peacepad_v2.record_write(p_identity_id, p_family_id, p_region, 'invitation.created', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

revoke all on function public.peacepad_v2_bootstrap_identity(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_record_consent(uuid, text, text, boolean, text, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_create_family(uuid, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_create_invitation(uuid, text, uuid, bytea, text, text[], timestamptz, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_bootstrap_identity(uuid, text, text, text, integer) to service_role;
grant execute on function public.peacepad_v2_record_consent(uuid, text, text, boolean, text, text, integer) to service_role;
grant execute on function public.peacepad_v2_create_family(uuid, text, text, text, integer) to service_role;
grant execute on function public.peacepad_v2_create_invitation(uuid, text, uuid, bytea, text, text[], timestamptz, text, integer) to service_role;
