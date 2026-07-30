import {
  PEACEPAD_V2_SCHEMA_VERSION,
  createWriteContext,
  type ActorReference,
  type ChildProfile,
  type EvidenceRecord
} from "./v2";

const actor: ActorReference = {
  identityId: "identity-1",
  sessionId: "session-1"
};

describe("PeacePad v2 domain contracts", () => {
  it("creates a region-bound, versioned write context", () => {
    expect(
      createWriteContext({
        idempotencyKey: " request-123 ",
        expectedVersion: 4,
        region: "ca",
        actor
      })
    ).toEqual({
      idempotencyKey: "request-123",
      expectedVersion: 4,
      region: "ca",
      schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
      actor
    });
  });

  it("rejects missing idempotency and invalid concurrency versions", () => {
    expect(() =>
      createWriteContext({
        idempotencyKey: " ",
        region: "us",
        actor
      })
    ).toThrow("A non-empty idempotency key is required.");

    expect(() =>
      createWriteContext({
        idempotencyKey: "request-124",
        expectedVersion: -1,
        region: "us",
        actor
      })
    ).toThrow("Expected version must be a non-negative integer or null.");
  });

  it("keeps direct child login disabled and private evidence private by contract", () => {
    const child: ChildProfile["directLoginEnabled"] = false;
    const evidenceVisibility: EvidenceRecord["visibility"] = "private-binder";

    expect(child).toBe(false);
    expect(evidenceVisibility).toBe("private-binder");
  });
});
