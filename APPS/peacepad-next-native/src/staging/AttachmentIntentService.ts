import type { CreateAttachmentUploadIntentInput } from "../api/CoordinationApi";
import {
  PEACEPAD_V2_SCHEMA_VERSION,
  type AttachmentUploadIntent,
  type AuditEvent,
  type Conversation,
  type WriteContext
} from "../domain/v2";
import { InvitationServiceError, type SecretDigest, type StagingActor } from "./InvitationService";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Set<AttachmentUploadIntent["mediaType"]>([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/plain"
]);

export interface AttachmentIntentStore {
  transaction<T>(work: (store: AttachmentIntentStore) => Promise<T>): Promise<T>;
  findConversation(id: string): Promise<Conversation | undefined>;
  findIntent(id: string): Promise<AttachmentUploadIntent | undefined>;
  saveIntent(value: AttachmentUploadIntent): Promise<void>;
  findIdempotentResult(key: string): Promise<string | undefined>;
  saveIdempotentResult(key: string, targetId: string): Promise<void>;
  appendAudit(event: AuditEvent): Promise<void>;
  latestAudit(): Promise<AuditEvent | undefined>;
}

type Options = Readonly<{
  store: AttachmentIntentStore;
  digest: SecretDigest;
  idempotencyPepper: string;
  clock?: { now(): Date };
}>;

export class AttachmentIntentService {
  private readonly clock: { now(): Date };

  constructor(private readonly options: Options) {
    if (options.idempotencyPepper.trim().length < 16) throw new Error("Attachment intents require a server-only idempotency pepper.");
    this.clock = options.clock ?? { now: () => new Date() };
  }

  async create(input: CreateAttachmentUploadIntentInput, context: WriteContext, actor: StagingActor) {
    this.assertContext(context, actor);
    const originalFileName = input.originalFileName.trim();
    if (!originalFileName || originalFileName.length > 120 || /[\\/\u0000-\u001f\u007f]/.test(originalFileName)) {
      throw new InvitationServiceError("INVALID_REQUEST", "Choose a file with a valid name under 120 characters.", 400);
    }
    if (!ALLOWED_MEDIA_TYPES.has(input.mediaType)) {
      throw new InvitationServiceError("INVALID_REQUEST", "That file type is not supported.", 400);
    }
    if (!Number.isSafeInteger(input.byteLength) || input.byteLength < 1 || input.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new InvitationServiceError("INVALID_REQUEST", "Choose a file between 1 byte and 25 MB.", 400);
    }
    await this.authorizeTarget(input, actor);

    return this.options.store.transaction(async (store) => {
      const operation = await this.operationHash(context);
      const prior = await store.findIdempotentResult(operation);
      if (prior) {
        const existing = await store.findIntent(prior);
        if (!existing) throw new Error("Attachment receipt points to a missing intent.");
        return existing;
      }
      const now = this.clock.now();
      const id = await this.entityId(input.familyCircleId, context);
      const intent: AttachmentUploadIntent = {
        id,
        schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
        version: 1,
        region: context.region,
        provenance: { createdAt: now.toISOString(), createdBy: context.actor, source: "app" },
        familyCircleId: input.familyCircleId,
        ownerIdentityId: actor.identityId,
        target: input.target,
        originalFileName,
        mediaType: input.mediaType,
        byteLength: input.byteLength,
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
        status: "metadata-prepared",
        uploadTransport: "disabled",
        uploadUrl: null
      };
      await store.saveIntent(intent);
      await store.saveIdempotentResult(operation, intent.id);
      await this.audit(intent, context, store);
      return intent;
    });
  }

  private async authorizeTarget(input: CreateAttachmentUploadIntentInput, actor: StagingActor) {
    if (input.target.kind === "conversation") {
      const conversation = await this.options.store.findConversation(input.target.conversationId);
      const permissions = actor.familyPermissions[input.familyCircleId] ?? [];
      if (!conversation || conversation.familyCircleId !== input.familyCircleId || !conversation.participantIdentityIds.includes(actor.identityId)) {
        throw new InvitationServiceError("NOT_FOUND", "Conversation not found.", 404);
      }
      if (!permissions.includes("messages:write")) {
        throw new InvitationServiceError("FORBIDDEN", "You cannot add attachments to that conversation.", 403);
      }
      return;
    }
    const permissions = actor.familyPermissions[input.familyCircleId] ?? [];
    if (!permissions.includes("records:write")) {
      throw new InvitationServiceError("FORBIDDEN", "You cannot add private records to that family.", 403);
    }
    if (!input.target.binderId.trim()) throw new InvitationServiceError("INVALID_REQUEST", "A private binder is required.", 400);
  }

  private assertContext(context: WriteContext, actor: StagingActor) {
    if (context.actor.identityId !== actor.identityId || context.actor.sessionId !== actor.sessionId) {
      throw new InvitationServiceError("UNAUTHENTICATED", "A valid staging session is required.", 401);
    }
  }

  private operationHash(context: WriteContext) {
    return this.options.digest.digest(`${this.options.idempotencyPepper}:${context.region}:${context.actor.identityId}:attachment-intent.create:${context.idempotencyKey}`);
  }

  private async entityId(familyCircleId: string, context: WriteContext) {
    const hash = await this.options.digest.digest(`attachment-intent:${familyCircleId}:${context.actor.identityId}:${context.idempotencyKey}`);
    return `attachment-intent_${hash.slice(0, 20)}`;
  }

  private async audit(intent: AttachmentUploadIntent, context: WriteContext, store: AttachmentIntentStore) {
    const previous = await store.latestAudit();
    const occurredAt = this.clock.now().toISOString();
    const payloadHash = await this.options.digest.digest(JSON.stringify({
      targetKind: intent.target.kind,
      mediaType: intent.mediaType,
      byteLength: intent.byteLength,
      fileNameLength: intent.originalFileName.length,
      uploadTransport: intent.uploadTransport
    }));
    const sequence = (previous?.sequence ?? 0) + 1;
    const previousEventHash = previous?.eventHash ?? null;
    const eventHash = await this.options.digest.digest(JSON.stringify({
      schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
      region: context.region,
      sequence,
      occurredAt,
      actor: context.actor,
      action: "attachment-intent.created",
      targetType: "AttachmentUploadIntent",
      targetId: intent.id,
      previousEventHash,
      payloadHash
    }));
    await store.appendAudit({
      id: `audit_${eventHash.slice(0, 20)}`,
      schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
      region: context.region,
      sequence,
      occurredAt,
      actor: context.actor,
      action: "attachment-intent.created",
      targetType: "AttachmentUploadIntent",
      targetId: intent.id,
      previousEventHash,
      eventHash,
      payloadHash
    });
  }
}
