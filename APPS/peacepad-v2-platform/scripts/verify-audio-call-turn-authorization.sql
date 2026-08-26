\set ON_ERROR_STOP on

begin;

do $$
declare
  caller constant uuid := '60000000-0000-4000-8000-000000000001';
  callee constant uuid := '60000000-0000-4000-8000-000000000002';
  outsider constant uuid := '60000000-0000-4000-8000-000000000003';
  family constant uuid := '61000000-0000-4000-8000-000000000001';
  conversation constant uuid := '62000000-0000-4000-8000-000000000001';
  active_call constant uuid := '63000000-0000-4000-8000-000000000001';
  result jsonb;
  initial_audit_count integer;
begin
  insert into auth.users (id) values (caller), (callee), (outsider) on conflict do nothing;
  insert into peacepad_v2.identity (identity_id, region, display_name)
  values
    (caller, 'ca', 'TURN Fixture One'),
    (callee, 'ca', 'TURN Fixture Two'),
    (outsider, 'ca', 'TURN Fixture Three');
  insert into peacepad_v2.family_circle (family_id, region, family_name, created_by)
  values (family, 'ca', 'TURN Fixture Family', caller);
  insert into peacepad_v2.participant_grant (
    participant_grant_id, family_id, identity_id, region, role, permissions, granted_by
  ) values
    ('64000000-0000-4000-8000-000000000001', family, caller, 'ca', 'parent', array['calls'], caller),
    ('64000000-0000-4000-8000-000000000002', family, callee, 'ca', 'parent', array['calls'], caller),
    ('64000000-0000-4000-8000-000000000003', family, outsider, 'ca', 'professional', array['calls'], caller);
  insert into peacepad_v2.conversation (
    conversation_id, family_id, region, participant_identity_ids, created_by
  ) values (conversation, family, 'ca', array[caller, callee], caller);
  insert into peacepad_v2.audio_call_session (
    call_id, family_id, conversation_id, region, caller_identity_id,
    callee_identity_id, status, accepted_at, version
  ) values (
    active_call, family, conversation, 'ca', caller, callee, 'active', now(), 2
  );

  select count(*) into initial_audit_count from peacepad_v2.audit_event;
  result := public.peacepad_v2_authorize_audio_call_turn(caller, 'ca', active_call, 2, 2);
  if result <> jsonb_build_object('callId', active_call, 'version', 2, 'region', 'ca') then
    raise exception 'TURN authorization returned more than exact content-free call metadata: %', result;
  end if;
  if (select count(*) from peacepad_v2.audit_event) <> initial_audit_count then
    raise exception 'TURN authorization unexpectedly wrote audit content.';
  end if;

  begin
    perform public.peacepad_v2_authorize_audio_call_turn(outsider, 'ca', active_call, 2, 2);
    raise exception 'Non-participant TURN authorization unexpectedly succeeded.';
  exception when insufficient_privilege then
    if sqlerrm not like '%CALL_ACCESS_DENIED%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_authorize_audio_call_turn(caller, 'us', active_call, 2, 2);
    raise exception 'Cross-region TURN authorization unexpectedly succeeded.';
  exception when insufficient_privilege then
    if sqlerrm not like '%CALL_ACCESS_DENIED%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_authorize_audio_call_turn(caller, 'ca', active_call, 1, 2);
    raise exception 'Stale call version unexpectedly authorized TURN.';
  exception when serialization_failure then
    if sqlerrm not like '%CONCURRENCY_CONFLICT%' then raise; end if;
  end;

  update peacepad_v2.participant_grant
  set revoked_at = now()
  where identity_id = callee and family_id = family;
  begin
    perform public.peacepad_v2_authorize_audio_call_turn(caller, 'ca', active_call, 2, 2);
    raise exception 'Revoked peer grant unexpectedly authorized TURN.';
  exception when raise_exception then
    if sqlerrm not like '%CALL_STATE_INVALID%' then raise; end if;
  end;
  update peacepad_v2.participant_grant set revoked_at = null where identity_id = callee and family_id = family;

  update peacepad_v2.audio_call_session
  set status = 'ended', ended_at = now(), ended_by_identity_id = caller,
      end_reason = 'participant_ended', version = 3
  where call_id = active_call;
  begin
    perform public.peacepad_v2_authorize_audio_call_turn(caller, 'ca', active_call, 3, 2);
    raise exception 'Ended call unexpectedly authorized TURN.';
  exception when raise_exception then
    if sqlerrm not like '%CALL_STATE_INVALID%' then raise; end if;
  end;
end;
$$;

set local role authenticated;
do $$
begin
  begin
    perform public.peacepad_v2_authorize_audio_call_turn(
      '60000000-0000-4000-8000-000000000001', 'ca',
      '63000000-0000-4000-8000-000000000001', 2, 2
    );
    raise exception 'Authenticated role unexpectedly executed TURN authorization.';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

rollback;

select 'AUDIO_CALL_TURN_AUTHORIZATION_POSTGRES_VERIFIED' as verification;
