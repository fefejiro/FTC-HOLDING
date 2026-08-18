import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  authenticatedUser,
  clearSessionCookie,
  createSession,
  createTotpSecret,
  csrfTokenAllowed,
  hasRecentAuthentication,
  hashPassword,
  publicProductUser,
  revokeAllSessions,
  revokeCurrentSession,
  setSessionCookies,
  verifyTotp,
  verifyPassword
} from "./product_auth.js";
import { assertProductDatabaseRole, getProductPool, migrateProductDb } from "./product_db.js";
import { configuredPublicSignupCap } from "./product_registration.js";
import { executeIdempotentMutation, normalizeIdempotencyKey, type MutationResponse } from "./product_idempotency.js";
import {
  beginProductGmailOAuth,
  completeProductGmailOAuth,
  productGmailOAuthConfig,
  revokeProductGmailOAuth
} from "./product_gmail_oauth.js";
import {
  completeProductObjectDeletion,
  deleteProductAccount,
  deleteProductResume,
  decideProductApproval,
  exportProductAccount,
  generateProductJobInsight,
  getCareerTruthBank,
  getProductJobInsight,
  getProductApplicationEvidenceObject,
  getProductOnboarding,
  getProductResumeBySha,
  getProductResumeObject,
  listProductConnections,
  listProductInterviewPrep,
  listProductPrivateStorageObjects,
  listProductResumes,
  productActivationReadiness,
  productApplicationTimeline,
  productAuditLog,
  productConversionAnalytics,
  productDashboard,
  productJobMatchExists,
  createProductInterviewPrep,
  recordProductOutcome,
  requestProductConnection,
  revokeProductConnection,
  saveCareerTruthBank,
  saveProductOnboarding,
  saveProductResume,
  setProductAccountStatus
} from "./product_repository.js";
import {
  assertPrivateStorageOwnership,
  assertResumeStorageOwnership,
  buildProofStorageKey,
  buildResumeStorageKey,
  createProductObjectStorage,
  type ProductObjectStorage
} from "./product_object_storage.js";
import {
  authAttemptKey,
  clearProductAuthFailures,
  consumeProductInvitation,
  createEmailVerificationToken,
  createInboundAlias,
  createPasswordResetForEmail,
  createProductInvitation,
  createRunnerEnrollment,
  discardPasswordResetForUser,
  discardProductInvitation,
  enableProductMfa,
  enrollRunnerDevice,
  ensureConnectorCapabilities,
  getAutomationPolicy,
  getDecryptedMfaSecret,
  getRunnerProofObject,
  heartbeatRunner,
  isProductAuthBlocked,
  leaseRunnerTask,
  linkInvitationUser,
  normalizedEmail,
  recordConsentSnapshot,
  recordProductAuthFailure,
  recordRunnerNonce,
  resetProductPassword,
  runnerCredential,
  runnerSignature,
  saveAutomationPolicy,
  saveEncryptedMfaSecret,
  saveRunnerProof,
  storeInboundMessage,
  updateConnectorCapability,
  verifyProductEmail
} from "./product_public_beta_repository.js";
import {
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  transactionalEmailConfigured,
  verifyResendWebhook
} from "./product_email.js";
import type { ApplicationProof, ConnectorSource, ConnectorStatus } from "./product_domain.js";
import { connectorStatusSurface } from "./product_release_gates.js";
import { validateResumeUpload } from "./product_resume.js";
import { productSecretKeyring } from "./product_secret_crypto.js";
import { productReleaseInfo } from "./product_release.js";
import {
  applyBillingEvent,
  billingUsageSummary,
  consumePlanUsage,
  createBillingCheckout,
  createBillingPortal,
  recordFunnelEvent,
  verifyBillingPayloadSignature
} from "./product_billing.js";
import { billingCheckoutEnabled, publicPlans } from "./product_plans.js";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const CONSENT_VERSION = "2026-08-17";
const MAX_BODY_BYTES = 7_500_000;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_ROOT = path.join(ROOT, "public");

const registrationSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(12).max(200),
  inviteToken: z.string().max(500).optional(),
  acquisition: z.object({
    source: z.string().max(100).optional(),
    medium: z.string().max(100).optional(),
    campaign: z.string().max(150).optional(),
    content: z.string().max(150).optional(),
    term: z.string().max(150).optional(),
    referral: z.string().max(500).optional()
  }).default({})
});

const billingCheckoutSchema = z.object({
  planCode: z.enum(["sprint_weekly", "jobagent_monthly", "jobagent_annual"])
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(200),
  mfaCode: z.string().regex(/^\d{6}$/).optional()
});

const onboardingSchema = z.object({
  fullName: z.string().min(2).max(150),
  phone: z.string().min(5).max(50),
  location: z.string().min(2).max(180),
  linkedIn: z.string().url().max(500),
  targetTitles: z.array(z.string().min(2).max(150)).min(1).max(30),
  excludedTitles: z.array(z.string().max(150)).max(30).default([]),
  locations: z.array(z.string().min(2).max(150)).min(1).max(30),
  workModes: z.array(z.enum(["remote", "hybrid", "onsite"])).min(1),
  employmentTypes: z.array(z.string().min(2).max(80)).min(1).max(10),
  compensationFloor: z.string().min(2).max(180),
  workAuthorization: z.string().min(2).max(500),
  sponsorshipRequired: z.boolean(),
  timeZone: z.string().min(1).max(80).default("UTC"),
  consent: z.object({
    truthConfirmed: z.literal(true),
    recruiterDrafts: z.boolean(),
    recruiterSends: z.boolean(),
    assistedApplications: z.boolean(),
    controlledSubmissions: z.boolean()
  })
});

const resumeUploadSchema = z.object({
  filename: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(150),
  base64: z.string().min(1).max(7_100_000),
  isDefault: z.boolean().default(false)
});

const careerTruthSchema = z.object({
  facts: z.array(z.object({
    id: z.string().min(8).max(100).optional(),
    category: z.string().min(2).max(80),
    statement: z.string().min(3).max(1000),
    sourceResumeId: z.string().uuid().optional(),
    verificationStatus: z.literal("approved").optional(),
    provenance: z.record(z.string(), z.unknown()).optional()
  })).min(1).max(300)
});

const connectionSchema = z.object({
  provider: z.enum(["gmail", "linkedin", "indeed", "dice", "monster"])
});

const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"])
});

const accountDeletionSchema = z.object({
  password: z.string().min(1).max(200),
  confirmation: z.literal("DELETE")
});

const tokenSchema = z.object({
  token: z.string().min(20).max(500)
});

const passwordResetRequestSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase())
});

const passwordResetSchema = z.object({
  token: z.string().min(20).max(500),
  password: z.string().min(12).max(200)
});

const mfaCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/)
});

const automationPolicySchema = z.object({
  mode: z.enum(["assist", "approval_required", "controlled_autopilot"]),
  recruiterDrafts: z.boolean(),
  recruiterSends: z.boolean(),
  assistedApplications: z.boolean(),
  controlledSubmissions: z.boolean(),
  maxDraftsPerDay: z.number().int().min(0).max(50),
  maxRecruiterSendsPerDay: z.number().int().min(0).max(10),
  maxApplicationsPerDay: z.number().int().min(0).max(10),
  maxApplicationsPerBoard: z.number().int().min(0).max(5),
  quietHoursStart: z.number().int().min(0).max(23),
  quietHoursEnd: z.number().int().min(0).max(23),
  timeZone: z.string().min(1).max(80)
});

const invitationSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  role: z.enum(["candidate", "operator", "admin"]).default("candidate"),
  expiresInHours: z.number().int().min(1).max(168).default(72)
});

const runnerEnrollmentSchema = z.object({
  token: z.string().min(20).max(500),
  name: z.string().min(2).max(100),
  platform: z.string().min(2).max(100)
});

const runnerProofSchema = z.object({
  candidateUserId: z.string().uuid(),
  applicationId: z.string().uuid().nullable().optional(),
  taskId: z.string().uuid(),
  source: z.enum(["linkedin", "indeed", "dice", "monster"]),
  resultStatus: z.enum([
    "submitted_verified",
    "submitted_unverified",
    "manual_gate",
    "blocked_auth",
    "blocked_proof",
    "failed"
  ]),
  resumeId: z.string().uuid().nullable().optional(),
  answers: z.record(z.string(), z.unknown()).default({}),
  finalUrl: z.string().url().nullable().optional(),
  evidenceReference: z.string().min(1).max(1000).nullable().optional(),
  capturedAt: z.string().datetime()
});

const runnerEvidenceSchema = z.object({
  filename: z.string().min(1).max(180),
  mimeType: z.enum(["image/png", "image/jpeg", "application/pdf"]),
  base64: z.string().min(1).max(7_100_000)
});

const connectorCertificationSchema = z.object({
  source: z.enum(["gmail", "linkedin", "indeed", "dice", "monster"]),
  status: z.enum([
    "certified_live",
    "pilot_only",
    "manual_only",
    "blocked_auth",
    "blocked_proof",
    "disabled"
  ]),
  evidenceReference: z.string().max(1000).nullable().optional(),
  accountIdentifier: z.string().max(320).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  blockingReason: z.string().max(1000).nullable().optional()
});

const trustAnalysisSchema = z.object({
  jobDescription: z.string().min(50).max(100_000)
});

const outcomeSchema = z.object({
  outcomeType: z.enum([
    "recruiter_reply", "screening", "interview",
    "offer", "rejection", "withdrawal"
  ]),
  metadata: z.record(z.string(), z.unknown()).default({})
});

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: IncomingMessage): string {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function rateLimited(
  req: IncomingMessage,
  scope: string,
  limit: number,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const key = `${scope}:${clientKey(req)}`;
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function requestRateLimit(req: IncomingMessage, pathname: string): boolean {
  const method = req.method || "GET";
  const authenticationPath = pathname === "/api/v1/auth/login"
    || pathname === "/api/v1/auth/register"
    || pathname === "/api/v1/auth/password-reset/request"
    || pathname === "/api/v1/auth/password-reset/confirm";
  if (authenticationPath) return rateLimited(req, "authentication", 20);
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return rateLimited(req, "mutation", 120);
  }
  return false;
}

function securityHeaders(res: ServerResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  securityHeaders(res);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

function html(res: ServerResponse, status: number, body: string): void {
  securityHeaders(res);
  res.writeHead(status, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(body);
}

function redirect(res: ServerResponse, location: string, status = 303): void {
  securityHeaders(res);
  res.writeHead(status, { location, "cache-control": "no-store" });
  res.end();
}

function fileResponse(res: ServerResponse, file: { filename: string; mimeType: string; content: Buffer }): void {
  securityHeaders(res);
  const filename = file.filename.replace(/["\r\n]/g, "_");
  res.writeHead(200, {
    "content-type": file.mimeType,
    "content-length": file.content.length,
    "content-disposition": `attachment; filename="${filename}"`,
    "cache-control": "private, no-store"
  });
  res.end(file.content);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const content = await readText(req);
  return content ? JSON.parse(content) : {};
}

async function readText(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) throw new Error("Request body exceeds the allowed size.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function idempotentMutation(
  req: IncomingMessage,
  res: ServerResponse,
  input: {
    db: ReturnType<typeof getProductPool>;
    userId: string;
    requestPath: string;
    body: unknown;
    action: () => Promise<MutationResponse>;
  }
): Promise<void> {
  let key: string;
  try {
    key = normalizeIdempotencyKey(req.headers["idempotency-key"] || req.headers["x-idempotency-key"]);
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Invalid idempotency key." });
  }
  const response = await executeIdempotentMutation(input.db, {
    userId: input.userId,
    key,
    method: req.method || "POST",
    requestPath: input.requestPath,
    body: input.body,
    action: input.action
  });
  if (response.replayed) res.setHeader("Idempotency-Replayed", "true");
  return json(res, response.status, response.body);
}

export function mutationOriginAllowed(req: IncomingMessage): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "")) return true;
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (pathname === "/api/v1/webhooks/resend/inbound"
      || pathname === "/api/v1/internal/billing/events"
      || pathname === "/api/v1/runner/enroll"
      || pathname.startsWith("/api/v1/runner/device/")) return true;
  const allowedOrigins = [
    process.env.APP_ORIGIN,
    ...String(process.env.APP_ALLOWED_ORIGINS || "").split(",")
  ]
    .map((value) => String(value || "").trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (!allowedOrigins.length) return process.env.NODE_ENV !== "production";
  const requestOrigin = String(req.headers.origin || "").replace(/\/$/, "");
  return allowedOrigins.includes(requestOrigin);
}

export function constantEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function authenticateRunnerRequest(
  req: IncomingMessage,
  pathname: string,
  rawBody: string,
  db: ReturnType<typeof getProductPool>
): Promise<{ deviceId: string; userId: string; secret: string } | null> {
  const deviceId = String(req.headers["x-runner-device-id"] || "");
  const timestamp = String(req.headers["x-runner-timestamp"] || "");
  const nonce = String(req.headers["x-runner-nonce"] || "");
  const signature = String(req.headers["x-runner-signature"] || "");
  if (!/^[0-9a-f-]{36}$/i.test(deviceId)
      || !/^\d{10,13}$/.test(timestamp)
      || nonce.length < 16
      || signature.length < 32) return null;
  const timestampMs = timestamp.length === 10 ? Number(timestamp) * 1000 : Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60_000) return null;
  const credential = await runnerCredential(db, deviceId);
  if (!credential || credential.status !== "active") return null;
  const expected = runnerSignature(credential.secret, {
    method: req.method || "GET",
    pathname,
    timestamp,
    nonce,
    bodyHash: crypto.createHash("sha256").update(rawBody).digest("hex")
  });
  if (!constantEqual(expected, signature)) return null;
  if (!await recordRunnerNonce(db, credential.userId, deviceId, nonce)) return null;
  return { deviceId, userId: credential.userId, secret: credential.secret };
}

function operatorAllowed(user: Awaited<ReturnType<typeof authenticatedUser>>): boolean {
  return Boolean(
    user
    && ["operator", "admin"].includes(user.role)
    && user.mfaEnabled
    && user.emailVerifiedAt
    && hasRecentAuthentication(user)
  );
}

function renderPage(authenticated: boolean): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#17202a">
  <link rel="manifest" href="/manifest.webmanifest">
  <title>Una Labs JobAgent</title>
  <style>
    :root{font-family:Inter,system-ui,sans-serif;color:#17202a;background:#f4f6f8}
    *{box-sizing:border-box}body{margin:0}header{background:#17202a;color:#fff;padding:18px 24px;border-bottom:4px solid #d45113}
    header strong{font-size:20px}main{max-width:920px;margin:auto;padding:24px}.band{padding:22px 0;border-bottom:1px solid #cfd6dc}
    h1,h2{letter-spacing:0;margin:0 0 12px}h1{font-size:clamp(28px,6vw,46px)}p{color:#58636d;max-width:68ch}
    form{display:grid;gap:14px;max-width:680px}label{display:grid;gap:6px;font-weight:650}
    input,textarea,select{width:100%;padding:12px;border:1px solid #9ca8b3;background:#fff;font:inherit}textarea{min-height:88px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.wide{grid-column:1/-1}
    .checks{display:grid;gap:10px}.checks label{display:flex;align-items:flex-start;font-weight:450}.checks input{width:auto;margin:4px 9px 0 0}
    button{border:0;background:#17202a;color:#fff;padding:12px 16px;font:inherit;font-weight:750;cursor:pointer;width:max-content}
    button.accent{background:#d45113}.actions{display:flex;gap:10px;flex-wrap:wrap}.result{font-weight:650;min-height:24px}
    .vault-row{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #d8dee3}
    .vault-row a{color:#0b63a8;font-weight:650}.muted{font-size:14px;color:#68737d}
    .status-list{display:grid;gap:8px;padding:0;list-style:none}.status-list li{padding:10px 0;border-bottom:1px solid #d8dee3}
    [hidden]{display:none!important}@media(max-width:680px){main{padding:18px}.grid{grid-template-columns:1fr}.wide{grid-column:auto}}
  </style>
</head>
<body>
  <header><strong>Una Labs JobAgent</strong></header>
  <main>
    <section id="auth" class="band"${authenticated ? " hidden" : ""}>
      <h1>Sign in</h1>
      <form id="login"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required minlength="12"></label><button type="submit">Sign in</button></form>
      <h2>Create invited account</h2>
      <form id="register"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="new-password" required minlength="12"></label><label>Invitation code<input name="inviteCode" type="password" required></label><button class="accent" type="submit">Create account</button></form>
    </section>
    <section id="account" class="band"${authenticated ? "" : " hidden"}>
      <h1>Job preferences and consent</h1>
      <p id="identity"></p>
      <form id="onboarding">
        <div class="grid">
          <label>Full name<input name="fullName" required></label><label>Phone<input name="phone" required></label>
          <label>Location<input name="location" required></label><label>LinkedIn URL<input name="linkedIn" type="url" required></label>
          <label>Target titles, one per line<textarea name="targetTitles" required></textarea></label>
          <label>Excluded titles, one per line<textarea name="excludedTitles"></textarea></label>
          <label>Preferred locations, one per line<textarea name="locations" required></textarea></label>
          <label>Work modes<select name="workModes" multiple size="3" required><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">Onsite</option></select></label>
          <label>Employment types, one per line<textarea name="employmentTypes" required></textarea></label>
          <label>Minimum compensation<input name="compensationFloor" required></label>
          <label class="wide">Work authorization<input name="workAuthorization" required></label>
          <label class="wide"><select name="sponsorshipRequired" required><option value="false">No sponsorship required</option><option value="true">Sponsorship required</option></select></label>
        </div>
        <div class="checks">
          <label><input name="truthConfirmed" type="checkbox" required>I confirm that my professional information is truthful.</label>
          <label><input name="recruiterDrafts" type="checkbox">Prepare recruiter drafts.</label>
          <label><input name="recruiterSends" type="checkbox">Send recruiter replies covered by my policy.</label>
          <label><input name="assistedApplications" type="checkbox">Prepare and assist with applications.</label>
          <label><input name="controlledSubmissions" type="checkbox">Submit only when every answer is covered by my policy.</label>
        </div>
        <div class="actions"><button class="accent" type="submit">Save onboarding</button><button id="export" type="button">Export my data</button><button id="resume-account" type="button">Resume account</button><button id="pause" type="button">Pause account</button><button id="logout" type="button">Sign out</button></div>
        <div id="result" class="result" aria-live="polite"></div>
      </form>
      <form id="delete-account">
        <label>Current password<input name="password" type="password" autocomplete="current-password" required></label>
        <label class="checks"><span><input name="confirmation" type="checkbox" required>Permanently delete my account and stored data.</span></label>
        <button type="submit">Delete account</button>
      </form>
    </section>
    <section id="vault" class="band"${authenticated ? "" : " hidden"}>
      <h2>Resume vault</h2>
      <form id="resume-upload">
        <label>Resume file<input name="resume" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required></label>
        <label class="checks"><span><input name="isDefault" type="checkbox">Use as my default resume</span></label>
        <button class="accent" type="submit">Upload resume</button>
      </form>
      <div id="resume-result" class="result" aria-live="polite"></div>
      <div id="resume-list"></div>
    </section>
    <section id="truth" class="band"${authenticated ? "" : " hidden"}>
      <h2>Approved career facts</h2>
      <form id="truth-form">
        <label>One truthful fact per line<textarea name="facts" required></textarea></label>
        <label class="checks"><span><input name="confirm" type="checkbox" required>I confirm these facts are accurate and may be used for resume tailoring.</span></label>
        <button class="accent" type="submit">Approve facts</button>
      </form>
      <div id="truth-result" class="result" aria-live="polite"></div>
    </section>
    <section id="connections" class="band"${authenticated ? "" : " hidden"}>
      <h2>Connections and activation</h2>
      <div class="actions">
        <button type="button" data-provider="gmail">Prepare Gmail connection</button>
        <button type="button" data-provider="linkedin">Prepare LinkedIn connection</button>
        <button type="button" data-provider="indeed">Prepare Indeed connection</button>
      </div>
      <p id="connection-result" class="result" aria-live="polite"></p>
      <ul id="connection-list" class="status-list"></ul>
      <ul id="readiness-list" class="status-list"></ul>
    </section>
    <section id="jobs" class="band"${authenticated ? "" : " hidden"}>
      <h2>Recommended jobs</h2>
      <ul id="job-list" class="status-list"></ul>
      <h2>Needs approval</h2>
      <ul id="approval-list" class="status-list"></ul>
      <h2>Applications and proof</h2>
      <ul id="application-list" class="status-list"></ul>
    </section>
  </main>
  <script>
    const $=(id)=>document.getElementById(id),list=(value)=>String(value||"").split(/\\r?\\n/).map(v=>v.trim()).filter(Boolean);
    function mutationKey(){return crypto.randomUUID()}
    async function call(url,options={}){const method=String(options.method||"GET").toUpperCase(),headers={"content-type":"application/json",...(options.headers||{})};if(["PUT","PATCH","DELETE"].includes(method)||(method==="POST"&&!url.startsWith("/api/v1/auth/")&&!url.startsWith("/api/v1/account/")))headers["Idempotency-Key"]=headers["Idempotency-Key"]||mutationKey();const response=await fetch(url,{...options,headers});const body=await response.json();if(!response.ok)throw new Error(body.error||"Request failed");return body}
    const privateSections=["account","vault","truth","connections","jobs"];
    function showAccount(){ $("auth").hidden=true;for(const id of privateSections)$(id).hidden=false;load() }
    async function load(){try{const me=await call("/api/v1/me");$("identity").textContent=me.user.email+" - "+me.user.status;const saved=await call("/api/v1/onboarding");const r=saved.onboarding?.record||{},f=$("onboarding");for(const key of ["fullName","phone","location","linkedIn","compensationFloor","workAuthorization"]){if(r[key]!==undefined)f.elements[key].value=r[key]}for(const key of ["targetTitles","excludedTitles","locations","employmentTypes"]){if(r[key])f.elements[key].value=r[key].join("\\n")}if(r.workModes)Array.from(f.elements.workModes.options).forEach(o=>o.selected=r.workModes.includes(o.value));if(r.sponsorshipRequired!==undefined)f.elements.sponsorshipRequired.value=String(r.sponsorshipRequired);if(r.consent)for(const key of ["truthConfirmed","recruiterDrafts","recruiterSends","assistedApplications","controlledSubmissions"])f.elements[key].checked=Boolean(r.consent[key]);await loadResumes();const truth=await call("/api/v1/career-truth");$("truth-form").elements.facts.value=(truth.truthBank?.facts||[]).map(v=>v.statement).join("\\n");await Promise.all([loadConnections(),loadDashboard()])}catch{ $("auth").hidden=false;for(const id of privateSections)$(id).hidden=true }}
    async function loadResumes(){const data=await call("/api/v1/resumes");$("resume-list").innerHTML=data.resumes.map(r=>'<div class="vault-row"><span><strong>'+escapeHtml(r.filename)+'</strong><br><span class="muted">'+Math.ceil(r.byteSize/1024)+' KB'+(r.isDefault?' - Default':'')+'</span></span><a href="/api/v1/resumes/'+r.id+'/download">Download</a><button type="button" data-delete-resume="'+r.id+'">Delete</button></div>').join("")||'<p class="muted">No resumes uploaded.</p>'}
    function escapeHtml(value){const div=document.createElement("div");div.textContent=String(value);return div.innerHTML}
    function safeUrl(value){try{const url=new URL(String(value));return ["http:","https:"].includes(url.protocol)?escapeHtml(url.href):"#"}catch{return "#"}}
    async function loadConnections(){const [connections,readiness]=await Promise.all([call("/api/v1/connections"),call("/api/v1/activation-readiness")]);$("connection-list").innerHTML=connections.connections.map(c=>'<li><strong>'+escapeHtml(c.provider)+'</strong>: '+escapeHtml(c.status)+(c.providerAccount?' - '+escapeHtml(c.providerAccount):'')+' <button type="button" data-revoke-provider="'+escapeHtml(c.provider)+'">Revoke</button></li>').join("")||"<li>No connections prepared.</li>";$("readiness-list").innerHTML=readiness.checks.map(c=>"<li>"+(c.ready?"Ready: ":"Required: ")+escapeHtml(c.key.replaceAll("_"," "))+"</li>").join("")}
    async function loadDashboard(){const d=await call("/api/v1/dashboard");$("job-list").innerHTML=d.recommendations.map(j=>'<li><a href="'+safeUrl(j.jobUrl)+'" target="_blank" rel="noopener"><strong>'+escapeHtml(j.title)+'</strong></a> at '+escapeHtml(j.company)+' - '+j.score+'%</li>').join("")||"<li>No recommended jobs yet.</li>";$("approval-list").innerHTML=d.approvals.map(a=>'<li><strong>'+escapeHtml(a.title||a.action)+'</strong> '+escapeHtml(a.company||"")+'<br>'+escapeHtml(a.reason)+'<div class="actions"><button type="button" data-approval="'+a.id+'" data-decision="approved">Approve</button><button type="button" data-approval="'+a.id+'" data-decision="rejected">Reject</button></div></li>').join("")||"<li>No approval requests.</li>";$("application-list").innerHTML=d.applications.map(a=>"<li><strong>"+escapeHtml(a.title)+"</strong> at "+escapeHtml(a.company)+" - "+escapeHtml(a.status)+(a.evidenceReference?" - Proof recorded":"")+"</li>").join("")||"<li>No applications recorded.</li>"}
    $("login").addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{await call("/api/v1/auth/login",{method:"POST",body:JSON.stringify(d)});showAccount()}catch(error){alert(error.message)}});
    $("register").addEventListener("submit",async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{await call("/api/v1/auth/register",{method:"POST",body:JSON.stringify(d)});showAccount()}catch(error){alert(error.message)}});
    $("onboarding").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,d=new FormData(f),record={fullName:d.get("fullName"),phone:d.get("phone"),location:d.get("location"),linkedIn:d.get("linkedIn"),targetTitles:list(d.get("targetTitles")),excludedTitles:list(d.get("excludedTitles")),locations:list(d.get("locations")),workModes:Array.from(f.elements.workModes.selectedOptions).map(o=>o.value),employmentTypes:list(d.get("employmentTypes")),compensationFloor:d.get("compensationFloor"),workAuthorization:d.get("workAuthorization"),sponsorshipRequired:d.get("sponsorshipRequired")==="true",consent:{truthConfirmed:d.has("truthConfirmed"),recruiterDrafts:d.has("recruiterDrafts"),recruiterSends:d.has("recruiterSends"),assistedApplications:d.has("assistedApplications"),controlledSubmissions:d.has("controlledSubmissions")}};try{await call("/api/v1/onboarding",{method:"PUT",body:JSON.stringify(record)});$("result").textContent="Saved with consent version ${CONSENT_VERSION}."}catch(error){$("result").textContent=error.message}});
    $("resume-upload").addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,file=f.elements.resume.files[0];if(!file)return;try{const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=reject;reader.readAsDataURL(file)});await call("/api/v1/resumes",{method:"POST",body:JSON.stringify({filename:file.name,mimeType:file.type||(/\\.pdf$/i.test(file.name)?"application/pdf":"application/vnd.openxmlformats-officedocument.wordprocessingml.document"),base64,isDefault:f.elements.isDefault.checked})});$("resume-result").textContent="Resume stored privately.";f.reset();await loadResumes()}catch(error){$("resume-result").textContent=error.message}});
    $("resume-list").addEventListener("click",async e=>{const id=e.target.dataset?.deleteResume;if(!id)return;try{await call("/api/v1/resumes/"+id,{method:"DELETE",body:"{}"});await loadResumes()}catch(error){$("resume-result").textContent=error.message}});
    $("truth-form").addEventListener("submit",async e=>{e.preventDefault();const facts=list(new FormData(e.currentTarget).get("facts")).map(statement=>({category:"approved",statement}));try{await call("/api/v1/career-truth",{method:"PUT",body:JSON.stringify({facts})});$("truth-result").textContent="Career facts approved."}catch(error){$("truth-result").textContent=error.message}});
    $("connections").addEventListener("click",async e=>{const provider=e.target.dataset?.provider;if(!provider)return;try{const result=await call("/api/v1/connections",{method:"POST",body:JSON.stringify({provider})});if(result.authorizationUrl){location.assign(result.authorizationUrl);return}$("connection-result").textContent="Connection prepared. Authentication is still required before activation.";await loadConnections()}catch(error){$("connection-result").textContent=error.message}});
    $("connection-list").addEventListener("click",async e=>{const provider=e.target.dataset?.revokeProvider;if(!provider)return;try{await call("/api/v1/connections/"+provider,{method:"DELETE",body:"{}"});$("connection-result").textContent="Connection revoked.";await loadConnections()}catch(error){$("connection-result").textContent=error.message}});
    $("approval-list").addEventListener("click",async e=>{const id=e.target.dataset?.approval,decision=e.target.dataset?.decision;if(!id||!decision)return;try{await call("/api/v1/approvals/"+id,{method:"POST",body:JSON.stringify({decision})});await loadDashboard()}catch(error){alert(error.message)}});
    $("logout").addEventListener("click",async()=>{await call("/api/v1/auth/logout",{method:"POST",body:"{}"});location.reload()});
    $("pause").addEventListener("click",async()=>{await call("/api/v1/account/pause",{method:"POST",body:"{}"});location.reload()});
    $("resume-account").addEventListener("click",async()=>{await call("/api/v1/account/resume",{method:"POST",body:"{}"});location.reload()});
    $("export").addEventListener("click",async()=>{const data=await call("/api/v1/account/export");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="jobagent-account-export.json";a.click();URL.revokeObjectURL(a.href)});
    $("delete-account").addEventListener("submit",async e=>{e.preventDefault();const d=new FormData(e.currentTarget);try{await call("/api/v1/account",{method:"DELETE",body:JSON.stringify({password:d.get("password"),confirmation:d.has("confirmation")?"DELETE":""})});location.reload()}catch(error){$("result").textContent=error.message}});
    if(${authenticated ? "true" : "false"})load();if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js");
  </script>
</body></html>`;
}

interface StaticAsset {
  file: string;
  type: string;
  cache: string;
  base64Fallback?: string;
}

const STATIC_FILES: Record<string, StaticAsset> = {
  "/": { file: "landing.html", type: "text/html; charset=utf-8", cache: "no-store" },
  "/app": { file: "index.html", type: "text/html; charset=utf-8", cache: "no-store" },
  "/landing.js": { file: "landing.js", type: "text/javascript; charset=utf-8", cache: "no-cache" },
  "/landing.css": { file: "landing.css", type: "text/css; charset=utf-8", cache: "public, max-age=3600" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8", cache: "no-cache" },
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8", cache: "public, max-age=3600" },
  "/manifest.webmanifest": { file: "manifest.webmanifest", type: "application/manifest+json", cache: "public, max-age=3600" },
  "/sw.js": { file: "sw.js", type: "text/javascript; charset=utf-8", cache: "no-cache" },
  "/icon-192.png": {
    file: "icon-192.png",
    type: "image/png",
    cache: "public, max-age=86400",
    base64Fallback: "icon-192.png.b64"
  },
  "/icon.png": {
    file: "icon.png",
    type: "image/png",
    cache: "public, max-age=86400",
    base64Fallback: "icon.png.b64"
  },
  "/product-preview.png": {
    file: "product-preview.png",
    type: "image/png",
    cache: "public, max-age=86400"
  },
  "/privacy": { file: "privacy.html", type: "text/html; charset=utf-8", cache: "public, max-age=3600" },
  "/terms": { file: "terms.html", type: "text/html; charset=utf-8", cache: "public, max-age=3600" },
  "/google-data": { file: "google-data.html", type: "text/html; charset=utf-8", cache: "public, max-age=3600" },
  "/retention": { file: "retention.html", type: "text/html; charset=utf-8", cache: "public, max-age=3600" },
  "/account-deletion": { file: "account-deletion.html", type: "text/html; charset=utf-8", cache: "public, max-age=3600" },
  "/support": { file: "support.html", type: "text/html; charset=utf-8", cache: "public, max-age=3600" }
};

async function serveStatic(res: ServerResponse, pathname: string): Promise<boolean> {
  const publicPath = ["/accept-invite", "/verify-email", "/reset-password"].includes(pathname)
    ? "/app"
    : pathname;
  const asset = STATIC_FILES[publicPath];
  if (!asset) return false;
  let content: Buffer;
  try {
    content = await fs.readFile(path.join(PUBLIC_ROOT, asset.file));
  } catch (error: any) {
    if (error?.code !== "ENOENT" || !asset.base64Fallback) {
      console.error(JSON.stringify({
        event: "static_asset_read_failed",
        asset: asset.file,
        errorCode: String(error?.code || "unknown")
      }));
      throw error;
    }
    const encoded = await fs.readFile(path.join(PUBLIC_ROOT, asset.base64Fallback), "ascii");
    content = Buffer.from(encoded.trim(), "base64");
    console.warn(JSON.stringify({
      event: "static_asset_fallback_used",
      asset: asset.file
    }));
  }
  securityHeaders(res);
  res.writeHead(200, { "content-type": asset.type, "cache-control": asset.cache });
  res.end(content);
  return true;
}

export async function createProductServer(storage: ProductObjectStorage = createProductObjectStorage()) {
  const db = getProductPool();
  if (process.env.AUTO_MIGRATE === "true") await migrateProductDb(db);
  if (process.env.NODE_ENV === "production") {
    await assertProductDatabaseRole(db);
    await storage.assertReady();
    productSecretKeyring();
    productGmailOAuthConfig();
  }
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (requestRateLimit(req, url.pathname)) {
        return json(res, 429, { error: "Too many requests. Try again shortly." });
      }
      if (!mutationOriginAllowed(req)) return json(res, 403, { error: "Origin rejected." });

      if (req.method === "GET" && url.pathname === "/healthz") return json(res, 200, { ok: true });
      if (req.method === "GET" && url.pathname === "/api/v1/release") {
        return json(res, 200, { release: productReleaseInfo() });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/plans") {
        return json(res, 200, {
          plans: publicPlans(),
          checkoutEnabled: billingCheckoutEnabled(),
          currency: "CAD",
          foundingOffer: {
            code: "FOUNDING25",
            description: "25% off the first three monthly payments",
            redemptionLimit: 100
          }
        });
      }
      if (req.method === "GET" && url.pathname === "/readyz") {
        try {
          if (process.env.NODE_ENV === "production") await assertProductDatabaseRole(db);
          await storage.assertReady();
          await db.query("SELECT 1 FROM product_users LIMIT 1");
          return json(res, 200, {
            ready: true,
            database: "connected",
            tenantIsolationRole: "enforced",
            objectStorage: storage.driver
          });
        } catch {
          return json(res, 503, { ready: false, database: "unavailable" });
        }
      }
      if (req.method === "POST" && url.pathname === "/api/v1/internal/billing/events") {
        const rawBody = await readText(req);
        const timestamp = String(req.headers["x-jobagent-timestamp"] || "");
        const signature = String(req.headers["x-jobagent-signature"] || "");
        const secret = String(process.env.JOBAGENT_BILLING_SHARED_SECRET || "").trim();
        if (!verifyBillingPayloadSignature(rawBody, timestamp, signature, secret)) {
          return json(res, 401, { error: "Billing event signature is invalid or expired." });
        }
        let payload: unknown;
        try {
          payload = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          return json(res, 400, { error: "Billing event payload is invalid." });
        }
        const digest = crypto.createHash("sha256").update(rawBody).digest("hex");
        const result = await applyBillingEvent(db, payload, digest);
        return json(res, 200, { accepted: true, replayed: result.replayed });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/auth/register") {
        const input = registrationSchema.parse(await readJson(req));
        const passwordHash = hashPassword(input.password);
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          const inviteToken = String(input.inviteToken || "").trim();
          const invitation = inviteToken
            ? await consumeProductInvitation(client, input.email, inviteToken)
            : null;
          if (inviteToken && !invitation) {
            await client.query("ROLLBACK");
            return json(res, 403, { error: "Invitation is invalid, expired, or already used." });
          }
          const publicRegistration = !invitation;
          if (publicRegistration && process.env.PUBLIC_SIGNUP_ENABLED !== "true") {
            await client.query("ROLLBACK");
            return json(res, 403, { error: "Public registration is not open yet." });
          }
          if (publicRegistration) {
            const configuredCap = configuredPublicSignupCap();
            if (configuredCap !== null) {
              await client.query("SELECT pg_advisory_xact_lock(hashtext('jobagent-public-registration'))");
              const count = await client.query<{ count: number }>(
                `SELECT count(*)::integer AS count
                   FROM product_users
                  WHERE registration_source='public' AND status <> 'deleted'`
              );
              if (Number(count.rows[0]?.count || 0) >= configuredCap) {
                await client.query("ROLLBACK");
                return json(res, 403, { error: "Public registration is temporarily at capacity." });
              }
            }
          }
          const inserted = await client.query(
            `INSERT INTO product_users
               (email, password_hash, role, registration_source, acquisition)
             VALUES ($1,$2,$3,$4,$5::jsonb)
             RETURNING id, email, status, role,
                       email_verified_at AS "emailVerifiedAt",
                       mfa_enabled AS "mfaEnabled"`,
            [
              input.email,
              passwordHash,
              invitation?.role || "candidate",
              invitation ? "invitation" : "public",
              JSON.stringify(input.acquisition)
            ]
          );
          if (invitation) await linkInvitationUser(client, invitation.id, inserted.rows[0].id);
          await client.query("SELECT set_config('app.user_id', $1, true)", [inserted.rows[0].id]);
          await client.query(
            "INSERT INTO product_onboarding (user_id) VALUES ($1)",
            [inserted.rows[0].id]
          );
          await client.query(
            "INSERT INTO product_audit_logs (user_id, actor_user_id, action, target_type, target_id) VALUES ($1::uuid,$1::uuid,'account.created','user',$1::text)",
            [inserted.rows[0].id]
          );
          await client.query(
            `INSERT INTO plan_entitlements
               (user_id, plan_code, status, allowances, source)
             VALUES ($1,'free_preview','active',$2::jsonb,'system')`,
            [inserted.rows[0].id, JSON.stringify(publicPlans()[0].allowances)]
          );
          await client.query(
            `INSERT INTO product_funnel_events
               (user_id, event_key, event_name, properties)
             VALUES ($1,'signup','signup',$2::jsonb)`,
            [
              inserted.rows[0].id,
              JSON.stringify({ registrationSource: invitation ? "invitation" : "public", ...input.acquisition })
            ]
          );
          await client.query("COMMIT");
          const verification = await createEmailVerificationToken(db, inserted.rows[0].id);
          const deliveryId = await sendVerificationEmail(input.email, verification.token).catch(() => null);
          const session = await createSession(db, inserted.rows[0].id);
          setSessionCookies(res, session);
          return json(res, 201, {
            user: {
              id: inserted.rows[0].id,
              email: inserted.rows[0].email,
              status: inserted.rows[0].status,
              role: inserted.rows[0].role,
              emailVerified: false,
              mfaEnabled: false
            },
            verificationEmailSent: Boolean(deliveryId)
          });
        } catch (error: any) {
          await client.query("ROLLBACK").catch(() => undefined);
          if (error?.code === "23505") return json(res, 409, { error: "Account already exists." });
          throw error;
        } finally {
          client.release();
        }
      }

      if (req.method === "POST" && url.pathname === "/api/v1/auth/login") {
        const input = loginSchema.parse(await readJson(req));
        const attemptKey = authAttemptKey(input.email, clientKey(req));
        if (await isProductAuthBlocked(db, attemptKey)) {
          return json(res, 429, { error: "Sign-in is temporarily blocked. Try again later." });
        }
        const found = await db.query(
          `SELECT id, email, status, role, password_hash,
                  email_verified_at AS "emailVerifiedAt",
                  mfa_enabled AS "mfaEnabled"
             FROM product_users
            WHERE email=$1 AND status <> 'deleted'
            LIMIT 1`,
          [input.email]
        );
        const foundUser = found.rows[0];
        if (!foundUser || !verifyPassword(input.password, foundUser.password_hash)) {
          await recordProductAuthFailure(db, attemptKey);
          return json(res, 401, { error: "Invalid email or password." });
        }
        if (foundUser.mfaEnabled) {
          const secret = await getDecryptedMfaSecret(db, foundUser.id);
          if (!secret || !input.mfaCode || !verifyTotp(secret, input.mfaCode)) {
            await recordProductAuthFailure(db, attemptKey);
            return json(res, 401, { error: "A valid MFA code is required.", code: "MFA_REQUIRED" });
          }
        }
        await clearProductAuthFailures(db, attemptKey);
        await revokeAllSessions(db, foundUser.id);
        const session = await createSession(db, foundUser.id);
        setSessionCookies(res, session);
        return json(res, 200, {
          user: {
            id: foundUser.id,
            email: foundUser.email,
            status: foundUser.status,
            role: foundUser.role,
            emailVerified: Boolean(foundUser.emailVerifiedAt),
            mfaEnabled: foundUser.mfaEnabled
          }
        });
      }

      if (req.method === "POST" && url.pathname === "/api/v1/auth/verify-email") {
        const input = tokenSchema.parse(await readJson(req));
        const verified = await verifyProductEmail(db, input.token);
        if (verified) {
          await recordFunnelEvent(db, verified.id, "email_verified", {}, "email_verified");
        }
        return verified
          ? json(res, 200, { verified: true, email: verified.email })
          : json(res, 400, { error: "Verification link is invalid or expired." });
      }

      if (req.method === "POST" && url.pathname === "/api/v1/auth/password-reset/request") {
        const input = passwordResetRequestSchema.parse(await readJson(req));
        if (!transactionalEmailConfigured()) {
          return json(res, 503, {
            error: "Password reset email is temporarily unavailable. Contact the JobAgent operator."
          });
        }
        const reset = await createPasswordResetForEmail(db, input.email);
        if (reset) {
          const deliveryId = await sendPasswordResetEmail(reset.email, reset.token).catch(() => null);
          if (!deliveryId) {
            await discardPasswordResetForUser(db, reset.userId);
            return json(res, 503, {
              error: "Password reset email is temporarily unavailable. Contact the JobAgent operator."
            });
          }
        }
        return json(res, 202, { accepted: true });
      }

      if (req.method === "POST" && url.pathname === "/api/v1/auth/password-reset/confirm") {
        const input = passwordResetSchema.parse(await readJson(req));
        const reset = await resetProductPassword(db, input.token, hashPassword(input.password));
        return reset
          ? json(res, 200, { reset: true })
          : json(res, 400, { error: "Reset link is invalid or expired." });
      }

      if (req.method === "POST" && url.pathname === "/api/v1/webhooks/resend/inbound") {
        const payload = await readText(req);
        const event = await verifyResendWebhook(payload, {
          id: String(req.headers["svix-id"] || ""),
          timestamp: String(req.headers["svix-timestamp"] || ""),
          signature: String(req.headers["svix-signature"] || "")
        });
        if (event.type !== "email.received") return json(res, 202, { accepted: true });
        const data = event.data || {};
        let stored = null;
        for (const recipient of data.received_for || data.to || []) {
          stored = await storeInboundMessage(db, {
            recipient,
            providerMessageId: String(data.email_id || data.message_id || ""),
            senderAddress: data.from,
            subject: data.subject,
            receivedAt: data.created_at || event.created_at
          });
          if (stored) break;
        }
        return json(res, 202, { accepted: true, routed: Boolean(stored) });
      }

      if (req.method === "POST" && url.pathname === "/api/v1/runner/enroll") {
        const input = runnerEnrollmentSchema.parse(await readJson(req));
        const enrolled = await enrollRunnerDevice(db, input);
        return json(res, 201, {
          deviceId: enrolled.deviceId,
          deviceSecret: enrolled.secret,
          candidateUserId: enrolled.userId
        });
      }

      if (url.pathname.startsWith("/api/v1/runner/device/")) {
        const rawBody = req.method === "POST" ? await readText(req) : "";
        const runner = await authenticateRunnerRequest(req, url.pathname, rawBody, db);
        if (!runner) return json(res, 401, { error: "Runner authentication failed." });
        if (req.method === "POST" && url.pathname === "/api/v1/runner/device/heartbeat") {
          await heartbeatRunner(db, runner.userId, runner.deviceId);
          return json(res, 200, { ok: true });
        }
        if (req.method === "POST" && url.pathname === "/api/v1/runner/device/tasks/lease") {
          await heartbeatRunner(db, runner.userId, runner.deviceId);
          const leased = await leaseRunnerTask(db, runner.userId, runner.deviceId, runner.secret);
          return json(res, 200, leased || { task: null });
        }
        if (req.method === "POST" && url.pathname === "/api/v1/runner/device/proofs") {
          const body = JSON.parse(rawBody || "{}");
          const proof = runnerProofSchema.parse(body.proof) as ApplicationProof;
          const evidenceInput = body.evidence
            ? runnerEvidenceSchema.parse(body.evidence)
            : null;
          let evidence: { storageKey: string; mimeType: string; filename: string } | undefined;
          if (evidenceInput) {
            const content = Buffer.from(evidenceInput.base64, "base64");
            if (!content.length
                || content.length > 5_000_000
                || content.toString("base64").replace(/=+$/, "") !== evidenceInput.base64.replace(/=+$/, "")) {
              return json(res, 400, { error: "Proof evidence is invalid or exceeds 5 MB." });
            }
            const sha256 = crypto.createHash("sha256")
              .update(`${runner.userId}:${proof.taskId}:`)
              .update(content)
              .digest("hex");
            const storageKey = buildProofStorageKey(runner.userId, sha256);
            assertPrivateStorageOwnership(runner.userId, storageKey);
            await storage.putObject({
              key: storageKey,
              content,
              mimeType: evidenceInput.mimeType,
              filename: evidenceInput.filename
            });
            evidence = {
              storageKey,
              mimeType: evidenceInput.mimeType,
              filename: evidenceInput.filename
            };
          }
          try {
            const saved = await saveRunnerProof(
              db,
              runner.userId,
              runner.deviceId,
              String(body.leaseToken || ""),
              proof,
              evidence
            );
            return json(res, 201, { accepted: true, proofId: saved.id });
          } catch (error) {
            if (evidence) await storage.deleteObject(evidence.storageKey).catch(() => undefined);
            throw error;
          }
        }
        return json(res, 404, { error: "Runner endpoint not found." });
      }

      const user = await authenticatedUser(req, db);
      if (req.method === "GET" && url.pathname === "/api/v1/oauth/gmail/callback") {
        if (!user) return html(res, 401, "<h1>Sign in required</h1><p>Return to JobAgent and start the Gmail connection again.</p>");
        const providerError = url.searchParams.get("error");
        const code = String(url.searchParams.get("code") || "");
        const state = String(url.searchParams.get("state") || "");
        if (providerError || !code || !state || code.length > 4096 || state.length > 512) {
          return html(res, 400, "<h1>Gmail connection was not completed</h1><p>Return to JobAgent and try again.</p>");
        }
        try {
          await completeProductGmailOAuth(db, {
            userId: user.id,
            expectedMailbox: user.email,
            code,
            state
          });
          return redirect(res, "/app?connection=gmail-connected");
        } catch {
          return redirect(res, "/app?connection=gmail-failed");
        }
      }
      if (req.method === "GET" && await serveStatic(res, url.pathname)) return;
      if (!user && url.pathname.startsWith("/api/v1/")) return json(res, 401, { error: "Authentication required." });
      if (!user) return json(res, 404, { error: "Not found." });
      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "")
          && !csrfTokenAllowed(req, user)) {
        return json(res, 403, { error: "CSRF validation failed. Refresh JobAgent and try again." });
      }

      if (req.method === "POST" && url.pathname === "/api/v1/auth/logout") {
        await revokeCurrentSession(req, db);
        clearSessionCookie(res);
        return json(res, 200, { ok: true });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/me") {
        return json(res, 200, { user: publicProductUser(user) });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/billing/entitlement") {
        return json(res, 200, await billingUsageSummary(db, user.id));
      }
      if (req.method === "GET" && url.pathname === "/api/v1/billing/usage") {
        return json(res, 200, await billingUsageSummary(db, user.id));
      }
      if (req.method === "POST" && url.pathname === "/api/v1/billing/checkout") {
        if (!billingCheckoutEnabled()) {
          return json(res, 503, { error: "Paid checkout is not open yet." });
        }
        if (!user.emailVerifiedAt) return json(res, 403, { error: "Verify your email before upgrading." });
        if (user.status === "paused") return json(res, 423, { error: "Account is paused." });
        const body = await readJson(req);
        const input = billingCheckoutSchema.parse(body);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => {
            const key = normalizeIdempotencyKey(
              req.headers["idempotency-key"] || req.headers["x-idempotency-key"]
            );
            const checkout = await createBillingCheckout(db, user, input.planCode, key);
            return { status: 201, body: checkout };
          }
        });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/billing/portal") {
        if (!hasRecentAuthentication(user)) {
          return json(res, 401, { error: "Sign in again before opening billing settings." });
        }
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body: {},
          action: async () => ({ status: 200, body: await createBillingPortal(db, user.id) })
        });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/auth/verification/resend") {
        if (user.emailVerifiedAt) return json(res, 200, { sent: false, alreadyVerified: true });
        const verification = await createEmailVerificationToken(db, user.id);
        const deliveryId = await sendVerificationEmail(user.email, verification.token).catch(() => null);
        return json(res, deliveryId ? 202 : 503, { sent: Boolean(deliveryId) });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/auth/mfa/setup") {
        if (!user.emailVerifiedAt || !hasRecentAuthentication(user)) {
          return json(res, 401, { error: "Verify your email and sign in again before setting up MFA." });
        }
        const secret = createTotpSecret();
        await saveEncryptedMfaSecret(db, user.id, secret);
        const issuer = encodeURIComponent("Una Labs JobAgent");
        const account = encodeURIComponent(user.email);
        return json(res, 200, {
          secret,
          otpauthUrl: `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&digits=6&period=30`
        });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/auth/mfa/confirm") {
        if (!hasRecentAuthentication(user)) {
          return json(res, 401, { error: "Sign in again before confirming MFA." });
        }
        const input = mfaCodeSchema.parse(await readJson(req));
        const secret = await getDecryptedMfaSecret(db, user.id);
        if (!secret || !verifyTotp(secret, input.code)) {
          return json(res, 400, { error: "MFA code is invalid." });
        }
        await enableProductMfa(db, user.id);
        return json(res, 200, { enabled: true });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/automation-policy") {
        return json(res, 200, { policy: await getAutomationPolicy(db, user.id) });
      }
      if (req.method === "PUT" && url.pathname === "/api/v1/automation-policy") {
        if (user.status === "paused") return json(res, 423, { error: "Account is paused." });
        const body = await readJson(req);
        const input = automationPolicySchema.parse(body);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => ({
            status: 200,
            body: { policy: await saveAutomationPolicy(db, user.id, input) }
          })
        });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/connectors/capabilities") {
        const connectors = await ensureConnectorCapabilities(db, user.id);
        return json(res, 200, { connectors: connectors.map(connectorStatusSurface) });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/inbound-alias") {
        if (!user.emailVerifiedAt) return json(res, 403, { error: "Verify your email first." });
        const body = await readJson(req);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => ({
            status: 201,
            body: { alias: await createInboundAlias(db, user.id) }
          })
        });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/runner/enrollment-token") {
        if (!user.emailVerifiedAt || !hasRecentAuthentication(user)) {
          return json(res, 401, { error: "Verify your email and sign in again before enrolling a runner." });
        }
        const body = await readJson(req);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => ({
            status: 201,
            body: { enrollment: await createRunnerEnrollment(db, user.id) }
          })
        });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/operator/health") {
        if (!operatorAllowed(user)) return json(res, 403, { error: "Verified operator MFA is required." });
        const counts = await db.query(
          `SELECT count(*)::integer AS users,
                  count(*) FILTER (WHERE status='active')::integer AS active,
                  count(*) FILTER (WHERE status='paused')::integer AS paused
             FROM product_users WHERE status <> 'deleted'`
        );
        return json(res, 200, {
          database: "connected",
          objectStorage: storage.driver,
          accounts: counts.rows[0],
          checkedAt: new Date().toISOString()
        });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/operator/invitations") {
        if (!operatorAllowed(user)) return json(res, 403, { error: "Verified operator MFA is required." });
        if (!transactionalEmailConfigured()) {
          return json(res, 503, {
            error: "Invitation email is temporarily unavailable. No invitation was created."
          });
        }
        const body = await readJson(req);
        const input = invitationSchema.parse(body);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => {
            const invitation = await createProductInvitation(db, {
              ...input,
              createdBy: user.id
            });
            const deliveryId = await sendInvitationEmail(
              invitation.email,
              invitation.token,
              invitation.expiresAt
            ).catch(() => null);
            if (!deliveryId) {
              await discardProductInvitation(db, invitation.token);
              return {
                status: 503,
                body: {
                  error: "Invitation email is temporarily unavailable. No invitation was created."
                }
              };
            }
            return {
              status: 201,
              body: {
                invitation: {
                  email: invitation.email,
                  role: invitation.role,
                  expiresAt: invitation.expiresAt
                },
                deliveryId
              }
            };
          }
        });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/operator/connectors") {
        if (!operatorAllowed(user)) return json(res, 403, { error: "Verified operator MFA is required." });
        const body: any = await readJson(req);
        const input = connectorCertificationSchema.parse(body);
        const target = await db.query(
          "SELECT id FROM product_users WHERE email=$1 AND status <> 'deleted'",
          [normalizedEmail(String(body.email || ""))]
        );
        if (!target.rows[0]) return json(res, 404, { error: "Candidate account was not found." });
        await updateConnectorCapability(
          db,
          target.rows[0].id,
          input.source as ConnectorSource,
          input.status as ConnectorStatus,
          input.evidenceReference,
          {
            accountIdentifier: input.accountIdentifier,
            expiresAt: input.expiresAt,
            blockingReason: input.blockingReason
          }
        );
        return json(res, 200, { updated: true });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/onboarding") {
        return json(res, 200, { onboarding: await getProductOnboarding(db, user.id) });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/resumes") {
        return json(res, 200, { resumes: await listProductResumes(db, user.id) });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/resumes") {
        if (user.status === "paused") return json(res, 423, { error: "Account is paused." });
        const body = await readJson(req);
        const input = resumeUploadSchema.parse(body);
        const resume = validateResumeUpload(input);
        const storageKey = buildResumeStorageKey(user.id, resume.sha256);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => {
            const existing = await getProductResumeBySha(db, user.id, resume.sha256);
            assertResumeStorageOwnership(user.id, storageKey);
            await storage.putObject({
              key: storageKey,
              content: resume.content,
              mimeType: resume.mimeType,
              filename: resume.filename
            });
            try {
              const saved = await saveProductResume(db, user.id, {
                filename: resume.filename,
                mimeType: resume.mimeType,
                byteSize: resume.content.length,
                sha256: resume.sha256,
                storageKey,
                storageDriver: storage.driver,
                isDefault: input.isDefault
              });
              return { status: 201, body: { resume: saved } };
            } catch (error) {
              if (!existing?.storageKey) {
                await storage.deleteObject(storageKey).catch(() => undefined);
              }
              throw error;
            }
          }
        });
      }
      const proofDownload = url.pathname.match(/^\/api\/v1\/proofs\/([0-9a-f-]{36})\/download$/i);
      if (req.method === "GET" && proofDownload) {
        const file = await getRunnerProofObject(db, user.id, proofDownload[1]);
        if (!file) return json(res, 404, { error: "Proof evidence was not found." });
        assertPrivateStorageOwnership(user.id, file.storageKey);
        const signedUrl = await storage.signedDownloadUrl(file.storageKey, file.filename);
        if (signedUrl) return redirect(res, signedUrl, 302);
        return fileResponse(res, {
          filename: file.filename,
          mimeType: file.mimeType,
          content: await storage.getObject(file.storageKey)
        });
      }
      const applicationEvidenceDownload = url.pathname.match(
        /^\/api\/v1\/application-evidence\/([0-9a-f-]{36})\/download$/i
      );
      if (req.method === "GET" && applicationEvidenceDownload) {
        const file = await getProductApplicationEvidenceObject(
          db,
          user.id,
          applicationEvidenceDownload[1]
        );
        if (!file) return json(res, 404, { error: "Application evidence was not found." });
        assertPrivateStorageOwnership(user.id, file.storageKey);
        const signedUrl = await storage.signedDownloadUrl(file.storageKey, file.filename);
        if (signedUrl) return redirect(res, signedUrl, 302);
        return fileResponse(res, {
          filename: file.filename,
          mimeType: file.mimeType,
          content: await storage.getObject(file.storageKey)
        });
      }
      const resumeDownload = url.pathname.match(/^\/api\/v1\/resumes\/([0-9a-f-]{36})\/download$/i);
      if (req.method === "GET" && resumeDownload) {
        const file = await getProductResumeObject(db, user.id, resumeDownload[1]);
        if (!file) return json(res, 404, { error: "Resume not found." });
        if (file.storageKey) {
          assertResumeStorageOwnership(user.id, file.storageKey);
          if (file.storageDriver !== storage.driver) {
            return json(res, 503, { error: "Resume storage is temporarily unavailable." });
          }
          const signedUrl = await storage.signedDownloadUrl(file.storageKey, file.filename);
          if (signedUrl) {
            securityHeaders(res);
            res.writeHead(302, { location: signedUrl, "cache-control": "private, no-store" });
            return res.end();
          }
          return fileResponse(res, {
            filename: file.filename,
            mimeType: file.mimeType,
            content: await storage.getObject(file.storageKey)
          });
        }
        if (!file.legacyContent) return json(res, 410, { error: "Resume content is unavailable." });
        return fileResponse(res, {
          filename: file.filename,
          mimeType: file.mimeType,
          content: file.legacyContent
        });
      }
      const resumeDelete = url.pathname.match(/^\/api\/v1\/resumes\/([0-9a-f-]{36})$/i);
      if (req.method === "DELETE" && resumeDelete) {
        if (user.status === "paused") return json(res, 423, { error: "Account is paused." });
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body: {},
          action: async () => {
            const deleted = await deleteProductResume(db, user.id, resumeDelete[1]);
            if (!deleted) return { status: 404, body: { error: "Resume not found." } };
            if (!deleted.storageKey || !deleted.deletionId) {
              return { status: 200, body: { deleted: true, storageCleanup: "not_required" } };
            }
            try {
              assertResumeStorageOwnership(user.id, deleted.storageKey);
              if (deleted.storageDriver !== storage.driver) {
                throw new Error("Configured storage does not match the stored object.");
              }
              await storage.deleteObject(deleted.storageKey);
              await completeProductObjectDeletion(db, user.id, deleted.deletionId);
              return { status: 200, body: { deleted: true, storageCleanup: "completed" } };
            } catch (error) {
              const reason = error instanceof Error ? error.message : "Object deletion failed.";
              await completeProductObjectDeletion(db, user.id, deleted.deletionId, reason);
              return { status: 202, body: { deleted: true, storageCleanup: "pending_retry" } };
            }
          }
        });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/career-truth") {
        return json(res, 200, { truthBank: await getCareerTruthBank(db, user.id) });
      }
      if (req.method === "PUT" && url.pathname === "/api/v1/career-truth") {
        if (user.status === "paused") return json(res, 423, { error: "Account is paused." });
        const body = await readJson(req);
        const input = careerTruthSchema.parse(body);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => ({
            status: 200,
            body: { truthBank: await saveCareerTruthBank(db, user.id, input.facts) }
          })
        });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/connections") {
        return json(res, 200, { connections: await listProductConnections(db, user.id) });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/connections") {
        if (user.status === "paused") return json(res, 423, { error: "Account is paused." });
        if (!user.emailVerifiedAt) return json(res, 403, { error: "Verify your email before connecting an account." });
        const body = await readJson(req);
        const input = connectionSchema.parse(body);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => {
            const connection = await requestProductConnection(db, user.id, input.provider);
            if (input.provider !== "gmail") return { status: 202, body: { connection } };
            const authorization = await beginProductGmailOAuth(db, user.id);
            return { status: 202, body: { connection, ...authorization } };
          }
        });
      }
      const connectionRevoke = url.pathname.match(/^\/api\/v1\/connections\/(gmail|linkedin|indeed|dice|monster)$/);
      if (req.method === "DELETE" && connectionRevoke) {
        if (!hasRecentAuthentication(user)) return json(res, 401, { error: "Sign in again before revoking a connection." });
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body: {},
          action: async () => {
            const providerRevocation = connectionRevoke[1] === "gmail"
              ? await revokeProductGmailOAuth(db, user.id).catch(() => ({ providerRevoked: false }))
              : { providerRevoked: true };
            const connection = await revokeProductConnection(db, user.id, connectionRevoke[1]);
            return connection
              ? { status: 200, body: { connection, ...providerRevocation } }
              : { status: 404, body: { error: "Connection not found." } };
          }
        });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/activation-readiness") {
        return json(res, 200, await productActivationReadiness(db, user.id));
      }
      if (req.method === "GET" && url.pathname === "/api/v1/dashboard") {
        return json(res, 200, await productDashboard(db, user.id));
      }
      if (req.method === "GET" && url.pathname === "/api/v1/analytics/conversion") {
        return json(res, 200, await productConversionAnalytics(db, user.id));
      }
      if (req.method === "GET" && url.pathname === "/api/v1/interview-prep") {
        return json(res, 200, { sessions: await listProductInterviewPrep(db, user.id) });
      }
      const jobInsight = url.pathname.match(/^\/api\/v1\/jobs\/([0-9a-f-]{36})\/insights$/i);
      if (req.method === "GET" && jobInsight) {
        const insight = await getProductJobInsight(db, user.id, jobInsight[1]);
        return insight
          ? json(res, 200, { insight })
          : json(res, 404, { error: "Job insight was not found." });
      }
      if (req.method === "POST" && jobInsight) {
        if (user.status === "paused") return json(res, 423, { error: "Account is paused." });
        if (!user.emailVerifiedAt) return json(res, 403, { error: "Verify your email before running an analysis." });
        const body = await readJson(req);
        const input = trustAnalysisSchema.parse(body);
        if (!await productJobMatchExists(db, user.id, jobInsight[1])) {
          return json(res, 404, { error: "Job match was not found." });
        }
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => {
            const usage = await consumePlanUsage(
              db,
              user.id,
              "fit_analysis",
              1,
              normalizeIdempotencyKey(
                req.headers["idempotency-key"] || req.headers["x-idempotency-key"]
              ),
              { jobMatchId: jobInsight[1] }
            );
            if (!usage.allowed) {
              return {
                status: 402,
                body: { error: "Your fit-analysis allowance is used for this period.", usage }
              };
            }
            const insight = await generateProductJobInsight(db, user.id, jobInsight[1], input.jobDescription);
            if (insight) {
              await recordFunnelEvent(
                db,
                user.id,
                "first_value",
                { feature: "fit_analysis" },
                "first_value"
              );
            }
            return insight
              ? { status: 200, body: { insight } }
              : { status: 404, body: { error: "Job match was not found." } };
          }
        });
      }
      const interviewPrep = url.pathname.match(/^\/api\/v1\/jobs\/([0-9a-f-]{36})\/interview-prep$/i);
      if (req.method === "POST" && interviewPrep) {
        if (user.status === "paused") return json(res, 423, { error: "Account is paused." });
        if (!user.emailVerifiedAt) return json(res, 403, { error: "Verify your email before creating interview preparation." });
        const body = await readJson(req);
        if (!await productJobMatchExists(db, user.id, interviewPrep[1])) {
          return json(res, 404, { error: "Job match was not found." });
        }
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => {
            const usage = await consumePlanUsage(
              db,
              user.id,
              "interview_prep",
              1,
              normalizeIdempotencyKey(
                req.headers["idempotency-key"] || req.headers["x-idempotency-key"]
              ),
              { jobMatchId: interviewPrep[1] }
            );
            if (!usage.allowed) {
              return {
                status: 402,
                body: { error: "Your interview-prep allowance is used for this period.", usage }
              };
            }
            const session = await createProductInterviewPrep(db, user.id, interviewPrep[1]);
            return session
              ? { status: 201, body: { session } }
              : { status: 404, body: { error: "Job match was not found." } };
          }
        });
      }
      const applicationTimeline = url.pathname.match(/^\/api\/v1\/applications\/([0-9a-f-]{36})\/timeline$/i);
      if (req.method === "GET" && applicationTimeline) {
        const events = await productApplicationTimeline(db, user.id, applicationTimeline[1]);
        return events
          ? json(res, 200, { events })
          : json(res, 404, { error: "Application was not found." });
      }
      const applicationOutcome = url.pathname.match(/^\/api\/v1\/applications\/([0-9a-f-]{36})\/outcomes$/i);
      if (req.method === "POST" && applicationOutcome) {
        const body = await readJson(req);
        const input = outcomeSchema.parse(body);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => {
            const outcome = await recordProductOutcome(
              db, user.id, applicationOutcome[1], input.outcomeType, input.metadata
            );
            return outcome
              ? { status: 201, body: { outcome } }
              : { status: 404, body: { error: "Application was not found." } };
          }
        });
      }
      const approvalDecision = url.pathname.match(/^\/api\/v1\/approvals\/([0-9a-f-]{36})$/i);
      if (req.method === "POST" && approvalDecision) {
        if (user.status === "paused") return json(res, 423, { error: "Account is paused." });
        const body = await readJson(req);
        const input = approvalDecisionSchema.parse(body);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => {
            const approval = await decideProductApproval(db, user.id, approvalDecision[1], input.decision);
            return approval
              ? { status: 200, body: { approval } }
              : { status: 404, body: { error: "Pending approval not found." } };
          }
        });
      }
      if (req.method === "PUT" && url.pathname === "/api/v1/onboarding") {
        if (user.status === "paused") return json(res, 423, { error: "Account is paused." });
        const body = await readJson(req);
        const record = onboardingSchema.parse(body);
        const completed = record.consent.truthConfirmed;
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => ({
            status: 200,
            body: {
              onboarding: await (async () => {
                const onboarding = await saveProductOnboarding(db, user.id, {
                  record,
                  completed,
                  consentVersion: CONSENT_VERSION,
                  consentedAt: new Date().toISOString()
                });
                const policy = await saveAutomationPolicy(db, user.id, {
                  mode: "approval_required",
                  recruiterDrafts: record.consent.recruiterDrafts,
                  recruiterSends: record.consent.recruiterSends,
                  assistedApplications: record.consent.assistedApplications,
                  controlledSubmissions: record.consent.controlledSubmissions,
                  maxDraftsPerDay: 50,
                  maxRecruiterSendsPerDay: 10,
                  maxApplicationsPerDay: 10,
                  maxApplicationsPerBoard: 5,
                  quietHoursStart: 23,
                  quietHoursEnd: 7,
                  timeZone: record.timeZone
                });
                await recordConsentSnapshot(db, user.id, {
                  career_truth: record.consent.truthConfirmed,
                  recruiter_drafts: record.consent.recruiterDrafts,
                  recruiter_sends: record.consent.recruiterSends,
                  assisted_applications: record.consent.assistedApplications,
                  controlled_submissions: record.consent.controlledSubmissions,
                  google_data: false
                }, policy as unknown as Record<string, unknown>);
                await ensureConnectorCapabilities(db, user.id);
                if (completed) {
                  await recordFunnelEvent(
                    db,
                    user.id,
                    "onboarding_completed",
                    {},
                    "onboarding_completed"
                  );
                }
                return onboarding;
              })()
            }
          })
        });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/account/pause") {
        if (!hasRecentAuthentication(user)) return json(res, 401, { error: "Sign in again before pausing the account." });
        await revokeProductGmailOAuth(db, user.id).catch(() => ({ providerRevoked: false }));
        await revokeProductConnection(db, user.id, "gmail").catch(() => null);
        await setProductAccountStatus(db, user.id, "paused");
        await revokeAllSessions(db, user.id);
        clearSessionCookie(res);
        return json(res, 200, { paused: true });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/account/resume") {
        if (!hasRecentAuthentication(user)) return json(res, 401, { error: "Sign in again before resuming the account." });
        const onboarding = await getProductOnboarding(db, user.id);
        const status = onboarding?.completed ? "active" : "onboarding";
        await setProductAccountStatus(db, user.id, status);
        return json(res, 200, { resumed: true, status });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/account/export") {
        if (!hasRecentAuthentication(user)) return json(res, 401, { error: "Sign in again before exporting account data." });
        return json(res, 200, await exportProductAccount(db, user.id));
      }
      if (req.method === "DELETE" && url.pathname === "/api/v1/account") {
        if (!hasRecentAuthentication(user)) return json(res, 401, { error: "Sign in again before deleting the account." });
        const input = accountDeletionSchema.parse(await readJson(req));
        const found = await db.query("SELECT password_hash FROM product_users WHERE id=$1", [user.id]);
        if (!found.rows[0] || !verifyPassword(input.password, found.rows[0].password_hash)) {
          return json(res, 401, { error: "Current password is incorrect." });
        }
        const storedObjects = await listProductPrivateStorageObjects(db, user.id);
        try {
          for (const object of storedObjects) {
            assertPrivateStorageOwnership(user.id, object.storageKey);
            if (object.storageDriver !== storage.driver) {
              throw new Error("Configured storage does not match an account object.");
            }
            await storage.deleteObject(object.storageKey);
          }
        } catch {
          return json(res, 503, { error: "Private files could not be purged. Account deletion was not completed." });
        }
        const providerRevocation = await revokeProductGmailOAuth(db, user.id)
          .catch(() => ({ providerRevoked: false }));
        const deleted = await deleteProductAccount(db, user.id);
        clearSessionCookie(res);
        return json(
          res,
          deleted ? 200 : 404,
          deleted ? { deleted: true, ...providerRevocation } : { error: "Account not found." }
        );
      }
      if (req.method === "GET" && url.pathname === "/api/v1/audit-logs") {
        return json(res, 200, { auditLogs: await productAuditLog(db, user.id, Number(url.searchParams.get("limit") || 50)) });
      }
      return json(res, 404, { error: "Not found." });
    } catch (error) {
      if (error instanceof z.ZodError) return json(res, 400, { error: "Invalid request.", details: error.issues });
      console.error(JSON.stringify({
        event: "request_failed",
        errorClass: error instanceof Error ? error.name : "UnknownError"
      }));
      return json(res, 500, { error: "Internal server error." });
    }
  });
}

export async function startProductServer(): Promise<void> {
  const server = await createProductServer();
  server.listen(PORT, HOST, () => console.log(JSON.stringify({
    event: "server_ready",
    host: HOST,
    port: PORT
  })));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  startProductServer().catch((error) => {
    console.error(JSON.stringify({
      event: "server_failed",
      errorClass: error instanceof Error ? error.name : "UnknownError"
    }));
    process.exitCode = 1;
  });
}
