-- Service-role-only retrieval for live incoming-call delivery. Plaintext push
-- tokens leave Postgres only inside the regional Edge function and are never
-- returned to an app client, audit event, or idempotency receipt.

create or replace function public.peacepad_v2_call_push_targets(
  p_caller_identity_id uuid,
  p_region text,
  p_call_id uuid,
  p_token_secret text
)
returns table (
  registration_id uuid,
  platform text,
  transport text,
  app_id text,
  token text
)
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2, extensions
as $$
declare
  call_row peacepad_v2.audio_call_session%rowtype;
begin
  if p_caller_identity_id is null or p_call_id is null or p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'CALL_PUSH_INVALID';
  end if;
  if p_token_secret is null or char_length(p_token_secret) < 32 then
    raise exception using errcode = '22023', message = 'DEVICE_PUSH_CONFIGURATION_INVALID';
  end if;
  select * into call_row from peacepad_v2.audio_call_session where call_id = p_call_id;
  if not found or call_row.caller_identity_id <> p_caller_identity_id or call_row.region <> p_region or call_row.status <> 'ringing' then
    raise exception using errcode = '42501', message = 'CALL_PUSH_ACCESS_DENIED';
  end if;
  return query
  select registration.registration_id,
         registration.platform,
         registration.transport,
         registration.app_id,
         extensions.pgp_sym_decrypt(registration.encrypted_token, p_token_secret)
  from peacepad_v2.device_push_registration registration
  where registration.identity_id = call_row.callee_identity_id
    and registration.region = call_row.region
    and registration.revoked_at is null
    and registration.transport = 'expo';
end;
$$;

revoke all on function public.peacepad_v2_call_push_targets(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.peacepad_v2_call_push_targets(uuid, text, uuid, text) to service_role;

comment on function public.peacepad_v2_call_push_targets(uuid, text, uuid, text) is
  'Returns decrypted active Expo targets only to the regional service-role Edge function for an authorized ringing call.';
