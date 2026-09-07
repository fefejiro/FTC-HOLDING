-- Accepting a family invitation must leave the new participant with one
-- usable, canonical direct conversation. Membership and conversation
-- bootstrap therefore commit or roll back together.

create unique index if not exists conversation_direct_participants_unique_idx
  on peacepad_v2.conversation (family_id, participant_identity_ids)
  where status = 'active' and cardinality(participant_identity_ids) = 2;

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
  grant_row peacepad_v2.participant_grant%rowtype;
  conversation_row peacepad_v2.conversation%rowtype;
  participants uuid[];
  bound_region text;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is null or p_schema_version <> 2 then raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH'; end if;
  if p_region is null or p_region not in ('ca', 'us') then raise exception using errcode = '22023', message = 'REGION_INVALID'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 160 then raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID'; end if;
  if p_expected_version is null or p_expected_version < 1 then raise exception using errcode = '22023', message = 'EXPECTED_VERSION_INVALID'; end if;

  select region into bound_region
  from peacepad_v2.identity
  where identity_id = p_identity_id and deleted_at is null;
  if bound_region is null then raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND'; end if;
  if bound_region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;

  select * into invitation
  from peacepad_v2.family_invitation
  where invitation_id = p_invitation_id
  for update;
  if not found then raise exception using errcode = '22023', message = 'INVITATION_INVALID'; end if;
  if invitation.region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;
  if invitation.created_by = p_identity_id then raise exception using errcode = '42501', message = 'INVITATION_SELF_ACCEPT_DENIED'; end if;
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
  if not peacepad_v2.can_message(invitation.created_by, invitation.family_id, p_region) then
    raise exception using errcode = '42501', message = 'INVITER_ACCESS_REVOKED';
  end if;

  insert into peacepad_v2.participant_grant (
    participant_grant_id, family_id, identity_id, region, role, permissions, granted_by
  ) values (
    gen_random_uuid(), invitation.family_id, p_identity_id, p_region,
    invitation.invited_role, invitation.permissions, invitation.created_by
  ) returning * into grant_row;

  participants := array(select value from unnest(array[p_identity_id, invitation.created_by]) value order by value);
  insert into peacepad_v2.conversation (
    conversation_id, family_id, region, participant_identity_ids, created_by
  ) values (
    gen_random_uuid(), invitation.family_id, p_region, participants, p_identity_id
  )
  on conflict (family_id, participant_identity_ids)
    where status = 'active' and cardinality(participant_identity_ids) = 2
  do update set updated_at = peacepad_v2.conversation.updated_at
  returning * into conversation_row;

  if not (p_identity_id = any(conversation_row.participant_identity_ids))
     or not (invitation.created_by = any(conversation_row.participant_identity_ids)) then
    raise exception using errcode = '42501', message = 'CONVERSATION_PARTICIPANT_DENIED';
  end if;

  update peacepad_v2.family_invitation
  set status = 'accepted', accepted_by = p_identity_id, accepted_at = now(), version = version + 1
  where invitation_id = p_invitation_id;

  response := jsonb_build_object(
    'grant', jsonb_build_object(
      'participantGrantId', grant_row.participant_grant_id,
      'familyId', grant_row.family_id,
      'identityId', grant_row.identity_id,
      'region', grant_row.region,
      'role', grant_row.role,
      'permissions', grant_row.permissions,
      'grantedBy', grant_row.granted_by,
      'grantedAt', grant_row.granted_at,
      'version', grant_row.version
    ),
    'conversation', peacepad_v2.conversation_json(conversation_row)
  );
  perform peacepad_v2.record_write(p_identity_id, invitation.family_id, p_region, 'invitation.accepted', p_schema_version, p_idempotency_key, response);
  return response;
end;
$$;

revoke all on function public.peacepad_v2_accept_invitation(uuid, text, uuid, integer, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_accept_invitation(uuid, text, uuid, integer, text, integer) to service_role;
