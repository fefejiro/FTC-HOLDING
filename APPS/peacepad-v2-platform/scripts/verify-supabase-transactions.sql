\set ON_ERROR_STOP on

do $$
declare
  parent_a constant uuid := '10000000-0000-0000-0000-000000000001';
  parent_b constant uuid := '10000000-0000-0000-0000-000000000002';
  family_result jsonb;
  invitation_result jsonb;
  preview_result jsonb;
  deletion_result jsonb;
  conversation_result jsonb;
  message_result jsonb;
  correction_result jsonb;
  search_result jsonb;
  layer_result jsonb;
  shared_layer_result jsonb;
  event_result jsonb;
  updated_event_result jsonb;
  message_check_result jsonb;
  updated_message_check_result jsonb;
  created_family_id uuid;
  invitation_id uuid;
  conversation_id uuid;
  message_id uuid;
  layer_id uuid;
  event_id uuid;
  invitation_hash bytea := decode(repeat('ab', 32), 'hex');
begin
  insert into auth.users (id) values (parent_a), (parent_b) on conflict do nothing;

  perform public.peacepad_v2_bootstrap_identity(parent_a, 'ca', 'Alex Example', 'bootstrap-parent-a', 2);
  perform public.peacepad_v2_bootstrap_identity(parent_b, 'ca', 'Jordan Example', 'bootstrap-parent-b', 2);
  perform public.peacepad_v2_record_consent(parent_a, 'ca', 'terms', true, '2026-08', 'consent-parent-a-terms', 2);

  family_result := public.peacepad_v2_create_family(parent_a, 'ca', 'Example Family', 'create-example-family', 2);
  created_family_id := (family_result ->> 'familyId')::uuid;
  invitation_result := public.peacepad_v2_create_invitation(
    parent_a, 'ca', created_family_id, invitation_hash, 'parent', array['messages', 'calendar'],
    now() + interval '24 hours', 'create-example-invite', 2
  );
  invitation_id := (invitation_result ->> 'invitationId')::uuid;
  preview_result := public.peacepad_v2_resolve_invitation(parent_b, 'ca', invitation_hash);
  if preview_result ->> 'invitationId' <> invitation_id::text then
    raise exception 'Invitation preview did not resolve the expected invitation.';
  end if;
  perform public.peacepad_v2_accept_invitation(parent_b, 'ca', invitation_id, 1, 'accept-example-invite', 2);

  if not exists (
    select 1 from peacepad_v2.participant_grant
    where family_id = created_family_id and identity_id = parent_b and revoked_at is null
  ) then
    raise exception 'Invitation acceptance did not create an active participant grant.';
  end if;

  if jsonb_array_length(public.peacepad_v2_list_active_memberships(parent_a, 'ca')) <> 1 then
    raise exception 'Family creator could not restore the active membership.';
  end if;
  if (public.peacepad_v2_list_active_memberships(parent_b, 'ca') -> 0 ->> 'familyCircleId') <> created_family_id::text then
    raise exception 'Accepted participant did not restore the expected family membership.';
  end if;
  begin
    perform public.peacepad_v2_list_active_memberships(parent_a, 'us');
    raise exception 'Cross-region membership restoration unexpectedly succeeded.';
  exception when others then
    if sqlerrm not like '%REGION_MISMATCH%' then raise; end if;
  end;

  conversation_result := public.peacepad_v2_create_conversation(
    parent_a, 'ca', created_family_id, array[parent_a, parent_b],
    'create-example-conversation', 2
  );
  conversation_id := (conversation_result ->> 'id')::uuid;
  if jsonb_array_length(public.peacepad_v2_list_conversations(parent_b, 'ca', created_family_id)) <> 1 then
    raise exception 'Accepted participant could not list the shared conversation.';
  end if;

  message_result := public.peacepad_v2_send_message(
    parent_a, 'ca', conversation_id, created_family_id, 'Pickup at five.',
    'send-example-message', 2
  );
  message_id := (message_result ->> 'id')::uuid;
  perform public.peacepad_v2_record_message_event(
    parent_b, 'ca', conversation_id, created_family_id, message_id, 'delivered',
    'deliver-example-message', 2
  );
  perform public.peacepad_v2_record_message_event(
    parent_b, 'ca', conversation_id, created_family_id, message_id, 'viewed',
    'view-example-message', 2
  );
  correction_result := public.peacepad_v2_correct_message(
    parent_a, 'ca', conversation_id, created_family_id, message_id, 'Pickup at six.',
    'correct-example-message', 2
  );
  if correction_result ->> 'originalMessageEventId' <> message_id::text then
    raise exception 'Message correction did not link to its immutable original.';
  end if;
  if (select body from peacepad_v2.message_event where message_event_id = message_id) <> 'Pickup at five.' then
    raise exception 'Original message content was overwritten.';
  end if;
  search_result := public.peacepad_v2_search_messages(parent_b, 'ca', conversation_id, 'six', 20);
  if jsonb_array_length(search_result) <> 1 or search_result -> 0 ->> 'body' <> 'Pickup at six.' then
    raise exception 'Message search did not return the effective corrected content.';
  end if;
  if jsonb_array_length(public.peacepad_v2_list_messages(parent_b, 'ca', conversation_id)) <> 4 then
    raise exception 'Message event history is incomplete.';
  end if;
  if public.peacepad_v2_send_message(
    parent_a, 'ca', conversation_id, created_family_id, 'Pickup at five.',
    'send-example-message', 2
  ) <> message_result then
    raise exception 'Message idempotent replay changed its result.';
  end if;

  message_check_result := public.peacepad_v2_get_message_check(parent_a, 'ca', conversation_id);
  if (message_check_result ->> 'enabled')::boolean or (message_check_result ->> 'version')::integer <> 0 then
    raise exception 'Message Check did not default off for a new conversation preference.';
  end if;
  if public.peacepad_v2_authorize_message_preview(parent_a, 'ca', conversation_id) then
    raise exception 'Message preview was authorized before explicit opt-in.';
  end if;
  updated_message_check_result := public.peacepad_v2_set_message_check(
    parent_a, 'ca', conversation_id, true, false, 0, 'enable-message-check', 2
  );
  if not (updated_message_check_result ->> 'enabled')::boolean
    or (updated_message_check_result ->> 'version')::integer <> 1
    or not public.peacepad_v2_authorize_message_preview(parent_a, 'ca', conversation_id) then
    raise exception 'Message Check opt-in was not persisted or authorized.';
  end if;
  if public.peacepad_v2_set_message_check(
    parent_a, 'ca', conversation_id, true, false, 0, 'enable-message-check', 2
  ) <> updated_message_check_result then
    raise exception 'Message Check idempotent replay changed its result.';
  end if;
  begin
    perform public.peacepad_v2_set_message_check(
      parent_a, 'ca', conversation_id, false, false, 0, 'stale-message-check-update', 2
    );
    raise exception 'Stale Message Check update unexpectedly succeeded.';
  exception when serialization_failure then null;
  end;
  message_check_result := public.peacepad_v2_set_message_check(
    parent_a, 'ca', conversation_id, false, false, 1, 'disable-message-check', 2
  );
  if (message_check_result ->> 'enabled')::boolean
    or (message_check_result ->> 'version')::integer <> 2
    or public.peacepad_v2_authorize_message_preview(parent_a, 'ca', conversation_id) then
    raise exception 'Message Check opt-out was not persisted or enforced.';
  end if;
  begin
    perform public.peacepad_v2_set_message_check(
      parent_a, 'ca', conversation_id, true, true, 2, 'enable-ai-message-check', 2
    );
    raise exception 'Third-party AI assistance unexpectedly enabled without consent enforcement.';
  exception when insufficient_privilege then null;
  end;
  message_check_result := public.peacepad_v2_set_message_check(
    parent_b, 'ca', conversation_id, true, false, 0, 'enable-parent-b-message-check', 2
  );
  if not (message_check_result ->> 'enabled')::boolean then
    raise exception 'Message Check preference was not isolated per conversation participant.';
  end if;
  begin
    perform public.peacepad_v2_set_message_check(
      parent_a, 'ca', conversation_id, true, false, 2, 'send-example-message', 2
    );
    raise exception 'Cross-operation idempotency-key reuse unexpectedly succeeded.';
  exception when unique_violation then null;
  end;

  layer_result := public.peacepad_v2_create_calendar_layer(
    parent_a, 'ca', created_family_id, 'Parenting Time', 'parenting-time',
    'calendar', 'teal', '{"scope":"private"}'::jsonb,
    'create-private-calendar-layer', 2
  );
  layer_id := (layer_result ->> 'id')::uuid;
  if jsonb_array_length(public.peacepad_v2_list_calendar_layers(parent_b, 'ca', created_family_id)) <> 0 then
    raise exception 'Private calendar layer was exposed to another participant.';
  end if;
  if public.peacepad_v2_create_calendar_layer(
    parent_a, 'ca', created_family_id, 'Parenting Time', 'parenting-time',
    'calendar', 'teal', '{"scope":"private"}'::jsonb,
    'create-private-calendar-layer', 2
  ) <> layer_result then raise exception 'Calendar layer idempotent replay changed its result.'; end if;

  shared_layer_result := public.peacepad_v2_update_calendar_layer(
    parent_a, 'ca', layer_id, 'Parenting Time', 'parenting-time', 'calendar', 'teal',
    '{"scope":"family"}'::jsonb, 1, 'share-calendar-layer', 2
  );
  if (shared_layer_result ->> 'version')::integer <> 2
    or jsonb_array_length(public.peacepad_v2_list_calendar_layers(parent_b, 'ca', created_family_id)) <> 1 then
    raise exception 'Explicit calendar sharing did not become visible to the family.';
  end if;
  begin
    perform public.peacepad_v2_update_calendar_layer(
      parent_a, 'ca', layer_id, 'Stale update', 'parenting-time', 'calendar', 'teal',
      '{"scope":"family"}'::jsonb, 1, 'stale-calendar-layer-update', 2
    );
    raise exception 'Stale calendar layer update unexpectedly succeeded.';
  exception when serialization_failure then null;
  end;

  event_result := public.peacepad_v2_create_schedule_event(
    parent_a, 'ca', created_family_id, layer_id, '{}'::uuid[], 'parenting-time',
    'Weekend parenting time', 'Fictional staging event.',
    '2026-09-05T14:00:00Z'::timestamptz, '2026-09-06T22:00:00Z'::timestamptz,
    'planned', '{"frequency":"weekly","interval":1,"weekdays":["SA"],"until":null,"count":4}'::jsonb,
    null, 'create-shared-schedule-event', 2
  );
  event_id := (event_result ->> 'id')::uuid;
  if jsonb_array_length(public.peacepad_v2_list_schedule_events(parent_b, 'ca', created_family_id)) <> 1 then
    raise exception 'Shared schedule event was not visible to the accepted participant.';
  end if;
  updated_event_result := public.peacepad_v2_update_schedule_event(
    parent_a, 'ca', event_id, layer_id, '{}'::uuid[], 'parenting-time',
    'Weekend parenting time', 'Updated fictional staging event.',
    '2026-09-05T15:00:00Z'::timestamptz, '2026-09-06T22:00:00Z'::timestamptz,
    'accepted', null, '{"scope":"private"}'::jsonb,
    1, 'restrict-schedule-event', 2
  );
  if (updated_event_result ->> 'version')::integer <> 2
    or jsonb_array_length(public.peacepad_v2_list_schedule_events(parent_b, 'ca', created_family_id)) <> 0 then
    raise exception 'Event privacy override did not restrict visibility.';
  end if;
  perform public.peacepad_v2_delete_schedule_event(parent_a, 'ca', event_id, 2, 'delete-schedule-event', 2);
  perform public.peacepad_v2_delete_calendar_layer(parent_a, 'ca', layer_id, 2, 'delete-calendar-layer', 2);
  if jsonb_array_length(public.peacepad_v2_list_calendar_layers(parent_a, 'ca', created_family_id)) <> 0 then
    raise exception 'Deleted calendar layer remained visible.';
  end if;
  begin
    perform public.peacepad_v2_list_calendar_layers(parent_a, 'us', created_family_id);
    raise exception 'Cross-region calendar access unexpectedly succeeded.';
  exception when insufficient_privilege then null;
  end;

  deletion_result := public.peacepad_v2_delete_account(parent_b, 'ca', 1, 'delete-parent-b-account', 2);
  if deletion_result ->> 'status' <> 'deleted' then
    raise exception 'Account deletion did not return deleted status.';
  end if;
  if exists (select 1 from public.peacepad_v2_get_region_binding(parent_b)) then
    raise exception 'Deleted identity retained an active session region binding.';
  end if;
  if exists (
    select 1 from peacepad_v2.participant_grant
    where identity_id = parent_b and revoked_at is null
  ) then
    raise exception 'Deleted identity retained an active participant grant.';
  end if;
  if exists (
    select 1 from peacepad_v2.message_check_preference
    where identity_id = parent_b
  ) then
    raise exception 'Deleted identity retained a Message Check preference.';
  end if;
  if not exists (
    select 1 from peacepad_v2.audit_event
    where identity_id = parent_b and event_type = 'account.deleted'
  ) then
    raise exception 'Account deletion audit event is missing.';
  end if;
  begin
    perform public.peacepad_v2_list_messages(parent_b, 'ca', conversation_id);
    raise exception 'Deleted identity retained conversation access.';
  exception
    when insufficient_privilege then null;
  end;
  if public.peacepad_v2_delete_account(parent_b, 'ca', 1, 'delete-parent-b-account', 2) <> deletion_result then
    raise exception 'Account deletion idempotent replay changed its result.';
  end if;
end;
$$;
