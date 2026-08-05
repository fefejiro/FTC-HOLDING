import type { AttachmentUploadIntent, AuditEvent, Conversation } from "../domain/v2";
import type { AttachmentIntentStore } from "./AttachmentIntentService";
import { type SecretDigest } from "./InvitationService";
import type { SqlConnection, SqlPool } from "./PostgresInvitationStore";

type JsonRow<T> = Readonly<{ record: T | string }>;
const jsonValue = <T>(value: T | string): T => typeof value === "string" ? JSON.parse(value) as T : value;

export class PostgresAttachmentIntentStore implements AttachmentIntentStore {
  constructor(
    private readonly pool: SqlPool,
    private readonly digest: SecretDigest,
    private readonly pepper: string,
    private readonly connection: SqlConnection = pool,
    private readonly inTransaction = false
  ) {
    if (pepper.trim().length < 16) throw new Error("Attachment persistence requires a server-only idempotency pepper.");
  }

  async transaction<T>(work: (store: AttachmentIntentStore) => Promise<T>): Promise<T> {
    if (this.inTransaction) return work(this);
    const client = await this.pool.connect();
    let began = false;
    try {
      await client.query("BEGIN");
      began = true;
      const result = await work(new PostgresAttachmentIntentStore(this.pool, this.digest, this.pepper, client, true));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      if (began) await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findConversation(id: string) {
    const result = await this.connection.query<JsonRow<Conversation>>(
      "SELECT conversation_record AS record FROM peacepad_native_staging.conversations WHERE id = $1",
      [id]
    );
    return result.rows[0] ? jsonValue(result.rows[0].record) : undefined;
  }

  async findIntent(id: string) {
    const result = await this.connection.query<JsonRow<AttachmentUploadIntent>>(
      "SELECT intent_record AS record FROM peacepad_native_staging.attachment_upload_intents WHERE id = $1",
      [id]
    );
    return result.rows[0] ? jsonValue(result.rows[0].record) : undefined;
  }

  async saveIntent(value: AttachmentUploadIntent) {
    await this.connection.query(
      `INSERT INTO peacepad_native_staging.attachment_upload_intents
        (id, region, version, family_circle_id, owner_identity_id, target_kind, expires_at, intent_record)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [value.id, value.region, value.version, value.familyCircleId, value.ownerIdentityId, value.target.kind, value.expiresAt, JSON.stringify(value)]
    );
  }

  async findIdempotentResult(key: string) {
    this.assertTransaction("idempotency lookup");
    const hash = await this.hashKey(key);
    await this.connection.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`idempotency:${hash}`]);
    const result = await this.connection.query<{ target_id: string }>(
      "SELECT target_id FROM peacepad_native_staging.idempotency_receipts WHERE operation_hash = $1",
      [hash]
    );
    return result.rows[0]?.target_id;
  }

  async saveIdempotentResult(key: string, targetId: string) {
    await this.connection.query(
      "INSERT INTO peacepad_native_staging.idempotency_receipts (operation_hash, target_id) VALUES ($1,$2)",
      [await this.hashKey(key), targetId]
    );
  }

  async appendAudit(event: AuditEvent) {
    this.assertTransaction("audit append");
    await this.connection.query(
      `INSERT INTO peacepad_native_staging.audit_events
        (id, region, sequence, event_hash, previous_event_hash, event)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
      [event.id, event.region, event.sequence, event.eventHash, event.previousEventHash, JSON.stringify(event)]
    );
  }

  async latestAudit() {
    this.assertTransaction("audit lookup");
    await this.connection.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", ["peacepad-native-staging:audit"]);
    const result = await this.connection.query<JsonRow<AuditEvent>>(
      "SELECT event AS record FROM peacepad_native_staging.audit_events ORDER BY sequence DESC LIMIT 1 FOR UPDATE"
    );
    return result.rows[0] ? jsonValue(result.rows[0].record) : undefined;
  }

  private assertTransaction(operation: string) {
    if (!this.inTransaction) throw new Error(`Postgres attachment ${operation} requires an active transaction.`);
  }

  private hashKey(key: string) {
    return this.digest.digest(`${this.pepper}:${key}`);
  }
}
