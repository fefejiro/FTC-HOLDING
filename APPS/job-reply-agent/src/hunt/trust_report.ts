import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { logger } from "../logger.js";
import { loadConfig } from "../config.js";

type AttemptRow = {
  id: number;
  job_id: number;
  status: string;
  adapter: string | null;
  apply_url: string | null;
  final_url: string | null;
  pause_reason: string | null;
  submitted_at: string | null;
  updated_at: string | null;
  resume_artifact_path: string | null;
  cover_letter_artifact_path: string | null;
  screenshot_path: string | null;
  source: string | null;
  title: string | null;
  company: string | null;
};

type TrustVerdict = "trusted" | "stale_tmp" | "text_only" | "missing_file" | "none";

function classifyArtifact(
  artifactPath: string | null,
  trustedRoots: string[]
): { verdict: TrustVerdict; exists: boolean; underTrustedRoot: boolean; extension: string | null } {
  if (!artifactPath) {
    return { verdict: "none", exists: false, underTrustedRoot: false, extension: null };
  }
  const normalized = artifactPath.replace(/\\/g, "/").toLowerCase();
  const extension = path.extname(artifactPath).toLowerCase() || null;
  const exists = fs.existsSync(artifactPath);
  const underTrustedRoot = trustedRoots.some((root) => normalized.startsWith(root));
  const isTmp = /[\\/]temp[\\/]|appdata[\\/]local[\\/]temp/i.test(normalized);

  if (underTrustedRoot && exists && extension === ".docx") return { verdict: "trusted", exists, underTrustedRoot, extension };
  if (!exists && isTmp) return { verdict: "stale_tmp", exists, underTrustedRoot, extension };
  if (!exists) return { verdict: "missing_file", exists, underTrustedRoot, extension };
  if (extension === ".txt") return { verdict: "text_only", exists, underTrustedRoot, extension };
  if (extension === ".docx" && exists) return { verdict: "trusted", exists, underTrustedRoot, extension };
  return { verdict: "missing_file", exists, underTrustedRoot, extension };
}

function pickTrustedRoots(cfg: ReturnType<typeof loadConfig>): string[] {
  const roots: string[] = [];
  const out = cfg.rules.resume_tailoring?.output_dir;
  if (out) roots.push(out.replace(/\\/g, "/").toLowerCase());
  // Always include the standard DOCS bank.
  roots.push("c:/ftc holding/docs/fejiro_job_reply_agent_resume_bank/resumes");
  return Array.from(new Set(roots));
}

export interface TrustReportOptions {
  limit?: number;
  statusFilter?: string;
  sourceFilter?: string;
  jsonOnly?: boolean;
}

export function buildTrustReport(db: Database.Database, opts: TrustReportOptions = {}): {
  generatedAt: string;
  trustedRoots: string[];
  totals: Record<string, number>;
  rows: Array<AttemptRow & {
    resume_verdict: TrustVerdict;
    resume_exists: boolean;
    cover_letter_verdict: TrustVerdict;
    cover_letter_exists: boolean;
  }>;
} {
  const cfg = loadConfig();
  const trustedRoots = pickTrustedRoots(cfg);
  const limit = Math.max(1, Math.min(opts.limit ?? 25, 500));

  const where: string[] = [];
  const params: any[] = [];
  if (opts.statusFilter) {
    where.push("a.status = ?");
    params.push(opts.statusFilter);
  }
  if (opts.sourceFilter) {
    where.push("j.source = ?");
    params.push(opts.sourceFilter);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT a.id, a.job_id, a.status, a.adapter, a.apply_url, a.final_url,
              a.pause_reason, a.submitted_at, a.updated_at,
              a.resume_artifact_path, a.cover_letter_artifact_path, a.screenshot_path,
              j.source, j.title, j.company
       FROM application_attempts a
       JOIN hunt_jobs j ON j.id = a.job_id
       ${whereClause}
       ORDER BY COALESCE(a.submitted_at, a.updated_at, a.created_at) DESC, a.updated_at DESC, a.id DESC
       LIMIT ?`
    )
    .all(...params, limit) as AttemptRow[];

  const enriched = rows.map((row) => {
    const resume = classifyArtifact(row.resume_artifact_path, trustedRoots);
    const cover = classifyArtifact(row.cover_letter_artifact_path, trustedRoots);
    return {
      ...row,
      resume_verdict: resume.verdict,
      resume_exists: resume.exists,
      cover_letter_verdict: cover.verdict,
      cover_letter_exists: cover.exists
    };
  });

  const totals: Record<string, number> = {};
  for (const r of enriched) {
    const key = `${r.status}:${r.resume_verdict}`;
    totals[key] = (totals[key] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    trustedRoots,
    totals,
    rows: enriched
  };
}

export function writeTrustReport(report: ReturnType<typeof buildTrustReport>): string {
  const dir = path.resolve(".local", "trust-reports");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const file = path.join(dir, `trust-report-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), "utf8");
  return file;
}

export function printTrustReport(report: ReturnType<typeof buildTrustReport>): void {
  const lines: string[] = [];
  lines.push("");
  lines.push("=== JOB APPLY TRUST REPORT ===");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Trusted resume roots: ${report.trustedRoots.join(" | ")}`);
  lines.push(`Rows: ${report.rows.length}`);
  lines.push(`Totals (status:resume_verdict): ${JSON.stringify(report.totals)}`);
  lines.push("");
  for (const r of report.rows) {
    lines.push(
      `#${r.id} job=${r.job_id} [${r.source}/${r.adapter ?? "?"}] ${r.status.toUpperCase()}`
    );
    lines.push(`  ${r.company ?? "?"} — ${r.title ?? "?"}`);
    if (r.apply_url) lines.push(`  apply_url:  ${r.apply_url}`);
    if (r.final_url && r.final_url !== r.apply_url) lines.push(`  final_url:  ${r.final_url}`);
    lines.push(
      `  resume:     [${r.resume_verdict}${r.resume_exists ? "" : " MISSING"}] ${r.resume_artifact_path ?? "(none)"}`
    );
    lines.push(
      `  cover:      [${r.cover_letter_verdict}${r.cover_letter_exists ? "" : " MISSING"}] ${r.cover_letter_artifact_path ?? "(none)"}`
    );
    if (r.pause_reason) lines.push(`  pause:      ${r.pause_reason}`);
    if (r.submitted_at) lines.push(`  submitted:  ${r.submitted_at}`);
    lines.push("");
  }
  logger.info(lines.join("\n"));
}
