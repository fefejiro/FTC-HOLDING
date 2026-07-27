import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
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
  approved: string;
}

export type GmailStatusLabelState = keyof GmailStatusLabelConfig;

function ensureOauthConfigured(cfg: GmailAuthConfig): void {
  if (!cfg.gmailClientId || !cfg.gmailClientSecret || !cfg.gmailRedirectUri) {
    throw new Error(
      "Missing OAuth config. Set GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REDIRECT_URI or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI."
    );
  }
}

function createOAuthClient(cfg: GmailAuthConfig) {
  ensureOauthConfigured(cfg);
  return new google.auth.OAuth2(cfg.gmailClientId, cfg.gmailClientSecret, cfg.gmailRedirectUri);
}

function pkcePath(cfg: GmailAuthConfig): string {
  return path.join(path.dirname(path.resolve(cfg.gmailTokensPath)), "gmail_oauth_pkce.json");
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64Url(crypto.randomBytes(64));
  return { verifier, challenge: createPkceChallenge(verifier) };
}

function createPkceChallenge(verifier: string): string {
  return base64Url(crypto.createHash("sha256").update(verifier).digest());
}

function savePkceVerifier(cfg: GmailAuthConfig, verifier: string): void {
  const file = pkcePath(cfg);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ verifier, createdAt: new Date().toISOString() }, null, 2), "utf8");
}

function readPkceVerifier(cfg: GmailAuthConfig): string | null {
  const file = pkcePath(cfg);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { verifier?: string };
    return parsed.verifier || null;
  } catch {
    return null;
  }
}

function getReusablePkcePair(cfg: GmailAuthConfig): { verifier: string; challenge: string } {
  const existingVerifier = readPkceVerifier(cfg);
  if (existingVerifier) {
    return { verifier: existingVerifier, challenge: createPkceChallenge(existingVerifier) };
  }

  const pkce = createPkcePair();
  savePkceVerifier(cfg, pkce.verifier);
  return pkce;
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
      `OAuth tokens not found at ${tokensPath}. Run npm run serve, then npm run gmail:auth:url.`
    );
  }
  const raw = fs.readFileSync(tokensPath, "utf8");
  return JSON.parse(raw) as Credentials;
}

function getTokenCandidates(tokensPath: string): string[] {
  const resolved = path.resolve(tokensPath);
  const dir = path.dirname(resolved);
  const base = path.basename(resolved);
  const prefix = base.replace(/\.json$/i, "").split(".")[0] || "gmail_tokens";

  const candidates = new Set<string>([resolved]);
  if (!fs.existsSync(dir)) {
    return [resolved];
  }

  const files = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .map((name) => path.join(dir, name))
    .sort((a, b) => {
      const aTime = fs.statSync(a).mtimeMs;
      const bTime = fs.statSync(b).mtimeMs;
      return bTime - aTime;
    });

  for (const file of files) {
    candidates.add(file);
  }

  return Array.from(candidates);
}

function isInvalidGrant(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/invalid_grant/i.test(message)) {
    return true;
  }

  const maybeResponse = (error as any)?.response?.data;
  return /invalid_grant/i.test(String(maybeResponse?.error || ""));
}

function buildReauthHint(cfg: GmailAuthConfig): string {
  const consentUrl = getGmailConsentUrl(cfg);
  return [
    `Gmail OAuth token is invalid/revoked at ${cfg.gmailTokensPath}.`,
    `Configured redirect URI: ${cfg.gmailRedirectUri}`,
    "Google Cloud must allow that exact redirect URI for this OAuth client.",
    "Re-auth steps:",
    "1) Start the local callback server: npm run serve",
    `2) Open consent URL: ${consentUrl}`,
    "3) Finish Google consent; the callback should save tokens automatically.",
    "4) Verify with: npm run gmail:status",
    "Fallback: if Google leaves a code in the browser URL instead of hitting the callback, run npm run gmail:auth:save -- --code=<PASTE_CODE>."
  ].join("\n");
}

async function getGmailClient(cfg: GmailAuthConfig): Promise<gmail_v1.Gmail> {
  const candidates = getTokenCandidates(cfg.gmailTokensPath);
  let lastError: unknown;

  for (const candidatePath of candidates) {
    try {
      const oauth = createOAuthClient(cfg);
      oauth.setCredentials(readTokenFile(candidatePath));
      const gmail = google.gmail({ version: "v1", auth: oauth });

      // Force a lightweight authenticated call so revoked tokens fail early.
      await gmail.users.getProfile({ userId: "me" });

      if (candidatePath !== path.resolve(cfg.gmailTokensPath)) {
        fs.mkdirSync(path.dirname(cfg.gmailTokensPath), { recursive: true });
        fs.copyFileSync(candidatePath, cfg.gmailTokensPath);
      }

      return gmail;
    } catch (error) {
      lastError = error;
      if (!isInvalidGrant(error)) {
        throw error;
      }
    }
  }

  const hint = buildReauthHint(cfg);
  throw new Error(`${hint}\n\nOriginal error: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

export async function checkGmailAuthStatus(cfg: GmailAuthConfig): Promise<{
  ok: boolean;
  accountEmail: string;
  tokenPath: string;
  redirectUri: string;
  message: string;
}> {
  try {
    const gmail = await getGmailClient(cfg);
    const profile = await gmail.users.getProfile({ userId: "me" });
    const accountEmail = (profile.data.emailAddress || "").trim().toLowerCase();
    const expectedEmail = (cfg.gmailAccountEmail || "").trim().toLowerCase();
    if (expectedEmail && accountEmail !== expectedEmail) {
      return {
        ok: false,
        accountEmail,
        tokenPath: path.resolve(cfg.gmailTokensPath),
        redirectUri: cfg.gmailRedirectUri,
        message: `Gmail identity mismatch: expected ${expectedEmail}, authenticated as ${accountEmail || "(unknown)"}.`
      };
    }
    return {
      ok: true,
      accountEmail,
      tokenPath: path.resolve(cfg.gmailTokensPath),
      redirectUri: cfg.gmailRedirectUri,
      message: "Gmail OAuth token is valid."
    };
  } catch (error) {
    return {
      ok: false,
      accountEmail: cfg.gmailAccountEmail || "",
      tokenPath: path.resolve(cfg.gmailTokensPath),
      redirectUri: cfg.gmailRedirectUri,
      message: error instanceof Error ? error.message : String(error)
    };
  }
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

export function getGmailConsentUrl(cfg: GmailAuthConfig, options: { fresh?: boolean } = {}): string {
  const oauth = createOAuthClient(cfg);
  const pkce = options.fresh ? createPkcePair() : getReusablePkcePair(cfg);
  if (options.fresh) {
    savePkceVerifier(cfg, pkce.verifier);
  }
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    code_challenge: pkce.challenge,
    code_challenge_method: "S256" as any,
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
  const codeVerifier = readPkceVerifier(cfg);
  const response = codeVerifier
    ? await oauth.getToken({ code: normalizedCode, codeVerifier } as any)
    : await oauth.getToken(normalizedCode);
  const { tokens } = response;

  if (!tokens.refresh_token) {
    throw new Error("No refresh_token returned. Re-run auth with prompt=consent.");
  }

  const targetPath = cfg.gmailTokensPath;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, JSON.stringify(tokens, null, 2), "utf8");
  fs.rmSync(pkcePath(cfg), { force: true });
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

function getAttachmentMime(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".doc") return "application/msword";
  if (ext === ".txt") return "text/plain";
  return "application/octet-stream";
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
    `Content-Type: ${getAttachmentMime(fileName)}; name=\"${fileName}\"`,
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

export async function createDraftFromStoredContent(params: {
  cfg: GmailAuthConfig;
  threadId: string;
  to: string;
  subject: string;
  body: string;
  resumePath?: string;
}): Promise<{ draftId: string }> {
  const gmail = await getGmailClient(params.cfg);
  const rawMime = buildMimeMessage({
    to: params.to,
    subject: params.subject,
    body: params.body,
    attachmentPath: params.resumePath
  });

  const draft = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: {
        threadId: params.threadId,
        raw: encodeBase64Url(rawMime)
      }
    }
  });

  if (!draft.data.id) {
    throw new Error("Failed to recreate Gmail draft: missing draft id.");
  }

  return { draftId: draft.data.id };
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
