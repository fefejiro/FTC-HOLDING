import { createWriteContext, type AuditEvent, type Conversation, type MessageCheckPreference, type MessageEvent } from "../domain/v2";
import { MessagingService, type MessagingStore } from "./MessagingService";
import { createHash } from "node:crypto";

class MemoryStore implements MessagingStore {
  conversations: Conversation[] = []; messages: MessageEvent[] = []; preferences: MessageCheckPreference[] = []; receipts = new Map<string,string>(); audits: AuditEvent[] = [];
  async transaction<T>(work: (store: MessagingStore) => Promise<T>): Promise<T> { return work(this); }
  async listConversations(family: string) { return this.conversations.filter((x) => x.familyCircleId === family); }
  async findConversation(id: string) { return this.conversations.find((x) => x.id === id); }
  async saveConversation(value: Conversation) { this.conversations.push(value); }
  async listMessages(id: string) { return this.messages.filter((x) => x.conversationId === id); }
  async appendMessage(value: MessageEvent) { this.messages.push(value); }
  async findPreference(identity: string, conversation: string) { return this.preferences.find((x) => x.identityId === identity && x.conversationId === conversation); }
  async savePreference(value: MessageCheckPreference) { this.preferences = [...this.preferences.filter((x) => x.id !== value.id), value]; }
  async findIdempotentResult(key: string) { return this.receipts.get(key); }
  async saveIdempotentResult(key: string, target: string) { this.receipts.set(key, target); }
  async appendAudit(value: AuditEvent) { this.audits.push(value); }
  async latestAudit() { return this.audits[this.audits.length - 1]; }
}

const digest = { digest: async (value: string) => createHash("sha256").update(value).digest("hex") };
const actor = { identityId: "parent-a", displayName: "Parent A", sessionId: "session-a", familyPermissions: { family: ["messages:read", "messages:write"] } } as const;
const context = (key: string, expectedVersion: number | null = null) => createWriteContext({ idempotencyKey: key, expectedVersion, region: "ca", actor: { identityId: actor.identityId, sessionId: actor.sessionId } });

describe("MessagingService", () => {
  const setup = () => { const store = new MemoryStore(); const service = new MessagingService({ store, digest, idempotencyPepper: "messaging-pepper-long", clock: { now: () => new Date("2026-08-04T12:00:00Z") } }); return { store, service }; };
  it("creates a participant-bound conversation idempotently", async () => {
    const { store, service } = setup(); const input = { familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] };
    const first = await service.createConversation(input, context("conversation"), actor); const second = await service.createConversation(input, context("conversation"), actor);
    expect(second.id).toBe(first.id); expect(store.conversations).toHaveLength(1); expect(store.audits[0]).toMatchObject({ action: "conversation.created" });
  });
  it("keeps sent records append-only and excludes bodies from audit events", async () => {
    const { store, service } = setup(); const conversation = await service.createConversation({ familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] }, context("c"), actor);
    const message = await service.sendMessage({ familyCircleId: "family", conversationId: conversation.id, body: "Pickup is at 6 PM." }, context("m"), actor);
    expect(await service.listMessages(conversation.id, actor)).toEqual([message]); expect(JSON.stringify(store.audits)).not.toContain("Pickup is at 6 PM.");
  });
  it("defaults Message Check off, persists it per participant, and rejects implied AI consent", async () => {
    const { service } = setup(); const conversation = await service.createConversation({ familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] }, context("c"), actor);
    await expect(service.getPreference(conversation.id, actor)).resolves.toMatchObject({ enabled: false, aiAssistanceEnabled: false });
    await expect(service.setPreference(conversation.id, true, true, context("bad"), actor)).rejects.toMatchObject({ status: 403 });
    await expect(service.setPreference(conversation.id, true, false, context("pref"), actor)).resolves.toMatchObject({ enabled: true, aiAssistanceEnabled: false, version: 1 });
  });
  it("does not reveal cross-family or non-participant conversations", async () => {
    const { service } = setup(); const conversation = await service.createConversation({ familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] }, context("c"), actor);
    const outsider = { ...actor, identityId: "outsider", sessionId: "other" };
    await expect(service.listMessages(conversation.id, outsider)).rejects.toMatchObject({ status: 404 });
  });
  it("provides a rule-based preview without creating a shared message", async () => {
    const { store, service } = setup(); const conversation = await service.createConversation({ familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] }, context("c"), actor);
    await expect(service.preview(conversation.id, "You never confirm anything!!", actor)).resolves.toMatchObject({ tone: "pause suggested", originalMessage: "You never confirm anything!!" });
    expect(store.messages).toHaveLength(0);
  });
});
