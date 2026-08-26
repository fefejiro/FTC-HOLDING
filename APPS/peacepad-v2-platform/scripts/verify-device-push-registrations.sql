\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.push_token(
  p_client_key text,
  p_operation text,
  p_request_marker text
)
returns text
language sql
immutable
strict
as $$
  select 'v2:'
    || substr(encode(extensions.digest('push-client:' || p_client_key, 'sha256'), 'hex'), 1, 48)
    || ':' || p_operation || ':'
    || substr(encode(extensions.digest('push-request:' || p_operation || ':' || p_request_marker, 'sha256'), 'hex'), 1, 48)
$$;

do $$
declare
  owner_id constant uuid := 'a1000000-0000-4000-8000-000000000001';
  outsider_id constant uuid := 'a1000000-0000-4000-8000-000000000002';
  installation_id constant uuid := 'a2000000-0000-4000-8000-000000000001';
  secret constant text := 'fictional-push-proof-secret-32-characters-minimum';
  provider_token constant text := 'ExpoPushToken[fictional_device_token_1234567890]';
  result jsonb;
  replay jsonb;
  registered_id uuid;
  encrypted bytea;
  audit_count integer;
begin
  insert into auth.users (id) values (owner_id), (outsider_id) on conflict do nothing;
  insert into peacepad_v2.identity (identity_id, region, display_name)
  values (owner_id, 'ca', 'Push Fixture Owner'), (outsider_id, 'ca', 'Push Fixture Outsider');

  if has_table_privilege('authenticated', 'peacepad_v2.device_push_registration', 'select')
     or has_function_privilege('authenticated', 'public.peacepad_v2_register_device_push(uuid,text,uuid,text,text,text,text,text,text,integer)', 'execute')
     or has_function_privilege('authenticated', 'public.peacepad_v2_revoke_device_push(uuid,text,uuid,integer,text,integer)', 'execute') then
    raise exception 'Direct authenticated-role push access was not denied.';
  end if;

  select count(*) into audit_count from peacepad_v2.audit_event;
  result := public.peacepad_v2_register_device_push(
    owner_id, 'ca', installation_id, 'ios', 'expo', 'ca.peacepad.family',
    provider_token, secret,
    pg_temp.push_token('register-1', 'device.push_registered', installation_id::text), 2
  );
  replay := public.peacepad_v2_register_device_push(
    owner_id, 'ca', installation_id, 'ios', 'expo', 'ca.peacepad.family',
    provider_token, secret,
    pg_temp.push_token('register-1', 'device.push_registered', installation_id::text), 2
  );
  if replay <> result or result ->> 'platform' <> 'ios' or result ->> 'transport' <> 'expo'
     or result ? 'token' or result ? 'tokenDigest' then
    raise exception 'Push registration did not replay content-free metadata exactly: %', result;
  end if;
  registered_id := (result ->> 'registrationId')::uuid;
  select encrypted_token into encrypted
  from peacepad_v2.device_push_registration
  where device_push_registration.registration_id = registered_id;
  if encrypted is null or extensions.pgp_sym_decrypt(encrypted, secret) <> provider_token then
    raise exception 'Encrypted provider token could not be reconciled.';
  end if;
  if position(provider_token in encode(encrypted, 'escape')) > 0 then
    raise exception 'Provider token was persisted in plaintext.';
  end if;
  if (select count(*) from peacepad_v2.audit_event) <> audit_count + 1 then
    raise exception 'Push registration audit was not content-free and exactly once.';
  end if;

  begin
    perform public.peacepad_v2_revoke_device_push(
      outsider_id, 'ca', registered_id, (result ->> 'version')::integer,
      pg_temp.push_token('outsider-revoke', 'device.push_revoked', registered_id::text), 2
    );
    raise exception 'Another identity revoked a push registration.';
  exception when insufficient_privilege then
    if sqlerrm not like '%DEVICE_PUSH_ACCESS_DENIED%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_revoke_device_push(
      owner_id, 'ca', registered_id, 99,
      pg_temp.push_token('stale-revoke', 'device.push_revoked', registered_id::text), 2
    );
    raise exception 'Stale push registration version was accepted.';
  exception when serialization_failure then
    if sqlerrm not like '%CONCURRENCY_CONFLICT%' then raise; end if;
  end;

  result := public.peacepad_v2_revoke_device_push(
    owner_id, 'ca', registered_id, (result ->> 'version')::integer,
    pg_temp.push_token('revoke-1', 'device.push_revoked', registered_id::text), 2
  );
  if result ->> 'status' <> 'revoked'
     or exists (
       select 1 from peacepad_v2.device_push_registration
       where device_push_registration.registration_id = registered_id
     ) then
    raise exception 'Exact push revocation did not delete operational token material.';
  end if;

  result := public.peacepad_v2_register_device_push(
    owner_id, 'ca', installation_id, 'ios', 'expo', 'ca.peacepad.family',
    provider_token, secret,
    pg_temp.push_token('register-delete', 'device.push_registered', 'account-delete'), 2
  );
  perform public.peacepad_v2_delete_account(
    owner_id, 'ca', 1,
    pg_temp.push_token('delete-account', 'account.deleted', owner_id::text), 2
  );
  if exists (select 1 from peacepad_v2.device_push_registration where identity_id = owner_id) then
    raise exception 'Account deletion retained a device push token.';
  end if;
end;
$$;

rollback;

select 'DEVICE_PUSH_REGISTRATION_POSTGRES_VERIFIED' as verification_status;
