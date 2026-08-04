import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

    process.stdout.write("Embedded PostgreSQL verification passed: migration, constraints, invitation acceptance, grant, and audit chain.\n");
  } finally {
    await database.close();
  }
}

verify().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
