import { format } from "date-fns";
import path from "node:path";
import type Database from "better-sqlite3";
import type { DailyCounts, DailyReport, DecisionStatus, TopOpportunity } from "./types.js";

const STATUS_MAP: Array<{ status: DecisionStatus; key: keyof DailyCounts }> = [
  { status: "processed", key: "processed" },
  { status: "drafted", key: "drafted" },
  { status: "needs_review", key: "needsReview" },
  { status: "sent", key: "approvedAndSent" },
  { status: "skipped", key: "skipped" },
  { status: "blocked", key: "blocked" },
  { status: "error", key: "errors" }
];

// --- helpers ----------------------------------------------------------------

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&lsquo;|&rsquo;/gi, "'")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/&#\d+;/g, " ");
}

function stripHtml(s: string): string {
  return decodeHtmlEntities(String(s || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(raw: string | null | undefined, fallback = "Untitled role"): string {
  const cleaned = stripHtml(raw || "");
  if (!cleaned) return fallback;
  // Cut on first sentence/dash boundary so we don't paste a full job description.
  const firstChunk = cleaned.split(/[:\u2013]| - | – /)[0] || cleaned;
  const trimmed = firstChunk.length > 80 ? firstChunk.slice(0, 77) + "..." : firstChunk;
  return trimmed.trim() || fallback;
}

function classifyRemote(location: string, employmentType?: string | null): TopOpportunity["remote"] {
  const blob = `${location || ""} ${employmentType || ""}`.toLowerCase();
  if (/\bremote\b/.test(blob)) return "Remote";
  if (/\bhybrid\b/.test(blob)) return "Hybrid";
  if (/\b(onsite|on-site|on site)\b/.test(blob)) return "Onsite";
  return "Unspecified";
}

function extractEmail(sender: string | null | undefined): string | null {
  if (!sender) return null;
  const match = sender.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  const bare = sender.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return bare ? bare[0] : null;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function gmailSearchUrl(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://mail.google.com/mail/u/0/#search/${encoded}`;
}

function gmailThreadUrl(threadId: string): string {
  return `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(threadId)}`;
}

function quoteForSearch(input: string): string {
  return input.replace(/"/g, "");
}

// --- build ------------------------------------------------------------------

interface OpportunityRow {
  message_id: string;
  thread_id: string | null;
  role_title: string | null;
  company: string | null;
  location: string | null;
  employment_type: string | null;
  salary_or_rate: string | null;
  match_score: number;
  status: DecisionStatus;
  sender: string | null;
  inbound_subject: string | null;
  reply_subject: string | null;
  reply_body: string | null;
  resume_path: string | null;
}

export function buildDailyReport(db: Database.Database, date = new Date()): DailyReport {
  const reportDate = format(date, "yyyy-MM-dd");
  const counts: DailyCounts = {
    processed: 0,
    drafted: 0,
    needsReview: 0,
    approvedAndSent: 0,
    skipped: 0,
    blocked: 0,
    errors: 0
  };

  for (const entry of STATUS_MAP) {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM decisions
         WHERE status = ? AND substr(created_at, 1, 10) = ?`
      )
      .get(entry.status, reportDate) as { count: number };

    counts[entry.key] = row?.count || 0;
  }

  const oppRows = db
    .prepare(
      `SELECT o.message_id        AS message_id,
              o.thread_id         AS thread_id,
              o.role_title        AS role_title,
              o.company           AS company,
              o.location          AS location,
              o.employment_type   AS employment_type,
              o.salary_or_rate    AS salary_or_rate,
              o.match_score       AS match_score,
              m.sender            AS sender,
              m.subject           AS inbound_subject,
              dr.subject          AS reply_subject,
              dr.body             AS reply_body,
              dr.resume_path      AS resume_path,
              COALESCE((
                SELECT d2.status
                FROM decisions d2
                WHERE d2.message_id = o.message_id
                ORDER BY d2.id DESC
                LIMIT 1
              ), 'processed') AS status
       FROM opportunities o
       LEFT JOIN messages m ON m.message_id = o.message_id
       LEFT JOIN drafts dr ON dr.message_id = o.message_id
       WHERE substr(o.created_at, 1, 10) = ?
       ORDER BY o.match_score DESC
       LIMIT 5`
    )
    .all(reportDate) as OpportunityRow[];

  const topOpportunities: TopOpportunity[] = oppRows.map((r) => {
    const remote = classifyRemote(r.location || "", r.employment_type);
    const needsFollowUp =
      r.status === "sent" || r.status === "drafted" || r.status === "needs_review";
    const locClean = stripHtml(r.location || "Unspecified");
    const locShort = locClean.length > 60 ? locClean.slice(0, 57) + "..." : locClean;
    const inboundSubject = stripHtml(r.inbound_subject || "").slice(0, 120) || null;
    const replySubject = stripHtml(r.reply_subject || "").slice(0, 120) || null;
    const replyPreview = stripHtml(r.reply_body || "").slice(0, 180) || null;
    const resumeName = r.resume_path ? path.basename(r.resume_path) : null;
    const threadLink = r.thread_id ? gmailThreadUrl(r.thread_id) : null;
    const draftLink = replySubject
      ? gmailSearchUrl(`in:drafts subject:"${quoteForSearch(replySubject)}" newer_than:30d`)
      : null;
    const sentLink = replySubject
      ? gmailSearchUrl(`in:sent subject:"${quoteForSearch(replySubject)}" newer_than:30d`)
      : null;
    return {
      roleTitle: cleanTitle(r.role_title),
      company: r.company ? stripHtml(r.company).slice(0, 60) : null,
      location: locShort || "Unspecified",
      employmentType: r.employment_type ? stripHtml(r.employment_type).slice(0, 40) : null,
      salaryOrRate:
        r.salary_or_rate &&
        !/unspecified/i.test(r.salary_or_rate) &&
        /\$|\d/.test(r.salary_or_rate)
          ? stripHtml(r.salary_or_rate).slice(0, 40)
          : null,
      remote,
      matchScore: r.match_score,
      status: r.status,
      contact: extractEmail(r.sender),
      needsFollowUp,
      inboundSubject,
      replySubject,
      replyPreview,
      resumeName,
      threadLink,
      draftLink,
      sentLink
    };
  });

  const blockedRiskItems = db
    .prepare(
      `SELECT DISTINCT reason
       FROM decisions
       WHERE status = 'blocked'
         AND substr(created_at, 1, 10) = ?
         AND reason IS NOT NULL
       LIMIT 5`
    )
    .all(reportDate) as Array<{ reason: string }>;

  const pending = db
    .prepare(
      `SELECT
          SUM(CASE WHEN approved = 0 AND sent = 0 THEN 1 ELSE 0 END) AS pendingDrafts,
          SUM(CASE WHEN sent = 1 THEN 1 ELSE 0 END) AS sentCount
       FROM drafts`
    )
    .get() as { pendingDrafts: number | null; sentCount: number | null };

  const pendingNeedsReview = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM drafts dr
       WHERE dr.sent = 0
         AND COALESCE((
           SELECT d.status
           FROM decisions d
           WHERE d.message_id = dr.message_id
           ORDER BY d.id DESC
           LIMIT 1
         ), 'processed') = 'needs_review'`
    )
    .get() as { count: number };

  const suggestedTomorrowActions: string[] = [];
  if ((pendingNeedsReview?.count || 0) > 0) {
    suggestedTomorrowActions.push(
      `Review ${pendingNeedsReview.count} draft(s) under JOB AGENT/NeedsReview.`
    );
  }
  if ((pending?.pendingDrafts || 0) > 0) {
    suggestedTomorrowActions.push(
      `Approve or skip ${pending.pendingDrafts} draft(s) under JOB AGENT/Drafted.`
    );
  }
  if (suggestedTomorrowActions.length === 0) {
    suggestedTomorrowActions.push("No pending actions. Continue inbound monitoring.");
  }

  return {
    reportDate,
    counts,
    topOpportunities,
    blockedRiskItems: blockedRiskItems.map((x) => x.reason),
    suggestedTomorrowActions
  };
}

// --- render -----------------------------------------------------------------

function statusBadge(status: DecisionStatus): string {
  switch (status) {
    case "sent":
      return "SENT";
    case "drafted":
      return "DRAFT";
    case "needs_review":
      return "REVIEW";
    case "blocked":
      return "BLOCKED";
    case "skipped":
      return "SKIPPED";
    case "error":
      return "ERROR";
    default:
      return "PROCESSED";
  }
}

function statusColor(status: DecisionStatus): string {
  switch (status) {
    case "sent":
      return "#16a34a";
    case "drafted":
      return "#2563eb";
    case "needs_review":
      return "#d97706";
    case "blocked":
      return "#dc2626";
    case "skipped":
      return "#6b7280";
    case "error":
      return "#dc2626";
    default:
      return "#374151";
  }
}

export function renderDailyReport(
  report: DailyReport
): { subject: string; body: string; html: string } {
  const c = report.counts;
  const subject = `Job Agent: ${c.approvedAndSent} sent, ${c.drafted} drafted, ${c.needsReview} need review (${report.reportDate})`;

  // ----- plain text body -----
  const txt: string[] = [];
  txt.push(`Job Reply Agent - ${report.reportDate}`);
  txt.push("");
  txt.push("AT A GLANCE");
  txt.push(`  Sent:         ${c.approvedAndSent}`);
  txt.push(`  Drafted:      ${c.drafted}`);
  txt.push(`  Needs review: ${c.needsReview}`);
  txt.push(`  Skipped:      ${c.skipped}`);
  txt.push(`  Blocked:      ${c.blocked}`);
  txt.push(`  Errors:       ${c.errors}`);
  txt.push(`  Processed:    ${c.processed}`);
  txt.push("");
  txt.push("TOP OPPORTUNITIES");
  if (report.topOpportunities.length === 0) {
    txt.push("  (none today)");
  } else {
    report.topOpportunities.forEach((o, i) => {
      const company = o.company ? ` @ ${o.company}` : "";
      txt.push(`#${i + 1} [${statusBadge(o.status)}] ${o.matchScore}%  ${o.roleTitle}${company}`);
      const meta = [
        o.remote && o.remote !== "Unspecified" ? o.remote : null,
        o.location && o.location !== "Unspecified" ? o.location : null,
        o.employmentType || null,
        o.salaryOrRate ? `$ ${o.salaryOrRate}` : null
      ].filter(Boolean);
      if (meta.length) txt.push(`     ${meta.join("  |  ")}`);
      if (o.contact) txt.push(`     Contact: ${o.contact}`);
      if (o.inboundSubject) txt.push(`     Inbound: ${o.inboundSubject}`);
      if (o.replySubject) txt.push(`     Reply: ${o.replySubject}`);
      if (o.resumeName) txt.push(`     Resume: ${o.resumeName}`);
      if (o.threadLink) txt.push(`     Open thread: ${o.threadLink}`);
      txt.push(`     Follow up: ${o.needsFollowUp ? "YES" : "no"}`);
      txt.push("");
    });
  }

  txt.push("BLOCKED / RISK");
  if (report.blockedRiskItems.length === 0) {
    txt.push("  None");
  } else {
    for (const r of report.blockedRiskItems) txt.push(`  - ${r}`);
  }
  txt.push("");
  txt.push("NEXT ACTIONS");
  for (const a of report.suggestedTomorrowActions) txt.push(`  - ${a}`);

  // ----- HTML body -----
  const tile = (label: string, val: number, bg: string, href: string) => `
    <td align="center" style="padding:0;background:${bg};border-radius:8px;color:#ffffff;font-family:Arial,sans-serif;overflow:hidden;">
      <a href="${escapeHtml(href)}" target="_blank" style="display:block;padding:12px 6px;color:#ffffff;text-decoration:none;">
        <div style="font-size:11px;letter-spacing:.5px;opacity:.85">${escapeHtml(label.toUpperCase())}</div>
        <div style="font-size:22px;font-weight:700;line-height:1.1;margin-top:2px">${val}</div>
      </a>
    </td>`;

  const sentUrl = gmailSearchUrl('{label:"JOB AGENT/Sent" label:"JOBS/Sent"} newer_than:7d');
  const draftedUrl = gmailSearchUrl('{label:"JOB AGENT/Drafted" label:"JOBS/Drafted"} newer_than:7d');
  const reviewUrl = gmailSearchUrl('{label:"JOB AGENT/NeedsReview" label:"JOBS/NeedsReview"} newer_than:7d');
  const skippedUrl = gmailSearchUrl('{label:"JOB AGENT/Skipped" label:"JOBS/Skipped"} newer_than:7d');
  const blockedUrl = gmailSearchUrl('{label:"JOB AGENT/Blocked" label:"JOBS/Blocked"} newer_than:7d');
  const errorsUrl = gmailSearchUrl('{label:"JOB AGENT/Error" label:"JOBS/Error"} newer_than:7d');

  const oppRows = report.topOpportunities
    .map((o, i) => {
      const company = o.company
        ? ` <span style="color:#6b7280">@ ${escapeHtml(o.company)}</span>`
        : "";
      const metaBits = [
        o.remote && o.remote !== "Unspecified" ? o.remote : null,
        o.location && o.location !== "Unspecified" ? o.location : null,
        o.employmentType || null,
        o.salaryOrRate ? `$ ${o.salaryOrRate}` : null
      ].filter(Boolean) as string[];
      const meta = metaBits.length
        ? `<div style="font-size:13px;color:#4b5563;margin-top:4px">${metaBits.map(escapeHtml).join(" &nbsp;&middot;&nbsp; ")}</div>`
        : "";
      const contact = o.contact
        ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">Contact: <a href="mailto:${escapeHtml(o.contact)}" style="color:#2563eb;text-decoration:none">${escapeHtml(o.contact)}</a></div>`
        : "";
      const inbound = o.inboundSubject
        ? `<div style="font-size:12px;color:#1f2937;margin-top:6px"><strong>Inbound:</strong> ${escapeHtml(o.inboundSubject)}</div>`
        : "";
      const reply = o.replySubject
        ? `<div style="font-size:12px;color:#1f2937;margin-top:4px"><strong>Reply:</strong> ${escapeHtml(o.replySubject)}</div>`
        : "";
      const preview = o.replyPreview
        ? `<div style="font-size:12px;color:#4b5563;margin-top:4px"><strong>Reply preview:</strong> ${escapeHtml(o.replyPreview)}${o.replyPreview.length >= 180 ? "..." : ""}</div>`
        : "";
      const resume = o.resumeName
        ? `<div style="font-size:12px;color:#4b5563;margin-top:4px"><strong>Resume:</strong> ${escapeHtml(o.resumeName)}</div>`
        : "";
      const links: string[] = [];
      if (o.threadLink) {
        links.push(`<a href="${escapeHtml(o.threadLink)}" target="_blank" style="color:#2563eb;text-decoration:none">Open thread</a>`);
      }
      if (o.draftLink && o.status !== "sent") {
        links.push(`<a href="${escapeHtml(o.draftLink)}" target="_blank" style="color:#2563eb;text-decoration:none">Open draft</a>`);
      }
      if (o.sentLink && o.status === "sent") {
        links.push(`<a href="${escapeHtml(o.sentLink)}" target="_blank" style="color:#2563eb;text-decoration:none">Open sent reply</a>`);
      }
      const linkBlock = links.length
        ? `<div style="font-size:12px;margin-top:6px">${links.join(" &nbsp;|&nbsp; ")}</div>`
        : "";
      const followUp = o.needsFollowUp
        ? `<span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:10px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600">FOLLOW UP</span>`
        : "";
      return `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;vertical-align:top;font-family:Arial,sans-serif">
            <div>
              <span style="display:inline-block;padding:2px 8px;border-radius:10px;background:${statusColor(o.status)};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:.5px">${statusBadge(o.status)}</span>
              <span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:10px;background:#eef2ff;color:#3730a3;font-size:11px;font-weight:700">${o.matchScore}%</span>
              <span style="margin-left:6px;color:#6b7280;font-size:12px">#${i + 1}</span>
              ${followUp}
            </div>
            <div style="margin-top:6px;font-size:15px;font-weight:600;color:#111827">${escapeHtml(o.roleTitle)}${company}</div>
            ${meta}
            ${contact}
            ${inbound}
            ${reply}
            ${preview}
            ${resume}
            ${linkBlock}
          </td>
        </tr>`;
    })
    .join("");

  const emptyOpp = `<tr><td style="padding:14px 16px;color:#6b7280;font-family:Arial,sans-serif">No opportunities today.</td></tr>`;

  const risk = report.blockedRiskItems.length
    ? report.blockedRiskItems
        .map((r) => `<li style="margin:4px 0;color:#b91c1c">${escapeHtml(r)}</li>`)
        .join("")
    : `<li style="color:#6b7280">None</li>`;

  const actions = report.suggestedTomorrowActions
    .map((a) => `<li style="margin:4px 0;color:#111827">${escapeHtml(a)}</li>`)
    .join("");

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:20px 0">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,sans-serif">
        <tr><td style="padding:20px 24px;background:#111827;color:#ffffff">
          <div style="font-size:12px;letter-spacing:1px;opacity:.7">JOB REPLY AGENT</div>
          <div style="font-size:20px;font-weight:700;margin-top:2px">Daily report &mdash; ${escapeHtml(report.reportDate)}</div>
          <div style="font-size:13px;color:#9ca3af;margin-top:4px">
            ${c.approvedAndSent} sent &nbsp;&middot;&nbsp; ${c.drafted} drafted &nbsp;&middot;&nbsp; ${c.needsReview} need review
          </div>
        </td></tr>

        <tr><td style="padding:16px 16px 4px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="6">
            <tr>
              ${tile("Sent", c.approvedAndSent, "#16a34a", sentUrl)}
              ${tile("Draft", c.drafted, "#2563eb", draftedUrl)}
              ${tile("Review", c.needsReview, "#d97706", reviewUrl)}
              ${tile("Skipped", c.skipped, "#6b7280", skippedUrl)}
              ${tile("Blocked", c.blocked, "#dc2626", blockedUrl)}
              ${tile("Errors", c.errors, "#7c3aed", errorsUrl)}
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 24px 0 24px">
          <div style="font-size:12px;letter-spacing:1px;color:#6b7280;margin-top:12px">TOP OPPORTUNITIES</div>
        </td></tr>
        <tr><td style="padding:4px 8px 0 8px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb">
            ${oppRows || emptyOpp}
          </table>
        </td></tr>

        <tr><td style="padding:16px 24px 0 24px">
          <div style="font-size:12px;letter-spacing:1px;color:#6b7280">BLOCKED / RISK</div>
          <ul style="margin:6px 0 0 18px;padding:0;font-size:14px">${risk}</ul>
        </td></tr>

        <tr><td style="padding:16px 24px 24px 24px">
          <div style="font-size:12px;letter-spacing:1px;color:#6b7280">NEXT ACTIONS</div>
          <ul style="margin:6px 0 0 18px;padding:0;font-size:14px">${actions}</ul>
        </td></tr>

        <tr><td style="padding:14px 24px;background:#f9fafb;color:#6b7280;font-size:11px;border-top:1px solid #e5e7eb">
          Processed today: ${c.processed} &nbsp;&middot;&nbsp; Auto-run: every 10 minutes
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, body: txt.join("\n"), html };
}
