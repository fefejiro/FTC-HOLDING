import type { AuditEvent, Conversation, MessageCheckPreference, MessageEvent } from "../domain/v2";
import type { MessagingStore } from "./MessagingService";
import { InvitationServiceError, type SecretDigest } from "./InvitationService";
import type { SqlConnection, SqlPool } from "./PostgresInvitationStore";

type JsonRow<T> = Readonly<{ record: T | string }>;
const jsonValue = <T>(value: T | string): T => typeof value === "string" ? JSON.parse(value) as T : value;

export class PostgresMessagingStore implements MessagingStore {
  constructor(private readonly pool: SqlPool, private readonly digest: SecretDigest, private readonly pepper: string,
    private readonly connection: SqlConnection = pool, private readonly inTransaction = false) {
    if (pepper.trim().length < 16) throw new Error("Messaging persistence requires a server-only idempotency pepper.");
  }
  async transaction<T>(work: (store: MessagingStore) => Promise<T>): Promise<T> {
    if (this.inTransaction) return work(this);
    const client = await this.pool.connect(); let began = false;
    try { await client.query("BEGIN"); began = true; const result = await work(new PostgresMessagingStore(this.pool, this.digest, this.pepper, client, true)); await client.query("COMMIT"); return result; }
    catch (error) { if (began) await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async listConversations(familyCircleId: string) {
    const result = await this.connection.query<JsonRow<Conversation>>("SELECT conversation_record AS record FROM peacepad_native_staging.conversations WHERE family_circle_id = $1 ORDER BY created_at, id", [familyCircleId]);
    return result.rows.map(({ record }) => jsonValue(record));
  }
  async findConversation(id: string) {
    const result = await this.connection.query<JsonRow<Conversation>>("SELECT conversation_record AS record FROM peacepad_native_staging.conversations WHERE id = $1", [id]);
    return result.rows[0] ? jsonValue(result.rows[0].record) : undefined;
  }
  async saveConversation(value: Conversation) {
    await this.connection.query(`INSERT INTO peacepad_native_staging.conversations (id, region, version, family_circle_id, participant_identity_ids, status, conversation_record) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb)`,
      [value.id, value.region, value.version, value.familyCircleId, JSON.stringify(value.participantIdentityIds), value.status, JSON.stringify(value)]);
  }
  async listMessages(conversationId: string) {
    const result = await this.connection.query<JsonRow<MessageEvent>>("SELECT message_record AS record FROM peacepad_native_staging.message_events WHERE conversation_id = $1 ORDER BY occurred_at, id", [conversationId]);
    return result.rows.map(({ record }) => jsonValue(record));
  }
  async appendMessage(value: MessageEvent) {
    await this.connection.query(`INSERT INTO peacepad_native_staging.message_events (id, region, version, family_circle_id, conversation_id, event_type, occurred_at, message_record) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [value.id, value.region, value.version, value.familyCircleId, value.conversationId, value.eventType, value.occurredAt, JSON.stringify(value)]);
  }
  async findPreference(identityId: string, conversationId: string) {
    const result = await this.connection.query<JsonRow<MessageCheckPreference>>("SELECT preference_record AS record FROM peacepad_native_staging.message_check_preferences WHERE identity_id = $1 AND conversation_id = $2", [identityId, conversationId]);
    return result.rows[0] ? jsonValue(result.rows[0].record) : undefined;
  }
  async savePreference(value: MessageCheckPreference, expectedVersion: number | null) {
    if (expectedVersion === null) {
      await this.connection.query(`INSERT INTO peacepad_native_staging.message_check_preferences (id, region, version, identity_id, conversation_id, preference_record) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [value.id, value.region, value.version, value.identityId, value.conversationId, JSON.stringify(value)]); return;
    }
    const result = await this.connection.query(`UPDATE peacepad_native_staging.message_check_preferences SET version=$2, preference_record=$3::jsonb, updated_at=now() WHERE id=$1 AND version=$4`, [value.id, value.version, JSON.stringify(value), expectedVersion]);
    if (result.rowCount !== 1) throw new InvitationServiceError("VERSION_CONFLICT", "This setting changed. Refresh and try again.", 409);
  }
  async findIdempotentResult(key: string) {
    this.assertTransaction("idempotency lookup"); const hash = await this.hashKey(key);
    await this.connection.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`idempotency:${hash}`]);
    const result = await this.connection.query<{target_id: string}>("SELECT target_id FROM peacepad_native_staging.idempotency_receipts WHERE operation_hash=$1", [hash]); return result.rows[0]?.target_id;
  }
  async saveIdempotentResult(key: string, targetId: string) { await this.connection.query("INSERT INTO peacepad_native_staging.idempotency_receipts (operation_hash,target_id) VALUES ($1,$2)", [await this.hashKey(key), targetId]); }
  async appendAudit(event: AuditEvent) { this.assertTransaction("audit append"); await this.connection.query(`INSERT INTO peacepad_native_staging.audit_events (id,region,sequence,event_hash,previous_event_hash,event) VALUES ($1,$2,$3,$4,$5,$6::jsonb)`, [event.id,event.region,event.sequence,event.eventHash,event.previousEventHash,JSON.stringify(event)]); }
  async latestAudit() { this.assertTransaction("audit lookup"); await this.connection.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", ["peacepad-native-staging:audit"]); const result=await this.connection.query<JsonRow<AuditEvent>>("SELECT event AS record FROM peacepad_native_staging.audit_events ORDER BY sequence DESC LIMIT 1 FOR UPDATE"); return result.rows[0] ? jsonValue(result.rows[0].record) : undefined; }
  private assertTransaction(operation: string) { if (!this.inTransaction) throw new Error(`Postgres messaging ${operation} requires an active transaction.`); }
  private hashKey(key: string) { return this.digest.digest(`${this.pepper}:${key}`); }
}
