import crypto from "node:crypto";
import type pg from "pg";
import { withTenant } from "./product_db.js";
import {
  buildTailoredApplicationPackage,
  buildGroundedInterviewQuestions,
  buildTrustAnalysis,
  type CareerFact,
  type OutcomeType
} from "./product_domain.js";

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

export async function getProductResumeFactProposal(
  db: pg.Pool,
  userId: string,
  resumeId: string
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT resume_id AS "resumeId",
              jsonb_agg(jsonb_build_object(
                'id', id, 'category', category, 'statement', statement,
                'originalStatement', original_statement,
                'sourceLocation', source_location,
                'extractionMethod', extraction_method,
                'provenanceState', provenance_state, 'status', status,
                'supersedesId', supersedes_id, 'reviewedAt', reviewed_at,
                'createdAt', created_at, 'updatedAt', updated_at
              ) ORDER BY created_at) AS facts,
              CASE WHEN bool_and(status='approved') THEN 'approved'
                   WHEN bool_and(status='rejected') THEN 'rejected'
                   ELSE 'proposed' END AS status,
              min(created_at) AS "createdAt", max(updated_at) AS "updatedAt"
         FROM product_resume_fact_proposals
        WHERE user_id=$1 AND resume_id=$2
        GROUP BY resume_id`,
      [userId, resumeId]
    );
    return result.rows[0] || null;
  }, db);
}

export async function saveProductResumeFactProposal(
  db: pg.Pool,
  userId: string,
  resumeId: string,
  facts: Array<{
    category: string;
    statement: string;
    provenance?: Record<string, unknown>;
  }>
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const resume = await client.query(
      `SELECT id, filename, mime_type AS "mimeType", sha256,
              COALESCE(storage_key, 'legacy://product-resumes/' || id::text) AS "storageKey"
         FROM product_resumes WHERE user_id=$1 AND id=$2`,
      [userId, resumeId]
    );
    if (!resume.rows[0]) return null;
    const sourceResume = resume.rows[0];
    let document = await client.query(
      `SELECT id FROM resume_documents WHERE user_id=$1 AND sha256=$2
        ORDER BY created_at DESC LIMIT 1`,
      [userId, sourceResume.sha256]
    );
    if (!document.rows[0]) {
      document = await client.query(
        `INSERT INTO resume_documents
           (user_id, storage_key, original_filename, mime_type, sha256)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [userId, sourceResume.storageKey, sourceResume.filename, sourceResume.mimeType, sourceResume.sha256]
      );
    }
    let version = await client.query(
      `SELECT id FROM resume_versions
        WHERE user_id=$1 AND document_id=$2
        ORDER BY version_number DESC LIMIT 1`,
      [userId, document.rows[0].id]
    );
    if (!version.rows[0]) {
      version = await client.query(
        `INSERT INTO resume_versions
           (user_id, document_id, version_number, kind, generation_metadata)
         VALUES ($1,$2,1,'source',$3::jsonb) RETURNING id`,
        [userId, document.rows[0].id, JSON.stringify({ source: "product_resumes", resumeId })]
      );
    }
    for (const fact of facts) {
      const statement = fact.statement.trim();
      await client.query(
        `INSERT INTO product_resume_fact_proposals
           (user_id, resume_id, resume_document_id, resume_version_id,
            category, statement, original_statement, source_location,
            extraction_method, provenance_state, status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$6,$7,'resume_upload_review','proposed','proposed',now())`,
        [
          userId, resumeId, document.rows[0].id, version.rows[0].id,
          fact.category.trim(), statement, `resume:${sourceResume.filename}`
        ]
      );
    }
    const result = await client.query(
      `SELECT resume_id AS "resumeId",
              jsonb_agg(jsonb_build_object(
                'id', id, 'category', category, 'statement', statement,
                'originalStatement', original_statement,
                'sourceLocation', source_location,
                'extractionMethod', extraction_method,
                'provenanceState', provenance_state, 'status', status,
                'supersedesId', supersedes_id, 'reviewedAt', reviewed_at,
                'createdAt', created_at, 'updatedAt', updated_at
              ) ORDER BY created_at) AS facts,
              'proposed' AS status, min(created_at) AS "createdAt",
              max(updated_at) AS "updatedAt"
         FROM product_resume_fact_proposals
        WHERE user_id=$1 AND resume_id=$2 GROUP BY resume_id`,
      [userId, resumeId]
    );
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'career_truth.proposed','resume_fact_proposal',$2,$3::jsonb)`,
      [userId, resumeId, JSON.stringify({ resumeId, factCount: facts.length, provenance: "server_owned" })]
    );
    return result.rows[0];
  }, db);
}

export type ResumeFactProposalAction = "approve" | "reject" | "edit" | "supersede";

export async function transitionProductResumeFactProposal(
  db: pg.Pool, userId: string, resumeId: string, factId: string,
  action: ResumeFactProposalAction, statement?: string
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const current = await client.query(
      `SELECT p.* FROM product_resume_fact_proposals p
        JOIN product_resumes r ON r.id=p.resume_id AND r.user_id=p.user_id
       WHERE p.user_id=$1 AND p.resume_id=$2 AND p.id=$3`,
      [userId, resumeId, factId]
    );
    const row = current.rows[0];
    if (!row) return null;
    const edited = statement?.trim();
    if ((action === "edit" || action === "supersede") && (!edited || edited.length < 3)) {
      throw new Error("An edited fact must contain at least three characters.");
    }
    let result;
    if (action === "supersede") {
      await client.query(
        `UPDATE product_resume_fact_proposals
            SET status='superseded', reviewed_at=now(), reviewed_by=$1, updated_at=now()
          WHERE user_id=$1 AND id=$2`, [userId, factId]
      );
      result = await client.query(
        `INSERT INTO product_resume_fact_proposals
           (user_id, resume_id, resume_document_id, resume_version_id, category,
            statement, original_statement, source_location, extraction_method,
            provenance_state, status, supersedes_id, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'customer_edit','customer_edited','proposed',$9,now())
         RETURNING id, resume_id AS "resumeId", category, statement,
                   original_statement AS "originalStatement", status,
                   provenance_state AS "provenanceState", source_location AS "sourceLocation",
                   extraction_method AS "extractionMethod", supersedes_id AS "supersedesId",
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [userId, resumeId, row.resume_document_id, row.resume_version_id, row.category,
          edited, row.original_statement, row.source_location, factId]
      );
    } else {
      const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "proposed";
      result = await client.query(
        `UPDATE product_resume_fact_proposals
            SET statement=COALESCE($4,statement),
                provenance_state=CASE WHEN $4 IS NULL THEN provenance_state ELSE 'customer_edited' END,
                status=$5,
                reviewed_at=CASE WHEN $5 IN ('approved','rejected') THEN now() ELSE NULL END,
                reviewed_by=CASE WHEN $5 IN ('approved','rejected') THEN $1 ELSE NULL END,
                updated_at=now()
          WHERE user_id=$1 AND resume_id=$2 AND id=$3
          RETURNING id, resume_id AS "resumeId", category, statement,
                    original_statement AS "originalStatement", status,
                    provenance_state AS "provenanceState", source_location AS "sourceLocation",
                    extraction_method AS "extractionMethod", supersedes_id AS "supersedesId",
                    created_at AS "createdAt", updated_at AS "updatedAt"`,
        [userId, resumeId, factId, edited || null, nextStatus]
      );
    }
    const approved = await client.query(
      `SELECT id, category, statement, resume_id AS "sourceResumeId",
              jsonb_build_object('source','resume_upload','resumeId',resume_id,
                'resumeVersionId',resume_version_id,'sourceLocation',source_location,
                'extractionMethod',extraction_method,'approvedAt',reviewed_at) AS provenance
         FROM product_resume_fact_proposals
        WHERE user_id=$1 AND status='approved' ORDER BY created_at`, [userId]
    );
    await client.query(
      `INSERT INTO product_career_truth_banks (user_id, facts, approved_at, updated_at)
       VALUES ($1,$2::jsonb,CASE WHEN jsonb_array_length($2::jsonb)>0 THEN now() ELSE NULL END,now())
       ON CONFLICT (user_id) DO UPDATE SET facts=excluded.facts,
         approved_at=excluded.approved_at, updated_at=now()`,
      [userId, JSON.stringify(approved.rows.map((fact) => ({
        id: fact.id, category: fact.category, statement: fact.statement,
        sourceResumeId: fact.sourceResumeId, verificationStatus: "approved", provenance: fact.provenance
      })))]
    );
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,$2,'resume_fact_proposal',$3,$4::jsonb)`,
      [userId, `career_truth.${action}`, factId, JSON.stringify({ status: result.rows[0].status })]
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
    id: fact.id || crypto.randomUUID(),
    category: fact.category.trim(),
    statement: fact.statement.trim(),
    verificationStatus: "approved" as const,
    provenance: { source: "customer_confirmed", method: "explicit_customer_approval" }
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
      client.query(`SELECT id, resume_id AS "resumeId", resume_document_id AS "resumeDocumentId",
                           resume_version_id AS "resumeVersionId", category, statement,
                           original_statement AS "originalStatement", source_location AS "sourceLocation",
                           extraction_method AS "extractionMethod", provenance_state AS "provenanceState",
                           status, supersedes_id AS "supersedesId", reviewed_at AS "reviewedAt",
                           created_at AS "createdAt", updated_at AS "updatedAt"
                      FROM product_resume_fact_proposals WHERE user_id=$1 ORDER BY created_at`, [userId]),
      client.query("SELECT provider, provider_account AS \"providerAccount\", status, connected_at AS \"connectedAt\", updated_at AS \"updatedAt\" FROM product_connections WHERE user_id=$1 ORDER BY provider", [userId]),
      client.query("SELECT id, source, external_id AS \"externalId\", title, company, location, job_url AS \"jobUrl\", score, status, reasons, discovered_at AS \"discoveredAt\", updated_at AS \"updatedAt\" FROM product_job_matches WHERE user_id=$1 ORDER BY discovered_at", [userId]),
      client.query("SELECT id, job_match_id AS \"jobMatchId\", action, reason, payload, status, decided_at AS \"decidedAt\", created_at AS \"createdAt\" FROM product_approval_requests WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT id, job_match_id AS \"jobMatchId\", resume_id AS \"resumeId\", status, final_url AS \"finalUrl\", evidence_reference AS \"evidenceReference\", answers, verified_at AS \"verifiedAt\", created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM product_applications WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT action, target_type AS \"targetType\", target_id AS \"targetId\", metadata, created_at AS \"createdAt\" FROM product_audit_logs WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT id, job_match_id AS \"jobMatchId\", reason, note, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM product_recommendation_feedback WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT consent_version AS \"consentVersion\", consent_type AS \"consentType\", granted, granted_at AS \"grantedAt\", revoked_at AS \"revokedAt\" FROM product_consent_grants WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT mode, recruiter_drafts AS \"recruiterDrafts\", recruiter_sends AS \"recruiterSends\", assisted_applications AS \"assistedApplications\", controlled_submissions AS \"controlledSubmissions\", max_drafts_per_day AS \"maxDraftsPerDay\", max_recruiter_sends_per_day AS \"maxRecruiterSendsPerDay\", max_applications_per_day AS \"maxApplicationsPerDay\", max_applications_per_board AS \"maxApplicationsPerBoard\", quiet_hours_start AS \"quietHoursStart\", quiet_hours_end AS \"quietHoursEnd\", time_zone AS \"timeZone\", policy_version AS \"policyVersion\", updated_at AS \"updatedAt\" FROM product_automation_policies WHERE user_id=$1", [userId]),
      client.query("SELECT source, status, capabilities, evidence_reference AS \"evidenceReference\", verified_at AS \"verifiedAt\", account_identifier AS \"accountIdentifier\", expires_at AS \"expiresAt\", blocking_reason AS \"blockingReason\", updated_at AS \"updatedAt\" FROM product_connector_capabilities WHERE user_id=$1 ORDER BY source", [userId]),
      client.query("SELECT alias, status, created_at AS \"createdAt\", revoked_at AS \"revokedAt\" FROM product_inbound_aliases WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT id, name, platform, status, last_seen_at AS \"lastSeenAt\", created_at AS \"createdAt\", revoked_at AS \"revokedAt\" FROM product_runner_devices WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT id, result_status AS \"resultStatus\", final_url AS \"finalUrl\", evidence_reference AS \"evidenceReference\", (evidence_storage_key IS NOT NULL) AS \"evidenceAvailable\", captured_at AS \"capturedAt\" FROM product_runner_proofs WHERE user_id=$1 ORDER BY captured_at", [userId]),
      client.query("SELECT run_type AS \"runType\", status, redacted_summary AS \"redactedSummary\", started_at AS \"startedAt\", completed_at AS \"completedAt\", created_at AS \"createdAt\" FROM agent_runs WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT id, application_id AS \"applicationId\", evidence_type AS \"evidenceType\", mime_type AS \"mimeType\", filename, sha256, captured_at AS \"capturedAt\", provenance, created_at AS \"createdAt\" FROM product_application_evidence WHERE user_id=$1 ORDER BY captured_at", [userId]),
      client.query("SELECT job_match_id AS \"jobMatchId\", match_explanation AS \"matchExplanation\", ats_gap_report AS \"atsGapReport\", updated_at AS \"updatedAt\" FROM product_job_insights WHERE user_id=$1 ORDER BY updated_at", [userId]),
      client.query("SELECT id, job_match_id AS \"jobMatchId\", application_id AS \"applicationId\", status, questions, rehearsal, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM product_interview_prep_sessions WHERE user_id=$1 ORDER BY created_at", [userId]),
      client.query("SELECT id, application_id AS \"applicationId\", outcome_type AS \"outcomeType\", metadata, occurred_at AS \"occurredAt\" FROM product_outcome_events WHERE user_id=$1 ORDER BY occurred_at", [userId]),
      client.query("SELECT id, job_match_id AS \"jobMatchId\", resume_id AS \"resumeId\", source_resume_version AS \"sourceResumeVersion\", status, customer_answers AS \"customerAnswers\", output, evidence_fact_ids AS \"evidenceFactIds\", missing_information_flags AS \"missingInformationFlags\", created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM product_application_packages WHERE user_id=$1 ORDER BY updated_at", [userId])
    ]);
    return {
      exportedAt: new Date().toISOString(),
      user: queries[0].rows[0] || null,
      onboarding: queries[1].rows[0] || null,
      resumes: queries[2].rows,
      careerTruthBank: queries[3].rows[0] || null,
      resumeFactProposals: queries[4].rows,
      recommendationFeedback: queries[10].rows,
      connections: queries[5].rows,
      jobMatches: queries[6].rows,
      approvalRequests: queries[7].rows,
      applications: queries[8].rows,
      auditLogs: queries[9].rows,
      consentHistory: queries[11].rows,
      automationPolicy: queries[12].rows[0] || null,
      connectorCapabilities: queries[13].rows,
      inboundAliases: queries[14].rows,
      runnerDevices: queries[15].rows,
      runnerProofs: queries[16].rows,
      agentRuns: queries[17].rows,
      applicationEvidence: queries[18].rows,
      jobInsights: queries[19].rows,
      interviewPrepSessions: queries[20].rows,
      outcomeEvents: queries[21].rows,
      applicationPackages: queries[22].rows
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
        `SELECT j.id, j.source, j.title, j.company, j.location, j.job_url AS "jobUrl",
                j.score, GREATEST(0, j.score - LEAST(30, COALESCE(learning.penalty,0))) AS "adjustedScore",
                (COALESCE(learning.penalty,0) > 0) AS "learningApplied",
                j.status, j.reasons, j.discovered_at AS "discoveredAt"
           FROM product_job_matches j
           LEFT JOIN LATERAL (
             SELECT SUM(CASE f.reason
               WHEN 'company' THEN 20 WHEN 'location' THEN 15 WHEN 'title' THEN 15
               WHEN 'industry' THEN 10 WHEN 'skills' THEN 10 WHEN 'salary' THEN 10
               WHEN 'seniority' THEN 10 WHEN 'work_arrangement' THEN 10
               WHEN 'authorization' THEN 10 WHEN 'not_interested' THEN 12 ELSE 5 END) AS penalty
               FROM product_recommendation_feedback f
               JOIN product_job_matches prior ON prior.user_id=f.user_id AND prior.id=f.job_match_id
              WHERE f.user_id=$1 AND (
                (f.reason IN ('company','not_interested') AND lower(prior.company)=lower(j.company)) OR
                (f.reason='location' AND lower(COALESCE(prior.location,''))=lower(COALESCE(j.location,''))) OR
                (f.reason='title' AND lower(prior.title)=lower(j.title)) OR
                (f.reason NOT IN ('company','location','title','already_applied') AND prior.company=j.company)
              )
           ) learning ON true
          WHERE j.user_id=$1 AND j.status IN ('recommended','package_ready','needs_approval')
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
          ORDER BY "adjustedScore" DESC, j.discovered_at DESC LIMIT 50`,
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
    if (approval.action === "application.package_review") {
      const packageId = approval.payload && typeof approval.payload === "object"
        ? String((approval.payload as Record<string, unknown>).packageId || "")
        : "";
      const applicationId = approval.payload && typeof approval.payload === "object"
        ? String((approval.payload as Record<string, unknown>).applicationId || "")
        : "";
      if (packageId) {
        await client.query(
          `UPDATE product_application_packages
              SET status=$3, output=jsonb_set(output, '{status}', to_jsonb($3::text), true), updated_at=now()
            WHERE user_id=$1 AND id=$2`,
          [userId, packageId, decision]
        );
      }
      if (applicationId) {
        await client.query(
          `UPDATE product_applications SET status=$3, updated_at=now()
            WHERE user_id=$1 AND id=$2`,
          [userId, applicationId, decision === "approved" ? "package_ready" : "rejected_by_policy"]
        );
      }
    }
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

function approvedProductFacts(userId: string, facts: unknown): CareerFact[] {
  if (!Array.isArray(facts)) return [];
  return facts
    .filter((fact): fact is Record<string, unknown> => Boolean(fact && typeof fact === "object"))
    .map((fact) => ({
      id: String(fact.id || crypto.randomUUID()),
      userId,
      category: String(fact.category || "approved"),
      statement: String(fact.statement || ""),
      verificationStatus: (
        fact.verificationStatus === "approved" ? "approved" : "review_required"
      ) as CareerFact["verificationStatus"],
      provenance: fact.provenance && typeof fact.provenance === "object"
        ? fact.provenance as Record<string, unknown>
        : {}
    }))
    .filter((fact) => fact.statement);
}

export async function generateProductJobInsight(
  db: pg.Pool,
  userId: string,
  jobMatchId: string,
  jobDescription?: string
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const [jobResult, truthResult] = await Promise.all([
      client.query(
        `SELECT id, title, company, score, reasons, description_text AS "descriptionText"
           FROM product_job_matches WHERE user_id=$1 AND id=$2`,
        [userId, jobMatchId]
      ),
      client.query("SELECT facts FROM product_career_truth_banks WHERE user_id=$1", [userId])
    ]);
    const job = jobResult.rows[0];
    if (!job) return null;
    const description = String(jobDescription || job.descriptionText || "").trim();
    if (!description) throw new Error("A complete job description is required for trust analysis.");
    const reasons: string[] = Array.isArray(job.reasons)
      ? job.reasons.map((reason: unknown) => String(reason))
      : [];
    const analysis = buildTrustAnalysis({
      score: Number(job.score || 0),
      jobDescription: description,
      careerFacts: approvedProductFacts(userId, truthResult.rows[0]?.facts),
      policyConflicts: reasons.filter((reason) => /conflict|blocked|required|authorization/i.test(reason)),
      structuralFindings: ["Resume content must remain traceable to approved career facts."]
    });
    const saved = await client.query(
      `INSERT INTO product_job_insights
         (user_id, job_match_id, match_explanation, ats_gap_report, updated_at)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,now())
       ON CONFLICT (user_id, job_match_id) DO UPDATE SET
         match_explanation=excluded.match_explanation,
         ats_gap_report=excluded.ats_gap_report,
         updated_at=now()
       RETURNING job_match_id AS "jobMatchId", match_explanation AS "matchExplanation",
                 ats_gap_report AS "atsGapReport", updated_at AS "updatedAt"`,
      [userId, jobMatchId, JSON.stringify(analysis.match), JSON.stringify(analysis.ats)]
    );
    await client.query(
      `UPDATE product_job_matches SET description_text=$3, updated_at=now()
        WHERE user_id=$1 AND id=$2`,
      [userId, jobMatchId, description]
    );
    return saved.rows[0];
  }, db);
}

export async function productJobMatchExists(
  db: pg.Pool,
  userId: string,
  jobMatchId: string
): Promise<boolean> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      "SELECT 1 FROM product_job_matches WHERE user_id=$1 AND id=$2",
      [userId, jobMatchId]
    );
    return Boolean(result.rows[0]);
  }, db);
}

export async function recordProductRecommendationFeedback(
  db: pg.Pool,
  userId: string,
  jobMatchId: string,
  reason: string,
  note?: string
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const match = await client.query(
      "SELECT id FROM product_job_matches WHERE user_id=$1 AND id=$2",
      [userId, jobMatchId]
    );
    if (!match.rows[0]) return null;
    const result = await client.query(
      `INSERT INTO product_recommendation_feedback
         (user_id, job_match_id, reason, note, updated_at)
       VALUES ($1,$2,$3,$4,now())
       ON CONFLICT (user_id, job_match_id) DO UPDATE SET
         reason=excluded.reason, note=excluded.note, updated_at=now()
       RETURNING id, job_match_id AS "jobMatchId", reason, note,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [userId, jobMatchId, reason, note?.trim() || null]
    );
    await client.query(
      `UPDATE product_job_matches SET status='rejected', updated_at=now()
        WHERE user_id=$1 AND id=$2`,
      [userId, jobMatchId]
    );
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'recommendation.rejected','job_match',$2,$3::jsonb)`,
      [userId, jobMatchId, JSON.stringify({ reason })]
    );
    return result.rows[0];
  }, db);
}

export async function getProductJobInsight(
  db: pg.Pool,
  userId: string,
  jobMatchId: string
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT job_match_id AS "jobMatchId", match_explanation AS "matchExplanation",
              ats_gap_report AS "atsGapReport", updated_at AS "updatedAt"
         FROM product_job_insights WHERE user_id=$1 AND job_match_id=$2`,
      [userId, jobMatchId]
    );
    return result.rows[0] || null;
  }, db);
}

export async function listProductApplicationPackages(db: pg.Pool, userId: string): Promise<unknown[]> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT p.id, p.job_match_id AS "jobMatchId", p.resume_id AS "resumeId",
              p.source_resume_version AS "sourceResumeVersion", p.status,
              p.customer_answers AS "customerAnswers", p.output,
              p.evidence_fact_ids AS "evidenceFactIds",
              p.missing_information_flags AS "missingInformationFlags",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              j.title, j.company, j.source, j.job_url AS "jobUrl"
         FROM product_application_packages p
         JOIN product_job_matches j ON j.user_id=p.user_id AND j.id=p.job_match_id
        WHERE p.user_id=$1 ORDER BY p.updated_at DESC LIMIT 50`,
      [userId]
    );
    return result.rows;
  }, db);
}

export async function getProductApplicationPackage(
  db: pg.Pool,
  userId: string,
  packageId: string
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT p.id, p.job_match_id AS "jobMatchId", p.resume_id AS "resumeId",
              p.source_resume_version AS "sourceResumeVersion", p.status,
              p.customer_answers AS "customerAnswers", p.output,
              p.evidence_fact_ids AS "evidenceFactIds",
              p.missing_information_flags AS "missingInformationFlags",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt",
              j.title, j.company, j.source, j.job_url AS "jobUrl"
         FROM product_application_packages p
         JOIN product_job_matches j ON j.user_id=p.user_id AND j.id=p.job_match_id
        WHERE p.user_id=$1 AND p.id=$2`,
      [userId, packageId]
    );
    return result.rows[0] || null;
  }, db);
}

export async function updateProductApplicationPackage(
  db: pg.Pool,
  userId: string,
  packageId: string,
  input: { resumeSummary: string; coverLetter: string; recruiterFollowUp: string }
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const existingResult = await client.query(
      `SELECT p.id, p.job_match_id AS "jobMatchId", p.resume_id AS "resumeId",
              p.source_resume_version AS "sourceResumeVersion", p.status,
              p.output, j.title, j.company, j.source, j.job_url AS "jobUrl",
              a.id AS "applicationId"
         FROM product_application_packages p
         JOIN product_job_matches j ON j.user_id=p.user_id AND j.id=p.job_match_id
         LEFT JOIN product_applications a
           ON a.user_id=p.user_id AND a.job_match_id=p.job_match_id
        WHERE p.user_id=$1 AND p.id=$2
        FOR UPDATE OF p`,
      [userId, packageId]
    );
    const existing = existingResult.rows[0];
    if (!existing) return null;
    if (!["package_ready", "approval_required"].includes(existing.status)) {
      throw new Error("Only packages awaiting review can be edited.");
    }
    const currentOutput = existing.output && typeof existing.output === "object"
      ? existing.output as Record<string, unknown>
      : {};
    const currentFocus = currentOutput.resumeFocus && typeof currentOutput.resumeFocus === "object"
      ? currentOutput.resumeFocus as Record<string, unknown>
      : {};
    const updatedOutput = {
      ...currentOutput,
      status: "approval_required",
      resumeFocus: { ...currentFocus, summary: input.resumeSummary.trim() },
      coverLetter: input.coverLetter.trim(),
      recruiterFollowUp: input.recruiterFollowUp.trim(),
      customerEditedAt: new Date().toISOString(),
      truthGuard: "Customer-edited package content is separate from Career Truth and requires review before use."
    };
    const updated = await client.query(
      `UPDATE product_application_packages
          SET status='approval_required', output=$3::jsonb, updated_at=now()
        WHERE user_id=$1 AND id=$2
        RETURNING id, job_match_id AS "jobMatchId", resume_id AS "resumeId",
                  source_resume_version AS "sourceResumeVersion", status,
                  customer_answers AS "customerAnswers", output,
                  evidence_fact_ids AS "evidenceFactIds",
                  missing_information_flags AS "missingInformationFlags",
                  created_at AS "createdAt", updated_at AS "updatedAt"`,
      [userId, packageId, JSON.stringify(updatedOutput)]
    );
    if (existing.applicationId) {
      await client.query(
        `UPDATE product_applications SET status='needs_approval', updated_at=now()
          WHERE user_id=$1 AND id=$2`,
        [userId, existing.applicationId]
      );
    }
    if (existing.status !== "approval_required") {
      await client.query(
        `INSERT INTO product_approval_requests
           (user_id, job_match_id, action, reason, payload)
         SELECT $1,$2,'application.package_review','Review the edited tailored package before using it',$3::jsonb
          WHERE NOT EXISTS (
            SELECT 1 FROM product_approval_requests
             WHERE user_id=$1 AND job_match_id=$2
               AND action='application.package_review' AND status='pending'
          )`,
        [userId, existing.jobMatchId, JSON.stringify({ packageId, applicationId: existing.applicationId || null })]
      );
    }
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'application.package_edited','application_package',$2,$3::jsonb)`,
      [userId, packageId, JSON.stringify({ jobMatchId: existing.jobMatchId, sourceResumeVersion: existing.sourceResumeVersion })]
    );
    return {
      ...updated.rows[0],
      title: existing.title,
      company: existing.company,
      source: existing.source,
      jobUrl: existing.jobUrl,
      applicationId: existing.applicationId || null
    };
  }, db);
}

export async function createProductApplicationPackage(
  db: pg.Pool,
  userId: string,
  jobMatchId: string,
  input: { interest: string; emphasis: string; avoid?: string }
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const [jobResult, onboardingResult, resumeResult, truthResult, insightResult, policyResult, existingResult] = await Promise.all([
      client.query(
        `SELECT id, title, company, source, job_url AS "jobUrl", description_text AS "descriptionText",
                score, reasons, status
           FROM product_job_matches WHERE user_id=$1 AND id=$2`,
        [userId, jobMatchId]
      ),
      client.query(
        `SELECT completed, record FROM product_onboarding WHERE user_id=$1`,
        [userId]
      ),
      client.query(
        `SELECT id, sha256 FROM product_resumes
          WHERE user_id=$1 AND is_default=true ORDER BY created_at DESC LIMIT 1`,
        [userId]
      ),
      client.query("SELECT facts FROM product_career_truth_banks WHERE user_id=$1", [userId]),
      client.query(
        `SELECT match_explanation AS "matchExplanation", ats_gap_report AS "atsGapReport"
           FROM product_job_insights WHERE user_id=$1 AND job_match_id=$2`,
        [userId, jobMatchId]
      ),
      client.query("SELECT mode FROM product_automation_policies WHERE user_id=$1", [userId]),
      client.query(
        `SELECT id, job_match_id AS "jobMatchId", resume_id AS "resumeId",
                source_resume_version AS "sourceResumeVersion", status,
                customer_answers AS "customerAnswers", output,
                evidence_fact_ids AS "evidenceFactIds",
                missing_information_flags AS "missingInformationFlags",
                created_at AS "createdAt", updated_at AS "updatedAt"
           FROM product_application_packages WHERE user_id=$1 AND job_match_id=$2`,
        [userId, jobMatchId]
      )
    ]);
    const existing = existingResult.rows[0];
    if (existing) return existing;
    const job = jobResult.rows[0];
    if (!job) return null;
    if (job.status === "rejected") throw new Error("This opportunity is no longer available for preparation.");
    const onboarding = onboardingResult.rows[0];
    const record = onboarding?.record && typeof onboarding.record === "object"
      ? onboarding.record as Record<string, unknown>
      : {};
    const consent = record.consent && typeof record.consent === "object"
      ? record.consent as Record<string, unknown>
      : {};
    if (onboarding?.completed !== true || consent.truthConfirmed !== true) {
      throw new Error("Complete and confirm your profile before creating a tailored package.");
    }
    const resume = resumeResult.rows[0];
    if (!resume) throw new Error("Choose a default resume before creating a tailored package.");
    const approvedFacts = approvedProductFacts(userId, truthResult.rows[0]?.facts);
    if (!approvedFacts.length) throw new Error("Approve at least one career fact before creating a tailored package.");
    const insight = insightResult.rows[0];
    if (!insight) throw new Error("Run the fit analysis before creating a tailored package.");
    const description = String(job.descriptionText || "").trim();
    if (!description) throw new Error("A complete job description is required before creating a tailored package.");
    const packageStatus = policyResult.rows[0]?.mode === "assist" ? "package_ready" : "approval_required";
    const applicationStatus = packageStatus === "approval_required" ? "needs_approval" : "package_ready";
    const output = buildTailoredApplicationPackage({
      jobMatchId,
      title: job.title,
      company: job.company,
      jobUrl: job.jobUrl,
      description,
      sourceResumeId: resume.id,
      sourceResumeVersion: resume.sha256,
      match: insight.matchExplanation,
      ats: insight.atsGapReport,
      approvedFacts,
      interest: input.interest,
      emphasis: input.emphasis,
      avoid: input.avoid
    });
    const customerAnswers = {
      interest: input.interest.trim(),
      emphasis: input.emphasis.trim(),
      avoid: input.avoid?.trim() || ""
    };
    const saved = await client.query(
      `INSERT INTO product_application_packages
         (user_id, job_match_id, resume_id, source_resume_version, status,
          customer_answers, output, evidence_fact_ids, missing_information_flags)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb)
       RETURNING id, job_match_id AS "jobMatchId", resume_id AS "resumeId",
                 source_resume_version AS "sourceResumeVersion", status,
                 customer_answers AS "customerAnswers", output,
                 evidence_fact_ids AS "evidenceFactIds",
                 missing_information_flags AS "missingInformationFlags",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        userId, jobMatchId, resume.id, resume.sha256, packageStatus,
        JSON.stringify(customerAnswers), JSON.stringify({ ...output, status: packageStatus }),
        JSON.stringify(output.resumeFocus.evidenceFactIds),
        JSON.stringify(output.missingInformationFlags)
      ]
    );
    const packageRecord = saved.rows[0];
    const application = await client.query(
      `INSERT INTO product_applications (user_id, job_match_id, resume_id, status, answers)
       VALUES ($1,$2,$3,$4,$5::jsonb)
       ON CONFLICT (user_id, job_match_id) DO UPDATE SET
         resume_id=COALESCE(product_applications.resume_id, excluded.resume_id),
         status=CASE WHEN product_applications.status IN
           ('submitted_verified','submitted_unverified','submission_attempted','withdrawn')
           THEN product_applications.status ELSE excluded.status END,
         answers=excluded.answers, updated_at=now()
       RETURNING id`,
      [userId, jobMatchId, resume.id, applicationStatus, JSON.stringify({ packageId: packageRecord.id })]
    );
    await client.query(
      `UPDATE product_job_matches SET status='package_ready', updated_at=now()
        WHERE user_id=$1 AND id=$2`,
      [userId, jobMatchId]
    );
    if (packageStatus === "approval_required") {
      await client.query(
        `INSERT INTO product_approval_requests
           (user_id, job_match_id, action, reason, payload)
         VALUES ($1,$2,'application.package_review','Review the tailored package before using it',$3::jsonb)`,
        [userId, jobMatchId, JSON.stringify({ packageId: packageRecord.id, applicationId: application.rows[0]?.id || null })]
      );
    }
    await client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1,$1,'application.package_created','application_package',$2,$3::jsonb)`,
      [userId, packageRecord.id, JSON.stringify({
        jobMatchId,
        resumeId: resume.id,
        sourceResumeVersion: resume.sha256,
        evidenceFactIds: output.resumeFocus.evidenceFactIds,
        status: packageStatus
      })]
    );
    return {
      ...packageRecord,
      title: job.title,
      company: job.company,
      source: job.source,
      jobUrl: job.jobUrl,
      applicationId: application.rows[0]?.id || null
    };
  }, db);
}

export async function createProductInterviewPrep(
  db: pg.Pool,
  userId: string,
  jobMatchId: string
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const [jobResult, truthResult, applicationResult] = await Promise.all([
      client.query("SELECT id, title, company FROM product_job_matches WHERE user_id=$1 AND id=$2", [userId, jobMatchId]),
      client.query("SELECT facts FROM product_career_truth_banks WHERE user_id=$1", [userId]),
      client.query(
        "SELECT id FROM product_applications WHERE user_id=$1 AND job_match_id=$2 ORDER BY created_at DESC LIMIT 1",
        [userId, jobMatchId]
      )
    ]);
    const job = jobResult.rows[0];
    if (!job) return null;
    const questions = buildGroundedInterviewQuestions({
      title: job.title,
      company: job.company,
      careerFacts: approvedProductFacts(userId, truthResult.rows[0]?.facts)
    });
    const result = await client.query(
      `INSERT INTO product_interview_prep_sessions
         (user_id, job_match_id, application_id, questions)
       VALUES ($1,$2,$3,$4::jsonb)
       RETURNING id, job_match_id AS "jobMatchId", application_id AS "applicationId",
                 status, questions, rehearsal, created_at AS "createdAt", updated_at AS "updatedAt"`,
      [userId, jobMatchId, applicationResult.rows[0]?.id || null, JSON.stringify(questions)]
    );
    return result.rows[0];
  }, db);
}

export async function listProductInterviewPrep(db: pg.Pool, userId: string): Promise<unknown[]> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT s.id, s.job_match_id AS "jobMatchId", s.application_id AS "applicationId",
              s.status, s.questions, s.rehearsal, s.created_at AS "createdAt",
              s.updated_at AS "updatedAt", j.title, j.company
         FROM product_interview_prep_sessions s
         JOIN product_job_matches j ON j.id=s.job_match_id
        WHERE s.user_id=$1 ORDER BY s.updated_at DESC`,
      [userId]
    );
    return result.rows;
  }, db);
}

export async function recordProductOutcome(
  db: pg.Pool,
  userId: string,
  applicationId: string,
  outcomeType: OutcomeType,
  metadata: Record<string, unknown>
): Promise<unknown | null> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `INSERT INTO product_outcome_events (user_id, application_id, outcome_type, metadata)
       SELECT $1, id, $3, $4::jsonb
         FROM product_applications WHERE user_id=$1 AND id=$2
       RETURNING id, application_id AS "applicationId", outcome_type AS "outcomeType",
                 metadata, occurred_at AS "occurredAt"`,
      [userId, applicationId, outcomeType, JSON.stringify(metadata)]
    );
    return result.rows[0] || null;
  }, db);
}

export async function productApplicationTimeline(
  db: pg.Pool,
  userId: string,
  applicationId: string
): Promise<unknown[] | null> {
  return withTenant(userId, async (client) => {
    const application = await client.query(
      `SELECT id, status, final_url AS "finalUrl", evidence_reference AS "evidenceReference",
              verified_at AS "verifiedAt", created_at AS "createdAt", updated_at AS "updatedAt"
         FROM product_applications WHERE user_id=$1 AND id=$2`,
      [userId, applicationId]
    );
    if (!application.rows[0]) return null;
    const [evidence, outcomes] = await Promise.all([
      client.query(
        `SELECT id, evidence_type AS "evidenceType", filename, sha256,
                captured_at AS "capturedAt", provenance
           FROM product_application_evidence
          WHERE user_id=$1 AND application_id=$2 ORDER BY captured_at`,
        [userId, applicationId]
      ),
      client.query(
        `SELECT id, outcome_type AS "outcomeType", metadata, occurred_at AS "occurredAt"
           FROM product_outcome_events
          WHERE user_id=$1 AND application_id=$2 ORDER BY occurred_at`,
        [userId, applicationId]
      )
    ]);
    const row = application.rows[0];
    const events = [
      {
        id: `application:${applicationId}:created`,
        applicationId,
        eventType: "application_created",
        actorType: "system",
        metadata: { status: row.status },
        occurredAt: row.createdAt
      },
      ...evidence.rows.map((item) => ({
        id: item.id,
        applicationId,
        eventType: "evidence_stored",
        actorType: "runner",
        metadata: item,
        occurredAt: item.capturedAt
      })),
      ...outcomes.rows.map((item) => ({
        id: item.id,
        applicationId,
        eventType: "outcome_recorded",
        actorType: "user",
        metadata: { outcomeType: item.outcomeType, ...item.metadata },
        occurredAt: item.occurredAt
      }))
    ];
    if (row.verifiedAt) {
      events.push({
        id: `application:${applicationId}:verified`,
        applicationId,
        eventType: "proof_captured",
        actorType: "system",
        metadata: { finalUrl: row.finalUrl, evidenceReference: row.evidenceReference },
        occurredAt: row.verifiedAt
      });
    }
    return events.sort((left, right) => String(left.occurredAt).localeCompare(String(right.occurredAt)));
  }, db);
}

export async function productConversionAnalytics(db: pg.Pool, userId: string): Promise<Record<string, number>> {
  return withTenant(userId, async (client) => {
    const result = await client.query(
      `SELECT
         (SELECT count(*) FROM product_job_matches WHERE user_id=$1 AND score >= 70)::integer AS "qualifiedMatches",
         (SELECT count(*) FROM product_applications WHERE user_id=$1 AND status='submitted_verified')::integer AS "verifiedApplications",
         (SELECT count(*) FROM product_outcome_events WHERE user_id=$1 AND outcome_type='recruiter_reply')::integer AS "recruiterReplies",
         (SELECT count(*) FROM product_outcome_events WHERE user_id=$1 AND outcome_type='interview')::integer AS interviews,
         (SELECT count(*) FROM product_outcome_events WHERE user_id=$1 AND outcome_type='offer')::integer AS offers`,
      [userId]
    );
    return result.rows[0];
  }, db);
}
