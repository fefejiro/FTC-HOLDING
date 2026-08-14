\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.family_exit_token(
  p_client_key text,
  p_request_marker text
)
returns text
language sql
immutable
strict
as $$
  select 'v2:'
    || substr(encode(extensions.digest('family-exit-client:' || p_client_key, 'sha256'), 'hex'), 1, 48)
    || ':family.left:'
    || substr(encode(extensions.digest('family-exit-request:' || p_request_marker, 'sha256'), 'hex'), 1, 48)
$$;

do $$
declare
  leaving_id constant uuid := 'f1000000-0000-4000-8000-000000000001';
  remaining_id constant uuid := 'f1000000-0000-4000-8000-000000000002';
  outsider_id constant uuid := 'f1000000-0000-4000-8000-000000000003';
  fixture_family_id constant uuid := 'f2000000-0000-4000-8000-000000000001';
  leaving_grant_id constant uuid := 'f3000000-0000-4000-8000-000000000001';
  remaining_grant_id constant uuid := 'f3000000-0000-4000-8000-000000000002';
  fixture_invitation_id constant uuid := 'f4000000-0000-4000-8000-000000000001';
  original_code bytea := extensions.digest('CALM26', 'sha256');
  result jsonb;
  replay jsonb;
  audit_count integer;
begin
  insert into auth.users (id) values (leaving_id), (remaining_id), (outsider_id) on conflict do nothing;
  insert into peacepad_v2.identity (identity_id, region, display_name) values
    (leaving_id, 'ca', 'Leaving Parent'),
    (remaining_id, 'ca', 'Remaining Parent'),
    (outsider_id, 'ca', 'Outside Parent');
  insert into peacepad_v2.family_circle (family_id, region, family_name, created_by)
  values (fixture_family_id, 'ca', 'Family Exit Fixture', leaving_id);
  insert into peacepad_v2.participant_grant (
    participant_grant_id, family_id, identity_id, region, role, permissions, granted_by
  ) values
    (leaving_grant_id, fixture_family_id, leaving_id, 'ca', 'parent', array['messages','calendar','calls'], leaving_id),
    (remaining_grant_id, fixture_family_id, remaining_id, 'ca', 'parent', array['messages','calendar','calls'], leaving_id);
  insert into peacepad_v2.family_invitation (
    invitation_id, family_id, region, created_by, code_hash, invited_role, permissions, expires_at
  ) values (fixture_invitation_id, fixture_family_id, 'ca', leaving_id, original_code, 'parent', array['messages'], now() + interval '1 day');

  if has_function_privilege(
    'authenticated',
    'public.peacepad_v2_leave_family(uuid,text,uuid,integer,text,integer)',
    'execute'
  ) then
    raise exception 'Direct authenticated-role family exit was not denied.';
  end if;

  begin
    perform public.peacepad_v2_leave_family(
      outsider_id, 'ca', fixture_family_id, 1,
      pg_temp.family_exit_token('outsider', fixture_family_id::text), 2
    );
    raise exception 'An outsider left another family.';
  exception when insufficient_privilege then
    if sqlerrm not like '%FAMILY_ACCESS_DENIED%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_leave_family(
      leaving_id, 'us', fixture_family_id, 1,
      pg_temp.family_exit_token('region', fixture_family_id::text), 2
    );
    raise exception 'A cross-region family exit was accepted.';
  exception when insufficient_privilege then
    if sqlerrm not like '%REGION_MISMATCH%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_leave_family(
      leaving_id, 'ca', fixture_family_id, 99,
      pg_temp.family_exit_token('stale', fixture_family_id::text), 2
    );
    raise exception 'A stale family-grant version was accepted.';
  exception when serialization_failure then
    if sqlerrm not like '%CONCURRENCY_CONFLICT%' then raise; end if;
  end;

  select count(*) into audit_count from peacepad_v2.audit_event;
  result := public.peacepad_v2_leave_family(
    leaving_id, 'ca', fixture_family_id, 1,
    pg_temp.family_exit_token('leave', fixture_family_id::text), 2
  );
  replay := public.peacepad_v2_leave_family(
    leaving_id, 'ca', fixture_family_id, 1,
    pg_temp.family_exit_token('leave', fixture_family_id::text), 2
  );
  if result <> replay or result ->> 'status' <> 'left'
     or result ->> 'familyCircleId' <> fixture_family_id::text
     or result ->> 'participantGrantId' <> leaving_grant_id::text then
    raise exception 'Family exit receipt or replay was invalid: %', result;
  end if;
  if not exists (
    select 1 from peacepad_v2.participant_grant
    where participant_grant_id = leaving_grant_id and revoked_at is not null and version = 2
  ) then
    raise exception 'The departing grant remained active.';
  end if;
  if not exists (
    select 1 from peacepad_v2.participant_grant
    where participant_grant_id = remaining_grant_id and revoked_at is null
  ) or exists (
    select 1 from peacepad_v2.family_circle fc where fc.family_id = 'f2000000-0000-4000-8000-000000000001'::uuid and fc.deleted_at is not null
  ) then
    raise exception 'Family exit removed the remaining member or shared family history.';
  end if;
  if exists (
    select 1 from peacepad_v2.family_invitation
    where family_invitation.invitation_id = fixture_invitation_id
      and (status <> 'revoked' or code_hash = original_code)
  ) then
    raise exception 'A departing member retained a usable pending invitation.';
  end if;
  if (select count(*) from peacepad_v2.audit_event) <> audit_count + 1
     or not exists (
       select 1 from peacepad_v2.audit_event
       where identity_id = leaving_id
         and family_id = 'f2000000-0000-4000-8000-000000000001'::uuid
         and event_type = 'family.left'
     ) then
    raise exception 'Family exit did not write one content-free audit event.';
  end if;
end;
$$;

rollback;

select 'FAMILY_EXIT_POSTGRES_VERIFIED' as verification_status;
