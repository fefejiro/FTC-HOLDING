create or replace function public.peacepad_v2_authorize_coach_conversation(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
begin
  perform peacepad_v2.authorized_conversation(p_identity_id, p_region, p_conversation_id);
  return true;
exception when others then
  return false;
end;
$$;

revoke all on function public.peacepad_v2_authorize_coach_conversation(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.peacepad_v2_authorize_coach_conversation(uuid, text, uuid) to service_role;
