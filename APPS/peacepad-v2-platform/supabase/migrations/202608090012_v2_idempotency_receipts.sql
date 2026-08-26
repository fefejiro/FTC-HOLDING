-- Separate request replay from the append-only audit ledger.
--
-- The Edge adapter replaces every client idempotency key with an opaque,
-- HMAC-derived token before invoking a write RPC. The token binds the key to
-- one authenticated identity, operation, region, schema version, expected
-- version, path, and canonical request body. PostgreSQL serializes matching
-- writes with an advisory transaction lock and rejects any changed request.
--
-- Replay responses are encrypted with the opaque token and expire after 24
-- hours. The token is never stored. The audit ledger retains only content-free
-- event metadata and the opaque client-key digest.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  has_sensitive_results boolean := false;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'peacepad_v2'
      and table_name = 'audit_event'
      and column_name = 'result'
  ) then
    execute 'select exists (select 1 from peacepad_v2.audit_event where result is not null)'
      into has_sensitive_results;
  end if;

  if has_sensitive_results then
    raise exception using
      errcode = 'P0001',
      message = 'STAGING_AUDIT_RESET_REQUIRED';
  end if;
end;
$$;

create table if not exists peacepad_v2.write_receipt (
  identity_id uuid not null references peacepad_v2.identity(identity_id) on delete restrict,
  client_key_hash text not null check (client_key_hash ~ '^[0-9a-f]{48}$'),
  operation text not null check (operation ~ '^[a-z0-9_.]{1,40}$'),
  request_fingerprint text not null check (request_fingerprint ~ '^[0-9a-f]{48}$'),
  encrypted_response bytea,
  created_at timestamptz not null default now(),
  response_expires_at timestamptz not null default (now() + interval '24 hours'),
  primary key (identity_id, client_key_hash)
);

alter table peacepad_v2.write_receipt enable row level security;
revoke all on table peacepad_v2.write_receipt from public, anon, authenticated;

create index if not exists write_receipt_expiry_idx
  on peacepad_v2.write_receipt (response_expires_at)
  where encrypted_response is not null;

create or replace function peacepad_v2.parse_write_token(p_token text)
returns table(client_key_hash text, operation text, request_fingerprint text)
language plpgsql
immutable
strict
set search_path = pg_catalog, peacepad_v2
as $$
declare
  token_parts text[];
begin
  token_parts := pg_catalog.string_to_array(p_token, ':');
  if pg_catalog.array_length(token_parts, 1) <> 4
     or token_parts[1] <> 'v2'
     or token_parts[2] !~ '^[0-9a-f]{48}$'
     or token_parts[3] !~ '^[a-z0-9_.]{1,40}$'
     or token_parts[4] !~ '^[0-9a-f]{48}$' then
    raise exception using errcode = '22023', message = 'IDEMPOTENCY_KEY_INVALID';
  end if;

  client_key_hash := token_parts[2];
  operation := token_parts[3];
  request_fingerprint := token_parts[4];
  return next;
end;
$$;

create or replace function peacepad_v2.prior_write_result(
  p_identity_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
set search_path = pg_catalog, peacepad_v2, extensions
as $$
declare
  token_record record;
  receipt peacepad_v2.write_receipt%rowtype;
begin
  select * into token_record from peacepad_v2.parse_write_token(p_idempotency_key);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_identity_id::text || ':' || token_record.client_key_hash, 0)
  );

  select * into receipt
  from peacepad_v2.write_receipt
  where identity_id = p_identity_id
    and client_key_hash = token_record.client_key_hash;

  if not found then return null; end if;
  if receipt.operation <> token_record.operation
     or receipt.request_fingerprint <> token_record.request_fingerprint
     or receipt.encrypted_response is null
     or receipt.response_expires_at <= now() then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
  end if;

  return extensions.pgp_sym_decrypt(
    receipt.encrypted_response,
    p_idempotency_key
  )::jsonb;
exception
  when external_routine_invocation_exception or data_exception then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
end;
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
set search_path = pg_catalog, peacepad_v2, extensions
as $$
declare
  token_record record;
begin
  select * into token_record from peacepad_v2.parse_write_token(p_idempotency_key);
  if token_record.operation <> p_event_type then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_identity_id::text || ':' || token_record.client_key_hash, 0)
  );

  insert into peacepad_v2.write_receipt (
    identity_id, client_key_hash, operation, request_fingerprint,
    encrypted_response, response_expires_at
  ) values (
    p_identity_id,
    token_record.client_key_hash,
    token_record.operation,
    token_record.request_fingerprint,
    extensions.pgp_sym_encrypt(
      p_result::text,
      p_idempotency_key,
      'cipher-algo=aes256,compress-algo=1'
    ),
    now() + interval '24 hours'
  );

  insert into peacepad_v2.audit_event (
    audit_event_id, identity_id, family_id, region, event_type,
    schema_version, idempotency_key
  ) values (
    gen_random_uuid(), p_identity_id, p_family_id, p_region, p_event_type,
    p_schema_version, token_record.client_key_hash
  );
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
end;
$$;

alter table peacepad_v2.audit_event drop column if exists result;

-- Migration 202608090006 originally performed its own replay lookup against
-- audit_event.result. Replace it after removing that column so every write
-- uses the same request-bound receipt contract.
create or replace function public.peacepad_v2_set_message_check(
  p_identity_id uuid,
  p_region text,
  p_conversation_id uuid,
  p_enabled boolean,
  p_ai_assistance_enabled boolean,
  p_expected_version integer,
  p_idempotency_key text,
  p_schema_version integer
) returns jsonb language plpgsql security definer set search_path=pg_catalog,peacepad_v2 as $$
declare
  conversation_row peacepad_v2.conversation%rowtype;
  preference_row peacepad_v2.message_check_preference%rowtype;
  existing_result jsonb;
  response jsonb;
begin
  existing_result := peacepad_v2.prior_write_result(p_identity_id, p_idempotency_key);
  if existing_result is not null then return existing_result; end if;
  if p_schema_version is distinct from 2 then raise exception using errcode='22023',message='SCHEMA_MISMATCH'; end if;
  if p_region is null or p_region not in ('ca','us') then raise exception using errcode='22023',message='REGION_INVALID'; end if;
  if p_enabled is null then raise exception using errcode='22023',message='MESSAGE_CHECK_INVALID'; end if;
  if p_ai_assistance_enabled is distinct from false then raise exception using errcode='42501',message='AI_CONSENT_REQUIRED'; end if;
  if p_expected_version is null or p_expected_version<0 then raise exception using errcode='22023',message='EXPECTED_VERSION_INVALID'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 8 and 160 then
    raise exception using errcode='22023',message='IDEMPOTENCY_KEY_INVALID';
  end if;
  conversation_row:=peacepad_v2.authorized_conversation(p_identity_id,p_region,p_conversation_id);
  perform pg_advisory_xact_lock(hashtextextended(p_identity_id::text || ':' || p_conversation_id::text,0));
  select * into preference_row from peacepad_v2.message_check_preference
    where identity_id=p_identity_id and conversation_id=p_conversation_id and region=p_region for update;
  if not found then
    if p_expected_version<>0 then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
    insert into peacepad_v2.message_check_preference(
      message_check_preference_id,identity_id,conversation_id,region,enabled,ai_assistance_enabled
    ) values(gen_random_uuid(),p_identity_id,p_conversation_id,p_region,p_enabled,false)
    returning * into preference_row;
  else
    if preference_row.version<>p_expected_version then raise exception using errcode='40001',message='CONCURRENCY_CONFLICT'; end if;
    update peacepad_v2.message_check_preference set enabled=p_enabled,ai_assistance_enabled=false,
      updated_at=now(),version=version+1
    where message_check_preference_id=preference_row.message_check_preference_id returning * into preference_row;
  end if;
  response:=peacepad_v2.message_check_json(
    preference_row.identity_id,preference_row.conversation_id,preference_row.region,
    preference_row.message_check_preference_id::text,preference_row.enabled,
    preference_row.created_at,preference_row.version
  );
  perform peacepad_v2.record_write(p_identity_id,conversation_row.family_id,p_region,'message_check.updated',p_schema_version,p_idempotency_key,response);
  return response;
end;
$$;

create or replace function public.peacepad_v2_expire_write_receipts(p_region text)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, peacepad_v2
as $$
declare
  affected integer;
begin
  if p_region not in ('ca', 'us') then
    raise exception using errcode = '22023', message = 'REGION_INVALID';
  end if;

  update peacepad_v2.write_receipt receipt
  set encrypted_response = null
  from peacepad_v2.identity identity
  where receipt.identity_id = identity.identity_id
    and identity.region = p_region
    and receipt.encrypted_response is not null
    and receipt.response_expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function peacepad_v2.parse_write_token(text) from public, anon, authenticated;
revoke all on function peacepad_v2.prior_write_result(uuid, text) from public, anon, authenticated;
revoke all on function peacepad_v2.record_write(uuid, uuid, text, text, integer, text, jsonb) from public, anon, authenticated;
revoke all on function public.peacepad_v2_expire_write_receipts(text) from public, anon, authenticated;
grant execute on function public.peacepad_v2_expire_write_receipts(text) to service_role;

comment on table peacepad_v2.write_receipt is
  'Short-lived encrypted idempotency replay receipts. No raw key, token, request body, or plaintext response is stored.';
comment on column peacepad_v2.write_receipt.encrypted_response is
  'AES-256 OpenPGP ciphertext. The HMAC-derived decryption token is not persisted and the ciphertext is cleared after 24 hours.';
