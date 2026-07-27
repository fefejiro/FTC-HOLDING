import crypto from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertProductDatabaseRole, migrateProductDb, withTenant } from "../src/product_db.js";
import { executeIdempotentMutation } from "../src/product_idempotency.js";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const pool = connectionString ? new pg.Pool({ connectionString }) : null;
let appPool: pg.Pool | null = null;

describeDatabase("PostgreSQL tenant isolation", () => {
  const suffix = crypto.randomBytes(6).toString("hex");
  let userA = "";
  let userB = "";
  let resumeB = "";
  let profileB = "";

  beforeAll(async () => {
    if (!pool) return;
    await migrateProductDb(pool);
    const role = `jobagent_test_${suffix}`;
    await pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOBYPASSRLS`);
    await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await pool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    appPool = new pg.Pool({
      connectionString: connectionString!.replace(/\/[^/]+$/, `/jobagent_test?user=${role}`)
    });
    const users = await pool.query(
      `INSERT INTO product_users (email, password_hash)
       VALUES ($1,'test-hash'),($2,'test-hash')
       RETURNING id`,
      [`tenant-a-${suffix}@example.test`, `tenant-b-${suffix}@example.test`]
    );
    [userA, userB] = users.rows.map((row) => row.id);
    resumeB = await withTenant(userB, async (client) => {
      const result = await client.query(
        `INSERT INTO product_resumes
           (user_id, filename, mime_type, byte_size, sha256, content, is_default)
         VALUES ($1,'private.pdf','application/pdf',4,$2,$3,true)
         RETURNING id`,
        [userB, crypto.createHash("sha256").update("test").digest("hex"), Buffer.from("test")]
      );
      return result.rows[0].id;
    }, appPool);
    profileB = await withTenant(userB, async (client) => {
      const result = await client.query(
        `INSERT INTO user_profiles (user_id, full_name)
         VALUES ($1,'Private Candidate')
         RETURNING user_id`,
        [userB]
      );
      return result.rows[0].user_id;
    }, appPool);
  });

  afterAll(async () => {
    if (!pool) return;
    const role = `jobagent_test_${suffix}`;
    await appPool?.end();
    await pool.query("DELETE FROM product_users WHERE id = ANY($1::uuid[])", [[userA, userB].filter(Boolean)]);
    await pool.query(`DROP OWNED BY ${role}`);
    await pool.query(`DROP ROLE IF EXISTS ${role}`);
    await pool.end();
  });

  it("does not reveal another tenant's resume even when its UUID is known", async () => {
    if (!appPool) return;
    const rows = await withTenant(userA, async (client) => {
      return client.query("SELECT id FROM product_resumes WHERE id=$1", [resumeB]);
    }, appPool);
    expect(rows.rowCount).toBe(0);
  });

  it("does not let another tenant update or delete a known resume UUID", async () => {
    if (!appPool) return;
    const changed = await withTenant(userA, async (client) => {
      return client.query("UPDATE product_resumes SET filename='stolen.pdf' WHERE id=$1 RETURNING id", [resumeB]);
    }, appPool);
    const deleted = await withTenant(userA, async (client) => {
      return client.query("DELETE FROM product_resumes WHERE id=$1 RETURNING id", [resumeB]);
    }, appPool);
    expect(changed.rowCount).toBe(0);
    expect(deleted.rowCount).toBe(0);
  });

  it("enforces isolation on the migration-ready SaaS profile tables", async () => {
    if (!appPool) return;
    const rows = await withTenant(userA, async (client) => {
      return client.query("SELECT user_id FROM user_profiles WHERE user_id=$1", [profileB]);
    }, appPool);
    expect(rows.rowCount).toBe(0);
  });

  it("scopes the same idempotency key independently for each tenant", async () => {
    if (!appPool) return;
    for (const userId of [userA, userB]) {
      await withTenant(userId, async (client) => {
        await client.query(
          `INSERT INTO product_idempotency_keys
             (user_id, idempotency_key, method, request_path, request_hash)
           VALUES ($1,'shared-request-key','PUT','/api/v1/onboarding',$2)`,
          [userId, crypto.createHash("sha256").update(userId).digest("hex")]
        );
      }, appPool);
    }
    const count = await pool.query(
      "SELECT count(*)::integer AS count FROM product_idempotency_keys WHERE idempotency_key='shared-request-key' AND user_id = ANY($1::uuid[])",
      [[userA, userB]]
    );
    expect(count.rows[0].count).toBe(2);
  });

  it("replays a completed mutation without running its action twice", async () => {
    if (!appPool) return;
    let executions = 0;
    const input = {
      userId: userA,
      key: "replay-request-key-123",
      method: "PUT",
      requestPath: "/api/v1/onboarding",
      body: { fullName: "Tenant A" },
      action: async () => ({ status: 200, body: { saved: ++executions } })
    };
    const first = await executeIdempotentMutation(appPool, input);
    const second = await executeIdempotentMutation(appPool, input);
    expect(first).toEqual({ status: 200, body: { saved: 1 } });
    expect(second).toEqual({ status: 200, body: { saved: 1 }, replayed: true });
    expect(executions).toBe(1);
  });

  it("accepts the restricted app role and rejects the privileged migration role", async () => {
    if (!appPool || !pool) return;
    await expect(assertProductDatabaseRole(appPool)).resolves.toBeUndefined();
    await expect(assertProductDatabaseRole(pool)).rejects.toThrow(/non-superuser/);
  });
});
