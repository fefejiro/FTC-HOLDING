import fs from "node:fs";
import path from "node:path";
import { google, gmail_v1 } from "googleapis";
import type { Credentials } from "google-auth-library";
import type { RecruiterMessage } from "./types.js";

export interface GmailAuthConfig {
  gmailClientId: string;
  gmailClientSecret: string;
  gmailRedirectUri: string;
  gmailTokensPath: string;
  gmailAccountEmail: string;
}

export interface GmailStatusLabelConfig {
  drafted: string;
  needs_review: string;
  sent: string;
  skipped: string;
  blocked: string;
}

export type GmailStatusLabelState = keyof GmailStatusLabelConfig;

function ensureOauthConfigured(cfg: GmailAuthConfig): void {
  if (!cfg.gmailClientId || !cfg.gmailClientSecret || !cfg.gmailRedirectUri) {
    throw new Error(
      "Missing OAuth config. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI."
    );
  }
}

function createOAuthClient(cfg: GmailAuthConfig) {
  ensureOauthConfigured(cfg);
  return new google.auth.OAuth2(cfg.gmailClientId, cfg.gmailClientSecret, cfg.gmailRedirectUri);
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function encodeBase64Url(input: Buffer | string): string {
  const raw = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return raw
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function readTokenFile(tokensPath: string): Credentials {
  if (!fs.existsSync(tokensPath)) {
    throw new Error(
      `OAuth tokens not found at ${tokensPath}. Run gmail:auth:url and gmail:auth:save first.`
    );
  }
  const raw = fs.readFileSync(tokensPath, "utf8");
  return JSON.parse(raw) as Credentials;
}

async function getGmailClient(cfg: GmailAuthConfig): Promise<gmail_v1.Gmail> {
  const oauth = createOAuthClient(cfg);
  oauth.setCredentials(readTokenFile(cfg.gmailTokensPath));
  return google.gmail({ version: "v1", auth: oauth });
}

function getHeaderValue(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  if (!headers) return "";
  const found = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return found?.value || "";
}

function extractPlainText(part: gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) return "";

  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }

  if (part.parts && part.parts.length > 0) {
    for (const child of part.parts) {
      const text = extractPlainText(child);
      if (text.trim()) {
        return text;
      }
    }
  }

  if (part.body?.data) {
    const decoded = decodeBase64Url(part.body.data);
    return decoded.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  return "";
}

function parseEmailAddress(fromHeader: string): string {
  const angle = fromHeader.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  const plain = fromHeader.trim();
  return plain.replace(/^"|"$/g, "");
}

async function resolveLabelId(gmail: gmail_v1.Gmail, labelName: string): Promise<string | null> {
  const labelsResponse = await gmail.users.labels.list({ userId: "me" });
  const label = labelsResponse.data.labels?.find((item) => item.name === labelName);
  return label?.id || null;
}

async function getOrCreateLabel(gmail: gmail_v1.Gmail, labelName: string): Promise<string> {
  const existing = await resolveLabelId(gmail, labelName);
  if (existing) return existing;

  // Create nested labels top-down (e.g. "JOB AGENT" then "JOB AGENT/Recruiter Inbound")
  const parts = labelName.split("/");
  let built = "";
  let createdId = "";
  for (const part of parts) {
    built = built ? `${built}/${part}` : part;
    const found = await resolveLabelId(gmail, built);
    if (found) {
      createdId = found;
    } else {
      const res = await gmail.users.labels.create({
        userId: "me",
        requestBody: { name: built, labelListVisibility: "labelShow", messageListVisibility: "show" }
      });
      createdId = res.data.id!;
    }
  }
  return createdId;
}

const RECRUITER_QUERY =
  "(subject:(job OR opportunity OR position OR hiring OR opening OR recruiter OR candidate OR \"job description\" OR \"new role\" OR \"exciting role\") " +
  "OR from:(recruiter OR staffing OR talent OR \"talent acquisition\" OR hiring)) " +
  "in:inbox";

export async function scanInboxForRecruiters(
  cfg: GmailAuthConfig,
  inboundLabelName: string,
  maxScan = 50
): Promise<{ scanned: number; labeled: number }> {
  const gmail = await getGmailClient(cfg);
  const labelId = await getOrCreateLabel(gmail, inboundLabelName);

  // Search inbox for recruiter-like emails not already labeled
  const list = await gmail.users.messages.list({
    userId: "me",
    q: `${RECRUITER_QUERY} -label:"${inboundLabelName}"`,
    maxResults: maxScan
  });

  const messages = list.data.messages ?? [];
  let labeled = 0;

  for (const msg of messages) {
    if (!msg.id) continue;
    await gmail.users.messages.modify({
      userId: "me",
      id: msg.id,
      requestBody: { addLabelIds: [labelId] }
    });
    labeled += 1;
  }

  return { scanned: messages.length, labeled };
}

export function getGmailConsentUrl(cfg: GmailAuthConfig): string {
  const oauth = createOAuthClient(cfg);
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.compose"
    ]
  });
}

export async function exchangeCodeAndSaveTokens(cfg: GmailAuthConfig, code: string): Promise<void> {
  const oauth = createOAuthClient(cfg);
  const normalizedCode = code.trim();
  const { tokens } = await oauth.getToken(normalizedCode);

  if (!tokens.refresh_token) {
    throw new Error("No refresh_token returned. Re-run auth with prompt=consent.");
  }

  const targetPath = cfg.gmailTokensPath;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(tokens, null, 2), "utf8");
}

export async function listRecruiterInboundMessages(
  cfg: GmailAuthConfig,
  inboundLabelName: string,
  maxResults = 20
): Promise<RecruiterMessage[]> {
  const gmail = await getGmailClient(cfg);
  const labelId = await resolveLabelId(gmail, inboundLabelName);
  if (!labelId) {
    return [];
  }

  const list = await gmail.users.messages.list({
    userId: "me",
    labelIds: [labelId],
    maxResults
  });

  const ids = (list.data.messages ?? []).map((m) => m.id).filter(Boolean) as string[];
  if (ids.length === 0) return [];
  const output: RecruiterMessage[] = [];

  for (const id of ids) {
    const messageResponse = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full"
    });

    const payload = messageResponse.data.payload;
    const headers = payload?.headers;

    const subject = getHeaderValue(headers, "Subject") || "(No Subject)";
    const from = getHeaderValue(headers, "From") || "Unknown Sender";
    const dateHeader = getHeaderValue(headers, "Date");
    const internetMessageId = getHeaderValue(headers, "Message-ID");
    const references = getHeaderValue(headers, "References");
    const body = extractPlainText(payload) || messageResponse.data.snippet || "";

    let receivedAt = new Date().toISOString();
    if (dateHeader) {
      const asDate = new Date(dateHeader);
      if (!Number.isNaN(asDate.getTime())) {
        receivedAt = asDate.toISOString();
      }
    }

    output.push({
      messageId: id,
      threadId: messageResponse.data.threadId || id,
      from,
      subject,
      body,
      receivedAt,
      internetMessageId: internetMessageId || undefined,
      references: references || undefined
    });
  }

  return output;
}

function buildMimeMessage(params: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
  attachmentPath?: string;
}): string {
  const headers = [
    `To: ${params.to}`,
    "MIME-Version: 1.0",
    `Subject: ${params.subject}`
  ];

  if (params.inReplyTo) {
    headers.push(`In-Reply-To: ${params.inReplyTo}`);
  }
  if (params.references) {
    headers.push(`References: ${params.references}`);
  }

  const attachmentPath = params.attachmentPath;
  const hasAttachment = Boolean(attachmentPath && fs.existsSync(attachmentPath));
  const hasHtml = Boolean(params.html);

  if (!hasAttachment && !hasHtml) {
    return `${headers.join("\r\n")}\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\n\r\n${params.body}`;
  }

  // alternative part if html present
  const altBoundary = `jra-alt-${Date.now()}`;
  const altPart = hasHtml
    ? [
        `Content-Type: multipart/alternative; boundary=\"${altBoundary}\"`,
        "",
        `--${altBoundary}`,
        "Content-Type: text/plain; charset=\"UTF-8\"",
        "",
        params.body,
        "",
        `--${altBoundary}`,
        "Content-Type: text/html; charset=\"UTF-8\"",
        "",
        params.html as string,
        "",
        `--${altBoundary}--`
      ].join("\r\n")
    : null;

  if (!hasAttachment && hasHtml && altPart) {
    return `${headers.join("\r\n")}\r\n${altPart}`;
  }

  const boundary = `job-reply-agent-${Date.now()}`;
  const attachmentBuffer = fs.readFileSync(attachmentPath as string);
  const fileName = path.basename(attachmentPath as string);

  const bodyPart = hasHtml && altPart
    ? altPart
    : ["Content-Type: text/plain; charset=\"UTF-8\"", "", params.body].join("\r\n");

  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    bodyPart,
    "",
    `--${boundary}`,
    `Content-Type: application/pdf; name=\"${fileName}\"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename=\"${fileName}\"`,
    "",
    attachmentBuffer.toString("base64"),
    "",
    `--${boundary}--`
  ].join("\r\n");
}

export async function createReplyDraftInThread(params: {
  cfg: GmailAuthConfig;
  message: RecruiterMessage;
  replySubject: string;
  replyBody: string;
  resumePath?: string;
}): Promise<{ draftId: string; recipientEmail: string }> {
  const gmail = await getGmailClient(params.cfg);
  const recipientEmail = parseEmailAddress(params.message.from);

  const rawMime = buildMimeMessage({
    to: recipientEmail,
    subject: params.replySubject,
    body: params.replyBody,
    inReplyTo: params.message.internetMessageId,
    references: params.message.references || params.message.internetMessageId,
    attachmentPath: params.resumePath
  });

  const draft = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        threadId: params.message.threadId,
        raw: encodeBase64Url(rawMime)
      }
    }
  });

  if (!draft.data.id) {
    throw new Error("Failed to create Gmail draft: missing draft id.");
  }

  return {
    draftId: draft.data.id,
    recipientEmail
  };
}

export async function sendDraftById(cfg: GmailAuthConfig, draftId: string): Promise<void> {
  const gmail = await getGmailClient(cfg);
  await gmail.users.drafts.send({
    userId: "me",
    requestBody: {
      id: draftId
    }
  });
}

export async function sendPlainTextEmail(params: {
  cfg: GmailAuthConfig;
  to: string;
  subject: string;
  body: string;
  html?: string;
}): Promise<void> {
  const gmail = await getGmailClient(params.cfg);
  const mime = buildMimeMessage({
    to: params.to,
    subject: params.subject,
    body: params.body,
    html: params.html
  });

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeBase64Url(mime)
    }
  });
}

export async function applyStatusLabel(params: {
  cfg: GmailAuthConfig;
  messageId: string;
  labels: GmailStatusLabelConfig;
  status: GmailStatusLabelState;
}): Promise<void> {
  const gmail = await getGmailClient(params.cfg);

  const desiredLabelName = params.labels[params.status];
  const desiredLabelId = await getOrCreateLabel(gmail, desiredLabelName);

  const managedLabelIds: string[] = [];
  for (const labelName of Object.values(params.labels)) {
    const labelId = await getOrCreateLabel(gmail, labelName);
    managedLabelIds.push(labelId);
  }

  const removeLabelIds = managedLabelIds.filter((labelId) => labelId !== desiredLabelId);

  await gmail.users.messages.modify({
    userId: "me",
    id: params.messageId,
    requestBody: {
      addLabelIds: [desiredLabelId],
      removeLabelIds
    }
  });
}
