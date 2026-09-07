import { InvitationError } from "./CoordinationApi";
import { defaultCalendarLayers, SyntheticCoordinationApi } from "./SyntheticCoordinationApi";
import type { WriteContext } from "../domain/v2";

const context: WriteContext = {
  idempotencyKey: "intent-test",
  expectedVersion: null,
  region: "ca",
  schemaVersion: "2.0",
  actor: { identityId: "identity-current", sessionId: "session-current" }
};

function invitation(state: "pending" | "expired" | "revoked" | "used" = "pending") {
  return {
    code: "CALM26",
    state,
    preview: {
      invitationId: "invitation-1",
      version: 1,
      inviterDisplayName: "Jordan",
      familyDisplayName: "Shared parenting space",
      invitedRole: "parent" as const,
      permissions: ["messages", "calendar"],
      expiresAt: "2099-01-01T00:00:00.000Z"
    }
  };
}

describe("SyntheticCoordinationApi safety behavior", () => {
  it("proves the synthetic coordination journey from invitation to corrected message search", async () => {
    const api = new SyntheticCoordinationApi([invitation()]);
    const created = await api.createInvitation({ familyCircleId: "family-current", invitedRole: "parent", permissions: ["messages", "calendar"], expiresInHours: 24 }, context);
    const preview = await api.resolveInvitation(created.code);
    expect(preview.invitationId).toBe(created.invitation.id);
    await expect(api.acceptInvitation(preview.invitationId, { ...context, expectedVersion: preview.version })).resolves.toMatchObject({ grant: { permissions: ["messages", "calendar"] } });
    const conversation = await api.createConversation({ familyCircleId: "family-current", participantIdentityIds: ["identity-current", "identity-coparent"] }, context);
    const sent = await api.sendMessage({ familyCircleId: "family-current", conversationId: conversation.id, body: "Pickup at 5." }, context);
    await api.recordMessageLifecycle({ familyCircleId: "family-current", conversationId: conversation.id, originalMessageEventId: sent.id, eventType: "delivered" }, context);
    const correction = await api.correctMessage({ familyCircleId: "family-current", conversationId: conversation.id, originalMessageEventId: sent.id, body: "Pickup at 6." }, context);
    expect(correction.body).toBe("Pickup at 6.");
    await expect(api.searchMessages(conversation.id, "Pickup at 6.")).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ corrected: true, body: "Pickup at 6." })]));
  });

  it.each(["expired", "revoked", "used"] as const)("rejects a %s invitation", async (state) => {
    const api = new SyntheticCoordinationApi([invitation(state)]);
    await expect(api.resolveInvitation("CALM26")).rejects.toMatchObject({ reason: state });
  });

  it("allows one acceptance and rejects reuse", async () => {
    const api = new SyntheticCoordinationApi([invitation()]);
    await expect(api.acceptInvitation("invitation-1", { ...context, expectedVersion: 1 })).resolves.toMatchObject({
      grant: { role: "parent", permissions: ["messages", "calendar"] },
      conversation: { status: "active" }
    });
    await expect(api.acceptInvitation("invitation-1", { ...context, expectedVersion: 1 })).rejects.toMatchObject({ reason: "used" });
    await expect(api.resolveInvitation("CALM26")).rejects.toMatchObject({ reason: "used" });
  });

  it("rate limits repeated invitation guesses", async () => {
    const api = new SyntheticCoordinationApi();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await expect(api.resolveInvitation("BAD123")).rejects.toMatchObject({ reason: "invalid" });
    }
    await expect(api.resolveInvitation("BAD123")).rejects.toEqual(
      new InvitationError("rate-limited", "Too many attempts. Wait a moment and try again.")
    );
  });

  it("keeps default layers private and filters cross-family reads", async () => {
    const api = new SyntheticCoordinationApi();
    expect(defaultCalendarLayers.every((layer) => layer.visibility.scope === "private")).toBe(true);
    await expect(api.listCalendarLayers("family-current")).resolves.toHaveLength(4);
    await expect(api.listCalendarLayers("family-other")).resolves.toEqual([]);
  });

  it("blocks cross-family writes", async () => {
    const api = new SyntheticCoordinationApi();
    await expect(api.createCalendarLayer({
      familyCircleId: "family-other",
      ownerIdentityId: "identity-current",
      name: "Private",
      kind: "custom",
      icon: "custom",
      colorToken: "amber",
      visibility: { scope: "private" }
    }, context)).rejects.toMatchObject({ status: 403 });
  });

  it("keeps Message Check AI assistance off and preserves the original draft", async () => {
    const api = new SyntheticCoordinationApi();
    await expect(api.setMessageCheckPreference("conversation-1", true, context)).resolves.toMatchObject({
      enabled: true,
      aiAssistanceEnabled: false
    });
    await expect(api.previewMessage("conversation-1", "You never confirm anything!!")).resolves.toMatchObject({
      originalMessage: "You never confirm anything!!",
      rewordingSuggestion: "Please confirm the practical details when you can."
    });
  });

  it("stores only the current parent's optional communication profile with version checks", async () => {
    const api = new SyntheticCoordinationApi();
    await expect(api.getPersonalityPreference()).resolves.toMatchObject({
      identityId: "identity-current",
      region: "ca",
      personalityType: null,
      version: 0
    });
    const saved = await api.setPersonalityPreference("INFP", { ...context, expectedVersion: 0 });
    expect(saved).toMatchObject({ personalityType: "INFP", version: 1 });
    await expect(api.setPersonalityPreference("INTP", { ...context, expectedVersion: 0 }))
      .rejects.toMatchObject({ status: 409 });
    await expect(api.setPersonalityPreference(null, { ...context, expectedVersion: 1 }))
      .resolves.toMatchObject({ personalityType: null, version: 2 });
  });

  it("keeps originals immutable while search returns the latest correction", async () => {
    const api = new SyntheticCoordinationApi();
    const original = await api.sendMessage({ familyCircleId: "family-current", conversationId: "conversation-1", body: "Pickup at five." }, context);
    const correction = await api.correctMessage({
      familyCircleId: "family-current", conversationId: "conversation-1", originalMessageEventId: original.id, body: "Pickup at six."
    }, context);
    await expect(api.listMessages("conversation-1")).resolves.toEqual([
      expect.objectContaining({ id: original.id, eventType: "sent", body: "Pickup at five." }),
      expect.objectContaining({ id: correction.id, eventType: "correction", body: "Pickup at six.", originalMessageEventId: original.id })
    ]);
    await expect(api.searchMessages("conversation-1", "six")).resolves.toEqual([
      expect.objectContaining({ originalMessageEventId: original.id, body: "Pickup at six.", corrected: true })
    ]);
    await expect(api.searchMessages("conversation-1", "five")).resolves.toEqual([]);
  });

  it("supports the in-memory layer and event lifecycle without a backend", async () => {
    const api = new SyntheticCoordinationApi();
    const createdLayer = await api.createCalendarLayer({
      familyCircleId: "family-current",
      ownerIdentityId: "identity-current",
      name: "School",
      kind: "custom",
      icon: "custom",
      colorToken: "amber",
      visibility: { scope: "private" }
    }, context);
    const updatedLayer = await api.updateCalendarLayer({
      ...createdLayer,
      visibility: { scope: "family" }
    }, { ...context, expectedVersion: createdLayer.version });
    expect(updatedLayer).toMatchObject({ version: 2, visibility: { scope: "family" } });

    const createdEvent = await api.createScheduleEvent({
      familyCircleId: "family-current",
      calendarLayerId: createdLayer.id,
      childProfileIds: [],
      eventType: "appointment",
      title: "School meeting",
      description: null,
      startsAt: "2026-08-01T12:00:00.000Z",
      endsAt: "2026-08-01T13:00:00.000Z",
      status: "planned",
      recurrence: null,
      visibilityOverride: null
    }, context);
    const updatedEvent = await api.updateScheduleEvent({ ...createdEvent, title: "School check-in" }, context);
    expect(updatedEvent).toMatchObject({ title: "School check-in", version: 2 });
    await expect(api.listScheduleEvents("family-current")).resolves.toHaveLength(1);
    await api.deleteScheduleEvent(createdEvent.id, context);
    await expect(api.listScheduleEvents("family-current")).resolves.toEqual([]);
    await api.deleteCalendarLayer(createdLayer.id, context);
    await expect(api.listCalendarLayers("family-current")).resolves.toHaveLength(4);
  });

  it("supports invitation creation, decline, and revocation states", async () => {
    const api = new SyntheticCoordinationApi([invitation()]);
    const created = await api.createInvitation({
      familyCircleId: "family-current",
      invitedRole: "parent",
      permissions: ["messages"],
      expiresInHours: 24
    }, context);
    expect(created).toMatchObject({ code: "P00001", deepLink: "peacepadnextlab://invite/P00001" });
    await api.revokeInvitation(created.invitation.id, { ...context, expectedVersion: created.invitation.version });
    await expect(api.resolveInvitation(created.code)).rejects.toMatchObject({ reason: "revoked" });

    await api.declineInvitation("invitation-1", { ...context, expectedVersion: 1 });
    await expect(api.resolveInvitation("CALM26")).rejects.toMatchObject({ reason: "used" });

    const revoked = new SyntheticCoordinationApi([invitation()]);
    await revoked.revokeInvitation("invitation-1", { ...context, expectedVersion: 1 });
    await expect(revoked.resolveInvitation("CALM26")).rejects.toMatchObject({ reason: "revoked" });
  });

  it("rejects missing calendars, events, conversations, and invalid invitation transitions", async () => {
    const api = new SyntheticCoordinationApi();
    await expect(api.updateCalendarLayer({ ...defaultCalendarLayers[0]!, id: "missing" }, context)).rejects.toMatchObject({ status: 404 });
    await expect(api.createScheduleEvent({
      familyCircleId: "family-current",
      calendarLayerId: "missing",
      childProfileIds: [],
      eventType: "appointment",
      title: "School",
      description: null,
      startsAt: "2026-08-01T12:00:00.000Z",
      endsAt: "2026-08-01T13:00:00.000Z",
      status: "planned",
      recurrence: null,
      visibilityOverride: null
    }, context)).rejects.toMatchObject({ status: 404 });
    await expect(api.listMessages("missing-conversation")).rejects.toMatchObject({ status: 404 });
    await expect(api.acceptInvitation("missing-invitation", { ...context, expectedVersion: 1 })).rejects.toMatchObject({ reason: "invalid" });
  });

  it("validates participants and message lifecycle while keeping lifecycle writes idempotent", async () => {
    const api = new SyntheticCoordinationApi();
    await expect(api.createConversation({ familyCircleId: "family-current", participantIdentityIds: ["identity-current"] }, context)).rejects.toMatchObject({ status: 400 });
    const conversation = await api.createConversation({
      familyCircleId: "family-current",
      participantIdentityIds: ["identity-current", "identity-coparent", "identity-coparent"]
    }, context);
    expect(conversation.participantIdentityIds).toEqual(["identity-current", "identity-coparent"]);
    await expect(api.sendMessage({ familyCircleId: "family-current", conversationId: conversation.id, body: "   " }, context)).rejects.toMatchObject({ status: 400 });
    const original = await api.sendMessage({ familyCircleId: "family-current", conversationId: conversation.id, body: "Pickup at five." }, context);
    const delivered = await api.recordMessageLifecycle({
      familyCircleId: "family-current",
      conversationId: conversation.id,
      originalMessageEventId: original.id,
      eventType: "delivered"
    }, context);
    await expect(api.recordMessageLifecycle({
      familyCircleId: "family-current",
      conversationId: conversation.id,
      originalMessageEventId: original.id,
      eventType: "delivered"
    }, context)).resolves.toEqual(delivered);
    await expect(api.recordMessageLifecycle({
      familyCircleId: "family-current",
      conversationId: conversation.id,
      originalMessageEventId: "missing",
      eventType: "viewed"
    }, context)).rejects.toMatchObject({ status: 404 });
  });

  it("validates correction and search bounds and returns a calm no-change preview", async () => {
    const api = new SyntheticCoordinationApi();
    const original = await api.sendMessage({
      familyCircleId: "family-current",
      conversationId: "conversation-primary",
      body: "Pickup is at five."
    }, context);
    await expect(api.correctMessage({
      familyCircleId: "family-current",
      conversationId: "conversation-primary",
      originalMessageEventId: original.id,
      body: "Pickup is at five."
    }, context)).rejects.toMatchObject({ status: 400 });
    await expect(api.searchMessages("conversation-primary", "x")).rejects.toMatchObject({ status: 400 });
    await expect(api.getMessageCheckPreference("conversation-primary")).resolves.toMatchObject({ enabled: false, aiAssistanceEnabled: false });
    await expect(api.previewMessage("conversation-primary", "Please confirm pickup at five.")).resolves.toMatchObject({
      tone: "clear",
      rewordingSuggestion: null,
      originalMessage: "Please confirm pickup at five."
    });
  });

  it("models the bounded foreground audio lifecycle without pretending to provide media", async () => {
    const api = new SyntheticCoordinationApi();
    await expect(api.getCurrentAudioCall("conversation-primary")).resolves.toBeNull();

    const ringing = await api.createAudioCall("conversation-primary", context);
    expect(ringing).toMatchObject({ status: "ringing", type: "audio", version: 1 });
    await expect(api.getCurrentAudioCall("conversation-primary")).resolves.toEqual(ringing);
    await expect(api.createAudioCall("conversation-primary", context)).rejects.toMatchObject({ status: 409 });

    const active = await api.acceptAudioCall(ringing.id, { ...context, expectedVersion: ringing.version });
    expect(active).toMatchObject({ status: "active", version: 2 });
    await expect(api.getAudioCallTurnCredentials(active.id, { ...context, expectedVersion: active.version }))
      .rejects.toMatchObject({ status: 503 });
    await expect(api.sendAudioCallSignal(active.id, {
      kind: "offer",
      payload: { sdp: "v=0\r\n" }
    }, { ...context, expectedVersion: active.version })).resolves.toMatchObject({ delivered: true, callVersion: 2 });
    await expect(api.sendAudioCallSignal(active.id, {
      kind: "ice",
      payload: { candidate: "candidate:1", sdpMid: null, sdpMLineIndex: null }
    }, { ...context, expectedVersion: 1 })).rejects.toMatchObject({ status: 409 });

    const ended = await api.endAudioCall(active.id, { ...context, expectedVersion: active.version });
    expect(ended).toMatchObject({ status: "ended", endReason: "participant_ended", version: 3 });
    await expect(api.acceptAudioCall(ended.id, { ...context, expectedVersion: 2 })).rejects.toMatchObject({ status: 409 });
  });

  it("models callee decline and caller cancellation as terminal states", async () => {
    const declinedApi = new SyntheticCoordinationApi();
    const declinedRinging = await declinedApi.createAudioCall("conversation-primary", context);
    await expect(declinedApi.declineAudioCall(declinedRinging.id, { ...context, expectedVersion: 1 })).resolves.toMatchObject({
      status: "declined",
      endReason: "declined"
    });

    const cancelledApi = new SyntheticCoordinationApi();
    const cancelledRinging = await cancelledApi.createAudioCall("conversation-primary", context);
    await expect(cancelledApi.endAudioCall(cancelledRinging.id, { ...context, expectedVersion: 1 })).resolves.toMatchObject({
      status: "ended",
      endReason: "caller_cancelled"
    });
  });

  it("keeps demo timeline links metadata-only, unique, and limited to canonical source kinds", async () => {
    const api = new SyntheticCoordinationApi();
    const binder = await api.createCaseBinder({
      familyCircleId: "family-current",
      name: "Fictional records",
      childLabel: "Child A"
    }, context);
    const sent = await api.sendMessage({
      familyCircleId: "family-current",
      conversationId: "conversation-primary",
      body: "Private source text must not be copied."
    }, context);
    const messageEntry = await api.linkTimelineSource({
      familyCircleId: "family-current",
      caseBinderId: binder.id,
      sourceKind: "message-event",
      sourceId: sent.id
    }, context);
    expect(messageEntry).toMatchObject({
      source: { kind: "message-event", sourceId: sent.id, eventType: "sent", sourceVersion: null }
    });
    expect(JSON.stringify(messageEntry)).not.toContain("Private source text");
    await expect(api.linkTimelineSource({
      familyCircleId: "family-current",
      caseBinderId: binder.id,
      sourceKind: "message-event",
      sourceId: sent.id
    }, context)).rejects.toMatchObject({ status: 409 });

    const delivered = await api.recordMessageLifecycle({
      familyCircleId: "family-current",
      conversationId: "conversation-primary",
      originalMessageEventId: sent.id,
      eventType: "delivered"
    }, context);
    await expect(api.linkTimelineSource({
      familyCircleId: "family-current",
      caseBinderId: binder.id,
      sourceKind: "message-event",
      sourceId: delivered.id
    }, context)).rejects.toMatchObject({ status: 404 });

    const layer = await api.createCalendarLayer({
      familyCircleId: "family-current",
      ownerIdentityId: "identity-current",
      name: "Private appointments",
      kind: "events-activities",
      icon: "calendar",
      colorToken: "violet",
      visibility: { scope: "private" }
    }, context);
    const event = await api.createScheduleEvent({
      familyCircleId: "family-current",
      calendarLayerId: layer.id,
      childProfileIds: [],
      eventType: "appointment",
      title: "Private appointment",
      description: null,
      startsAt: "2026-09-10T15:00:00.000Z",
      endsAt: "2026-09-10T16:00:00.000Z",
      status: "planned",
      recurrence: null,
      visibilityOverride: null
    }, context);
    await expect(api.linkTimelineSource({
      familyCircleId: "family-current",
      caseBinderId: binder.id,
      sourceKind: "schedule-event",
      sourceId: event.id
    }, context)).resolves.toMatchObject({
      source: { kind: "schedule-event", sourceId: event.id, eventType: "appointment", sourceVersion: 1 }
    });
    await expect(api.listPrivateTimeline(binder.id)).resolves.toHaveLength(2);
  });

  it("supports the full parent-core contract without requiring a connected family name", async () => {
    const api = new SyntheticCoordinationApi();
    const familyCircleId = "family-current";
    const child = await api.createChildProfile({ familyCircleId, displayName: "Kid A" }, context);
    expect(child).toMatchObject({ displayName: "Kid A", directLoginEnabled: false, version: 1 });
    await expect(api.createChildUpdate({
      familyCircleId,
      childProfileId: child.id,
      kind: "school",
      title: "School update",
      body: "Parent-teacher meeting is next week.",
      occurredAt: "2026-09-01T14:00:00.000Z",
      visibility: { scope: "private" }
    }, context)).resolves.toMatchObject({ childProfileId: child.id, kind: "school" });

    const expense = await api.createExpense({
      familyCircleId,
      childProfileIds: [child.id],
      title: "School supplies",
      description: null,
      category: "education",
      amountMinor: 10000,
      currency: "CAD",
      incurredAt: "2026-09-01T14:00:00.000Z",
      splits: [
        { identityId: context.actor.identityId, shareType: "percentage", shareValue: 50 },
        { identityId: "identity-coparent", shareType: "percentage", shareValue: 50 }
      ],
      receiptAttachmentId: null
    }, context);
    const settlement = await api.requestSettlement({
      familyCircleId,
      expenseId: expense.id,
      requestedFromIdentityId: "identity-coparent",
      amountMinor: 5000,
      currency: "CAD"
    }, context);
    expect(settlement).toMatchObject({ status: "pending", amountMinor: 5000 });
    await expect(api.resolveSettlement(settlement.id, { resolution: "confirmed" }, { ...context, actor: { ...context.actor, identityId: "identity-coparent" }, expectedVersion: settlement.version }))
      .resolves.toMatchObject({ status: "confirmed", version: 2 });

    const scheduled = await api.createScheduledCall({
      familyCircleId,
      conversationId: "conversation-primary",
      participantIdentityIds: [context.actor.identityId, "identity-coparent"],
      mediaType: "video",
      startsAt: "2026-09-02T18:00:00.000Z",
      durationMinutes: 30,
      note: "Weekly call"
    }, context);
    expect(scheduled).toMatchObject({ mediaType: "video", status: "scheduled" });

    const video = await api.createMediaCall("conversation-primary", "video", context);
    expect(video).toMatchObject({ type: "video", status: "ringing" });
    await expect(api.getCurrentMediaCall("conversation-primary")).resolves.toEqual(video);

    const conch = await api.createConchSession({
      familyCircleId,
      conversationId: "conversation-primary",
      mediaType: "audio",
      turnDurationSeconds: 120
    }, context);
    expect(conch).toMatchObject({ status: "invited", recordingEnabled: false, transcriptEnabled: false });
    const active = await api.respondToConchSession(conch.id, "accept", { ...context, expectedVersion: conch.version });
    expect(active).toMatchObject({ status: "active", currentSpeakerIdentityId: context.actor.identityId });
    const passed = await api.passConchTurn(active.id, { ...context, expectedVersion: active.version });
    expect(passed.turn).toMatchObject({ outcome: "passed", speakerIdentityId: context.actor.identityId });
    await expect(api.endConchSession(active.id, { ...context, expectedVersion: passed.session.version }))
      .resolves.toMatchObject({ status: "ended", currentSpeakerIdentityId: null });
  });

  it("keeps a receipt private until it is attached to its expense", async () => {
    const api = new SyntheticCoordinationApi();
    const intent = await api.createAttachmentUploadIntent({
      familyCircleId: "family-current",
      target: { kind: "expense-receipt" },
      originalFileName: "school-fee.pdf",
      mediaType: "application/pdf",
      byteLength: 3
    }, context);
    await api.uploadPrivateAttachment(intent, new Uint8Array([1, 2, 3]).buffer);
    const receipt = await api.completeExpenseReceipt(intent.id, context);
    expect(receipt).toMatchObject({ status: "available", linkedExpenseId: null, target: { kind: "expense-receipt" } });

    const expense = await api.createExpense({
      familyCircleId: "family-current", childProfileIds: [], title: "School fee", description: null,
      category: "education", amountMinor: 5000, currency: "CAD", incurredAt: "2026-09-01T14:00:00.000Z",
      splits: [{ identityId: context.actor.identityId, shareType: "percentage", shareValue: 100 }], receiptAttachmentId: receipt.id
    }, context);
    expect(expense.receiptAttachmentId).toBe(receipt.id);
    await expect(api.getExpenseReceiptDownload(receipt.id)).resolves.toMatchObject({ attachment: { linkedExpenseId: expense.id } });
  });

  it("reveals a Conch summary only after both parents consent and deletes it on withdrawal", async () => {
    const api = new SyntheticCoordinationApi();
    const conch = await api.createConchSession({
      familyCircleId: "family-current",
      conversationId: "conversation-primary",
      mediaType: "audio",
      turnDurationSeconds: 120
    }, context);
    const currentConsent = await api.consentToConchSession(conch.id, true, { ...context, expectedVersion: conch.version });
    await expect(api.getConchSummary(conch.id)).resolves.toBeNull();
    const otherContext = { ...context, actor: { ...context.actor, identityId: "identity-coparent" }, expectedVersion: currentConsent.version };
    const bothConsent = await api.consentToConchSession(conch.id, true, otherContext);
    const summary = await api.saveConchSummary(conch.id, " We agreed to confirm Sunday pickup by Friday evening. ", { ...context, expectedVersion: null });
    expect(summary).toMatchObject({ body: "We agreed to confirm Sunday pickup by Friday evening.", version: 1 });
    await expect(api.getConchSummary(conch.id)).resolves.toEqual(summary);
    await api.consentToConchSession(conch.id, false, { ...otherContext, expectedVersion: bothConsent.version });
    await expect(api.getConchSummary(conch.id)).resolves.toBeNull();
  });

  it("requires and preserves a reason when a settlement is disputed", async () => {
    const api = new SyntheticCoordinationApi();
    const expense = await api.createExpense({
      familyCircleId: "family-current", childProfileIds: [], title: "Activity fee", description: null,
      category: "activity", amountMinor: 8000, currency: "CAD", incurredAt: "2026-09-01T14:00:00.000Z",
      splits: [{ identityId: context.actor.identityId, shareType: "percentage", shareValue: 50 }, { identityId: "identity-coparent", shareType: "percentage", shareValue: 50 }],
      receiptAttachmentId: null
    }, context);
    const settlement = await api.requestSettlement({ familyCircleId: "family-current", expenseId: expense.id, requestedFromIdentityId: "identity-coparent", amountMinor: 4000, currency: "CAD" }, context);
    const respondingContext = { ...context, actor: { ...context.actor, identityId: "identity-coparent" }, expectedVersion: settlement.version };
    await expect(api.resolveSettlement(settlement.id, { resolution: "disputed" }, respondingContext)).rejects.toMatchObject({ status: 400 });
    await expect(api.resolveSettlement(settlement.id, { resolution: "disputed", resolutionNote: "Receipt total does not match." }, respondingContext))
      .resolves.toMatchObject({ status: "disputed", resolutionNote: "Receipt total does not match.", version: 2 });
  });

  it("persists one shared parenting plan and versioned change requests", async () => {
    const api = new SyntheticCoordinationApi();
    const plan = await api.saveParentingSchedulePlan({
      familyCircleId: "family-current",
      calendarLayerId: "layer-parenting",
      pattern: "two_two_three",
      startDate: "2026-09-01",
      primaryParentIdentityId: context.actor.identityId,
      secondaryParentIdentityId: "identity-coparent",
      timezone: "America/Toronto",
      status: "active"
    }, context);
    await expect(api.getParentingSchedulePlan("family-current")).resolves.toEqual(plan);
    await expect(api.saveParentingSchedulePlan({ ...plan, pattern: "week_on_off" }, context)).rejects.toMatchObject({ status: 409 });

    const proposed = await api.createParentingScheduleException({
      familyCircleId: "family-current",
      parentingSchedulePlanId: plan.id,
      assignedParentIdentityId: "identity-coparent",
      kind: "holiday",
      startDate: "2026-12-24",
      endDate: "2026-12-26",
      note: "Holiday handover"
    }, context);
    expect(proposed).toMatchObject({ status: "proposed", version: 1 });
    await expect(api.resolveParentingScheduleException(proposed.id, "accepted", { ...context, expectedVersion: proposed.version }))
      .resolves.toMatchObject({ status: "accepted", version: 2 });
    await expect(api.listParentingScheduleExceptions("family-current")).resolves.toHaveLength(1);
  });
});
