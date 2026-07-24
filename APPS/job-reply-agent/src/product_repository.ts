import type pg from "pg";
import { withTenant } from "./product_db.js";

export interface ProductOnboarding {
  record: Record<string, unknown>;
  completed: boolean;
  consentVersion: string | null;
  consentedAt: string | null;
  updatedAt: string;
}

export async function getProductOnboarding(db: pg.Pool, userId: string): Promise<ProductOnboarding | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT record, completed, consent_version AS "consentVersion",
              consented_at AS "consentedAt", updated_at AS "updatedAt"
         FROM product_onboarding WHERE user_id=$1`,
      [userId]
    );
    return result.rows[0] || null;
  }, db);
}

export async function saveProductOnboarding(
  db: pg.Pool,
  userId: string,
  input: Omit<ProductOnboarding, "updatedAt">
): Promise<ProductOnboarding> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `INSERT INTO product_onboarding
         (user_id, record, completed, consent_version, consented_at, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, $5, now())
       ON CONFLICT (user_id) DO UPDATE SET
         record=excluded.record,
         completed=excluded.completed,
         consent_version=excluded.consent_version,
         consented_at=excluded.consented_at,
         updated_at=now()
       RETURNING record, completed, consent_version AS "consentVersion",
                 consented_at AS "consentedAt", updated_at AS "updatedAt"`,
      [userId, JSON.stringify(input.record), input.completed, input.consentVersion, input.consentedAt]
    );
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, $1, 'onboarding.updated', 'onboarding', $1::text, $2::jsonb)`,
      [userId, JSON.stringify({ completed: input.completed, consentVersion: input.consentVersion })]
    );
    return result.rows[0];
  }, db);
}

export async function productAuditLog(db: pg.Pool, userId: string, limit = 50): Promise<unknown[]> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT action, target_type AS "targetType", target_id AS "targetId",
              metadata, created_at AS "createdAt"
         FROM product_audit_logs
        WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
      [userId, Math.min(Math.max(limit, 1), 100)]
    );
    return result.rows;
  }, db);
}
