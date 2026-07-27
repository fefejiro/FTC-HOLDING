import crypto from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  authenticatedUser,
  clearSessionCookie,
  createSession,
  hasRecentAuthentication,
  hashPassword,
  revokeCurrentSession,
  setSessionCookie,
  verifyPassword
} from "./product_auth.js";
import { assertProductDatabaseRole, getProductPool, migrateProductDb } from "./product_db.js";
import { executeIdempotentMutation, normalizeIdempotencyKey, type MutationResponse } from "./product_idempotency.js";
import {
  completeProductObjectDeletion,
  deleteProductAccount,
  deleteProductResume,
  decideProductApproval,
  exportProductAccount,
  getCareerTruthBank,
  getProductOnboarding,
  getProductResumeBySha,
  getProductResumeObject,
  listProductConnections,
  listProductResumeStorageObjects,
  listProductResumes,
  productActivationReadiness,
  productAuditLog,
  productDashboard,
  requestProductConnection,
  revokeProductConnection,
  saveCareerTruthBank,
  saveProductOnboarding,
  saveProductResume,
  setProductAccountStatus
} from "./product_repository.js";
import {
  assertResumeStorageOwnership,
  buildResumeStorageKey,
  createProductObjectStorage,
  type ProductObjectStorage
} from "./product_object_storage.js";
import { validateResumeUpload } from "./product_resume.js";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 3000);
const CONSENT_VERSION = "2026-07-23";
const MAX_BODY_BYTES = 7_500_000;

const registrationSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(12).max(200),
  inviteCode: z.string().min(1).max(200)
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(200)
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
    category: z.string().min(2).max(80),
    statement: z.string().min(3).max(1000),
    sourceResumeId: z.string().uuid().optional()
  })).min(1).max(300)
});

const connectionSchema = z.object({
  provider: z.enum(["gmail", "linkedin", "indeed"])
});

const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"])
});

const accountDeletionSchema = z.object({
  password: z.string().min(1).max(200),
  confirmation: z.literal("DELETE")
});

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: IncomingMessage): string {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function rateLimited(req: IncomingMessage, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const key = clientKey(req);
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  return current.count > limit;
}

function securityHeaders(res: ServerResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
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
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) throw new Error("Request body exceeds the allowed size.");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
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
  const expected = String(process.env.APP_ORIGIN || "").replace(/\/$/, "");
  if (!expected) return process.env.NODE_ENV !== "production";
  return String(req.headers.origin || "").replace(/\/$/, "") === expected;
}

export function constantEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
    $("connections").addEventListener("click",async e=>{const provider=e.target.dataset?.provider;if(!provider)return;try{await call("/api/v1/connections",{method:"POST",body:JSON.stringify({provider})});$("connection-result").textContent="Connection prepared. Authentication is still required before activation.";await loadConnections()}catch(error){$("connection-result").textContent=error.message}});
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

export async function createProductServer(storage: ProductObjectStorage = createProductObjectStorage()) {
  const db = getProductPool();
  if (process.env.AUTO_MIGRATE === "true") await migrateProductDb(db);
  if (process.env.NODE_ENV === "production") {
    await assertProductDatabaseRole(db);
    await storage.assertReady();
  }
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (rateLimited(req)) return json(res, 429, { error: "Too many requests. Try again shortly." });
      if (!mutationOriginAllowed(req)) return json(res, 403, { error: "Origin rejected." });

      if (req.method === "GET" && url.pathname === "/healthz") return json(res, 200, { ok: true });
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
      if (req.method === "GET" && url.pathname === "/manifest.webmanifest") {
        securityHeaders(res);
        res.writeHead(200, { "content-type": "application/manifest+json" });
        return res.end(JSON.stringify({ name: "Una Labs JobAgent", short_name: "JobAgent", start_url: "/", display: "standalone", background_color: "#f4f6f8", theme_color: "#17202a" }));
      }
      if (req.method === "GET" && url.pathname === "/sw.js") {
        securityHeaders(res);
        res.writeHead(200, { "content-type": "text/javascript", "cache-control": "no-cache" });
        return res.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===location.origin)e.respondWith(fetch(e.request).catch(()=>new Response('Offline',{status:503})))})");
      }

      if (req.method === "POST" && url.pathname === "/api/v1/auth/register") {
        const input = registrationSchema.parse(await readJson(req));
        const expectedInvite = String(process.env.JOB_AGENT_INVITE_CODE || "");
        if (!expectedInvite || !constantEqual(input.inviteCode, expectedInvite)) return json(res, 403, { error: "Invalid invitation." });
        const passwordHash = hashPassword(input.password);
        const client = await db.connect();
        try {
          await client.query("BEGIN");
          const inserted = await client.query(
            "INSERT INTO product_users (email, password_hash) VALUES ($1, $2) RETURNING id, email, status",
            [input.email, passwordHash]
          );
          await client.query("SELECT set_config('app.user_id', $1, true)", [inserted.rows[0].id]);
          await client.query(
            "INSERT INTO product_onboarding (user_id) VALUES ($1)",
            [inserted.rows[0].id]
          );
          await client.query(
            "INSERT INTO product_audit_logs (user_id, actor_user_id, action, target_type, target_id) VALUES ($1::uuid,$1::uuid,'account.created','user',$1::text)",
            [inserted.rows[0].id]
          );
          await client.query("COMMIT");
          const token = await createSession(db, inserted.rows[0].id);
          setSessionCookie(res, token);
          return json(res, 201, { user: inserted.rows[0] });
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
        const found = await db.query(
          "SELECT id, email, status, password_hash FROM product_users WHERE email=$1 AND status <> 'deleted' LIMIT 1",
          [input.email]
        );
        const user = found.rows[0];
        if (!user || !verifyPassword(input.password, user.password_hash)) return json(res, 401, { error: "Invalid email or password." });
        const token = await createSession(db, user.id);
        setSessionCookie(res, token);
        return json(res, 200, { user: { id: user.id, email: user.email, status: user.status } });
      }

      const user = await authenticatedUser(req, db);
      if (req.method === "GET" && url.pathname === "/") return html(res, 200, renderPage(Boolean(user)));
      if (!user && url.pathname.startsWith("/api/v1/")) return json(res, 401, { error: "Authentication required." });
      if (!user) return json(res, 404, { error: "Not found." });

      if (req.method === "POST" && url.pathname === "/api/v1/auth/logout") {
        await revokeCurrentSession(req, db);
        clearSessionCookie(res);
        return json(res, 200, { ok: true });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/me") return json(res, 200, { user });
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
        const body = await readJson(req);
        const input = connectionSchema.parse(body);
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => ({
            status: 202,
            body: { connection: await requestProductConnection(db, user.id, input.provider) }
          })
        });
      }
      const connectionRevoke = url.pathname.match(/^\/api\/v1\/connections\/(gmail|linkedin|indeed)$/);
      if (req.method === "DELETE" && connectionRevoke) {
        if (!hasRecentAuthentication(user)) return json(res, 401, { error: "Sign in again before revoking a connection." });
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body: {},
          action: async () => {
            const connection = await revokeProductConnection(db, user.id, connectionRevoke[1]);
            return connection
              ? { status: 200, body: { connection } }
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
        const completed = record.consent.truthConfirmed && record.consent.assistedApplications;
        return idempotentMutation(req, res, {
          db, userId: user.id, requestPath: url.pathname, body,
          action: async () => ({
            status: 200,
            body: {
              onboarding: await saveProductOnboarding(db, user.id, {
                record,
                completed,
                consentVersion: CONSENT_VERSION,
                consentedAt: new Date().toISOString()
              })
            }
          })
        });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/account/pause") {
        if (!hasRecentAuthentication(user)) return json(res, 401, { error: "Sign in again before pausing the account." });
        await setProductAccountStatus(db, user.id, "paused");
        await db.query("DELETE FROM product_sessions WHERE user_id=$1", [user.id]);
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
        const storedObjects = await listProductResumeStorageObjects(db, user.id);
        try {
          for (const object of storedObjects) {
            assertResumeStorageOwnership(user.id, object.storageKey);
            if (object.storageDriver !== storage.driver) {
              throw new Error("Configured storage does not match an account object.");
            }
            await storage.deleteObject(object.storageKey);
          }
        } catch {
          return json(res, 503, { error: "Private files could not be purged. Account deletion was not completed." });
        }
        const deleted = await deleteProductAccount(db, user.id);
        clearSessionCookie(res);
        return json(res, deleted ? 200 : 404, deleted ? { deleted: true } : { error: "Account not found." });
      }
      if (req.method === "GET" && url.pathname === "/api/v1/audit-logs") {
        return json(res, 200, { auditLogs: await productAuditLog(db, user.id, Number(url.searchParams.get("limit") || 50)) });
      }
      return json(res, 404, { error: "Not found." });
    } catch (error) {
      if (error instanceof z.ZodError) return json(res, 400, { error: "Invalid request.", details: error.issues });
      console.error(error);
      return json(res, 500, { error: "Internal server error." });
    }
  });
}

export async function startProductServer(): Promise<void> {
  const server = await createProductServer();
  server.listen(PORT, HOST, () => console.log(`Una Labs JobAgent product server listening on ${HOST}:${PORT}`));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  startProductServer().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
