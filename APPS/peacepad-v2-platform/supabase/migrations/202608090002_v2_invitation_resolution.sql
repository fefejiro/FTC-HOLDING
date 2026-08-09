-- Rate-limited invitation preview and explicit acceptance. A valid code is
-- required before inviter/family metadata is returned. Acceptance is atomic,
-- version-checked, single-use, region-bound, and audit-linked.

create table if not exists peacepad_v2.invitation_attempt (
  invitation_attempt_id uuid primary key,
  identity_id uuid not null references peacepad_v2.identity(identity_id) on delete cascade,
  region text not null check (region in ('ca', 'us')),
  code_hash bytea not null check (octet_length(code_hash) = 32),
  attempted_at timestamptz not null default now()
);
create index if not exists invitation_attempt_rate_idx
  on peacepad_v2.invitation_attempt(identity_id, attempted_at desc);
alter table peacepad_v2.invitation_attempt enable row level security;
revoke all on peacepad_v2.invitation_attempt from anon, authenticated;

create or replace function public.peacepad_v2_resolve_invitation(
  p_identity_id uuid,
  p_region text,
  p_code_hash bytea
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  recent_attempts integer;
  invitation peacepad_v2.family_invitation%rowtype;
  inviter_name text;
  family_name text;
  bound_region text;
begin
  select region into bound_region from peacepad_v2.identity where identity_id = p_identity_id and deleted_at is null;
  if bound_region is null then return jsonb_build_object('errorCode', 'IDENTITY_NOT_BOUND'); end if;
  if bound_region <> p_region then return jsonb_build_object('errorCode', 'REGION_MISMATCH'); end if;
  if octet_length(p_code_hash) <> 32 then return jsonb_build_object('errorCode', 'INVITATION_INVALID'); end if;

  select count(*) into recent_attempts
  from peacepad_v2.invitation_attempt
  where identity_id = p_identity_id
    and attempted_at > now() - interval '15 minutes';
  if recent_attempts >= 10 then return jsonb_build_object('errorCode', 'INVITATION_RATE_LIMITED'); end if;

  insert into peacepad_v2.invitation_attempt (invitation_attempt_id, identity_id, region, code_hash)
  values (gen_random_uuid(), p_identity_id, p_region, p_code_hash);

  select * into invitation
  from peacepad_v2.family_invitation
  where region = p_region and code_hash = p_code_hash;
  if not found then return jsonb_build_object('errorCode', 'INVITATION_INVALID'); end if;
  if invitation.status = 'revoked' then return jsonb_build_object('errorCode', 'INVITATION_REVOKED'); end if;
  if invitation.status <> 'pending' then return jsonb_build_object('errorCode', 'INVITATION_USED'); end if;
  if invitation.expires_at <= now() then return jsonb_build_object('errorCode', 'INVITATION_EXPIRED'); end if;

  select display_name into inviter_name from peacepad_v2.identity where identity_id = invitation.created_by;
  select circle.family_name into family_name from peacepad_v2.family_circle circle where circle.family_id = invitation.family_id and circle.deleted_at is null;
  return jsonb_build_object(
    'invitationId', invitation.invitation_id,
    'inviterDisplayName', inviter_name,
    'familyDisplayName', family_name,
    'invitedRole', invitation.invited_role,
    'permissions', invitation.permissions,
    'expiresAt', invitation.expires_at,
    'version', invitation.version
  );
end;
$$;

create or replace function public.peacepad_v2_accept_invitation(
  p_identity_id uuid,
  p_region text,
  p_invitation_id uuid,
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
  invitation peacepad_v2.family_invitation%rowtype;
  grant_id uuid := gen_random_uuid();
  bound_region text;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(p_idempotency_key) not between 8 and 160 then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID'; end if;
  if p_expected_version < 1 then raise exception using errcode = '22023', message = 'EXPECTED_VERSION_INVALID'; end if;
  select region into bound_region from peacepad_v2.identity where identity_id = p_identity_id and deleted_at is null;
  if bound_region is null then raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND'; end if;
  if bound_region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;

  select * into invitation from peacepad_v2.family_invitation
  where invitation_id = p_invitation_id for update;
  if not found then raise exception using errcode = '22023', message = 'INVITATION_INVALID'; end if;
  if invitation.region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;
  if invitation.created_by = p_identity_id then raise exception using errcode = '42501', message = 'INVITATION_SELF_ACCEPT_DENIED'; end if;
  if invitation.status = 'revoked' then raise exception using errcode = '22023', message = 'INVITATION_REVOKED'; end if;
  if invitation.status <> 'pending' then raise exception using errcode = '22023', message = 'INVITATION_USED'; end if;
  if invitation.expires_at <= now() then raise exception using errcode = '22023', message = 'INVITATION_EXPIRED'; end if;
  if invitation.version <> p_expected_version then raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;

  insert into peacepad_v2.participant_grant (
    participant_grant_id, family_id, identity_id, region, role,
    permissions, granted_by
  ) values (
    grant_id, invitation.family_id, p_identity_id, p_region,
    invitation.invited_role, invitation.permissions, invitation.created_by
  );
  update peacepad_v2.family_invitation
  set status = 'accepted', accepted_by = p_identity_id, accepted_at = now(), version = version + 1
  where invitation_id = p_invitation_id;

  response := jsonb_build_object(
    'participantGrantId', grant_id,
    'familyId', invitation.family_id,
    'identityId', p_identity_id,
    'region', p_region,
    'role', invitation.invited_role,
    'permissions', invitation.permissions,
    'grantedBy', invitation.created_by,
    'grantedAt', now(),
    'version', 1
  );
  perform peacepad_v2.record_write(p_identity_id, invitation.family_id, p_region, 'invitation.accepted', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_decline_invitation(
  p_identity_id uuid,
  p_region text,
  p_invitation_id uuid,
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
  invitation peacepad_v2.family_invitation%rowtype;
  bound_region text;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(p_idempotency_key) not between 8 and 160 then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID'; end if;
  if p_expected_version < 1 then raise exception using errcode = '22023', message = 'EXPECTED_VERSION_INVALID'; end if;
  select region into bound_region from peacepad_v2.identity where identity_id = p_identity_id and deleted_at is null;
  if bound_region is null then raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND'; end if;
  if bound_region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;

  select * into invitation from peacepad_v2.family_invitation
  where invitation_id = p_invitation_id for update;
  if not found then raise exception using errcode = '22023', message = 'INVITATION_INVALID'; end if;
  if invitation.region <> p_region then raise exception using errcode = '22023', message = 'INVITATION_INVALID'; end if;
  if not exists (
    select 1 from peacepad_v2.invitation_attempt attempt
    where attempt.identity_id = p_identity_id
      and attempt.region = p_region
      and attempt.code_hash = invitation.code_hash
      and attempt.attempted_at > now() - interval '30 minutes'
  ) then raise exception using errcode = '22023', message = 'INVITATION_INVALID'; end if;
  if invitation.status = 'revoked' then raise exception using errcode = '22023', message = 'INVITATION_REVOKED'; end if;
  if invitation.status <> 'pending' then raise exception using errcode = '22023', message = 'INVITATION_USED'; end if;
  if invitation.expires_at <= now() then raise exception using errcode = '22023', message = 'INVITATION_EXPIRED'; end if;
  if invitation.version <> p_expected_version then raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;

  update peacepad_v2.family_invitation
  set status = 'declined', declined_at = now(), version = version + 1
  where invitation_id = p_invitation_id;
  response := jsonb_build_object('invitationId', p_invitation_id, 'familyId', invitation.family_id, 'region', p_region, 'status', 'declined', 'version', invitation.version + 1);
  perform peacepad_v2.record_write(p_identity_id, invitation.family_id, p_region, 'invitation.declined', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_revoke_invitation(
  p_identity_id uuid,
  p_region text,
  p_invitation_id uuid,
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
  invitation peacepad_v2.family_invitation%rowtype;
  bound_region text;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if char_length(p_idempotency_key) not between 8 and 160 then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID'; end if;
  if p_expected_version < 1 then raise exception using errcode = '22023', message = 'EXPECTED_VERSION_INVALID'; end if;
  select region into bound_region from peacepad_v2.identity where identity_id = p_identity_id and deleted_at is null;
  if bound_region is null then raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND'; end if;
  if bound_region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;

  select * into invitation from peacepad_v2.family_invitation
  where invitation_id = p_invitation_id for update;
  if not found then raise exception using errcode = '22023', message = 'INVITATION_INVALID'; end if;
  if invitation.region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;
  if invitation.created_by <> p_identity_id and not exists (
    select 1 from peacepad_v2.participant_grant participant
    where participant.family_id = invitation.family_id
      and participant.identity_id = p_identity_id
      and participant.region = p_region
      and participant.revoked_at is null
      and 'invitation.manage' = any(participant.permissions)
  ) then raise exception using errcode = '42501', message = 'FAMILY_ACCESS_DENIED'; end if;
  if invitation.status <> 'pending' then raise exception using errcode = '22023', message = 'INVITATION_USED'; end if;
  if invitation.version <> p_expected_version then raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT'; end if;

  update peacepad_v2.family_invitation
  set status = 'revoked', revoked_at = now(), version = version + 1
  where invitation_id = p_invitation_id;
  response := jsonb_build_object('invitationId', p_invitation_id, 'familyId', invitation.family_id, 'region', p_region, 'status', 'revoked', 'version', invitation.version + 1);
  perform peacepad_v2.record_write(p_identity_id, invitation.family_id, p_region, 'invitation.revoked', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

revoke all on function public.peacepad_v2_resolve_invitation(uuid, text, bytea) from public, anon, authenticated;
revoke all on function public.peacepad_v2_accept_invitation(uuid, text, uuid, integer, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_decline_invitation(uuid, text, uuid, integer, text, integer) from public, anon, authenticated;
revoke all on function public.peacepad_v2_revoke_invitation(uuid, text, uuid, integer, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_resolve_invitation(uuid, text, bytea) to service_role;
grant execute on function public.peacepad_v2_accept_invitation(uuid, text, uuid, integer, text, integer) to service_role;
grant execute on function public.peacepad_v2_decline_invitation(uuid, text, uuid, integer, text, integer) to service_role;
grant execute on function public.peacepad_v2_revoke_invitation(uuid, text, uuid, integer, text, integer) to service_role;
