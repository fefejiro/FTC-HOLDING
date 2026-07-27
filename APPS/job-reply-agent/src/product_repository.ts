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
  facts: Array<{ category: string; statement: string; sourceResumeId?: string }>
): Promise<unknown> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `INSERT INTO product_career_truth_banks (user_id, facts, approved_at, updated_at)
       VALUES ($1,$2::jsonb,now(),now())
       ON CONFLICT (user_id) DO UPDATE SET facts=excluded.facts, approved_at=now(), updated_at=now()
       RETURNING facts, approved_at AS "approvedAt", updated_at AS "updatedAt"`,
      [userId, JSON.stringify(facts)]
    );
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1::uuid,$1::uuid,'career_truth.approved','career_truth_bank',$1::text,$2::jsonb)`,
      [userId, JSON.stringify({ factCount: facts.length })]
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
       RETURNING provider, provider_account AS "providerAccount", status,
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

export async function revokeProductConnection(db: pg.Pool, userId: string, provider: string): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
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
      client.query("SELECT action, target_type AS \"targetType\", target_id AS \"targetId\", metadata, created_at AS \"createdAt\" FROM product_audit_logs WHERE user_id=$1 ORDER BY created_at", [userId])
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
      auditLogs: queries[8].rows
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
         COALESCE((SELECT completed FROM product_onboarding WHERE user_id=$1), false) AS onboarding,
         EXISTS(SELECT 1 FROM product_resumes WHERE user_id=$1 AND is_default=true) AS default_resume,
         COALESCE((SELECT jsonb_array_length(facts) > 0 FROM product_career_truth_banks WHERE user_id=$1), false) AS career_truth,
         EXISTS(SELECT 1 FROM product_connections WHERE user_id=$1 AND provider='gmail' AND status='connected') AS gmail`,
      [userId]
    );
    const row = result.rows[0];
    const checks = [
      { key: "onboarding_and_consent", ready: row.onboarding },
      { key: "default_resume", ready: row.default_resume },
      { key: "approved_career_truth", ready: row.career_truth },
      { key: "verified_gmail_connection", ready: row.gmail }
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
                j.title, j.company, j.source
           FROM product_applications a
           JOIN product_job_matches j ON j.id=a.job_match_id
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
        RETURNING id, action, reason, status, decided_at AS "decidedAt"`,
      [userId, approvalId, decision]
    );
    if (!result.rows[0]) return null;
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'approval.decided','approval',$2,$3::jsonb)`,
      [userId, approvalId, JSON.stringify({ decision })]
    );
    return result.rows[0];
  }, db);
}
