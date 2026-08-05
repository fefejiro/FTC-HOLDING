import { PEACEPAD_V2_SCHEMA_VERSION, type CaseBinder } from "../domain/v2";
import { AttachmentIntentError, MetadataAttachmentService } from "./MetadataAttachmentService";

const actor = { identityId: "identity-a", familyCircleId: "family-a", sessionId: "session-a" };
const binder: CaseBinder = {
  id: "binder-a", schemaVersion: PEACEPAD_V2_SCHEMA_VERSION, version: 1, region: "ca",
  familyCircleId: "family-a", ownerIdentityId: "identity-a", name: "Family records", childLabel: "Child A", status: "active",
  provenance: { createdAt: "2026-08-05T12:00:00.000Z", createdBy: actor, source: "app" }
};
const request = {
  familyCircleId: "family-a", ownerIdentityId: "identity-a", target: { kind: "private-binder" as const, binderId: "binder-a" },
  originalFileName: "school-note.pdf", mediaType: "application/pdf" as const,
  byteLength: 1200, idempotencyKey: "intent-key-1"
};

describe("metadata-only attachment preparation", () => {
  it("returns disabled transport, null URL, and a bounded expiry", () => {
    const service = new MetadataAttachmentService(actor, () => new Date("2026-08-05T12:00:00.000Z"));
    service.registerBinder(binder);
    expect(service.prepare(request)).toMatchObject({
      status: "metadata-prepared", uploadTransport: "disabled", uploadUrl: null,
      expiresAt: "2026-08-05T12:15:00.000Z"
    });
  });

  it("replays the same idempotent request and rejects conflicting reuse", () => {
    const service = new MetadataAttachmentService(actor);
    service.registerBinder(binder);
    const first = service.prepare(request);
    expect(service.prepare(request)).toBe(first);
    expect(() => service.prepare({ ...request, originalFileName: "different.pdf" })).toThrow(AttachmentIntentError);
  });

  it.each([
    [{ ...request, originalFileName: "../secret.pdf" }, "invalid-request"],
    [{ ...request, byteLength: 0 }, "size-limit"],
    [{ ...request, byteLength: 25 * 1024 * 1024 + 1 }, "size-limit"],
    [{ ...request, mediaType: "application/zip" as never }, "unsupported-media-type"],
    [{ ...request, idempotencyKey: "short" }, "invalid-request"]
  ])("rejects malformed or unsafe metadata", (unsafe, code) => {
    const service = new MetadataAttachmentService(actor);
    service.registerBinder(binder);
    try { service.prepare(unsafe); throw new Error("expected rejection"); }
    catch (error) { expect(error).toMatchObject({ code }); }
  });

  it("rejects cross-family and cross-owner access", () => {
    const service = new MetadataAttachmentService(actor);
    service.registerBinder(binder);
    expect(() => service.prepare({ ...request, familyCircleId: "family-b" })).toThrow("cannot prepare metadata");
    expect(() => service.prepare({ ...request, ownerIdentityId: "identity-b" })).toThrow("cannot prepare metadata");
    expect(() => service.prepare({ ...request, target: { kind: "private-binder", binderId: "missing" } })).toThrow("not found");
    expect(() => service.prepare({ ...request, target: { kind: "conversation", conversationId: "conversation-a" } })).toThrow("not available");
  });

  it("rejects registration of a binder outside the active family", () => {
    const service = new MetadataAttachmentService(actor);
    expect(() => service.registerBinder({ ...binder, familyCircleId: "family-b" })).toThrow("does not belong");
  });
});
