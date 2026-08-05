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
  it("routes the complete v2 coordination contract through versioned endpoints", async () => {
    const fetcher = jest.fn(async (_input: string, _init?: RequestInit) => response(200, {}));
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
    await api.previewMessage("conversation-1", " Pickup at 5. ");

    const urls = fetcher.mock.calls.map(([url]) => url);
    expect(urls).toEqual(expect.arrayContaining([
      "https://staging-api.peacepad.test/api/v2/invitations",
      "https://staging-api.peacepad.test/api/v2/invitations/invitation-1/accept",
      "https://staging-api.peacepad.test/api/v2/calendar-layers?familyCircleId=family-current",
      "https://staging-api.peacepad.test/api/v2/schedule-events?familyCircleId=family-current",
      "https://staging-api.peacepad.test/api/v2/message-previews"
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
        response(409, { code, message: "This invitation is unavailable." })
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
});
