import { createWriteContext } from "../domain/v2";
import {
  InMemoryInvitationStore,
  InvitationService,
  InvitationServiceError,
  type Clock,
  type SecretDigest,
  type StagingActor
} from "./InvitationService";

class TestDigest implements SecretDigest {
  async digest(input: string) {
    let value = 2166136261;
    for (const character of input) {
      value ^= character.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return Math.abs(value >>> 0).toString(16).padStart(8, "0").repeat(8);
  }
}

const owner: StagingActor = {
  identityId: "identity-owner",
  displayName: "Alex Morgan",
  sessionId: "session-owner",
  familyPermissions: { "family-1": ["invite"] }
};
const recipient: StagingActor = {
  identityId: "identity-recipient",
  displayName: "Jordan Lee",
  sessionId: "session-recipient",
  familyPermissions: {}
};

const context = (actor: StagingActor, key: string, expectedVersion: number | null = null, region: "ca" | "us" = "ca") =>
  createWriteContext({
    idempotencyKey: key,
    expectedVersion,
    region,
    actor: { identityId: actor.identityId, sessionId: actor.sessionId }
  });

const input = {
  familyCircleId: "family-1",
  invitedRole: "parent" as const,
  permissions: ["messages:read", "calendar:read"],
  expiresInHours: 24
};

function setup(options: { maxResolveAttempts?: number; maxCreateAttempts?: number; now?: Date } = {}) {
  let now = options.now ?? new Date("2026-08-01T12:00:00.000Z");
  const clock: Clock = { now: () => now };
  const store = new InMemoryInvitationStore();
  const service = new InvitationService({
    store,
    clock,
    digest: new TestDigest(),
    directory: { familyName: async (id) => id === "family-1" ? "Morgan family" : undefined },
    pepper: "staging-secret-pepper-only",
    maxResolveAttempts: options.maxResolveAttempts ?? 8,
    maxCreateAttempts: options.maxCreateAttempts ?? 5
  });
  return { service, store, advance: (milliseconds: number) => { now = new Date(now.getTime() + milliseconds); } };
}

describe("InvitationService", () => {
  it("creates an expiring invitation without storing its plaintext code", async () => {
    const { service, store } = setup();
    const created = await service.create(input, context(owner, "create-1"), owner);

    expect(created.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(created.deepLink).toBe(`https://peacepad.ca/invite/${created.code}`);
    const stored = store.invitations.get(created.invitation.id)!;
    expect(stored.codeHash).not.toContain(created.code);
    expect(JSON.stringify(stored)).not.toContain(created.code);
    expect(stored.invitation.permissions).toEqual(["messages:read", "calendar:read"]);
    expect(store.auditEvents.map((event) => event.action)).toEqual(["invitation.created"]);
  });

  it("replays create idempotently without storing a secret response", async () => {
    const { service, store } = setup();
    const first = await service.create(input, context(owner, "same-intent"), owner);
    const replay = await service.create(input, context(owner, "same-intent"), owner);

    expect(replay).toEqual(first);
    expect(store.invitations.size).toBe(1);
    expect(store.auditEvents).toHaveLength(1);
  });

  it("requires authenticated family invitation permission", async () => {
    const { service } = setup();
    await expect(service.create(input, context(recipient, "forbidden"), recipient)).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403
    });
    await expect(service.create(input, context(owner, "mismatch"), recipient)).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401
    });
  });

  it("reveals preview only after a valid code resolves", async () => {
    const { service } = setup();
    const created = await service.create(input, context(owner, "preview"), owner);

    await expect(service.resolve("BAD", recipient.sessionId)).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    await expect(service.resolve("AAAAAA", recipient.sessionId)).rejects.toMatchObject({ code: "INVITATION_INVALID" });
    await expect(service.resolve(created.code, recipient.sessionId)).resolves.toEqual({
      invitationId: created.invitation.id,
      inviterDisplayName: "Alex Morgan",
      familyDisplayName: "Morgan family",
      invitedRole: "parent",
      permissions: ["messages:read", "calendar:read"],
      expiresAt: created.invitation.expiresAt
    });
  });

  it("requires proof of code resolution before acceptance", async () => {
    const { service } = setup();
    const created = await service.create(input, context(owner, "claim"), owner);
    await expect(service.accept(created.invitation.id, context(recipient, "accept", 1), recipient)).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });

  it("accepts once, creates a grant, and replays the same intent safely", async () => {
    const { service, store } = setup();
    const created = await service.create(input, context(owner, "accept-once"), owner);
    await service.resolve(created.code, recipient.sessionId);
    const write = context(recipient, "accept-once", 1);
    const grant = await service.accept(created.invitation.id, write, recipient);
    const replay = await service.accept(created.invitation.id, write, recipient);

    expect(replay).toEqual(grant);
    expect(store.grants.size).toBe(1);
    expect(store.invitations.get(created.invitation.id)?.invitation.status).toBe("accepted");
    expect(store.auditEvents.map((event) => event.action)).toEqual(["invitation.created", "invitation.accepted"]);
    expect(store.auditEvents[1].previousEventHash).toBe(store.auditEvents[0].eventHash);

    await expect(
      service.accept(created.invitation.id, context(recipient, "different-intent", 2), recipient)
    ).rejects.toMatchObject({ code: "INVITATION_USED" });
  });

  it("enforces expiry, region binding, optimistic concurrency, and sender restrictions", async () => {
    const expiry = setup();
    const expiring = await expiry.service.create({ ...input, expiresInHours: 1 }, context(owner, "expires"), owner);
    expiry.advance(3_600_001);
    await expect(expiry.service.resolve(expiring.code, recipient.sessionId)).rejects.toMatchObject({ code: "INVITATION_EXPIRED" });

    const region = setup();
    const created = await region.service.create(input, context(owner, "region"), owner);
    await region.service.resolve(created.code, recipient.sessionId);
    await expect(
      region.service.accept(created.invitation.id, context(recipient, "wrong-region", 1, "us"), recipient)
    ).rejects.toMatchObject({ code: "REGION_MISMATCH" });
    await expect(
      region.service.accept(created.invitation.id, context(recipient, "wrong-version", 9), recipient)
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });

    await region.service.resolve(created.code, owner.sessionId);
    await expect(
      region.service.accept(created.invitation.id, context(owner, "self-accept", 1), owner)
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rate-limits code resolution without disclosing account data", async () => {
    const { service } = setup({ maxResolveAttempts: 2 });
    for (const code of ["AAAAAA", "BBBBBB"]) {
      await expect(service.resolve(code, "abusive-client")).rejects.toBeInstanceOf(InvitationServiceError);
    }
    await expect(service.resolve("CCCCCC", "abusive-client")).rejects.toMatchObject({
      code: "INVITATION_RATE_LIMITED",
      status: 429
    });
  });

  it("rate-limits authenticated invitation creation independently", async () => {
    const { service } = setup({ maxCreateAttempts: 2 });
    await expect(service.create(input, context(owner, "create-rate-1"), owner)).resolves.toBeDefined();
    await expect(service.create(input, context(owner, "create-rate-2"), owner)).resolves.toBeDefined();
    await expect(service.create(input, context(owner, "create-rate-3"), owner)).rejects.toMatchObject({
      code: "INVITATION_RATE_LIMITED",
      status: 429
    });
  });

  it("supports explicit decline and authorized revocation with idempotent audit writes", async () => {
    const declined = setup();
    const first = await declined.service.create(input, context(owner, "decline-create"), owner);
    await declined.service.resolve(first.code, recipient.sessionId);
    await declined.service.decline(first.invitation.id, context(recipient, "decline", 1), recipient);
    await declined.service.decline(first.invitation.id, context(recipient, "decline", 1), recipient);
    expect(declined.store.invitations.get(first.invitation.id)?.invitation.status).toBe("declined");
    expect(declined.store.auditEvents).toHaveLength(2);

    const revoked = setup();
    const second = await revoked.service.create(input, context(owner, "revoke-create"), owner);
    await revoked.service.revoke(second.invitation.id, context(owner, "revoke", 1), owner);
    await revoked.service.revoke(second.invitation.id, context(owner, "revoke", 1), owner);
    expect(revoked.store.invitations.get(second.invitation.id)?.invitation.status).toBe("revoked");
    expect(revoked.store.auditEvents).toHaveLength(2);
  });

  it("rejects an attempt to break the append-only audit sequence", async () => {
    const { store } = setup();
    await expect(store.appendAudit({
      id: "audit-invalid",
      schemaVersion: "2.0",
      region: "ca",
      sequence: 2,
      occurredAt: "2026-08-01T12:00:00.000Z",
      actor: { identityId: "service", sessionId: "service" },
      action: "invitation.created",
      targetType: "FamilyInvitation",
      targetId: "invitation",
      previousEventHash: null,
      eventHash: "hash",
      payloadHash: "payload"
    })).rejects.toThrow("Append-only audit chain violation");
  });

  it("rolls back every invitation write when the audit append fails", async () => {
    const { service, store } = setup();
    jest.spyOn(store, "appendAudit").mockRejectedValueOnce(new Error("audit unavailable"));

    await expect(service.create(input, context(owner, "rollback"), owner)).rejects.toThrow("audit unavailable");
    expect(store.invitations.size).toBe(0);
    expect(store.idempotency.size).toBe(0);
    expect(store.auditEvents).toHaveLength(0);
  });
});
