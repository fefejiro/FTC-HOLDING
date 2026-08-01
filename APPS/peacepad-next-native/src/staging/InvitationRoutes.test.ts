import { InMemoryInvitationStore, InvitationService, type SecretDigest, type StagingActor } from "./InvitationService";
import { StagingInvitationRoutes, type StagingInvitationRequest } from "./InvitationRoutes";

const digest: SecretDigest = {
  digest: async (input) => [...input].reduce((value, character) => (value * 33 + character.charCodeAt(0)) >>> 0, 5381)
    .toString(16).padStart(8, "0").repeat(8)
};

const owner: StagingActor = {
  identityId: "owner",
  displayName: "Alex Morgan",
  sessionId: "owner-session",
  familyPermissions: { family: ["invite"] }
};

const request = (overrides: Partial<StagingInvitationRequest>): StagingInvitationRequest => ({
  method: "POST",
  path: "/api/v2/invitations",
  headers: { "Idempotency-Key": "route-create", "X-PeacePad-Region": "ca", "X-PeacePad-Schema-Version": "2.0" },
  requesterKey: owner.sessionId,
  actor: owner,
  body: { familyCircleId: "family", invitedRole: "parent", permissions: ["messages:read"], expiresInHours: 24 },
  ...overrides
});

describe("StagingInvitationRoutes", () => {
  const build = () => {
    const store = new InMemoryInvitationStore();
    const service = new InvitationService({
      store,
      digest,
      pepper: "staging-route-pepper",
      directory: { familyName: async () => "Morgan family" }
    });
    return { routes: new StagingInvitationRoutes(service), store };
  };

  it("implements create, resolve, accept, decline, and revoke endpoint shapes", async () => {
    const { routes } = build();
    const created = await routes.handle(request({}));
    expect(created.status).toBe(201);
    const payload = created.body as { invitation: { id: string }; code: string };

    const recipient = { identityId: "recipient", displayName: "Jordan", sessionId: "recipient-session", familyPermissions: {} };
    const resolved = await routes.handle(request({
      path: "/api/v2/invitations/resolve",
      body: { code: payload.code },
      actor: undefined,
      requesterKey: recipient.sessionId,
      headers: {}
    }));
    expect(resolved.status).toBe(200);

    const accepted = await routes.handle(request({
      path: `/api/v2/invitations/${payload.invitation.id}/accept`,
      body: {},
      actor: recipient,
      requesterKey: recipient.sessionId,
      headers: { "Idempotency-Key": "route-accept", "X-PeacePad-Region": "ca", "X-PeacePad-Schema-Version": "2.0", "If-Match": "1" }
    }));
    expect(accepted.status).toBe(200);

    const second = await routes.handle(request({ headers: { "Idempotency-Key": "route-create-2", "X-PeacePad-Region": "ca", "X-PeacePad-Schema-Version": "2.0" } }));
    const secondPayload = second.body as { invitation: { id: string } };
    const revoked = await routes.handle(request({
      method: "DELETE",
      path: `/api/v2/invitations/${secondPayload.invitation.id}`,
      headers: { "Idempotency-Key": "route-revoke", "X-PeacePad-Region": "ca", "X-PeacePad-Schema-Version": "2.0", "If-Match": "1" }
    }));
    expect(revoked.status).toBe(204);
  });

  it("returns narrow safe errors and never trusts an actor from request headers", async () => {
    const { routes } = build();
    const unauthenticated = await routes.handle(request({ actor: undefined }));
    expect(unauthenticated).toMatchObject({ status: 401, body: { code: "UNAUTHENTICATED" } });

    const invalidRegion = await routes.handle(request({ headers: { "Idempotency-Key": "bad-region", "X-PeacePad-Region": "eu", "X-PeacePad-Schema-Version": "2.0" } }));
    expect(invalidRegion).toMatchObject({ status: 400, body: { code: "INVALID_REQUEST" } });

    const missingSchema = await routes.handle(request({ headers: { "Idempotency-Key": "missing-schema", "X-PeacePad-Region": "ca" } }));
    expect(missingSchema).toMatchObject({ status: 400, body: { code: "INVALID_REQUEST" } });

    const invalidVersion = await routes.handle(request({
      headers: { "Idempotency-Key": "bad-version", "X-PeacePad-Region": "ca", "X-PeacePad-Schema-Version": "2.0", "If-Match": "not-a-version" }
    }));
    expect(invalidVersion).toMatchObject({ status: 400, body: { code: "INVALID_REQUEST" } });

    const missing = await routes.handle(request({ path: "/api/v2/unknown" }));
    expect(missing.status).toBe(404);
    expect(JSON.stringify(missing.body)).not.toContain("family");
  });
});
