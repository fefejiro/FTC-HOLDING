\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.profile_token(p_client_key text, p_request_marker text)
returns text language sql immutable strict as $$
  select 'v2:'
    || substr(encode(extensions.digest('profile-client:' || p_client_key, 'sha256'), 'hex'), 1, 48)
    || ':profile.updated:'
    || substr(encode(extensions.digest('profile-request:' || p_request_marker, 'sha256'), 'hex'), 1, 48)
$$;

do $$
declare
  account_id constant uuid := 'e1000000-0000-4000-8000-000000000001';
  result jsonb;
  replay jsonb;
  audit_count integer;
begin
  insert into auth.users (id) values (account_id) on conflict do nothing;
  insert into peacepad_v2.identity (identity_id, region, display_name)
  values (account_id, 'ca', 'Original Parent');

  if has_function_privilege(
    'authenticated',
    'public.peacepad_v2_update_profile(uuid,text,text,integer,text,integer)',
    'execute'
  ) then
    raise exception 'Direct authenticated-role profile update was not denied.';
  end if;

  begin
    perform public.peacepad_v2_update_profile(
      account_id, 'us', 'Cross Region', 1,
      pg_temp.profile_token('region', 'cross-region'), 2
    );
    raise exception 'A cross-region profile update was accepted.';
  exception when insufficient_privilege then
    if sqlerrm not like '%REGION_MISMATCH%' then raise; end if;
  end;

  begin
    perform public.peacepad_v2_update_profile(
      account_id, 'ca', 'Stale Update', 9,
      pg_temp.profile_token('stale', 'stale-version'), 2
    );
    raise exception 'A stale profile update was accepted.';
  exception when serialization_failure then
    if sqlerrm not like '%CONCURRENCY_CONFLICT%' then raise; end if;
  end;

  begin
    perform public.peacepad_v2_update_profile(
      account_id, 'ca', E'Unsafe\nName', 1,
      pg_temp.profile_token('invalid', 'control-character'), 2
    );
    raise exception 'A control-character display name was accepted.';
  exception when invalid_parameter_value then
    if sqlerrm not like '%DISPLAY_NAME_INVALID%' then raise; end if;
  end;

  result := public.peacepad_v2_update_profile(
    account_id, 'ca', '  Calm Parent  ', 1,
    pg_temp.profile_token('success', 'Calm Parent'), 2
  );
  if result ->> 'identityId' <> account_id::text
     or result ->> 'displayName' <> 'Calm Parent'
     or result ->> 'region' <> 'ca'
     or (result ->> 'version')::integer <> 2 then
    raise exception 'Profile update receipt was invalid: %', result;
  end if;

  replay := public.peacepad_v2_update_profile(
    account_id, 'ca', 'Calm Parent', 1,
    pg_temp.profile_token('success', 'Calm Parent'), 2
  );
  if replay <> result then raise exception 'Profile update replay changed.'; end if;

  if not exists (
    select 1 from peacepad_v2.identity
    where identity_id = account_id and display_name = 'Calm Parent' and version = 2
  ) then raise exception 'Profile update was not persisted exactly once.'; end if;

  select count(*) into audit_count from peacepad_v2.audit_event
  where identity_id = account_id and event_type = 'profile.updated';
  if audit_count <> 1 then raise exception 'Profile audit count was %, expected 1.', audit_count; end if;
  if exists (
    select 1 from peacepad_v2.audit_event
    where identity_id = account_id and event_type = 'profile.updated'
      and to_jsonb(audit_event)::text like '%Calm Parent%'
  ) then raise exception 'Display name entered profile audit content.'; end if;
end;
$$;

rollback;

select 'PROFILE_UPDATE_POSTGRES_VERIFIED' as result;
