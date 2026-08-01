import type {
  CalendarLayer,
  EntityId,
  FamilyInvitation,
  InvitationPreview,
  LayerVisibility,
  MessageCheckPreference,
  ParticipantGrant,
  ScheduleEvent,
  WriteContext
} from "../domain/v2";
import type { MessagePreviewResponse } from "./contracts";
import type { PeacePadEnvironmentConfig } from "../config/environment";
import { PeacePadApiError } from "./PeacePadApiClient";

export type InvitationFailureReason =
  | "invalid"
  | "expired"
  | "revoked"
  | "used"
  | "rate-limited"
  | "offline";

export class InvitationError extends Error {
  readonly reason: InvitationFailureReason;

  constructor(reason: InvitationFailureReason, message: string) {
    super(message);
    this.name = "InvitationError";
    this.reason = reason;
  }
}

export type CreateInvitationInput = Readonly<{
  familyCircleId: EntityId;
  invitedRole: FamilyInvitation["invitedRole"];
  permissions: readonly string[];
  expiresInHours: number;
}>;

export type CreatedInvitation = Readonly<{
  invitation: FamilyInvitation;
  code: string;
  deepLink: string;
}>;

export type CreateCalendarLayerInput = Readonly<{
  familyCircleId: EntityId;
  ownerIdentityId: EntityId;
  name: string;
  kind: CalendarLayer["kind"];
  icon: CalendarLayer["icon"];
  colorToken: CalendarLayer["colorToken"];
  visibility: LayerVisibility;
}>;

export type CreateScheduleEventInput = Readonly<
  Pick<
    ScheduleEvent,
    | "familyCircleId"
    | "calendarLayerId"
    | "childProfileIds"
    | "eventType"
    | "title"
    | "description"
    | "startsAt"
    | "endsAt"
    | "status"
    | "recurrence"
    | "visibilityOverride"
  >
>;

export interface PeacePadCoordinationApi {
  createInvitation(input: CreateInvitationInput, context: WriteContext): Promise<CreatedInvitation>;
  resolveInvitation(code: string): Promise<InvitationPreview>;
  acceptInvitation(invitationId: EntityId, context: WriteContext): Promise<ParticipantGrant>;
  declineInvitation(invitationId: EntityId, context: WriteContext): Promise<void>;
  revokeInvitation(invitationId: EntityId, context: WriteContext): Promise<void>;
  listCalendarLayers(familyCircleId: EntityId): Promise<readonly CalendarLayer[]>;
  createCalendarLayer(input: CreateCalendarLayerInput, context: WriteContext): Promise<CalendarLayer>;
  updateCalendarLayer(layer: CalendarLayer, context: WriteContext): Promise<CalendarLayer>;
  deleteCalendarLayer(layerId: EntityId, context: WriteContext): Promise<void>;
  listScheduleEvents(familyCircleId: EntityId): Promise<readonly ScheduleEvent[]>;
  createScheduleEvent(input: CreateScheduleEventInput, context: WriteContext): Promise<ScheduleEvent>;
  updateScheduleEvent(event: ScheduleEvent, context: WriteContext): Promise<ScheduleEvent>;
  deleteScheduleEvent(eventId: EntityId, context: WriteContext): Promise<void>;
  setMessageCheckPreference(
    conversationId: EntityId,
    enabled: boolean,
    context: WriteContext
  ): Promise<MessageCheckPreference>;
  previewMessage(conversationId: EntityId, content: string): Promise<MessagePreviewResponse>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type ErrorPayload = { code?: string; message?: string };

const INVITATION_REASONS: Record<string, InvitationFailureReason> = {
  INVITATION_EXPIRED: "expired",
  INVITATION_REVOKED: "revoked",
  INVITATION_USED: "used",
  INVITATION_RATE_LIMITED: "rate-limited",
  INVITATION_INVALID: "invalid"
};

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export class HttpPeacePadCoordinationApi implements PeacePadCoordinationApi {
  constructor(
    private readonly config: PeacePadEnvironmentConfig,
    private readonly fetcher: FetchLike = fetch
  ) {}

  createInvitation(input: CreateInvitationInput, context: WriteContext) {
    return this.write<CreatedInvitation>("/api/v2/invitations", "POST", input, context);
  }

  resolveInvitation(code: string) {
    const normalized = normalizeCode(code);
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      return Promise.reject(new InvitationError("invalid", "Enter a valid six-character invitation code."));
    }
    return this.request<InvitationPreview>("/api/v2/invitations/resolve", {
      method: "POST",
      body: JSON.stringify({ code: normalized })
    });
  }

  acceptInvitation(invitationId: EntityId, context: WriteContext) {
    return this.write<ParticipantGrant>(`/api/v2/invitations/${encodeURIComponent(invitationId)}/accept`, "POST", {}, context);
  }

  async declineInvitation(invitationId: EntityId, context: WriteContext) {
    await this.write(`/api/v2/invitations/${encodeURIComponent(invitationId)}/decline`, "POST", {}, context);
  }

  async revokeInvitation(invitationId: EntityId, context: WriteContext) {
    await this.write(`/api/v2/invitations/${encodeURIComponent(invitationId)}`, "DELETE", undefined, context);
  }

  listCalendarLayers(familyCircleId: EntityId) {
    return this.request<readonly CalendarLayer[]>(`/api/v2/calendar-layers?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  createCalendarLayer(input: CreateCalendarLayerInput, context: WriteContext) {
    return this.write<CalendarLayer>("/api/v2/calendar-layers", "POST", input, context);
  }

  updateCalendarLayer(layer: CalendarLayer, context: WriteContext) {
    return this.write<CalendarLayer>(`/api/v2/calendar-layers/${encodeURIComponent(layer.id)}`, "PATCH", layer, context);
  }

  async deleteCalendarLayer(layerId: EntityId, context: WriteContext) {
    await this.write(`/api/v2/calendar-layers/${encodeURIComponent(layerId)}`, "DELETE", undefined, context);
  }

  listScheduleEvents(familyCircleId: EntityId) {
    return this.request<readonly ScheduleEvent[]>(`/api/v2/schedule-events?familyCircleId=${encodeURIComponent(familyCircleId)}`);
  }

  createScheduleEvent(input: CreateScheduleEventInput, context: WriteContext) {
    return this.write<ScheduleEvent>("/api/v2/schedule-events", "POST", input, context);
  }

  updateScheduleEvent(event: ScheduleEvent, context: WriteContext) {
    return this.write<ScheduleEvent>(`/api/v2/schedule-events/${encodeURIComponent(event.id)}`, "PATCH", event, context);
  }

  async deleteScheduleEvent(eventId: EntityId, context: WriteContext) {
    await this.write(`/api/v2/schedule-events/${encodeURIComponent(eventId)}`, "DELETE", undefined, context);
  }

  setMessageCheckPreference(conversationId: EntityId, enabled: boolean, context: WriteContext) {
    return this.write<MessageCheckPreference>(
      `/api/v2/conversations/${encodeURIComponent(conversationId)}/message-check`,
      "PUT",
      { enabled, aiAssistanceEnabled: false },
      context
    );
  }

  previewMessage(conversationId: EntityId, content: string) {
    const normalized = content.trim();
    if (!normalized) {
      return Promise.reject(new PeacePadApiError("Enter a message to check.", "http", 400));
    }
    return this.request<MessagePreviewResponse>("/api/v2/message-previews", {
      method: "POST",
      body: JSON.stringify({ conversationId, content: normalized })
    });
  }

  private write<T = Record<string, never>>(
    path: string,
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    body: unknown,
    context: WriteContext
  ): Promise<T> {
    return this.request<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        "Idempotency-Key": context.idempotencyKey,
        "X-PeacePad-Region": context.region,
        "X-PeacePad-Schema-Version": context.schemaVersion,
        ...(context.expectedVersion === null ? {} : { "If-Match": String(context.expectedVersion) })
      }
    });
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      const response = await this.fetcher(`${this.config.apiBaseUrl}${path}`, {
        ...init,
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...init.headers
        },
        signal: controller.signal
      });
      const payload = (await response.json().catch(() => null)) as T | ErrorPayload | null;
      if (!response.ok) {
        const error = (payload ?? {}) as ErrorPayload;
        const invitationReason = error.code ? INVITATION_REASONS[error.code] : undefined;
        if (invitationReason) {
          throw new InvitationError(invitationReason, error.message || "This invitation is not available.");
        }
        throw new PeacePadApiError(error.message || `PeacePad request failed (${response.status}).`, "http", response.status);
      }
      if (payload === null) {
        return undefined as T;
      }
      return payload as T;
    } catch (error) {
      if (error instanceof InvitationError || error instanceof PeacePadApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new PeacePadApiError("PeacePad took too long to respond. Try again.", "timeout");
      }
      throw new InvitationError("offline", "PeacePad cannot verify that invitation right now.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
