import type { StagingActor } from "./InvitationService";
import type { StagingInvitationRequest, StagingInvitationResponse } from "./InvitationRoutes";
import { TrustedInvitationHttpBridge } from "./TrustedInvitationHttpBridge";

const actor: StagingActor = {
  identityId: "trusted-owner",
  displayName: "Alex Morgan",
  sessionId: "trusted-session",
  familyPermissions: { family: ["invite"] }
};

describe("TrustedInvitationHttpBridge", () => {
  it("constructs the actor only from a verified bearer session", async () => {
    const handle = jest.fn(async (request: StagingInvitationRequest): Promise<StagingInvitationResponse> => ({
      status: 200,
      body: { identityId: request.actor?.identityId }
    }));
    const authenticate = jest.fn(async (token: string) => token === "valid-session" ? actor : undefined);
    const bridge = new TrustedInvitationHttpBridge({ handle } as never, { authenticate });

    const response = await bridge.handle({
      method: "POST",
      path: "/api/v2/invitations",
      body: {},
      requesterKey: "device-key",
      headers: {
        Authorization: "Bearer valid-session",
        "X-PeacePad-Actor": "spoofed-owner"
      }
    });

    expect(response).toEqual({ status: 200, body: { identityId: "trusted-owner" } });
    expect(authenticate).toHaveBeenCalledWith("valid-session");
    expect(handle.mock.calls[0][0].actor).toEqual(actor);
  });

  it("does not manufacture an actor from spoofable headers or invalid tokens", async () => {
    const handle = jest.fn(async (request: StagingInvitationRequest): Promise<StagingInvitationResponse> => ({
      status: request.actor ? 200 : 401,
      body: {}
    }));
    const bridge = new TrustedInvitationHttpBridge({ handle } as never, { authenticate: async () => undefined });

    await expect(bridge.handle({
      method: "POST",
      path: "/api/v2/invitations",
      body: {},
      requesterKey: "device-key",
      headers: { "X-PeacePad-Actor": "spoofed-owner" }
    })).resolves.toMatchObject({ status: 401 });

    await expect(bridge.handle({
      method: "POST",
      path: "/api/v2/invitations",
      body: {},
      requesterKey: "device-key",
      headers: { Authorization: "Bearer invalid-session" }
    })).resolves.toMatchObject({ status: 401 });
  });

  it("returns only the verified synthetic session profile", async () => {
    const bridge = new TrustedInvitationHttpBridge(
      { handle: jest.fn() } as never,
      { authenticate: async (token) => token === "valid-session" ? actor : undefined }
    );
    await expect(bridge.session({ Authorization: "Bearer valid-session" })).resolves.toEqual({
      status: 200,
      body: {
        identityId: "trusted-owner",
        displayName: "Alex Morgan",
        familyIds: ["family"]
      }
    });
    await expect(bridge.session({ Authorization: "Bearer invalid-session" })).resolves.toMatchObject({ status: 401 });
  });
});
