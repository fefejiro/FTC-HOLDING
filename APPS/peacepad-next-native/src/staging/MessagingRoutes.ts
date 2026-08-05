import type { CreateConversationInput, SendMessageInput } from "../api/CoordinationApi";
import { createWriteContext, PEACEPAD_V2_SCHEMA_VERSION, type DataRegion } from "../domain/v2";
import { InvitationServiceError } from "./InvitationService";
import type { StagingInvitationRequest, StagingInvitationResponse } from "./InvitationRoutes";
import { MessagingService } from "./MessagingService";

const header = (request: StagingInvitationRequest, name: string) => request.headers[name] ?? request.headers[name.toLowerCase()];
const context = (request: StagingInvitationRequest) => {
  if (!request.actor) throw new InvitationServiceError("UNAUTHENTICATED", "A valid staging session is required.", 401);
  const region = header(request, "X-PeacePad-Region") as DataRegion | undefined;
  if (region !== "ca" && region !== "us") throw new InvitationServiceError("INVALID_REQUEST", "A valid data region is required.", 400);
  if (header(request, "X-PeacePad-Schema-Version") !== PEACEPAD_V2_SCHEMA_VERSION) throw new InvitationServiceError("INVALID_REQUEST", "A supported schema version is required.", 400);
  const idempotencyKey = header(request, "Idempotency-Key")?.trim();
  if (!idempotencyKey) throw new InvitationServiceError("INVALID_REQUEST", "An idempotency key is required.", 400);
  const expected = header(request, "If-Match");
  if (expected !== undefined && !/^\d+$/.test(expected)) throw new InvitationServiceError("INVALID_REQUEST", "If-Match must be a non-negative version.", 400);
  return createWriteContext({ idempotencyKey, expectedVersion: expected === undefined ? null : Number(expected), region,
    actor: { identityId: request.actor.identityId, sessionId: request.actor.sessionId } });
};

export class StagingMessagingRoutes {
  constructor(private readonly service: MessagingService) {}
  async handle(request: StagingInvitationRequest): Promise<StagingInvitationResponse> {
    try {
      if (!request.actor) throw new InvitationServiceError("UNAUTHENTICATED", "A valid staging session is required.", 401);
      const url = new URL(request.path, "https://api.staging.peacepad.ca");
      if (url.pathname === "/api/v2/conversations" && request.method === "GET") {
        const family = url.searchParams.get("familyCircleId")?.trim(); if (!family) throw new InvitationServiceError("INVALID_REQUEST", "A family is required.", 400);
        return { status: 200, body: await this.service.listConversations(family, request.actor) };
      }
      if (url.pathname === "/api/v2/conversations" && request.method === "POST") return { status: 201, body: await this.service.createConversation(request.body as CreateConversationInput, context(request), request.actor) };
      const messages = url.pathname.match(/^\/api\/v2\/conversations\/([^/]+)\/messages$/);
      if (messages && request.method === "GET") return { status: 200, body: await this.service.listMessages(decodeURIComponent(messages[1]), request.actor) };
      if (messages && request.method === "POST") {
        const id = decodeURIComponent(messages[1]); const body = request.body as SendMessageInput;
        if (!body || body.conversationId !== id) throw new InvitationServiceError("INVALID_REQUEST", "Conversation ID mismatch.", 400);
        return { status: 201, body: await this.service.sendMessage(body, context(request), request.actor) };
      }
      const preference = url.pathname.match(/^\/api\/v2\/conversations\/([^/]+)\/message-check$/);
      if (preference && request.method === "GET") return { status: 200, body: await this.service.getPreference(decodeURIComponent(preference[1]), request.actor) };
      if (preference && request.method === "PUT") {
        const body = request.body as { enabled?: unknown; aiAssistanceEnabled?: unknown };
        if (typeof body?.enabled !== "boolean" || typeof body?.aiAssistanceEnabled !== "boolean") throw new InvitationServiceError("INVALID_REQUEST", "A valid Message Check setting is required.", 400);
        return { status: 200, body: await this.service.setPreference(decodeURIComponent(preference[1]), body.enabled, body.aiAssistanceEnabled, context(request), request.actor) };
      }
      if (url.pathname === "/api/v2/message-previews" && request.method === "POST") {
        const body = request.body as { conversationId?: unknown; content?: unknown };
        if (typeof body?.conversationId !== "string" || typeof body?.content !== "string") throw new InvitationServiceError("INVALID_REQUEST", "A conversation and message are required.", 400);
        return { status: 200, body: await this.service.preview(body.conversationId, body.content, request.actor) };
      }
      return { status: 405, body: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } };
    } catch (error) {
      return error instanceof InvitationServiceError ? { status: error.status, body: { code: error.code, message: error.message } } : { status: 500, body: { code: "INTERNAL_ERROR", message: "PeacePad could not complete this request." } };
    }
  }
}
