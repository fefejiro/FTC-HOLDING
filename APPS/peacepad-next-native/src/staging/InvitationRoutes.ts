import type { CreateInvitationInput } from "../api/CoordinationApi";
import { createWriteContext, PEACEPAD_V2_SCHEMA_VERSION, type DataRegion } from "../domain/v2";
import {
  InvitationService,
  InvitationServiceError,
  type StagingActor
} from "./InvitationService";

export type StagingInvitationRequest = Readonly<{
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  headers: Readonly<Record<string, string | undefined>>;
  actor?: StagingActor;
  requesterKey: string;
}>;

export type StagingInvitationResponse = Readonly<{
  status: number;
  body: unknown;
  headers?: Readonly<Record<string, string>>;
}>;

const errorResponse = (error: unknown): StagingInvitationResponse => {
  if (error instanceof InvitationServiceError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message },
      ...(error.code === "INVITATION_RATE_LIMITED" ? { headers: { "Retry-After": "60" } } : {})
    };
  }
  return { status: 500, body: { code: "INTERNAL_ERROR", message: "PeacePad could not complete this request." } };
};

const textHeader = (request: StagingInvitationRequest, name: string) => request.headers[name] ?? request.headers[name.toLowerCase()];

const writeContext = (request: StagingInvitationRequest) => {
  if (!request.actor) throw new InvitationServiceError("UNAUTHENTICATED", "A valid staging session is required.", 401);
  const region = textHeader(request, "X-PeacePad-Region") as DataRegion | undefined;
  if (region !== "ca" && region !== "us") {
    throw new InvitationServiceError("INVALID_REQUEST", "A valid data region is required.", 400);
  }
  if (textHeader(request, "X-PeacePad-Schema-Version") !== PEACEPAD_V2_SCHEMA_VERSION) {
    throw new InvitationServiceError("INVALID_REQUEST", "A supported schema version is required.", 400);
  }
  const idempotencyKey = textHeader(request, "Idempotency-Key")?.trim();
  if (!idempotencyKey) {
    throw new InvitationServiceError("INVALID_REQUEST", "An idempotency key is required.", 400);
  }
  const expected = textHeader(request, "If-Match");
  if (expected !== undefined && (!/^\d+$/.test(expected) || Number(expected) < 0)) {
    throw new InvitationServiceError("INVALID_REQUEST", "If-Match must be a non-negative version.", 400);
  }
  return createWriteContext({
    idempotencyKey,
    expectedVersion: expected === undefined ? null : Number(expected),
    region,
    actor: { identityId: request.actor.identityId, sessionId: request.actor.sessionId }
  });
};

export class StagingInvitationRoutes {
  constructor(private readonly service: InvitationService) {}

  async handle(request: StagingInvitationRequest): Promise<StagingInvitationResponse> {
    try {
      if (request.method === "POST" && request.path === "/api/v2/invitations") {
        const context = writeContext(request);
        return { status: 201, body: await this.service.create(request.body as CreateInvitationInput, context, request.actor!) };
      }
      if (request.method === "POST" && request.path === "/api/v2/invitations/resolve") {
        const code = (request.body as { code?: unknown } | undefined)?.code;
        if (typeof code !== "string") {
          throw new InvitationServiceError("INVALID_REQUEST", "Invitation code is required.", 400);
        }
        return { status: 200, body: await this.service.resolve(code, request.requesterKey) };
      }

      const match = request.path.match(/^\/api\/v2\/invitations\/([^/]+)(?:\/(accept|decline))?$/);
      if (!match) return { status: 404, body: { code: "NOT_FOUND", message: "Route not found." } };
      const invitationId = decodeURIComponent(match[1]);
      const action = match[2];
      const context = writeContext(request);
      if (request.method === "POST" && action === "accept") {
        return { status: 200, body: await this.service.accept(invitationId, context, request.actor!, request.requesterKey) };
      }
      if (request.method === "POST" && action === "decline") {
        await this.service.decline(invitationId, context, request.actor!, request.requesterKey);
        return { status: 204, body: undefined };
      }
      if (request.method === "DELETE" && action === undefined) {
        await this.service.revoke(invitationId, context, request.actor!);
        return { status: 204, body: undefined };
      }
      return { status: 405, body: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } };
    } catch (error) {
      return errorResponse(error);
    }
  }
}
