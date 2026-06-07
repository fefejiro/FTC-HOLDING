import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { writeCoverLetterArtifacts } from "../cover_letter.js";
import { logger } from "../logger.js";
import { tailorResumeForJD } from "../resume_tailor.js";

type PremiumAction =
  | "apply_candidate"
  | "review_external_high_fit"
  | "review_location_or_auth"
  | "review_previous_attempt"
  | "review_missing_artifact"
  | "skip_low_fit"
  | "skip_stale"
  | "skip_non_target"
  | "already_verified"
  | "needs_manual_review";

type QueueRow = {
  id: number;
  title: string;
  company: string;
  location: string;
  source: string;
  source_url: string;
  apply_url: string;
  description: string;
  status: string;
  score: number | null;
  tier: string | null;
  next_action: string | null;
  attempt_status: string | null;
  required_fields_json: string | null;
  answered_fields_json: string | null;
  pause_reason: string | null;
  resume_artifact_path: string | null;
  screenshot_path: string | null;
};

export type PremiumQueueItem = QueueRow & {
  action: PremiumAction;
  reason: string;
  dice_match_score: number | null;
  posted_age_days: number | null;
  easy_apply_evidence: boolean;
  rank_score: number;
};

export type PreparedPremiumArtifact = {
  jobId: number;
  title: string;
  company: string;
  action: PremiumAction;
  resumePath?: string;
  coverLetterPath?: string;
  reason: string;
};

export function buildPremiumQueueReport(
  db: Database.Database,
  opts: { sourceFilter?: string; limit?: number } = {}
): { generatedAt: string; totals: Record<PremiumAction, number>; rows: PremiumQueueItem[] } {
  const limit = Math.max(1, Math.min(opts.limit || 25, 200));
  const candidateLimit = Math.max(limit * 10, 100);
  const params: any[] = [];
  const where = [
    "j.status IN ('package_generated','apply_ready','needs_review','blocked_needs_auth','applied_verified','blocked')"
  ];
  if (opts.sourceFilter) {
    where.push("j.source = ?");
    params.push(opts.sourceFilter);
  }

  const rows = db
    .prepare(
      `SELECT j.id, j.title, j.company, j.location, j.source, j.source_url, j.apply_url, j.description,
              j.status, j.score, j.tier, j.next_action,
              a.status AS attempt_status, a.required_fields_json, a.answered_fields_json,
              a.pause_reason, a.resume_artifact_path, a.screenshot_path
       FROM hunt_jobs j
       LEFT JOIN application_attempts a ON a.job_id = j.id
       WHERE ${where.join(" AND ")}
       ORDER BY
         CASE WHEN j.status='applied_verified' THEN 1 ELSE 0 END,
         COALESCE(j.score, 0) DESC,
         j.updated_at DESC
       LIMIT ?`
    )
    .all(...params, candidateLimit) as QueueRow[];

  const items = rows.map(classifyPremiumQueueItem).sort((a, b) => b.rank_score - a.rank_score).slice(0, limit);
  const totals = items.reduce((acc, item) => {
    acc[item.action] = (acc[item.action] || 0) + 1;
    return acc;
  }, {} as Record<PremiumAction, number>);

  return {
    generatedAt: new Date().toISOString(),
    totals,
    rows: items
  };
}

export function writePremiumQueueReport(report: ReturnType<typeof buildPremiumQueueReport>): string {
  const dir = path.resolve(".local", "premium-queue");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `premium-queue-${report.generatedAt.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf8");
  return file;
}

export function printPremiumQueueReport(report: ReturnType<typeof buildPremiumQueueReport>): void {
  const lines: string[] = [];
  lines.push("");
  lines.push("=== PREMIUM JOB QUEUE ===");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Totals: ${JSON.stringify(report.totals)}`);
  lines.push("");

  for (const item of report.rows) {
    lines.push(`#${item.id} ${item.action.toUpperCase()} rank=${item.rank_score}`);
    lines.push(`  ${item.company} - ${item.title}`);
    lines.push(`  status=${item.status}/${item.attempt_status || "none"} tier=${item.tier || "?"} score=${item.score ?? "?"} dice_match=${item.dice_match_score ?? "?"}`);
    lines.push(`  reason=${item.reason}`);
    if (item.apply_url) lines.push(`  url=${item.apply_url}`);
    if (item.resume_artifact_path) lines.push(`  resume=${item.resume_artifact_path}`);
    if (item.screenshot_path) lines.push(`  proof=${item.screenshot_path}`);
    lines.push("");
  }

  logger.info(lines.join("\n"));
}

function classifyPremiumQueueItem(row: QueueRow): PremiumQueueItem {
  const evidence = parseDiceEvidence(row.description);
  const text = `${row.title}\n${row.company}\n${row.location}\n${row.description}\n${row.pause_reason || ""}`;
  const score = row.score || 0;
  const easyApplyEvidence = /easy\s+apply/i.test(text) || evidence.applyButton === "easy_apply_visible";
  const localGate = hasLocationOrResidencyGate(row.location, text);
  const externalGate = /regular apply|external|non-easy apply|opened an external ats/i.test(row.pause_reason || "");
  const verified = row.status === "applied_verified" || row.attempt_status === "submitted_verified";
  const previouslyBlocked = row.status === "blocked" || row.attempt_status === "blocked";
  const reconciledOldAttempt = /reconciled|not counted as applied|submitted_unverified/i.test(row.pause_reason || "");
  const unresolvedPauseGate = hasUnresolvedPauseGate(row);
  const noisyIndeedRow = hasNoisyIndeedRow(row);
  const noisyMonsterRow = hasNoisyMonsterRow(row);
  const nonTargetIndeedRole = hasNonTargetIndeedRole(row);
  const nonTargetRole = hasNonTargetRole(row);
  const weakMonsterTarget = hasWeakMonsterTarget(row);
  const durableDocxResume = Boolean(row.resume_artifact_path && /\.docx$/i.test(row.resume_artifact_path) && fs.existsSync(row.resume_artifact_path) && !/[\\/]temp[\\/]|appdata[\\/]local[\\/]temp/i.test(row.resume_artifact_path));
  const safeCurrentStatus = ["package_generated", "apply_ready"].includes(row.status) || (row.status === "needs_review" && !reconciledOldAttempt && !previouslyBlocked);

  let action: PremiumAction = "needs_manual_review";
  let reason = "Needs operator review before any submit.";

  if (verified) {
    action = "already_verified";
    reason = "Already verified in Dice Applied Jobs.";
  } else if (typeof evidence.matchScore === "number" && evidence.matchScore < 40) {
    action = "skip_low_fit";
    reason = `Dice match score ${evidence.matchScore}% is below the safe threshold.`;
  } else if (evidence.postedAgeDays !== null && evidence.postedAgeDays > 21) {
    action = "skip_stale";
    reason = `Posted age is ${evidence.postedAgeDays} days, older than the 21 day freshness gate.`;
  } else if (previouslyBlocked || reconciledOldAttempt) {
    action = "review_previous_attempt";
    reason = "This job has a prior blocked/reconciled attempt, so it needs a fresh live detail check before any new submit.";
  } else if (unresolvedPauseGate) {
    action = "needs_manual_review";
    reason = "Previous live attempt paused on required fields, human verification, or a saved-truth blocker; do not auto-promote until resolved.";
  } else if (nonTargetIndeedRole || nonTargetRole || weakMonsterTarget) {
    action = "skip_non_target";
    reason = "Role appears outside the target IT/product/systems lane; do not package or submit without a fresh live-detail override.";
  } else if (noisyIndeedRow || noisyMonsterRow) {
    action = "needs_manual_review";
    reason = "Source row looks noisy or placeholder-derived; refresh from a live detail page before packaging or submit.";
  } else if (localGate) {
    action = "review_location_or_auth";
    reason = "Description contains local, onsite, residency, or hybrid-onsite wording.";
  } else if (externalGate) {
    action = "review_external_high_fit";
    reason = "Live detail or prior attempt says this is regular Apply/external, so Easy Apply-only automation should not submit.";
  } else if (!durableDocxResume) {
    action = "review_missing_artifact";
    reason = "No durable DOCX resume artifact is recorded yet.";
  } else if (safeCurrentStatus && easyApplyEvidence && score >= 60 && /tier_[123]/.test(row.tier || "")) {
    action = "apply_candidate";
    reason = "Packaged, scored, tiered, and has Easy Apply evidence.";
  }

  const rank_score = rankPremiumItem(row, action, evidence.matchScore);
  return {
    ...row,
    action,
    reason,
    dice_match_score: evidence.matchScore,
    posted_age_days: evidence.postedAgeDays,
    easy_apply_evidence: easyApplyEvidence,
    rank_score
  };
}

export async function preparePremiumQueueArtifacts(
  db: Database.Database,
  opts: {
    limit?: number;
    sourceFilter?: string;
    templatePath: string;
    outputDir: string;
  }
): Promise<{ prepared: PreparedPremiumArtifact[]; skipped: PreparedPremiumArtifact[] }> {
  const templatePath = resolveTemplatePath(opts.templatePath);
  if (!templatePath) {
    throw new Error("hunt:prepare-artifacts requires a valid resume_tailoring.template_path.");
  }
  const outputDir = path.resolve(opts.outputDir || ".local/inspectable-resumes");
  fs.mkdirSync(outputDir, { recursive: true });

  const limit = Math.max(1, Math.min(opts.limit || 10, 50));
  const report = buildPremiumQueueReport(db, { sourceFilter: opts.sourceFilter || "dice", limit: 200 });
  const rows = report.rows.filter((row) => row.action === "review_missing_artifact").slice(0, limit);
  const runId = createArtifactPrepRun(db, rows.length);
  const prepared: PreparedPremiumArtifact[] = [];
  const skipped: PreparedPremiumArtifact[] = [];

  for (const row of rows) {
    const packageRow = db
      .prepare("SELECT cover_letter_text FROM hunt_packages WHERE job_id=? LIMIT 1")
      .get(row.id) as { cover_letter_text?: string } | undefined;

    try {
      const tailored = await tailorResumeForJD({
        parsed: { roleTitle: row.title, company: row.company } as any,
        jdText: row.description || "",
        templatePath,
        outputDir
      });
      const cover = await writeDurableCoverLetter(outputDir, tailored.docxPath, packageRow?.cover_letter_text || buildSafeCoverLetterText(row), {
        roleTitle: row.title,
        company: row.company,
        location: row.location,
        jobDescription: row.description
      });
      upsertPreparedArtifactAttempt(db, {
        runId,
        row,
        resumePath: tailored.docxPath,
        coverLetterPath: cover.docxPath
      });
      prepared.push({
        jobId: row.id,
        title: row.title,
        company: row.company,
        action: row.action,
        resumePath: tailored.docxPath,
        coverLetterPath: cover.docxPath,
        reason: "Prepared durable role-focused artifacts only; no submit attempted."
      });
    } catch (error) {
      skipped.push({
        jobId: row.id,
        title: row.title,
        company: row.company,
        action: row.action,
        reason: error instanceof Error ? error.message : String(error || "Artifact preparation failed.")
      });
    }
  }

  updateArtifactPrepRun(db, runId, { prepared: prepared.length, skipped: skipped.length });
  return { prepared, skipped };
}

function rankPremiumItem(row: QueueRow, action: PremiumAction, diceMatchScore: number | null): number {
  const actionWeight: Record<PremiumAction, number> = {
    apply_candidate: 1000,
    review_external_high_fit: 650,
    review_missing_artifact: 575,
    review_location_or_auth: 450,
    review_previous_attempt: 425,
    needs_manual_review: 350,
    skip_stale: 100,
    skip_non_target: 75,
    skip_low_fit: 50,
    already_verified: 0
  };
  const tierWeight = row.tier === "tier_1" ? 120 : row.tier === "tier_2" ? 80 : row.tier === "tier_3" ? 30 : 0;
  return actionWeight[action] + tierWeight + (row.score || 0) + (diceMatchScore || 0);
}

function hasLocationOrResidencyGate(location: string, text: string): boolean {
  const combined = `${location || ""}\n${text || ""}`;
  if (/\b(must\s+live|local\s+only|current\s+\w+\s+resident|within\s+1\s+hour|onsite|on-site|on\s+site|hybrid\s+onsite|u\.?s\.?\s*-?\s*based|us\s*-?\s*based|w2|no\s+c2c|1099)\b/i.test(combined)) {
    return true;
  }

  const explicitRemote = /\b(remote|work\s+from\s+home|wfh)\b/i.test(combined);
  if (explicitRemote) return false;

  return hasCityStateLocation(combined);
}

function hasNoisyIndeedRow(row: QueueRow): boolean {
  if (row.source !== "indeed") return false;
  const company = (row.company || "").trim();
  const title = (row.title || "").trim();
  const url = row.apply_url || row.source_url || "";

  if (/(?:fedcba9876543210|cdef0123456789ab|a1b2c3d4e5f67890|f1e2d3c4b5a67890|123456789abcdef0|456789abcdef0123)/i.test(url)) {
    return true;
  }

  if (!company || /^(unknown|terms|privacy|feedback)$/i.test(company)) {
    return true;
  }

  if (/\bexplore high paying jobs\b/i.test(`${company}\n${title}`)) {
    return true;
  }

  if (/\b(?:easily apply|often replies|job description opens|select an option)\b/i.test(`${company}\n${title}`)) {
    return true;
  }

  if (
    /\b(manager|analyst|owner|director|specialist|consultant|coordinator)\b/i.test(company)
    && (
      company.length > 25
      || /\b(remote|hybrid|winnipeg|toronto|ontario|canada|month|contract|fully|new)\b/i.test(company)
      || /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/i.test(company)
    )
  ) {
    return true;
  }

  if (company.length > 90 || title.length > 150) {
    return true;
  }

  return false;
}

function hasNoisyMonsterRow(row: QueueRow): boolean {
  if (row.source !== "monster") return false;
  const company = (row.company || "").trim();
  const title = (row.title || "").trim();
  const text = `${title}\n${company}\n${row.description || ""}`;

  if (!company || /^unknown$/i.test(company)) {
    return true;
  }

  if (hasCityStateLocation(company) || /\bUnited States\s*\(/i.test(company) || /\(\s*$/.test(company)) {
    return true;
  }

  if (/\b\d+\+?\s*(?:days?|d|weeks?|w)\s*ago/i.test(company) || /remote$/i.test(company)) {
    return true;
  }

  if (company.length > 75 || title.length > 150) {
    return true;
  }

  if (title.toLowerCase().includes(company.toLowerCase()) || company.toLowerCase().includes(title.toLowerCase())) {
    return true;
  }

  if (/\b(?:quick apply|apply now|job description|monster)\b/i.test(company)) {
    return true;
  }

  return false;
}

function stripEvidenceAndUrls(value: string): string {
  return String(value || "")
    .replace(/\[.*?evidence\][^\n]*/gi, "")
    .replace(/https?:\/\/\S+/gi, "");
}

function hasWeakMonsterTarget(row: QueueRow): boolean {
  if (row.source !== "monster") return false;
  const descriptionText = stripEvidenceAndUrls(row.description || "");
  const text = `${row.title || ""}\n${row.company || ""}\n${row.location || ""}\n${descriptionText}`;

  return !/\b(?:i\.?t\.?|information technology|technical product|business systems?|systems analyst|business analyst|data management|data products?|service delivery|enterprise systems?|platform|integration|implementation|erp|sap|oracle|netsuite|dynamics|wms|mawm|warehouse systems?|pos|retail systems?|supply chain|logistics|qa|quality assurance|pega systems?)\b/i.test(text);
}

function hasNonTargetIndeedRole(row: QueueRow): boolean {
  if (row.source !== "indeed") return false;
  const heading = `${row.title}\n${row.company}`.toLowerCase();
  const description = `${row.location}\n${row.description}`.toLowerCase();
  const text = `${heading}\n${description}`;

  const nonTargetSignals = /\b(account manager|sales account|hotel sales|industry sales|landscape|property management|metalworking fluids|electrical project|production manager|construction|renovation|site supervisor|estimator)\b/i;
  if (!nonTargetSignals.test(text)) return false;

  const strongHeadingTarget = /\b(it|information technology|software|technical|product owner|product manager|business systems?|systems analyst|business analyst|erp|wms|pos|qa|quality assurance|crm|digital|implementation|service delivery|enterprise systems?|platform|program manager)\b/i;
  if (strongHeadingTarget.test(heading)) return false;

  const projectManagerWithSystemsTarget =
    /\bproject manager\b/i.test(heading)
    && /\b(it|information technology|software|technical|erp|wms|pos|qa|quality assurance|crm|digital|implementation|service delivery|enterprise systems?|platform|systems integration|business systems?)\b/i.test(description);

  return !projectManagerWithSystemsTarget;
}

function hasNonTargetRole(row: QueueRow): boolean {
  const heading = `${row.title || ""}\n${row.company || ""}`;
  const descriptionText = stripEvidenceAndUrls(row.description || "");
  const text = `${heading}\n${row.location || ""}\n${descriptionText}`;

  const unrelatedRoleSignal =
    /\b(?:bcba|board certified behavior analyst|mortgage claims?|tax director|tax manager|private client services|accounting senior manager|commercial underwriting|payroll director|bridge project manager|rebar project manager|electrical engineering manager|construction|renovation|consumer engagement manager|customer service case manager|automotive training and development|market area manager|fleet implementation manager|behavioral health|restaurant|hotel sales|property management)\b/i;
  if (!unrelatedRoleSignal.test(text)) return false;

  const strongTargetHeading =
    /\b(?:i\.?t\.?|information technology|technical product|business systems?|systems analyst|business analyst|service delivery|enterprise systems?|platform|integration|erp|sap|oracle|wms|warehouse systems?|pos|retail systems?|supply chain|data products?|qa|quality assurance|program manager|project manager)\b/i;
  if (strongTargetHeading.test(heading) && /\b(?:erp|sap|oracle|wms|warehouse|pos|retail systems?|business systems?|enterprise systems?|integration|technical|i\.?t\.?|information technology|service delivery|platform)\b/i.test(text)) {
    return false;
  }

  return true;
}

function hasUnresolvedPauseGate(row: QueueRow): boolean {
  const text = [
    row.attempt_status || "",
    row.pause_reason || "",
    row.required_fields_json || "",
    row.answered_fields_json || "",
    row.next_action || ""
  ].join("\n");

  if (row.attempt_status === "manual_open_pause") {
    return true;
  }

  return /\b(recaptcha|captcha|human verification|authenticator|address|postal|zip|missing_saved_truthful|do not invent|required fields?|required questions?|screener|driver'?s?\s+licen[cs]e|vehicle|criminal|conviction|manual_pause|external\s+.+survey|survey\s+.+required)\b/i.test(text);
}

function hasCityStateLocation(value: string): boolean {
  const stateNames = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "Ontario", "Quebec",
    "British Columbia", "Alberta", "Manitoba", "Saskatchewan", "Nova Scotia", "New Brunswick"
  ];
  const statePattern = stateNames.map((state) => state.replace(/\s+/g, "\\s+")).join("|");
  const abbreviations = "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|ON|QC|BC|AB|MB|SK|NS|NB";
  const cityState = new RegExp(`\\b[A-Z][A-Za-z .'-]{2,},\\s*(?:${statePattern}|${abbreviations})\\b`, "i");
  return cityState.test(value);
}

function resolveTemplatePath(templatePath: string): string {
  const candidates = [
    templatePath,
    path.resolve(".local", "resume-references", "Fejiro_Efiuvwere_Canadian_Tire_Manager_Network_Analytics_Resume.docx")
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

async function writeDurableCoverLetter(
  outputDir: string,
  docxPath: string,
  coverText: string,
  fallback: { roleTitle: string; company: string; location?: string; jobDescription?: string }
): Promise<{ textPath: string; docxPath: string }> {
  return writeCoverLetterArtifacts({
    outputDir,
    resumeDocxPath: docxPath,
    coverText,
    fallback
  });
}

function buildSafeCoverLetterText(row: QueueRow): string {
  const title = cleanInline(row.title || "the role");
  const company = cleanInline(row.company || "your team");
  const focus = inferCoverFocus(row);
  return [
    "Dear Hiring Team,",
    "",
    `I am writing to express my interest in the ${title} role at ${company}. My background spans enterprise systems delivery, business analysis, stakeholder engagement, process improvement, and cross-functional technology implementation across retail, logistics, public-sector, and operations-focused environments.`,
    "",
    `This opportunity stood out because it aligns with my experience in ${focus}. I bring a practical delivery style, strong documentation discipline, and the ability to work with business and technical teams to clarify needs, manage execution, support UAT, and improve workflows without losing sight of operational outcomes.`,
    "",
    "I would welcome the opportunity to discuss how my experience can support your team.",
    "",
    "Sincerely,",
    "Fejiro Efiuvwere"
  ].join("\n");
}

function inferCoverFocus(row: QueueRow): string {
  const text = `${row.title}\n${row.description}`.toLowerCase();
  const matches = [
    { re: /\b(wms|warehouse|inventory|logistics|supply chain|blue yonder|manhattan)\b/i, text: "WMS, supply chain systems, operational workflows, data validation, and implementation support" },
    { re: /\b(erp|sap|oracle|dynamics|netsuite|business central)\b/i, text: "ERP transformation, systems integration, process mapping, stakeholder coordination, and delivery governance" },
    { re: /\b(product|backlog|roadmap|owner|user stories|acceptance criteria)\b/i, text: "product delivery, backlog refinement, requirements management, stakeholder alignment, and user-focused implementation" },
    { re: /\b(project manager|program manager|pmo|governance|risk|raid|vendor)\b/i, text: "project delivery, governance, vendor coordination, release readiness, risk management, and executive reporting" },
    { re: /\b(business analyst|requirements|process mapping|uat|jira|confluence|devops)\b/i, text: "requirements gathering, current-state and future-state analysis, process mapping, Agile delivery, UAT, and business documentation" }
  ];
  return matches.find((match) => match.re.test(text))?.text || "enterprise technology delivery, stakeholder engagement, requirements clarification, UAT support, and process improvement";
}

function cleanInline(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[<>]/g, "").trim();
}

function createArtifactPrepRun(db: Database.Database, requested: number): number {
  const now = new Date().toISOString();
  const info = db.prepare("INSERT INTO application_runs (run_type, status, summary_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .run("premium_artifact_prep", "running", JSON.stringify({ requested }), now, now);
  return Number(info.lastInsertRowid);
}

function updateArtifactPrepRun(db: Database.Database, runId: number, summary: Record<string, unknown>): void {
  db.prepare("UPDATE application_runs SET status=?, summary_json=?, updated_at=? WHERE id=?")
    .run("completed", JSON.stringify(summary), new Date().toISOString(), runId);
}

function upsertPreparedArtifactAttempt(db: Database.Database, args: {
  runId: number;
  row: QueueRow;
  resumePath: string;
  coverLetterPath: string;
}): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO application_attempts (run_id, job_id, adapter, apply_url, status, required_fields_json, answered_fields_json, pause_reason, final_url, resume_artifact_path, cover_letter_artifact_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(job_id) DO UPDATE SET
       run_id=excluded.run_id,
       adapter=excluded.adapter,
       apply_url=excluded.apply_url,
       status=excluded.status,
       required_fields_json=excluded.required_fields_json,
       answered_fields_json=excluded.answered_fields_json,
       pause_reason=excluded.pause_reason,
       final_url=excluded.final_url,
       resume_artifact_path=excluded.resume_artifact_path,
       cover_letter_artifact_path=excluded.cover_letter_artifact_path,
       updated_at=excluded.updated_at`
  ).run(
    args.runId,
    args.row.id,
    args.row.source || "dice",
    args.row.apply_url || null,
    "paused",
    "[]",
    "[]",
    "Prepared durable role-focused artifacts for operator review; no submit attempted.",
    args.row.apply_url || null,
    args.resumePath,
    args.coverLetterPath,
    now,
    now
  );
}

function parseDiceEvidence(description: string): { matchScore: number | null; postedAgeDays: number | null; applyButton: string } {
  const line = String(description || "")
    .split(/\r?\n/)
    .find((entry) => entry.startsWith("[Dice evidence]") || entry.startsWith("[Monster visible evidence]") || entry.startsWith("[Indeed visible evidence]")) || "";
  const matchRaw = line.match(/\bmatch_score=(\d{1,3}|unknown)\b/i)?.[1] || "";
  const postedText = line.match(/\bposted="([^"]*)"/i)?.[1] || "";
  return {
    matchScore: /^\d+$/.test(matchRaw) ? Number(matchRaw) : null,
    postedAgeDays: relativeDiceAgeDays(postedText),
    applyButton: line.match(/\bapply_button=([a-z_]+)/i)?.[1] || ""
  };
}

function relativeDiceAgeDays(value: string): number | null {
  const text = String(value || "").trim().toLowerCase();
  if (!text || text === "unknown") return null;
  if (/\btoday\b|\bhour|\bminute/.test(text)) return 0;
  if (/\byesterday\b/.test(text)) return 1;
  const amount = Number(text.match(/\b(\d+)\b/)?.[1] || NaN);
  if (!Number.isFinite(amount)) return null;
  if (/\bmonth/.test(text)) return amount * 30;
  if (/\bweek/.test(text)) return amount * 7;
  if (/\bday/.test(text)) return amount;
  return null;
}
