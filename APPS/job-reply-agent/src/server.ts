import { createServer, type IncomingMessage } from "node:http";
import { URL } from "node:url";
import { loadConfig } from "./config.js";
import { getDb } from "./db.js";
import {
  applyStatusLabel,
  createReplyDraftInThread,
  exchangeCodeAndSaveTokens,
  getGmailConsentUrl,
  listRecruiterInboundMessages,
  sendDraftById
} from "./gmail.js";
import { logger } from "./logger.js";
import { getApprovedPendingDrafts, insertDecision, markDraftSent } from "./message_store.js";
import { approveAllDrafts, processGmailInbox } from "./processor.js";
import { buildDailyReport, renderDailyReport } from "./reporter.js";
import {
  buildHuntReport,
  generateApplyAssist,
  generateFollowups,
  generateInterviewPrep,
  generateOutreachDrafts,
  generatePackages,
  listDueFollowups,
  getHuntContacts,
  scoreJobs
} from "./hunt.js";
import { buildApplicationQueueReport, runAutoApplyQueue, runAutoEmailQueue, runDailyHuntAutomation } from "./automation.js";

type ServerAction =
  | "auth-url"
  | "auth-save"
  | "process"
  | "approve"
  | "send"
  | "cycle"
  | "report"
  | "hunt-score"
  | "hunt-package"
  | "hunt-followups"
  | "hunt-apply-assist"
  | "hunt-interview-prep"
  | "hunt-applications"
  | "hunt-auto-apply"
  | "hunt-auto-email"
  | "hunt-auto-run"
  | "hunt-daily"
  | "hunt-send-review-draft";

const PORT = Number(process.env.PORT || 3007);
const HOST = process.env.HOST || "0.0.0.0";

function getControlToken(): string {
  return process.env.JOB_AGENT_WEB_TOKEN || "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function linkifyAndFormat(value: string): string {
  const escaped = escapeHtml(value || "");
  const linked = escaped.replace(/(https?:\/\/[^\s<]+)/gi, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
  return linked.replace(/\n/g, "<br>");
}

function renderDashboard(state: {
  mode: string;
  authMode: string;
  reportSubject: string;
  reportBody: string;
  huntReport: HuntDashboardReport;
  applicationReport: ReturnType<typeof buildApplicationQueueReport>;
  applicationCases: HuntDashboardApplicationCase[];
  reviewDrafts: HuntDashboardReviewDraft[];
  runHistory: HuntDashboardRun[];
  huntJobs: HuntDashboardJob[];
  huntDrafts: HuntDashboardDraft[];
  huntContacts: HuntDashboardContact[];
  huntFollowups: HuntDashboardFollowup[];
  reviewQueue: HuntDashboardReviewQueueItem[];
  focus: string;
  status: string;
  token: string;
}): string {
  const controls = [
    ["auth-url", "Get Gmail Auth URL"],
    ["process", "Process Gmail Inbox"],
    ["approve", "Approve Drafts"],
    ["send", "Send Approved"],
    ["cycle", "Run Intake Cycle"],
    ["report", "Generate Report"]
  ]
    .map(([action, label]) => {
      const tokenQuery = state.token ? `?token=${encodeURIComponent(state.token)}` : "";
      return `
        <form method="post" action="/api/${action}${tokenQuery}">
          <button class="btn" type="submit">${label}</button>
        </form>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Job Reply Agent</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #eef1f6;
      --panel: rgba(255,255,255,0.85);
      --panel-border: rgba(17,24,39,0.10);
      --text: #101827;
      --muted: #516072;
      --accent: #0f766e;
      --accent-2: #134e4a;
      --shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 35%),
        radial-gradient(circle at bottom right, rgba(19, 78, 74, 0.12), transparent 32%),
        linear-gradient(160deg, #f7f8fb 0%, #eef2f7 55%, #e6edf3 100%);
      color: var(--text);
      min-height: 100vh;
      padding: 20px;
    }
    .shell {
      max-width: 1120px;
      margin: 0 auto;
      display: grid;
      gap: 18px;
      grid-template-columns: 1.1fr 0.9fr;
    }
    .hero, .panel {
      background: var(--panel);
      border: 1px solid var(--panel-border);
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
      border-radius: 24px;
      overflow: hidden;
    }
    .hero { padding: 24px; }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent);
      font-weight: 700;
      font-size: 12px;
    }
    h1 {
      margin: 10px 0 6px;
      font-size: clamp(30px, 5vw, 54px);
      line-height: 0.98;
    }
    .lede { color: var(--muted); font-size: 15px; line-height: 1.6; max-width: 62ch; }
    .statusbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }
    .chip {
      background: #fff;
      border: 1px solid var(--panel-border);
      padding: 10px 12px;
      border-radius: 999px;
      color: var(--accent-2);
      font-weight: 700;
      font-size: 13px;
    }
    .panel { padding: 18px; }
    .controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .btn {
      width: 100%;
      appearance: none;
      border: 0;
      cursor: pointer;
      border-radius: 16px;
      padding: 14px 14px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: white;
      font-weight: 800;
      letter-spacing: 0.01em;
      box-shadow: 0 10px 24px rgba(15, 118, 110, 0.18);
    }
    .btn.inline {
      width: auto;
      padding: 8px 12px;
      font-size: 12px;
      border-radius: 10px;
      text-decoration: none;
      display: inline-block;
      box-shadow: none;
      margin-top: 8px;
    }
    .btn.warn {
      background: linear-gradient(135deg, #b45309, #92400e);
    }
    .btn:active { transform: translateY(1px); }
    .section {
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid var(--panel-border);
    }
    .card {
      background: rgba(255,255,255,0.75);
      border: 1px solid var(--panel-border);
      border-radius: 18px;
      padding: 14px;
      white-space: pre-wrap;
      overflow: auto;
      max-height: 440px;
      color: #192433;
      line-height: 1.55;
      font-size: 14px;
    }
    .muted { color: var(--muted); font-size: 13px; }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }
    .metric {
      background: #fff;
      border: 1px solid var(--panel-border);
      border-radius: 14px;
      padding: 12px;
      min-height: 72px;
    }
    .metric strong {
      display: block;
      font-size: 24px;
      line-height: 1;
      color: var(--accent-2);
    }
    .metric span {
      display: block;
      margin-top: 6px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .metric-link {
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .metric.active {
      border-color: #0f766e;
      box-shadow: 0 0 0 2px rgba(15,118,110,0.14) inset;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 10px;
    }
    .table th, .table td {
      text-align: left;
      border-bottom: 1px solid var(--panel-border);
      padding: 9px 8px;
      vertical-align: top;
    }
    .table th {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .pill {
      display: inline-block;
      border-radius: 999px;
      padding: 4px 8px;
      background: #e6f4f1;
      color: var(--accent-2);
      font-weight: 800;
      font-size: 12px;
      white-space: nowrap;
    }
    @media (max-width: 920px) {
      .shell { grid-template-columns: 1fr; }
      .controls { grid-template-columns: 1fr; }
      .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <div class="eyebrow">Job Reply Agent</div>
      <h1>Phone-first control for recruiter replies.</h1>
      <p class="lede">Use the same interface on desktop and mobile. Process Gmail, approve drafts, send responses, and generate the daily report without touching the computer terminal.</p>
      <div class="statusbar">
        <div class="chip">Mode: ${escapeHtml(state.mode)}</div>
        <div class="chip">Auth: ${escapeHtml(state.authMode)}</div>
        <div class="chip">Status: ${escapeHtml(state.status)}</div>
      </div>
      <div class="section">
        <div class="muted">Live report preview</div>
        <div class="card"><strong>${escapeHtml(state.reportSubject)}</strong><br><br>${linkifyAndFormat(state.reportBody)}</div>
      </div>
      <div class="section">
        <div class="eyebrow">Hunt OS</div>
        <div class="metric-grid">${renderHuntMetrics(state.huntReport, state.token, state.focus)}</div>
        ${renderFocusPanel(state.focus, state.reviewQueue)}
        <div class="section">
          <div class="muted">Latest jobs</div>
          ${renderHuntJobsTable(state.huntJobs)}
        </div>
        <div class="section">
          <div class="muted">Automation queues</div>
          ${renderAutomationMetrics(state.applicationReport)}
        </div>
        <div class="section">
          <div class="muted">Application queue details (JD, package, apply status)</div>
          ${renderApplicationCasesTable(state.applicationCases)}
        </div>
        <div class="section">
          <div class="muted">Recruiter drafts needing review (approve/send)</div>
          ${renderReviewDraftsTable(state.reviewDrafts, state.token)}
        </div>
        <div class="section">
          <div class="muted">Run history (trust + audit)</div>
          ${renderRunHistoryTable(state.runHistory)}
        </div>
        <div class="section">
          <div class="muted">Outreach drafts waiting</div>
          ${renderHuntDraftsTable(state.huntDrafts, state.token)}
        </div>
        <div class="section">
          <div class="muted">Follow-ups due</div>
          ${renderHuntFollowupsTable(state.huntFollowups)}
        </div>
        <div class="section">
          <div class="muted">Contacts</div>
          ${renderHuntContactsTable(state.huntContacts)}
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="eyebrow">Controls</div>
      <div class="controls">${controls}</div>
      <div class="section">
        <div class="muted">This server should be hosted on an always-on machine or cloud VM. Once deployed, your phone can reach it from anywhere.</div>
      </div>
      <div class="section">
        <div class="eyebrow">Hunt Actions</div>
        <div class="controls">
          <form method="post" action="/api/hunt-score${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}">
            <button class="btn" type="submit">Score Hunt Jobs</button>
          </form>
          <form method="post" action="/api/hunt-package${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}">
            <button class="btn" type="submit">Generate Packages</button>
          </form>
          <form method="post" action="/api/hunt-followups${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}">
            <button class="btn" type="submit">Prepare Follow-ups</button>
          </form>
          <form method="post" action="/api/hunt-apply-assist${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}">
            <button class="btn" type="submit">Prepare Apply Assist</button>
          </form>
          <form method="post" action="/api/hunt-interview-prep${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}">
            <button class="btn" type="submit">Prepare Interview Prep</button>
          </form>
          <form method="post" action="/api/hunt-auto-apply${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}">
            <button class="btn" type="submit">Auto Apply</button>
          </form>
          <form method="post" action="/api/hunt-auto-email${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}">
            <button class="btn" type="submit">Auto Email</button>
          </form>
          <form method="post" action="/api/hunt-auto-run${state.token ? `?token=${encodeURIComponent(state.token)}` : ""}">
            <button class="btn" type="submit">Run Daily Hunt</button>
          </form>
        </div>
        <div class="section">
          <div class="muted">Auto Apply opens a visible browser session and may submit applications when all required answers are known. Auto Email can draft and send recruiter replies when the saved answers and score allow it.</div>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;
}

interface HuntDashboardReport {
  discovered: number;
  scored: number;
  package_ready: number;
  package_generated: number;
  follow_up_due: number;
  needs_review: number;
  blocked: number;
  contacts: number;
  followups_due: number;
  apply_assist_ready: number;
  apply_assist_needs_review: number;
  interview_prep_ready: number;
  auto_apply_ready: number;
  auto_apply_submitted: number;
  auto_apply_paused: number;
  auto_email_sent: number;
  auto_email_waiting_review: number;
  recruiter_drafts_waiting: number;
  unreplied_recruiter_emails: number;
  blocked_by_missing_answer: number;
  blocked_by_forbidden_authorization: number;
  tier_counts: Record<string, number>;
  outreach_drafts_waiting: number;
  recommended_next_action: string;
}

interface HuntDashboardJob {
  id: number;
  title: string;
  company: string;
  source: string;
  status: string;
  score: number | null;
  tier: string | null;
  next_action: string | null;
  needs_review: number;
}

interface HuntDashboardDraft {
  id: number;
  job_id: number;
  draft_type: string;
  body: string;
  status: string;
  title: string;
  company: string;
  apply_url: string;
  source_url: string;
  recruiter_email: string;
  created_at: string;
}

interface HuntDashboardContact {
  id: number;
  name: string;
  email: string;
  company: string;
  source: string;
  last_job_id: number | null;
}

interface HuntDashboardFollowup {
  id: number;
  job_id: number;
  followup_type: string;
  due_at: string;
  status: string;
  note: string;
  title: string;
  company: string;
  email: string;
}

interface HuntDashboardReviewQueueItem {
  id: number;
  title: string;
  company: string;
  status: string;
  next_action: string;
  source: string;
  apply_url: string;
  source_url: string;
  updated_at: string;
}

interface HuntDashboardApplicationCase {
  job_id: number;
  title: string;
  company: string;
  source: string;
  apply_url: string;
  job_status: string;
  attempt_status: string;
  adapter: string;
  pause_reason: string;
  required_fields_json: string;
  answered_fields_json: string;
  description: string;
  resume_text: string;
  cover_letter_text: string;
  final_url: string;
  screenshot_path: string;
  resume_artifact_path: string;
  cover_letter_artifact_path: string;
}

interface HuntDashboardReviewDraft {
  id: number;
  message_id: string;
  thread_id: string;
  sender: string;
  subject: string;
  status: string;
  score: number | null;
  reason: string;
  draft_id: string;
  created_at: string;
}

interface HuntDashboardRun {
  id: number;
  run_type: string;
  status: string;
  summary_json: string;
  updated_at: string;
}

function getHuntDashboard(db = getDb()): {
  report: HuntDashboardReport;
  applications: ReturnType<typeof buildApplicationQueueReport>;
  applicationCases: HuntDashboardApplicationCase[];
  reviewDrafts: HuntDashboardReviewDraft[];
  runHistory: HuntDashboardRun[];
  reviewQueue: HuntDashboardReviewQueueItem[];
  jobs: HuntDashboardJob[];
  drafts: HuntDashboardDraft[];
  contacts: HuntDashboardContact[];
  followups: HuntDashboardFollowup[];
} {
  const report = JSON.parse(buildHuntReport(db)) as HuntDashboardReport;
  const applications = buildApplicationQueueReport(db);
  const jobs = db
    .prepare("SELECT id,title,company,source,status,score,tier,next_action,needs_review FROM hunt_jobs ORDER BY id DESC LIMIT 10")
    .all() as HuntDashboardJob[];
  const draftsWithJob = db
    .prepare(
      `SELECT d.id, d.job_id, d.draft_type, d.body, d.status, d.created_at,
              COALESCE(j.title, '') AS title,
              COALESCE(j.company, '') AS company,
              COALESCE(j.apply_url, '') AS apply_url,
              COALESCE(j.source_url, '') AS source_url,
              COALESCE(j.recruiter_email, '') AS recruiter_email
       FROM hunt_outreach_drafts d
       LEFT JOIN hunt_jobs j ON j.id = d.job_id
       WHERE d.status='waiting'
       ORDER BY d.id DESC
       LIMIT 12`
    )
    .all() as HuntDashboardDraft[];
  const applicationCases = db
    .prepare(
      `SELECT
         j.id AS job_id,
         j.title,
         j.company,
         j.source,
         j.apply_url,
         j.status AS job_status,
         COALESCE(a.status, 'not_attempted') AS attempt_status,
         COALESCE(a.adapter, '') AS adapter,
         COALESCE(a.pause_reason, '') AS pause_reason,
         COALESCE(a.required_fields_json, '') AS required_fields_json,
         COALESCE(a.answered_fields_json, '') AS answered_fields_json,
         COALESCE(j.description, '') AS description,
         COALESCE(p.resume_text, '') AS resume_text,
         COALESCE(p.cover_letter_text, '') AS cover_letter_text,
         COALESCE(a.final_url, '') AS final_url,
         COALESCE(a.screenshot_path, '') AS screenshot_path,
         COALESCE(a.resume_artifact_path, '') AS resume_artifact_path,
         COALESCE(a.cover_letter_artifact_path, '') AS cover_letter_artifact_path
       FROM hunt_jobs j
       LEFT JOIN application_attempts a ON a.job_id = j.id
       LEFT JOIN hunt_packages p ON p.job_id = j.id
       WHERE j.apply_url IS NOT NULL AND j.apply_url <> ''
       ORDER BY COALESCE(j.score, 0) DESC, j.id DESC
       LIMIT 20`
    )
    .all() as HuntDashboardApplicationCase[];
  const reviewDrafts = db
    .prepare(
      `SELECT id, message_id, thread_id, sender, subject, status, score, reason, draft_id, created_at
       FROM email_auto_response_attempts
       WHERE status='waiting_review'
       ORDER BY id DESC
       LIMIT 20`
    )
    .all() as HuntDashboardReviewDraft[];
  const runHistory = db
    .prepare("SELECT id, run_type, status, summary_json, updated_at FROM application_runs ORDER BY id DESC LIMIT 12")
    .all() as HuntDashboardRun[];
  const reviewQueue = db
    .prepare(
      `SELECT id, title, company, status, COALESCE(next_action, '') AS next_action, source,
              COALESCE(apply_url, '') AS apply_url, COALESCE(source_url, '') AS source_url, updated_at
       FROM hunt_jobs
       WHERE needs_review=1 OR status IN ('needs_review','blocked')
       ORDER BY updated_at DESC, id DESC
       LIMIT 100`
    )
    .all() as HuntDashboardReviewQueueItem[];
  const contacts = getHuntContacts(db) as HuntDashboardContact[];
  const followups = listDueFollowups(db) as HuntDashboardFollowup[];
  return { report, applications, applicationCases, reviewDrafts, runHistory, reviewQueue, jobs, drafts: draftsWithJob, contacts, followups };
}

function extractDraftMessage(item: HuntDashboardApplicationCase): string {
  if (item.answered_fields_json) {
    try {
      const parsed = JSON.parse(item.answered_fields_json);
      if (Array.isArray(parsed)) {
        const best = parsed.find((entry) => {
          const key = String(entry?.field || entry?.name || entry?.label || "");
          const value = String(entry?.value || entry?.answer || "").trim();
          return /message|cover|summary|pitch|why/i.test(key) && value.length > 20;
        });
        const value = String(best?.value || best?.answer || "").trim();
        if (value) return value;
      }
    } catch {
      // Ignore malformed JSON and use fallback message.
    }
  }
  return (item.cover_letter_text || item.resume_text || "").trim();
}

function isManualResumeStatus(item: HuntDashboardApplicationCase): boolean {
  const status = (item.attempt_status || "").toLowerCase();
  if (["paused", "needs_review", "blocked"].includes(status)) return true;
  return /captcha|sign in|login|verify|manual/i.test(item.pause_reason || "");
}

function renderHuntMetrics(report: HuntDashboardReport, token: string, focus: string): string {
  const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : "";
  const metrics: Array<{ label: string; value: number | string; focus?: string }> = [
    { label: "Discovered", value: report.discovered },
    { label: "Scored", value: report.scored },
    { label: "Generated", value: report.package_generated },
    { label: "Drafts", value: report.outreach_drafts_waiting },
    { label: "Follow-ups", value: report.followups_due },
    { label: "Apply", value: report.apply_assist_ready },
    { label: "Interviews", value: report.interview_prep_ready },
    { label: "Recruiter Review", value: report.recruiter_drafts_waiting, focus: "recruiter_review" },
    { label: "Tier 1", value: report.tier_counts?.tier_1 || 0 },
    { label: "Review", value: report.needs_review, focus: "needs_review" },
    { label: "Blocked", value: report.blocked, focus: "needs_review" },
    { label: "Auto Apply", value: report.auto_apply_ready || 0 },
    { label: "Auto Email", value: report.auto_email_waiting_review || 0, focus: "recruiter_review" }
  ];
  return metrics
    .map((item) => {
      const active = item.focus && focus === item.focus ? " active" : "";
      const card = `<div class="metric${active}"><strong>${escapeHtml(String(item.value))}</strong><span>${escapeHtml(item.label)}</span></div>`;
      if (!item.focus) return card;
      return `<a class="metric-link" href="/?focus=${encodeURIComponent(item.focus)}${tokenQuery}">${card}</a>`;
    })
    .join("");
}

function renderFocusPanel(focus: string, reviewQueue: HuntDashboardReviewQueueItem[]): string {
  if (!focus) return "";
  if (focus === "needs_review") {
    if (reviewQueue.length === 0) {
      return `<div class="section"><div class="muted">Review queue drill-down</div><div class="card">No records currently require review.</div></div>`;
    }
    const rows = reviewQueue
      .map((item) => {
        const jobUrl = item.apply_url || item.source_url || "";
        const actionText = item.next_action || (item.status === "blocked" ? "manual unblock required" : "review and proceed");
        return `<tr>
          <td><strong>${escapeHtml(item.title || "Untitled")}</strong><div class="muted">${escapeHtml(item.company || "")}</div></td>
          <td><span class="pill">${escapeHtml(item.status || "")}</span></td>
          <td>${escapeHtml(actionText)}</td>
          <td>${jobUrl ? `<a href="${escapeHtml(jobUrl)}" target="_blank" rel="noreferrer">Open target</a>` : ""}</td>
        </tr>`;
      })
      .join("");
    return `<div class="section"><div class="muted">Review queue drill-down (${reviewQueue.length})</div><table class="table"><thead><tr><th>Role</th><th>Status</th><th>Action Needed</th><th>Open</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  if (focus === "recruiter_review") {
    return `<div class="section"><div class="muted">Recruiter review drill-down</div><div class="card">Use the Recruiter drafts needing review table below to approve or send each draft.</div></div>`;
  }

  return "";
}

function renderAutomationMetrics(report: ReturnType<typeof buildApplicationQueueReport>): string {
  const metrics: Array<[string, number | string]> = [
    ["Apply Ready", report.auto_apply_ready],
    ["Apply Submitted", report.auto_apply_submitted],
    ["Apply Paused", report.auto_apply_paused],
    ["Email Sent", report.auto_email_sent],
    ["Email Review", report.auto_email_waiting_review],
    ["Missing Answer", report.blocked_by_missing_answer],
    ["Auth Block", report.blocked_by_forbidden_authorization],
    ["Tier 1 Queue", report.top_tier_1_queue.length],
    ["Interview Prep", report.interview_prep_ready],
    ["Follow-ups", report.followups_due]
  ];
  return metrics
    .map(([label, value]) => `<div class="metric"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`)
    .join("");
}

function renderHuntJobsTable(jobs: HuntDashboardJob[]): string {
  if (jobs.length === 0) return `<div class="card">No hunt jobs yet.</div>`;
  const rows = jobs
    .map((job) => `
      <tr>
        <td>${escapeHtml(job.title || "Untitled")}</td>
        <td>${escapeHtml(job.company || "Unknown")}</td>
        <td>${escapeHtml(job.source || "manual")}</td>
        <td><span class="pill">${escapeHtml(job.status)}</span></td>
        <td>${escapeHtml(job.tier || "")}</td>
        <td>${job.score ?? ""}</td>
        <td>${escapeHtml(job.next_action || "")}</td>
      </tr>`)
    .join("");
  return `<table class="table"><thead><tr><th>Role</th><th>Company</th><th>Source</th><th>Status</th><th>Tier</th><th>Score</th><th>Next</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderHuntDraftsTable(drafts: HuntDashboardDraft[], token: string): string {
  if (drafts.length === 0) return `<div class="card">No waiting outreach drafts.</div>`;
  const rows = drafts
    .map((draft) => {
      const bestJobUrl = resolveBestJobUrl(draft);
      const workspaceLink = `/draft-workspace?id=${draft.id}${token ? `&token=${encodeURIComponent(token)}` : ""}`;
      return `
      <tr>
        <td>
          <div><strong>${escapeHtml(draft.title || "Untitled role")}</strong></div>
          <div class="muted">${escapeHtml(draft.company || "")}</div>
          <div class="muted">${escapeHtml(draft.draft_type)}</div>
        </td>
        <td>${linkifyAndFormat(draft.body.slice(0, 1200))}</td>
        <td><a href="${workspaceLink}"><span class="pill">${escapeHtml(draft.status)}</span></a></td>
        <td>
          <a class="btn inline" href="${workspaceLink}">Open Draft Workspace</a>
          ${bestJobUrl ? `<a class="btn inline" href="${escapeHtml(bestJobUrl)}" target="_blank" rel="noreferrer">Open Job Link</a>` : ""}
        </td>
      </tr>`;
    })
    .join("");
  return `<table class="table"><thead><tr><th>Role</th><th>Draft</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function isGenericLinkedInJobsUrl(url: string): boolean {
  return /linkedin\.com\/jobs\/?search|linkedin\.com\/jobs\/?\?|linkedin\.com\/jobs\/?$/i.test(url || "");
}

function resolveBestJobUrl(draft: Pick<HuntDashboardDraft, "apply_url" | "source_url">): string {
  const apply = String(draft.apply_url || "").trim();
  const source = String(draft.source_url || "").trim();
  if (apply && !isGenericLinkedInJobsUrl(apply)) return apply;
  if (source) return source;
  return apply || source;
}

function renderDraftWorkspace(state: { draft: HuntDashboardDraft; token: string }): string {
  const jobUrl = resolveBestJobUrl(state.draft);
  const encodedBody = encodeURIComponent(state.draft.body || "");
  const encodedSubject = encodeURIComponent(`Application interest: ${state.draft.title || "Role"}`);
  const mailto = state.draft.recruiter_email
    ? `mailto:${encodeURIComponent(state.draft.recruiter_email)}?subject=${encodedSubject}&body=${encodedBody}`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Draft Workspace</title>
  <style>
    body { margin: 0; padding: 20px; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; background: #f5f7fb; color: #1f2937; }
    .wrap { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    .muted { color: #6b7280; font-size: 13px; }
    .actions { margin: 14px 0 16px; display: flex; gap: 10px; flex-wrap: wrap; }
    .btn { display: inline-block; text-decoration: none; padding: 10px 14px; border-radius: 10px; background: #0f766e; color: #fff; font-weight: 700; }
    .btn.alt { background: #374151; }
    .panel { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; background: #fafafa; }
    .draft { white-space: pre-wrap; line-height: 1.7; font-size: 15px; font-family: "Calibri", "Segoe UI", Arial, sans-serif; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(state.draft.title || "Draft Workspace")}</h1>
    <div class="muted">${escapeHtml(state.draft.company || "")} | ${escapeHtml(state.draft.draft_type || "")}</div>
    <div class="actions">
      ${jobUrl ? `<a class="btn" href="${escapeHtml(jobUrl)}" target="_blank" rel="noreferrer">Open Job Page</a>` : ""}
      ${mailto ? `<a class="btn alt" href="${mailto}">Open Email Composer</a>` : ""}
      <a class="btn alt" href="/">Back To Dashboard</a>
    </div>
    <div class="panel">
      <div class="muted">Paste-ready draft message</div>
      <div class="draft">${escapeHtml(state.draft.body || "")}</div>
    </div>
    <div class="muted" style="margin-top:10px">If LinkedIn opens a generic jobs page, use the role/company above and paste this draft in recruiter message or application note.</div>
  </div>
</body>
</html>`;
}

function renderReviewDraftsTable(drafts: HuntDashboardReviewDraft[], token: string): string {
  if (drafts.length === 0) return `<div class="card">No recruiter drafts waiting review.</div>`;
  const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : "";
  const rows = drafts
    .map((draft) => {
      const threadLink = draft.thread_id ? `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(draft.thread_id)}` : "";
      const draftLink = draft.draft_id ? `https://mail.google.com/mail/u/0/#drafts?compose=${encodeURIComponent(draft.draft_id)}` : "";
      return `
      <tr>
        <td>
          <div><strong>${escapeHtml(draft.sender || "Unknown")}</strong></div>
          <div class="muted">${escapeHtml(draft.subject || "")}</div>
          <div class="muted">Score: ${draft.score ?? "n/a"}</div>
          <div class="muted">${escapeHtml(draft.reason || "")}</div>
          <div class="muted">${threadLink ? `<a href="${threadLink}" target="_blank" rel="noreferrer">Open Gmail thread</a>` : ""}${draftLink ? ` | <a href="${draftLink}" target="_blank" rel="noreferrer">Open Gmail draft</a>` : ""}</div>
        </td>
        <td>
          <form method="post" action="/api/hunt-send-review-draft?id=${draft.id}${tokenQuery}">
            <button class="btn" type="submit">Send This Draft</button>
          </form>
        </td>
      </tr>`;
    })
    .join("");
  return `<table class="table"><thead><tr><th>Draft</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderRunHistoryTable(rows: HuntDashboardRun[]): string {
  if (rows.length === 0) return `<div class="card">No run history yet.</div>`;
  const body = rows
    .map((row) => {
      let summary = "";
      try {
        const parsed = JSON.parse(row.summary_json || "{}");
        summary = Object.entries(parsed).slice(0, 6).map(([k, v]) => `${k}: ${String(v)}`).join(" | ");
      } catch {
        summary = row.summary_json || "";
      }
      return `<tr><td>${escapeHtml(row.run_type)}</td><td><span class="pill">${escapeHtml(row.status)}</span></td><td>${escapeHtml(row.updated_at || "")}</td><td>${escapeHtml(summary)}</td></tr>`;
    })
    .join("");
  return `<table class="table"><thead><tr><th>Run</th><th>Status</th><th>Updated</th><th>Summary</th></tr></thead><tbody>${body}</tbody></table>`;
}

function renderHuntContactsTable(contacts: HuntDashboardContact[]): string {
  if (contacts.length === 0) return `<div class="card">No hunt contacts yet.</div>`;
  const rows = contacts
    .slice(0, 10)
    .map((contact) => `
      <tr>
        <td>${escapeHtml(contact.email || "")}</td>
        <td>${escapeHtml(contact.company || "")}</td>
        <td>${escapeHtml(contact.source || "")}</td>
      </tr>`)
    .join("");
  return `<table class="table"><thead><tr><th>Email</th><th>Company</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderHuntFollowupsTable(followups: HuntDashboardFollowup[]): string {
  if (followups.length === 0) return `<div class="card">No due follow-ups.</div>`;
  const rows = followups
    .slice(0, 10)
    .map((followup) => `
      <tr>
        <td>${escapeHtml(followup.followup_type)}</td>
        <td>${escapeHtml(followup.company || "")}</td>
        <td>${escapeHtml(followup.email || "")}</td>
        <td>${escapeHtml(followup.due_at)}</td>
      </tr>`)
    .join("");
  return `<table class="table"><thead><tr><th>Type</th><th>Company</th><th>Email</th><th>Due</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderApplicationCasesTable(cases: HuntDashboardApplicationCase[]): string {
  if (cases.length === 0) return `<div class="card">No application cases yet. Run Auto Apply after scoring and package generation.</div>`;
  const rows = cases
    .map((item) => {
      const applyLink = item.apply_url ? `<a href="${escapeHtml(item.apply_url)}" target="_blank" rel="noreferrer">Open apply URL</a>` : "";
      const finalLink = item.final_url ? `<a href="${escapeHtml(item.final_url)}" target="_blank" rel="noreferrer">Last final URL</a>` : "";
      const pause = item.pause_reason ? `<div class="muted">${escapeHtml(item.pause_reason)}</div>` : "";
      const manualTargetUrl = item.final_url || item.apply_url;
      const needsManualResume = isManualResumeStatus(item) && Boolean(manualTargetUrl);
      const isCaptcha = /captcha|turnstile|hcaptcha|recaptcha/i.test(item.pause_reason || "");
      const resumeLabel = isCaptcha ? "Open Job & Solve Captcha" : "Open Job & Resume Now";
      const resumeAction = needsManualResume
        ? `<a class="btn inline ${isCaptcha ? "warn" : ""}" href="${escapeHtml(manualTargetUrl || "")}" target="_blank" rel="noreferrer">${resumeLabel}</a>`
        : "";
      const draftMessage = extractDraftMessage(item);
      const draftAssist = draftMessage
        ? `<details><summary>Draft message for this application</summary><div class="card">${escapeHtml(draftMessage.slice(0, 2400))}</div></details>`
        : "";
      const jd = item.description ? `<details><summary>View JD</summary><div class="card">${escapeHtml(item.description.slice(0, 2400))}</div></details>` : "";
      const resume = item.resume_text ? `<details><summary>View tailored resume text</summary><div class="card">${escapeHtml(item.resume_text.slice(0, 2400))}</div></details>` : "";
      const cover = item.cover_letter_text ? `<details><summary>View cover letter text</summary><div class="card">${escapeHtml(item.cover_letter_text.slice(0, 2000))}</div></details>` : "";
      const artifactPaths = item.resume_artifact_path || item.cover_letter_artifact_path
        ? `<details><summary>View artifact file paths</summary><div class="card">${item.resume_artifact_path ? `<div><strong>Resume file:</strong> ${escapeHtml(item.resume_artifact_path)}</div>` : ""}${item.cover_letter_artifact_path ? `<div><strong>Cover letter file:</strong> ${escapeHtml(item.cover_letter_artifact_path)}</div>` : ""}</div></details>`
        : "";
      return `
      <tr>
        <td>
          <strong>${escapeHtml(item.title || "Untitled")}</strong>
          <div class="muted">${escapeHtml(item.company || "Unknown")}</div>
          <div class="muted">${escapeHtml(item.source || "")}</div>
          <div class="muted">${applyLink}${finalLink ? ` | ${finalLink}` : ""}</div>
        </td>
        <td>
          <div><span class="pill">${escapeHtml(item.job_status || "")}</span></div>
          <div style="margin-top:6px"><span class="pill">${escapeHtml(item.attempt_status || "")}</span></div>
          <div class="muted" style="margin-top:6px">Adapter: ${escapeHtml(item.adapter || "")}</div>
          ${pause}
          ${resumeAction}
        </td>
        <td>${draftAssist}${jd}${resume}${cover}${artifactPaths}</td>
      </tr>`;
    })
    .join("");
  return `<table class="table"><thead><tr><th>Role</th><th>Status</th><th>Artifacts</th></tr></thead><tbody>${rows}</tbody></table>`;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function handleAction(action: ServerAction, body: any): Promise<{ status: number; message: string }> {
  const cfg = loadConfig();
  const db = getDb();

  if (action === "auth-url") {
    return { status: 200, message: getGmailConsentUrl(cfg.env) };
  }

  if (action === "auth-save") {
    if (!body?.code || typeof body.code !== "string") {
      return { status: 400, message: "Missing code" };
    }
    await exchangeCodeAndSaveTokens(cfg.env, body.code);
    return { status: 200, message: `OAuth tokens saved at ${cfg.env.gmailTokensPath}` };
  }

  if (action === "process") {
    const inbox = await listRecruiterInboundMessages(
      cfg.env,
      cfg.rules.filters.labels.inbound,
      cfg.rules.automation.max_drafts_per_day
    );

    const outcome = await processGmailInbox({
      db,
      profile: cfg.profile,
      rules: cfg.rules,
      resumeMap: cfg.resumeMap,
      messages: inbox,
      includeTnLine: true,
      onStatusChange: async (messageId, status) => {
        await applyStatusLabel({
          cfg: cfg.env,
          messageId,
          labels: cfg.rules.filters.labels,
          status
        });
      },
      createDraft: async ({ message, subject, body: replyBody, resumePath }) =>
        createReplyDraftInThread({
          cfg: cfg.env,
          message,
          replySubject: subject,
          replyBody,
          resumePath
        })
    });

    return { status: 200, message: JSON.stringify(outcome) };
  }

  if (action === "approve") {
    const approved = approveAllDrafts(db);
    return { status: 200, message: `Approved ${approved} draft(s)` };
  }

  if (action === "send") {
    const pending = getApprovedPendingDrafts(db)
      .filter((draft) => Boolean(draft.gmail_draft_id))
      .slice(0, cfg.rules.automation.max_sends_per_day);

    let sent = 0;
    for (const draft of pending) {
      await sendDraftById(cfg.env, draft.gmail_draft_id as string);
      if (markDraftSent(db, draft.message_id)) {
        insertDecision(db, draft.message_id, "sent", "Approved Gmail draft sent");
        await applyStatusLabel({
          cfg: cfg.env,
          messageId: draft.message_id,
          labels: cfg.rules.filters.labels,
          status: "sent"
        });
        sent += 1;
      }
    }
    return { status: 200, message: `Sent ${sent} draft(s)` };
  }

  if (action === "cycle") {
    const inbox = await listRecruiterInboundMessages(
      cfg.env,
      cfg.rules.filters.labels.inbound,
      cfg.rules.automation.max_drafts_per_day
    );
    const processOutcome = await processGmailInbox({
      db,
      profile: cfg.profile,
      rules: cfg.rules,
      resumeMap: cfg.resumeMap,
      messages: inbox,
      includeTnLine: true,
      onStatusChange: async (messageId, status) => {
        await applyStatusLabel({
          cfg: cfg.env,
          messageId,
          labels: cfg.rules.filters.labels,
          status
        });
      },
      createDraft: async ({ message, subject, body: replyBody, resumePath }) =>
        createReplyDraftInThread({
          cfg: cfg.env,
          message,
          replySubject: subject,
          replyBody,
          resumePath
        })
    });
    const pending = getApprovedPendingDrafts(db)
      .filter((draft) => Boolean(draft.gmail_draft_id))
      .slice(0, cfg.rules.automation.max_sends_per_day);

    let sent = 0;
    for (const draft of pending) {
      await sendDraftById(cfg.env, draft.gmail_draft_id as string);
      if (markDraftSent(db, draft.message_id)) {
        insertDecision(db, draft.message_id, "sent", "Approved Gmail draft sent");
        await applyStatusLabel({
          cfg: cfg.env,
          messageId: draft.message_id,
          labels: cfg.rules.filters.labels,
          status: "sent"
        });
        sent += 1;
      }
    }

    return { status: 200, message: JSON.stringify({ processOutcome, approved: 0, sent, note: "Only drafts approved before this cycle were eligible to send." }) };
  }

  if (action === "report") {
    const report = buildDailyReport(db, new Date());
    const rendered = renderDailyReport(report);
    return { status: 200, message: `${rendered.subject}\n\n${rendered.body}` };
  }

  if (action === "hunt-score") {
    const scored = scoreJobs(db);
    return { status: 200, message: JSON.stringify({ scored }) };
  }

  if (action === "hunt-package") {
    const packaged = generatePackages(db);
    const outreachDrafts = generateOutreachDrafts(db);
    return { status: 200, message: JSON.stringify({ packaged, outreachDrafts }) };
  }

  if (action === "hunt-followups") {
    const followups = generateFollowups(db);
    return { status: 200, message: JSON.stringify({ followups }) };
  }

  if (action === "hunt-apply-assist") {
    const sessions = generateApplyAssist(db);
    return { status: 200, message: JSON.stringify({ sessions }) };
  }

  if (action === "hunt-interview-prep") {
    const prep = generateInterviewPrep(db);
    return { status: 200, message: JSON.stringify({ prep }) };
  }

  if (action === "hunt-applications") {
    return { status: 200, message: JSON.stringify(buildApplicationQueueReport(db)) };
  }

  if (action === "hunt-auto-apply") {
    const result = await runAutoApplyQueue({ db, cfg: cfg as any });
    return { status: 200, message: JSON.stringify(result) };
  }

  if (action === "hunt-auto-email") {
    const result = await runAutoEmailQueue({ db, cfg: cfg as any });
    return { status: 200, message: JSON.stringify(result) };
  }

  if (action === "hunt-auto-run" || action === "hunt-daily") {
    const result = await runDailyHuntAutomation({ db, cfg: cfg as any });
    return { status: 200, message: JSON.stringify(result) };
  }

  if (action === "hunt-send-review-draft") {
    const id = Number(body?.id || 0);
    if (!Number.isFinite(id) || id <= 0) return { status: 400, message: "Missing draft id" };
    const row = db.prepare("SELECT id, message_id, draft_id FROM email_auto_response_attempts WHERE id=? AND status='waiting_review' LIMIT 1").get(id) as { id: number; message_id: string; draft_id: string } | undefined;
    if (!row?.draft_id) return { status: 404, message: "Review draft not found" };
    await sendDraftById(cfg.env, row.draft_id);
    db.prepare("UPDATE email_auto_response_attempts SET status='sent', sent_message_id=?, reason=?, updated_at=? WHERE id=?").run(row.draft_id, "Manually sent from dashboard", new Date().toISOString(), row.id);
    await applyStatusLabel({ cfg: cfg.env, messageId: row.message_id, labels: cfg.rules.filters.labels, status: "sent" });
    return { status: 200, message: `Sent draft ${row.id}` };
  }

  return { status: 400, message: "Unknown action" };
}

function contentTypeFor(pathname: string): string {
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  return "text/html; charset=utf-8";
}

async function start(): Promise<void> {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const token = getControlToken();
      const providedToken = String(url.searchParams.get("token") || req.headers["x-job-agent-token"] || "");

      if (token && providedToken !== token && url.pathname.startsWith("/api/")) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      if (
        req.method === "GET" &&
        (url.pathname === "/oauth2callback" || url.searchParams.has("code") || url.searchParams.has("error"))
      ) {
        const code = url.searchParams.get("code");
        if (!code) {
          res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
          res.end(`Missing OAuth code. ${url.searchParams.get("error") || ""}`);
          return;
        }
        const cfg = loadConfig();
        await exchangeCodeAndSaveTokens(cfg.env, code);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end("<h1>Gmail OAuth saved</h1><p>You can close this tab and rerun npm run gmail:status.</p>");
        return;
      }

      if (req.method === "GET" && url.pathname === "/") {
        const cfg = loadConfig();
        const db = getDb();
        const report = buildDailyReport(db, new Date());
        const rendered = renderDailyReport(report);
        const huntDashboard = getHuntDashboard(db);
        const html = renderDashboard({
          mode: cfg.rules.automation.mode,
          authMode: cfg.env.authMode,
          reportSubject: rendered.subject,
          reportBody: rendered.body,
          huntReport: huntDashboard.report,
          applicationReport: huntDashboard.applications,
          applicationCases: huntDashboard.applicationCases,
          reviewDrafts: huntDashboard.reviewDrafts,
          runHistory: huntDashboard.runHistory,
          reviewQueue: huntDashboard.reviewQueue,
          huntJobs: huntDashboard.jobs,
          huntDrafts: huntDashboard.drafts,
          huntContacts: huntDashboard.contacts,
          huntFollowups: huntDashboard.followups,
          focus: String(url.searchParams.get("focus") || ""),
          status: "Ready",
          token
        });
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      if (req.method === "GET" && url.pathname === "/draft-workspace") {
        const id = Number(url.searchParams.get("id") || 0);
        if (!Number.isFinite(id) || id <= 0) {
          res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
          res.end("Missing or invalid draft id");
          return;
        }
        const db = getDb();
        const draft = db
          .prepare(
            `SELECT d.id, d.job_id, d.draft_type, d.body, d.status, d.created_at,
                    COALESCE(j.title, '') AS title,
                    COALESCE(j.company, '') AS company,
                    COALESCE(j.apply_url, '') AS apply_url,
                    COALESCE(j.source_url, '') AS source_url,
                    COALESCE(j.recruiter_email, '') AS recruiter_email
             FROM hunt_outreach_drafts d
             LEFT JOIN hunt_jobs j ON j.id = d.job_id
             WHERE d.id=? LIMIT 1`
          )
          .get(id) as HuntDashboardDraft | undefined;

        if (!draft) {
          res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
          res.end("Draft not found");
          return;
        }

        const html = renderDraftWorkspace({ draft, token });
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/status") {
        const cfg = loadConfig();
        const db = getDb();
        const report = buildDailyReport(db, new Date());
        const hunt = getHuntDashboard(db);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            mode: cfg.rules.automation.mode,
            authMode: cfg.env.authMode,
            report,
            hunt
          })
        );
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/hunt") {
        const db = getDb();
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(getHuntDashboard(db)));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/gmail/auth-url") {
        const cfg = loadConfig();
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ url: getGmailConsentUrl(cfg.env) }));
        return;
      }

      if (req.method === "POST" && url.pathname.startsWith("/api/")) {
        const action = url.pathname.replace("/api/", "") as ServerAction;
        const body = await readJsonBody(req);
        const merged = { ...(body as any), ...Object.fromEntries(url.searchParams.entries()) };
        const result = await handleAction(action, merged);
        res.writeHead(result.status, { "content-type": "application/json" });
        res.end(JSON.stringify(result));
        return;
      }

      res.writeHead(404, { "content-type": contentTypeFor(url.pathname) });
      res.end("Not Found");
    } catch (error) {
      logger.error({ err: error }, "HTTP server error");
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Server error" }));
    }
  });

  server.listen(PORT, HOST, () => {
    logger.info({ host: HOST, port: PORT }, "Job Reply Agent control server running.");
  });
}

start().catch((error) => {
  logger.error({ err: error }, "Failed to start control server.");
  process.exit(1);
});
