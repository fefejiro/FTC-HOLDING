import { describe, expect, it } from "vitest";
import { createStatsLedger, toCsv, type StatsLedgerEvent } from "../src/index";

type QueryCall = { text: string; values?: unknown[] };

class FakePool {
  calls: QueryCall[] = [];

  async query(text: string, values?: unknown[]) {
    this.calls.push({ text, values });

    if (text.includes("RETURNING *")) {
      return {
        rows: []
      };
    }

    if (text.includes("WHERE idempotency_key = $1 LIMIT 1")) {
      return {
        rows: [
          {
            id: "42",
            idempotency_key: "event-1",
            source: "og-trades-stats-bot",
            event_type: "lead_submitted",
            actor_id: null,
            value: 1,
            metadata: { plan: "starter" },
            occurred_at: "2026-05-06T10:00:00.000Z",
            created_at: "2026-05-06T10:00:00.000Z"
          }
        ]
      };
    }

    if (text.includes("ORDER BY occurred_at DESC")) {
      return {
        rows: [
          {
            id: "44",
            idempotency_key: "event-2",
            source: "og-trades-stats-bot",
            event_type: "lead_submitted",
            actor_id: "actor-1",
            value: 3,
            metadata: { plan: "pro" },
            occurred_at: "2026-05-07T10:00:00.000Z",
            created_at: "2026-05-07T10:00:00.000Z"
          }
        ]
      };
    }

    if (text.includes("COUNT(*)::int AS total")) {
      return { rows: [{ total: 5 }] };
    }

    if (text.includes("GROUP BY event_type")) {
      return {
        rows: [
          { event_type: "lead_submitted", count: 4 },
          { event_type: "lead_confirmed", count: 1 }
        ]
      };
    }

    if (text.includes("GROUP BY day")) {
      return {
        rows: [
          { day: "2026-05-06", count: 2 },
          { day: "2026-05-07", count: 3 }
        ]
      };
    }

    return { rows: [] };
  }
}

describe("stats-ledger", () => {
  it("returns existing row for duplicate idempotency keys", async () => {
    const pool = new FakePool();
    const ledger = createStatsLedger({ pool, tableName: "stats_ledger_events" });

    const saved = await ledger.record({
      idempotencyKey: "event-1",
      source: "og-trades-stats-bot",
      eventType: "lead_submitted",
      value: 1,
      metadata: { plan: "starter" }
    });

    expect(saved.id).toBe("42");
    expect(saved.idempotencyKey).toBe("event-1");

    const conflictLookup = pool.calls.find((call) =>
      call.text.includes("WHERE idempotency_key = $1 LIMIT 1")
    );

    expect(conflictLookup).toBeTruthy();
  });

  it("builds filtered query with bounded limits", async () => {
    const pool = new FakePool();
    const ledger = createStatsLedger({ pool, tableName: "stats_ledger_events" });

    const events = await ledger.query({
      source: "og-trades-stats-bot",
      eventType: "lead_submitted",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.999Z",
      limit: 999
    });

    expect(events).toHaveLength(1);
    const queryCall = pool.calls.find((call) => call.text.includes("ORDER BY occurred_at DESC"));

    expect(queryCall?.values?.at(-1)).toBe(500);
  });

  it("aggregates totals, type buckets, and sparkline points", async () => {
    const pool = new FakePool();
    const ledger = createStatsLedger({ pool, tableName: "stats_ledger_events" });

    const result = await ledger.aggregate({ source: "og-trades-stats-bot" });

    expect(result.total).toBe(5);
    expect(result.byEventType[0]).toEqual({ eventType: "lead_submitted", count: 4 });
    expect(result.sparkline).toEqual([
      { day: "2026-05-06", count: 2 },
      { day: "2026-05-07", count: 3 }
    ]);
  });

  it("exports csv with escaped metadata", () => {
    const events: StatsLedgerEvent[] = [
      {
        id: "1",
        idempotencyKey: "abc",
        source: "og-trades-stats-bot",
        eventType: "lead_submitted",
        actorId: null,
        value: 1,
        occurredAt: "2026-05-06T10:00:00.000Z",
        createdAt: "2026-05-06T10:00:00.000Z",
        metadata: { note: "He said \"yes\"" }
      }
    ];

    const csv = toCsv(events);

    expect(csv).toContain("idempotencyKey");
    expect(csv).toContain(",metadata");
    expect(csv).toContain("He said");
  });
});
