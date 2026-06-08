import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../src/config.js";
import { writeCoverLetterArtifacts } from "../src/cover_letter.js";
import { getDb } from "../src/db.js";
import { generatePackages, scoreJobs } from "../src/hunt.js";
import { tailorResumeForJD } from "../src/resume_tailor.js";

type JobRow = {
  id: number;
  title: string;
  company: string;
  location: string;
  source: string;
  apply_url: string;
  description: string;
  salary_or_rate: string;
  score: number | null;
  tier: string | null;
  status: string;
  package_id: number | null;
  cover_letter_text: string | null;
};

function clean(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function safeSlug(value: string): string {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "indeed-job";
}

function shortResumeCopy(job: JobRow, resumePath: string): string {
  const dir = path.dirname(resumePath);
  const role = safeSlug(job.title).replace(/-/g, "_").slice(0, 28) || "resume";
  const shortPath = path.join(dir, `I_${job.id}_${role}_Resume.docx`);
  fs.copyFileSync(resumePath, shortPath);
  return shortPath;
}

function getArg(name: string): string {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function selectJob(db: ReturnType<typeof getDb>, jobId?: number): JobRow | undefined {
  const baseSelect = `
    SELECT j.id, j.title, j.company, j.location, j.source, j.apply_url, j.description,
           j.salary_or_rate, j.score, j.tier, j.status,
           p.id AS package_id, p.cover_letter_text
    FROM hunt_jobs j
    LEFT JOIN hunt_packages p ON p.job_id = j.id
  `;

  if (jobId) {
    return db.prepare(`${baseSelect} WHERE j.id=? LIMIT 1`).get(jobId) as JobRow | undefined;
  }

  return db.prepare(`
    ${baseSelect}
    WHERE j.source='indeed'
      AND COALESCE(j.apply_url, '') <> ''
      AND COALESCE(j.tier, '') IN ('tier_1','tier_2','tier_3')
      AND j.status IN ('package_generated','apply_ready','needs_review','blocked')
      AND NOT EXISTS (
        SELECT 1 FROM application_attempts a
        WHERE a.job_id=j.id
          AND a.status IN ('submitted','submitted_verified','submitted_unverified')
      )
    ORDER BY
      CASE WHEN LOWER(j.description) LIKE '%easy_apply=yes%' THEN 0 ELSE 1 END,
      CASE WHEN LOWER(j.location || ' ' || j.work_mode || ' ' || j.description) LIKE '%remote%' THEN 0 ELSE 1 END,
      COALESCE(j.score, 0) DESC,
      j.updated_at DESC
    LIMIT 1
  `).get() as JobRow | undefined;
}

async function prepareArtifacts(job: JobRow): Promise<{ resumePath: string; coverLetterPath: string }> {
  const cfg = loadConfig();
  const templatePath = cfg.rules.resume_tailoring?.template_path || "";
  const outputDir = cfg.rules.resume_tailoring?.output_dir || path.resolve(".local", "inspectable-resumes");
  if (!templatePath || !fs.existsSync(templatePath)) {
    throw new Error(`Resume template not found: ${templatePath || "<empty>"}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const tailored = await tailorResumeForJD({
    parsed: {
      roleTitle: job.title,
      cleanRoleTitle: job.title,
      company: job.company,
      location: job.location,
      employmentType: "",
      salaryOrRate: job.salary_or_rate,
      recruiterName: "",
      parserConfidence: 85,
      cleanBody: job.description,
      summary: job.description,
      alignmentKeywords: [],
      isUsRole: /\b(united states|usa|u\.s\.)\b/i.test(`${job.location} ${job.description}`)
    } as any,
    jdText: job.description || "",
    templatePath,
    outputDir
  });

  const cover = await writeCoverLetterArtifacts({
    outputDir,
    resumeDocxPath: tailored.docxPath,
    coverText: job.cover_letter_text || "",
    fallback: {
      roleTitle: job.title,
      company: job.company,
      location: job.location,
      jobDescription: job.description
    }
  });
  return { resumePath: tailored.docxPath, coverLetterPath: cover.docxPath };
}

function createRun(db: ReturnType<typeof getDb>): number {
  const now = new Date().toISOString();
  const info = db.prepare(
    "INSERT INTO application_runs (run_type, status, summary_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run("indeed_visible_assist", "running", "{}", now, now);
  return Number(info.lastInsertRowid);
}

function finishRun(db: ReturnType<typeof getDb>, runId: number, summary: Record<string, unknown>): void {
  db.prepare("UPDATE application_runs SET status=?, summary_json=?, updated_at=? WHERE id=?")
    .run("completed", JSON.stringify(summary), new Date().toISOString(), runId);
}

function upsertAttempt(db: ReturnType<typeof getDb>, args: {
  runId: number;
  job: JobRow;
  status: string;
  reason: string;
  finalUrl: string;
  screenshotPath: string;
  resumePath: string;
  coverLetterPath: string;
}): void {
  const now = new Date().toISOString();
  const jobStatus = args.status === "blocked" ? "blocked" : "needs_review";
  const nextAction = args.status === "blocked" ? "review_blocked_indeed_job" : "visible_indeed_easy_apply_ready";
  db.prepare("UPDATE hunt_jobs SET status=?, next_action=?, updated_at=? WHERE id=?")
    .run(jobStatus, nextAction, now, args.job.id);

  db.prepare(
    `INSERT INTO application_attempts (run_id, job_id, adapter, apply_url, status, required_fields_json, answered_fields_json, pause_reason, final_url, screenshot_path, resume_artifact_path, cover_letter_artifact_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(job_id) DO UPDATE SET
       run_id=excluded.run_id,
       adapter=excluded.adapter,
       apply_url=excluded.apply_url,
       status=excluded.status,
       required_fields_json=excluded.required_fields_json,
       answered_fields_json=excluded.answered_fields_json,
       pause_reason=excluded.pause_reason,
       final_url=excluded.final_url,
       screenshot_path=excluded.screenshot_path,
       resume_artifact_path=excluded.resume_artifact_path,
       cover_letter_artifact_path=excluded.cover_letter_artifact_path,
       updated_at=excluded.updated_at`
  ).run(
    args.runId,
    args.job.id,
    "indeed_visible",
    args.job.apply_url,
    args.status,
    "[]",
    JSON.stringify([
      { label: "resume_artifact", answer: args.resumePath, source: "generated_docx" },
      { label: "cover_letter_artifact", answer: args.coverLetterPath, source: "generated_cover_letter_docx" }
    ]),
    args.reason,
    args.finalUrl,
    args.screenshotPath,
    args.resumePath,
    args.coverLetterPath,
    now,
    now
  );
}

function classifyPage(dumpPath: string): { status: string; reason: string; finalUrl: string } {
  const dump = JSON.parse(fs.readFileSync(dumpPath, "utf8")) as {
    url?: string;
    title?: string;
    text?: string;
    uploadResult?: { ok?: boolean; reason?: string };
    supportingUploadResult?: { ok?: boolean; reason?: string };
  };
  const text = clean(`${dump.title || ""} ${dump.url || ""} ${dump.text || ""}`);
  const finalUrl = clean(dump.url);
  const uploadReason = clean(dump.uploadResult?.reason);
  const supportingUploadReason = clean(dump.supportingUploadResult?.reason);

  if (dump.uploadResult && !dump.uploadResult.ok) {
    return {
      status: "manual_open_pause",
      reason: `Indeed generated resume upload is not verified: ${uploadReason || "unknown upload failure"}`,
      finalUrl
    };
  }

  if (dump.supportingUploadResult && !dump.supportingUploadResult.ok) {
    return {
      status: "manual_open_pause",
      reason: `Indeed cover letter/supporting document upload is not verified: ${supportingUploadReason || "unknown upload failure"}`,
      finalUrl
    };
  }

  if (/job is no longer available|no longer accepting applications|not found|404/i.test(text)) {
    return { status: "blocked", reason: "Indeed posting appears closed or unavailable; no submit attempted.", finalUrl };
  }

  if (/work location:\s*in person|reliably commute or plan to relocate|ability to commute\/relocate/i.test(text)) {
    return {
      status: "blocked",
      reason: "Indeed live detail shows in-person/commute-or-relocate requirements, so this is not safe for automatic remote-focused submission. No submit attempted.",
      finalUrl
    };
  }

  if (/\bhybrid work model\b|(?:\b2|\b3|\btwo|\bthree)\s+days?\s+per\s+week\s+in\b|days?\s+per\s+week\s+(?:at|in)\s+.*\boffice\b/i.test(text)) {
    return {
      status: "blocked",
      reason: "Indeed live detail shows a hybrid/in-office schedule requirement, so this is not safe for automatic remote-focused submission. No submit attempted.",
      finalUrl
    };
  }

  if (/647[-\s]?473[-\s]?3500|\+1[-\s]?647[-\s]?473[-\s]?3500/i.test(text)) {
    return {
      status: "manual_open_pause",
      reason: "Indeed SmartApply is showing the stale old phone number 647-473-3500. Update to +1 416 473 2732 before continuing or submitting.",
      finalUrl
    };
  }

  if (/sign in|login|verify it'?s you|enter code|continue with google/i.test(text)) {
    return { status: "manual_open_pause", reason: "Indeed sign-in or verification gate is visible in Fejiro Chrome; no submit attempted.", finalUrl };
  }

  if (/smartapply\.indeed\.com\/beta\/indeedapply\/form\/resume-selection-module/i.test(finalUrl) || /upload or create a resume|resume selection|select a resume/i.test(text)) {
    if (dump.uploadResult?.ok) {
      return {
        status: "manual_open_pause",
        reason: `Indeed SmartApply generated resume upload verified. ${uploadReason} Continue/submit remains paused until review, cover letter, screeners, and applied-history proof are verified.`,
        finalUrl
      };
    }
    if (/use your indeed resume|recommended .*\.pdf|uploaded (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text)) {
      return {
        status: "manual_open_pause",
        reason: "Indeed SmartApply resume-selection step reached, but Indeed is showing a stored/default resume. Continue is unsafe until the generated DOCX resume is uploaded or selected and visually verified.",
        finalUrl
      };
    }
    return {
      status: "manual_open_pause",
      reason: "Indeed SmartApply resume-selection step reached with generated DOCX resume and cover letter recorded; upload/continue/submit remains paused until proof-safe automation can verify the selected file.",
      finalUrl
    };
  }

  if (/apply on company site|apply on employer site|continue on company site|company website/i.test(text)) {
    return {
      status: "manual_open_pause",
      reason: "Indeed posting is an external/company-site application, not Indeed Easy Apply. Package is ready, but submission needs a separate verified company-site proof path.",
      finalUrl
    };
  }

  if (/smartapply\.indeed\.com\/beta\/indeedapply\/form\/review-module/i.test(finalUrl) || /review your application|submit your application|captcha|recaptcha|i'?m not a robot/i.test(text)) {
    if (dump.supportingUploadResult?.ok) {
      return {
        status: "manual_open_pause",
        reason: `Indeed SmartApply review reached with generated cover/supporting document verified. ${supportingUploadReason} Final submit remains paused until resume selection, role/company, screeners, and applied-history proof are verified.`,
        finalUrl
      };
    }
    return {
      status: "manual_open_pause",
      reason: "Indeed SmartApply review or human-verification step reached with generated artifacts recorded; final submit remains paused until the page can be visually verified and applied-history proof can be captured.",
      finalUrl
    };
  }

  if (/apply with indeed|easily apply|apply now|continue to apply/i.test(text)) {
    return {
      status: "manual_open_pause",
      reason: "Visible Indeed Easy Apply page opened with generated DOCX resume and cover letter recorded; final submit is still paused until upload/submit proof is automated.",
      finalUrl
    };
  }

  return {
    status: "manual_open_pause",
    reason: "Visible Indeed job page opened with generated DOCX resume and cover letter recorded; no reliable submit control was detected.",
    finalUrl
  };
}

async function main(): Promise<void> {
  const db = getDb();
  scoreJobs(db);
  generatePackages(db);

  const jobIdArg = Number(getArg("job-id") || NaN);
  const clickApply = hasFlag("click-apply");
  const prepareOnly = hasFlag("prepare-only");
  const uploadResume = hasFlag("upload-resume");
  const uploadCover = hasFlag("upload-cover");
  const job = selectJob(db, Number.isFinite(jobIdArg) ? jobIdArg : undefined);
  if (!job) {
    throw new Error("No eligible Indeed job found. Run npm run hunt:scrape-indeed:visible first.");
  }

  if (job.source !== "indeed") {
    throw new Error(`Job ${job.id} is source=${job.source}; this command only handles Indeed.`);
  }

  const runId = createRun(db);
  const artifacts = await prepareArtifacts(job);
  const resumeForAttempt = uploadResume ? shortResumeCopy(job, artifacts.resumePath) : artifacts.resumePath;
  if (prepareOnly) {
    finishRun(db, runId, {
      jobId: job.id,
      status: "package_prepared",
      reason: "Generated Indeed resume and cover letter artifacts without browser navigation.",
      resumePath: resumeForAttempt,
      coverLetterPath: artifacts.coverLetterPath
    });

    console.log(JSON.stringify({
      jobId: job.id,
      title: job.title,
      company: job.company,
      score: job.score,
      tier: job.tier,
      status: "package_prepared",
      reason: "Generated Indeed resume and cover letter artifacts without browser navigation.",
      resumePath: resumeForAttempt,
      coverLetterPath: artifacts.coverLetterPath
    }, null, 2));

    db.close();
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(".local", "visible-indeed-assist");
  fs.mkdirSync(outDir, { recursive: true });
  const slug = safeSlug(`${job.id}-${job.company}-${job.title}`);
  const dumpPath = path.join(outDir, `${stamp}-${slug}.json`);
  const screenshotPath = path.join(outDir, `${stamp}-${slug}.png`);

  const pythonArgs = [
    "scripts/visible_chrome_dom_dump.py",
    "--url", job.apply_url,
    "--out", dumpPath,
    "--screenshot", screenshotPath,
    "--wait", "8",
    "--dump-wait", "1.5"
  ];
  if (clickApply) {
    pythonArgs.push("--click-apply", "--click-wait", "6");
  }
  if (uploadResume) {
    pythonArgs.push("--upload-file", resumeForAttempt, "--upload-wait", "10", "--no-dump");
  }
  if (uploadCover) {
    if (!pythonArgs.includes("--no-dump")) {
      pythonArgs.push("--no-dump");
    }
    pythonArgs.push("--upload-supporting-file", artifacts.coverLetterPath, "--upload-wait", "10");
  }
  execFileSync("python", pythonArgs, { stdio: "inherit" });

  const page = classifyPage(dumpPath);
  upsertAttempt(db, {
    runId,
    job,
    status: page.status,
    reason: page.reason,
    finalUrl: page.finalUrl || job.apply_url,
    screenshotPath,
    resumePath: resumeForAttempt,
    coverLetterPath: artifacts.coverLetterPath
  });
  finishRun(db, runId, {
    jobId: job.id,
    status: page.status,
    reason: page.reason,
    clickedApply: clickApply,
    uploadedCover: uploadCover,
    screenshotPath,
    resumePath: resumeForAttempt,
    coverLetterPath: artifacts.coverLetterPath
  });

  console.log(JSON.stringify({
    jobId: job.id,
    title: job.title,
    company: job.company,
    score: job.score,
    tier: job.tier,
    status: page.status,
    reason: page.reason,
    clickedApply: clickApply,
    uploadedCover: uploadCover,
    finalUrl: page.finalUrl || job.apply_url,
    screenshotPath,
    resumePath: resumeForAttempt,
    coverLetterPath: artifacts.coverLetterPath
  }, null, 2));

  db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
