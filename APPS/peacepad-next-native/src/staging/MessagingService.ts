import type { MessagePreviewResponse } from "../api/contracts";
import type { CreateConversationInput, SendMessageInput } from "../api/CoordinationApi";
import {
  PEACEPAD_V2_SCHEMA_VERSION,
  type AuditEvent,
  type Conversation,
  type MessageCheckPreference,
  type MessageEvent,
  type WriteContext
} from "../domain/v2";
import { ruleBasedMessagePreview } from "../messaging/ruleBasedMessagePreview";
import { InvitationServiceError, type SecretDigest, type StagingActor } from "./InvitationService";

export interface MessagingStore {
  transaction<T>(work: (store: MessagingStore) => Promise<T>): Promise<T>;
  listConversations(familyCircleId: string): Promise<readonly Conversation[]>;
  findConversation(id: string): Promise<Conversation | undefined>;
  saveConversation(value: Conversation): Promise<void>;
  listMessages(conversationId: string): Promise<readonly MessageEvent[]>;
  appendMessage(value: MessageEvent): Promise<void>;
  findPreference(identityId: string, conversationId: string): Promise<MessageCheckPreference | undefined>;
  savePreference(value: MessageCheckPreference, expectedVersion: number | null): Promise<void>;
  findIdempotentResult(key: string): Promise<string | undefined>;
  saveIdempotentResult(key: string, targetId: string): Promise<void>;
  appendAudit(event: AuditEvent): Promise<void>;
  latestAudit(): Promise<AuditEvent | undefined>;
}

type Options = Readonly<{ store: MessagingStore; digest: SecretDigest; idempotencyPepper: string; clock?: { now(): Date } }>;

export class MessagingService {
  private readonly clock: { now(): Date };
  constructor(private readonly options: Options) {
    if (options.idempotencyPepper.trim().length < 16) throw new Error("Messaging requires a server-only idempotency pepper.");
    this.clock = options.clock ?? { now: () => new Date() };
  }

  async listConversations(familyCircleId: string, actor: StagingActor) {
    this.assertPermission(actor, familyCircleId, "messages:read");
    return (await this.options.store.listConversations(familyCircleId)).filter((value) => this.isParticipant(value, actor));
  }

  async createConversation(input: CreateConversationInput, context: WriteContext, actor: StagingActor) {
    this.assertContext(context, actor);
    this.assertPermission(actor, input.familyCircleId, "messages:write");
    const participants = [...new Set(input.participantIdentityIds.map((id) => id.trim()).filter(Boolean))];
    if (participants.length < 2 || !participants.includes(actor.identityId)) {
      throw new InvitationServiceError("INVALID_REQUEST", "Choose at least two conversation participants.", 400);
    }
    return this.options.store.transaction(async (store) => {
      const operation = await this.operationHash("conversation.create", context);
      const prior = await store.findIdempotentResult(operation);
      if (prior) {
        const existing = await store.findConversation(prior);
        if (!existing) throw new Error("Conversation receipt points to a missing record.");
        return existing;
      }
      const id = await this.entityId("conversation", input.familyCircleId, context);
      const conversation: Conversation = {
        id, schemaVersion: PEACEPAD_V2_SCHEMA_VERSION, version: 1, region: context.region,
        provenance: { createdAt: this.clock.now().toISOString(), createdBy: context.actor, source: "app" },
        familyCircleId: input.familyCircleId, participantIdentityIds: participants, status: "active"
      };
      await store.saveConversation(conversation);
      await store.saveIdempotentResult(operation, id);
      await this.audit("conversation.created", "Conversation", id, context, { participantCount: participants.length }, store);
      return conversation;
    });
  }

  async listMessages(conversationId: string, actor: StagingActor) {
    const conversation = await this.requireConversation(conversationId, actor, "messages:read");
    return this.options.store.listMessages(conversation.id);
  }

  async sendMessage(input: SendMessageInput, context: WriteContext, actor: StagingActor) {
    this.assertContext(context, actor);
    const body = input.body.trim();
    if (!body || body.length > 10000) throw new InvitationServiceError("INVALID_REQUEST", "Enter a message under 10,000 characters.", 400);
    const conversation = await this.requireConversation(input.conversationId, actor, "messages:write");
    if (conversation.familyCircleId !== input.familyCircleId) throw new InvitationServiceError("NOT_FOUND", "Conversation not found.", 404);
    return this.options.store.transaction(async (store) => {
      const operation = await this.operationHash("message.send", context);
      const prior = await store.findIdempotentResult(operation);
      if (prior) {
        const existing = (await store.listMessages(conversation.id)).find((item) => item.id === prior);
        if (!existing) throw new Error("Message receipt points to a missing record.");
        return existing;
      }
      const id = await this.entityId("message", conversation.id, context);
      const occurredAt = this.clock.now().toISOString();
      const message: MessageEvent = {
        id, schemaVersion: PEACEPAD_V2_SCHEMA_VERSION, version: 1, region: context.region,
        provenance: { createdAt: occurredAt, createdBy: context.actor, source: "app" },
        familyCircleId: conversation.familyCircleId, conversationId: conversation.id,
        eventType: "sent", originalMessageEventId: null, body, occurredAt
      };
      await store.appendMessage(message);
      await store.saveIdempotentResult(operation, id);
      await this.audit("message.sent", "MessageEvent", id, context, { conversationId: conversation.id, bodyLength: body.length }, store);
      return message;
    });
  }

  async getPreference(conversationId: string, actor: StagingActor) {
    const conversation = await this.requireConversation(conversationId, actor, "messages:read");
    return (await this.options.store.findPreference(actor.identityId, conversationId)) ?? this.defaultPreference(actor, conversationId, conversation.region);
  }

  async setPreference(conversationId: string, enabled: boolean, aiAssistanceEnabled: boolean, context: WriteContext, actor: StagingActor) {
    this.assertContext(context, actor);
    if (aiAssistanceEnabled) throw new InvitationServiceError("FORBIDDEN", "AI assistance requires separate consent.", 403);
    await this.requireConversation(conversationId, actor, "messages:read");
    return this.options.store.transaction(async (store) => {
      const operation = await this.operationHash("message-check.set", context);
      const prior = await store.findIdempotentResult(operation);
      if (prior) return (await store.findPreference(actor.identityId, conversationId)) ?? this.defaultPreference(actor, conversationId, context.region);
      const current = await store.findPreference(actor.identityId, conversationId);
      if (current && context.expectedVersion !== current.version) throw new InvitationServiceError("VERSION_CONFLICT", "This setting changed. Refresh and try again.", 409);
      const value: MessageCheckPreference = {
        ...(current ?? this.defaultPreference(actor, conversationId, context.region)),
        version: (current?.version ?? 0) + 1, enabled, aiAssistanceEnabled: false
      };
      await store.savePreference(value, current?.version ?? null);
      await store.saveIdempotentResult(operation, value.id);
      await this.audit("message-check.updated", "MessageCheckPreference", value.id, context, { enabled }, store);
      return value;
    });
  }

  async preview(conversationId: string, content: string, actor: StagingActor): Promise<MessagePreviewResponse> {
    await this.requireConversation(conversationId, actor, "messages:read");
    if (!content.trim() || content.length > 10000) throw new InvitationServiceError("INVALID_REQUEST", "Enter a message under 10,000 characters.", 400);
    return ruleBasedMessagePreview(content);
  }

  private defaultPreference(actor: StagingActor, conversationId: string, region: "ca" | "us"): MessageCheckPreference {
    const now = this.clock.now().toISOString();
    return {
      id: `message-check-${actor.identityId}-${conversationId}`, schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
      version: 0, region, provenance: { createdAt: now, createdBy: { identityId: actor.identityId, sessionId: actor.sessionId }, source: "app" },
      identityId: actor.identityId, conversationId, enabled: false, aiAssistanceEnabled: false
    };
  }

  private async requireConversation(id: string, actor: StagingActor, permission: "messages:read" | "messages:write") {
    const value = await this.options.store.findConversation(id);
    if (!value || !this.isParticipant(value, actor)) throw new InvitationServiceError("NOT_FOUND", "Conversation not found.", 404);
    this.assertPermission(actor, value.familyCircleId, permission);
    return value;
  }

  private isParticipant(value: Conversation, actor: StagingActor) { return value.participantIdentityIds.includes(actor.identityId); }
  private assertContext(context: WriteContext, actor: StagingActor) {
    if (context.actor.identityId !== actor.identityId || context.actor.sessionId !== actor.sessionId) throw new InvitationServiceError("UNAUTHENTICATED", "A valid staging session is required.", 401);
  }
  private assertPermission(actor: StagingActor, family: string, permission: "messages:read" | "messages:write") {
    const values = actor.familyPermissions[family] ?? [];
    if (!values.includes(permission) && !(permission === "messages:read" && values.includes("messages:write"))) throw new InvitationServiceError("FORBIDDEN", "You cannot access those family messages.", 403);
  }
  private operationHash(action: string, context: WriteContext) { return this.options.digest.digest(`${this.options.idempotencyPepper}:${context.region}:${context.actor.identityId}:${action}:${context.idempotencyKey}`); }
  private async entityId(prefix: string, scope: string, context: WriteContext) { const hash = await this.options.digest.digest(`${prefix}:${scope}:${context.actor.identityId}:${context.idempotencyKey}`); return `${prefix}_${hash.slice(0, 20)}`; }
  private async audit(action: string, targetType: string, targetId: string, context: WriteContext, payload: unknown, store: MessagingStore) {
    const previous = await store.latestAudit(); const occurredAt = this.clock.now().toISOString(); const payloadHash = await this.options.digest.digest(JSON.stringify(payload));
    const sequence = (previous?.sequence ?? 0) + 1; const previousEventHash = previous?.eventHash ?? null;
    const eventHash = await this.options.digest.digest(JSON.stringify({ schemaVersion: PEACEPAD_V2_SCHEMA_VERSION, region: context.region, sequence, occurredAt, actor: context.actor, action, targetType, targetId, previousEventHash, payloadHash }));
    await store.appendAudit({ id: `audit_${eventHash.slice(0, 20)}`, schemaVersion: PEACEPAD_V2_SCHEMA_VERSION, region: context.region, sequence, occurredAt, actor: context.actor, action, targetType, targetId, previousEventHash, eventHash, payloadHash });
  }
}
