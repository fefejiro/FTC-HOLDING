import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const liveBaseUrl = String(process.env.CUSTOMER_SMOKE_BASE_URL || "").trim().replace(/\/$/, "");
const root = path.resolve(import.meta.dirname, "..", "public");
const mime = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const user = { id: "smoke-user", email: "smoke@example.test", role: "candidate", status: "active", emailVerified: true, mfaEnabled: false };
const jobId = "11111111-1111-4111-8111-111111111111";
const applicationId = "22222222-2222-4222-8222-222222222222";

function json(res, status, body) { res.writeHead(status, { "content-type": "application/json", "set-cookie": "jobagent_csrf=smoke-csrf" }); res.end(JSON.stringify(body)); }
function staticFile(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.resolve(root, `.${requestPath}`);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("Not found"); return; }
  res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res);
}
const server = http.createServer((req, res) => {
  if (!req.url?.startsWith("/api/")) return staticFile(req, res);
  if (req.url === "/api/v1/me") return json(res, 200, { user });
  if (req.url === "/api/v1/onboarding") return json(res, 200, { onboarding: { completed: true, record: { fullName: "Smoke Candidate", phone: "555-0100", location: "Toronto, ON", timeZone: "America/Toronto", linkedIn: "https://www.linkedin.com/in/smoke", targetTitles: ["Business Analyst"], excludedTitles: [], locations: ["Remote"], workModes: ["remote"], employmentTypes: ["permanent"], compensationFloor: "$100,000", workAuthorization: "Authorized to work", sponsorshipRequired: false, consent: { truthConfirmed: true, assistedApplications: true } } } });
  if (req.url === "/api/v1/automation-policy") return json(res, 200, { policy: { mode: "approval_required", timeZone: "America/Toronto", maxDraftsPerDay: 50, maxRecruiterSendsPerDay: 10, maxApplicationsPerDay: 10, maxApplicationsPerBoard: 5, quietHoursStart: 23, quietHoursEnd: 7, recruiterDrafts: true, recruiterSends: false, assistedApplications: true, controlledSubmissions: false } });
  if (req.url === "/api/v1/resumes") return json(res, 200, { resumes: [{ id: "33333333-3333-4333-8333-333333333333", filename: "smoke-resume.docx", byteSize: 1024, storageStatus: "private", isDefault: true }] });
  if (req.url === "/api/v1/career-truth") return json(res, 200, { truthBank: { facts: [{ id: "fact-1", statement: "Requirements discovery and UAT", verificationStatus: "approved" }] } });
  if (req.url === "/api/v1/connectors/capabilities") return json(res, 200, { connectors: [{ source: "gmail", status: "pilot_only", discovery: true, packageGeneration: true, assistedSubmission: false, controlledSubmission: false, proofReconciliation: true }, { source: "linkedin", status: "pilot_only", discovery: true, packageGeneration: true, assistedSubmission: true, controlledSubmission: false, proofReconciliation: true }] });
  if (req.url === "/api/v1/connections") return json(res, 200, { connections: [] });
  if (req.url === "/api/v1/activation-readiness") return json(res, 200, { checks: [{ key: "profile", ready: true }, { key: "approved_resume", ready: true }] });
  if (req.url === "/api/v1/analytics/conversion") return json(res, 200, { recruiterReplies: 1, interviews: 1, offers: 0 });
  if (req.url === "/api/v1/interview-prep") return json(res, 200, { sessions: [{ title: "Business Analyst interview", company: "Example Co", status: "ready", questions: [{ prompt: "Tell us about requirements discovery." }] }] });
  if (req.url === "/api/v1/audit-logs?limit=50") return json(res, 200, { auditLogs: [{ action: "profile_saved", targetType: "profile", createdAt: "2026-08-16T12:00:00Z" }] });
  if (req.url === "/api/v1/dashboard") return json(res, 200, { recommendations: [{ id: jobId, title: "Business Analyst", company: "Example Co", location: "Remote", source: "linkedin", score: 88, status: "recommended", jobUrl: "https://example.test/jobs/1" }], approvals: [{ id: "44444444-4444-4444-8444-444444444444", title: "Review application", company: "Example Co", reason: "Your approval is required", createdAt: "2026-08-16T12:00:00Z" }], applications: [{ id: applicationId, title: "IT Manager", company: "Example Co", source: "linkedin", status: "submitted_verified", evidenceId: "55555555-5555-4555-8555-555555555555", evidenceReference: "proof/smoke.png", finalUrl: "https://example.test/applied", updatedAt: "2026-08-16T12:00:00Z" }] });
  if (/^\/api\/v1\/jobs\/[^/]+\/insights$/.test(req.url)) return json(res, 200, { insight: { matchExplanation: { score: 88, matchedRequirements: ["requirements discovery"], missingRequirements: [], policyConflicts: [], evidenceFactIds: ["fact-1"] }, atsGapReport: { coveredTerms: ["UAT"], unsupportedTerms: [] } } });
  if (/^\/api\/v1\/applications\/[^/]+\/timeline$/.test(req.url)) return json(res, 200, { events: [{ eventType: "submitted_verified", actorType: "runner", occurredAt: "2026-08-16T12:00:00Z" }] });
  if (/^\/api\/v1\/jobs\/[^/]+\/interview-prep$/.test(req.url)) return json(res, 201, { session: {} });
  if (/^\/api\/v1\/(approvals|applications\/[^/]+\/outcomes)/.test(req.url)) return json(res, 200, { ok: true });
  return json(res, 200, {});
});

const browser = await chromium.launch({ headless: true });
if (liveBaseUrl && !/^https:\/\//i.test(liveBaseUrl)) throw new Error("CUSTOMER_SMOKE_BASE_URL must use HTTPS.");
if (liveBaseUrl && (!process.env.CUSTOMER_SMOKE_EMAIL || !process.env.CUSTOMER_SMOKE_PASSWORD)) throw new Error("CUSTOMER_SMOKE_EMAIL and CUSTOMER_SMOKE_PASSWORD are required for live smoke.");
if (!liveBaseUrl) await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = liveBaseUrl || `http://127.0.0.1:${server.address().port}`;
try {
  for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 1000 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    if (liveBaseUrl) {
      await page.locator('#login-form input[name="email"]').fill(process.env.CUSTOMER_SMOKE_EMAIL);
      await page.locator('#login-form input[name="password"]').fill(process.env.CUSTOMER_SMOKE_PASSWORD || "");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.locator("#app-shell").waitFor({ state: "visible", timeout: 20_000 });
      const releaseResponse = await page.request.get(`${baseUrl}/api/v1/release`);
      if (!releaseResponse.ok()) throw new Error(`live release endpoint returned ${releaseResponse.status()}`);
    }
    await page.locator('[data-view="opportunities"]').click();
    await page.getByRole("button", { name: "Analyze fit" }).click();
    await page.locator("#job-insight-form textarea").fill("Requirements discovery, UAT, and stakeholder delivery.");
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await page.locator("#job-insight-result").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelector("#job-insight-result")?.textContent?.includes("Fit score: 88%"));
    if (!(await page.locator("#job-insight-result").innerText()).includes("Fit score: 88%")) throw new Error(`${viewport.name}: fit analysis was not rendered`);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.locator('[data-view="activity"]').click();
    await page.getByRole("button", { name: "Timeline" }).click();
    await page.locator("#timeline-list").waitFor({ state: "visible" });
    if (!(await page.locator("#timeline-list").innerText()).includes("submitted verified")) throw new Error(`${viewport.name}: proof timeline was not rendered`);
    await page.getByRole("button", { name: "Close" }).last().click();
    await page.locator('[data-view="approvals"]').click();
    await page.getByRole("button", { name: "Approve" }).click();
    await page.locator('[data-view="interview"]').click();
    const body = await page.locator("body").innerText();
    if (!body.includes("Business Analyst interview")) throw new Error(`${viewport.name}: interview prep was not rendered: ${body.slice(-500)}`);
    console.log(`customer journey smoke passed: ${viewport.name} (${viewport.width}x${viewport.height})`);
    await page.close();
  }
} finally { await browser.close(); if (!liveBaseUrl) server.close(); }
