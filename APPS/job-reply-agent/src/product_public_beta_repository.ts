import crypto from "node:crypto";
import type pg from "pg";
import {
  createOpaqueToken,
  hashOpaqueToken,
  type ProductUser
} from "./product_auth.js";
import { withTenant } from "./product_db.js";
import type {
  ApplicationProof,
  ConnectorCapability,
  ConnectorSource,
  ConnectorStatus,
  RunnerTask
} from "./product_domain.js";
import {
  decryptProductSecret,
  encryptProductSecret,
  type SecretKeyring
} from "./product_secret_crypto.js";

export const PUBLIC_BETA_POLICY_VERSION = "2026-07-27";

export interface AutomationPolicy {
  mode: "assist" | "approval_required" | "controlled_autopilot";
  recruiterDrafts: boolean;
  recruiterSends: boolean;
  assistedApplications: boolean;
  controlledSubmissions: boolean;
  maxDraftsPerDay: number;
  maxRecruiterSendsPerDay: number;
  maxApplicationsPerDay: number;
  maxApplicationsPerBoard: number;
  quietHoursStart: number;
  quietHoursEnd: number;
  timeZone: string;
  policyVersion: string;
  updatedAt?: string;
}

export interface Invitation {
  token: string;
  email: string;
  role: "candidate" | "operator" | "admin";
  expiresAt: string;
}

export function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function createProductInvitation(
  db: pg.Pool,
  input: {
    email: string;
    role?: "candidate" | "operator" | "admin";
    createdBy?: string | null;
    expiresInHours?: number;
  }
): Promise<Invitation> {
  const token = createOpaqueToken();
  const email = normalizedEmail(input.email);
  const role = input.role || "candidate";
  const expiresAt = new Date(Date.now() + Math.min(Math.max(input.expiresInHours || 72, 1), 168) * 3_600_000);
  await db.query(
    `INSERT INTO product_invitations
       (email, token_hash, role, expires_at, created_by)
     VALUES ($1,$2,$3,$4,$5)`,
    [email, hashOpaqueToken(token), role, expiresAt, input.createdBy || null]
  );
  if (input.createdBy) {
    await withTenant(input.createdBy, (client) => client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'invitation.created','invitation',$2,$3::jsonb)`,
      [input.createdBy, email, JSON.stringify({ role, expiresAt: expiresAt.toISOString() })]
    ), db);
  }
  return { token, email, role, expiresAt: expiresAt.toISOString() };
}

export async function consumeProductInvitation(
  client: pg.PoolClient,
  email: string,
  token: string
): Promise<{ id: string; role: "candidate" | "operator" | "admin" } | null> {
  const result = await client.query(
    `UPDATE product_invitations
        SET used_at=now()
      WHERE email=$1 AND token_hash=$2
        AND used_at IS NULL AND expires_at > now()
      RETURNING id, role`,
    [normalizedEmail(email), hashOpaqueToken(token)]
  );
  return result.rows[0] || null;
}

export async function linkInvitationUser(
  client: pg.PoolClient,
  invitationId: string,
  userId: string
): Promise<void> {
  await client.query(
    "UPDATE product_invitations SET used_by=$2 WHERE id=$1 AND used_at IS NOT NULL",
    [invitationId, userId]
  );
}

async function createUserToken(
  db: pg.Pool,
  table: "product_email_verification_tokens" | "product_password_reset_tokens",
  userId: string,
  ttlMinutes: number
): Promise<{ token: string; expiresAt: string }> {
  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  await db.query(`DELETE FROM ${table} WHERE user_id=$1 OR expires_at <= now()`, [userId]);
  await db.query(
    `INSERT INTO ${table} (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
    [userId, hashOpaqueToken(token), expiresAt]
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

export function createEmailVerificationToken(db: pg.Pool, userId: string) {
  return createUserToken(db, "product_email_verification_tokens", userId, 24 * 60);
}

export async function verifyProductEmail(db: pg.Pool, token: string): Promise<ProductUser | null> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const consumed = await client.query(
      `UPDATE product_email_verification_tokens
          SET used_at=now()
        WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id`,
      [hashOpaqueToken(token)]
    );
    const userId = consumed.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      return null;
    }
    const updated = await client.query(
      `UPDATE product_users
          SET email_verified_at=COALESCE(email_verified_at, now()), updated_at=now()
        WHERE id=$1
        RETURNING id, email, status, role,
                  email_verified_at AS "emailVerifiedAt",
                  mfa_enabled AS "mfaEnabled",
                  now() AS "authenticatedAt",
                  NULL::text AS "csrfHash"`,
      [userId]
    );
    await client.query("COMMIT");
    return updated.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function createPasswordResetForEmail(
  db: pg.Pool,
  email: string
): Promise<{ userId: string; email: string; token: string; expiresAt: string } | null> {
  const found = await db.query(
    "SELECT id, email FROM product_users WHERE email=$1 AND status <> 'deleted'",
    [normalizedEmail(email)]
  );
  if (!found.rows[0]) return null;
  const token = await createUserToken(db, "product_password_reset_tokens", found.rows[0].id, 60);
  return { userId: found.rows[0].id, email: found.rows[0].email, ...token };
}

export async function discardPasswordResetForUser(
  db: pg.Pool,
  userId: string
): Promise<void> {
  await db.query("DELETE FROM product_password_reset_tokens WHERE user_id=$1", [userId]);
}

export async function discardProductInvitation(
  db: pg.Pool,
  token: string
): Promise<void> {
  await db.query(
    "DELETE FROM product_invitations WHERE token_hash=$1 AND used_at IS NULL",
    [hashOpaqueToken(token)]
  );
}

export async function resetProductPassword(
  db: pg.Pool,
  token: string,
  passwordHash: string
): Promise<boolean> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const consumed = await client.query(
      `UPDATE product_password_reset_tokens
          SET used_at=now()
        WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now()
        RETURNING user_id`,
      [hashOpaqueToken(token)]
    );
    const userId = consumed.rows[0]?.user_id;
    if (!userId) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      "UPDATE product_users SET password_hash=$2, updated_at=now() WHERE id=$1",
      [userId, passwordHash]
    );
    await client.query("DELETE FROM product_sessions WHERE user_id=$1", [userId]);
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export function authAttemptKey(email: string, clientAddress: string): string {
  return crypto.createHash("sha256")
    .update(`${normalizedEmail(email)}\n${clientAddress.trim().toLowerCase()}`)
    .digest("hex");
}

export async function isProductAuthBlocked(db: pg.Pool, key: string): Promise<boolean> {
  const result = await db.query(
    "SELECT blocked_until > now() AS blocked FROM product_auth_attempts WHERE attempt_key=$1",
    [key]
  );
  return Boolean(result.rows[0]?.blocked);
}

export async function recordProductAuthFailure(db: pg.Pool, key: string): Promise<void> {
  await db.query(
    `INSERT INTO product_auth_attempts
       (attempt_key, attempt_count, blocked_until, first_attempt_at, last_attempt_at)
     VALUES ($1,1,NULL,now(),now())
     ON CONFLICT (attempt_key) DO UPDATE SET
       attempt_count=CASE
         WHEN product_auth_attempts.first_attempt_at < now() - interval '1 hour' THEN 1
         ELSE product_auth_attempts.attempt_count + 1
       END,
       first_attempt_at=CASE
         WHEN product_auth_attempts.first_attempt_at < now() - interval '1 hour' THEN now()
         ELSE product_auth_attempts.first_attempt_at
       END,
       blocked_until=CASE
         WHEN product_auth_attempts.attempt_count + 1 >= 10 THEN now() + interval '1 hour'
         WHEN product_auth_attempts.attempt_count + 1 >= 5 THEN now() + interval '15 minutes'
         ELSE NULL
       END,
       last_attempt_at=now()`,
    [key]
  );
}

export async function clearProductAuthFailures(db: pg.Pool, key: string): Promise<void> {
  await db.query("DELETE FROM product_auth_attempts WHERE attempt_key=$1", [key]);
}

export async function saveEncryptedMfaSecret(
  db: pg.Pool,
  userId: string,
  secret: string,
  keyring?: SecretKeyring
): Promise<void> {
  const encrypted = encryptProductSecret({ secret }, `mfa:${userId}`, keyring);
  await db.query(
    `UPDATE product_users
        SET encrypted_mfa_secret=$2, mfa_key_version=$3, mfa_enabled=false, updated_at=now()
      WHERE id=$1`,
    [userId, encrypted.encryptedPayload, encrypted.keyVersion]
  );
}

export async function getDecryptedMfaSecret(
  db: pg.Pool,
  userId: string,
  keyring?: SecretKeyring
): Promise<string | null> {
  const result = await db.query(
    `SELECT encrypted_mfa_secret AS "encryptedSecret", mfa_key_version AS "keyVersion"
       FROM product_users WHERE id=$1`,
    [userId]
  );
  if (!result.rows[0]?.encryptedSecret || !result.rows[0]?.keyVersion) return null;
  return decryptProductSecret<{ secret: string }>(
    result.rows[0].encryptedSecret,
    result.rows[0].keyVersion,
    `mfa:${userId}`,
    keyring
  ).secret;
}

export async function enableProductMfa(db: pg.Pool, userId: string): Promise<void> {
  await db.query(
    `UPDATE product_users
        SET mfa_enabled=true, updated_at=now()
      WHERE id=$1 AND encrypted_mfa_secret IS NOT NULL`,
    [userId]
  );
}

export async function saveAutomationPolicy(
  db: pg.Pool,
  userId: string,
  input: Omit<AutomationPolicy, "policyVersion" | "updatedAt">
): Promise<AutomationPolicy> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `INSERT INTO product_automation_policies
         (user_id, mode, recruiter_drafts, recruiter_sends,
          assisted_applications, controlled_submissions,
          max_drafts_per_day, max_recruiter_sends_per_day,
          max_applications_per_day, max_applications_per_board,
          quiet_hours_start, quiet_hours_end, time_zone, policy_version, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())
       ON CONFLICT (user_id) DO UPDATE SET
         mode=excluded.mode,
         recruiter_drafts=excluded.recruiter_drafts,
         recruiter_sends=excluded.recruiter_sends,
         assisted_applications=excluded.assisted_applications,
         controlled_submissions=excluded.controlled_submissions,
         max_drafts_per_day=excluded.max_drafts_per_day,
         max_recruiter_sends_per_day=excluded.max_recruiter_sends_per_day,
         max_applications_per_day=excluded.max_applications_per_day,
         max_applications_per_board=excluded.max_applications_per_board,
         quiet_hours_start=excluded.quiet_hours_start,
         quiet_hours_end=excluded.quiet_hours_end,
         time_zone=excluded.time_zone,
         policy_version=excluded.policy_version,
         updated_at=now()
       RETURNING mode, recruiter_drafts AS "recruiterDrafts",
                 recruiter_sends AS "recruiterSends",
                 assisted_applications AS "assistedApplications",
                 controlled_submissions AS "controlledSubmissions",
                 max_drafts_per_day AS "maxDraftsPerDay",
                 max_recruiter_sends_per_day AS "maxRecruiterSendsPerDay",
                 max_applications_per_day AS "maxApplicationsPerDay",
                 max_applications_per_board AS "maxApplicationsPerBoard",
                 quiet_hours_start AS "quietHoursStart",
                 quiet_hours_end AS "quietHoursEnd", time_zone AS "timeZone",
                 policy_version AS "policyVersion", updated_at AS "updatedAt"`,
      [
        userId, input.mode, input.recruiterDrafts, input.recruiterSends,
        input.assistedApplications, input.controlledSubmissions,
        input.maxDraftsPerDay, input.maxRecruiterSendsPerDay,
        input.maxApplicationsPerDay, input.maxApplicationsPerBoard,
        input.quietHoursStart, input.quietHoursEnd, input.timeZone,
        PUBLIC_BETA_POLICY_VERSION
      ]
    );
    return result.rows[0];
  }, db);
}

export async function getAutomationPolicy(db: pg.Pool, userId: string): Promise<AutomationPolicy> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT mode, recruiter_drafts AS "recruiterDrafts",
              recruiter_sends AS "recruiterSends",
              assisted_applications AS "assistedApplications",
              controlled_submissions AS "controlledSubmissions",
              max_drafts_per_day AS "maxDraftsPerDay",
              max_recruiter_sends_per_day AS "maxRecruiterSendsPerDay",
              max_applications_per_day AS "maxApplicationsPerDay",
              max_applications_per_board AS "maxApplicationsPerBoard",
              quiet_hours_start AS "quietHoursStart",
              quiet_hours_end AS "quietHoursEnd", time_zone AS "timeZone",
              policy_version AS "policyVersion", updated_at AS "updatedAt"
         FROM product_automation_policies WHERE user_id=$1`,
      [userId]
    );
    return result.rows[0] || {
      mode: "approval_required",
      recruiterDrafts: true,
      recruiterSends: false,
      assistedApplications: true,
      controlledSubmissions: false,
      maxDraftsPerDay: 50,
      maxRecruiterSendsPerDay: 10,
      maxApplicationsPerDay: 10,
      maxApplicationsPerBoard: 5,
      quietHoursStart: 23,
      quietHoursEnd: 7,
      timeZone: "UTC",
      policyVersion: PUBLIC_BETA_POLICY_VERSION
    };
  }, db);
}

export async function recordConsentSnapshot(
  db: pg.Pool,
  userId: string,
  grants: Record<string, boolean>,
  policySnapshot: Record<string, unknown>
): Promise<void> {
  await withTenant(userId, async (client) => {
    for (const [type, granted] of Object.entries(grants)) {
      await client.query(
        `INSERT INTO product_consent_grants
           (user_id, consent_version, consent_type, granted, policy_snapshot, revoked_at)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
        [
          userId, PUBLIC_BETA_POLICY_VERSION, type, granted,
          JSON.stringify(policySnapshot), granted ? null : new Date()
        ]
      );
    }
  }, db);
}

function defaultConnector(source: ConnectorSource): ConnectorCapability {
  if (source === "gmail") {
    return {
      source,
      status: "pilot_only",
      discovery: true,
      packageGeneration: true,
      assistedSubmission: false,
      controlledSubmission: false,
      proofReconciliation: true
    };
  }
  if (source === "monster") {
    return {
      source,
      status: "manual_only",
      discovery: true,
      packageGeneration: true,
      assistedSubmission: true,
      controlledSubmission: false,
      proofReconciliation: false
    };
  }
  return {
    source,
    status: "blocked_auth",
    discovery: true,
    packageGeneration: true,
    assistedSubmission: true,
    controlledSubmission: false,
    proofReconciliation: source !== "linkedin"
  };
}

export async function ensureConnectorCapabilities(
  db: pg.Pool,
  userId: string
): Promise<ConnectorCapability[]> {
  const sources: ConnectorSource[] = ["gmail", "linkedin", "indeed", "dice", "monster"];
  return withTenant(userId, async (client) => {
    for (const source of sources) {
      const defaults = defaultConnector(source);
      await client.query(
        `INSERT INTO product_connector_capabilities
           (user_id, source, status, capabilities)
         VALUES ($1,$2,$3,$4::jsonb)
         ON CONFLICT (user_id, source) DO NOTHING`,
        [userId, source, defaults.status, JSON.stringify({
          discovery: defaults.discovery,
          packageGeneration: defaults.packageGeneration,
          assistedSubmission: defaults.assistedSubmission,
          controlledSubmission: defaults.controlledSubmission,
          proofReconciliation: defaults.proofReconciliation
        })]
      );
    }
    const result = await client.query(
      `SELECT source, status, capabilities,
              evidence_reference AS "evidenceReference",
              verified_at AS "verifiedAt",
              account_identifier AS "accountIdentifier",
              expires_at AS "expiresAt",
              blocking_reason AS "blockingReason"
         FROM product_connector_capabilities
        WHERE user_id=$1 ORDER BY source`,
      [userId]
    );
    return result.rows.map((row) => ({
      source: row.source,
      status: row.status,
      ...row.capabilities,
      evidenceReference: row.evidenceReference,
      verifiedAt: row.verifiedAt,
      accountIdentifier: row.accountIdentifier,
      expiresAt: row.expiresAt,
      blockingReason: row.blockingReason
    }));
  }, db);
}

export async function updateConnectorCapability(
  db: pg.Pool,
  userId: string,
  source: ConnectorSource,
  status: ConnectorStatus,
  evidenceReference?: string | null,
  certification: {
    accountIdentifier?: string | null;
    expiresAt?: string | null;
    blockingReason?: string | null;
  } = {}
): Promise<void> {
  await withTenant(userId, async (client) => {
    const defaults = defaultConnector(source);
    const controlledSubmission = status === "certified_live" && source !== "monster";
    await client.query(
      `INSERT INTO product_connector_capabilities
         (user_id, source, status, capabilities, evidence_reference, verified_at,
          account_identifier, expires_at, blocking_reason, updated_at)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,now())
       ON CONFLICT (user_id, source) DO UPDATE SET
         status=excluded.status, capabilities=excluded.capabilities,
         evidence_reference=excluded.evidence_reference,
         verified_at=excluded.verified_at,
         account_identifier=excluded.account_identifier,
         expires_at=excluded.expires_at,
         blocking_reason=excluded.blocking_reason,
         updated_at=now()`,
      [
        userId, source, status,
        JSON.stringify({
          discovery: defaults.discovery,
          packageGeneration: defaults.packageGeneration,
          assistedSubmission: defaults.assistedSubmission,
          controlledSubmission,
          proofReconciliation: status === "certified_live" || defaults.proofReconciliation
        }),
        evidenceReference || null,
        status === "certified_live" ? new Date() : null,
        certification.accountIdentifier || null,
        certification.expiresAt || null,
        certification.blockingReason || null
      ]
    );
  }, db);
}

export async function createInboundAlias(db: pg.Pool, userId: string): Promise<string> {
  const domain = String(process.env.INBOUND_EMAIL_DOMAIN || "").trim().toLowerCase();
  if (!domain) throw new Error("INBOUND_EMAIL_DOMAIN is not configured.");
  const alias = `${createOpaqueToken(15).toLowerCase()}@${domain}`;
  return withTenant(userId, async (client) => {
    await client.query(
      `UPDATE product_inbound_routes
          SET status='revoked'
        WHERE user_id=$1 AND status='active'`,
      [userId]
    );
    await client.query(
      "UPDATE product_inbound_aliases SET status='revoked', revoked_at=now() WHERE user_id=$1 AND status='active'",
      [userId]
    );
    const result = await client.query(
      `INSERT INTO product_inbound_aliases (user_id, alias)
       VALUES ($1,$2) RETURNING id, alias`,
      [userId, alias]
    );
    await client.query(
      `INSERT INTO product_inbound_routes (alias, alias_id, user_id)
       VALUES ($1,$2,$3)`,
      [alias, result.rows[0].id, userId]
    );
    return result.rows[0].alias;
  }, db);
}

export async function storeInboundMessage(
  db: pg.Pool,
  input: {
    recipient: string;
    providerMessageId: string;
    senderAddress?: string | null;
    subject?: string | null;
    receivedAt: string;
  }
): Promise<{ userId: string; messageId: string } | null> {
  const route = await db.query(
    `SELECT user_id AS "userId", alias_id AS "aliasId"
       FROM product_inbound_routes
      WHERE alias=$1 AND status='active'`,
    [input.recipient.trim().toLowerCase()]
  );
  if (!route.rows[0]) return null;
  const { userId, aliasId } = route.rows[0];
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `INSERT INTO product_inbound_messages
         (user_id, inbound_alias_id, provider_message_id, sender_address,
          subject_redacted, received_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, provider_message_id) DO UPDATE SET
         provider_message_id=excluded.provider_message_id
       RETURNING id`,
      [
        userId, aliasId, input.providerMessageId,
        input.senderAddress?.slice(0, 320) || null,
        input.subject?.replace(/[\r\n]+/g, " ").slice(0, 300) || null,
        input.receivedAt
      ]
    );
    return { userId, messageId: result.rows[0].id };
  }, db);
}

export async function createRunnerEnrollment(
  db: pg.Pool,
  userId: string
): Promise<{ token: string; expiresAt: string }> {
  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60_000);
  await withTenant(userId, async (client) => {
    await client.query(
      "DELETE FROM product_runner_enrollment_tokens WHERE user_id=$1 OR expires_at <= now()",
      [userId]
    );
    const inserted = await client.query(
      `INSERT INTO product_runner_enrollment_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2,$3)
       RETURNING id`,
      [userId, tokenHash, expiresAt]
    );
    await client.query(
      `INSERT INTO product_runner_enrollment_credentials
         (token_hash, token_id, user_id, expires_at)
       VALUES ($1,$2,$3,$4)`,
      [tokenHash, inserted.rows[0].id, userId, expiresAt]
    );
  }, db);
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function enrollRunnerDevice(
  db: pg.Pool,
  input: { token: string; name: string; platform: string },
  keyring?: SecretKeyring
): Promise<{ deviceId: string; secret: string; userId: string }> {
  const tokenHash = hashOpaqueToken(input.token);
  const token = await db.query(
    `SELECT user_id AS "userId"
       FROM product_runner_enrollment_credentials
      WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  const userId = token.rows[0]?.userId;
  if (!userId) throw new Error("Runner enrollment token is invalid or expired.");
  const deviceId = crypto.randomUUID();
  const secret = createOpaqueToken(48);
  const encrypted = encryptProductSecret({ secret }, `runner:${userId}:${deviceId}`, keyring);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    const consumed = await client.query(
      `UPDATE product_runner_enrollment_tokens
          SET used_at=now()
        WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now()
        RETURNING id`,
      [tokenHash]
    );
    if (!consumed.rowCount) throw new Error("Runner enrollment token was already used.");
    await client.query(
      `UPDATE product_runner_enrollment_credentials
          SET used_at=now()
        WHERE token_hash=$1 AND used_at IS NULL`,
      [tokenHash]
    );
    await client.query(
      `INSERT INTO product_runner_devices (id, user_id, name, platform)
       VALUES ($1,$2,$3,$4)`,
      [deviceId, userId, input.name, input.platform]
    );
    await client.query(
      `INSERT INTO product_runner_credentials
         (device_id, user_id, encrypted_secret, key_version)
       VALUES ($1,$2,$3,$4)`,
      [deviceId, userId, encrypted.encryptedPayload, encrypted.keyVersion]
    );
    await client.query("COMMIT");
    return { deviceId, secret, userId };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function runnerCredential(
  db: pg.Pool,
  deviceId: string,
  keyring?: SecretKeyring
): Promise<{ userId: string; secret: string; status: string } | null> {
  const result = await db.query(
    `SELECT c.user_id AS "userId", c.encrypted_secret AS "encryptedSecret",
            c.key_version AS "keyVersion", d.status
       FROM product_runner_credentials c
       JOIN product_runner_devices d ON d.id=c.device_id
      WHERE c.device_id=$1`,
    [deviceId]
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  const secret = decryptProductSecret<{ secret: string }>(
    row.encryptedSecret,
    row.keyVersion,
    `runner:${row.userId}:${deviceId}`,
    keyring
  ).secret;
  return { userId: row.userId, secret, status: row.status };
}

export async function recordRunnerNonce(
  db: pg.Pool,
  userId: string,
  deviceId: string,
  nonce: string
): Promise<boolean> {
  return withTenant(userId, async (client) => {
    await client.query(
      "DELETE FROM product_runner_nonces WHERE device_id=$1 AND expires_at <= now()",
      [deviceId]
    );
    const result = await client.query(
      `INSERT INTO product_runner_nonces (device_id, nonce_hash, expires_at)
       VALUES ($1,$2,now() + interval '10 minutes')
       ON CONFLICT DO NOTHING`,
      [deviceId, hashOpaqueToken(nonce)]
    );
    return Boolean(result.rowCount);
  }, db);
}

export async function heartbeatRunner(
  db: pg.Pool,
  userId: string,
  deviceId: string
): Promise<void> {
  await withTenant(userId, (client) => client.query(
    "UPDATE product_runner_devices SET last_seen_at=now() WHERE user_id=$1 AND id=$2 AND status='active'",
    [userId, deviceId]
  ), db);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function runnerSignature(secret: string, value: unknown): string {
  return crypto.createHmac("sha256", secret).update(stableJson(value)).digest("base64url");
}

export async function leaseRunnerTask(
  db: pg.Pool,
  userId: string,
  deviceId: string,
  secret: string
): Promise<{ task: RunnerTask; leaseToken: string } | null> {
  return withTenant(userId, async (client) => {
    await client.query(
      `UPDATE product_runner_tasks
          SET status='queued', device_id=NULL, lease_token_hash=NULL,
              leased_at=NULL, lease_expires_at=NULL, updated_at=now()
        WHERE user_id=$1 AND status='leased' AND lease_expires_at <= now()`,
      [userId]
    );
    const leaseToken = createOpaqueToken();
    const result = await client.query(
      `WITH candidate AS (
         SELECT id FROM product_runner_tasks
          WHERE user_id=$1 AND status='queued'
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1
       )
       UPDATE product_runner_tasks t
          SET device_id=$2, status='leased', lease_token_hash=$3,
              leased_at=now(), lease_expires_at=now() + interval '10 minutes',
              updated_at=now()
         FROM candidate
        WHERE t.id=candidate.id
       RETURNING t.id, t.user_id AS "candidateUserId", t.source, t.action,
                 t.application_id AS "applicationId", t.payload,
                 t.proof_required AS "proofRequired",
                 t.lease_expires_at AS "expiresAt"`,
      [userId, deviceId, hashOpaqueToken(leaseToken)]
    );
    if (!result.rows[0]) return null;
    if (result.rows[0].applicationId) {
      await client.query(
        `UPDATE product_applications
            SET status='submission_attempted', updated_at=now()
          WHERE user_id=$1 AND id=$2`,
        [userId, result.rows[0].applicationId]
      );
    }
    const unsigned = {
      ...result.rows[0],
      expiresAt: new Date(result.rows[0].expiresAt).toISOString()
    };
    return {
      task: { ...unsigned, signature: runnerSignature(secret, unsigned) },
      leaseToken
    };
  }, db);
}

export async function saveRunnerProof(
  db: pg.Pool,
  userId: string,
  deviceId: string,
  leaseToken: string,
  proof: ApplicationProof,
  evidence?: {
    storageKey: string;
    mimeType: string;
    filename: string;
  }
): Promise<{ id: string }> {
  if (proof.resultStatus === "submitted_verified"
      && ((!proof.evidenceReference && !evidence) || !proof.finalUrl)) {
    throw new Error("Verified submission proof requires evidence and a final URL.");
  }
  return withTenant(userId, async (client) => {
    const task = await client.query(
      `SELECT id, application_id AS "applicationId", source
         FROM product_runner_tasks
        WHERE user_id=$1 AND id=$2 AND device_id=$3 AND status='leased'
          AND lease_token_hash=$4 AND lease_expires_at > now()
        FOR UPDATE`,
      [userId, proof.taskId, deviceId, hashOpaqueToken(leaseToken)]
    );
    if (!task.rows[0]) throw new Error("Runner task lease is invalid or expired.");
    if (task.rows[0].source !== proof.source || proof.candidateUserId !== userId) {
      throw new Error("Runner proof identity does not match the leased task.");
    }
    const inserted = await client.query(
      `INSERT INTO product_runner_proofs
         (user_id, task_id, application_id, result_status, final_url,
          evidence_reference, evidence_storage_key, evidence_mime_type,
          evidence_filename, redacted_metadata, captured_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
       RETURNING id`,
      [
        userId, proof.taskId, task.rows[0].applicationId || proof.applicationId || null,
        proof.resultStatus, proof.finalUrl || null,
        proof.evidenceReference || (evidence ? "private_object" : null),
        evidence?.storageKey || null, evidence?.mimeType || null,
        evidence?.filename || null,
        JSON.stringify({ resumeId: proof.resumeId || null, answers: proof.answers }),
        proof.capturedAt
      ]
    );
    await client.query(
      `UPDATE product_runner_tasks
          SET status=$3, completed_at=now(), updated_at=now()
        WHERE user_id=$1 AND id=$2`,
      [
        userId,
        proof.taskId,
        proof.resultStatus === "manual_gate" ? "manual_gate"
          : proof.resultStatus === "failed" ? "failed"
            : "completed"
      ]
    );
    if (task.rows[0].applicationId) {
      const applicationStatus = proof.resultStatus === "submitted_verified"
        ? "submitted_verified"
        : proof.resultStatus === "submitted_unverified"
          ? "submitted_unverified"
          : proof.resultStatus === "failed" ? "failed" : "manual_gate";
      await client.query(
        `UPDATE product_applications
            SET status=$3, final_url=$4, evidence_reference=$5,
                verified_at=CASE WHEN $3='submitted_verified' THEN $6 ELSE NULL END,
                updated_at=now()
          WHERE user_id=$1 AND id=$2`,
        [
          userId, task.rows[0].applicationId, applicationStatus,
          proof.finalUrl || null,
          proof.evidenceReference || (evidence ? `runner-proof:${inserted.rows[0].id}` : null),
          proof.capturedAt
        ]
      );
    }
    return { id: inserted.rows[0].id };
  }, db);
}

export async function getRunnerProofObject(
  db: pg.Pool,
  userId: string,
  proofId: string
): Promise<{
  storageKey: string;
  mimeType: string;
  filename: string;
} | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT evidence_storage_key AS "storageKey",
              evidence_mime_type AS "mimeType",
              evidence_filename AS "filename"
         FROM product_runner_proofs
        WHERE user_id=$1 AND id=$2 AND evidence_storage_key IS NOT NULL`,
      [userId, proofId]
    );
    return result.rows[0] || null;
  }, db);
}

export async function cleanupExpiredProductData(db: pg.Pool): Promise<{
  authTokens: number;
  inboundMessages: number;
  auditLogs: number;
}> {
  const auth = await db.query(
    `WITH deleted AS (
       DELETE FROM product_email_verification_tokens
        WHERE expires_at <= now() OR used_at IS NOT NULL
       RETURNING 1
     ), reset_deleted AS (
       DELETE FROM product_password_reset_tokens
        WHERE expires_at <= now() OR used_at IS NOT NULL
       RETURNING 1
     ), invite_deleted AS (
       DELETE FROM product_invitations
        WHERE expires_at <= now() OR used_at IS NOT NULL
       RETURNING 1
     )
     SELECT
       (SELECT count(*) FROM deleted)
       + (SELECT count(*) FROM reset_deleted)
       + (SELECT count(*) FROM invite_deleted) AS count`
  );
  let inboundMessages = 0;
  let auditLogs = 0;
  const users = await db.query<{ id: string }>(
    "SELECT id FROM product_users WHERE status <> 'deleted'"
  );
  for (const user of users.rows) {
    await withTenant(user.id, async (client) => {
      const inbound = await client.query(
        `DELETE FROM product_inbound_messages
          WHERE user_id=$1 AND expires_at <= now()
          RETURNING id`,
        [user.id]
      );
      const audit = await client.query(
        `DELETE FROM product_audit_logs
          WHERE user_id=$1 AND created_at < now() - interval '12 months'
          RETURNING id`,
        [user.id]
      );
      await client.query(
        "DELETE FROM product_idempotency_keys WHERE user_id=$1 AND expires_at <= now()",
        [user.id]
      );
      await client.query(
        `DELETE FROM product_oauth_states
          WHERE user_id=$1 AND (expires_at <= now() OR consumed_at IS NOT NULL)`,
        [user.id]
      );
      await client.query(
        `DELETE FROM product_runner_enrollment_tokens
          WHERE user_id=$1 AND (expires_at <= now() OR used_at IS NOT NULL)`,
        [user.id]
      );
      await client.query(
        `DELETE FROM product_runner_nonces n
          USING product_runner_devices d
          WHERE n.device_id=d.id AND d.user_id=$1 AND n.expires_at <= now()`,
        [user.id]
      );
      inboundMessages += inbound.rowCount || 0;
      auditLogs += audit.rowCount || 0;
    }, db);
  }
  await db.query("DELETE FROM product_auth_attempts WHERE last_attempt_at < now() - interval '24 hours'");
  return {
    authTokens: Number(auth.rows[0]?.count || 0),
    inboundMessages,
    auditLogs
  };
}
