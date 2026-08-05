import type { CreateCalendarLayerInput, CreateScheduleEventInput } from "../api/CoordinationApi";
import {
  PEACEPAD_V2_SCHEMA_VERSION,
  type AuditEvent,
  type CalendarLayer,
  type LayerVisibility,
  type ScheduleEvent,
  type WriteContext
} from "../domain/v2";
import { InvitationServiceError, type Clock, type SecretDigest, type StagingActor } from "./InvitationService";

export interface CalendarStore {
  transaction<T>(work: (store: CalendarStore) => Promise<T>): Promise<T>;
  listLayers(familyCircleId: string): Promise<readonly CalendarLayer[]>;
  findLayer(id: string): Promise<CalendarLayer | undefined>;
  saveLayer(layer: CalendarLayer, expectedVersion: number | null): Promise<void>;
  deleteLayer(id: string, expectedVersion: number): Promise<void>;
  listEvents(familyCircleId: string): Promise<readonly ScheduleEvent[]>;
  findEvent(id: string): Promise<ScheduleEvent | undefined>;
  saveEvent(event: ScheduleEvent, expectedVersion: number | null): Promise<void>;
  deleteEvent(id: string, expectedVersion: number): Promise<void>;
  findIdempotentResult(key: string): Promise<string | undefined>;
  saveIdempotentResult(key: string, targetId: string): Promise<void>;
  appendAudit(event: AuditEvent): Promise<void>;
  latestAudit(): Promise<AuditEvent | undefined>;
}

export type CalendarServiceOptions = Readonly<{
  store: CalendarStore;
  digest: SecretDigest;
  idempotencyPepper: string;
  clock?: Clock;
}>;

const validVisibility = (value: LayerVisibility) => value?.scope === "private"
  || value?.scope === "family"
  || (value?.scope === "selected" && Array.isArray(value.participantGrantIds)
    && value.participantGrantIds.length > 0
    && value.participantGrantIds.every((id) => typeof id === "string" && id.trim())
    && new Set(value.participantGrantIds).size === value.participantGrantIds.length);

const layerKinds = new Set(["parenting-time", "expenses-requests", "events-activities", "calls", "custom"]);
const layerIcons = new Set(["calendar", "clock", "receipt", "activity", "phone", "custom"]);
const colorTokens = new Set(["teal", "violet", "amber", "rose", "blue", "green"]);
const eventTypes = new Set(["parenting-time", "appointment", "holiday", "change-request"]);
const eventStatuses = new Set(["planned", "requested", "accepted", "declined", "cancelled"]);

export class CalendarService {
  private readonly clock: Clock;

  constructor(private readonly options: CalendarServiceOptions) {
    if (options.idempotencyPepper.trim().length < 16) throw new Error("Calendar idempotency requires a server-only pepper.");
    this.clock = options.clock ?? { now: () => new Date() };
  }

  async listLayers(familyCircleId: string, actor: StagingActor) {
    this.assertFamilyPermission(actor, familyCircleId, "calendar:read");
    return (await this.options.store.listLayers(familyCircleId)).filter((layer) => this.canReadLayer(actor, layer));
  }

  async createLayer(input: CreateCalendarLayerInput, context: WriteContext, actor: StagingActor) {
    this.assertContext(context, actor);
    this.validateLayerInput(input);
    this.assertFamilyPermission(actor, input.familyCircleId, "calendar:write");
    if (input.ownerIdentityId !== actor.identityId) throw new InvitationServiceError("FORBIDDEN", "A calendar must be owned by the signed-in account.", 403);
    return this.options.store.transaction(async (store) => {
      const operation = await this.operationHash("calendar-layer.create", context);
      const prior = await store.findIdempotentResult(operation);
      if (prior) {
        const existing = await store.findLayer(prior);
        if (!existing) throw new Error("Calendar idempotency record points to a missing layer.");
        return existing;
      }
      const id = await this.entityId("layer", input.familyCircleId, context);
      const layer: CalendarLayer = {
        id,
        schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
        version: 1,
        region: context.region,
        provenance: { createdAt: this.clock.now().toISOString(), createdBy: context.actor, source: "app" },
        ...input
      };
      await store.saveLayer(layer, null);
      await store.saveIdempotentResult(operation, id);
      await this.audit("calendar-layer.created", "CalendarLayer", layer.id, context, { familyCircleId: layer.familyCircleId }, store);
      return layer;
    });
  }

  async updateLayer(input: CalendarLayer, context: WriteContext, actor: StagingActor) {
    this.assertContext(context, actor);
    this.validateLayerInput(input);
    this.assertFamilyPermission(actor, input.familyCircleId, "calendar:write");
    return this.options.store.transaction(async (store) => {
      const operation = await this.operationHash("calendar-layer.update", context);
      const prior = await store.findIdempotentResult(operation);
      if (prior) {
        const existing = await store.findLayer(prior);
        if (!existing) throw new Error("Calendar update receipt points to a missing layer.");
        return existing;
      }
      const current = await store.findLayer(input.id);
      if (!current || current.familyCircleId !== input.familyCircleId) throw new InvitationServiceError("NOT_FOUND", "Calendar not found.", 404);
      this.assertRegionAndVersion(current.region, current.version, context);
      if (current.ownerIdentityId !== actor.identityId) throw new InvitationServiceError("FORBIDDEN", "Only the calendar owner can change sharing.", 403);
      if (input.ownerIdentityId !== current.ownerIdentityId) throw new InvitationServiceError("FORBIDDEN", "Calendar ownership cannot be reassigned.", 403);
      const updated: CalendarLayer = {
        ...input,
        schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
        region: current.region,
        version: current.version + 1,
        provenance: current.provenance
      };
      await store.saveLayer(updated, current.version);
      await store.saveIdempotentResult(operation, updated.id);
      await this.audit("calendar-layer.updated", "CalendarLayer", updated.id, context, { visibility: updated.visibility }, store);
      return updated;
    });
  }

  async deleteLayer(id: string, context: WriteContext, actor: StagingActor) {
    this.assertContext(context, actor);
    return this.options.store.transaction(async (store) => {
      const operation = await this.operationHash("calendar-layer.delete", context);
      if (await store.findIdempotentResult(operation)) return;
      const current = await store.findLayer(id);
      if (!current) throw new InvitationServiceError("NOT_FOUND", "Calendar not found.", 404);
      this.assertFamilyPermission(actor, current.familyCircleId, "calendar:write");
      this.assertRegionAndVersion(current.region, current.version, context);
      if (current.ownerIdentityId !== actor.identityId) throw new InvitationServiceError("FORBIDDEN", "Only the calendar owner can delete it.", 403);
      await store.deleteLayer(id, current.version);
      await store.saveIdempotentResult(operation, id);
      await this.audit("calendar-layer.deleted", "CalendarLayer", id, context, {}, store);
    });
  }

  async listEvents(familyCircleId: string, actor: StagingActor) {
    this.assertFamilyPermission(actor, familyCircleId, "calendar:read");
    const visibleLayers = new Map((await this.listLayers(familyCircleId, actor)).map((layer) => [layer.id, layer]));
    return (await this.options.store.listEvents(familyCircleId)).filter((event) => {
      const layer = visibleLayers.get(event.calendarLayerId);
      return layer && this.canReadVisibility(actor, layer.ownerIdentityId, event.visibilityOverride ?? layer.visibility);
    });
  }

  async createEvent(input: CreateScheduleEventInput, context: WriteContext, actor: StagingActor) {
    this.assertContext(context, actor);
    this.validateEventInput(input);
    this.assertFamilyPermission(actor, input.familyCircleId, "calendar:write");
    return this.options.store.transaction(async (store) => {
      const layer = await store.findLayer(input.calendarLayerId);
      if (!layer || layer.familyCircleId !== input.familyCircleId) throw new InvitationServiceError("NOT_FOUND", "Calendar not found.", 404);
      if (layer.ownerIdentityId !== actor.identityId) throw new InvitationServiceError("FORBIDDEN", "Only the calendar owner can add events.", 403);
      this.assertVisibilityDoesNotExpand(layer.visibility, input.visibilityOverride);
      const operation = await this.operationHash("schedule-event.create", context);
      const prior = await store.findIdempotentResult(operation);
      if (prior) {
        const existing = await store.findEvent(prior);
        if (!existing) throw new Error("Event idempotency record points to a missing event.");
        return existing;
      }
      const id = await this.entityId("event", input.familyCircleId, context);
      const event: ScheduleEvent = {
        id,
        schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
        version: 1,
        region: context.region,
        provenance: { createdAt: this.clock.now().toISOString(), createdBy: context.actor, source: "app" },
        ...input
      };
      await store.saveEvent(event, null);
      await store.saveIdempotentResult(operation, id);
      await this.audit("schedule-event.created", "ScheduleEvent", id, context, { calendarLayerId: event.calendarLayerId }, store);
      return event;
    });
  }

  async updateEvent(input: ScheduleEvent, context: WriteContext, actor: StagingActor) {
    this.assertContext(context, actor);
    this.validateEventInput(input);
    return this.options.store.transaction(async (store) => {
      const operation = await this.operationHash("schedule-event.update", context);
      const prior = await store.findIdempotentResult(operation);
      if (prior) {
        const existing = await store.findEvent(prior);
        if (!existing) throw new Error("Event update receipt points to a missing event.");
        return existing;
      }
      const current = await store.findEvent(input.id);
      if (!current || current.familyCircleId !== input.familyCircleId) throw new InvitationServiceError("NOT_FOUND", "Event not found.", 404);
      this.assertFamilyPermission(actor, current.familyCircleId, "calendar:write");
      this.assertRegionAndVersion(current.region, current.version, context);
      if (current.provenance.createdBy.identityId !== actor.identityId) throw new InvitationServiceError("FORBIDDEN", "Only the event creator can change it.", 403);
      const layer = await store.findLayer(input.calendarLayerId);
      if (!layer || layer.familyCircleId !== current.familyCircleId) throw new InvitationServiceError("NOT_FOUND", "Calendar not found.", 404);
      if (layer.ownerIdentityId !== actor.identityId) throw new InvitationServiceError("FORBIDDEN", "Only the calendar owner can move this event.", 403);
      this.assertVisibilityDoesNotExpand(layer.visibility, input.visibilityOverride);
      const updated: ScheduleEvent = { ...input, version: current.version + 1, region: current.region, provenance: current.provenance };
      await store.saveEvent(updated, current.version);
      await store.saveIdempotentResult(operation, updated.id);
      await this.audit("schedule-event.updated", "ScheduleEvent", updated.id, context, {}, store);
      return updated;
    });
  }

  async deleteEvent(id: string, context: WriteContext, actor: StagingActor) {
    this.assertContext(context, actor);
    return this.options.store.transaction(async (store) => {
      const operation = await this.operationHash("schedule-event.delete", context);
      if (await store.findIdempotentResult(operation)) return;
      const current = await store.findEvent(id);
      if (!current) throw new InvitationServiceError("NOT_FOUND", "Event not found.", 404);
      this.assertFamilyPermission(actor, current.familyCircleId, "calendar:write");
      this.assertRegionAndVersion(current.region, current.version, context);
      if (current.provenance.createdBy.identityId !== actor.identityId) throw new InvitationServiceError("FORBIDDEN", "Only the event creator can delete it.", 403);
      await store.deleteEvent(id, current.version);
      await store.saveIdempotentResult(operation, id);
      await this.audit("schedule-event.deleted", "ScheduleEvent", id, context, {}, store);
    });
  }

  private validateLayerInput(input: CreateCalendarLayerInput | CalendarLayer) {
    if (!input || typeof input.familyCircleId !== "string" || !input.familyCircleId.trim()
      || typeof input.name !== "string" || input.name.trim().length < 2 || input.name.length > 80
      || !layerKinds.has(input.kind) || !layerIcons.has(input.icon) || !colorTokens.has(input.colorToken)
      || !validVisibility(input.visibility)) {
      throw new InvitationServiceError("INVALID_REQUEST", "Enter valid calendar details.", 400);
    }
  }

  private validateEventInput(input: CreateScheduleEventInput | ScheduleEvent) {
    if (!input || typeof input.familyCircleId !== "string" || !input.familyCircleId.trim()
      || typeof input.calendarLayerId !== "string" || !input.calendarLayerId.trim()
      || typeof input.title !== "string" || input.title.trim().length < 2 || input.title.length > 120
      || !eventTypes.has(input.eventType) || !eventStatuses.has(input.status)
      || !Number.isFinite(Date.parse(input.startsAt)) || !Number.isFinite(Date.parse(input.endsAt))
      || Date.parse(input.endsAt) <= Date.parse(input.startsAt)
      || (input.visibilityOverride !== null && !validVisibility(input.visibilityOverride))) {
      throw new InvitationServiceError("INVALID_REQUEST", "Enter valid event details and times.", 400);
    }
  }

  private assertContext(context: WriteContext, actor: StagingActor) {
    if (context.actor.identityId !== actor.identityId || context.actor.sessionId !== actor.sessionId) {
      throw new InvitationServiceError("UNAUTHENTICATED", "A valid staging session is required.", 401);
    }
  }

  private assertFamilyPermission(actor: StagingActor, familyCircleId: string, permission: "calendar:read" | "calendar:write") {
    const permissions = actor.familyPermissions[familyCircleId] ?? [];
    const allowed = permissions.includes(permission)
      || (permission === "calendar:read" && permissions.includes("calendar:write"));
    if (!allowed) throw new InvitationServiceError("FORBIDDEN", "You cannot access that family calendar.", 403);
  }

  private canReadLayer(actor: StagingActor, layer: CalendarLayer) {
    return this.canReadVisibility(actor, layer.ownerIdentityId, layer.visibility);
  }

  private canReadVisibility(actor: StagingActor, ownerIdentityId: string, visibility: LayerVisibility) {
    if (ownerIdentityId === actor.identityId) return true;
    if (visibility.scope === "family") return true;
    if (visibility.scope === "selected") {
      return (actor.participantGrantIds ?? []).some((id) => visibility.participantGrantIds.includes(id));
    }
    return false;
  }

  private assertVisibilityDoesNotExpand(layer: LayerVisibility, override: LayerVisibility | null) {
    if (!override) return;
    const allowed = layer.scope === "family"
      || (layer.scope === "private" && override.scope === "private")
      || (layer.scope === "selected" && (
        override.scope === "private"
        || (override.scope === "selected"
          && override.participantGrantIds.every((id) => layer.participantGrantIds.includes(id)))
      ));
    if (!allowed) throw new InvitationServiceError("FORBIDDEN", "An event cannot be shared more broadly than its calendar.", 403);
  }

  private assertRegionAndVersion(region: CalendarLayer["region"], version: number, context: WriteContext) {
    if (region !== context.region) throw new InvitationServiceError("REGION_MISMATCH", "Calendar region mismatch.", 409);
    if (context.expectedVersion === null || context.expectedVersion !== version) {
      throw new InvitationServiceError("VERSION_CONFLICT", "This item changed. Refresh and try again.", 409);
    }
  }

  private operationHash(action: string, context: WriteContext) {
    return this.options.digest.digest(`${this.options.idempotencyPepper}:${context.region}:${context.actor.identityId}:${action}:${context.idempotencyKey}`);
  }

  private async entityId(prefix: string, familyCircleId: string, context: WriteContext) {
    const digest = await this.options.digest.digest(`${prefix}:${familyCircleId}:${context.actor.identityId}:${context.idempotencyKey}`);
    return `${prefix}_${digest.slice(0, 20)}`;
  }

  private async audit(action: string, targetType: string, targetId: string, context: WriteContext, payload: unknown, store: CalendarStore) {
    const previous = await store.latestAudit();
    const occurredAt = this.clock.now().toISOString();
    const payloadHash = await this.options.digest.digest(JSON.stringify(payload));
    const sequence = (previous?.sequence ?? 0) + 1;
    const previousEventHash = previous?.eventHash ?? null;
    const eventHash = await this.options.digest.digest(JSON.stringify({
      schemaVersion: PEACEPAD_V2_SCHEMA_VERSION,
      region: context.region,
      sequence,
      occurredAt,
      actor: context.actor,
      action,
      targetType,
      targetId,
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
      action,
      targetType,
      targetId,
      previousEventHash,
      eventHash,
      payloadHash
    });
  }
}
