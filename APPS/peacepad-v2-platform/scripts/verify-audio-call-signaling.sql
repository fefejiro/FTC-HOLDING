\set ON_ERROR_STOP on

begin;

do $$
declare
  caller constant uuid := '50000000-0000-0000-0000-000000000001';
  callee constant uuid := '50000000-0000-0000-0000-000000000002';
  outsider constant uuid := '50000000-0000-0000-0000-000000000003';
  family constant uuid := '51000000-0000-0000-0000-000000000001';
  conversation constant uuid := '52000000-0000-0000-0000-000000000001';
  active_call constant uuid := '53000000-0000-4000-8000-000000000001';
  result jsonb;
  topic text;
  initial_audit_count integer;
  visible_count integer;
begin
  insert into auth.users (id) values (caller), (callee), (outsider) on conflict do nothing;
  insert into peacepad_v2.identity (identity_id, region, display_name)
  values
    (caller, 'ca', 'Signal Fixture One'),
    (callee, 'ca', 'Signal Fixture Two'),
    (outsider, 'ca', 'Signal Fixture Three');
  insert into peacepad_v2.family_circle (family_id, region, family_name, created_by)
  values (family, 'ca', 'Signal Fixture Family', caller);
  insert into peacepad_v2.participant_grant (
    participant_grant_id, family_id, identity_id, region, role, permissions, granted_by
  ) values
    ('54000000-0000-0000-0000-000000000001', family, caller, 'ca', 'parent', array['calls'], caller),
    ('54000000-0000-0000-0000-000000000002', family, callee, 'ca', 'parent', array['calls'], caller),
    ('54000000-0000-0000-0000-000000000003', family, outsider, 'ca', 'professional', array['calls'], caller);
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
  result := public.peacepad_v2_authorize_audio_call_signal(caller, 'ca', active_call, 2, 2);
  topic := result ->> 'topic';
  if result ->> 'peerIdentityId' <> callee::text
     or topic <> 'peacepad:call:' || active_call::text || ':v2'
     or result ->> 'region' <> 'ca'
     or (result ->> 'version')::integer <> 2
     or (result ->> 'expiresAt')::timestamptz <= now()
     or (result ->> 'expiresAt')::timestamptz > now() + interval '16 seconds' then
    raise exception 'Signal authorization did not derive its peer, topic, version, region, and TTL.';
  end if;

  begin
    perform public.peacepad_v2_authorize_audio_call_signal(outsider, 'ca', active_call, 2, 2);
    raise exception 'Non-participant signal authorization unexpectedly succeeded.';
  exception when insufficient_privilege then
    if sqlerrm not like '%CALL_ACCESS_DENIED%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_authorize_audio_call_signal(caller, 'us', active_call, 2, 2);
    raise exception 'Cross-region signal authorization unexpectedly succeeded.';
  exception when insufficient_privilege then
    if sqlerrm not like '%CALL_ACCESS_DENIED%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_authorize_audio_call_signal(caller, 'ca', active_call, 1, 2);
    raise exception 'Stale call version unexpectedly authorized signaling.';
  exception when serialization_failure then
    if sqlerrm not like '%CONCURRENCY_CONFLICT%' then raise; end if;
  end;

  if not peacepad_v2.can_subscribe_audio_call_topic(caller, topic, 'broadcast')
     or not peacepad_v2.can_subscribe_audio_call_topic(callee, topic, 'broadcast')
     or peacepad_v2.can_subscribe_audio_call_topic(outsider, topic, 'broadcast')
     or peacepad_v2.can_subscribe_audio_call_topic(caller, topic, 'presence')
     or peacepad_v2.can_subscribe_audio_call_topic(caller, 'peacepad:call:invalid', 'broadcast') then
    raise exception 'Private topic authorization did not enforce participant, extension, or topic boundaries.';
  end if;

  insert into realtime.messages(extension) values ('broadcast');
  perform set_config('request.jwt.claim.sub', caller::text, true);
  perform set_config('realtime.topic', topic, true);
  execute 'set local role authenticated';
  select count(*) into visible_count from realtime.messages;
  if visible_count <> 1 then
    raise exception 'Authenticated participant could not read the exact private topic.';
  end if;
  begin
    insert into realtime.messages(extension) values ('broadcast');
    raise exception 'Authenticated client unexpectedly inserted a call broadcast.';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  for visible_count in 2..30 loop
    perform public.peacepad_v2_authorize_audio_call_signal(caller, 'ca', active_call, 2, 2);
  end loop;
  begin
    perform public.peacepad_v2_authorize_audio_call_signal(caller, 'ca', active_call, 2, 2);
    raise exception 'Signal rate limit unexpectedly allowed request 31 in ten seconds.';
  exception when others then
    if sqlerrm not like '%SIGNAL_RATE_LIMITED%' then raise; end if;
  end;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'peacepad_v2'
      and table_name = 'audio_call_signal_window'
      and column_name in ('payload', 'sdp', 'candidate', 'ice', 'sender_identity_id', 'target_identity_id')
  ) or (select count(*) from peacepad_v2.audit_event) <> initial_audit_count then
    raise exception 'Signal payload or audit content entered PostgreSQL.';
  end if;

  update peacepad_v2.participant_grant
  set revoked_at = now(), version = version + 1
  where family_id = family and identity_id = callee;
  if peacepad_v2.can_subscribe_audio_call_topic(caller, topic, 'broadcast')
     or peacepad_v2.can_subscribe_audio_call_topic(callee, topic, 'broadcast')
     or exists (select 1 from peacepad_v2.audio_call_signal_window where call_id = active_call) then
    raise exception 'Revocation retained private subscription authorization or rate metadata.';
  end if;
  begin
    perform public.peacepad_v2_authorize_audio_call_signal(caller, 'ca', active_call, 2, 2);
    raise exception 'Revoked call unexpectedly authorized another server-relayed signal.';
  exception when others then
    if sqlerrm not like '%CALL_STATE_INVALID%' then raise; end if;
  end;
end;
$$;

rollback;

\echo AUDIO_CALL_SIGNALING_POSTGRES_VERIFIED
