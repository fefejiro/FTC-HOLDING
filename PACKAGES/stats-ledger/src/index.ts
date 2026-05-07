import { Pool } from "pg";

const DEFAULT_TABLE_NAME = "stats_ledger_events";

type SqlValue = string | number | boolean | Date | null;

type QueryResultRow = Record<string, unknown>;

type QueryExecutor = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: SqlValue[]): Promise<{ rows: T[] }>;
  end?(): Promise<void>;
};

export type StatsLedgerEventInput = {
  idempotencyKey: string;
  source: string;
  eventType: string;
  actorId?: string | null;
  value?: number | null;
  occurredAt?: string | Date;
  metadata?: Record<string, unknown>;
};

export type StatsLedgerEvent = {
  id: string;
  idempotencyKey: string;
  source: string;
  eventType: string;
  actorId: string | null;
  value: number | null;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type StatsLedgerQueryFilter = {
  source?: string;
  eventType?: string;
  actorId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export type SparklinePoint = {
  day: string;
  count: number;
};

export type StatsLedgerAggregate = {
  total: number;
  byEventType: Array<{ eventType: string; count: number }>;
  sparkline: SparklinePoint[];
};

export type StatsLedgerOptions = {
  connectionString?: string;
  tableName?: string;
  pool?: QueryExecutor;
  autoCreateTable?: boolean;
};

export type StatsLedgerClient = {
  record(event: StatsLedgerEventInput): Promise<StatsLedgerEvent>;
  query(filter?: StatsLedgerQueryFilter): Promise<StatsLedgerEvent[]>;
  aggregate(filter?: Omit<StatsLedgerQueryFilter, "limit">): Promise<StatsLedgerAggregate>;
  close(): Promise<void>;
};

function assertTableName(input: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input)) {
    throw new Error(`Invalid table name: ${input}`);
  }
  return input;
}

function toIsoString(value: unknown): string {
  if (typeof value === "string") {
    return new Date(value).toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(String(value)).toISOString();
}

function normalizeEvent(row: QueryResultRow): StatsLedgerEvent {
  const metadata = typeof row.metadata === "object" && row.metadata !== null ? (row.metadata as Record<string, unknown>) : {};

  return {
    id: String(row.id),
    idempotencyKey: String(row.idempotency_key),
    source: String(row.source),
    eventType: String(row.event_type),
    actorId: row.actor_id ? String(row.actor_id) : null,
    value: row.value === null || row.value === undefined ? null : Number(row.value),
    metadata,
    occurredAt: toIsoString(row.occurred_at),
    createdAt: toIsoString(row.created_at)
  };
}

function buildWhereClause(filter: Omit<StatsLedgerQueryFilter, "limit">, values: SqlValue[]): string {
  const clauses: string[] = [];

  if (filter.source) {
    values.push(filter.source);
    clauses.push(`source = $${values.length}`);
  }

  if (filter.eventType) {
    values.push(filter.eventType);
    clauses.push(`event_type = $${values.length}`);
  }

  if (filter.actorId) {
    values.push(filter.actorId);
    clauses.push(`actor_id = $${values.length}`);
  }

  if (filter.from) {
    values.push(filter.from);
    clauses.push(`occurred_at >= $${values.length}::timestamptz`);
  }

  if (filter.to) {
    values.push(filter.to);
    clauses.push(`occurred_at <= $${values.length}::timestamptz`);
  }

  if (clauses.length === 0) {
    return "";
  }

  return `WHERE ${clauses.join(" AND ")}`;
}

function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(events: StatsLedgerEvent[]): string {
  const headers = [
    "id",
    "idempotencyKey",
    "source",
    "eventType",
    "actorId",
    "value",
    "occurredAt",
    "createdAt",
    "metadata"
  ];

  const rows = events.map((event) =>
    [
      event.id,
      event.idempotencyKey,
      event.source,
      event.eventType,
      event.actorId,
      event.value,
      event.occurredAt,
      event.createdAt,
      event.metadata
    ]
      .map(toCsvCell)
      .join(",")
  );

  return `${headers.join(",")}\n${rows.join("\n")}`;
}

export function createStatsLedger(options: StatsLedgerOptions = {}): StatsLedgerClient {
  const tableName = assertTableName(options.tableName || DEFAULT_TABLE_NAME);
  const shouldAutoCreate = options.autoCreateTable ?? true;
  const ownPool = !options.pool;

  const pool: QueryExecutor =
    options.pool ||
    new Pool({
      connectionString: options.connectionString || process.env.STATS_LEDGER_DATABASE_URL || process.env.DATABASE_URL
    });

  let ensureSchemaPromise: Promise<void> | null = null;

  async function ensureSchema() {
    if (!shouldAutoCreate) {
      return;
    }

    if (!ensureSchemaPromise) {
      ensureSchemaPromise = pool
        .query(`
          CREATE TABLE IF NOT EXISTS ${tableName} (
            id BIGSERIAL PRIMARY KEY,
            idempotency_key TEXT NOT NULL UNIQUE,
            source TEXT NOT NULL,
            event_type TEXT NOT NULL,
            actor_id TEXT,
            value DOUBLE PRECISION,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `)
        .then(() => pool.query(`CREATE INDEX IF NOT EXISTS idx_${tableName}_source_event_time ON ${tableName}(source, event_type, occurred_at DESC);`))
        .then(() => undefined);
    }

    await ensureSchemaPromise;
  }

  async function record(event: StatsLedgerEventInput): Promise<StatsLedgerEvent> {
    await ensureSchema();

    const idempotencyKey = event.idempotencyKey.trim();
    const source = event.source.trim();
    const eventType = event.eventType.trim();

    if (!idempotencyKey || !source || !eventType) {
      throw new Error("idempotencyKey, source, and eventType are required");
    }

    const values: SqlValue[] = [
      idempotencyKey,
      source,
      eventType,
      event.actorId ?? null,
      event.value ?? null,
      event.occurredAt ? new Date(event.occurredAt).toISOString() : null,
      JSON.stringify(event.metadata || {})
    ];

    const insertResult = await pool.query(
      `
      INSERT INTO ${tableName}
        (idempotency_key, source, event_type, actor_id, value, occurred_at, metadata)
      VALUES
        ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()), $7::jsonb)
      ON CONFLICT (idempotency_key)
      DO NOTHING
      RETURNING *
      `,
      values
    );

    if (insertResult.rows.length > 0) {
      return normalizeEvent(insertResult.rows[0]);
    }

    const existing = await pool.query(
      `SELECT * FROM ${tableName} WHERE idempotency_key = $1 LIMIT 1`,
      [idempotencyKey]
    );

    if (existing.rows.length === 0) {
      throw new Error("Failed to persist ledger event");
    }

    return normalizeEvent(existing.rows[0]);
  }

  async function query(filter: StatsLedgerQueryFilter = {}): Promise<StatsLedgerEvent[]> {
    await ensureSchema();

    const limit = Math.min(Math.max(filter.limit || 50, 1), 500);
    const values: SqlValue[] = [];
    const where = buildWhereClause(filter, values);
    values.push(limit);

    const result = await pool.query(
      `SELECT * FROM ${tableName} ${where} ORDER BY occurred_at DESC LIMIT $${values.length}`,
      values
    );

    return result.rows.map(normalizeEvent);
  }

  async function aggregate(filter: Omit<StatsLedgerQueryFilter, "limit"> = {}): Promise<StatsLedgerAggregate> {
    await ensureSchema();

    const values: SqlValue[] = [];
    const where = buildWhereClause(filter, values);

    const [totalResult, byTypeResult, sparklineResult] = await Promise.all([
      pool.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM ${tableName} ${where}`, values),
      pool.query<{ event_type: string; count: number }>(
        `
        SELECT event_type, COUNT(*)::int AS count
        FROM ${tableName}
        ${where}
        GROUP BY event_type
        ORDER BY count DESC, event_type ASC
        `,
        values
      ),
      pool.query<{ day: string; count: number }>(
        `
        SELECT to_char(date_trunc('day', occurred_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
        FROM ${tableName}
        ${where}
        GROUP BY day
        ORDER BY day ASC
        `,
        values
      )
    ]);

    return {
      total: Number(totalResult.rows[0]?.total || 0),
      byEventType: byTypeResult.rows.map((row) => ({ eventType: row.event_type, count: Number(row.count) })),
      sparkline: sparklineResult.rows.map((row) => ({ day: row.day, count: Number(row.count) }))
    };
  }

  async function close() {
    if (ownPool && pool.end) {
      await pool.end();
    }
  }

  return {
    record,
    query,
    aggregate,
    close
  };
}
