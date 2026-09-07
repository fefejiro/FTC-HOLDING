\set ON_ERROR_STOP on

create or replace function pg_temp.write_token(
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
    || substr(encode(extensions.digest('client:' || p_client_key, 'sha256'), 'hex'), 1, 48)
    || ':' || p_operation || ':'
    || substr(encode(extensions.digest('request:' || p_operation || ':' || p_request_marker, 'sha256'), 'hex'), 1, 48)
$$;

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
  binder_result jsonb;
  binder_replay_result jsonb;
  attachment_intent_result jsonb;
  attachment_intent_replay_result jsonb;
  attachment_result jsonb;
  timeline_result jsonb;
  timeline_replay_result jsonb;
  timeline_layer_result jsonb;
  timeline_event_result jsonb;
  timeline_schedule_result jsonb;
  created_family_id uuid;
  invitation_id uuid;
  conversation_id uuid;
  message_id uuid;
  layer_id uuid;
  event_id uuid;
  binder_id uuid;
  timeline_layer_id uuid;
  timeline_event_id uuid;
  cleanup_claim record;
  cleanup_result jsonb;
  first_cleanup_lease uuid;
  expired_receipt_count integer;
  invitation_hash bytea := decode(repeat('ab', 32), 'hex');
  deletion_invitation_id uuid := '10000000-0000-0000-0000-000000000099';
  deletion_invitation_hash bytea := decode(repeat('cd', 32), 'hex');
begin
  insert into auth.users (id) values (parent_a), (parent_b) on conflict do nothing;

  perform public.peacepad_v2_bootstrap_identity(parent_a, 'ca', 'Alex Example', pg_temp.write_token('bootstrap-parent-a', 'identity.bootstrapped', 'parent-a'), 2);
  perform public.peacepad_v2_bootstrap_identity(parent_b, 'ca', 'Jordan Example', pg_temp.write_token('bootstrap-parent-b', 'identity.bootstrapped', 'parent-b'), 2);
  if (select identity_version from public.peacepad_v2_get_session_binding(parent_b)) <> 1 then
    raise exception 'Verified session binding did not expose the active identity version.';
  end if;
  perform public.peacepad_v2_record_consent(parent_a, 'ca', 'terms', true, '2026-08', pg_temp.write_token('consent-parent-a-terms', 'consent.recorded', 'parent-a-terms-2026-08'), 2);
  perform public.peacepad_v2_record_consent(parent_b, 'ca', 'terms', true, '2026-08', pg_temp.write_token('consent-parent-b-terms', 'consent.recorded', 'parent-b-terms-2026-08'), 2);

  family_result := public.peacepad_v2_create_family(parent_a, 'ca', 'Example Family', pg_temp.write_token('create-example-family', 'family.created', 'example-family'), 2);
  created_family_id := (family_result ->> 'familyId')::uuid;
  invitation_result := public.peacepad_v2_create_invitation(
    parent_a, 'ca', created_family_id, invitation_hash, 'parent', array['messages', 'calendar'],
    now() + interval '24 hours', pg_temp.write_token('create-example-invite', 'invitation.created', 'example-family-parent-message-calendar'), 2
  );
  invitation_id := (invitation_result ->> 'invitationId')::uuid;
  begin
    perform public.peacepad_v2_accept_invitation(parent_b, 'ca', invitation_id, 1, pg_temp.write_token('accept-without-code-proof', 'invitation.accepted', invitation_id::text), 2);
    raise exception 'Invitation acceptance unexpectedly succeeded without prior code resolution.';
  exception when others then
    if sqlerrm not like '%INVITATION_INVALID%' then raise; end if;
  end;
  preview_result := public.peacepad_v2_resolve_invitation(parent_b, 'ca', invitation_hash);
  if preview_result ->> 'invitationId' <> invitation_id::text then
    raise exception 'Invitation preview did not resolve the expected invitation.';
  end if;
  invitation_result := public.peacepad_v2_accept_invitation(parent_b, 'ca', invitation_id, 1, pg_temp.write_token('accept-example-invite', 'invitation.accepted', invitation_id::text), 2);
  conversation_id := (invitation_result -> 'conversation' ->> 'id')::uuid;
  if (invitation_result -> 'grant' ->> 'familyId')::uuid <> created_family_id
    or (invitation_result -> 'conversation' ->> 'familyCircleId')::uuid <> created_family_id then
    raise exception 'Invitation acceptance did not return its atomic family conversation.';
  end if;
  if public.peacepad_v2_accept_invitation(parent_b, 'ca', invitation_id, 1, pg_temp.write_token('accept-example-invite', 'invitation.accepted', invitation_id::text), 2) <> invitation_result then
    raise exception 'Invitation acceptance idempotent replay changed its result.';
  end if;

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

  if (select count(*) from peacepad_v2.conversation where family_id = created_family_id and participant_identity_ids = array[parent_a, parent_b]) <> 1 then
    raise exception 'Invitation acceptance created duplicate direct conversations.';
  end if;
  if jsonb_array_length(public.peacepad_v2_list_conversations(parent_b, 'ca', created_family_id)) <> 1 then
    raise exception 'Accepted participant could not list the shared conversation.';
  end if;

  message_result := public.peacepad_v2_send_message(
    parent_a, 'ca', conversation_id, created_family_id, 'Pickup at five.',
    pg_temp.write_token('send-example-message', 'message.sent', conversation_id::text || ':pickup-five'), 2
  );
  message_id := (message_result ->> 'id')::uuid;
  perform public.peacepad_v2_record_message_event(
    parent_b, 'ca', conversation_id, created_family_id, message_id, 'delivered',
    pg_temp.write_token('deliver-example-message', 'message.delivered', message_id::text), 2
  );
  perform public.peacepad_v2_record_message_event(
    parent_b, 'ca', conversation_id, created_family_id, message_id, 'viewed',
    pg_temp.write_token('view-example-message', 'message.viewed', message_id::text), 2
  );
  correction_result := public.peacepad_v2_correct_message(
    parent_a, 'ca', conversation_id, created_family_id, message_id, 'Pickup at six.',
    pg_temp.write_token('correct-example-message', 'message.corrected', message_id::text || ':pickup-six'), 2
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
    pg_temp.write_token('send-example-message', 'message.sent', conversation_id::text || ':pickup-five'), 2
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
    parent_a, 'ca', conversation_id, true, false, 0, pg_temp.write_token('enable-message-check', 'message_check.updated', conversation_id::text || ':true:false:0'), 2
  );
  if not (updated_message_check_result ->> 'enabled')::boolean
    or (updated_message_check_result ->> 'version')::integer <> 1
    or not public.peacepad_v2_authorize_message_preview(parent_a, 'ca', conversation_id) then
    raise exception 'Message Check opt-in was not persisted or authorized.';
  end if;
  if public.peacepad_v2_set_message_check(
    parent_a, 'ca', conversation_id, true, false, 0, pg_temp.write_token('enable-message-check', 'message_check.updated', conversation_id::text || ':true:false:0'), 2
  ) <> updated_message_check_result then
    raise exception 'Message Check idempotent replay changed its result.';
  end if;
  begin
    perform public.peacepad_v2_set_message_check(
      parent_a, 'ca', conversation_id, false, false, 0, pg_temp.write_token('stale-message-check-update', 'message_check.updated', conversation_id::text || ':false:false:0'), 2
    );
    raise exception 'Stale Message Check update unexpectedly succeeded.';
  exception when serialization_failure then null;
  end;
  message_check_result := public.peacepad_v2_set_message_check(
    parent_a, 'ca', conversation_id, false, false, 1, pg_temp.write_token('disable-message-check', 'message_check.updated', conversation_id::text || ':false:false:1'), 2
  );
  if (message_check_result ->> 'enabled')::boolean
    or (message_check_result ->> 'version')::integer <> 2
    or public.peacepad_v2_authorize_message_preview(parent_a, 'ca', conversation_id) then
    raise exception 'Message Check opt-out was not persisted or enforced.';
  end if;
  begin
    perform public.peacepad_v2_set_message_check(
      parent_a, 'ca', conversation_id, true, true, 2, pg_temp.write_token('enable-ai-message-check', 'message_check.updated', conversation_id::text || ':true:true:2'), 2
    );
    raise exception 'Third-party AI assistance unexpectedly enabled without consent enforcement.';
  exception when insufficient_privilege then null;
  end;
  message_check_result := public.peacepad_v2_set_message_check(
    parent_b, 'ca', conversation_id, true, false, 0, pg_temp.write_token('enable-parent-b-message-check', 'message_check.updated', conversation_id::text || ':true:false:0'), 2
  );
  if not (message_check_result ->> 'enabled')::boolean then
    raise exception 'Message Check preference was not isolated per conversation participant.';
  end if;
  begin
    perform public.peacepad_v2_set_message_check(
      parent_a, 'ca', conversation_id, true, false, 2, pg_temp.write_token('send-example-message', 'message_check.updated', conversation_id::text || ':true:false:2'), 2
    );
    raise exception 'Cross-operation idempotency-key reuse unexpectedly succeeded.';
  exception when others then
    if sqlerrm not like '%IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;

  begin
    perform public.peacepad_v2_send_message(
      parent_a, 'ca', conversation_id, created_family_id, 'Changed payload.',
      pg_temp.write_token('send-example-message', 'message.sent', conversation_id::text || ':changed-payload'), 2
    );
    raise exception 'Changed message payload reused an idempotency key unexpectedly.';
  exception when others then
    if sqlerrm not like '%IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;

  layer_result := public.peacepad_v2_create_calendar_layer(
    parent_a, 'ca', created_family_id, 'Parenting Time', 'parenting-time',
    'calendar', 'teal', '{"scope":"private"}'::jsonb,
    pg_temp.write_token('create-private-calendar-layer', 'calendar_layer.created', created_family_id::text || ':private-parenting-time'), 2
  );
  layer_id := (layer_result ->> 'id')::uuid;
  if jsonb_array_length(public.peacepad_v2_list_calendar_layers(parent_b, 'ca', created_family_id)) <> 0 then
    raise exception 'Private calendar layer was exposed to another participant.';
  end if;
  if public.peacepad_v2_create_calendar_layer(
    parent_a, 'ca', created_family_id, 'Parenting Time', 'parenting-time',
    'calendar', 'teal', '{"scope":"private"}'::jsonb,
    pg_temp.write_token('create-private-calendar-layer', 'calendar_layer.created', created_family_id::text || ':private-parenting-time'), 2
  ) <> layer_result then raise exception 'Calendar layer idempotent replay changed its result.'; end if;

  shared_layer_result := public.peacepad_v2_update_calendar_layer(
    parent_a, 'ca', layer_id, 'Parenting Time', 'parenting-time', 'calendar', 'teal',
    '{"scope":"family"}'::jsonb, 1, pg_temp.write_token('share-calendar-layer', 'calendar_layer.updated', layer_id::text || ':family:1'), 2
  );
  if (shared_layer_result ->> 'version')::integer <> 2
    or jsonb_array_length(public.peacepad_v2_list_calendar_layers(parent_b, 'ca', created_family_id)) <> 1 then
    raise exception 'Explicit calendar sharing did not become visible to the family.';
  end if;
  begin
    perform public.peacepad_v2_update_calendar_layer(
      parent_a, 'ca', layer_id, 'Stale update', 'parenting-time', 'calendar', 'teal',
      '{"scope":"family"}'::jsonb, 1, pg_temp.write_token('stale-calendar-layer-update', 'calendar_layer.updated', layer_id::text || ':stale:1'), 2
    );
    raise exception 'Stale calendar layer update unexpectedly succeeded.';
  exception when serialization_failure then null;
  end;

  event_result := public.peacepad_v2_create_schedule_event(
    parent_a, 'ca', created_family_id, layer_id, '{}'::uuid[], 'parenting-time',
    'Weekend parenting time', 'Fictional staging event.',
    '2026-09-05T14:00:00Z'::timestamptz, '2026-09-06T22:00:00Z'::timestamptz,
    'planned', '{"frequency":"weekly","interval":1,"weekdays":["SA"],"until":null,"count":4}'::jsonb,
    null, pg_temp.write_token('create-shared-schedule-event', 'schedule_event.created', created_family_id::text || ':weekend-parenting'), 2
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
    1, pg_temp.write_token('restrict-schedule-event', 'schedule_event.updated', event_id::text || ':private:1'), 2
  );
  if (updated_event_result ->> 'version')::integer <> 2
    or jsonb_array_length(public.peacepad_v2_list_schedule_events(parent_b, 'ca', created_family_id)) <> 0 then
    raise exception 'Event privacy override did not restrict visibility.';
  end if;
  perform public.peacepad_v2_delete_schedule_event(parent_a, 'ca', event_id, 2, pg_temp.write_token('delete-schedule-event', 'schedule_event.deleted', event_id::text || ':2'), 2);
  perform public.peacepad_v2_delete_calendar_layer(parent_a, 'ca', layer_id, 2, pg_temp.write_token('delete-calendar-layer', 'calendar_layer.deleted', layer_id::text || ':2'), 2);
  if jsonb_array_length(public.peacepad_v2_list_calendar_layers(parent_a, 'ca', created_family_id)) <> 0 then
    raise exception 'Deleted calendar layer remained visible.';
  end if;
  begin
    perform public.peacepad_v2_list_calendar_layers(parent_a, 'us', created_family_id);
    raise exception 'Cross-region calendar access unexpectedly succeeded.';
  exception when insufficient_privilege then null;
  end;

  binder_result := public.peacepad_v2_create_case_binder(
    parent_b, 'ca', created_family_id, 'Parenting records', 'Child A',
    pg_temp.write_token('create-private-binder', 'case_binder.created', created_family_id::text || ':parent-b:parenting-records'), 2
  );
  binder_id := (binder_result ->> 'id')::uuid;
  if binder_result ->> 'ownerIdentityId' <> parent_b::text
    or binder_result ->> 'familyCircleId' <> created_family_id::text
    or jsonb_array_length(public.peacepad_v2_list_case_binders(parent_b, 'ca', created_family_id)) <> 1 then
    raise exception 'Private Case Binder was not persisted for its authenticated owner.';
  end if;
  binder_replay_result := public.peacepad_v2_create_case_binder(
    parent_b, 'ca', created_family_id, 'Parenting records', 'Child A',
    pg_temp.write_token('create-private-binder', 'case_binder.created', created_family_id::text || ':parent-b:parenting-records'), 2
  );
  if binder_replay_result <> binder_result
    or jsonb_array_length(public.peacepad_v2_list_case_binders(parent_b, 'ca', created_family_id)) <> 1 then
    raise exception 'Exact Case Binder replay was not deterministic.';
  end if;
  begin
    perform public.peacepad_v2_create_case_binder(
      parent_b, 'ca', created_family_id, 'Changed private records', 'Child B',
      pg_temp.write_token('create-private-binder', 'case_binder.created', created_family_id::text || ':parent-b:changed-private-records'), 2
    );
    raise exception 'Changed Case Binder payload reused an idempotency key unexpectedly.';
  exception when others then
    if sqlerrm not like '%IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_list_case_binders(parent_a, 'ca', created_family_id);
  exception when others then
    raise exception 'A family participant could not access their own empty private Binder list.';
  end;
  if jsonb_array_length(public.peacepad_v2_list_case_binders(parent_a, 'ca', created_family_id)) <> 0 then
    raise exception 'Another participant could see an owner-private Case Binder.';
  end if;
  attachment_intent_result := public.peacepad_v2_prepare_attachment_intent(
    parent_b, 'ca', created_family_id, binder_id, 'school-note.pdf', 'application/pdf', 1024,
    pg_temp.write_token('prepare-private-attachment', 'attachment_intent.prepared', binder_id::text || ':school-note.pdf:application/pdf:1024'), 2
  );
  if attachment_intent_result ->> 'uploadTransport' <> 'supabase-signed'
    or attachment_intent_result -> 'uploadUrl' <> 'null'::jsonb
    or attachment_intent_result ->> 'status' <> 'awaiting-upload'
    or attachment_intent_result ->> 'objectPath' not like 'ca/' || parent_b::text || '/' || binder_id::text || '/%.pdf'
    or (attachment_intent_result ->> 'expiresAt')::timestamptz > now() + interval '15 minutes' then
    raise exception 'Attachment preparation did not preserve the private signed-upload boundary.';
  end if;
  attachment_intent_replay_result := public.peacepad_v2_prepare_attachment_intent(
    parent_b, 'ca', created_family_id, binder_id, 'school-note.pdf', 'application/pdf', 1024,
    pg_temp.write_token('prepare-private-attachment', 'attachment_intent.prepared', binder_id::text || ':school-note.pdf:application/pdf:1024'), 2
  );
  if attachment_intent_replay_result <> attachment_intent_result
    or (select count(*) from peacepad_v2.attachment_upload_intent where case_binder_id=binder_id) <> 1 then
    raise exception 'Exact attachment-intent replay was not deterministic.';
  end if;
  attachment_result := public.peacepad_v2_complete_private_attachment(
    parent_b, 'ca', (attachment_intent_result ->> 'id')::uuid, 'application/pdf', 1024,
    pg_temp.write_token('complete-private-attachment', 'attachment.uploaded', (attachment_intent_result ->> 'id') || ':application/pdf:1024'), 2
  );
  if attachment_result ->> 'ownerIdentityId' <> parent_b::text
    or attachment_result ->> 'byteLength' <> '1024'
    or jsonb_array_length(public.peacepad_v2_list_private_attachments(parent_b, 'ca', binder_id)) <> 1 then
    raise exception 'Private attachment completion was not persisted for its owner.';
  end if;
  begin
    perform public.peacepad_v2_list_private_attachments(parent_a, 'ca', binder_id);
    raise exception 'Another participant listed an owner-private attachment.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.peacepad_v2_prepare_attachment_intent(
      parent_b, 'ca', created_family_id, binder_id, 'changed-note.pdf', 'application/pdf', 2048,
      pg_temp.write_token('prepare-private-attachment', 'attachment_intent.prepared', binder_id::text || ':changed-note.pdf:application/pdf:2048'), 2
    );
    raise exception 'Changed attachment metadata reused an idempotency key unexpectedly.';
  exception when others then
    if sqlerrm not like '%IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_prepare_attachment_intent(
      parent_b, 'ca', created_family_id, binder_id, 'cross-operation.pdf', 'application/pdf', 1024,
      pg_temp.write_token('create-private-binder', 'attachment_intent.prepared', binder_id::text || ':cross-operation'), 2
    );
    raise exception 'Cross-operation private-record idempotency reuse unexpectedly succeeded.';
  exception when others then
    if sqlerrm not like '%IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_prepare_attachment_intent(
      parent_b, 'ca', created_family_id, binder_id, '../private.pdf', 'application/pdf', 1024,
      pg_temp.write_token('reject-private-traversal', 'attachment_intent.prepared', binder_id::text || ':traversal'), 2
    );
    raise exception 'Attachment preparation accepted path traversal metadata.';
  exception when invalid_parameter_value then null;
  end;

  timeline_result := public.peacepad_v2_link_timeline_source(
    parent_b, 'ca', created_family_id, binder_id, 'message-event', message_id,
    pg_temp.write_token('link-private-message-timeline', 'timeline_entry.linked', binder_id::text || ':message-event:' || message_id::text), 2
  );
  if timeline_result -> 'source' ->> 'kind' <> 'message-event'
    or timeline_result -> 'source' ->> 'sourceId' <> message_id::text
    or jsonb_array_length(public.peacepad_v2_list_private_timeline(parent_b, 'ca', binder_id)) <> 1 then
    raise exception 'Owner-private message timeline link was not persisted.';
  end if;
  timeline_replay_result := public.peacepad_v2_link_timeline_source(
    parent_b, 'ca', created_family_id, binder_id, 'message-event', message_id,
    pg_temp.write_token('link-private-message-timeline', 'timeline_entry.linked', binder_id::text || ':message-event:' || message_id::text), 2
  );
  if timeline_replay_result <> timeline_result
    or (select count(*) from peacepad_v2.private_timeline_entry where case_binder_id=binder_id) <> 1 then
    raise exception 'Exact timeline replay was not deterministic.';
  end if;
  begin
    perform public.peacepad_v2_link_timeline_source(
      parent_b, 'ca', created_family_id, binder_id, 'message-event', (correction_result ->> 'id')::uuid,
      pg_temp.write_token('link-private-message-timeline', 'timeline_entry.linked', binder_id::text || ':message-event:' || (correction_result ->> 'id')), 2
    );
    raise exception 'Changed timeline source reused an idempotency key unexpectedly.';
  exception when others then
    if sqlerrm not like '%IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_link_timeline_source(
      parent_b, 'ca', created_family_id, binder_id, 'message-event', message_id,
      pg_temp.write_token('duplicate-private-message-timeline', 'timeline_entry.linked', binder_id::text || ':message-event:' || message_id::text), 2
    );
    raise exception 'The same source was linked twice to one Binder.';
  exception when others then
    if sqlerrm not like '%TIMELINE_SOURCE_ALREADY_LINKED%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_list_private_timeline(parent_a, 'ca', binder_id);
    raise exception 'Another participant could access an owner-private timeline.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.peacepad_v2_list_private_timeline(parent_b, 'us', binder_id);
    raise exception 'Cross-region private timeline access unexpectedly succeeded.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.peacepad_v2_link_timeline_source(
      parent_b, 'ca', created_family_id, binder_id, 'schedule-event', event_id,
      pg_temp.write_token('reject-deleted-schedule-timeline', 'timeline_entry.linked', binder_id::text || ':deleted-schedule:' || event_id::text), 2
    );
    raise exception 'A deleted schedule event was linked to the private timeline.';
  exception when invalid_parameter_value then null;
  end;

  timeline_layer_result := public.peacepad_v2_create_calendar_layer(
    parent_b, 'ca', created_family_id, 'Private appointments', 'events-activities',
    'calendar', 'violet', '{"scope":"private"}'::jsonb,
    pg_temp.write_token('create-private-timeline-layer', 'calendar_layer.created', created_family_id::text || ':parent-b-private-appointments'), 2
  );
  timeline_layer_id := (timeline_layer_result ->> 'id')::uuid;
  timeline_event_result := public.peacepad_v2_create_schedule_event(
    parent_b, 'ca', created_family_id, timeline_layer_id, '{}'::uuid[], 'appointment',
    'Private appointment', 'Private staging description.',
    '2026-09-10T15:00:00Z'::timestamptz, '2026-09-10T16:00:00Z'::timestamptz,
    'planned', null, null,
    pg_temp.write_token('create-private-timeline-event', 'schedule_event.created', timeline_layer_id::text || ':private-appointment'), 2
  );
  timeline_event_id := (timeline_event_result ->> 'id')::uuid;
  timeline_schedule_result := public.peacepad_v2_link_timeline_source(
    parent_b, 'ca', created_family_id, binder_id, 'schedule-event', timeline_event_id,
    pg_temp.write_token('link-private-schedule-timeline', 'timeline_entry.linked', binder_id::text || ':schedule-event:' || timeline_event_id::text), 2
  );
  if timeline_schedule_result -> 'source' ->> 'kind' <> 'schedule-event'
    or (timeline_schedule_result -> 'source' ->> 'sourceVersion')::integer <> 1
    or jsonb_array_length(public.peacepad_v2_list_private_timeline(parent_b, 'ca', binder_id)) <> 2 then
    raise exception 'Owner-visible schedule source was not linked to the private timeline.';
  end if;
  if public.peacepad_v2_list_private_timeline(parent_b, 'ca', binder_id)::text ilike any (array[
    '%Pickup at five.%', '%Private appointment%', '%Private staging description.%',
    '%Parenting records%', '%Child A%', '%school-note.pdf%'
  ]) then
    raise exception 'Private timeline response copied source or Binder content.';
  end if;

  binder_result := public.peacepad_v2_archive_case_binder(
    parent_b, 'ca', binder_id, 1,
    pg_temp.write_token('archive-private-binder', 'case_binder.archived', binder_id::text || ':1'), 2
  );
  if binder_result ->> 'status' <> 'archived' or (binder_result ->> 'version')::integer <> 2 then
    raise exception 'Case Binder archive did not preserve optimistic concurrency.';
  end if;
  begin
    perform public.peacepad_v2_link_timeline_source(
      parent_b, 'ca', created_family_id, binder_id, 'message-event', (correction_result ->> 'id')::uuid,
      pg_temp.write_token('reject-archived-timeline-link', 'timeline_entry.linked', binder_id::text || ':archived-correction'), 2
    );
    raise exception 'An archived Case Binder accepted a new timeline source.';
  exception when invalid_parameter_value then null;
  end;
  binder_replay_result := public.peacepad_v2_archive_case_binder(
    parent_b, 'ca', binder_id, 1,
    pg_temp.write_token('archive-private-binder', 'case_binder.archived', binder_id::text || ':1'), 2
  );
  if binder_replay_result <> binder_result then
    raise exception 'Exact Case Binder archive replay was not deterministic.';
  end if;
  begin
    perform public.peacepad_v2_archive_case_binder(
      parent_b, 'ca', binder_id, 2,
      pg_temp.write_token('archive-private-binder', 'case_binder.archived', binder_id::text || ':2'), 2
    );
    raise exception 'Changed archive version reused an idempotency key unexpectedly.';
  exception when others then
    if sqlerrm not like '%IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;
  begin
    perform public.peacepad_v2_prepare_attachment_intent(
      parent_b, 'ca', created_family_id, binder_id, 'after-archive.pdf', 'application/pdf', 1024,
      pg_temp.write_token('reject-archived-binder', 'attachment_intent.prepared', binder_id::text || ':archived'), 2
    );
    raise exception 'Archived Case Binder accepted new attachment metadata.';
  exception when invalid_parameter_value then null;
  end;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'peacepad_v2'
      and table_name = 'audit_event'
      and column_name = 'result'
  ) then
    raise exception 'Immutable audit events still expose a response payload column.';
  end if;
  if exists (
    select 1 from peacepad_v2.audit_event
    where idempotency_key !~ '^[0-9a-f]{48}$'
  ) then
    raise exception 'Audit events retained a raw or malformed client idempotency key.';
  end if;
  if exists (
    select 1 from peacepad_v2.audit_event audit
    where audit::text ilike any (array[
      '%Pickup at five.%', '%Pickup at six.%', '%Example Family%',
      '%Weekend parenting time%', '%Fictional staging event.%',
      '%Parenting records%', '%Child A%', '%school-note.pdf%'
    ])
  ) then
    raise exception 'Audit events retained private domain content.';
  end if;
  if has_table_privilege('anon', 'peacepad_v2.write_receipt', 'select')
     or has_table_privilege('authenticated', 'peacepad_v2.write_receipt', 'select') then
    raise exception 'Client roles can read encrypted write receipts.';
  end if;
  if exists (
    select 1 from peacepad_v2.write_receipt receipt
    where receipt.encrypted_response is not null
      and (
        position(convert_to('Pickup at five.', 'UTF8') in receipt.encrypted_response) > 0
        or position(convert_to('Parenting records', 'UTF8') in receipt.encrypted_response) > 0
        or position(convert_to('Child A', 'UTF8') in receipt.encrypted_response) > 0
        or position(convert_to('school-note.pdf', 'UTF8') in receipt.encrypted_response) > 0
      )
  ) then
    raise exception 'A write receipt retained plaintext message or private-record metadata.';
  end if;

  update peacepad_v2.write_receipt
  set response_expires_at = now() - interval '1 second'
  where identity_id = parent_a and operation = 'message.sent';
  expired_receipt_count := public.peacepad_v2_expire_write_receipts('ca');
  if expired_receipt_count < 1 then
    raise exception 'Expired replay receipt was not selected for clearing.';
  end if;
  if exists (
       select 1 from peacepad_v2.write_receipt
       where identity_id = parent_a
         and operation = 'message.sent'
         and encrypted_response is not null
     ) then
    raise exception 'Expired replay ciphertext was not cleared.';
  end if;
  begin
    perform public.peacepad_v2_send_message(
      parent_a, 'ca', conversation_id, created_family_id, 'Pickup at five.',
      pg_temp.write_token('send-example-message', 'message.sent', conversation_id::text || ':pickup-five'), 2
    );
    raise exception 'Expired message receipt unexpectedly replayed.';
  exception when others then
    if sqlerrm not like '%IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;

  insert into peacepad_v2.family_invitation (
    invitation_id, family_id, region, created_by, code_hash, invited_role,
    permissions, expires_at
  ) values (
    deletion_invitation_id, created_family_id, 'ca', parent_b,
    deletion_invitation_hash, 'caregiver', array['calendar'], now() + interval '1 day'
  );
  insert into peacepad_v2.invitation_attempt (
    invitation_attempt_id, identity_id, region, code_hash
  ) values (
    gen_random_uuid(), parent_b, 'ca', deletion_invitation_hash
  );

  deletion_result := public.peacepad_v2_delete_account(parent_b, 'ca', 1, pg_temp.write_token('delete-parent-b-account', 'account.deleted', 'parent-b:1'), 2);
  if deletion_result ->> 'status' <> 'deleted' then
    raise exception 'Account deletion did not return deleted status.';
  end if;
  if exists (select 1 from public.peacepad_v2_get_region_binding(parent_b)) then
    raise exception 'Deleted identity retained an active session region binding.';
  end if;
  if exists (select 1 from peacepad_v2.region_binding where identity_id = parent_b) then
    raise exception 'Deleted identity retained redundant regional assignment metadata.';
  end if;
  if exists (select 1 from public.peacepad_v2_get_session_binding(parent_b)) then
    raise exception 'Deleted identity retained a versioned session binding.';
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
  if exists (select 1 from peacepad_v2.case_binder where owner_identity_id = parent_b)
    or exists (select 1 from peacepad_v2.attachment_upload_intent where owner_identity_id = parent_b)
    or exists (select 1 from peacepad_v2.private_attachment where owner_identity_id = parent_b)
    or exists (select 1 from peacepad_v2.private_timeline_entry where owner_identity_id = parent_b) then
    raise exception 'Deleted identity retained owner-private Binder metadata.';
  end if;
  if not exists (
    select 1 from peacepad_v2.private_storage_cleanup_outbox
    where identity_id=parent_b and object_path=attachment_intent_result ->> 'objectPath'
  ) then
    raise exception 'Account deletion did not queue the private storage object for removal.';
  end if;
  if exists (
    select 1 from peacepad_v2.invitation_attempt where identity_id = parent_b
  ) then
    raise exception 'Deleted identity retained invitation-attempt rate-limit metadata.';
  end if;
  if not exists (
    select 1 from peacepad_v2.family_invitation deletion_invitation
    where deletion_invitation.invitation_id = deletion_invitation_id
      and deletion_invitation.status = 'revoked'
      and deletion_invitation.revoked_at is not null
      and deletion_invitation.code_hash <> deletion_invitation_hash
      and deletion_invitation.failed_attempts = 0
      and deletion_invitation.last_attempt_at is null
  ) then
    raise exception 'Deleted identity retained usable invitation code material.';
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
  if public.peacepad_v2_delete_account(parent_b, 'ca', 1, pg_temp.write_token('delete-parent-b-account', 'account.deleted', 'parent-b:1'), 2) <> deletion_result then
    raise exception 'Account deletion idempotent replay changed its result.';
  end if;
  if (select count(*) from peacepad_v2.auth_cleanup_outbox where identity_id = parent_b) <> 1 then
    raise exception 'Account deletion did not create exactly one durable Auth cleanup request.';
  end if;
  begin
    perform public.peacepad_v2_claim_auth_cleanup('eu', 1, 120);
    raise exception 'Unsupported cleanup region unexpectedly succeeded.';
  exception when invalid_parameter_value then null;
  end;
  select * into cleanup_claim from public.peacepad_v2_claim_auth_cleanup('ca', 1, 120);
  if cleanup_claim.identity_id <> parent_b or cleanup_claim.lease_token is null then
    raise exception 'Auth cleanup request was not leased safely.';
  end if;
  first_cleanup_lease := cleanup_claim.lease_token;
  if exists (select 1 from public.peacepad_v2_claim_auth_cleanup('ca', 1, 120)) then
    raise exception 'A leased Auth cleanup request was claimed twice.';
  end if;
  begin
    perform public.peacepad_v2_finish_auth_cleanup(
      parent_b, gen_random_uuid(), true, null
    );
    raise exception 'Auth cleanup accepted the wrong lease token.';
  exception when serialization_failure then null;
  end;
  update peacepad_v2.auth_cleanup_outbox
  set lease_expires_at = now() - interval '1 second'
  where identity_id = parent_b;
  select * into cleanup_claim from public.peacepad_v2_claim_auth_cleanup('ca', 1, 120);
  if cleanup_claim.lease_token = first_cleanup_lease then
    raise exception 'Expired Auth cleanup lease was not replaced.';
  end if;
  cleanup_result := public.peacepad_v2_finish_auth_cleanup(
    parent_b, cleanup_claim.lease_token, false, 'AUTH_DELETE_FAILED'
  );
  if cleanup_result ->> 'status' <> 'pending' or not exists (
    select 1 from peacepad_v2.auth_cleanup_outbox
    where identity_id = parent_b and lease_token is null and next_attempt_at > now()
  ) then
    raise exception 'Failed Auth cleanup did not schedule a safe retry.';
  end if;
  update peacepad_v2.auth_cleanup_outbox
  set next_attempt_at = now() - interval '1 second'
  where identity_id = parent_b;
  select * into cleanup_claim from public.peacepad_v2_claim_auth_cleanup('ca', 1, 120);
  cleanup_result := public.peacepad_v2_finish_auth_cleanup(
    parent_b, cleanup_claim.lease_token, true, null
  );
  if cleanup_result ->> 'status' <> 'completed' or exists (
    select 1 from peacepad_v2.auth_cleanup_outbox where identity_id = parent_b
  ) then
    raise exception 'Successful Auth cleanup retained operational retry metadata.';
  end if;
  if not exists (
    select 1 from peacepad_v2.identity
    where identity_id = parent_b and auth_principal_deleted_at is not null
  ) then
    raise exception 'Successful Auth cleanup did not retain its completion tombstone.';
  end if;
  insert into peacepad_v2.auth_cleanup_outbox(identity_id, region)
  select identity.identity_id, identity.region
  from peacepad_v2.identity identity
  where identity.deleted_at is not null and identity.auth_principal_deleted_at is null
  on conflict (identity_id) do nothing;
  if exists (select 1 from peacepad_v2.auth_cleanup_outbox where identity_id = parent_b) then
    raise exception 'Migration replay resurrected a completed Auth cleanup request.';
  end if;
  delete from auth.users where id = parent_b;
  if not exists (
    select 1 from peacepad_v2.identity where identity_id = parent_b and deleted_at is not null
  ) or not exists (
    select 1 from peacepad_v2.consent_record where identity_id = parent_b
  ) then
    raise exception 'Auth principal deletion removed required anonymized application provenance.';
  end if;
end;
$$;
