import type { AuditEvent, CalendarLayer, ScheduleEvent } from "../domain/v2";
import { PostgresCalendarStore } from "./PostgresCalendarStore";
import type { ReleasableSqlConnection, SqlPool, SqlResult } from "./PostgresInvitationStore";

class FakeConnection implements ReleasableSqlConnection {
  readonly calls: { text: string; values?: readonly unknown[] }[] = [];
  readonly queued: SqlResult[] = [];
  released = false;
  async query<Row = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<SqlResult<Row>> {
    this.calls.push({ text, values });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text) || text.includes("pg_advisory_xact_lock")) {
      return { rows: [], rowCount: null } as SqlResult<Row>;
    }
    return (this.queued.shift() ?? { rows: [], rowCount: 1 }) as SqlResult<Row>;
  }
  release() { this.released = true; }
}

class FakePool extends FakeConnection implements SqlPool {
  readonly client = new FakeConnection();
  async connect() { return this.client; }
}

const actor = { identityId: "owner", sessionId: "session" };
const provenance = { createdAt: "2026-08-04T12:00:00.000Z", createdBy: actor, source: "app" as const };
const layer: CalendarLayer = {
  id: "layer-1", schemaVersion: "2.0", version: 1, region: "ca", provenance,
  familyCircleId: "family-1", ownerIdentityId: "owner", name: "Parenting time",
  kind: "parenting-time", icon: "calendar", colorToken: "teal", visibility: { scope: "private" }
};
const event: ScheduleEvent = {
  id: "event-1", schemaVersion: "2.0", version: 1, region: "ca", provenance,
  familyCircleId: "family-1", calendarLayerId: layer.id, childProfileIds: [],
  eventType: "parenting-time", title: "Weekend", description: null,
  startsAt: "2026-08-08T14:00:00.000Z", endsAt: "2026-08-09T20:00:00.000Z",
  status: "planned", recurrence: null, visibilityOverride: null
};
const audit: AuditEvent = {
  id: "audit-1", schemaVersion: "2.0", region: "ca", sequence: 1,
  occurredAt: provenance.createdAt, actor, action: "calendar-layer.created",
  targetType: "CalendarLayer", targetId: layer.id, previousEventHash: null,
  eventHash: "event-hash", payloadHash: "payload-hash"
};
const digest = { digest: jest.fn(async (input: string) => `hashed:${input}`) };
const createStore = (pool: SqlPool) => new PostgresCalendarStore(pool, digest, "calendar-store-pepper");

describe("PostgresCalendarStore", () => {
  it("commits layer and event writes on one released connection", async () => {
    const pool = new FakePool();
    const store = createStore(pool);
    await store.transaction(async (transaction) => {
      await transaction.saveLayer(layer, null);
      await transaction.saveEvent(event, null);
    });
    expect(pool.client.calls[0].text).toBe("BEGIN");
    expect(pool.client.calls.some(({ text }) => text.includes("INSERT INTO peacepad_native_staging.calendar_layers"))).toBe(true);
    expect(pool.client.calls.some(({ text }) => text.includes("INSERT INTO peacepad_native_staging.schedule_events"))).toBe(true);
    expect(pool.client.calls.at(-1)?.text).toBe("COMMIT");
    expect(pool.client.released).toBe(true);
  });

  it("reads JSON records and returns undefined for missing IDs", async () => {
    const pool = new FakePool();
    pool.queued.push(
      { rows: [{ record: JSON.stringify(layer) }], rowCount: 1 },
      { rows: [{ record: layer }], rowCount: 1 },
      { rows: [], rowCount: 0 },
      { rows: [{ record: JSON.stringify(event) }], rowCount: 1 },
      { rows: [{ record: event }], rowCount: 1 },
      { rows: [], rowCount: 0 }
    );
    const store = createStore(pool);
    await expect(store.listLayers("family-1")).resolves.toEqual([layer]);
    await expect(store.findLayer(layer.id)).resolves.toEqual(layer);
    await expect(store.findLayer("missing")).resolves.toBeUndefined();
    await expect(store.listEvents("family-1")).resolves.toEqual([event]);
    await expect(store.findEvent(event.id)).resolves.toEqual(event);
    await expect(store.findEvent("missing")).resolves.toBeUndefined();
  });

  it("updates and deletes records with compare-and-swap versions", async () => {
    const pool = new FakePool();
    const store = createStore(pool);
    await store.transaction(async (transaction) => {
      await transaction.saveLayer({ ...layer, version: 2 }, 1);
      await transaction.saveEvent({ ...event, version: 2 }, 1);
      await transaction.deleteEvent(event.id, 2);
      await transaction.deleteLayer(layer.id, 2);
    });
    expect(pool.client.calls.filter(({ text }) => /UPDATE peacepad_native_staging/.test(text))).toHaveLength(2);
    expect(pool.client.calls.filter(({ text }) => /DELETE FROM peacepad_native_staging/.test(text))).toHaveLength(2);
  });

  it.each([
    ["layer update", (store: PostgresCalendarStore) => store.saveLayer({ ...layer, version: 2 }, 1)],
    ["layer delete", (store: PostgresCalendarStore) => store.deleteLayer(layer.id, 1)],
    ["event update", (store: PostgresCalendarStore) => store.saveEvent({ ...event, version: 2 }, 1)],
    ["event delete", (store: PostgresCalendarStore) => store.deleteEvent(event.id, 1)]
  ])("maps a missed %s to a safe version conflict", async (_label, operation) => {
    const pool = new FakePool();
    pool.client.queued.push({ rows: [], rowCount: 0 });
    await expect(createStore(pool).transaction((transaction) => operation(transaction as PostgresCalendarStore)))
      .rejects.toMatchObject({ code: "VERSION_CONFLICT", status: 409 });
    expect(pool.client.calls.at(-1)?.text).toBe("ROLLBACK");
  });

  it("hashes idempotency keys and serializes the append-only audit lookup", async () => {
    const pool = new FakePool();
    pool.client.queued.push(
      { rows: [{ target_id: "layer-1" }], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [{ event: JSON.stringify(audit) }], rowCount: 1 },
      { rows: [], rowCount: 1 }
    );
    const store = createStore(pool);
    await store.transaction(async (transaction) => {
      await expect(transaction.findIdempotentResult("raw-intent")).resolves.toBe(layer.id);
      await transaction.saveIdempotentResult("raw-intent", layer.id);
      await expect(transaction.latestAudit()).resolves.toEqual(audit);
      await transaction.appendAudit(audit);
    });
    expect(digest.digest).toHaveBeenCalledWith("calendar-store-pepper:raw-intent");
    expect(JSON.stringify(pool.client.calls)).not.toContain('"raw-intent"');
    expect(pool.client.calls.filter(({ text }) => text.includes("pg_advisory_xact_lock"))).toHaveLength(2);
  });

  it("requires transaction scope for receipts/audit and rolls back failures", async () => {
    const pool = new FakePool();
    const store = createStore(pool);
    await expect(store.findIdempotentResult("intent")).rejects.toThrow(/transaction/i);
    await expect(store.latestAudit()).rejects.toThrow(/transaction/i);
    await expect(store.transaction(async () => { throw new Error("write failed"); })).rejects.toThrow("write failed");
    expect(pool.client.calls.map(({ text }) => text)).toEqual(["BEGIN", "ROLLBACK"]);
    expect(pool.client.released).toBe(true);
  });
});
