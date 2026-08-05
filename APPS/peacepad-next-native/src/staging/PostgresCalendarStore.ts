import type { AuditEvent, CalendarLayer, ScheduleEvent } from "../domain/v2";
import type { CalendarStore } from "./CalendarService";
import { InvitationServiceError, type SecretDigest } from "./InvitationService";
import type { SqlConnection, SqlPool } from "./PostgresInvitationStore";

type JsonRow<T> = Readonly<{ record: T | string }>;
type IdempotencyRow = Readonly<{ target_id: string }>;
type AuditRow = Readonly<{ event: AuditEvent | string }>;

const jsonValue = <T>(value: T | string): T => typeof value === "string" ? JSON.parse(value) as T : value;

export class PostgresCalendarStore implements CalendarStore {
  constructor(
    private readonly pool: SqlPool,
    private readonly digest: SecretDigest,
    private readonly pepper: string,
    private readonly connection: SqlConnection = pool,
    private readonly inTransaction = false
  ) {
    if (pepper.trim().length < 16) throw new Error("Calendar persistence requires a server-only idempotency pepper.");
  }

  async transaction<T>(work: (store: CalendarStore) => Promise<T>): Promise<T> {
    if (this.inTransaction) return work(this);
    const client = await this.pool.connect();
    let began = false;
    try {
      await client.query("BEGIN");
      began = true;
      const result = await work(new PostgresCalendarStore(this.pool, this.digest, this.pepper, client, true));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      if (began) await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listLayers(familyCircleId: string) {
    const result = await this.connection.query<JsonRow<CalendarLayer>>(
      `SELECT layer_record AS record FROM peacepad_native_staging.calendar_layers
        WHERE family_circle_id = $1 ORDER BY created_at, id`,
      [familyCircleId]
    );
    return result.rows.map(({ record }) => jsonValue(record));
  }

  async findLayer(id: string) {
    const result = await this.connection.query<JsonRow<CalendarLayer>>(
      "SELECT layer_record AS record FROM peacepad_native_staging.calendar_layers WHERE id = $1",
      [id]
    );
    return result.rows[0] ? jsonValue(result.rows[0].record) : undefined;
  }

  async saveLayer(layer: CalendarLayer, expectedVersion: number | null) {
    if (expectedVersion === null) {
      await this.connection.query(
        `INSERT INTO peacepad_native_staging.calendar_layers
          (id, region, version, family_circle_id, owner_identity_id, visibility_scope, layer_record)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [layer.id, layer.region, layer.version, layer.familyCircleId, layer.ownerIdentityId, layer.visibility.scope, JSON.stringify(layer)]
      );
      return;
    }
    const result = await this.connection.query(
      `UPDATE peacepad_native_staging.calendar_layers
          SET version = $2, visibility_scope = $3, layer_record = $4::jsonb, updated_at = now()
        WHERE id = $1 AND version = $5`,
      [layer.id, layer.version, layer.visibility.scope, JSON.stringify(layer), expectedVersion]
    );
    if (result.rowCount !== 1) throw new InvitationServiceError("VERSION_CONFLICT", "The calendar changed. Refresh and try again.", 409);
  }

  async deleteLayer(id: string, expectedVersion: number) {
    const result = await this.connection.query(
      "DELETE FROM peacepad_native_staging.calendar_layers WHERE id = $1 AND version = $2",
      [id, expectedVersion]
    );
    if (result.rowCount !== 1) throw new InvitationServiceError("VERSION_CONFLICT", "The calendar changed. Refresh and try again.", 409);
  }

  async listEvents(familyCircleId: string) {
    const result = await this.connection.query<JsonRow<ScheduleEvent>>(
      `SELECT event_record AS record FROM peacepad_native_staging.schedule_events
        WHERE family_circle_id = $1 ORDER BY starts_at, id`,
      [familyCircleId]
    );
    return result.rows.map(({ record }) => jsonValue(record));
  }

  async findEvent(id: string) {
    const result = await this.connection.query<JsonRow<ScheduleEvent>>(
      "SELECT event_record AS record FROM peacepad_native_staging.schedule_events WHERE id = $1",
      [id]
    );
    return result.rows[0] ? jsonValue(result.rows[0].record) : undefined;
  }

  async saveEvent(event: ScheduleEvent, expectedVersion: number | null) {
    if (expectedVersion === null) {
      await this.connection.query(
        `INSERT INTO peacepad_native_staging.schedule_events
          (id, region, version, family_circle_id, calendar_layer_id, starts_at, ends_at, status, event_record)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
        [event.id, event.region, event.version, event.familyCircleId, event.calendarLayerId, event.startsAt, event.endsAt, event.status, JSON.stringify(event)]
      );
      return;
    }
    const result = await this.connection.query(
      `UPDATE peacepad_native_staging.schedule_events
          SET version = $2, calendar_layer_id = $3, starts_at = $4, ends_at = $5,
              status = $6, event_record = $7::jsonb, updated_at = now()
        WHERE id = $1 AND version = $8`,
      [event.id, event.version, event.calendarLayerId, event.startsAt, event.endsAt, event.status, JSON.stringify(event), expectedVersion]
    );
    if (result.rowCount !== 1) throw new InvitationServiceError("VERSION_CONFLICT", "The event changed. Refresh and try again.", 409);
  }

  async deleteEvent(id: string, expectedVersion: number) {
    const result = await this.connection.query(
      "DELETE FROM peacepad_native_staging.schedule_events WHERE id = $1 AND version = $2",
      [id, expectedVersion]
    );
    if (result.rowCount !== 1) throw new InvitationServiceError("VERSION_CONFLICT", "The event changed. Refresh and try again.", 409);
  }

  async findIdempotentResult(key: string) {
    this.assertTransaction("idempotency lookup");
    const hash = await this.hashKey(key);
    await this.connection.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`idempotency:${hash}`]);
    const result = await this.connection.query<IdempotencyRow>(
      "SELECT target_id FROM peacepad_native_staging.idempotency_receipts WHERE operation_hash = $1",
      [hash]
    );
    return result.rows[0]?.target_id;
  }

  async saveIdempotentResult(key: string, targetId: string) {
    await this.connection.query(
      "INSERT INTO peacepad_native_staging.idempotency_receipts (operation_hash, target_id) VALUES ($1, $2)",
      [await this.hashKey(key), targetId]
    );
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
      "SELECT event FROM peacepad_native_staging.audit_events ORDER BY sequence DESC LIMIT 1 FOR UPDATE"
    );
    return result.rows[0] ? jsonValue(result.rows[0].event) : undefined;
  }

  private assertTransaction(operation: string) {
    if (!this.inTransaction) throw new Error(`Postgres calendar ${operation} requires an active transaction.`);
  }

  private hashKey(key: string) {
    return this.digest.digest(`${this.pepper}:${key}`);
  }
}
