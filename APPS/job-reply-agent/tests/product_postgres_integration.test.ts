import crypto from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertProductDatabaseRole, migrateProductDb, withTenant } from "../src/product_db.js";
import {
  beginProductGmailOAuth,
  completeProductGmailOAuth,
  revokeProductGmailOAuth,
  type GmailOAuthDeps
} from "../src/product_gmail_oauth.js";
import { executeIdempotentMutation } from "../src/product_idempotency.js";
import {
  applyBillingEvent,
  consumePlanUsage,
  ensureFreeEntitlement,
  getBillingEntitlement
} from "../src/product_billing.js";
import { getProductConnectionSecret, revokeProductConnection } from "../src/product_repository.js";
import type { SecretKeyring } from "../src/product_secret_crypto.js";

const connectionString = process.env.TEST_DATABASE_URL;
const describeDatabase = connectionString ? describe : describe.skip;
const databaseSsl = process.env.TEST_DATABASE_SSL === "true"
  ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
  : undefined;
const pool = connectionString ? new pg.Pool({ connectionString, ssl: databaseSsl }) : null;
let appPool: pg.Pool | null = null;

describeDatabase("PostgreSQL tenant isolation", () => {
  const suffix = crypto.randomBytes(6).toString("hex");
  const rolePassword = crypto.randomBytes(32).toString("base64url");
  let userA = "";
  let userB = "";
  let resumeB = "";
  let profileB = "";
  let deletionB = 0;
  const userAEmail = `tenant-a-${suffix}@example.test`;
  const userBEmail = `tenant-b-${suffix}@example.test`;

  beforeAll(async () => {
    if (!pool) return;
    await migrateProductDb(pool);
    const role = `jobagent_test_${suffix}`;
    await pool.query(
      `CREATE ROLE ${role} LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${rolePassword.replaceAll("'", "''")}'`
    );
    await pool.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await pool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    const appUrl = new URL(connectionString!);
    appUrl.username = role;
    appUrl.password = rolePassword;
    appUrl.searchParams.delete("user");
    appPool = new pg.Pool({
      connectionString: appUrl.toString(),
      ssl: databaseSsl
    });
    process.env.GMAIL_CLIENT_ID = "test-client-id";
    process.env.GMAIL_CLIENT_SECRET = "test-client-secret";
    process.env.APP_ORIGIN = "http://127.0.0.1:3999";
    const users = await pool.query(
      `INSERT INTO product_users (email, password_hash)
       VALUES ($1,'test-hash'),($2,'test-hash')
       RETURNING id`,
      [userAEmail, userBEmail]
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
    deletionB = await withTenant(userB, async (client) => {
      const result = await client.query(
        `INSERT INTO product_object_deletions
           (user_id, storage_key, storage_driver)
         VALUES ($1,$2,'s3')
         RETURNING id`,
        [userB, buildStorageKey(userB)]
      );
      return result.rows[0].id;
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
    delete process.env.GMAIL_CLIENT_ID;
    delete process.env.GMAIL_CLIENT_SECRET;
    delete process.env.APP_ORIGIN;
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

  it("keeps private-object deletion work scoped to its owning tenant", async () => {
    if (!appPool) return;
    const rows = await withTenant(userA, async (client) => {
      return client.query("SELECT id FROM product_object_deletions WHERE id=$1", [deletionB]);
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

  it("isolates billing records and usage keys between tenants", async () => {
    if (!appPool) return;
    await ensureFreeEntitlement(appPool, userA);
    await ensureFreeEntitlement(appPool, userB);
    await withTenant(userB, (client) => client.query(
      `INSERT INTO billing_customers (user_id, stripe_customer_id, livemode)
       VALUES ($1,$2,false)`,
      [userB, `cus_tenant_b_${suffix}`]
    ), appPool);
    const crossTenant = await withTenant(userA, (client) => client.query(
      "SELECT stripe_customer_id FROM billing_customers WHERE user_id=$1",
      [userB]
    ), appPool);
    expect(crossTenant.rowCount).toBe(0);

    const [usageA, usageB] = await Promise.all([
      consumePlanUsage(appPool, userA, "fit_analysis", 1, "shared-billing-usage-key"),
      consumePlanUsage(appPool, userB, "fit_analysis", 1, "shared-billing-usage-key")
    ]);
    expect(usageA.allowed).toBe(true);
    expect(usageB.allowed).toBe(true);
  });

  it("serializes concurrent usage so an allowance cannot be overspent", async () => {
    if (!appPool) return;
    await ensureFreeEntitlement(appPool, userA);
    await withTenant(userA, async (client) => {
      await client.query("DELETE FROM usage_ledger WHERE user_id=$1", [userA]);
      await client.query(
        `UPDATE plan_entitlements
            SET allowances=jsonb_set(allowances,'{fit_analysis}','1'::jsonb),
                period_start=now() - interval '1 minute',
                period_end=now() + interval '1 day'
          WHERE user_id=$1`,
        [userA]
      );
    }, appPool);
    const results = await Promise.all([
      consumePlanUsage(appPool, userA, "fit_analysis", 1, "concurrent-usage-a"),
      consumePlanUsage(appPool, userA, "fit_analysis", 1, "concurrent-usage-b")
    ]);
    expect(results.filter((result) => result.allowed)).toHaveLength(1);
    expect(results.filter((result) => !result.allowed)).toHaveLength(1);
  });

  it("reconciles the Stripe lifecycle idempotently and keeps its records tenant-private", async () => {
    if (!appPool) return;
    const digest = crypto.createHash("sha256").update(`billing-${suffix}`).digest("hex");
    const event = (eventId: string, eventType: string, status: string) => ({
      stripeEventId: eventId,
      eventType,
      eventCreatedAt: new Date().toISOString(),
      livemode: false,
      userId: userA,
      stripeObjectId: `object_${suffix}`,
      customerId: `cus_tenant_a_${suffix}`,
      subscriptionId: `sub_tenant_a_${suffix}`,
      priceId: `price_monthly_${suffix}`,
      planCode: "jobagent_monthly" as const,
      subscriptionStatus: status,
      periodStart: new Date(Date.now() - 60_000).toISOString(),
      periodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      metadata: { service_type: "jobagent_subscription" }
    });

    const activated = await applyBillingEvent(
      appPool,
      event(`evt_active_${suffix}`, "checkout.session.completed", "active"),
      digest
    );
    expect(activated.replayed).toBe(false);
    expect(activated.entitlement).toMatchObject({ planCode: "jobagent_monthly", status: "active" });

    const replayed = await applyBillingEvent(
      appPool,
      event(`evt_active_${suffix}`, "checkout.session.completed", "active"),
      digest
    );
    expect(replayed.replayed).toBe(true);

    await applyBillingEvent(
      appPool,
      event(`evt_failed_${suffix}`, "invoice.payment_failed", "past_due"),
      digest
    );
    await expect(getBillingEntitlement(appPool, userA)).resolves.toMatchObject({
      planCode: "jobagent_monthly",
      status: "past_due",
      allowances: { fit_analysis: 3, tailored_package: 1 }
    });

    await applyBillingEvent(
      appPool,
      event(`evt_paid_${suffix}`, "invoice.payment_succeeded", "active"),
      digest
    );
    await expect(getBillingEntitlement(appPool, userA)).resolves.toMatchObject({
      planCode: "jobagent_monthly",
      status: "active",
      allowances: { fit_analysis: 100, tailored_package: 25 }
    });

    await applyBillingEvent(
      appPool,
      event(`evt_deleted_${suffix}`, "customer.subscription.deleted", "canceled"),
      digest
    );
    await expect(getBillingEntitlement(appPool, userA)).resolves.toMatchObject({ status: "canceled" });

    await applyBillingEvent(
      appPool,
      event(`evt_refund_${suffix}`, "charge.refunded", "active"),
      digest
    );
    await expect(getBillingEntitlement(appPool, userA)).resolves.toMatchObject({ status: "suspended" });

    const crossTenant = await withTenant(userB, (client) => client.query(
      "SELECT stripe_event_id FROM billing_events WHERE user_id=$1",
      [userA]
    ), appPool);
    expect(crossTenant.rowCount).toBe(0);
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

  it("completes isolated Gmail OAuth with encrypted tokens and one-use state", async () => {
    if (!appPool) return;
    const keyring: SecretKeyring = {
      activeVersion: "test-v1",
      keys: new Map([["test-v1", crypto.randomBytes(32)]])
    };
    let revokedToken = "";
    const deps: GmailOAuthDeps = {
      async exchangeCode(_config, code, verifier) {
        expect(code).toBe("authorization-code");
        expect(verifier.length).toBeGreaterThan(40);
        return { access_token: "access-secret", refresh_token: "refresh-secret" };
      },
      async fetchMailbox() {
        return userAEmail;
      },
      async revokeToken(_config, token) {
        revokedToken = token;
      }
    };
    const started = await beginProductGmailOAuth(appPool, userA, keyring);
    const state = new URL(started.authorizationUrl).searchParams.get("state");
    expect(state).toBeTruthy();

    await expect(completeProductGmailOAuth(appPool, {
      userId: userA,
      expectedMailbox: userAEmail,
      code: "authorization-code",
      state: state!
    }, deps, keyring)).resolves.toEqual({ mailbox: userAEmail });
    await expect(completeProductGmailOAuth(appPool, {
      userId: userA,
      expectedMailbox: userAEmail,
      code: "authorization-code",
      state: state!
    }, deps, keyring)).rejects.toThrow(/already used/);

    const ownSecret = await getProductConnectionSecret(appPool, userA, "gmail");
    expect(ownSecret?.encryptedPayload).not.toContain("refresh-secret");
    const crossTenant = await withTenant(userB, (client) => client.query(
      "SELECT id FROM product_connection_secrets WHERE user_id=$1",
      [userA]
    ), appPool);
    expect(crossTenant.rowCount).toBe(0);

    await expect(revokeProductGmailOAuth(appPool, userA, deps, keyring))
      .resolves.toEqual({ providerRevoked: true });
    expect(revokedToken).toBe("refresh-secret");
    await revokeProductConnection(appPool, userA, "gmail");
    await expect(getProductConnectionSecret(appPool, userA, "gmail")).resolves.toBeNull();
  });
});

function buildStorageKey(userId: string): string {
  return `users/${userId}/resumes/${"b".repeat(64)}`;
}
