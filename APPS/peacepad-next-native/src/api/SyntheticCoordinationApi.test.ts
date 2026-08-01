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
      inviterDisplayName: "Jordan",
      familyDisplayName: "Shared parenting space",
      invitedRole: "parent" as const,
      permissions: ["messages", "calendar"],
      expiresAt: "2099-01-01T00:00:00.000Z"
    }
  };
}

describe("SyntheticCoordinationApi safety behavior", () => {
  it.each(["expired", "revoked", "used"] as const)("rejects a %s invitation", async (state) => {
    const api = new SyntheticCoordinationApi([invitation(state)]);
    await expect(api.resolveInvitation("CALM26")).rejects.toMatchObject({ reason: state });
  });

  it("allows one acceptance and rejects reuse", async () => {
    const api = new SyntheticCoordinationApi([invitation()]);
    await expect(api.acceptInvitation("invitation-1", context)).resolves.toMatchObject({
      role: "parent",
      permissions: ["messages", "calendar"]
    });
    await expect(api.acceptInvitation("invitation-1", context)).rejects.toMatchObject({ reason: "used" });
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
    await expect(api.createInvitation({
      familyCircleId: "family-current",
      invitedRole: "parent",
      permissions: ["messages"],
      expiresInHours: 24
    }, context)).resolves.toMatchObject({ code: "CALM26" });
    await api.declineInvitation("invitation-1", context);
    await expect(api.resolveInvitation("CALM26")).rejects.toMatchObject({ reason: "used" });

    const revoked = new SyntheticCoordinationApi([invitation()]);
    await revoked.revokeInvitation("invitation-1", context);
    await expect(revoked.resolveInvitation("CALM26")).rejects.toMatchObject({ reason: "revoked" });
  });
});
