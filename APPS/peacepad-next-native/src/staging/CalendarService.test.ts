import { createWriteContext, type AuditEvent, type CalendarLayer, type ScheduleEvent } from "../domain/v2";
import { CalendarService, type CalendarStore } from "./CalendarService";
import type { Clock, SecretDigest, StagingActor } from "./InvitationService";

class TestDigest implements SecretDigest {
  async digest(input: string) {
    let value = 2166136261;
    for (const character of input) {
      value ^= character.charCodeAt(0);
      value = Math.imul(value, 16777619);
    }
    return Math.abs(value >>> 0).toString(16).padStart(8, "0").repeat(8);
  }
}

class MemoryCalendarStore implements CalendarStore {
  readonly layers = new Map<string, CalendarLayer>();
  readonly events = new Map<string, ScheduleEvent>();
  readonly receipts = new Map<string, string>();
  readonly auditEvents: AuditEvent[] = [];

  async transaction<T>(work: (store: CalendarStore) => Promise<T>): Promise<T> { return work(this); }
  async listLayers(familyCircleId: string) { return [...this.layers.values()].filter((value) => value.familyCircleId === familyCircleId); }
  async findLayer(id: string) { return this.layers.get(id); }
  async saveLayer(layer: CalendarLayer, expectedVersion: number | null) {
    const current = this.layers.get(layer.id);
    if ((expectedVersion === null && current) || (expectedVersion !== null && current?.version !== expectedVersion)) throw new Error("version conflict");
    this.layers.set(layer.id, layer);
  }
  async deleteLayer(id: string, expectedVersion: number) {
    if (this.layers.get(id)?.version !== expectedVersion) throw new Error("version conflict");
    this.layers.delete(id);
    for (const event of this.events.values()) if (event.calendarLayerId === id) this.events.delete(event.id);
  }
  async listEvents(familyCircleId: string) { return [...this.events.values()].filter((value) => value.familyCircleId === familyCircleId); }
  async findEvent(id: string) { return this.events.get(id); }
  async saveEvent(event: ScheduleEvent, expectedVersion: number | null) {
    const current = this.events.get(event.id);
    if ((expectedVersion === null && current) || (expectedVersion !== null && current?.version !== expectedVersion)) throw new Error("version conflict");
    this.events.set(event.id, event);
  }
  async deleteEvent(id: string, expectedVersion: number) {
    if (this.events.get(id)?.version !== expectedVersion) throw new Error("version conflict");
    this.events.delete(id);
  }
  async findIdempotentResult(key: string) { return this.receipts.get(key); }
  async saveIdempotentResult(key: string, targetId: string) { this.receipts.set(key, targetId); }
  async appendAudit(event: AuditEvent) { this.auditEvents.push(event); }
  async latestAudit() { return this.auditEvents.at(-1); }
}

const owner: StagingActor = {
  identityId: "identity-owner",
  displayName: "Alex Example",
  sessionId: "session-owner",
  familyPermissions: { "family-1": ["calendar:read", "calendar:write"] }
};
const member: StagingActor = {
  identityId: "identity-member",
  displayName: "Jordan Example",
  sessionId: "session-member",
  participantGrantIds: ["grant-member"],
  familyPermissions: { "family-1": ["calendar:read"] }
};
const outsider: StagingActor = {
  identityId: "identity-outsider",
  displayName: "Taylor Example",
  sessionId: "session-outsider",
  familyPermissions: { "family-2": ["calendar:read", "calendar:write"] }
};

const context = (actor: StagingActor, key: string, expectedVersion: number | null = null) => createWriteContext({
  idempotencyKey: key,
  expectedVersion,
  region: "ca",
  actor: { identityId: actor.identityId, sessionId: actor.sessionId }
});

const layerInput = {
  familyCircleId: "family-1",
  ownerIdentityId: owner.identityId,
  name: "Parenting time",
  kind: "parenting-time" as const,
  icon: "calendar" as const,
  colorToken: "teal" as const,
  visibility: { scope: "private" as const }
};

const eventInput = (calendarLayerId: string) => ({
  familyCircleId: "family-1",
  calendarLayerId,
  childProfileIds: [],
  eventType: "parenting-time" as const,
  title: "Weekend parenting time",
  description: null,
  startsAt: "2026-08-08T14:00:00.000Z",
  endsAt: "2026-08-09T20:00:00.000Z",
  status: "planned" as const,
  recurrence: null,
  visibilityOverride: null
});

function setup() {
  const store = new MemoryCalendarStore();
  const clock: Clock = { now: () => new Date("2026-08-04T12:00:00.000Z") };
  return { store, service: new CalendarService({ store, digest: new TestDigest(), idempotencyPepper: "calendar-test-pepper", clock }) };
}

describe("CalendarService", () => {
  it("keeps new layers private and reveals family layers only after an explicit owner update", async () => {
    const { service } = setup();
    const layer = await service.createLayer(layerInput, context(owner, "create-private"), owner);

    await expect(service.listLayers("family-1", owner)).resolves.toEqual([layer]);
    await expect(service.listLayers("family-1", member)).resolves.toEqual([]);

    const shared = await service.updateLayer(
      { ...layer, visibility: { scope: "family" } },
      context(owner, "share-layer", 1),
      owner
    );
    await expect(service.listLayers("family-1", member)).resolves.toEqual([shared]);
  });

  it("prevents cross-family access and ownership reassignment", async () => {
    const { service } = setup();
    const layer = await service.createLayer(layerInput, context(owner, "secure-layer"), owner);

    await expect(service.listLayers("family-1", outsider)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.updateLayer(
      { ...layer, ownerIdentityId: member.identityId },
      context(owner, "reassign", 1),
      owner
    )).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates, updates, and deletes layers idempotently with optimistic concurrency", async () => {
    const { service, store } = setup();
    const create = context(owner, "same-create");
    const first = await service.createLayer(layerInput, create, owner);
    await expect(service.createLayer(layerInput, create, owner)).resolves.toEqual(first);

    const update = context(owner, "same-update", 1);
    const changed = await service.updateLayer({ ...first, name: "Parenting plan" }, update, owner);
    await expect(service.updateLayer({ ...first, name: "Ignored replay" }, update, owner)).resolves.toEqual(changed);
    await expect(service.updateLayer(changed, context(owner, "stale-update", 1), owner)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });

    const remove = context(owner, "same-delete", 2);
    await service.deleteLayer(changed.id, remove, owner);
    await expect(service.deleteLayer(changed.id, remove, owner)).resolves.toBeUndefined();
    expect(store.layers.size).toBe(0);
    expect(store.auditEvents.map(({ action }) => action)).toEqual([
      "calendar-layer.created",
      "calendar-layer.updated",
      "calendar-layer.deleted"
    ]);
  });

  it("persists events only on an authorized same-family layer and preserves audit provenance", async () => {
    const { service, store } = setup();
    const layer = await service.createLayer({ ...layerInput, visibility: { scope: "family" } }, context(owner, "event-layer"), owner);
    const event = await service.createEvent(eventInput(layer.id), context(owner, "create-event"), owner);
    await expect(service.createEvent(eventInput(layer.id), context(owner, "create-event"), owner)).resolves.toEqual(event);
    await expect(service.listEvents("family-1", member)).resolves.toEqual([event]);

    const updated = await service.updateEvent(
      { ...event, title: "Updated parenting time" },
      context(owner, "update-event", 1),
      owner
    );
    expect(updated.version).toBe(2);
    expect(updated.provenance).toEqual(event.provenance);

    await service.deleteEvent(updated.id, context(owner, "delete-event", 2), owner);
    await expect(service.deleteEvent(updated.id, context(owner, "delete-event", 2), owner)).resolves.toBeUndefined();
    expect(store.auditEvents.map(({ previousEventHash }) => previousEventHash)).toEqual([
      null,
      store.auditEvents[0].eventHash,
      store.auditEvents[1].eventHash,
      store.auditEvents[2].eventHash
    ]);
  });

  it("honors selected sharing and prevents an event from expanding its layer access", async () => {
    const { service } = setup();
    const selected = await service.createLayer(
      { ...layerInput, visibility: { scope: "selected", participantGrantIds: ["grant-member"] } },
      context(owner, "selected-layer"),
      owner
    );
    await expect(service.listLayers("family-1", member)).resolves.toEqual([selected]);

    const privateEvent = await service.createEvent(
      { ...eventInput(selected.id), visibilityOverride: { scope: "private" } },
      context(owner, "private-event"),
      owner
    );
    await expect(service.listEvents("family-1", owner)).resolves.toEqual([privateEvent]);
    await expect(service.listEvents("family-1", member)).resolves.toEqual([]);

    const privateLayer = await service.createLayer(layerInput, context(owner, "private-override-layer"), owner);
    await expect(service.createEvent(
      { ...eventInput(privateLayer.id), visibilityOverride: { scope: "family" } },
      context(owner, "expanded-event"),
      owner
    )).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects invalid dates, unowned layers, and session impersonation", async () => {
    const { service } = setup();
    const layer = await service.createLayer(layerInput, context(owner, "validation-layer"), owner);
    await expect(service.createEvent(
      { ...eventInput(layer.id), endsAt: "2026-08-08T13:00:00.000Z" },
      context(owner, "bad-time"),
      owner
    )).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(service.createEvent(eventInput(layer.id), context(member, "member-write"), member)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.createLayer(layerInput, context(owner, "impersonate"), member)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
