import type { CreateAttachmentUploadIntentInput } from "../api/CoordinationApi";
import { createWriteContext, PEACEPAD_V2_SCHEMA_VERSION, type DataRegion } from "../domain/v2";
import { AttachmentIntentService } from "./AttachmentIntentService";
import { InvitationServiceError } from "./InvitationService";
import type { StagingInvitationRequest, StagingInvitationResponse } from "./InvitationRoutes";

const header = (request: StagingInvitationRequest, name: string) => request.headers[name] ?? request.headers[name.toLowerCase()];

const context = (request: StagingInvitationRequest) => {
  if (!request.actor) throw new InvitationServiceError("UNAUTHENTICATED", "A valid staging session is required.", 401);
  const region = header(request, "X-PeacePad-Region") as DataRegion | undefined;
  if (region !== "ca" && region !== "us") throw new InvitationServiceError("INVALID_REQUEST", "A valid data region is required.", 400);
  if (header(request, "X-PeacePad-Schema-Version") !== PEACEPAD_V2_SCHEMA_VERSION) {
    throw new InvitationServiceError("INVALID_REQUEST", "A supported schema version is required.", 400);
  }
  const idempotencyKey = header(request, "Idempotency-Key")?.trim();
  if (!idempotencyKey) throw new InvitationServiceError("INVALID_REQUEST", "An idempotency key is required.", 400);
  return createWriteContext({
    idempotencyKey,
    expectedVersion: null,
    region,
    actor: { identityId: request.actor.identityId, sessionId: request.actor.sessionId }
  });
};

const hasOnlyKeys = (value: unknown, allowed: readonly string[]) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).every((key) => allowed.includes(key));
};

export class StagingAttachmentIntentRoutes {
  constructor(private readonly service: AttachmentIntentService) {}

  async handle(request: StagingInvitationRequest): Promise<StagingInvitationResponse> {
    try {
      if (!request.actor) throw new InvitationServiceError("UNAUTHENTICATED", "A valid staging session is required.", 401);
      const url = new URL(request.path, "https://api.staging.peacepad.ca");
      if (url.pathname !== "/api/v2/attachment-upload-intents" || request.method !== "POST") {
        return { status: 405, body: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } };
      }
      if (!hasOnlyKeys(request.body, ["familyCircleId", "target", "originalFileName", "mediaType", "byteLength"])) {
        throw new InvitationServiceError("INVALID_REQUEST", "Only attachment metadata is accepted. File content is not accepted by this endpoint.", 400);
      }
      const input = request.body as CreateAttachmentUploadIntentInput;
      if (input.target?.kind !== "conversation" && input.target?.kind !== "private-binder") {
        throw new InvitationServiceError("INVALID_REQUEST", "A valid attachment target is required.", 400);
      }
      if (!hasOnlyKeys(input.target, input.target?.kind === "conversation" ? ["kind", "conversationId"] : ["kind", "binderId"])) {
        throw new InvitationServiceError("INVALID_REQUEST", "A valid attachment target is required.", 400);
      }
      return { status: 201, body: await this.service.create(input, context(request), request.actor) };
    } catch (error) {
      return error instanceof InvitationServiceError
        ? { status: error.status, body: { code: error.code, message: error.message } }
        : { status: 500, body: { code: "INTERNAL_ERROR", message: "PeacePad could not complete this request." } };
    }
  }
}
