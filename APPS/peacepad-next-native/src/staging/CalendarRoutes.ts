import type { CreateCalendarLayerInput, CreateScheduleEventInput } from "../api/CoordinationApi";
import { createWriteContext, PEACEPAD_V2_SCHEMA_VERSION, type CalendarLayer, type DataRegion, type ScheduleEvent } from "../domain/v2";
import { CalendarService } from "./CalendarService";
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
  const expected = header(request, "If-Match");
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

const errorResponse = (error: unknown): StagingInvitationResponse => error instanceof InvitationServiceError
  ? { status: error.status, body: { code: error.code, message: error.message } }
  : { status: 500, body: { code: "INTERNAL_ERROR", message: "PeacePad could not complete this request." } };

export class StagingCalendarRoutes {
  constructor(private readonly service: CalendarService) {}

  async handle(request: StagingInvitationRequest): Promise<StagingInvitationResponse> {
    try {
      if (!request.actor) throw new InvitationServiceError("UNAUTHENTICATED", "A valid staging session is required.", 401);
      const url = new URL(request.path, "https://api.staging.peacepad.ca");
      const familyCircleId = url.searchParams.get("familyCircleId")?.trim();

      if (request.method === "GET" && url.pathname === "/api/v2/calendar-layers") {
        if (!familyCircleId) throw new InvitationServiceError("INVALID_REQUEST", "A family is required.", 400);
        return { status: 200, body: await this.service.listLayers(familyCircleId, request.actor) };
      }
      if (request.method === "POST" && url.pathname === "/api/v2/calendar-layers") {
        return { status: 201, body: await this.service.createLayer(request.body as CreateCalendarLayerInput, context(request), request.actor) };
      }
      const layerMatch = url.pathname.match(/^\/api\/v2\/calendar-layers\/([^/]+)$/);
      if (layerMatch && request.method === "PATCH") {
        const layer = request.body as CalendarLayer;
        if (!layer || layer.id !== decodeURIComponent(layerMatch[1])) throw new InvitationServiceError("INVALID_REQUEST", "Calendar ID mismatch.", 400);
        return { status: 200, body: await this.service.updateLayer(layer, context(request), request.actor) };
      }
      if (layerMatch && request.method === "DELETE") {
        await this.service.deleteLayer(decodeURIComponent(layerMatch[1]), context(request), request.actor);
        return { status: 204, body: undefined };
      }

      if (request.method === "GET" && url.pathname === "/api/v2/schedule-events") {
        if (!familyCircleId) throw new InvitationServiceError("INVALID_REQUEST", "A family is required.", 400);
        return { status: 200, body: await this.service.listEvents(familyCircleId, request.actor) };
      }
      if (request.method === "POST" && url.pathname === "/api/v2/schedule-events") {
        return { status: 201, body: await this.service.createEvent(request.body as CreateScheduleEventInput, context(request), request.actor) };
      }
      const eventMatch = url.pathname.match(/^\/api\/v2\/schedule-events\/([^/]+)$/);
      if (eventMatch && request.method === "PATCH") {
        const event = request.body as ScheduleEvent;
        if (!event || event.id !== decodeURIComponent(eventMatch[1])) throw new InvitationServiceError("INVALID_REQUEST", "Event ID mismatch.", 400);
        return { status: 200, body: await this.service.updateEvent(event, context(request), request.actor) };
      }
      if (eventMatch && request.method === "DELETE") {
        await this.service.deleteEvent(decodeURIComponent(eventMatch[1]), context(request), request.actor);
        return { status: 204, body: undefined };
      }
      return { status: 405, body: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." } };
    } catch (error) {
      return errorResponse(error);
    }
  }
}

export class CompositeStagingRoutes {
  constructor(
    private readonly invitations: { handle(request: StagingInvitationRequest): Promise<StagingInvitationResponse> },
    private readonly calendar: StagingCalendarRoutes,
    private readonly messaging?: { handle(request: StagingInvitationRequest): Promise<StagingInvitationResponse> }
  ) {}

  handle(request: StagingInvitationRequest) {
    const path = new URL(request.path, "https://api.staging.peacepad.ca").pathname;
    if (path.startsWith("/api/v2/calendar-layers") || path.startsWith("/api/v2/schedule-events")) return this.calendar.handle(request);
    if (this.messaging && (path.startsWith("/api/v2/conversations") || path === "/api/v2/message-previews")) return this.messaging.handle(request);
    return this.invitations.handle(request);
  }
}
