import crypto from "node:crypto";
import type pg from "pg";
import { withTenant } from "./product_db.js";

export interface MutationResponse {
  status: number;
  body: unknown;
  replayed?: boolean;
}

type Reservation =
  | { kind: "execute"; requestHash: string }
  | { kind: "replay"; response: MutationResponse }
  | { kind: "conflict"; reason: string };

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function normalizeIdempotencyKey(value: string | string[] | undefined): string {
  const key = String(Array.isArray(value) ? value[0] : value || "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(key)) {
    throw new Error("A valid Idempotency-Key header is required.");
  }
  return key;
}

export function requestFingerprint(method: string, requestPath: string, body: unknown): string {
  return crypto
    .createHash("sha256")
    .update(`${method.toUpperCase()}\n${requestPath}\n${canonicalJson(body)}`)
    .digest("hex");
}

async function reserveMutation(
  db: pg.Pool,
  userId: string,
  key: string,
  method: string,
  requestPath: string,
  body: unknown
): Promise<Reservation> {
  const requestHash = requestFingerprint(method, requestPath, body);
  return withTenant(userId, async (client) => {
    await client.query(
      "DELETE FROM product_idempotency_keys WHERE user_id=$1 AND idempotency_key=$2 AND expires_at <= now()",
      [userId, key]
    );
    const inserted = await client.query(
      `INSERT INTO product_idempotency_keys
         (user_id, idempotency_key, method, request_path, request_hash)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, idempotency_key) DO NOTHING
       RETURNING idempotency_key`,
      [userId, key, method.toUpperCase(), requestPath, requestHash]
    );
    if (inserted.rowCount) return { kind: "execute", requestHash };

    const existing = await client.query(
      `SELECT method, request_path AS "requestPath", request_hash AS "requestHash",
              status, response_status AS "responseStatus", response_body AS "responseBody"
         FROM product_idempotency_keys
        WHERE user_id=$1 AND idempotency_key=$2`,
      [userId, key]
    );
    const row = existing.rows[0];
    if (!row || row.requestHash !== requestHash || row.method !== method.toUpperCase() || row.requestPath !== requestPath) {
      return { kind: "conflict", reason: "Idempotency key was already used for a different request." };
    }
    if (row.status !== "completed") {
      return { kind: "conflict", reason: "The matching request is still processing." };
    }
    return {
      kind: "replay",
      response: { status: row.responseStatus, body: row.responseBody, replayed: true }
    };
  }, db);
}

export async function executeIdempotentMutation(
  db: pg.Pool,
  input: {
    userId: string;
    key: string;
    method: string;
    requestPath: string;
    body: unknown;
    action: () => Promise<MutationResponse>;
  }
): Promise<MutationResponse> {
  const reservation = await reserveMutation(
    db,
    input.userId,
    input.key,
    input.method,
    input.requestPath,
    input.body
  );
  if (reservation.kind === "conflict") return { status: 409, body: { error: reservation.reason } };
  if (reservation.kind === "replay") return reservation.response;

  try {
    const response = await input.action();
    await withTenant(input.userId, async (client) => {
      await client.query(
        `UPDATE product_idempotency_keys
            SET status='completed', response_status=$4, response_body=$5::jsonb, completed_at=now()
          WHERE user_id=$1 AND idempotency_key=$2 AND request_hash=$3`,
        [input.userId, input.key, reservation.requestHash, response.status, JSON.stringify(response.body)]
      );
    }, db);
    return response;
  } catch (error) {
    await withTenant(input.userId, async (client) => {
      await client.query(
        `DELETE FROM product_idempotency_keys
          WHERE user_id=$1 AND idempotency_key=$2 AND request_hash=$3 AND status='processing'`,
        [input.userId, input.key, reservation.requestHash]
      );
    }, db).catch(() => undefined);
    throw error;
  }
}
