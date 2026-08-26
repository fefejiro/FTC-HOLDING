\set ON_ERROR_STOP on

begin;

create or replace function pg_temp.call_token(
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
    || substr(encode(extensions.digest('call-client:' || p_client_key, 'sha256'), 'hex'), 1, 48)
    || ':' || p_operation || ':'
    || substr(encode(extensions.digest('call-request:' || p_operation || ':' || p_request_marker, 'sha256'), 'hex'), 1, 48)
$$;

do $$
declare
  caller constant uuid := '40000000-0000-0000-0000-000000000001';
  callee constant uuid := '40000000-0000-0000-0000-000000000002';
  outsider constant uuid := '40000000-0000-0000-0000-000000000003';
  family constant uuid := '41000000-0000-0000-0000-000000000001';
  conversation constant uuid := '42000000-0000-0000-0000-000000000001';
  group_conversation constant uuid := '42000000-0000-0000-0000-000000000002';
  result jsonb;
  replay jsonb;
  created_call_id uuid;
  expired_count integer;
  expired_status text;
begin
  insert into auth.users (id) values (caller), (callee), (outsider) on conflict do nothing;
  insert into peacepad_v2.identity (identity_id, region, display_name)
  values
    (caller, 'ca', 'Call Fixture One'),
    (callee, 'ca', 'Call Fixture Two'),
    (outsider, 'ca', 'Call Fixture Three');
  insert into peacepad_v2.family_circle (family_id, region, family_name, created_by)
  values (family, 'ca', 'Call Fixture Family', caller);
  insert into peacepad_v2.participant_grant (
    participant_grant_id, family_id, identity_id, region, role, permissions, granted_by
  ) values
    ('43000000-0000-0000-0000-000000000001', family, caller, 'ca', 'parent', array['calls'], caller),
    ('43000000-0000-0000-0000-000000000002', family, callee, 'ca', 'parent', array['calls'], caller),
    ('43000000-0000-0000-0000-000000000003', family, outsider, 'ca', 'professional', array['calls'], caller);
  insert into peacepad_v2.conversation (
    conversation_id, family_id, region, participant_identity_ids, created_by
  ) values
    (conversation, family, 'ca', array[caller, callee], caller),
    (group_conversation, family, 'ca', array[caller, callee, outsider], caller);

  if has_table_privilege('authenticated', 'peacepad_v2.audio_call_session', 'select')
     or has_function_privilege('authenticated', 'public.peacepad_v2_create_audio_call(uuid,text,uuid,text,integer)', 'execute') then
    raise exception 'Direct authenticated-role access was not denied.';
  end if;

  begin
    perform public.peacepad_v2_create_audio_call(
      outsider, 'ca', conversation,
      pg_temp.call_token('outsider-create', 'call.created', conversation::text), 2
    );
    raise exception 'Non-participant call creation unexpectedly succeeded.';
  exception when insufficient_privilege then
    if sqlerrm not like '%CALL_ACCESS_DENIED%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_create_audio_call(
      caller, 'us', conversation,
      pg_temp.call_token('wrong-region', 'call.created', conversation::text), 2
    );
    raise exception 'Cross-region call creation unexpectedly succeeded.';
  exception when insufficient_privilege then
    if sqlerrm not like '%CALL_ACCESS_DENIED%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_create_audio_call(
      caller, 'ca', group_conversation,
      pg_temp.call_token('group-create', 'call.created', group_conversation::text), 2
    );
    raise exception 'Group-conversation call creation unexpectedly succeeded.';
  exception when insufficient_privilege then
    if sqlerrm not like '%CALL_ACCESS_DENIED%' then raise; end if;
  end;

  result := public.peacepad_v2_create_audio_call(
    caller, 'ca', conversation,
    pg_temp.call_token('create-1', 'call.created', conversation::text), 2
  );
  replay := public.peacepad_v2_create_audio_call(
    caller, 'ca', conversation,
    pg_temp.call_token('create-1', 'call.created', conversation::text), 2
  );
  if replay <> result or result ->> 'calleeIdentityId' <> callee::text
     or result ->> 'callerIdentityId' <> caller::text or result ->> 'status' <> 'ringing' then
    raise exception 'Create did not derive the other participant or replay exactly.';
  end if;
  created_call_id := (result ->> 'id')::uuid;

  begin
    perform public.peacepad_v2_create_audio_call(
      caller, 'ca', conversation,
      pg_temp.call_token('create-2', 'call.created', conversation::text), 2
    );
    raise exception 'Second live call unexpectedly succeeded.';
  exception when others then
    if sqlerrm not like '%CALL_ALREADY_ACTIVE%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_create_audio_call(
      caller, 'ca', conversation,
      pg_temp.call_token('create-1', 'call.created', 'changed-request'), 2
    );
    raise exception 'Changed request reused an idempotency key.';
  exception when others then
    if sqlerrm not like '%IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;

  result := public.peacepad_v2_accept_audio_call(
    callee, 'ca', created_call_id, 1,
    pg_temp.call_token('accept-1', 'call.accepted', created_call_id::text || ':1'), 2
  );
  replay := public.peacepad_v2_accept_audio_call(
    callee, 'ca', created_call_id, 1,
    pg_temp.call_token('accept-1', 'call.accepted', created_call_id::text || ':1'), 2
  );
  if replay <> result or result ->> 'status' <> 'active' or (result ->> 'version')::integer <> 2 then
    raise exception 'Accept did not transition once or replay exactly.';
  end if;
  if public.peacepad_v2_get_current_audio_call(caller, 'ca', conversation) <> result then
    raise exception 'Current-state lookup did not return the active call.';
  end if;
  begin
    perform public.peacepad_v2_end_audio_call(
      caller, 'ca', created_call_id, 1,
      pg_temp.call_token('stale-end', 'call.ended', created_call_id::text || ':1'), 2
    );
    raise exception 'Stale call version unexpectedly succeeded.';
  exception when serialization_failure then
    if sqlerrm not like '%CONCURRENCY_CONFLICT%' then raise; end if;
  end;
  result := public.peacepad_v2_end_audio_call(
    caller, 'ca', created_call_id, 2,
    pg_temp.call_token('end-1', 'call.ended', created_call_id::text || ':2'), 2
  );
  if result ->> 'status' <> 'ended' or result ->> 'endReason' <> 'participant_ended'
     or public.peacepad_v2_get_current_audio_call(callee, 'ca', conversation) is not null then
    raise exception 'End/current-state lifecycle is incorrect.';
  end if;

  result := public.peacepad_v2_create_audio_call(
    caller, 'ca', conversation,
    pg_temp.call_token('create-decline', 'call.created', conversation::text || ':decline'), 2
  );
  created_call_id := (result ->> 'id')::uuid;
  result := public.peacepad_v2_decline_audio_call(
    callee, 'ca', created_call_id, 1,
    pg_temp.call_token('decline-1', 'call.declined', created_call_id::text || ':1'), 2
  );
  if result ->> 'status' <> 'declined' or result ->> 'endReason' <> 'declined' then
    raise exception 'Callee decline lifecycle is incorrect.';
  end if;

  result := public.peacepad_v2_create_audio_call(
    caller, 'ca', conversation,
    pg_temp.call_token('create-cancel', 'call.created', conversation::text || ':cancel'), 2
  );
  created_call_id := (result ->> 'id')::uuid;
  result := public.peacepad_v2_end_audio_call(
    caller, 'ca', created_call_id, 1,
    pg_temp.call_token('cancel-1', 'call.ended', created_call_id::text || ':1'), 2
  );
  if result ->> 'endReason' <> 'caller_cancelled' then
    raise exception 'Caller cancellation lifecycle is incorrect.';
  end if;

  result := public.peacepad_v2_create_audio_call(
    caller, 'ca', conversation,
    pg_temp.call_token('create-expiry', 'call.created', conversation::text || ':expiry'), 2
  );
  created_call_id := (result ->> 'id')::uuid;
  update peacepad_v2.audio_call_session
  set created_at = now() - interval '2 minutes', expires_at = now() - interval '1 minute'
  where audio_call_session.call_id = created_call_id;
  expired_count := peacepad_v2.expire_audio_calls('ca', conversation);
  select status into expired_status from peacepad_v2.audio_call_session where audio_call_session.call_id = created_call_id;
  if expired_count <> 1 or expired_status <> 'expired' then
    raise exception 'Server-owned expiry did not close the ringing call (count %, status %).', expired_count, expired_status;
  end if;

  result := public.peacepad_v2_create_audio_call(
    caller, 'ca', conversation,
    pg_temp.call_token('create-revoke', 'call.created', conversation::text || ':revoke'), 2
  );
  created_call_id := (result ->> 'id')::uuid;
  begin
    perform public.peacepad_v2_end_audio_call(
      callee, 'ca', created_call_id, 1,
      pg_temp.call_token('callee-ring-end', 'call.ended', created_call_id::text || ':1'), 2
    );
    raise exception 'Callee ended a ringing call instead of declining it.';
  exception when others then
    if sqlerrm not like '%CALL_STATE_INVALID%' then raise; end if;
  end;
  update peacepad_v2.participant_grant set revoked_at = now(), version = version + 1
  where family_id = family and identity_id = callee;
  if not exists (
    select 1 from peacepad_v2.audio_call_session
    where audio_call_session.call_id = created_call_id and status = 'ended' and end_reason = 'authorization_revoked'
  ) then
    raise exception 'Grant revocation did not close the live call.';
  end if;

  update peacepad_v2.participant_grant set revoked_at = null, version = version + 1
  where family_id = family and identity_id = callee;
  result := public.peacepad_v2_create_audio_call(
    caller, 'ca', conversation,
    pg_temp.call_token('create-delete', 'call.created', conversation::text || ':delete'), 2
  );
  created_call_id := (result ->> 'id')::uuid;
  perform public.peacepad_v2_delete_account(
    callee, 'ca', 1,
    pg_temp.call_token('delete-callee', 'account.deleted', callee::text || ':1'), 2
  );
  if not exists (
    select 1 from peacepad_v2.audio_call_session
    where audio_call_session.call_id = created_call_id and status = 'ended' and end_reason = 'authorization_revoked'
  ) then
    raise exception 'Account deletion did not close the live call through grant revocation.';
  end if;

  if exists (
    select 1 from peacepad_v2.audit_event
    where event_type like 'call.%'
      and (to_jsonb(audit_event) ? 'result' or to_jsonb(audit_event) ? 'body' or to_jsonb(audit_event) ? 'participants')
  ) then
    raise exception 'Call audit retained response or participant content.';
  end if;
  if (select count(*) from peacepad_v2.audit_event where event_type like 'call.%') < 11 then
    raise exception 'Content-free call lifecycle audit events are incomplete.';
  end if;
end;
$$;

rollback;

\echo AUDIO_CALL_LIFECYCLE_POSTGRES_VERIFIED
