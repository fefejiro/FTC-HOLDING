import type { AuditEvent, ParticipantGrant } from "../domain/v2";
import {
  InvitationServiceError,
  type InvitationRateLimiter,
  type InvitationStore,
  type SecretDigest,
  type StoredInvitation
} from "./InvitationService";

export type SqlResult<Row = Record<string, unknown>> = Readonly<{
  rows: readonly Row[];
  rowCount: number | null;
}>;

export interface SqlConnection {
  query<Row = Record<string, unknown>>(text: string, values?: readonly unknown[]): Promise<SqlResult<Row>>;
}

export interface ReleasableSqlConnection extends SqlConnection {
  release(): void;
}

export interface SqlPool extends SqlConnection {
  connect(): Promise<ReleasableSqlConnection>;
}

type InvitationRow = Readonly<{
  invitation: StoredInvitation["invitation"] | string;
  code_hash: string;
  inviter_display_name: string;
  family_display_name: string;
}>;

type AuditRow = Readonly<{ event: AuditEvent | string }>;
type IdempotencyRow = Readonly<{ target_id: string }>;

const jsonValue = <T>(value: T | string): T => typeof value === "string" ? JSON.parse(value) as T : value;

export class PostgresInvitationStore implements InvitationStore {
  constructor(
    private readonly pool: SqlPool,
    private readonly idempotencyDigest: SecretDigest,
    private readonly idempotencyPepper: string,
    private readonly connection: SqlConnection = pool,
    private readonly inTransaction = false
  ) {
    if (idempotencyPepper.trim().length < 16) throw new Error("Idempotency storage requires a server-only pepper.");
  }

  async transaction<T>(work: (store: InvitationStore) => Promise<T>): Promise<T> {
    if (this.inTransaction) return work(this);
    const client = await this.pool.connect();
    let began = false;
    try {
      await client.query("BEGIN");
      began = true;
      const result = await work(new PostgresInvitationStore(
        this.pool,
        this.idempotencyDigest,
        this.idempotencyPepper,
        client,
        true
      ));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      if (began) await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id: string) {
    const result = await this.connection.query<InvitationRow>(
      `SELECT invitation, code_hash, inviter_display_name, family_display_name
         FROM peacepad_native_staging.invitations
        WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? this.record(result.rows[0]) : undefined;
  }

  async findByCodeHash(codeHash: string) {
    const result = await this.connection.query<InvitationRow>(
      `SELECT invitation, code_hash, inviter_display_name, family_display_name
         FROM peacepad_native_staging.invitations
        WHERE code_hash = $1`,
      [codeHash]
    );
    return result.rows[0] ? this.record(result.rows[0]) : undefined;
  }

  async save(record: StoredInvitation, expectedVersion: number | null) {
    if (expectedVersion === null) {
      await this.connection.query(
        `INSERT INTO peacepad_native_staging.invitations
          (id, region, version, code_hash, invitation, inviter_display_name, family_display_name,
           family_circle_id, status, expires_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10)`,
        [
          record.invitation.id,
          record.invitation.region,
          record.invitation.version,
          record.codeHash,
          JSON.stringify(record.invitation),
          record.inviterDisplayName,
          record.familyDisplayName,
          record.invitation.familyCircleId,
          record.invitation.status,
          record.invitation.expiresAt
        ]
      );
      return;
    }
    const result = await this.connection.query(
      `UPDATE peacepad_native_staging.invitations
          SET version = $2, invitation = $3::jsonb, status = $5, expires_at = $6, updated_at = now()
        WHERE id = $1 AND version = $4`,
      [
        record.invitation.id,
        record.invitation.version,
        JSON.stringify(record.invitation),
        expectedVersion,
        record.invitation.status,
        record.invitation.expiresAt
      ]
    );
    if (result.rowCount !== 1) {
      throw new InvitationServiceError("VERSION_CONFLICT", "The invitation changed. Refresh and try again.", 409);
    }
  }

  async saveGrant(grant: ParticipantGrant) {
    await this.connection.query(
      `INSERT INTO peacepad_native_staging.participant_grants
        (id, region, family_circle_id, identity_id, grant_record)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [grant.id, grant.region, grant.familyCircleId, grant.identityId, JSON.stringify(grant)]
    );
  }

  async findIdempotentResult(key: string) {
    this.assertTransaction("idempotency lookup");
    const operationHash = await this.hashIdempotencyKey(key);
    await this.connection.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`idempotency:${operationHash}`]);
    const result = await this.connection.query<IdempotencyRow>(
      `SELECT target_id FROM peacepad_native_staging.idempotency_receipts WHERE operation_hash = $1`,
      [operationHash]
    );
    return result.rows[0]?.target_id;
  }

  async saveIdempotentResult(key: string, targetId: string) {
    const operationHash = await this.hashIdempotencyKey(key);
    await this.connection.query(
      `INSERT INTO peacepad_native_staging.idempotency_receipts (operation_hash, target_id)
       VALUES ($1, $2)`,
      [operationHash, targetId]
    );
  }

  async saveResolutionClaim(subjectHash: string, invitationId: string, expiresAt: string) {
    this.assertTransaction("resolution claim write");
    await this.connection.query(
      `INSERT INTO peacepad_native_staging.invitation_resolution_claims
        (subject_hash, invitation_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (subject_hash, invitation_id) DO UPDATE
       SET expires_at = EXCLUDED.expires_at`,
      [subjectHash, invitationId, expiresAt]
    );
  }

  async hasResolutionClaim(subjectHash: string, invitationId: string) {
    this.assertTransaction("resolution claim lookup");
    const result = await this.connection.query(
      `SELECT 1
         FROM peacepad_native_staging.invitation_resolution_claims
        WHERE subject_hash = $1
          AND invitation_id = $2
          AND expires_at > now()`,
      [subjectHash, invitationId]
    );
    return result.rowCount === 1;
  }

  async appendAudit(event: AuditEvent) {
    this.assertTransaction("audit append");
    await this.connection.query(
      `INSERT INTO peacepad_native_staging.audit_events
        (id, region, sequence, event_hash, previous_event_hash, event)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [event.id, event.region, event.sequence, event.eventHash, event.previousEventHash, JSON.stringify(event)]
    );
  }

  async latestAudit() {
    this.assertTransaction("audit lookup");
    await this.connection.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", ["peacepad-native-staging:audit"]);
    const result = await this.connection.query<AuditRow>(
      `SELECT event
         FROM peacepad_native_staging.audit_events
        ORDER BY sequence DESC
        LIMIT 1
        FOR UPDATE`
    );
    return result.rows[0] ? jsonValue(result.rows[0].event) : undefined;
  }

  private record(row: InvitationRow): StoredInvitation {
    return {
      invitation: jsonValue(row.invitation),
      codeHash: row.code_hash,
      inviterDisplayName: row.inviter_display_name,
      familyDisplayName: row.family_display_name
    };
  }

  private assertTransaction(operation: string) {
    if (!this.inTransaction) throw new Error(`Postgres ${operation} requires an active transaction.`);
  }

  private hashIdempotencyKey(key: string) {
    return this.idempotencyDigest.digest(`${this.idempotencyPepper}:${key}`);
  }
}

type RateLimitRow = Readonly<{ attempts: number }>;

export class PostgresInvitationRateLimiter implements InvitationRateLimiter {
  constructor(
    private readonly sql: SqlConnection,
    private readonly digest: SecretDigest,
    private readonly pepper: string
  ) {
    if (pepper.trim().length < 16) throw new Error("Rate limiting requires a server-only pepper.");
  }

  async enforce(scope: "create" | "resolve", subjectKey: string, limit: number, windowMs: number) {
    const subjectHash = await this.digest.digest(`${this.pepper}:${scope}:${subjectKey}`);
    const result = await this.sql.query<RateLimitRow>(
      `INSERT INTO peacepad_native_staging.rate_limits
        (scope, subject_hash, window_started_at, attempts)
       VALUES ($1, $2, now(), 1)
       ON CONFLICT (scope, subject_hash) DO UPDATE
       SET window_started_at = CASE
             WHEN peacepad_native_staging.rate_limits.window_started_at <= now() - ($3 * interval '1 millisecond')
             THEN now() ELSE peacepad_native_staging.rate_limits.window_started_at END,
           attempts = CASE
             WHEN peacepad_native_staging.rate_limits.window_started_at <= now() - ($3 * interval '1 millisecond')
             THEN 1 ELSE peacepad_native_staging.rate_limits.attempts + 1 END
       RETURNING attempts`,
      [scope, subjectHash, windowMs]
    );
    return (result.rows[0]?.attempts ?? limit + 1) <= limit;
  }
}
