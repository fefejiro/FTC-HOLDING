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
const recipient = { identityId: "parent-b", displayName: "Parent B", sessionId: "session-b", familyPermissions: { family: ["messages:read", "messages:write"] } } as const;
const recipientContext = (key: string) => createWriteContext({ idempotencyKey: key, region: "ca", actor: { identityId: recipient.identityId, sessionId: recipient.sessionId } });

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
  it("appends recipient delivery and view receipts without duplicating message content", async () => {
    const { store, service } = setup();
    const conversation = await service.createConversation({ familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] }, context("c"), actor);
    const message = await service.sendMessage({ familyCircleId: "family", conversationId: conversation.id, body: "Pickup is at 6 PM." }, context("m"), actor);
    const delivered = await service.recordLifecycle({ familyCircleId: "family", conversationId: conversation.id, originalMessageEventId: message.id, eventType: "delivered" }, recipientContext("delivered"), recipient);
    const viewed = await service.recordLifecycle({ familyCircleId: "family", conversationId: conversation.id, originalMessageEventId: message.id, eventType: "viewed" }, recipientContext("viewed"), recipient);
    await expect(service.recordLifecycle({ familyCircleId: "family", conversationId: conversation.id, originalMessageEventId: message.id, eventType: "viewed" }, recipientContext("viewed-again"), recipient)).resolves.toEqual(viewed);
    expect([delivered, viewed]).toEqual([
      expect.objectContaining({ eventType: "delivered", originalMessageEventId: message.id, body: null }),
      expect.objectContaining({ eventType: "viewed", originalMessageEventId: message.id, body: null })
    ]);
    expect(store.messages).toHaveLength(3);
    expect(JSON.stringify(store.audits)).not.toContain("Pickup is at 6 PM.");
  });
  it("prevents senders and outsiders from manufacturing lifecycle receipts", async () => {
    const { service } = setup();
    const conversation = await service.createConversation({ familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] }, context("c"), actor);
    const message = await service.sendMessage({ familyCircleId: "family", conversationId: conversation.id, body: "Synthetic message" }, context("m"), actor);
    const input = { familyCircleId: "family", conversationId: conversation.id, originalMessageEventId: message.id, eventType: "viewed" as const };
    await expect(service.recordLifecycle(input, context("self-view"), actor)).rejects.toMatchObject({ status: 403 });
    const outsider = { ...recipient, identityId: "outsider", sessionId: "outsider-session" };
    await expect(service.recordLifecycle(input, createWriteContext({ idempotencyKey: "outsider", region: "ca", actor: { identityId: outsider.identityId, sessionId: outsider.sessionId } }), outsider)).rejects.toMatchObject({ status: 404 });
  });
  it("appends sender-only corrections while preserving the original record and excluding content from audit", async () => {
    const { store, service } = setup();
    const conversation = await service.createConversation({ familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] }, context("c"), actor);
    const original = await service.sendMessage({ familyCircleId: "family", conversationId: conversation.id, body: "Pickup is at 5 PM." }, context("m"), actor);
    const input = { familyCircleId: "family", conversationId: conversation.id, originalMessageEventId: original.id, body: "Pickup is at 6 PM." };
    const correction = await service.correctMessage(input, context("correction"), actor);
    await expect(service.correctMessage(input, context("correction"), actor)).resolves.toEqual(correction);
    expect(store.messages).toEqual([
      expect.objectContaining({ id: original.id, eventType: "sent", body: "Pickup is at 5 PM.", originalMessageEventId: null }),
      expect.objectContaining({ id: correction.id, eventType: "correction", body: "Pickup is at 6 PM.", originalMessageEventId: original.id })
    ]);
    expect(JSON.stringify(store.audits)).not.toContain("Pickup is at 6 PM.");
  });
  it("prevents recipients from correcting a sender's message", async () => {
    const { service } = setup();
    const conversation = await service.createConversation({ familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] }, context("c"), actor);
    const original = await service.sendMessage({ familyCircleId: "family", conversationId: conversation.id, body: "Pickup is at 5 PM." }, context("m"), actor);
    await expect(service.correctMessage({
      familyCircleId: "family", conversationId: conversation.id, originalMessageEventId: original.id, body: "Changed by recipient"
    }, recipientContext("recipient-correction"), recipient)).rejects.toMatchObject({ status: 403 });
  });
  it("searches only effective message text for authorized conversation participants", async () => {
    const { service } = setup();
    const conversation = await service.createConversation({ familyCircleId: "family", participantIdentityIds: ["parent-a", "parent-b"] }, context("c"), actor);
    const original = await service.sendMessage({ familyCircleId: "family", conversationId: conversation.id, body: "Pickup is at five." }, context("m"), actor);
    await service.correctMessage({ familyCircleId: "family", conversationId: conversation.id, originalMessageEventId: original.id, body: "Pickup is at six." }, context("correction"), actor);
    await expect(service.searchMessages(conversation.id, "SIX", 20, recipient)).resolves.toEqual([
      expect.objectContaining({ originalMessageEventId: original.id, body: "Pickup is at six.", corrected: true })
    ]);
    await expect(service.searchMessages(conversation.id, "five", 20, recipient)).resolves.toEqual([]);
    await expect(service.searchMessages(conversation.id, "x", 20, recipient)).rejects.toMatchObject({ status: 400 });
    const outsider = { ...recipient, identityId: "outsider", sessionId: "outsider-session" };
    await expect(service.searchMessages(conversation.id, "six", 20, outsider)).rejects.toMatchObject({ status: 404 });
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
