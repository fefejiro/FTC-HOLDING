import type { FamilyInvitation } from "../domain/v2";
import {
  PostgresInvitationRateLimiter,
  PostgresInvitationStore,
  type ReleasableSqlConnection,
  type SqlPool,
  type SqlResult
} from "./PostgresInvitationStore";

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

const invitation: FamilyInvitation = {
  id: "invitation-1",
  schemaVersion: "2.0",
  version: 1,
  region: "ca",
  provenance: {
    createdAt: "2026-08-01T12:00:00.000Z",
    createdBy: { identityId: "owner", sessionId: "session" },
    source: "app"
  },
  familyCircleId: "family-1",
  invitedRole: "parent",
  permissions: ["messages:read"],
  invitedByIdentityId: "owner",
  expiresAt: "2026-08-02T12:00:00.000Z",
  status: "pending",
  acceptedParticipantGrantId: null
};

const record = {
  invitation,
  codeHash: "hashed-code-only",
  inviterDisplayName: "Alex Morgan",
  familyDisplayName: "Morgan family"
};

const idempotencyDigest = { digest: jest.fn(async (input: string) => `hashed:${input}`) };
const createStore = (pool: SqlPool) => new PostgresInvitationStore(
  pool,
  idempotencyDigest,
  "staging-idempotency-pepper"
);

describe("PostgresInvitationStore", () => {
  it("commits a unit of work on one released connection", async () => {
    const pool = new FakePool();
    const store = createStore(pool);

    await store.transaction(async (transaction) => {
      await transaction.save(record, null);
      return "done";
    });

    expect(pool.client.calls[0].text).toBe("BEGIN");
    expect(pool.client.calls.some((call) => call.text.includes("INSERT INTO peacepad_native_staging.invitations"))).toBe(true);
    expect(pool.client.calls.at(-1)?.text).toBe("COMMIT");
    expect(pool.client.released).toBe(true);
  });

  it("rolls back and releases when a unit of work fails", async () => {
    const pool = new FakePool();
    const store = createStore(pool);

    await expect(store.transaction(async () => { throw new Error("write failed"); })).rejects.toThrow("write failed");
    expect(pool.client.calls.map((call) => call.text)).toEqual(["BEGIN", "ROLLBACK"]);
    expect(pool.client.released).toBe(true);
  });

  it("stores only the invitation JSON and separate hash, never a plaintext code", async () => {
    const pool = new FakePool();
    const store = createStore(pool);
    await store.transaction((transaction) => transaction.save(record, null));

    const insert = pool.client.calls.find((call) => call.text.includes("INSERT INTO peacepad_native_staging.invitations"))!;
    expect(insert.values).toContain("hashed-code-only");
    expect(JSON.stringify(insert.values)).not.toContain("ABC123");
    expect(JSON.parse(insert.values?.[4] as string)).not.toHaveProperty("code");
  });

  it("maps compare-and-swap misses to a safe version conflict", async () => {
    const pool = new FakePool();
    pool.client.queued.push({ rows: [], rowCount: 0 });
    const store = createStore(pool);

    await expect(store.transaction((transaction) => transaction.save({
      ...record,
      invitation: { ...invitation, version: 2 }
    }, 1))).rejects.toMatchObject({ code: "VERSION_CONFLICT", status: 409 });
    expect(pool.client.calls.at(-1)?.text).toBe("ROLLBACK");
  });

  it("takes transaction-scoped locks for idempotency and the audit chain", async () => {
    const pool = new FakePool();
    pool.client.queued.push(
      { rows: [{ target_id: "target-1" }], rowCount: 1 },
      { rows: [], rowCount: 0 }
    );
    const store = createStore(pool);

    await store.transaction(async (transaction) => {
      await expect(transaction.findIdempotentResult("intent")).resolves.toBe("target-1");
      await expect(transaction.latestAudit()).resolves.toBeUndefined();
    });
    const locks = pool.client.calls.filter((call) => call.text.includes("pg_advisory_xact_lock"));
    expect(locks).toHaveLength(2);
    expect(JSON.stringify(pool.client.calls)).not.toContain('"intent"');
    expect(idempotencyDigest.digest).toHaveBeenCalledWith("staging-idempotency-pepper:intent");
  });

  it("persists and verifies only hashed resolution subjects", async () => {
    const pool = new FakePool();
    pool.client.queued.push(
      { rows: [], rowCount: 1 },
      { rows: [{ "?column?": 1 }], rowCount: 1 }
    );
    const store = createStore(pool);

    await store.transaction(async (transaction) => {
      await transaction.saveResolutionClaim("subject-hash", invitation.id, invitation.expiresAt);
      await expect(transaction.hasResolutionClaim("subject-hash", invitation.id)).resolves.toBe(true);
    });

    const claimCalls = pool.client.calls.filter((call) => call.text.includes("invitation_resolution_claims"));
    expect(claimCalls).toHaveLength(2);
    expect(JSON.stringify(claimCalls)).toContain("subject-hash");
    expect(JSON.stringify(claimCalls)).not.toContain("raw-requester");
  });
});

describe("PostgresInvitationRateLimiter", () => {
  it("uses a hashed subject in an atomic shared rate-limit upsert", async () => {
    const sql = new FakeConnection();
    sql.queued.push({ rows: [{ attempts: 2 }], rowCount: 1 });
    const digest = { digest: jest.fn(async () => "subject-hash") };
    const limiter = new PostgresInvitationRateLimiter(sql, digest, "staging-rate-pepper");

    await expect(limiter.enforce("resolve", "raw-device-key", 8, 60_000)).resolves.toBe(true);
    expect(digest.digest).toHaveBeenCalledWith("staging-rate-pepper:resolve:raw-device-key");
    const call = sql.calls[0];
    expect(call.text).toContain("ON CONFLICT");
    expect(call.values).toEqual(["resolve", "subject-hash", 60_000]);
    expect(JSON.stringify(call.values)).not.toContain("raw-device-key");
  });

  it("denies attempts above the configured limit", async () => {
    const sql = new FakeConnection();
    sql.queued.push({ rows: [{ attempts: 9 }], rowCount: 1 });
    const limiter = new PostgresInvitationRateLimiter(sql, { digest: async () => "hash" }, "staging-rate-pepper");
    await expect(limiter.enforce("resolve", "subject", 8, 60_000)).resolves.toBe(false);
  });
});
