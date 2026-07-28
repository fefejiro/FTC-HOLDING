import crypto from "node:crypto";
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
       VALUES ($1::uuid, $1::uuid, 'onboarding.updated', 'onboarding', $1::text, $2::jsonb)`,
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

export async function listProductResumes(db: pg.Pool, userId: string): Promise<unknown[]> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT id, filename, mime_type AS "mimeType", byte_size AS "byteSize",
              sha256, is_default AS "isDefault",
              CASE WHEN storage_key IS NOT NULL THEN 'private_object' ELSE 'legacy_database' END AS "storageStatus",
              created_at AS "createdAt"
         FROM product_resumes WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    return result.rows;
  }, db);
}

export async function saveProductResume(
  db: pg.Pool,
  userId: string,
  resume: {
    filename: string;
    mimeType: string;
    byteSize: number;
    sha256: string;
    storageKey: string;
    storageDriver: "local" | "s3";
    isDefault: boolean;
  }
): Promise<unknown> {
  return withTenant(userId, async (client) => {
    if (resume.isDefault) await client.query("UPDATE product_resumes SET is_default=false WHERE user_id=$1", [userId]);
    const result = await client.query(
      `INSERT INTO product_resumes
         (user_id, filename, mime_type, byte_size, sha256, content,
          storage_key, storage_driver, is_default)
       VALUES ($1,$2,$3,$4,$5,NULL,$6,$7,$8)
       ON CONFLICT (user_id, sha256) DO UPDATE SET
         filename=excluded.filename,
         storage_key=COALESCE(product_resumes.storage_key, excluded.storage_key),
         storage_driver=COALESCE(product_resumes.storage_driver, excluded.storage_driver),
         content=CASE WHEN product_resumes.storage_key IS NULL THEN NULL ELSE product_resumes.content END,
         is_default=CASE WHEN excluded.is_default THEN true ELSE product_resumes.is_default END
       RETURNING id, filename, mime_type AS "mimeType", byte_size AS "byteSize",
                 sha256, storage_key AS "storageKey", storage_driver AS "storageDriver",
                 is_default AS "isDefault", created_at AS "createdAt"`,
      [
        userId, resume.filename, resume.mimeType, resume.byteSize, resume.sha256,
        resume.storageKey, resume.storageDriver, resume.isDefault
      ]
    );
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'resume.saved','resume',$2,$3::jsonb)`,
      [userId, result.rows[0].id, JSON.stringify({ filename: resume.filename, sha256: resume.sha256 })]
    );
    return result.rows[0];
  }, db);
}

export async function getProductResumeObject(db: pg.Pool, userId: string, resumeId: string): Promise<any | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT filename, mime_type AS "mimeType", byte_size AS "byteSize", sha256,
              storage_key AS "storageKey", storage_driver AS "storageDriver",
              content AS "legacyContent"
         FROM product_resumes WHERE user_id=$1 AND id=$2`,
      [userId, resumeId]
    );
    return result.rows[0] || null;
  }, db);
}

export async function getProductResumeBySha(
  db: pg.Pool,
  userId: string,
  sha256: string
): Promise<{ id: string; storageKey: string | null } | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT id, storage_key AS "storageKey"
         FROM product_resumes
        WHERE user_id=$1 AND sha256=$2`,
      [userId, sha256]
    );
    return result.rows[0] || null;
  }, db);
}

export async function listProductResumeStorageObjects(
  db: pg.Pool,
  userId: string
): Promise<Array<{ storageKey: string; storageDriver: "local" | "s3" }>> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT storage_key AS "storageKey", storage_driver AS "storageDriver"
         FROM product_resumes
        WHERE user_id=$1 AND storage_key IS NOT NULL`,
      [userId]
    );
    return result.rows;
  }, db);
}

export async function listProductPrivateStorageObjects(
  db: pg.Pool,
  userId: string
): Promise<Array<{ storageKey: string; storageDriver: "local" | "s3" }>> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT storage_key AS "storageKey", storage_driver AS "storageDriver"
         FROM product_resumes
       WHERE user_id=$1 AND storage_key IS NOT NULL
       UNION ALL
       SELECT evidence_storage_key AS "storageKey", $2::text AS "storageDriver"
         FROM product_runner_proofs
        WHERE user_id=$1 AND evidence_storage_key IS NOT NULL
       UNION ALL
       SELECT storage_key AS "storageKey", $2::text AS "storageDriver"
         FROM product_application_evidence
        WHERE user_id=$1`,
      [
        userId,
        process.env.OBJECT_STORAGE_DRIVER === "s3" ? "s3" : "local"
      ]
    );
    return result.rows;
  }, db);
}

export async function getProductApplicationEvidenceObject(
  db: pg.Pool,
  userId: string,
  evidenceId: string
): Promise<{ storageKey: string; mimeType: string; filename: string } | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT storage_key AS "storageKey", mime_type AS "mimeType", filename
         FROM product_application_evidence
        WHERE user_id=$1 AND id=$2`,
      [userId, evidenceId]
    );
    return result.rows[0] || null;
  }, db);
}

export async function deleteProductResume(
  db: pg.Pool,
  userId: string,
  resumeId: string
): Promise<{
  filename: string;
  storageKey: string | null;
  storageDriver: "local" | "s3" | null;
  deletionId: number | null;
} | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `DELETE FROM product_resumes
        WHERE user_id=$1 AND id=$2
        RETURNING filename, storage_key AS "storageKey", storage_driver AS "storageDriver"`,
      [userId, resumeId]
    );
    if (!result.rowCount) return null;
    let deletionId: number | null = null;
    if (result.rows[0].storageKey) {
      const deletion = await client.query(
        `INSERT INTO product_object_deletions
           (user_id, storage_key, storage_driver)
         VALUES ($1,$2,$3)
         RETURNING id`,
        [userId, result.rows[0].storageKey, result.rows[0].storageDriver]
      );
      deletionId = deletion.rows[0].id;
    }
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'resume.deleted','resume',$2,$3::jsonb)`,
      [userId, resumeId, JSON.stringify({ filename: result.rows[0].filename })]
    );
    return {
      filename: result.rows[0].filename,
      storageKey: result.rows[0].storageKey,
      storageDriver: result.rows[0].storageDriver,
      deletionId
    };
  }, db);
}

export async function completeProductObjectDeletion(
  db: pg.Pool,
  userId: string,
  deletionId: number,
  error?: string
): Promise<void> {
  await withTenant(userId, async (client) => {
    await client.query(
      `UPDATE product_object_deletions
          SET status=$3, attempts=attempts+1, last_error=$4,
              completed_at=CASE WHEN $3='completed' THEN now() ELSE NULL END
        WHERE user_id=$1 AND id=$2`,
      [userId, deletionId, error ? "failed" : "completed", error?.slice(0, 500) || null]
    );
  }, db);
}

export async function getCareerTruthBank(db: pg.Pool, userId: string): Promise<unknown> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT facts, approved_at AS "approvedAt", updated_at AS "updatedAt"
         FROM product_career_truth_banks WHERE user_id=$1`,
      [userId]
    );
    return result.rows[0] || { facts: [], approvedAt: null, updatedAt: null };
  }, db);
}

export async function saveCareerTruthBank(
  db: pg.Pool,
  userId: string,
  facts: Array<{
    id?: string;
    category: string;
    statement: string;
    sourceResumeId?: string;
    verificationStatus?: "approved";
    provenance?: Record<string, unknown>;
  }>
): Promise<unknown> {
  const approvedFacts = facts.map((fact) => ({
    ...fact,
    id: fact.id || crypto.randomUUID(),
    verificationStatus: "approved" as const,
    provenance: fact.provenance || { source: "user_confirmed" }
  }));
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `INSERT INTO product_career_truth_banks (user_id, facts, approved_at, updated_at)
       VALUES ($1,$2::jsonb,now(),now())
       ON CONFLICT (user_id) DO UPDATE SET facts=excluded.facts, approved_at=now(), updated_at=now()
       RETURNING facts, approved_at AS "approvedAt", updated_at AS "updatedAt"`,
      [userId, JSON.stringify(approvedFacts)]
    );
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1::uuid,$1::uuid,'career_truth.approved','career_truth_bank',$1::text,$2::jsonb)`,
      [userId, JSON.stringify({ factCount: approvedFacts.length })]
    );
    return result.rows[0];
  }, db);
}

export async function listProductConnections(db: pg.Pool, userId: string): Promise<unknown[]> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT provider, provider_account AS "providerAccount", status,
              connected_at AS "connectedAt", updated_at AS "updatedAt"
         FROM product_connections WHERE user_id=$1 ORDER BY provider`,
      [userId]
    );
    return result.rows;
  }, db);
}

export async function requestProductConnection(db: pg.Pool, userId: string, provider: string): Promise<unknown> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `INSERT INTO product_connections (user_id, provider, status, updated_at)
       VALUES ($1,$2,'pending',now())
       ON CONFLICT (user_id, provider) DO UPDATE SET
         status=CASE WHEN product_connections.status='connected' THEN 'connected' ELSE 'pending' END,
         updated_at=now()
       RETURNING id, provider, provider_account AS "providerAccount", status,
                 connected_at AS "connectedAt", updated_at AS "updatedAt"`,
      [userId, provider]
    );
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'connection.requested','connection',$2,'{}'::jsonb)`,
      [userId, provider]
    );
    return result.rows[0];
  }, db);
}

export async function saveProductOAuthState(
  db: pg.Pool,
  userId: string,
  input: {
    provider: "gmail";
    stateHash: string;
    encryptedCodeVerifier: string;
    keyVersion: string;
    redirectUri: string;
    expiresAt: Date;
  }
): Promise<void> {
  await withTenant(userId, async (client) => {
    await client.query(
      "DELETE FROM product_oauth_states WHERE user_id=$1 AND (expires_at <= now() OR consumed_at IS NOT NULL)",
      [userId]
    );
    await client.query(
      `INSERT INTO product_oauth_states
         (user_id, provider, state_hash, encrypted_code_verifier,
          key_version, redirect_uri, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        userId, input.provider, input.stateHash, input.encryptedCodeVerifier,
        input.keyVersion, input.redirectUri, input.expiresAt
      ]
    );
  }, db);
}

export async function consumeProductOAuthState(
  db: pg.Pool,
  userId: string,
  provider: "gmail",
  stateHash: string
): Promise<{
  encryptedCodeVerifier: string;
  keyVersion: string;
  redirectUri: string;
} | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `UPDATE product_oauth_states
          SET consumed_at=now()
        WHERE user_id=$1 AND provider=$2 AND state_hash=$3
          AND consumed_at IS NULL AND expires_at > now()
        RETURNING encrypted_code_verifier AS "encryptedCodeVerifier",
                  key_version AS "keyVersion", redirect_uri AS "redirectUri"`,
      [userId, provider, stateHash]
    );
    return result.rows[0] || null;
  }, db);
}

export async function saveConnectedGmailAccount(
  db: pg.Pool,
  userId: string,
  input: {
    mailbox: string;
    encryptedPayload: string;
    keyVersion: string;
  }
): Promise<unknown> {
  return withTenant(userId, async (client) => {
    const connection = await client.query(
      `INSERT INTO product_connections
         (user_id, provider, provider_account, status, connected_at, updated_at)
       VALUES ($1,'gmail',$2,'connected',now(),now())
       ON CONFLICT (user_id, provider) DO UPDATE SET
         provider_account=excluded.provider_account, status='connected',
         connected_at=now(), updated_at=now()
       RETURNING id, provider, provider_account AS "providerAccount", status,
                 connected_at AS "connectedAt", updated_at AS "updatedAt"`,
      [userId, input.mailbox]
    );
    const secret = await client.query(
      `INSERT INTO product_connection_secrets
         (user_id, connection_id, provider, encrypted_payload, key_version, updated_at)
       VALUES ($1,$2,'gmail',$3,$4,now())
       ON CONFLICT (user_id, provider) DO UPDATE SET
         connection_id=excluded.connection_id, encrypted_payload=excluded.encrypted_payload,
         key_version=excluded.key_version, updated_at=now()
       RETURNING id`,
      [userId, connection.rows[0].id, input.encryptedPayload, input.keyVersion]
    );
    await client.query(
      "UPDATE product_connections SET secret_reference=$3 WHERE user_id=$1 AND id=$2",
      [userId, connection.rows[0].id, `database:${secret.rows[0].id}`]
    );
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'connection.connected','connection','gmail',$2::jsonb)`,
      [userId, JSON.stringify({ mailbox: input.mailbox })]
    );
    return connection.rows[0];
  }, db);
}

export async function getProductConnectionSecret(
  db: pg.Pool,
  userId: string,
  provider: "gmail"
): Promise<{ encryptedPayload: string; keyVersion: string } | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT encrypted_payload AS "encryptedPayload", key_version AS "keyVersion"
         FROM product_connection_secrets
        WHERE user_id=$1 AND provider=$2`,
      [userId, provider]
    );
    return result.rows[0] || null;
  }, db);
}

export async function revokeProductConnection(db: pg.Pool, userId: string, provider: string): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    await client.query(
      "DELETE FROM product_connection_secrets WHERE user_id=$1 AND provider=$2",
      [userId, provider]
    );
    const result = await client.query(
      `UPDATE product_connections
          SET provider_account=NULL, status='revoked', secret_reference=NULL,
              connected_at=NULL, updated_at=now()
        WHERE user_id=$1 AND provider=$2
        RETURNING provider, status, updated_at AS "updatedAt"`,
      [userId, provider]
    );
    if (!result.rows[0]) return null;
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'connection.revoked','connection',$2,'{}'::jsonb)`,
      [userId, provider]
    );
    return result.rows[0];
  }, db);
}

export async function setProductAccountStatus(
  db: pg.Pool,
  userId: string,
  status: "onboarding" | "active" | "paused"
): Promise<void> {
  await withTenant(userId, async (client) => {
    await client.query("UPDATE product_users SET status=$2, updated_at=now() WHERE id=$1", [userId, status]);
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1::uuid,$1::uuid,$2,'user',$1::text,$3::jsonb)`,
      [userId, `account.${status}`, JSON.stringify({ status })]
    );
  }, db);
}

export async function exportProductAccount(db: pg.Pool, userId: string): Promise<Record<string, unknown>> {
  return withTenant(userId, async (client) => {
    const queries = await Promise.all([
      client.query("SELECT email, status, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM product_users WHERE id=$1", [userId]),
      client.query("SELECT record, completed, consent_version AS \"consentVersion\", consented_at AS \"consentedAt\", updated_at AS \"updatedAt\" FROM product_onboarding WHERE user_id=$1", [userId]),
      client.query(`SELECT id, filename, mime_type AS "mimeType", byte_size AS "byteSize",
                           sha256, is_default AS "isDefault",
                           CASE WHEN storage_key IS NOT NULL THEN 'private_object' ELSE 'legacy_database' END AS "storageStatus",
                           created_at AS "createdAt"
                      FROM product_resumes WHERE user_id=$1 ORDER BY created_at`, [userId]),
      client.query("SELECT facts, approved_at AS \"approvedAt\", updated_at AS \"updatedAt\" FROM product_career_truth_banks WHERE user_id=$1", [userId]),
      client.query("SELECT provider, provider_account AS \"providerAccount\", status, connected_at AS \"connectedAt\", updated_at AS \"updatedAt\" FROM product_connections WHERE user_id=$1 ORDER BY provider", [userId]),
      client.query("SELECT id, source, external_id AS \"externalId\", title, company, location, job_url AS \"jobUrl\", score, status, reasons, discovered_at AS \"discoveredAt\", updated_at AS \"updatedAt\" FROM product_job_matches WHERE user_id=$1 ORDER BY discovered_at", [userId]),
      client.query("SELECT id, job_match_id AS \"jobMatchId\", action, reason, payload, status, decided_at AS \"decidedAt\", created_at AS \"createdAt\" FROM product_approval_requests WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT id, job_match_id AS \"jobMatchId\", resume_id AS \"resumeId\", status, final_url AS \"finalUrl\", evidence_reference AS \"evidenceReference\", answers, verified_at AS \"verifiedAt\", created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM product_applications WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT action, target_type AS \"targetType\", target_id AS \"targetId\", metadata, created_at AS \"createdAt\" FROM product_audit_logs WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT consent_version AS \"consentVersion\", consent_type AS \"consentType\", granted, granted_at AS \"grantedAt\", revoked_at AS \"revokedAt\" FROM product_consent_grants WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT mode, recruiter_drafts AS \"recruiterDrafts\", recruiter_sends AS \"recruiterSends\", assisted_applications AS \"assistedApplications\", controlled_submissions AS \"controlledSubmissions\", max_drafts_per_day AS \"maxDraftsPerDay\", max_recruiter_sends_per_day AS \"maxRecruiterSendsPerDay\", max_applications_per_day AS \"maxApplicationsPerDay\", max_applications_per_board AS \"maxApplicationsPerBoard\", quiet_hours_start AS \"quietHoursStart\", quiet_hours_end AS \"quietHoursEnd\", time_zone AS \"timeZone\", policy_version AS \"policyVersion\", updated_at AS \"updatedAt\" FROM product_automation_policies WHERE user_id=$1", [userId]),
      client.query("SELECT source, status, capabilities, evidence_reference AS \"evidenceReference\", verified_at AS \"verifiedAt\", updated_at AS \"updatedAt\" FROM product_connector_capabilities WHERE user_id=$1 ORDER BY source", [userId]),
      client.query("SELECT alias, status, created_at AS \"createdAt\", revoked_at AS \"revokedAt\" FROM product_inbound_aliases WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT id, name, platform, status, last_seen_at AS \"lastSeenAt\", created_at AS \"createdAt\", revoked_at AS \"revokedAt\" FROM product_runner_devices WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT id, result_status AS \"resultStatus\", final_url AS \"finalUrl\", evidence_reference AS \"evidenceReference\", (evidence_storage_key IS NOT NULL) AS \"evidenceAvailable\", captured_at AS \"capturedAt\" FROM product_runner_proofs WHERE user_id=$1 ORDER BY captured_at", [userId]),
      client.query("SELECT run_type AS \"runType\", status, redacted_summary AS \"redactedSummary\", started_at AS \"startedAt\", completed_at AS \"completedAt\", created_at AS \"createdAt\" FROM agent_runs WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT id, application_id AS \"applicationId\", evidence_type AS \"evidenceType\", mime_type AS \"mimeType\", filename, sha256, captured_at AS \"capturedAt\", provenance, created_at AS \"createdAt\" FROM product_application_evidence WHERE user_id=$1 ORDER BY captured_at", [userId])
    ]);
    return {
      exportedAt: new Date().toISOString(),
      user: queries[0].rows[0] || null,
      onboarding: queries[1].rows[0] || null,
      resumes: queries[2].rows,
      careerTruthBank: queries[3].rows[0] || null,
      connections: queries[4].rows,
      jobMatches: queries[5].rows,
      approvalRequests: queries[6].rows,
      applications: queries[7].rows,
      auditLogs: queries[8].rows,
      consentHistory: queries[9].rows,
      automationPolicy: queries[10].rows[0] || null,
      connectorCapabilities: queries[11].rows,
      inboundAliases: queries[12].rows,
      runnerDevices: queries[13].rows,
      runnerProofs: queries[14].rows,
      agentRuns: queries[15].rows,
      applicationEvidence: queries[16].rows
    };
  }, db);
}

export async function deleteProductAccount(db: pg.Pool, userId: string): Promise<boolean> {
  const result = await db.query("DELETE FROM product_users WHERE id=$1 RETURNING id", [userId]);
  return Boolean(result.rowCount);
}

export async function productActivationReadiness(db: pg.Pool, userId: string): Promise<{
  ready: boolean;
  checks: Array<{ key: string; ready: boolean }>;
}> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
       `SELECT
         COALESCE((SELECT email_verified_at IS NOT NULL FROM product_users WHERE id=$1), false) AS verified_email,
         COALESCE((SELECT completed FROM product_onboarding WHERE user_id=$1), false) AS onboarding,
         EXISTS(SELECT 1 FROM product_resumes WHERE user_id=$1 AND is_default=true) AS default_resume,
         COALESCE((SELECT jsonb_array_length(facts) > 0 FROM product_career_truth_banks WHERE user_id=$1), false) AS career_truth,
         EXISTS(SELECT 1 FROM product_automation_policies WHERE user_id=$1) AS automation_policy,
         (
           EXISTS(SELECT 1 FROM product_connections WHERE user_id=$1 AND provider='gmail' AND status='connected')
           OR EXISTS(SELECT 1 FROM product_inbound_aliases WHERE user_id=$1 AND status='active')
         ) AS email_intake`,
      [userId]
    );
    const row = result.rows[0];
    const checks = [
      { key: "verified_email", ready: row.verified_email },
      { key: "onboarding_and_consent", ready: row.onboarding },
      { key: "default_resume", ready: row.default_resume },
      { key: "approved_career_truth", ready: row.career_truth },
      { key: "automation_policy", ready: row.automation_policy },
      { key: "verified_email_intake", ready: row.email_intake }
    ];
    return { ready: checks.every((check) => check.ready), checks };
  }, db);
}

export async function productDashboard(db: pg.Pool, userId: string): Promise<{
  recommendations: unknown[];
  approvals: unknown[];
  applications: unknown[];
}> {
  return withTenant(userId, async (client) => {
    const [recommendations, approvals, applications] = await Promise.all([
      client.query(
        `SELECT id, source, title, company, location, job_url AS "jobUrl", score,
                status, reasons, discovered_at AS "discoveredAt"
           FROM product_job_matches
          WHERE user_id=$1 AND status IN ('recommended','package_ready','needs_approval')
            AND NOT EXISTS (
              SELECT 1
                FROM product_applications
               WHERE user_id=$1
                 AND job_match_id=product_job_matches.id
                 AND status IN (
                   'submission_attempted', 'submitted_unverified',
                   'submitted_verified', 'withdrawn'
                 )
            )
          ORDER BY score DESC, discovered_at DESC LIMIT 50`,
        [userId]
      ),
      client.query(
        `SELECT a.id, a.action, a.reason, a.payload, a.status,
                a.created_at AS "createdAt", j.title, j.company
           FROM product_approval_requests a
           LEFT JOIN product_job_matches j ON j.id=a.job_match_id
          WHERE a.user_id=$1 AND a.status='pending'
          ORDER BY a.created_at DESC LIMIT 50`,
        [userId]
      ),
      client.query(
        `SELECT a.id, a.status, a.final_url AS "finalUrl",
                a.evidence_reference AS "evidenceReference",
                a.verified_at AS "verifiedAt", a.updated_at AS "updatedAt",
                j.title, j.company, j.source,
                e.id AS "evidenceId"
           FROM product_applications a
           JOIN product_job_matches j ON j.id=a.job_match_id
           LEFT JOIN LATERAL (
             SELECT id
               FROM product_application_evidence
              WHERE user_id=a.user_id AND application_id=a.id
              ORDER BY captured_at DESC
              LIMIT 1
           ) e ON true
          WHERE a.user_id=$1 ORDER BY a.updated_at DESC LIMIT 100`,
        [userId]
      )
    ]);
    return {
      recommendations: recommendations.rows,
      approvals: approvals.rows,
      applications: applications.rows
    };
  }, db);
}

export async function decideProductApproval(
  db: pg.Pool,
  userId: string,
  approvalId: string,
  decision: "approved" | "rejected"
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `UPDATE product_approval_requests
          SET status=$3, decided_at=now()
        WHERE user_id=$1 AND id=$2 AND status='pending'
        RETURNING id, job_match_id AS "jobMatchId", action, reason, payload,
                  status, decided_at AS "decidedAt"`,
      [userId, approvalId, decision]
    );
    if (!result.rows[0]) return null;
    let runnerTaskId: string | null = null;
    let manualGate: string | null = null;
    const approval = result.rows[0];
    if (decision === "approved"
        && ["application.submit", "application.assist_submit", "assist_submit"].includes(approval.action)
        && approval.jobMatchId) {
      const candidate = await client.query(
        `SELECT j.source, j.title, j.company, j.location, j.job_url AS "jobUrl",
                a.id AS "applicationId", a.resume_id AS "resumeId", a.status,
                c.status AS "connectorStatus", c.capabilities
           FROM product_job_matches j
           JOIN product_applications a
             ON a.user_id=j.user_id AND a.job_match_id=j.id
           LEFT JOIN product_connector_capabilities c
             ON c.user_id=j.user_id AND c.source=j.source
          WHERE j.user_id=$1 AND j.id=$2
          LIMIT 1`,
        [userId, approval.jobMatchId]
      );
      const row = candidate.rows[0];
      const controlled = approval.action === "application.submit";
      const sourceAllowed = ["linkedin", "indeed", "dice", "monster"].includes(row?.source);
      const capabilityAllowed = controlled
        ? row?.connectorStatus === "certified_live" && row?.capabilities?.controlledSubmission === true
        : row?.capabilities?.assistedSubmission === true
          && !["disabled", "blocked_auth"].includes(row?.connectorStatus);
      if (!row?.applicationId || !row?.resumeId) {
        manualGate = "verified_application_package_required";
      } else if (!sourceAllowed || !capabilityAllowed) {
        manualGate = controlled ? "connector_not_certified_for_submission" : "connector_not_ready_for_assistance";
      } else {
        const task = await client.query(
          `INSERT INTO product_runner_tasks
             (user_id, application_id, source, action, payload, proof_required)
           VALUES ($1,$2,$3,'assist_submit',$4::jsonb,true)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [
            userId,
            row.applicationId,
            row.source,
            JSON.stringify({
              expectedCandidateUserId: userId,
              applicationId: row.applicationId,
              resumeId: row.resumeId,
              job: {
                title: row.title,
                company: row.company,
                location: row.location,
                url: row.jobUrl
              },
              approvedAction: approval.action
            })
          ]
        );
        runnerTaskId = task.rows[0]?.id || null;
        await client.query(
          `UPDATE product_applications
              SET status='package_ready', updated_at=now()
            WHERE user_id=$1 AND id=$2`,
          [userId, row.applicationId]
        );
      }
      if (manualGate && row?.applicationId) {
        await client.query(
          `UPDATE product_applications
              SET status='manual_gate', updated_at=now()
            WHERE user_id=$1 AND id=$2`,
          [userId, row.applicationId]
        );
      }
    }
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'approval.decided','approval',$2,$3::jsonb)`,
      [userId, approvalId, JSON.stringify({ decision, runnerTaskId, manualGate })]
    );
    return { ...approval, runnerTaskId, manualGate };
  }, db);
}
