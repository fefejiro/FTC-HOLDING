import { createHash } from "node:crypto";
import { createWriteContext, type AttachmentUploadIntent, type AuditEvent, type Conversation } from "../domain/v2";
import { AttachmentIntentService, type AttachmentIntentStore } from "./AttachmentIntentService";

class MemoryStore implements AttachmentIntentStore {
  conversations: Conversation[] = [];
  intents: AttachmentUploadIntent[] = [];
  receipts = new Map<string, string>();
  audits: AuditEvent[] = [];
  async transaction<T>(work: (store: AttachmentIntentStore) => Promise<T>): Promise<T> { return work(this); }
  async findConversation(id: string) { return this.conversations.find((value) => value.id === id); }
  async findIntent(id: string) { return this.intents.find((value) => value.id === id); }
  async saveIntent(value: AttachmentUploadIntent) { this.intents.push(value); }
  async findIdempotentResult(key: string) { return this.receipts.get(key); }
  async saveIdempotentResult(key: string, targetId: string) { this.receipts.set(key, targetId); }
  async appendAudit(value: AuditEvent) { this.audits.push(value); }
  async latestAudit() { return this.audits.at(-1); }
}

const digest = { digest: async (value: string) => createHash("sha256").update(value).digest("hex") };
const actor = {
  identityId: "parent-a", displayName: "Parent A", sessionId: "session-a",
  familyPermissions: { family: ["messages:write", "records:write"] }
} as const;
const context = (key: string) => createWriteContext({
  idempotencyKey: key, region: "ca", actor: { identityId: actor.identityId, sessionId: actor.sessionId }
});
const conversation: Conversation = {
  id: "conversation-1", schemaVersion: "2.0", version: 1, region: "ca",
  provenance: { createdAt: "2026-08-05T12:00:00.000Z", createdBy: context("seed").actor, source: "app" },
  familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"], status: "active"
};

describe("AttachmentIntentService", () => {
  const setup = () => {
    const store = new MemoryStore(); store.conversations.push(conversation);
    const service = new AttachmentIntentService({
      store, digest, idempotencyPepper: "attachment-intent-pepper",
      clock: { now: () => new Date("2026-08-05T12:00:00.000Z") }
    });
    return { store, service };
  };
  const input = {
    familyCircleId: "family", target: { kind: "conversation" as const, conversationId: conversation.id },
    originalFileName: "school-note.pdf", mediaType: "application/pdf" as const, byteLength: 1024
  };

  it("prepares idempotent metadata without enabling byte transport", async () => {
    const { store, service } = setup();
    const first = await service.create(input, context("create"), actor);
    const second = await service.create(input, context("create"), actor);
    expect(second).toEqual(first);
    expect(first).toMatchObject({
      status: "metadata-prepared", uploadTransport: "disabled", uploadUrl: null,
      expiresAt: "2026-08-05T12:10:00.000Z"
    });
    expect(store.intents).toHaveLength(1);
    expect(store.audits).toEqual([expect.objectContaining({ action: "attachment-intent.created" })]);
    expect(JSON.stringify(store.audits)).not.toContain("school-note.pdf");
  });

  it.each([
    [{ ...input, originalFileName: "../secret.pdf" }, /valid name/i],
    [{ ...input, mediaType: "application/zip" as never }, /not supported/i],
    [{ ...input, byteLength: 0 }, /between 1 byte/i],
    [{ ...input, byteLength: 25 * 1024 * 1024 + 1 }, /between 1 byte/i]
  ])("rejects unsafe metadata", async (unsafe, message) => {
    await expect(setup().service.create(unsafe, context("unsafe"), actor)).rejects.toThrow(message);
  });

  it("conceals inaccessible conversations and enforces target permissions", async () => {
    const { service } = setup();
    const outsider = { ...actor, identityId: "outsider", sessionId: "outsider-session" };
    const outsiderContext = createWriteContext({ idempotencyKey: "outsider", region: "ca", actor: { identityId: outsider.identityId, sessionId: outsider.sessionId } });
    await expect(service.create(input, outsiderContext, outsider)).rejects.toMatchObject({ status: 404 });
    const noRecords = { ...actor, familyPermissions: { family: ["messages:write"] } };
    await expect(service.create({ ...input, target: { kind: "private-binder", binderId: "binder-1" } }, context("binder"), noRecords)).rejects.toMatchObject({ status: 403 });
  });

  it("prepares private-binder metadata only for records writers", async () => {
    const intent = await setup().service.create({
      ...input, target: { kind: "private-binder", binderId: "binder-1" }
    }, context("binder-ok"), actor);
    expect(intent.target).toEqual({ kind: "private-binder", binderId: "binder-1" });
    expect(intent.uploadTransport).toBe("disabled");
  });
});
