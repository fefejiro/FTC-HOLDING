export interface Env {
  ATEAM_UPSTREAM_ORIGIN?: string;
  CANONICAL_SITE_ORIGIN?: string;
  CANONICAL_OPS_ORIGIN?: string;
}

type WorkflowRun = {
  id: string;
  phase?: string;
  title?: string;
  idea?: string;
  category?: string;
  recommendedLane?: string;
  questions?: Array<{ id: string; prompt: string; hint?: string; placeholder?: string }>;
  answers?: Record<string, string>;
  brief?: Record<string, unknown>;
  artifacts?: Record<string, unknown>;
  project?: Record<string, unknown>;
  jobs?: Array<Record<string, unknown>>;
  artifactSummaries?: Array<Record<string, unknown>>;
  history?: Array<Record<string, unknown>>;
  handoff?: Record<string, unknown>;
  statusNarrative?: Record<string, unknown>;
  publicFlow?: {
    modules?: Array<Record<string, unknown>>;
    understanding?: Record<string, unknown>;
  };
};

function trimTrailingSlash(value = "") {
  return String(value || "").replace(/\/+$/, "");
}

function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

function html(body: string, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(body, { ...init, headers });
}

function getUpstreamOrigin(env: Env) {
  return trimTrailingSlash(env.ATEAM_UPSTREAM_ORIGIN || "");
}

function getOpsOrigin(env: Env) {
  return trimTrailingSlash(env.CANONICAL_OPS_ORIGIN || "https://ops.unalabs.cloud");
}

function redirect(location: string, status = 302) {
  return new Response(null, {
    status,
    headers: {
      location,
      "cache-control": "no-store"
    }
  });
}

function normalizeProxyHeaders(headers: Headers, request: Request) {
  const nextHeaders = new Headers(headers);
  [
    "authorization",
    "x-ateam-tenant-id",
    "x-ateam-workspace-id",
    "x-ateam-user-id",
    "x-ateam-role",
    "x-ateam-operator-email",
    "x-ateam-proxy-key",
    "cf-access-jwt-assertion",
    "cf-access-authenticated-user-email"
  ].forEach((header) => nextHeaders.delete(header));
  nextHeaders.set("x-forwarded-host", new URL(request.url).host);
  nextHeaders.set("x-forwarded-proto", "https");
  nextHeaders.delete("host");
  return nextHeaders;
}

function isPublicWorkflowApiPath(pathname = "") {
  const normalized = String(pathname || "").trim();
  return normalized === "/api/ateam/workflow" || normalized.startsWith("/api/ateam/workflow/");
}

async function proxyWorkflowRequest(request: Request, env: Env) {
  const origin = getUpstreamOrigin(env);
  if (!origin) {
    return json({ ok: false, message: "ATEAM workflow service is not connected yet." }, { status: 503 });
  }

  const url = new URL(request.url);
  if (!isPublicWorkflowApiPath(url.pathname)) {
    return json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const upstreamUrl = new URL(origin + url.pathname.replace(/^\/api\/ateam/, "/api") + url.search);
  const upstreamRequest = new Request(upstreamUrl.toString(), {
    method: request.method,
    headers: normalizeProxyHeaders(request.headers, request),
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "follow"
  });

  try {
    const response = await fetch(upstreamRequest);
    const headers = new Headers(response.headers);
    headers.set("cache-control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    return json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to reach the ATEAM workflow service."
      },
      { status: 502 }
    );
  }
}

function buildPage(canonicalOrigin: string, opsOrigin: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ATEAM | Una Labs</title>
  <meta name="description" content="ATEAM turns a rough idea into a structured run, visible work, preview artifacts, and a clean project handoff with Una Labs." />
  <link rel="canonical" href="${canonicalOrigin}/ateam" />
  <style>
    :root{--bg:#f6f1e8;--ink:#10211b;--muted:#5e6b66;--line:rgba(16,33,27,.12);--brand:#0f8f62;--brand2:#0b6d4b;--warn:#a14f1e;--soft:rgba(15,143,98,.08)}
    *{box-sizing:border-box}
    body{margin:0;font-family:Segoe UI,Inter,system-ui,sans-serif;color:var(--ink);background:radial-gradient(circle at top left,rgba(245,155,66,.16),transparent 30%),radial-gradient(circle at top right,rgba(15,143,98,.16),transparent 26%),linear-gradient(180deg,#fbf7ef 0%,#f6f1e8 58%,#ece6da 100%)}
    a{color:inherit}.shell{max-width:1180px;margin:0 auto;padding:28px 18px 64px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:22px;flex-wrap:wrap}
    .brand{display:flex;gap:12px;align-items:center;text-decoration:none}.brand img{width:42px;height:42px}.eyebrow{margin:0 0 8px;font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;color:var(--brand2);font-weight:700}
    .text-link{font-size:.92rem;color:var(--muted);text-decoration:none}.text-link:hover{text-decoration:underline}
    .card{background:rgba(255,250,243,.96);border:1px solid rgba(255,255,255,.5);border-radius:24px;padding:24px;box-shadow:0 18px 40px rgba(16,33,27,.1)} .hero,.layout{display:grid;gap:20px}
    .hero{grid-template-columns:1.15fr .85fr;margin-bottom:20px}.layout{grid-template-columns:1.28fr .72fr}.stack{display:grid;gap:20px} h1{font-size:clamp(2rem,4vw,3.8rem);line-height:.96;margin:0 0 14px;max-width:12ch}
    h2,h3,p{margin-top:0}.lead,.muted{color:var(--muted)} .lead{font-size:1.04rem;max-width:58ch}.btn{border:0;border-radius:999px;padding:12px 18px;font:inherit;cursor:pointer;text-decoration:none;display:inline-block}
    .btn-primary{background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff}.btn-secondary{background:rgba(255,255,255,.78);border:1px solid var(--line)}.btn-ghost{background:transparent;border:1px solid var(--line)}
    .actions,.meta,.grid2,.module-grid,.timeline,.questions,.hero-actions,.intake-toolbar{display:grid;gap:12px}.actions,.hero-actions,.intake-toolbar{grid-auto-flow:column;justify-content:start}.meta,.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.module-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
    .module{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.72);padding:16px;display:grid;gap:8px}.module h3,.module p,.module span{margin:0}.module span{color:var(--muted);font-size:.88rem;line-height:1.45}
    .steprail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.step,.box{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.72);padding:14px 16px}
    .step.active{border-color:rgba(15,143,98,.38);box-shadow:inset 0 0 0 1px rgba(15,143,98,.18)}.step.done{background:rgba(15,143,98,.08)}
    textarea,select{width:100%;border:1px solid var(--line);border-radius:18px;padding:14px 16px;font:inherit;background:rgba(255,255,255,.86);color:var(--ink)} textarea{min-height:170px;resize:vertical}
    .field-note{margin-top:8px;color:var(--muted);font-size:.9rem}.state{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;font-size:.92rem;background:rgba(15,143,98,.1);color:var(--brand2)}.state.offline{background:rgba(220,85,60,.1);color:#92322a}.state.checking{background:rgba(245,155,66,.16);color:var(--warn)}
    .notice,.error{margin-top:14px;padding:14px 16px;border-radius:16px}.notice{background:rgba(15,143,98,.08);color:var(--brand2)}.error{background:rgba(220,85,60,.1);color:#92322a}
    .empty{padding:16px;border:1px dashed rgba(16,33,27,.18);border-radius:18px;color:var(--muted);background:rgba(255,255,255,.5)} .tiny{font-size:.92rem}.hero-preview img{width:100%;border-radius:18px;border:1px solid var(--line)}
    .hero-preview-copy{display:grid;gap:10px}.hero-note{padding:14px 16px;border-radius:18px;background:var(--soft);color:var(--brand2)}.flow-head-copy{max-width:48rem}.system-stack,.output-stack{display:grid;gap:12px}.panel-divider{height:1px;background:var(--line);margin:4px 0}
    .voice-btn[data-state="listening"]{background:rgba(15,143,98,.14);border-color:rgba(15,143,98,.28);color:var(--brand2)}.voice-btn[data-state="unsupported"]{opacity:.6;cursor:not-allowed}.status-line{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:.92rem}
    .result-actions{display:flex;gap:12px;flex-wrap:wrap}.result-card-summary{font-size:1rem;line-height:1.6;color:var(--muted)}
    @media (max-width:980px){.hero,.layout,.meta,.grid2,.module-grid,.steprail,.actions,.hero-actions,.intake-toolbar{grid-template-columns:1fr}.actions,.hero-actions,.intake-toolbar{grid-auto-flow:row}}
  </style>
</head>
<body>
  <div class="shell">
    <div class="top">
      <a class="brand" href="/"><img src="/images/brand/ateam-logo.png" alt="" /><div><div class="eyebrow">Una Labs</div><strong>ATEAM Cloud Intake</strong></div></a>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a class="btn btn-primary" href="/work-with-ftc">Start a Project</a>
        <a class="text-link" href="${opsOrigin}/">Operator access</a>
      </div>
    </div>
    <section class="hero">
      <div class="card">
        <p class="eyebrow">ATEAM inside Una Labs</p>
        <h1>Tell ATEAM the rough idea. Get a clear first path.</h1>
        <p class="lead">ATEAM works like a public intent engine. It captures the idea, makes the system state readable, surfaces visible work, and returns a first output pack you can move into Una Labs delivery.</p>
        <div class="meta">
          <div class="box"><strong>Text + voice intake</strong><div class="muted tiny">Speak or type the rough idea first.</div></div>
          <div class="box"><strong>Intent made clear</strong><div class="muted tiny">Audience, first win, lane, and movement reason.</div></div>
          <div class="box"><strong>Visible public work</strong><div class="muted tiny">Jobs and timeline stay readable without admin noise.</div></div>
          <div class="box"><strong>Client-ready output</strong><div class="muted tiny">Artifacts stay tied to the run and hand off cleanly.</div></div>
        </div>
        <div class="hero-actions" style="margin-top:18px">
          <a class="btn btn-primary" href="#public-intake">Start the intake</a>
          <a class="btn btn-secondary" href="/work-with-ftc">Skip to project intake</a>
        </div>
      </div>
      <div class="card hero-preview">
        <div id="serviceState" class="state checking">Checking ATEAM service</div>
        <div class="hero-preview-copy">
          <p class="muted">The public route stays focused on four modules only: Intake, System, Work, and Output.</p>
          <div class="hero-note">No localhost language. No private controls. Just a trustworthy path from rough idea to clear next move.</div>
        </div>
        <img src="/images/brand/ateam-mission-control.png" alt="ATEAM preview" />
      </div>
    </section>
    <section class="card">
      <div class="flow-head-copy">
        <p class="eyebrow">Public flow view</p>
        <h2>Four modules. Nothing extra.</h2>
        <p class="muted">This is the whole public story: capture the idea, show what the system understood, expose the work that moved, and return output worth converting into a Una Labs project.</p>
      </div>
      <div class="module-grid">
        <article class="module"><p class="eyebrow">Intake</p><h3 id="module-intake-state">Ready for intake</h3><p id="module-intake-summary" class="muted tiny">Start with one rough idea by text or voice.</p><span id="module-intake-detail">Capture the rough idea by text or voice, then ask only the last questions needed to move.</span></article>
        <article class="module"><p class="eyebrow">System</p><h3 id="module-system-state">Intent forming</h3><p id="module-system-summary" class="muted tiny">ATEAM will show lane, movement reason, and blocker context once the run is active.</p><span id="module-system-detail">Show what ATEAM understood, which lane it chose, and why the run moved.</span></article>
        <article class="module"><p class="eyebrow">Work</p><h3 id="module-work-state">Work not routed yet</h3><p id="module-work-summary" class="muted tiny">Jobs and timeline movement appear once ATEAM routes the run.</p><span id="module-work-detail">Expose the public-safe jobs and timeline so the flow feels active, not mysterious.</span></article>
        <article class="module"><p class="eyebrow">Output</p><h3 id="module-output-state">Output forming</h3><p id="module-output-summary" class="muted tiny">The output module returns artifacts and a clean delivery handoff once the first pass is believable.</p><span id="module-output-detail">Return run-owned artifacts and a clean handoff into Una Labs delivery.</span></article>
      </div>
    </section>
    <section class="layout">
      <div class="stack">
        <div id="public-intake" class="card">
          <p class="eyebrow">Module 1 - Intake</p>
          <h2>Tell ATEAM what needs to happen.</h2>
          <p class="muted">Start with the rough outcome, product idea, or problem to solve. ATEAM will shape the intent, ask only the last missing questions, and build the first believable output.</p>
          <div id="stepRail" class="steprail"></div>
          <div class="intake-toolbar">
            <button id="voiceBtn" class="btn btn-ghost voice-btn" type="button">Start voice intake</button>
            <div class="state" id="intakeMode">Text intake ready</div>
          </div>
          <label class="tiny">Describe the rough idea or outcome
            <textarea id="idea" placeholder="Example: I want Una Labs to turn a rough service idea into a clear launch path, visible work, and a client-ready first pack."></textarea>
          </label>
          <div class="field-note">Voice intake works in supported browsers and appends to the text box so you can keep editing naturally.</div>
          <div style="margin-top:12px">
            <label class="tiny">Optional focus
              <select id="category">
                <option value="auto">Auto detect</option>
                <option value="website">Website</option>
                <option value="lead-automation">Lead flow</option>
                <option value="product-app">App</option>
                <option value="internal-tool">Internal tool</option>
                <option value="ai-feature">AI workflow</option>
              </select>
            </label>
          </div>
          <div class="actions" style="margin-top:16px">
            <button id="startBtn" class="btn btn-primary" type="button">Shape the first path</button>
            <button id="resetBtn" class="btn btn-secondary" type="button">Start fresh</button>
          </div>
          <div id="errorBox" class="error" hidden></div>
          <div id="noticeBox" class="notice" hidden></div>
        </div>
        <div id="questionsCard" class="card" hidden>
          <p class="eyebrow">Module 1 - Intake</p>
          <h2>ATEAM needs two quick clarifiers.</h2>
          <p class="muted">Keep these short. The goal is to tighten the intent, not make you fill a long form.</p>
          <div id="questions" class="questions"></div>
          <div class="actions" style="margin-top:16px">
            <button id="buildBtn" class="btn btn-primary" type="button">Build preview output</button>
          </div>
        </div>
        <div id="resultCard" class="card" hidden>
          <p class="eyebrow">Module 4 - Output</p>
          <h2 id="resultTitle">ATEAM result</h2>
          <p id="resultSummary" class="result-card-summary"></p>
          <div id="resultVerdict" class="state">Waiting</div>
          <div id="resultGrid" class="grid2" style="margin-top:16px"></div>
          <div class="result-actions" style="margin-top:18px">
            <button id="continueBtn" class="btn btn-primary" type="button">Start this with Una Labs</button>
            <button id="restartBtn" class="btn btn-secondary" type="button">Run another idea</button>
          </div>
        </div>
      </div>
      <aside class="stack">
        <div class="card">
          <p class="eyebrow">Module 2 - System</p>
          <h2>Intent snapshot and system state</h2>
          <div class="system-stack">
            <div>
              <strong id="understandingTitle">ATEAM will translate the rough idea into a working intent.</strong>
              <div id="understandingBox" class="empty" style="margin-top:12px">Audience, first win, and lane will appear here once the run starts.</div>
            </div>
            <div class="panel-divider"></div>
            <div id="statusBox" class="empty">No run yet. Once intake starts, this panel will explain what ATEAM is doing and why it moved.</div>
          </div>
        </div>
        <div class="card">
          <p class="eyebrow">Module 3 - Work</p>
          <h2>Visible work and movement</h2>
          <div id="jobsBox" class="grid2"><div class="empty">Jobs appear here once ATEAM routes the run.</div></div>
          <div class="panel-divider"></div>
          <div class="status-line"><strong>Recent movement</strong><span class="muted tiny">Public-safe event timeline</span></div>
          <div id="timelineBox" class="timeline"><div class="empty">Timeline events appear here once the run starts moving.</div></div>
        </div>
        <div class="card">
          <p class="eyebrow">Module 4 - Output</p>
          <h2>Run-owned output and handoff</h2>
          <div class="output-stack">
            <div id="artifactsBox" class="grid2"><div class="empty">Artifact ownership appears here once the pack is generated.</div></div>
            <div class="hero-note">When the output is believable, ATEAM turns it into a clean next move with Una Labs instead of leaving the client at a dead end.</div>
          </div>
        </div>
      </aside>
    </section>
  </div>
  <script>
    const STEPS=["Intake","System","Work","Output"];
    const WORKFLOW_STORAGE_KEY="unalabs_ateam_workflow_handoff_v2";
    const state={run:null,answers:{},service:"checking",supportsVoice:false,isListening:false,recognition:null};
    const $=(id)=>document.getElementById(id);
    const esc=(v)=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
    const text=(v)=>String(v??"").trim();
    const lowerText=(v)=>{const value=text(v); return value?value.charAt(0).toLowerCase()+value.slice(1):"";};
    const prettyLabel=(v)=>text(v).replace(/[_-]+/g," ").replace(/\s+/g," ").replace(/\b\w/g,(char)=>char.toUpperCase());
    function laneLabel(value){const safe=text(value).toLowerCase(); const map={"fast website launch":"Fast Website Launch","lead engine setup":"Lead Engine Setup","product pilot":"Product Pilot","ops workflow system":"Ops Workflow System","ai assist layer":"AI Assist Layer"}; return map[safe]||prettyLabel(value)||"Clear first path";}
    function publicUnderstanding(run){const understanding=run&&run.publicFlow&&run.publicFlow.understanding?run.publicFlow.understanding:{}; const audience=text(understanding.audience).replace(/[.]+$/g,""); const firstWin=text(understanding.firstWin).replace(/[.]+$/g,""); const lane=laneLabel(understanding.recommendedLane||run&&run.recommendedLane); const parts=[]; if(lane){parts.push("ATEAM mapped the idea into a "+lane+" direction");} if(audience){parts.push("for "+audience);} let summary=parts.join(" "); if(summary){summary+=".";} if(firstWin){summary+=(summary?" ":"")+"The first version is built to "+lowerText(firstWin)+".";} return {title:"What ATEAM understood",summary:summary||"ATEAM is translating the rough idea into a clearer first delivery path.",audience,firstWin,lane};}
    function publicJobTitle(job){const step=text(job&&job.workflowStep||job&&job.stageKey||job&&job.stage).toLowerCase(); if(step==="initiation"){return "Route the idea";} if(step==="prototype_pack"){return "Build preview pack";} if(step==="smoke"){return "Review the first pass";} if(step==="handoff"){return "Prepare project handoff";} return text(job&&job.title)||"Work step";}
    function publicJobStage(job){const step=text(job&&job.workflowStep||job&&job.stageKey||job&&job.stage).toLowerCase(); if(step==="initiation"){return "Routing";} if(step==="prototype_pack"){return "Build";} if(step==="smoke"){return "Review";} if(step==="handoff"){return "Handoff";} return prettyLabel(job&&job.stage||job&&job.status)||"Queued";}
    function publicJobNote(job){const step=text(job&&job.workflowStep||job&&job.stageKey||job&&job.stage).toLowerCase(); if(step==="initiation"){return "ATEAM turns the rough idea into a routed first path."; } if(step==="prototype_pack"){return "ATEAM shapes the first visible pack without bloating the scope."; } if(step==="smoke"){return "ATEAM reviews the first pass and flags the main watch-outs."; } if(step==="handoff"){return "ATEAM prepares the clean next move into a scoped Una Labs project."; } return text(job&&job.objective)||text(job&&job.blockerReason)||text(job&&job.waitingReason)||"Work step created from this run.";}
    function publicTimelineMessage(entry){const message=text(entry&&entry.message||entry&&entry.eventType||"Event"); if(/approved by operator: brief gate/i.test(message)){return "Brief gate passed";} if(/approved by operator: pack gate/i.test(message)){return "Decision gate passed";} if(/artifact generated: brief v1/i.test(message)){return "Brief prepared";} if(/artifact generated: decision pack/i.test(message)){return "Decision pack prepared";} if(/delivered to output/i.test(message)){return "Output ready";} return message;}
    function publicArtifactTitle(artifact){const type=text(artifact&&artifact.type||artifact&&artifact.kind).toLowerCase(); const map={brief:"First brief",mockup:"Concept pack",prototype:"Prototype direction",smoke_report:"Review note",document:"Build note"}; return map[type]||text(artifact&&artifact.title)||"Artifact";}
    function publicArtifactType(artifact){const type=text(artifact&&artifact.type||artifact&&artifact.kind).toLowerCase(); const map={brief:"Brief",mockup:"Concept Pack",prototype:"Prototype",smoke_report:"Review Note",document:"Build Note"}; return map[type]||prettyLabel(type)||"Artifact";}
    function publicArtifactOwnership(artifact){return text(artifact&&artifact.runId)?"Generated from this run":"Ready for handoff";}
    function publicArtifactSummary(artifact){const type=text(artifact&&artifact.type||artifact&&artifact.kind).toLowerCase(); if(type==="brief"){return "The brief captures the audience, the first win, and the safest lane for delivery.";} if(type==="mockup"){return "The concept pack shows the first believable version of the experience.";} if(type==="prototype"){return "The prototype direction maps the main path and decision points.";} if(type==="smoke_report"){return "The review note highlights the main watch-outs before delivery.";} if(type==="document"){return "The build note captures scope, risk, and the clearest next move.";} return text(artifact&&artifact.summary)||"Artifact created from this run.";}
    function publicResultSummary(run){const data=publicUnderstanding(run); return data.summary+" Review the lane, the output pack, and the clean next move into Una Labs delivery.";}
    const setBox=(id,msg,type)=>{const el=$(id); if(!el){return;} if(!msg){el.hidden=true; el.textContent=""; return;} el.hidden=false; el.textContent=msg; if(type==="error"){ $("noticeBox").hidden=true; } else { $("errorBox").hidden=true; }};
    const req=(path,init)=>fetch(path,{method:init&&init.method?init.method:"GET",headers:{"content-type":"application/json",...(init&&init.headers?init.headers:{})},body:init&&init.body?init.body:undefined,cache:"no-store"}).then(async(r)=>{const p=await r.json().catch(()=>({})); if(!r.ok||p.ok===false) throw new Error(p.message||p.details||p.error||"ATEAM request failed."); return p;});
    function renderSteps(){const idx=!state.run?0:state.run.phase==="analysis"?1:state.run.phase==="brief_approval"||state.run.phase==="initiation"?1:state.run.phase==="prototype_pack"||state.run.phase==="pack_approval"?2:state.run.phase==="handoff"||state.run.phase==="archived"?3:0; $("stepRail").innerHTML=STEPS.map((s,i)=>'<div class="step '+(i<idx||idx===3?'done ':'')+(i===idx?'active':'')+'"><strong>'+esc(s)+'</strong></div>').join("");}
    function updateVoiceUi(){const btn=$("voiceBtn"); const mode=$("intakeMode"); if(!btn||!mode){return;} if(!state.supportsVoice){btn.textContent="Voice unavailable"; btn.disabled=true; btn.dataset.state="unsupported"; mode.textContent="Text intake ready"; return;} btn.disabled=false; if(state.isListening){btn.textContent="Stop voice intake"; btn.dataset.state="listening"; mode.textContent="Voice intake live"; return;} btn.textContent="Start voice intake"; btn.dataset.state="idle"; mode.textContent="Text + voice intake ready";}
    function renderStatus(){if(!state.run){$("statusBox").className="empty"; $("statusBox").textContent="No run yet. Once intake starts, this panel will explain what ATEAM is doing and why it moved."; return;} const n=state.run.statusNarrative||{}; $("statusBox").className="box"; $("statusBox").innerHTML='<strong>'+esc(n.label||state.run.phase||"Run active")+'</strong><div class="muted tiny">Run ID: '+esc(state.run.id)+'</div><p>'+esc(n.summary||"ATEAM is holding the current workflow state.")+'</p>'+(n.movementReason?'<div class="muted tiny">Movement reason: '+esc(n.movementReason)+'</div>':'')+(n.blockerReason?'<div class="muted tiny">Blocker: '+esc(n.blockerReason)+'</div>':'');}
    function renderPublicFlow(){const jobCount=Array.isArray(state.run&&state.run.jobs)?state.run.jobs.length:0; const eventCount=Array.isArray(state.run&&state.run.history)?state.run.history.length:0; const artifactCount=Array.isArray(state.run&&state.run.artifactSummaries)?state.run.artifactSummaries.length:0; const systemState=text(state.run&&state.run.statusNarrative&&state.run.statusNarrative.label)||"Intent forming"; const modules={intake:{state:state.run?"Intent captured":"Ready for intake",summary:state.run?"ATEAM has the rough idea and can keep moving from two short clarifiers.":"Start with one rough idea by text or voice."},system:{state:systemState,summary:text(state.run&&state.run.statusNarrative&&state.run.statusNarrative.summary)||"The system module will show lane, movement reason, and blocker context once the run is active."},work:{state:jobCount?String(jobCount)+" work step"+(jobCount===1?"":"s")+" visible":"Work not routed yet",summary:jobCount?String(jobCount)+" work step"+(jobCount===1?"":"s")+" and "+String(eventCount)+" public event"+(eventCount===1?"":"s")+" show how the run moved.":"Visible work appears once ATEAM routes the run."},output:{state:state.run&&((state.run.phase==='handoff')||(state.run.handoff&&state.run.handoff.version===2))?"Decision pack ready":"Output forming",summary:artifactCount?String(artifactCount)+" run-owned artifact"+(artifactCount===1?"":"s")+" are ready for the next move into Una Labs.":"The output module returns artifacts and a clean delivery handoff once the first pass is believable."}}; const detailMap={intake:'Capture the rough idea by text or voice, then ask only the last questions needed to move.',system:'Show what ATEAM understood, which lane it chose, and why the run moved.',work:'Expose the public-safe work steps and timeline so the flow feels active, not mysterious.',output:'Return run-owned artifacts and a clean handoff into Una Labs delivery.'}; ['intake','system','work','output'].forEach((key)=>{const item=modules[key]; const stateEl=$('module-'+key+'-state'); const summaryEl=$('module-'+key+'-summary'); const detailEl=$('module-'+key+'-detail'); if(stateEl) stateEl.textContent=String(item&&item.state||''); if(summaryEl) summaryEl.textContent=String(item&&item.summary||''); if(detailEl) detailEl.textContent=String(detailMap[key]||'');});}
    function renderUnderstanding(){if(!state.run){$("understandingTitle").textContent='ATEAM will translate the rough idea into a working intent.'; $("understandingBox").className='empty'; $("understandingBox").textContent='Audience, first win, and lane will appear here once the run starts.'; return;} const understanding=publicUnderstanding(state.run); $("understandingTitle").textContent=understanding.title; $("understandingBox").className='box'; $("understandingBox").innerHTML='<p>'+esc(understanding.summary)+'</p>'+(understanding.audience?'<div class="muted tiny">Audience: '+esc(understanding.audience)+'</div>':'')+(understanding.firstWin?'<div class="muted tiny">First win: '+esc(understanding.firstWin)+'</div>':'')+(understanding.lane?'<div class="muted tiny">Lane: '+esc(understanding.lane)+'</div>':'');}
    function renderQuestions(){const questions=Array.isArray(state.run&&state.run.questions)?state.run.questions:[]; if(!questions.length||state.run.phase==="handoff"||state.run.phase==="archived"){ $("questionsCard").hidden=true; $("questions").innerHTML=""; return; } $("questionsCard").hidden=false; $("questions").innerHTML=questions.map((q)=>'<label class="box"><strong>'+esc(q.prompt)+'</strong><textarea data-q="'+esc(q.id)+'" rows="4" placeholder="'+esc(q.placeholder||"")+'">'+esc(state.answers[q.id]||(state.run.answers&&state.run.answers[q.id])||"")+'</textarea>'+(q.hint?'<div class="muted tiny">'+esc(q.hint)+'</div>':'')+'</label>').join(""); document.querySelectorAll("[data-q]").forEach((el)=>el.addEventListener("input",()=>{state.answers[el.getAttribute("data-q")]=el.value;}));}
    function renderJobs(){const jobs=Array.isArray(state.run&&state.run.jobs)?state.run.jobs:[]; $("jobsBox").innerHTML=jobs.length?jobs.slice(0,4).map((j)=>'<div class="box"><strong>'+esc(publicJobTitle(j))+'</strong><div class="muted tiny">Step: '+esc(publicJobStage(j))+'</div><p>'+esc(publicJobNote(j))+'</p></div>').join(""):'<div class="empty">Work steps appear here once ATEAM routes the run.</div>';}
    function renderArtifacts(){const items=Array.isArray(state.run&&state.run.artifactSummaries)?state.run.artifactSummaries:[]; $("artifactsBox").innerHTML=items.length?items.slice(0,5).map((a)=>'<div class="box"><strong>'+esc(publicArtifactTitle(a))+'</strong><div class="muted tiny">Type: '+esc(publicArtifactType(a))+'</div><div class="muted tiny">Ownership: '+esc(publicArtifactOwnership(a))+'</div><p>'+esc(publicArtifactSummary(a))+'</p></div>').join(""):'<div class="empty">Run-owned output appears here once the pack is generated.</div>';}
    function renderTimeline(){const items=Array.isArray(state.run&&state.run.history)?state.run.history:[]; $("timelineBox").innerHTML=items.length?items.slice(-5).reverse().map((i)=>'<div class="box"><strong>'+esc(publicTimelineMessage(i))+'</strong><div class="muted tiny">'+esc(i.createdAt||"")+'</div>'+(i.metadata&&i.metadata.reason?'<p>'+esc(i.metadata.reason)+'</p>':'')+'</div>').join(""):'<div class="empty">Timeline events appear here once the run starts moving.</div>';}
    function renderResults(){const ready=!!(state.run&&(state.run.phase==="handoff"||(state.run.handoff&&state.run.handoff.version===2))); if(!ready){$("resultCard").hidden=true; $("resultGrid").innerHTML=""; return;} const artifacts=state.run.artifacts||{}; $("resultCard").hidden=false; $("resultTitle").textContent="First pass ready"; $("resultSummary").textContent=publicResultSummary(state.run); $("resultVerdict").textContent="Decision pack ready"; $("resultGrid").innerHTML='<div class="box"><strong>Recommended lane</strong><div>'+esc(laneLabel(state.run.recommendedLane||state.run.brief&&state.run.brief.recommendedLane||"Scoped first pass"))+'</div></div><div class="box"><strong>Project shell</strong><div>Ready for project scoping</div></div><div class="box"><strong>Prototype direction</strong><div>'+esc(publicArtifactTitle({type:"prototype",title:artifacts.prototype&&artifacts.prototype.title}))+'</div></div><div class="box"><strong>Build note</strong><div>'+esc(publicArtifactTitle({type:"document",title:artifacts.doc&&artifacts.doc.title}))+'</div></div>'; }
    function handoffPayload(){const h=state.run&&state.run.handoff; if(h&&h.version===2&&h.runId) return h; const b=state.run&&state.run.brief?state.run.brief:{}; const a=state.run&&state.run.artifacts?state.run.artifacts:{}; const label=(state.run&&state.run.category)||$("category").value||"auto"; return {version:2,runId:state.run.id,createdAtMs:Date.now(),idea:state.run.idea||"",categoryValue:label,categoryLabel:label,recommendedLane:state.run.recommendedLane||b.recommendedLane||label,phase:state.run.phase||"handoff",brief:{title:b.title||"ATEAM result",summary:b.summary||"",audience:b.audience||"",primaryGoal:b.primaryGoal||"",likelyUserValue:b.likelyUserValue||"",recommendedDirection:b.recommendedDirection||"",quickVerdict:b.quickVerdict||"",goals:Array.isArray(b.goals)?b.goals:[],constraints:Array.isArray(b.constraints)?b.constraints:[],successCriteria:Array.isArray(b.successCriteria)?b.successCriteria:[],phasedPlan:Array.isArray(b.phasedPlan)?b.phasedPlan:[]},artifacts:{mockupTitle:a.mockup&&a.mockup.title||"Concept pack",prototypeTitle:a.prototype&&a.prototype.title||"Prototype direction",smokeSummary:a.smoke&&a.smoke.summary||"Quick QA view",docTitle:a.doc&&a.doc.title||"Structured scope"},nextSteps:Array.isArray(a.nextSteps)?a.nextSteps:[]};}
    function render(){renderSteps(); renderPublicFlow(); renderUnderstanding(); renderStatus(); renderQuestions(); renderJobs(); renderArtifacts(); renderTimeline(); renderResults(); updateVoiceUi();}
    function appendVoiceTranscript(text){const ideaEl=$("idea"); if(!ideaEl){return;} const spoken=String(text||"").trim(); if(!spoken){return;} const current=ideaEl.value.trim(); ideaEl.value=current?(current+(/[.?!]\\s*$/.test(current)?" ":". ")+spoken):spoken;}
    function stopVoiceCapture(){if(!state.recognition){return;} try{state.recognition.stop();}catch{} state.isListening=false; updateVoiceUi();}
    function toggleVoiceCapture(){if(!state.supportsVoice||!state.recognition){return;} if(state.isListening){stopVoiceCapture(); setBox("noticeBox","Voice intake stopped. You can edit the idea or continue typing.","notice"); return;} setBox("errorBox",""); try{state.recognition.start(); state.isListening=true; updateVoiceUi(); setBox("noticeBox","Voice intake is live. Speak naturally and ATEAM will append it to the intake box.","notice");}catch{state.isListening=false; updateVoiceUi(); setBox("errorBox","Voice intake could not start in this browser. Type the idea instead.","error");}}
    async function loadRun(runId){const payload=await req("/api/ateam/workflow/runs/"+encodeURIComponent(runId)); state.run=payload.run; render();}
    async function start(){setBox("errorBox",""); setBox("noticeBox",""); const idea=$("idea").value.trim(); if(state.service!=="ready"){setBox("errorBox","ATEAM is not connected yet. You can still continue into Start a Project while the workflow service comes online.","error"); return;} if(idea.length<12){setBox("errorBox","Drop a little more context so ATEAM can shape a believable first pass.","error"); return;} $("startBtn").disabled=true; $("startBtn").textContent="Shaping path..."; try{const payload=await req("/api/ateam/workflow/runs",{method:"POST",body:JSON.stringify({idea,category:$("category").value==="auto"?"":$("category").value})}); state.run=payload.run; state.answers={}; history.replaceState({}, "", "/ateam?run="+encodeURIComponent(payload.run.id)); render(); setBox("noticeBox","ATEAM captured the intent. Answer the two quick clarifiers and it will shape the first path.","notice");}catch(err){setBox("errorBox",err instanceof Error?err.message:"Unable to start the ATEAM workflow run.","error");}finally{$("startBtn").disabled=false; $("startBtn").textContent="Shape the first path";}}
    async function buildPack(){if(!state.run) return; const qs=Array.isArray(state.run.questions)?state.run.questions:[]; const missing=qs.find((q)=>!String(state.answers[q.id]||"").trim()); if(missing){setBox("errorBox","Answer the quick clarifiers so ATEAM can shape the first pass cleanly.","error"); return;} $("buildBtn").disabled=true; $("buildBtn").textContent="Building output..."; setBox("errorBox",""); setBox("noticeBox",""); try{await req("/api/ateam/workflow/runs/"+encodeURIComponent(state.run.id)+"/answers",{method:"POST",body:JSON.stringify({answers:state.answers})}); await req("/api/ateam/workflow/runs/"+encodeURIComponent(state.run.id)+"/approve",{method:"POST",body:JSON.stringify({gate:"brief",decision:"approved"})}); await req("/api/ateam/workflow/runs/"+encodeURIComponent(state.run.id)+"/generate-pack",{method:"POST",body:JSON.stringify({})}); const finalPayload=await req("/api/ateam/workflow/runs/"+encodeURIComponent(state.run.id)+"/approve",{method:"POST",body:JSON.stringify({gate:"pack",decision:"approved"})}); state.run=finalPayload.run; render(); $("resultCard")?.scrollIntoView({behavior:"smooth",block:"start"}); setBox("noticeBox","ATEAM turned the intent into visible work, owned artifacts, and a delivery handoff.","notice");}catch(err){setBox("errorBox",err instanceof Error?err.message:"ATEAM could not finish the workflow run right now.","error");}finally{$("buildBtn").disabled=false; $("buildBtn").textContent="Build preview output";}}
    function reset(){state.run=null; state.answers={}; $("idea").value=""; history.replaceState({}, "", "/ateam"); setBox("errorBox",""); setBox("noticeBox",""); render();}
    function cont(){if(!state.run){location.href="/work-with-ftc"; return;} const raw=JSON.stringify(handoffPayload()); try{sessionStorage.setItem(WORKFLOW_STORAGE_KEY,raw);}catch{} try{localStorage.setItem(WORKFLOW_STORAGE_KEY,raw);}catch{} location.href="/work-with-ftc?from=ateam";}
    function setupVoice(){const speechGlobal=globalThis; const Recognition=speechGlobal.SpeechRecognition||speechGlobal.webkitSpeechRecognition; if(!Recognition){state.supportsVoice=false; updateVoiceUi(); return;} const recognition=new Recognition(); recognition.continuous=true; recognition.interimResults=true; recognition.lang="en-US"; recognition.onresult=(event)=>{const parts=[]; for(let index=event.resultIndex||0; index<event.results.length; index+=1){const result=event.results[index]; if(!result||!result.isFinal){continue;} const transcript=String(result[0]&&result[0].transcript||"").trim(); if(transcript){parts.push(transcript);}} if(parts.length){appendVoiceTranscript(parts.join(" "));}}; recognition.onend=()=>{state.isListening=false; updateVoiceUi();}; recognition.onerror=()=>{state.isListening=false; updateVoiceUi(); setBox("errorBox","Voice intake ran into a browser issue. You can keep typing instead.","error");}; state.recognition=recognition; state.supportsVoice=true; updateVoiceUi();}
    async function boot(){render(); setupVoice(); try{await req("/api/ateam/workflow/runs?limit=1"); state.service="ready"; $("serviceState").className="state"; $("serviceState").textContent="ATEAM workflow service is live";}catch{state.service="unavailable"; $("serviceState").className="state offline"; $("serviceState").textContent="ATEAM workflow service is unavailable"; setBox("noticeBox","The cloud workflow service is still warming up. You can still continue into Start a Project while we reconnect it.","notice");} const runId=new URL(location.href).searchParams.get("run"); if(runId){try{await loadRun(runId);}catch(err){setBox("errorBox",err instanceof Error?err.message:"Unable to load the requested run.","error");}}}
    $("startBtn").addEventListener("click",start); $("buildBtn").addEventListener("click",buildPack); $("resetBtn").addEventListener("click",reset); $("continueBtn").addEventListener("click",cont); $("restartBtn").addEventListener("click",reset); $("voiceBtn").addEventListener("click",toggleVoiceCapture); boot();
  </script>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const canonicalOrigin = trimTrailingSlash(env.CANONICAL_SITE_ORIGIN || `${url.protocol}//${url.host}`);
    const opsOrigin = getOpsOrigin(env);

    if (request.method === "HEAD" && url.pathname === "/ateam") {
      return new Response(null, { status: 200 });
    }

    if (url.pathname === "/mission-control" || url.pathname.startsWith("/mission-control/")) {
      return redirect(`${opsOrigin}/`, 302);
    }

    if (url.pathname.startsWith("/api/ateam/")) {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,POST,OPTIONS",
            "access-control-allow-headers": "content-type, authorization"
          }
        });
      }
      return proxyWorkflowRequest(request, env);
    }

    if (url.pathname === "/ateam" || url.pathname === "/ateam/") {
      return html(buildPage(canonicalOrigin, opsOrigin));
    }

    if (url.pathname.startsWith("/ateam/")) {
      return Response.redirect(`${canonicalOrigin}/ateam${url.search}`, 302);
    }

    return fetch(request);
  }
};

