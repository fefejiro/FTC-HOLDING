-- Return the active identity concurrency version with the verified regional
-- session boundary. Mobile clients cannot choose the identity: the Edge
-- Function supplies the identity derived from the validated Supabase JWT.

create or replace function public.peacepad_v2_get_session_binding(p_identity_id uuid)
returns table(identity_id uuid, region text, created_at timestamptz, identity_version integer)
language sql
stable
security definer
set search_path = pg_catalog, peacepad_v2
as $$
  select binding.identity_id, binding.region, binding.created_at, identity.version
  from peacepad_v2.region_binding as binding
  join peacepad_v2.identity as identity
    on identity.identity_id = binding.identity_id
   and identity.deleted_at is null
  where binding.identity_id = p_identity_id;
$$;

revoke all on function public.peacepad_v2_get_session_binding(uuid) from public, anon, authenticated;
grant execute on function public.peacepad_v2_get_session_binding(uuid) to service_role;
