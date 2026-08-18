import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const liveBaseUrl = String(process.env.CUSTOMER_SMOKE_BASE_URL || "").trim().replace(/\/$/, "");
const root = path.resolve(import.meta.dirname, "..", "public");
const artifactRoot = path.resolve(
  process.env.CUSTOMER_SMOKE_ARTIFACT_DIR || path.join(import.meta.dirname, "..", ".local", "qa-revenue-launch")
);
const storeScreenshotRoot = String(process.env.STORE_SCREENSHOT_DIR || "").trim();
const mime = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const user = { id: "smoke-user", email: "smoke@example.test", role: "candidate", status: "active", emailVerified: true, mfaEnabled: false };
const jobId = "11111111-1111-4111-8111-111111111111";
const applicationId = "22222222-2222-4222-8222-222222222222";

const storeScenes = [
  {
    key: "01-fit",
    title: "See the jobs worth your time",
    subtitle: "Explainable fit scores show verified matches and real gaps.",
    prepare: async (page) => {
      await page.locator('[data-view="opportunities"]').click();
      await page.getByRole("button", { name: "Analyze fit" }).click();
      await page.locator("#job-insight-form textarea").fill("Requirements discovery, UAT, and stakeholder delivery.");
      await page.getByRole("button", { name: "Analyze", exact: true }).click();
      await page.waitForFunction(() => document.querySelector("#job-insight-result")?.textContent?.includes("Fit score: 88%"));
    },
  },
  {
    key: "02-truth",
    title: "Tailor without inventing",
    subtitle: "Build role-specific packages from career facts you approved.",
    prepare: async (page) => page.locator('[data-view="resumes"]').click(),
  },
  {
    key: "03-proof",
    title: "Know what happened next",
    subtitle: "Track applications and confirmation evidence in one timeline.",
    prepare: async (page) => {
      await page.locator('[data-view="activity"]').click();
      await page.getByRole("button", { name: "Timeline" }).click();
      await page.locator("#timeline-list").waitFor({ state: "visible" });
    },
  },
  {
    key: "04-interview",
    title: "Prepare from real experience",
    subtitle: "Practice job-specific questions using facts you can stand behind.",
    prepare: async (page) => page.locator('[data-view="interview"]').click(),
  },
  {
    key: "05-control",
    title: "Stay in control",
    subtitle: "Pause assistance, revoke connections, export, or delete your account.",
    prepare: async (page) => page.locator('[data-view="security"]').click(),
  },
];

async function captureStoreScene(browserInstance, base, scene, specification, destination) {
  const context = await browserInstance.newContext({
    viewport: { width: specification.cssWidth, height: specification.cssHeight },
    deviceScaleFactor: specification.deviceScaleFactor,
  });
  const page = await context.newPage();
  await page.goto(`${base}/app`, { waitUntil: "networkidle" });
  await page.locator("#app-shell").waitFor({ state: "visible" });
  await scene.prepare(page);
  const productImage = await page.screenshot({ type: "png" });
  await context.close();

  const canvas = await browserInstance.newPage({ viewport: { width: specification.width, height: specification.height } });
  const imageUrl = `data:image/png;base64,${productImage.toString("base64")}`;
  await canvas.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#eef1f3;color:#12181d;font-family:Arial,sans-serif;letter-spacing:0}
    main{width:100%;height:100%;display:grid;grid-template-rows:${specification.headerHeight}px 1fr;border-top:${Math.max(12, Math.round(specification.width * .014))}px solid #ef4d18}
    header{display:flex;flex-direction:column;justify-content:center;padding:0 ${Math.round(specification.width * .075)}px;background:#eef1f3}
    .brand{font-size:${Math.round(specification.width * .028)}px;font-weight:800;color:#bf3a12;margin-bottom:${Math.round(specification.headerHeight * .09)}px}
    h1{font-size:${Math.round(specification.width * .057)}px;line-height:1.05;margin:0 0 ${Math.round(specification.headerHeight * .07)}px;max-width:95%}
    p{font-size:${Math.round(specification.width * .027)}px;line-height:1.32;margin:0;max-width:92%;color:#40505a}
    .product{position:relative;overflow:hidden;background:#fff;border-top:1px solid #cbd3d8}
    .product img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center}
    .sample{position:absolute;right:${Math.round(specification.width * .03)}px;bottom:${Math.round(specification.width * .03)}px;background:#12181d;color:#fff;font-size:${Math.round(specification.width * .018)}px;padding:${Math.round(specification.width * .012)}px ${Math.round(specification.width * .018)}px;border-radius:4px}
  </style></head><body><main><header><div class="brand">UnaScout by Una Labs</div><h1>${scene.title}</h1><p>${scene.subtitle}</p></header><div class="product"><img src="${imageUrl}" alt=""><span class="sample">Sample job data</span></div></main></body></html>`);
  await canvas.screenshot({ path: destination, type: "png" });
  await canvas.close();
}

async function captureStoreAssets(browserInstance, base, destinationRoot) {
  const appleRoot = path.join(destinationRoot, "apple", "iphone-6.9");
  const googleRoot = path.join(destinationRoot, "google", "phone");
  fs.mkdirSync(appleRoot, { recursive: true });
  fs.mkdirSync(googleRoot, { recursive: true });
  const specifications = [
    { root: appleRoot, width: 1290, height: 2796, headerHeight: 516, cssWidth: 430, cssHeight: 760, deviceScaleFactor: 3 },
    { root: googleRoot, width: 1080, height: 1920, headerHeight: 360, cssWidth: 360, cssHeight: 520, deviceScaleFactor: 3 },
  ];
  for (const specification of specifications) {
    for (const scene of storeScenes) {
      await captureStoreScene(browserInstance, base, scene, specification, path.join(specification.root, `${scene.key}.png`));
    }
  }

  const icon = fs.readFileSync(path.join(root, "icon.png")).toString("base64");
  const feature = await browserInstance.newPage({ viewport: { width: 1024, height: 500 } });
  await feature.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:Arial,sans-serif;letter-spacing:0;background:#eef1f3;color:#12181d}
    main{height:100%;display:grid;grid-template-columns:54% 46%;border-top:14px solid #ef4d18}
    section{display:flex;flex-direction:column;justify-content:center;padding:56px 30px 50px 68px}
    .brand{display:flex;align-items:center;gap:14px;font-size:25px;font-weight:800;color:#bf3a12;margin-bottom:26px}.brand img{width:52px;height:52px;border-radius:8px}
    h1{font-size:49px;line-height:1.02;margin:0;max-width:500px}.right{display:flex;align-items:center;justify-content:center;padding:42px 58px 42px 10px}
    .proof{width:100%;background:#fff;border:1px solid #cbd3d8;border-radius:8px;padding:26px;box-shadow:0 18px 40px rgba(17,24,29,.12)}
    .score{font-size:58px;font-weight:800;color:#168264}.label{font-size:21px;font-weight:700;margin:2px 0 22px}.row{font-size:19px;padding:13px 0;border-top:1px solid #dbe0e3}.tick{color:#168264;font-weight:900;margin-right:8px}
  </style></head><body><main><section><div class="brand"><img src="data:image/png;base64,${icon}" alt="">UnaScout by Una Labs</div><h1>Know the fit.<br>Tailor the truth.<br>Track the proof.</h1></section><div class="right"><div class="proof"><div class="score">88%</div><div class="label">Explainable role fit</div><div class="row"><span class="tick">✓</span>Verified experience matched</div><div class="row"><span class="tick">✓</span>Real gaps shown clearly</div><div class="row"><span class="tick">✓</span>Application proof organized</div></div></div></main></body></html>`);
  fs.mkdirSync(path.join(destinationRoot, "google"), { recursive: true });
  await feature.screenshot({ path: path.join(destinationRoot, "google", "feature-graphic-1024x500.png"), type: "png" });
  await feature.close();
  console.log(`store screenshots generated: ${destinationRoot}`);
}

function json(res, status, body) { res.writeHead(status, { "content-type": "application/json", "set-cookie": "jobagent_csrf=smoke-csrf" }); res.end(JSON.stringify(body)); }
function staticFile(req, res) {
  const pathname = req.url.split("?")[0];
  const requestPath = pathname === "/"
    ? "/landing.html"
    : pathname === "/app" ? "/index.html" : pathname;
  const file = path.resolve(root, `.${requestPath}`);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("Not found"); return; }
  res.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" }); fs.createReadStream(file).pipe(res);
}
const server = http.createServer((req, res) => {
  if (!req.url?.startsWith("/api/")) return staticFile(req, res);
  if (req.url === "/api/v1/me") return json(res, 200, { user });
  if (req.url === "/api/v1/plans") return json(res, 200, { plans: [
    { code: "free_preview", name: "Free Preview", amountCadCents: 0, interval: null, allowances: { fit_analysis: 3, tailored_package: 1 }, features: [] },
    { code: "sprint_weekly", name: "Job Search Sprint", amountCadCents: 999, interval: "week", allowances: { fit_analysis: 15, tailored_package: 5 }, features: [] },
    { code: "jobagent_monthly", name: "UnaScout Monthly", amountCadCents: 2999, interval: "month", allowances: { fit_analysis: 100, tailored_package: 25 }, features: [] },
    { code: "jobagent_annual", name: "UnaScout Annual", amountCadCents: 23999, interval: "year", allowances: { fit_analysis: 100, tailored_package: 25 }, features: [] }
  ] });
  if (req.url === "/api/v1/billing/entitlement" || req.url === "/api/v1/billing/usage") return json(res, 200, {
    entitlement: { planCode: "free_preview", status: "active", source: "system", periodEnd: "2026-09-01T00:00:00.000Z" },
    usage: { fit_analysis: { used: 1, remaining: 2, limit: 3 }, tailored_package: { used: 0, remaining: 1, limit: 1 } }
  });
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
  fs.mkdirSync(artifactRoot, { recursive: true });
  for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 1000 }]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.locator("#pricing").waitFor({ state: "visible" });
    if (!(await page.locator("body").innerText()).includes("UnaScout Monthly")) {
      throw new Error(`${viewport.name}: public pricing did not render`);
    }
    const landingOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (landingOverflow) throw new Error(`${viewport.name}: public page has horizontal overflow`);
    await page.screenshot({
      path: path.join(artifactRoot, `${viewport.name}-landing.png`),
      fullPage: true
    });
    await page.goto(`${baseUrl}/app`, { waitUntil: "networkidle" });
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
    const appOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (appOverflow) throw new Error(`${viewport.name}: workspace has horizontal overflow`);
    await page.screenshot({
      path: path.join(artifactRoot, `${viewport.name}-workspace.png`),
      fullPage: true
    });
    console.log(`customer journey smoke passed: ${viewport.name} (${viewport.width}x${viewport.height})`);
    await page.close();
  }
  if (storeScreenshotRoot) await captureStoreAssets(browser, baseUrl, path.resolve(storeScreenshotRoot));
} finally { await browser.close(); if (!liveBaseUrl) server.close(); }
