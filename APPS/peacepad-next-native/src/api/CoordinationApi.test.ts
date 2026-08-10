import { HttpPeacePadCoordinationApi, InvitationError } from "./CoordinationApi";
import type { PeacePadEnvironmentConfig } from "../config/environment";
import type { WriteContext } from "../domain/v2";

const config: PeacePadEnvironmentConfig = {
  environment: "staging",
  apiBaseUrl: "https://staging-api.peacepad.test",
  requestTimeoutMs: 100,
  productionApiWritesEnabled: false,
  diagnosticsEnabled: false
};

const context: WriteContext = {
  idempotencyKey: "intent-123",
  expectedVersion: 4,
  region: "ca",
  schemaVersion: "2.0",
  actor: { identityId: "identity-current", sessionId: "session-current" }
};
const accessToken = async () => "a".repeat(48);

function response(status: number, payload: unknown): Response {
  return {
    json: jest.fn(async () => payload),
    ok: status >= 200 && status < 300,
    status
  } as unknown as Response;
}

describe("HttpPeacePadCoordinationApi", () => {
  it.each([
    ["rohvkyuxbnqzglaromms", "ca-central-1"],
    ["spmpndalcvwmygznihec", "us-east-1"]
  ])("pins approved project %s to Edge region %s", async (projectRef, functionRegion) => {
    const fetcher = jest.fn(async () => response(200, []));
    const api = new HttpPeacePadCoordinationApi({
      ...config,
      apiBaseUrl: `https://${projectRef}.supabase.co/functions/v1/peacepad-v2-api`
    }, fetcher, accessToken);

    await api.listConversations("family-current");

    expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.objectContaining({ "X-Region": functionRegion })
    }));
  });

  it("does not attach a managed Edge region to a local lab API", async () => {
    const fetcher = jest.fn(async () => response(200, []));
    const api = new HttpPeacePadCoordinationApi({ ...config, environment: "lab", apiBaseUrl: "http://127.0.0.1:8787" }, fetcher, accessToken);

    await api.listConversations("family-current");

    expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      headers: expect.not.objectContaining({ "X-Region": expect.anything() })
    }));
  });

  it("routes the complete v2 coordination contract through versioned endpoints", async () => {
    const fetcher = jest.fn(async (input: string, _init?: RequestInit) => response(200,
      input.endsWith("/api/v2/account") ? {
        identityId: context.actor.identityId,
        region: context.region,
        status: "deleted",
        deletedAt: "2026-08-09T12:00:00.000Z",
        version: 5,
        authIdentityDeleted: true,
        refreshSessionsRevoked: true,
        authCleanupPending: false
      } : {}
    ));
    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);
    const layer = {
      id: "layer-1",
      schemaVersion: "2.0" as const,
      version: 1,
      region: "ca" as const,
      provenance: {
        createdAt: "2026-07-31T12:00:00.000Z",
        createdBy: context.actor,
        source: "app" as const
      },
      familyCircleId: "family-current",
      ownerIdentityId: "identity-current",
      name: "Calls",
      kind: "calls" as const,
      icon: "phone" as const,
      colorToken: "blue" as const,
      visibility: { scope: "private" as const }
    };
    const event = {
      ...layer,
      id: "event-1",
      calendarLayerId: layer.id,
      childProfileIds: [],
      eventType: "appointment" as const,
      title: "Call",
      description: null,
      startsAt: "2026-08-01T12:00:00.000Z",
      endsAt: "2026-08-01T12:30:00.000Z",
      status: "planned" as const,
      recurrence: null,
      visibilityOverride: null
    };

    await api.createFamily("Fictional Family", context);
    await api.deleteAccount(context);
    await api.listCaseBinders("family-current");
    await api.createCaseBinder({
      familyCircleId: "family-current",
      name: "Parenting records",
      childLabel: "Child A"
    }, context);
    await api.archiveCaseBinder("binder-current", context);
    await api.listPrivateTimeline("binder-current", "2026-08-10T12:00:00.000Z", 25);
    await api.linkTimelineSource({
      familyCircleId: "family-current",
      caseBinderId: "binder-current",
      sourceKind: "message-event",
      sourceId: "message-1"
    }, context);
    await api.createInvitation({ familyCircleId: "family-current", invitedRole: "parent", permissions: ["messages"], expiresInHours: 24 }, context);
    await api.acceptInvitation("invitation-1", context);
    await api.declineInvitation("invitation-2", context);
    await api.revokeInvitation("invitation-3", context);
    await api.listCalendarLayers("family-current");
    await api.createCalendarLayer(layer, context);
    await api.updateCalendarLayer(layer, context);
    await api.deleteCalendarLayer(layer.id, context);
    await api.listScheduleEvents("family-current");
    await api.createScheduleEvent(event, context);
    await api.updateScheduleEvent(event, context);
    await api.deleteScheduleEvent(event.id, context);
    await api.listConversations("family-current");
    await api.createConversation({ familyCircleId: "family-current", participantIdentityIds: ["identity-current", "identity-other"] }, context);
    await api.listMessages("conversation-1");
    await api.sendMessage({ familyCircleId: "family-current", conversationId: "conversation-1", body: "Pickup at 5." }, context);
    await api.recordMessageLifecycle({ familyCircleId: "family-current", conversationId: "conversation-1", originalMessageEventId: "message-1", eventType: "viewed" }, context);
    await api.correctMessage({ familyCircleId: "family-current", conversationId: "conversation-1", originalMessageEventId: "message-1", body: "Pickup at 6." }, context);
    await api.searchMessages("conversation-1", "pickup time", 10);
    await api.getMessageCheckPreference("conversation-1");
    await api.setMessageCheckPreference("conversation-1", true, context);
    await api.previewMessage("conversation-1", " Pickup at 5. ");
    await api.createAttachmentUploadIntent({
      familyCircleId: "family-current",
      target: { kind: "private-binder", binderId: "binder-current" },
      originalFileName: "school-note.pdf",
      mediaType: "application/pdf",
      byteLength: 1024
    }, context);

    const urls = fetcher.mock.calls.map(([url]) => url);
    expect(urls).toEqual(expect.arrayContaining([
      "https://staging-api.peacepad.test/api/v2/families",
      "https://staging-api.peacepad.test/api/v2/account",
      "https://staging-api.peacepad.test/api/v2/case-binders?familyCircleId=family-current",
      "https://staging-api.peacepad.test/api/v2/case-binders",
      "https://staging-api.peacepad.test/api/v2/case-binders/binder-current",
      "https://staging-api.peacepad.test/api/v2/timeline-entries?caseBinderId=binder-current&limit=25&before=2026-08-10T12%3A00%3A00.000Z",
      "https://staging-api.peacepad.test/api/v2/timeline-entries",
      "https://staging-api.peacepad.test/api/v2/invitations",
      "https://staging-api.peacepad.test/api/v2/invitations/invitation-1/accept",
      "https://staging-api.peacepad.test/api/v2/calendar-layers?familyCircleId=family-current",
      "https://staging-api.peacepad.test/api/v2/schedule-events?familyCircleId=family-current",
      "https://staging-api.peacepad.test/api/v2/conversations?familyCircleId=family-current",
      "https://staging-api.peacepad.test/api/v2/conversations/conversation-1/messages",
      "https://staging-api.peacepad.test/api/v2/conversations/conversation-1/messages/message-1/events",
      "https://staging-api.peacepad.test/api/v2/conversations/conversation-1/messages/message-1/corrections",
      "https://staging-api.peacepad.test/api/v2/conversations/conversation-1/messages/search",
      "https://staging-api.peacepad.test/api/v2/conversations/conversation-1/message-check",
      "https://staging-api.peacepad.test/api/v2/message-previews",
      "https://staging-api.peacepad.test/api/v2/attachment-upload-intents"
    ]));
  });

  it("normalizes invitation codes without putting them in the URL", async () => {
    const fetcher = jest.fn(async (_input: string, _init?: RequestInit) =>
      response(200, { invitationId: "invitation-1" })
    );
    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);

    await api.resolveInvitation(" ca lm26 ");

    expect(fetcher).toHaveBeenCalledWith(
      "https://staging-api.peacepad.test/api/v2/invitations/resolve",
      expect.objectContaining({ method: "POST" })
    );
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({ code: "CALM26" });
  });

  it("rejects malformed invitation codes before a network request", async () => {
    const fetcher = jest.fn();
    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);

    await expect(api.resolveInvitation("short")).rejects.toEqual(
      new InvitationError("invalid", "Enter a valid six-character invitation code.")
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("adds region, schema, idempotency, and concurrency headers to writes", async () => {
    const fetcher = jest.fn(async (_input: string, _init?: RequestInit) => response(200, {}));
    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);

    await api.setMessageCheckPreference("conversation/1", true, context);

    expect(fetcher).toHaveBeenCalledWith(
      "https://staging-api.peacepad.test/api/v2/conversations/conversation%2F1/message-check",
      expect.objectContaining({ method: "PUT", credentials: "include" })
    );
    const headers = (fetcher.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(headers).toMatchObject({
      "Idempotency-Key": "intent-123",
      "If-Match": "4",
      "X-PeacePad-Region": "ca",
      "X-PeacePad-Schema-Version": "2.0"
    });
  });

  it.each([
    ["INVITATION_EXPIRED", "expired"],
    ["INVITATION_REVOKED", "revoked"],
    ["INVITATION_USED", "used"],
    ["INVITATION_INVALID", "invalid"],
    ["INVITATION_RATE_LIMITED", "rate-limited"]
  ] as const)("maps %s without leaking server details", async (code, reason) => {
    const api = new HttpPeacePadCoordinationApi(
      config,
      jest.fn(async (_input: string, _init?: RequestInit) =>
        response(409, { error: { code, message: "This invitation is unavailable.", requestId: "request-safe" } })
      ),
      accessToken
    );

    await expect(api.resolveInvitation("CALM26")).rejects.toMatchObject({ reason });
  });

  it("rejects blank message previews before a network request", async () => {
    const fetcher = jest.fn();
    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);
    await expect(api.previewMessage("conversation-1", "   ")).rejects.toMatchObject({ status: 400 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps invitation transport failures to a safe offline state", async () => {
    const api = new HttpPeacePadCoordinationApi(
      config,
      jest.fn(async (_input: string, _init?: RequestInit): Promise<Response> => {
        throw new Error("private network details");
      }),
      accessToken
    );
    await expect(api.resolveInvitation("CALM26")).rejects.toMatchObject({ reason: "offline" });
  });

  it("rejects unsafe message search bounds before a network request", async () => {
    const fetcher = jest.fn();
    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);
    await expect(api.searchMessages("conversation-1", "x")).rejects.toMatchObject({ status: 400 });
    await expect(api.searchMessages("conversation-1", "x".repeat(101))).rejects.toMatchObject({ status: 400 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps message search terms out of URLs", async () => {
    const fetcher = jest.fn(async (_input: string, _init?: RequestInit) => response(200, []));
    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);
    await api.searchMessages("conversation-1", "private pickup phrase", 7);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://staging-api.peacepad.test/api/v2/conversations/conversation-1/messages/search");
    expect(JSON.parse((fetcher.mock.calls[0]?.[1] as RequestInit).body as string)).toEqual({ query: "private pickup phrase", limit: 7 });
  });

  it("classifies message transport failures for the bounded retry outbox", async () => {
    const api = new HttpPeacePadCoordinationApi(
      config,
      jest.fn(async (): Promise<Response> => { throw new Error("private network details"); }),
      accessToken
    );
    await expect(api.sendMessage(
      { familyCircleId: "family-current", conversationId: "conversation-1", body: "Pickup at 5." },
      context
    )).rejects.toMatchObject({ kind: "network", message: "PeacePad cannot reach the staging service right now." });
  });

  it("fails closed without a secure staging session and sends bearer auth when present", async () => {
    const fetcher = jest.fn(async (_input: string, _init?: RequestInit) => response(200, {}));
    const missing = new HttpPeacePadCoordinationApi(config, fetcher);
    await expect(missing.listCalendarLayers("family-current")).rejects.toMatchObject({ kind: "auth-required" });
    expect(fetcher).not.toHaveBeenCalled();

    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);
    await api.listCalendarLayers("family-current");
    expect((fetcher.mock.calls[0]?.[1] as RequestInit).headers).toMatchObject({
      Authorization: `Bearer ${"a".repeat(48)}`
    });
  });

  it("maps an expired server session back to the secure sign-in flow", async () => {
    const api = new HttpPeacePadCoordinationApi(
      config,
      jest.fn(async () => response(401, { code: "UNAUTHENTICATED", message: "private server detail" })),
      accessToken
    );
    await expect(api.listCalendarLayers("family-current")).rejects.toMatchObject({
      kind: "auth-required",
      status: 401,
      message: "Your staging session expired. Sign in again."
    });
  });

  it("keeps private-record metadata in request bodies and sends no file bytes", async () => {
    const fetcher = jest.fn(async (_input: string, _init?: RequestInit) => response(200, {}));
    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);

    await api.createCaseBinder({
      familyCircleId: "family/current",
      name: "Parenting records",
      childLabel: "Child A"
    }, context);
    await api.archiveCaseBinder("binder/current", context);
    await api.createAttachmentUploadIntent({
      familyCircleId: "family-current",
      target: { kind: "private-binder", binderId: "binder-current" },
      originalFileName: "school-note.pdf",
      mediaType: "application/pdf",
      byteLength: 1024
    }, context);

    expect(fetcher.mock.calls[0]?.[0]).toBe("https://staging-api.peacepad.test/api/v2/case-binders");
    expect(JSON.parse((fetcher.mock.calls[0]?.[1] as RequestInit).body as string)).toEqual({
      familyCircleId: "family/current",
      name: "Parenting records",
      childLabel: "Child A"
    });
    expect(fetcher.mock.calls[1]?.[0]).toBe("https://staging-api.peacepad.test/api/v2/case-binders/binder%2Fcurrent");
    expect(JSON.parse((fetcher.mock.calls[1]?.[1] as RequestInit).body as string)).toEqual({ status: "archived" });
    const intentBody = JSON.parse((fetcher.mock.calls[2]?.[1] as RequestInit).body as string);
    expect(intentBody).toEqual({
      familyCircleId: "family-current",
      target: { kind: "private-binder", binderId: "binder-current" },
      originalFileName: "school-note.pdf",
      mediaType: "application/pdf",
      byteLength: 1024
    });
    expect(intentBody).not.toHaveProperty("bytes");
    expect(intentBody).not.toHaveProperty("base64");
    expect(intentBody).not.toHaveProperty("file");
  });

  it("uses content-free private timeline routes and write headers", async () => {
    const fetcher = jest.fn(async (_input: string, _init?: RequestInit) => response(200, {}));
    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);

    await api.listPrivateTimeline("binder/current", "2026-08-10T12:00:00.000Z", 40);
    await api.linkTimelineSource({
      familyCircleId: "family-current",
      caseBinderId: "binder-current",
      sourceKind: "schedule-event",
      sourceId: "event-current"
    }, context);

    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://staging-api.peacepad.test/api/v2/timeline-entries?caseBinderId=binder%2Fcurrent&limit=40&before=2026-08-10T12%3A00%3A00.000Z"
    );
    expect(fetcher.mock.calls[1]?.[0]).toBe("https://staging-api.peacepad.test/api/v2/timeline-entries");
    expect(JSON.parse((fetcher.mock.calls[1]?.[1] as RequestInit).body as string)).toEqual({
      familyCircleId: "family-current",
      caseBinderId: "binder-current",
      sourceKind: "schedule-event",
      sourceId: "event-current"
    });
    expect((fetcher.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject({
      "Idempotency-Key": context.idempotencyKey,
      "If-Match": String(context.expectedVersion),
      "X-PeacePad-Region": context.region
    });
  });

  it("validates an irreversible account-deletion receipt", async () => {
    const validReceipt = {
      identityId: context.actor.identityId,
      region: context.region,
      status: "deleted",
      deletedAt: "2026-08-09T12:00:00.000Z",
      version: 5,
      authIdentityDeleted: true,
      refreshSessionsRevoked: true,
      authCleanupPending: false
    };
    const fetcher = jest.fn(async () => response(200, validReceipt));
    const api = new HttpPeacePadCoordinationApi(config, fetcher, accessToken);
    await expect(api.deleteAccount(context)).resolves.toEqual(validReceipt);
    expect(fetcher).toHaveBeenCalledWith(
      "https://staging-api.peacepad.test/api/v2/account",
      expect.objectContaining({ method: "DELETE", body: undefined })
    );

    for (const invalid of [
      {},
      { ...validReceipt, identityId: "another-identity" },
      { ...validReceipt, region: "us" },
      { ...validReceipt, status: "pending" },
      { ...validReceipt, deletedAt: "not-a-date" },
      { ...validReceipt, version: 4 },
      { ...validReceipt, authCleanupPending: "false" }
    ]) {
      const invalidApi = new HttpPeacePadCoordinationApi(config, jest.fn(async () => response(200, invalid)), accessToken);
      await expect(invalidApi.deleteAccount(context)).rejects.toMatchObject({
        message: "PeacePad could not verify the account deletion receipt.",
        status: 502
      });
    }
  });
});
