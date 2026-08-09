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
    await expect(api.acceptInvitation(preview.invitationId, { ...context, expectedVersion: preview.version })).resolves.toMatchObject({ permissions: ["messages", "calendar"] });
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
      role: "parent",
      permissions: ["messages", "calendar"]
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
    await api.revokeInvitation(created.invitation.id, context);
    await expect(api.resolveInvitation(created.code)).rejects.toMatchObject({ reason: "revoked" });

    await api.declineInvitation("invitation-1", context);
    await expect(api.resolveInvitation("CALM26")).rejects.toMatchObject({ reason: "used" });

    const revoked = new SyntheticCoordinationApi([invitation()]);
    await revoked.revokeInvitation("invitation-1", context);
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
});
