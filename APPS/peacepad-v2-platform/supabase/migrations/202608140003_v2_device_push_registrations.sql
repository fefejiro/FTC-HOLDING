-- Protected device push registrations for customer notifications and the
-- phase-one incoming-call path. Tokens are encrypted at rest and never enter
-- audit events, idempotency receipts, or application-visible responses.

create table if not exists peacepad_v2.device_push_registration (
  registration_id uuid primary key,
  identity_id uuid not null references peacepad_v2.identity(identity_id) on delete cascade,
  region text not null check (region in ('ca', 'us')),
  installation_id uuid not null,
  platform text not null check (platform in ('ios', 'android')),
  transport text not null check (transport in ('expo', 'apns-voip')),
  app_id text not null check (app_id in ('ca.peacepad.family', 'ca.peacepad.nextnative.lab')),
  token_digest bytea not null check (octet_length(token_digest) = 32),
  encrypted_token bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (region, token_digest),
  unique (identity_id, installation_id, transport)
);

create index if not exists device_push_identity_active_idx
  on peacepad_v2.device_push_registration (identity_id, installation_id)
  where revoked_at is null;

alter table peacepad_v2.device_push_registration enable row level security;
revoke all on table peacepad_v2.device_push_registration from public, anon, authenticated;

create or replace function public.peacepad_v2_register_device_push(
  p_identity_id uuid,
  p_region text,
  p_installation_id uuid,
  p_platform text,
  p_transport text,
  p_app_id text,
  p_token text,
  p_token_secret text,
  p_idempotency_key text,
  p_schema_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2, extensions
as $$
declare
  account peacepad_v2.identity%rowtype;
  token_fingerprint bytea;
  registration peacepad_v2.device_push_registration%rowtype;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_identity_id is null or p_installation_id is null then
    raise exception using errcode = '22023', message = 'DEVICE_PUSH_INVALID';
  end if;
  if p_region is null or p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'REGION_INVALID';
  end if;
  if p_platform not in ('ios', 'android') or p_transport not in ('expo', 'apns-voip') then
    raise exception using errcode = '22023', message = 'DEVICE_PUSH_INVALID';
  end if;
  if p_transport = 'apns-voip' and p_platform <> 'ios' then
    raise exception using errcode = '22023', message = 'DEVICE_PUSH_INVALID';
  end if;
  if p_app_id not in ('ca.peacepad.family', 'ca.peacepad.nextnative.lab') then
    raise exception using errcode = '22023', message = 'DEVICE_PUSH_INVALID';
  end if;
  if p_token is null or char_length(p_token) not between 32 and 4096 then
    raise exception using errcode = '22023', message = 'DEVICE_PUSH_INVALID';
  end if;
  if p_token_secret is null or char_length(p_token_secret) < 32 then
    raise exception using errcode = '22023', message = 'DEVICE_PUSH_CONFIGURATION_INVALID';
  end if;
  if p_schema_version is distinct from 2 then
    raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 160 then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID';
  end if;

  select * into account
  from peacepad_v2.identity
  where identity_id = p_identity_id
  for update;
  if not found then raise exception using errcode = '42501', message = 'IDENTITY_NOT_BOUND'; end if;
  if account.deleted_at is not null then raise exception using errcode = '42501', message = 'IDENTITY_DELETED'; end if;
  if account.region <> p_region then raise exception using errcode = '42501', message = 'REGION_MISMATCH'; end if;

  token_fingerprint := extensions.hmac(
    pg_catalog.convert_to(p_token, 'UTF8'),
    pg_catalog.convert_to(p_token_secret, 'UTF8'),
    'sha256'
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_region || ':' || pg_catalog.encode(token_fingerprint, 'hex'), 0)
  );

  -- A provider token identifies one current app installation. If the OS
  -- rotates or reassigns it, the newly authenticated owner replaces the old
  -- operational registration without retaining a token history.
  delete from peacepad_v2.device_push_registration old_registration
  where old_registration.identity_id = p_identity_id
    and old_registration.installation_id = p_installation_id
    and old_registration.transport = p_transport
    and old_registration.token_digest <> token_fingerprint;

  insert into peacepad_v2.device_push_registration (
    registration_id, identity_id, region, installation_id, platform,
    transport, app_id, token_digest, encrypted_token
  ) values (
    gen_random_uuid(), p_identity_id, p_region, p_installation_id, p_platform,
    p_transport, p_app_id, token_fingerprint,
    extensions.pgp_sym_encrypt(
      p_token,
      p_token_secret,
      'cipher-algo=aes256,compress-algo=1'
    )
  )
  on conflict (region, token_digest) do update
  set identity_id = excluded.identity_id,
      installation_id = excluded.installation_id,
      platform = excluded.platform,
      transport = excluded.transport,
      app_id = excluded.app_id,
      encrypted_token = excluded.encrypted_token,
      updated_at = now(),
      revoked_at = null,
      version = peacepad_v2.device_push_registration.version + 1
  returning * into registration;

  response := jsonb_build_object(
    'registrationId', registration.registration_id,
    'platform', registration.platform,
    'transport', registration.transport,
    'appId', registration.app_id,
    'version', registration.version
  );
  perform peacepad_v2.record_write(
    p_identity_id, null, p_region, 'device.push_registered',
    p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

create or replace function public.peacepad_v2_revoke_device_push(
  p_identity_id uuid,
  p_region text,
  p_registration_id uuid,
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
  registration peacepad_v2.device_push_registration%rowtype;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_identity_id is null or p_registration_id is null or p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'DEVICE_PUSH_INVALID';
  end if;
  if p_region is null or p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'REGION_INVALID';
  end if;
  if p_schema_version is distinct from 2 then
    raise exception using errcode = '22023', message = 'SCHEMA_MISMATCH';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 160 then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID';
  end if;

  select * into registration
  from peacepad_v2.device_push_registration
  where registration_id = p_registration_id
  for update;
  if not found or registration.identity_id <> p_identity_id or registration.region <> p_region then
    raise exception using errcode = '42501', message = 'DEVICE_PUSH_ACCESS_DENIED';
  end if;
  if registration.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'CONCURRENCY_CONFLICT';
  end if;

  delete from peacepad_v2.device_push_registration
  where registration_id = p_registration_id;

  response := jsonb_build_object(
    'registrationId', p_registration_id,
    'status', 'revoked',
    'version', registration.version + 1
  );
  perform peacepad_v2.record_write(
    p_identity_id, null, p_region, 'device.push_revoked',
    p_schema_version, p_idempotency_key, response
  );
  return response;
end;
$$;

create or replace function peacepad_v2.remove_deleted_identity_push_registrations()
returns trigger
language plpgsql
set search_path = pg_catalog, peacepad_v2
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    delete from peacepad_v2.device_push_registration where identity_id = new.identity_id;
  end if;
  return new;
end;
$$;

drop trigger if exists identity_remove_push_registrations on peacepad_v2.identity;
create trigger identity_remove_push_registrations
after update of deleted_at on peacepad_v2.identity
for each row execute function peacepad_v2.remove_deleted_identity_push_registrations();

revoke all on function public.peacepad_v2_register_device_push(uuid, text, uuid, text, text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_register_device_push(uuid, text, uuid, text, text, text, text, text, text, integer) to service_role;
revoke all on function public.peacepad_v2_revoke_device_push(uuid, text, uuid, integer, text, integer) from public, anon, authenticated;
grant execute on function public.peacepad_v2_revoke_device_push(uuid, text, uuid, integer, text, integer) to service_role;

comment on table peacepad_v2.device_push_registration is
  'Service-role-only encrypted device push registrations. Plaintext tokens are never audited or returned.';
