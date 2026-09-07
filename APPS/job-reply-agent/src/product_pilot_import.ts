import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import YAML from "yaml";
import { createProductPool, withTenant } from "./product_db.js";
import {
  assertPrivateStorageOwnership,
  assertResumeStorageOwnership,
  buildProofStorageKey,
  buildResumeStorageKey,
  createProductObjectStorage
} from "./product_object_storage.js";
import {
  saveCareerTruthBank,
  saveProductOnboarding,
  saveProductResume
} from "./product_repository.js";
import {
  ensureConnectorCapabilities,
  recordConsentSnapshot,
  saveAutomationPolicy
} from "./product_public_beta_repository.js";

const IMPORT_VERSION = "fejiro-pilot-v1";
const MAX_PRIVATE_FILE_BYTES = 5 * 1024 * 1024;

interface LegacyAttemptRow {
  attempt_id: number;
  job_id: number;
  adapter: string | null;
  status: string;
  final_url: string | null;
  screenshot_path: string | null;
  submitted_at: string | null;
  attempt_created_at: string;
  attempt_updated_at: string;
  resume_artifact_path: string | null;
  answered_fields_json: string | null;
  title: string;
  company: string;
  location: string | null;
  source: string | null;
  source_url: string | null;
  apply_url: string | null;
  score: number | null;
  job_created_at: string;
}

interface ImportFile {
  path: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  isDefault?: boolean;
}

interface PlannedApplication {
  legacyAttemptId: number;
  legacyJobId: number;
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  jobUrl: string;
  score: number;
  finalUrl: string;
  capturedAt: string;
  status: "submitted_verified" | "submitted_unverified";
  resume: ImportFile;
  evidence: ImportFile | null;
  answers: Record<string, unknown>;
}

export interface PilotImportPlan {
  version: string;
  generatedAt: string;
  targetEmail: string;
  identityMatched: boolean;
  onboarding: {
    completed: false;
    reviewFlags: string[];
    record: Record<string, unknown>;
  };
  facts: Array<{
    id: string;
    category: string;
    statement: string;
    verificationStatus: "approved";
    provenance: Record<string, unknown>;
  }>;
  resumes: ImportFile[];
  applications: PlannedApplication[];
  counts: {
    approvedFacts: number;
    excludedUnverifiedFacts: number;
    uniqueResumes: number;
    legacyVerifiedAttempts: number;
    importableApplications: number;
    submittedVerified: number;
    submittedUnverified: number;
    skippedMissingResume: number;
    skippedInvalidUrl: number;
  };
  excludedSecrets: string[];
  sourceChecksums: Record<string, string>;
}

function option(name: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || "";
}

function readYaml(file: string): any {
  return YAML.parse(fs.readFileSync(file, "utf8"));
}

function fileSha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function validHttpUrl(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    try {
      const url = new URL(String(value || "").trim());
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

function dateValue(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const parsed = new Date(String(value || ""));
    if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function normalizeSource(source: string | null, adapter: string | null): string {
  const value = `${source || ""} ${adapter || ""}`.toLowerCase();
  if (value.includes("linkedin")) return "linkedin";
  if (value.includes("indeed")) return "indeed";
  if (value.includes("dice")) return "dice";
  if (value.includes("monster")) return "monster";
  if (value.includes("gmail")) return "gmail";
  return "legacy";
}

function fileMimeType(file: string): string | null {
  const extension = path.extname(file).toLowerCase();
  if (extension === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".json") return "application/json";
  if (extension === ".eml") return "message/rfc822";
  return null;
}

function importFile(file: string, allowedMimeTypes: Set<string>): ImportFile | null {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  const mimeType = fileMimeType(resolved);
  const byteSize = fs.statSync(resolved).size;
  if (!mimeType || !allowedMimeTypes.has(mimeType)
      || byteSize < 1 || byteSize > MAX_PRIVATE_FILE_BYTES) return null;
  return {
    path: resolved,
    filename: path.basename(resolved),
    mimeType,
    byteSize,
    sha256: fileSha256(resolved)
  };
}

function parseAnswers(value: string | null): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || "{}");
    if (Array.isArray(parsed)) return { fields: parsed };
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function deterministicFactId(statement: string): string {
  return `fact_${crypto.createHash("sha256").update(statement).digest("hex").slice(0, 24)}`;
}

function uniqueFiles(files: ImportFile[]): ImportFile[] {
  const byHash = new Map<string, ImportFile>();
  for (const file of files) {
    const existing = byHash.get(file.sha256);
    if (!existing || file.isDefault) byHash.set(file.sha256, file);
  }
  return [...byHash.values()];
}

export function mapLegacyApplication(
  row: LegacyAttemptRow,
  resume: ImportFile | null,
  evidence: ImportFile | null
): PlannedApplication | null {
  const finalUrl = validHttpUrl(row.final_url);
  const jobUrl = validHttpUrl(row.apply_url, row.source_url, row.final_url);
  if (!resume || !finalUrl || !jobUrl) return null;
  const source = normalizeSource(row.source, row.adapter);
  return {
    legacyAttemptId: row.attempt_id,
    legacyJobId: row.job_id,
    source,
    externalId: `legacy-${row.job_id}`,
    title: String(row.title || "").trim(),
    company: String(row.company || "").trim(),
    location: row.location ? String(row.location).trim() : null,
    jobUrl,
    score: Math.max(0, Math.min(100, Math.round(Number(row.score || 0)))),
    finalUrl,
    capturedAt: dateValue(row.submitted_at, row.attempt_updated_at, row.attempt_created_at),
    status: evidence ? "submitted_verified" : "submitted_unverified",
    resume,
    evidence,
    answers: parseAnswers(row.answered_fields_json)
  };
}

export function buildPilotImportPlan(input: {
  profileRoot: string;
  legacyRoot: string;
  targetEmail: string;
}): PilotImportPlan {
  const profileFile = path.resolve(input.profileRoot, "config", "profile.yaml");
  const truthFile = path.resolve(input.profileRoot, "config", "profile_truth_bank.yaml");
  const rulesFile = path.resolve(input.profileRoot, "config", "rules.yaml");
  const databaseFile = path.resolve(input.legacyRoot, "data", "job_leads.sqlite");
  for (const file of [profileFile, truthFile, rulesFile, databaseFile]) {
    if (!fs.existsSync(file)) throw new Error(`Pilot import source is missing: ${file}`);
  }

  const profile = readYaml(profileFile);
  const truth = readYaml(truthFile);
  const rules = readYaml(rulesFile);
  const sourceEmail = normalizeEmail(profile?.contact?.email);
  const targetEmail = normalizeEmail(input.targetEmail);
  if (!sourceEmail || sourceEmail !== targetEmail) {
    throw new Error("Pilot profile email does not match the target account.");
  }

  const approvedFacts = (truth?.experience_pool || [])
    .filter((fact: any) => fact?.verified === true && String(fact?.text || "").trim())
    .map((fact: any) => ({
      id: deterministicFactId(String(fact.text)),
      category: "experience",
      statement: String(fact.text).trim(),
      verificationStatus: "approved" as const,
      provenance: {
        source: String(fact.source || "profile_truth_bank"),
        employer: fact.employer || null,
        tags: Array.isArray(fact.tags) ? fact.tags : [],
        confidence: Number(fact.confidence || 100),
        importedBy: IMPORT_VERSION
      }
    }));
  const excludedUnverifiedFacts = (truth?.experience_pool || [])
    .filter((fact: any) => fact?.verified !== true).length;

  const resumeMimes = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]);
  const evidenceMimes = new Set([
    "image/png",
    "image/jpeg",
    "application/pdf",
    "application/json",
    "message/rfc822"
  ]);
  const templatePaths = [
    rules?.resume_tailoring?.business_analysis_template_path,
    rules?.resume_tailoring?.it_management_template_path
  ].filter(Boolean).map(String);
  const templateFiles: ImportFile[] = templatePaths.flatMap((file, index) => {
    const planned = importFile(file, resumeMimes);
    return planned ? [{ ...planned, isDefault: index === 0 }] : [];
  });

  const database = new Database(databaseFile, { readonly: true, fileMustExist: true });
  let attempts: LegacyAttemptRow[];
  try {
    attempts = database.prepare(
      `SELECT a.id AS attempt_id, a.job_id, a.adapter, a.status, a.final_url,
              a.screenshot_path, a.submitted_at,
              a.created_at AS attempt_created_at, a.updated_at AS attempt_updated_at,
              a.resume_artifact_path, a.answered_fields_json,
              j.title, j.company, j.location, j.source, j.source_url, j.apply_url,
              j.score, j.created_at AS job_created_at
         FROM application_attempts a
         JOIN hunt_jobs j ON j.id=a.job_id
        WHERE a.status='submitted_verified'
        ORDER BY a.updated_at, a.id`
    ).all() as LegacyAttemptRow[];
  } finally {
    database.close();
  }

  const applications: PlannedApplication[] = [];
  let skippedMissingResume = 0;
  let skippedInvalidUrl = 0;
  for (const row of attempts) {
    const resume = row.resume_artifact_path
      ? importFile(row.resume_artifact_path, resumeMimes)
      : null;
    const evidence = row.screenshot_path
      ? importFile(row.screenshot_path, evidenceMimes)
      : null;
    if (!resume) {
      skippedMissingResume += 1;
      continue;
    }
    if (!validHttpUrl(row.final_url)
        || !validHttpUrl(row.apply_url, row.source_url, row.final_url)) {
      skippedInvalidUrl += 1;
      continue;
    }
    const application = mapLegacyApplication(row, resume, evidence);
    if (application) applications.push(application);
  }

  const allResumes = uniqueFiles([
    ...templateFiles,
    ...applications.map((application) => application.resume)
  ]);
  const defaultSha = templateFiles.find((file) => file.isDefault)?.sha256;
  for (const resume of allResumes) resume.isDefault = resume.sha256 === defaultSha;

  return {
    version: IMPORT_VERSION,
    generatedAt: new Date().toISOString(),
    targetEmail,
    identityMatched: true,
    onboarding: {
      completed: false,
      reviewFlags: [
        "confirm_compensation_floor",
        "confirm_work_modes_and_locations",
        "accept_current_public_beta_consent"
      ],
      record: {
        fullName: String(profile.name || "").trim(),
        phone: String(profile?.contact?.phone || "").trim(),
        location: String(profile.location || "").trim(),
        linkedIn: String(profile?.contact?.linkedin || "").trim(),
        targetTitles: Array.isArray(profile.target_titles) ? profile.target_titles : [],
        excludedTitles: [],
        locations: [String(profile.location || "").trim(), "Remote - Canada"],
        workModes: ["remote", "hybrid", "onsite"],
        employmentTypes: ["permanent", "contract"],
        compensationFloor: "Review required before use",
        workAuthorization: String(profile.work_authorization_note || "").trim(),
        sponsorshipRequired: false,
        timeZone: String(rules?.automation?.timezone || "America/Toronto"),
        consent: {
          truthConfirmed: true,
          recruiterDrafts: true,
          recruiterSends: false,
          assistedApplications: true,
          controlledSubmissions: false
        },
        importReviewRequired: true,
        importedBy: IMPORT_VERSION
      }
    },
    facts: approvedFacts,
    resumes: allResumes,
    applications,
    counts: {
      approvedFacts: approvedFacts.length,
      excludedUnverifiedFacts,
      uniqueResumes: allResumes.length,
      legacyVerifiedAttempts: attempts.length,
      importableApplications: applications.length,
      submittedVerified: applications.filter((item) => item.status === "submitted_verified").length,
      submittedUnverified: applications.filter((item) => item.status === "submitted_unverified").length,
      skippedMissingResume,
      skippedInvalidUrl
    },
    excludedSecrets: [
      ".env files",
      "Gmail OAuth tokens and authorization states",
      "browser profiles and cookies",
      "job-board sessions",
      "raw mailbox bodies"
    ],
    sourceChecksums: {
      profile: fileSha256(profileFile),
      truthBank: fileSha256(truthFile),
      rules: fileSha256(rulesFile),
      legacyDatabase: fileSha256(databaseFile)
    }
  };
}

async function applyPilotImport(plan: PilotImportPlan): Promise<Record<string, number>> {
  if (process.env.PILOT_IMPORT_APPLY !== "true") {
    throw new Error("Set PILOT_IMPORT_APPLY=true as well as --apply to mutate the product database.");
  }
  const connectionString = String(
    process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL || ""
  ).trim();
  if (!connectionString) throw new Error("MIGRATION_DATABASE_URL is required for import.");
  const db = createProductPool(connectionString);
  const storage = createProductObjectStorage();
  await storage.assertReady();
  try {
    const user = await db.query(
      "SELECT id, email FROM product_users WHERE email=$1 AND status <> 'deleted'",
      [plan.targetEmail]
    );
    const userId = user.rows[0]?.id;
    if (!userId || normalizeEmail(user.rows[0].email) !== plan.targetEmail) {
      throw new Error("The exact target product account was not found.");
    }

    const importState = await withTenant(userId, async (client) => {
      const marker = await client.query(
        `SELECT 1 FROM product_audit_logs
          WHERE user_id=$1 AND action='pilot.imported'
            AND metadata->>'version'=$2 LIMIT 1`,
        [userId, IMPORT_VERSION]
      );
      const onboarding = await client.query(
        "SELECT record FROM product_onboarding WHERE user_id=$1",
        [userId]
      );
      const truth = await client.query(
        "SELECT facts FROM product_career_truth_banks WHERE user_id=$1",
        [userId]
      );
      const consent = await client.query(
        `SELECT 1 FROM product_consent_grants
          WHERE user_id=$1 AND policy_snapshot->>'importedBy'=$2 LIMIT 1`,
        [userId, IMPORT_VERSION]
      );
      const resumes = await client.query(
        `SELECT id, sha256 FROM product_resumes WHERE user_id=$1`,
        [userId]
      );
      const evidence = await client.query(
        `SELECT sha256 FROM product_application_evidence WHERE user_id=$1`,
        [userId]
      );
      return {
        completed: Boolean(marker.rowCount),
        onboardingImported: onboarding.rows[0]?.record?.importedBy === IMPORT_VERSION,
        truthImported: Array.isArray(truth.rows[0]?.facts)
          && truth.rows[0].facts.some((fact: any) => fact?.provenance?.importedBy === IMPORT_VERSION),
        consentImported: Boolean(consent.rowCount),
        resumes: new Map(resumes.rows.map((row) => [row.sha256, row.id])),
        evidence: new Set(evidence.rows.map((row) => row.sha256))
      };
    }, db);
    if (importState.completed) {
      return {
        facts: plan.counts.approvedFacts,
        resumes: plan.counts.uniqueResumes,
        applications: plan.counts.importableApplications,
        evidence: plan.counts.submittedVerified
      };
    }

    if (!importState.onboardingImported) {
      await saveProductOnboarding(db, userId, {
        record: plan.onboarding.record,
        completed: false,
        consentVersion: null,
        consentedAt: null
      });
    }
    const policy = await saveAutomationPolicy(db, userId, {
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
      timeZone: String(plan.onboarding.record.timeZone || "America/Toronto")
    });
    if (!importState.consentImported) {
      await recordConsentSnapshot(db, userId, {
        career_truth: true,
        recruiter_drafts: true,
        recruiter_sends: false,
        assisted_applications: true,
        controlled_submissions: false,
        google_data: false
      }, {
        ...policy as unknown as Record<string, unknown>,
        importedBy: IMPORT_VERSION,
        pendingHostedReview: true
      });
    }
    await ensureConnectorCapabilities(db, userId);
    if (!importState.truthImported) await saveCareerTruthBank(db, userId, plan.facts);

    const resumeIds = importState.resumes;
    for (const resume of plan.resumes) {
      if (resumeIds.has(resume.sha256)) continue;
      const key = buildResumeStorageKey(userId, resume.sha256);
      assertResumeStorageOwnership(userId, key);
      await storage.putObject({
        key,
        content: await fsp.readFile(resume.path),
        mimeType: resume.mimeType,
        filename: resume.filename
      });
      const saved: any = await saveProductResume(db, userId, {
        filename: resume.filename,
        mimeType: resume.mimeType,
        byteSize: resume.byteSize,
        sha256: resume.sha256,
        storageKey: key,
        storageDriver: storage.driver,
        isDefault: Boolean(resume.isDefault)
      });
      resumeIds.set(resume.sha256, saved.id);
    }

    let evidenceCount = 0;
    for (const application of plan.applications) {
      let evidenceKey: string | null = null;
      if (application.evidence) {
        evidenceKey = buildProofStorageKey(userId, application.evidence.sha256);
        assertPrivateStorageOwnership(userId, evidenceKey);
        if (!importState.evidence.has(application.evidence.sha256)) {
          await storage.putObject({
            key: evidenceKey,
            content: await fsp.readFile(application.evidence.path),
            mimeType: application.evidence.mimeType,
            filename: application.evidence.filename
          });
        }
      }
      await withTenant(userId, async (client) => {
        const job = await client.query(
          `INSERT INTO product_job_matches
             (user_id, source, external_id, title, company, location, job_url,
              score, status, reasons, discovered_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'package_ready',$9::jsonb,$10,now())
           ON CONFLICT (user_id, source, external_id) DO UPDATE SET
             title=excluded.title, company=excluded.company, location=excluded.location,
             job_url=excluded.job_url, score=excluded.score, updated_at=now()
           RETURNING id`,
          [
            userId,
            application.source,
            application.externalId,
            application.title,
            application.company,
            application.location,
            application.jobUrl,
            application.score,
            JSON.stringify([{ type: "legacy_import", version: IMPORT_VERSION }]),
            application.capturedAt
          ]
        );
        const resumeId = resumeIds.get(application.resume.sha256);
        if (!resumeId) throw new Error("Imported application resume was not stored.");
        const imported = await client.query(
          `INSERT INTO product_applications
             (user_id, job_match_id, resume_id, status, final_url,
              evidence_reference, answers, verified_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$9)
           ON CONFLICT (user_id, job_match_id) DO UPDATE SET
             resume_id=excluded.resume_id,
             status=CASE
               WHEN product_applications.status='submitted_verified'
                 THEN product_applications.status
               ELSE excluded.status
             END,
             final_url=excluded.final_url,
             evidence_reference=COALESCE(
               product_applications.evidence_reference,
               excluded.evidence_reference
             ),
             answers=excluded.answers,
             verified_at=COALESCE(product_applications.verified_at, excluded.verified_at),
             updated_at=now()
           RETURNING id`,
          [
            userId,
            job.rows[0].id,
            resumeId,
            application.status,
            application.finalUrl,
            application.evidence ? `private:${application.evidence.sha256}` : null,
            JSON.stringify(application.answers),
            application.status === "submitted_verified" ? application.capturedAt : null,
            application.capturedAt
          ]
        );
        if (application.evidence && evidenceKey) {
          await client.query(
            `INSERT INTO product_application_evidence
               (user_id, application_id, evidence_type, storage_key, mime_type,
                filename, sha256, captured_at, provenance)
             VALUES ($1,$2,'legacy_screenshot',$3,$4,$5,$6,$7,$8::jsonb)
             ON CONFLICT (user_id, application_id, sha256) DO NOTHING`,
            [
              userId,
              imported.rows[0].id,
              evidenceKey,
              application.evidence.mimeType,
              application.evidence.filename,
              application.evidence.sha256,
              application.capturedAt,
              JSON.stringify({
                importedBy: IMPORT_VERSION,
                legacyJobId: application.legacyJobId,
                legacyAttemptId: application.legacyAttemptId
              })
            ]
          );
          evidenceCount += 1;
        }
      }, db);
    }

    await withTenant(userId, (client) => client.query(
      `INSERT INTO product_audit_logs
         (user_id, actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1::uuid,$1::uuid,'pilot.imported','user',$1::uuid::text,$2::jsonb)`,
      [userId, JSON.stringify({
        version: IMPORT_VERSION,
        facts: plan.counts.approvedFacts,
        resumes: plan.counts.uniqueResumes,
        applications: plan.counts.importableApplications,
        evidence: evidenceCount,
        secretsImported: false
      })]
    ), db);
    return {
      facts: plan.counts.approvedFacts,
      resumes: plan.counts.uniqueResumes,
      applications: plan.counts.importableApplications,
      evidence: evidenceCount
    };
  } finally {
    await db.end();
  }
}

export async function runPilotImport(): Promise<void> {
  const targetEmail = normalizeEmail(option("email"));
  const profileRoot = path.resolve(option("profile-root") || process.cwd());
  const legacyRoot = path.resolve(option("legacy-root") || "");
  if (!targetEmail || !option("legacy-root")) {
    throw new Error("Use --email, --legacy-root, and optionally --profile-root.");
  }
  const plan = buildPilotImportPlan({ profileRoot, legacyRoot, targetEmail });
  const reportPath = path.resolve(
    option("report") || path.join(".local", `${targetEmail.split("@")[0]}-pilot-import.json`)
  );
  await fsp.mkdir(path.dirname(reportPath), { recursive: true });
  await fsp.writeFile(reportPath, `${JSON.stringify(plan, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });
  await fsp.chmod(reportPath, 0o600).catch(() => undefined);

  const applied = process.argv.includes("--apply") ? await applyPilotImport(plan) : null;
  console.log(JSON.stringify({
    dryRun: !applied,
    identityMatched: plan.identityMatched,
    counts: plan.counts,
    excludedSecrets: plan.excludedSecrets,
    reportPath,
    applied
  }));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  runPilotImport().catch((error) => {
    console.error(error instanceof Error ? error.message : "Pilot import failed.");
    process.exitCode = 1;
  });
}
