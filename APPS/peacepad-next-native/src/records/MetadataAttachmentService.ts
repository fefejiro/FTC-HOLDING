import {
  PEACEPAD_V2_SCHEMA_VERSION,
  type AttachmentUploadIntent,
  type CaseBinder,
  type PrepareAttachmentIntentRequest
} from "../domain/v2";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const INTENT_TTL_MS = 15 * 60 * 1000;
const allowedMediaTypes = new Set(["image/jpeg", "image/png", "application/pdf", "text/plain"]);

export type AttachmentIntentErrorCode =
  | "unauthorized"
  | "not-found"
  | "invalid-request"
  | "unsupported-media-type"
  | "size-limit"
  | "idempotency-conflict";

export class AttachmentIntentError extends Error {
  constructor(message: string, readonly code: AttachmentIntentErrorCode) {
    super(message);
  }
}

type StoredIntent = { fingerprint: string; intent: AttachmentUploadIntent };

export class MetadataAttachmentService {
  private readonly binders = new Map<string, CaseBinder>();
  private readonly intents = new Map<string, StoredIntent>();
  private sequence = 0;

  constructor(
    private readonly actor: { identityId: string; familyCircleId: string; sessionId: string },
    private readonly now: () => Date = () => new Date()
  ) {}

  registerBinder(binder: CaseBinder) {
    if (binder.ownerIdentityId !== this.actor.identityId || binder.familyCircleId !== this.actor.familyCircleId) {
      throw new AttachmentIntentError("The binder does not belong to this session.", "unauthorized");
    }
    this.binders.set(binder.id, binder);
  }

  prepare(request: PrepareAttachmentIntentRequest): AttachmentUploadIntent {
    this.assertAuthorized(request);
    const normalized = {
      ...request,
      originalFileName: request.originalFileName.trim(),
      idempotencyKey: request.idempotencyKey.trim()
    };
    this.validate(normalized);
    const fingerprint = JSON.stringify(normalized);
    const prior = this.intents.get(normalized.idempotencyKey);
    if (prior) {
      if (prior.fingerprint !== fingerprint) {
        throw new AttachmentIntentError("This request key was already used for different metadata.", "idempotency-conflict");
      }
      return prior.intent;
    }

    const createdAt = this.now();
    const intent: AttachmentUploadIntent = {
      id: `attachment-intent-${++this.sequence}`,
      schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
      version: 1,
      region: "ca",
      familyCircleId: normalized.familyCircleId,
      ownerIdentityId: normalized.ownerIdentityId,
      target: normalized.target,
      originalFileName: normalized.originalFileName,
      mediaType: normalized.mediaType,
      byteLength: normalized.byteLength,
      expiresAt: new Date(createdAt.getTime() + INTENT_TTL_MS).toISOString(),
      status: "metadata-prepared",
      uploadTransport: "disabled",
      uploadUrl: null,
      provenance: {
        createdAt: createdAt.toISOString(),
        createdBy: this.actor,
        source: "app"
      }
    };
    this.intents.set(normalized.idempotencyKey, { fingerprint, intent });
    return intent;
  }

  private assertAuthorized(request: PrepareAttachmentIntentRequest) {
    if (request.ownerIdentityId !== this.actor.identityId || request.familyCircleId !== this.actor.familyCircleId) {
      throw new AttachmentIntentError("This session cannot prepare metadata for that family.", "unauthorized");
    }
    if (request.target.kind !== "private-binder") {
      throw new AttachmentIntentError("Conversation attachments are not available in this records change.", "invalid-request");
    }
    const binder = this.binders.get(request.target.binderId);
    if (!binder) throw new AttachmentIntentError("Case Binder not found.", "not-found");
    if (binder.ownerIdentityId !== request.ownerIdentityId || binder.familyCircleId !== request.familyCircleId) {
      throw new AttachmentIntentError("This session cannot use that Case Binder.", "unauthorized");
    }
  }

  private validate(request: PrepareAttachmentIntentRequest) {
    if (!/^[a-zA-Z0-9_-]{8,96}$/.test(request.idempotencyKey)) {
      throw new AttachmentIntentError("Use a valid request key.", "invalid-request");
    }
    if (!request.originalFileName || request.originalFileName.length > 180 || /[\\/\0]/.test(request.originalFileName)) {
      throw new AttachmentIntentError("Use a valid file name.", "invalid-request");
    }
    if (!allowedMediaTypes.has(request.mediaType)) {
      throw new AttachmentIntentError("This file type is not supported.", "unsupported-media-type");
    }
    if (!Number.isSafeInteger(request.byteLength) || request.byteLength <= 0 || request.byteLength > MAX_ATTACHMENT_BYTES) {
      throw new AttachmentIntentError("The file metadata exceeds the 25 MB limit.", "size-limit");
    }
  }
}
