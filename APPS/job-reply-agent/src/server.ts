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
import { buildHuntReport, generateOutreachDrafts, generatePackages, scoreJobs } from "./hunt.js";

type ServerAction =
  | "auth-url"
  | "auth-save"
  | "process"
  | "approve"
  | "send"
  | "cycle"
  | "report"
  | "hunt-score"
  | "hunt-package";

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

function renderDashboard(state: {
  mode: string;
  authMode: string;
  reportSubject: string;
  reportBody: string;
  huntReport: HuntDashboardReport;
  huntJobs: HuntDashboardJob[];
  huntDrafts: HuntDashboardDraft[];
  status: string;
  token: string;
}): string {
  const controls = [
    ["auth-url", "Get Gmail Auth URL"],
    ["process", "Process Gmail Inbox"],
    ["approve", "Approve Drafts"],
    ["send", "Send Approved"],
    ["cycle", "Run Full Cycle"],
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
        <div class="card">${escapeHtml(state.reportSubject)}\n\n${escapeHtml(state.reportBody)}</div>
      </div>
      <div class="section">
        <div class="eyebrow">Hunt OS</div>
        <div class="metric-grid">${renderHuntMetrics(state.huntReport)}</div>
        <div class="section">
          <div class="muted">Latest jobs</div>
          ${renderHuntJobsTable(state.huntJobs)}
        </div>
        <div class="section">
          <div class="muted">Outreach drafts waiting</div>
          ${renderHuntDraftsTable(state.huntDrafts)}
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
        </div>
        <div class="section">
          <div class="muted">These actions only score, package, and create waiting outreach drafts. They do not send, apply, or submit.</div>
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
  needs_review: number;
  blocked: number;
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
  needs_review: number;
}

interface HuntDashboardDraft {
  id: number;
  job_id: number;
  draft_type: string;
  body: string;
  status: string;
  created_at: string;
}

function getHuntDashboard(db = getDb()): {
  report: HuntDashboardReport;
  jobs: HuntDashboardJob[];
  drafts: HuntDashboardDraft[];
} {
  const report = JSON.parse(buildHuntReport(db)) as HuntDashboardReport;
  const jobs = db
    .prepare("SELECT id,title,company,source,status,score,needs_review FROM hunt_jobs ORDER BY id DESC LIMIT 10")
    .all() as HuntDashboardJob[];
  const drafts = db
    .prepare("SELECT id,job_id,draft_type,body,status,created_at FROM hunt_outreach_drafts WHERE status='waiting' ORDER BY id DESC LIMIT 10")
    .all() as HuntDashboardDraft[];
  return { report, jobs, drafts };
}

function renderHuntMetrics(report: HuntDashboardReport): string {
  const metrics: Array<[string, number | string]> = [
    ["Discovered", report.discovered],
    ["Scored", report.scored],
    ["Generated", report.package_generated],
    ["Drafts", report.outreach_drafts_waiting],
    ["Review", report.needs_review],
    ["Blocked", report.blocked]
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
        <td>${job.score ?? ""}</td>
      </tr>`)
    .join("");
  return `<table class="table"><thead><tr><th>Role</th><th>Company</th><th>Source</th><th>Status</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderHuntDraftsTable(drafts: HuntDashboardDraft[]): string {
  if (drafts.length === 0) return `<div class="card">No waiting outreach drafts.</div>`;
  const rows = drafts
    .map((draft) => `
      <tr>
        <td>${escapeHtml(draft.draft_type)}</td>
        <td>${escapeHtml(draft.body)}</td>
        <td><span class="pill">${escapeHtml(draft.status)}</span></td>
      </tr>`)
    .join("");
  return `<table class="table"><thead><tr><th>Type</th><th>Draft</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
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
    const approved = approveAllDrafts(db);
    const pending = getApprovedPendingDrafts(db).filter((draft) => Boolean(draft.gmail_draft_id));

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

    return { status: 200, message: JSON.stringify({ processOutcome, approved, sent }) };
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
          huntJobs: huntDashboard.jobs,
          huntDrafts: huntDashboard.drafts,
          status: "Ready",
          token
        });
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
        const result = await handleAction(action, body);
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
