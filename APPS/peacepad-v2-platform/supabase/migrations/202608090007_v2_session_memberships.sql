-- Restore only the authenticated identity's active fictional staging memberships.
-- The Edge Function supplies the JWT-derived identity; mobile clients cannot call
-- this function directly and never choose another identity in a request body.

create or replace function peacepad_v2.list_active_memberships(
  p_identity_id uuid,
  p_region text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  bound_region text;
begin
  if p_identity_id is null or p_region is null or p_region not in ('ca', 'us') then
    raise exception 'INVALID_REQUEST';
  end if;

  select identity.region into bound_region
  from peacepad_v2.identity identity
  where identity.identity_id = p_identity_id
    and identity.deleted_at is null;

  if bound_region is null then
    raise exception 'IDENTITY_NOT_BOUND';
  end if;
  if bound_region <> p_region then
    raise exception 'REGION_MISMATCH';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'familyCircleId', participant.family_id,
        'participantGrantId', participant.participant_grant_id,
        'familyName', family.family_name,
        'role', participant.role,
        'permissions', to_jsonb(participant.permissions),
        'version', participant.version
      )
      order by participant.granted_at, participant.participant_grant_id
    )
    from peacepad_v2.participant_grant participant
    join peacepad_v2.family_circle family
      on family.family_id = participant.family_id
     and family.deleted_at is null
    where participant.identity_id = p_identity_id
      and participant.region = p_region
      and participant.revoked_at is null
  ), '[]'::jsonb);
end;
$$;

create or replace function public.peacepad_v2_list_active_memberships(
  p_identity_id uuid,
  p_region text
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, peacepad_v2
as $$
  select peacepad_v2.list_active_memberships(p_identity_id, p_region);
$$;

revoke all on function peacepad_v2.list_active_memberships(uuid, text) from public, anon, authenticated;
revoke all on function public.peacepad_v2_list_active_memberships(uuid, text) from public, anon, authenticated;
grant execute on function public.peacepad_v2_list_active_memberships(uuid, text) to service_role;

