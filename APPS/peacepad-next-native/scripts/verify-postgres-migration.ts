import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { createWriteContext } from "../src/domain/v2";
import {
  InvitationService,
  type SecretDigest,
  type StagingActor
} from "../src/staging/InvitationService";
import {
  PostgresInvitationRateLimiter,
  PostgresInvitationStore,
  type ReleasableSqlConnection,
  type SqlPool,
  type SqlResult
} from "../src/staging/PostgresInvitationStore";
import { createStagingHttpServer } from "../src/staging/StagingHttpServer";
import { createStagingInvitationRuntime } from "../src/staging/createStagingInvitationRuntime";

const migration = readFileSync(
  path.resolve(process.cwd(), "staging/migrations/0001_invitation_slice.sql"),
  "utf8"
);

class EmbeddedPostgresPool implements SqlPool, ReleasableSqlConnection {
  constructor(readonly database: PGlite) {}

  async query<Row = Record<string, unknown>>(
    text: string,
    values: readonly unknown[] = []
  ): Promise<SqlResult<Row>> {
    const result = await this.database.query<Row>(text, [...values]);
    return {
      rows: result.rows,
      // node-postgres reports selected rows in rowCount; PGlite reports zero
      // affected rows for SELECT even when result.rows is populated.
      rowCount: result.rows.length > 0 ? result.rows.length : result.affectedRows ?? 0
    };
  }

  async connect() { return this; }
  release() {}
}

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

const owner: StagingActor = {
  identityId: "identity-owner",
  displayName: "Alex Morgan",
  sessionId: "session-owner",
  familyPermissions: { "family-1": ["invite"] }
};

const recipient: StagingActor = {
  identityId: "identity-recipient",
  displayName: "Jordan Lee",
  sessionId: "session-recipient",
  familyPermissions: {}
};

const context = (actor: StagingActor, key: string, expectedVersion: number | null = null) =>
  createWriteContext({
    idempotencyKey: key,
    expectedVersion,
    region: "ca",
    actor: { identityId: actor.identityId, sessionId: actor.sessionId }
  });

const expectDatabaseFailure = async (work: () => Promise<unknown>, label: string) => {
  let failed = false;
  try {
    await work();
  } catch (error) {
    failed = /check constraint/i.test(error instanceof Error ? error.message : String(error));
  }
  assert.equal(failed, true, `${label} must be rejected by a database check constraint`);
};

const listen = (server: Server) => new Promise<string>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") return reject(new Error("HTTP proof did not receive a TCP port."));
    resolve(`http://127.0.0.1:${address.port}`);
  });
});

const close = (server: Server) => new Promise<void>((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
});

async function verify() {
  const database = new PGlite();
  await database.waitReady;
  try {
    await database.exec(migration);
    await database.exec(migration);

    const tables = await database.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'peacepad_native_staging' ORDER BY table_name`
    );
    assert.deepEqual(tables.rows.map(({ table_name }) => table_name), [
      "audit_events",
      "idempotency_receipts",
      "invitation_resolution_claims",
      "invitations",
      "participant_grants",
      "rate_limits"
    ]);

    const pool = new EmbeddedPostgresPool(database);
    const insert = `INSERT INTO peacepad_native_staging.invitations
      (id, region, version, code_hash, invitation, inviter_display_name, family_display_name,
       family_circle_id, status, expires_at)
      VALUES ($1, $2, 1, $3, $4::jsonb, 'Alex', 'Morgan family', 'family-1', 'pending', $5)`;

    await expectDatabaseFailure(() => pool.query(insert, [
      "invitation-invalid-region", "eu", "hash-invalid-region",
      JSON.stringify({ id: "invitation-invalid-region" }), "2026-08-05T12:00:00.000Z"
    ]), "invalid region");
    await expectDatabaseFailure(() => pool.query(insert, [
      "invitation-plaintext-code", "ca", "hash-plaintext-code",
      JSON.stringify({ id: "invitation-plaintext-code", code: "ABC123" }), "2026-08-05T12:00:00.000Z"
    ]), "plaintext invitation code");

    const digest = new TestDigest();
    const store = new PostgresInvitationStore(pool, digest, "staging-idempotency-pepper");
    const service = new InvitationService({
      store,
      digest,
      rateLimiter: new PostgresInvitationRateLimiter(pool, digest, "staging-rate-limit-pepper"),
      pepper: "staging-invitation-pepper",
      // PostgreSQL enforces claim expiry with its own clock, so this proof uses
      // the host clock rather than a pinned unit-test clock.
      clock: { now: () => new Date() },
      directory: { familyName: async (id) => id === "family-1" ? "Morgan family" : undefined }
    });

    const created = await service.create({
      familyCircleId: "family-1",
      invitedRole: "parent",
      permissions: ["messages:read", "calendar:read"],
      expiresInHours: 24
    }, context(owner, "postgres-create"), owner);

    const stored = await database.query<{ invitation: unknown; code_hash: string }>(
      "SELECT invitation, code_hash FROM peacepad_native_staging.invitations WHERE id = $1",
      [created.invitation.id]
    );
    assert.equal(JSON.stringify(stored.rows[0]).includes(created.code), false);
    assert.notEqual(stored.rows[0]?.code_hash, created.code);

    const preview = await service.resolve(created.code, recipient.sessionId);
    assert.equal(preview.familyDisplayName, "Morgan family");
    const claim = await database.query<{
      subject_hash: string;
      invitation_id: string;
      expires_at: Date;
      db_now: Date;
    }>(
      `SELECT subject_hash, invitation_id, expires_at, now() AS db_now
         FROM peacepad_native_staging.invitation_resolution_claims`
    );
    const expectedSubjectHash = await digest.digest(
      `staging-invitation-pepper:resolution-claim:${recipient.sessionId}`
    );
    assert.equal(claim.rows[0]?.subject_hash, expectedSubjectHash);
    assert.equal(claim.rows[0]?.invitation_id, created.invitation.id);
    assert.ok(
      new Date(claim.rows[0]!.expires_at).getTime() > new Date(claim.rows[0]!.db_now).getTime(),
      "resolution claim must remain active according to the database clock"
    );
    const grant = await service.accept(
      created.invitation.id,
      context(recipient, "postgres-accept", 1),
      recipient
    );

    const invitation = await database.query<{ status: string; version: number }>(
      "SELECT status, version FROM peacepad_native_staging.invitations WHERE id = $1",
      [created.invitation.id]
    );
    const grants = await database.query<{ id: string; identity_id: string }>(
      "SELECT id, identity_id FROM peacepad_native_staging.participant_grants WHERE id = $1",
      [grant.id]
    );
    const audit = await database.query<{ action: string; previous_event_hash: string | null }>(
      `SELECT event->>'action' AS action, previous_event_hash
         FROM peacepad_native_staging.audit_events ORDER BY sequence`
    );

    assert.deepEqual(invitation.rows, [{ status: "accepted", version: 2 }]);
    assert.deepEqual(grants.rows, [{ id: grant.id, identity_id: recipient.identityId }]);
    assert.deepEqual(audit.rows.map(({ action }) => action), [
      "invitation.created",
      "invitation.accepted"
    ]);
    assert.equal(audit.rows[0]?.previous_event_hash, null);
    assert.ok(audit.rows[1]?.previous_event_hash);

    const ownerToken = "fictional-owner-session";
    const recipientToken = "fictional-recipient-session";
    const authenticator = {
      authenticate: async (token: string) => token === ownerToken
        ? owner
        : token === recipientToken ? recipient : undefined
    };
    const createRuntime = () => createStagingInvitationRuntime({
      runtimeEnvironment: "staging",
      serviceOrigin: "http://127.0.0.1",
      invitationPepper: "fictional-http-invitation-pepper",
      rateLimitPepper: "fictional-http-rate-limit-pepper",
      idempotencyPepper: "fictional-http-idempotency-pepper",
      sqlPool: pool,
      authenticator,
      directory: { familyName: async (id) => id === "family-1" ? "Morgan family" : undefined },
      subtle: webcrypto.subtle
    });
    const logs: string[] = [];
    const logger = {
      info: (message?: unknown) => { logs.push(String(message)); },
      error: (message?: unknown) => { logs.push(String(message)); }
    };
    const createHttpServer = () => createStagingHttpServer({
      serviceOrigin: "http://127.0.0.1",
      appOrigin: "https://native.staging.peacepad.ca",
      bridge: createRuntime().bridge,
      readiness: async () => { await pool.query("SELECT 1"); },
      logger
    });
    const headersFor = (token: string, idempotencyKey: string, version?: number) => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      Origin: "https://native.staging.peacepad.ca",
      "X-PeacePad-Region": "ca",
      "X-PeacePad-Schema-Version": "2.0",
      ...(version === undefined ? {} : { "If-Match": String(version) })
    });

    let httpServer = createHttpServer();
    let baseUrl = await listen(httpServer);
    const health = await fetch(`${baseUrl}/health`);
    const readiness = await fetch(`${baseUrl}/readyz`);
    assert.equal(health.status, 200);
    assert.equal(readiness.status, 200);

    const deniedOrigin = await fetch(`${baseUrl}/api/v2/invitations`, {
      method: "POST",
      headers: { ...headersFor(ownerToken, "http-denied-origin"), Origin: "https://not-peacepad.example" },
      body: JSON.stringify({})
    });
    assert.equal(deniedOrigin.status, 403);

    const createdResponse = await fetch(`${baseUrl}/api/v2/invitations`, {
      method: "POST",
      headers: headersFor(ownerToken, "http-create"),
      body: JSON.stringify({
        familyCircleId: "family-1",
        invitedRole: "parent",
        permissions: ["messages:read", "calendar:read"],
        expiresInHours: 24
      })
    });
    assert.equal(createdResponse.status, 201);
    const httpCreated = await createdResponse.json() as {
      code: string;
      invitation: { id: string };
    };

    const resolvedResponse = await fetch(`${baseUrl}/api/v2/invitations/resolve`, {
      method: "POST",
      headers: headersFor(recipientToken, "http-resolve"),
      body: JSON.stringify({ code: httpCreated.code })
    });
    assert.equal(resolvedResponse.status, 200);

    await close(httpServer);
    httpServer = createHttpServer();
    baseUrl = await listen(httpServer);
    try {
      const acceptedResponse = await fetch(
        `${baseUrl}/api/v2/invitations/${encodeURIComponent(httpCreated.invitation.id)}/accept`,
        {
          method: "POST",
          headers: headersFor(recipientToken, "http-accept", 1),
          body: JSON.stringify({})
        }
      );
      assert.equal(acceptedResponse.status, 200);
      const acceptedGrant = await acceptedResponse.json() as { identityId: string };
      assert.equal(acceptedGrant.identityId, recipient.identityId);
    } finally {
      await close(httpServer);
    }
    const serializedLogs = logs.join("\n");
    assert.equal(serializedLogs.includes(ownerToken), false);
    assert.equal(serializedLogs.includes(recipientToken), false);
    assert.equal(serializedLogs.includes(httpCreated.code), false);

    process.stdout.write(
      "Embedded PostgreSQL and HTTP restart verification passed: migration, constraints, invitation acceptance, grant, and audit chain.\n"
    );
  } finally {
    await database.close();
  }
}

verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
