-- Narrow service-role RPC boundary for the regional Edge Function. The
-- peacepad_v2 schema remains absent from the public API schema list and direct
-- anon/authenticated access remains revoked.

create or replace function public.peacepad_v2_ready()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, peacepad_v2
as $$
  select to_regclass('peacepad_v2.region_binding') is not null
     and to_regclass('peacepad_v2.audit_event') is not null;
$$;

create or replace function public.peacepad_v2_get_region_binding(p_identity_id uuid)
returns table(identity_id uuid, region text, created_at timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, peacepad_v2
as $$
  select binding.identity_id, binding.region, binding.created_at
  from peacepad_v2.region_binding as binding
  where binding.identity_id = p_identity_id;
$$;

revoke all on function public.peacepad_v2_ready() from public, anon, authenticated;
revoke all on function public.peacepad_v2_get_region_binding(uuid) from public, anon, authenticated;
grant execute on function public.peacepad_v2_ready() to service_role;
grant execute on function public.peacepad_v2_get_region_binding(uuid) to service_role;
