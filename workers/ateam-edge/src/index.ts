export interface Env {
  ATEAM_UPSTREAM_ORIGIN?: string;
  CANONICAL_SITE_ORIGIN?: string;
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

function normalizeProxyHeaders(headers: Headers, request: Request) {
  const nextHeaders = new Headers(headers);
  nextHeaders.set("x-forwarded-host", new URL(request.url).host);
  nextHeaders.delete("host");
  return nextHeaders;
}

async function proxyWorkflowRequest(request: Request, env: Env) {
  const origin = getUpstreamOrigin(env);
  if (!origin) {
    return json({ ok: false, message: "ATEAM workflow service is not connected yet." }, { status: 503 });
  }

  const url = new URL(request.url);
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

function buildPage(canonicalOrigin: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ATEAM | Una Labs</title>
  <meta name="description" content="ATEAM turns a rough idea into a structured run, visible work, preview artifacts, and a clean project handoff with Una Labs." />
  <link rel="canonical" href="${canonicalOrigin}/ateam" />
  <style>
    :root{--bg:#f6f1e8;--panel:#fffaf3;--ink:#10211b;--muted:#5e6b66;--line:rgba(16,33,27,.12);--brand:#0f8f62;--brand2:#0b6d4b;--warn:#a14f1e}
    *{box-sizing:border-box}body{margin:0;font-family:Segoe UI,Inter,system-ui,sans-serif;color:var(--ink);background:radial-gradient(circle at top left,rgba(245,155,66,.16),transparent 30%),radial-gradient(circle at top right,rgba(15,143,98,.16),transparent 26%),linear-gradient(180deg,#fbf7ef 0%,var(--bg) 58%,#ece6da 100%)}
    a{color:inherit} .shell{max-width:1180px;margin:0 auto;padding:28px 18px 64px} .top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:22px;flex-wrap:wrap}
    .brand{display:flex;gap:12px;align-items:center;text-decoration:none}.brand img{width:42px;height:42px}.eyebrow{margin:0 0 8px;font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;color:var(--brand2);font-weight:700}
    .card{background:rgba(255,250,243,.96);border:1px solid rgba(255,255,255,.5);border-radius:24px;padding:24px;box-shadow:0 18px 40px rgba(16,33,27,.1)} .hero,.layout{display:grid;gap:20px}
    .hero{grid-template-columns:1.15fr .85fr;margin-bottom:20px}.layout{grid-template-columns:1.3fr .7fr}.stack{display:grid;gap:20px} h1{font-size:clamp(2rem,4vw,3.8rem);line-height:.96;margin:0 0 14px;max-width:12ch}
    h2,h3,p{margin-top:0}.lead,.muted{color:var(--muted)} .lead{font-size:1.04rem;max-width:58ch}.btn{border:0;border-radius:999px;padding:12px 18px;font:inherit;cursor:pointer;text-decoration:none;display:inline-block}
    .btn-primary{background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff}.btn-secondary{background:rgba(255,255,255,.78);border:1px solid var(--line)}
    .actions,.meta,.grid2,.module-grid{display:grid;gap:12px}.actions{grid-auto-flow:column;justify-content:start}.meta,.grid2{grid-template-columns:repeat(2,minmax(0,1fr))}.module-grid{grid-template-columns:repeat(4,minmax(0,1fr));margin:0 0 20px}
    .module{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.72);padding:16px;display:grid;gap:8px}.module h3,.module p,.module span{margin:0}.module span{color:var(--muted);font-size:.88rem;line-height:1.45}
    .steprail,.questions,.timeline{display:grid;gap:10px}.steprail{grid-template-columns:repeat(5,minmax(0,1fr));margin:16px 0}.step,.box{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.72);padding:14px 16px}
    .step.active{border-color:rgba(15,143,98,.38);box-shadow:inset 0 0 0 1px rgba(15,143,98,.18)}.step.done{background:rgba(15,143,98,.08)}
    textarea,select{width:100%;border:1px solid var(--line);border-radius:18px;padding:14px 16px;font:inherit;background:rgba(255,255,255,.86);color:var(--ink)} textarea{min-height:150px;resize:vertical}
    .state{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;font-size:.92rem;background:rgba(15,143,98,.1);color:var(--brand2)}.state.offline{background:rgba(220,85,60,.1);color:#92322a}.state.checking{background:rgba(245,155,66,.16);color:var(--warn)}
    .notice,.error{margin-top:14px;padding:14px 16px;border-radius:16px}.notice{background:rgba(15,143,98,.08);color:var(--brand2)}.error{background:rgba(220,85,60,.1);color:#92322a}
    .empty{padding:16px;border:1px dashed rgba(16,33,27,.18);border-radius:18px;color:var(--muted);background:rgba(255,255,255,.5)} .tiny{font-size:.92rem}.hero-preview img{width:100%;border-radius:18px;border:1px solid var(--line)}
    @media (max-width:980px){.hero,.layout,.meta,.grid2,.module-grid,.steprail,.actions{grid-template-columns:1fr}.actions{grid-auto-flow:row}}
  </style>
</head>
<body>
  <div class="shell">
    <div class="top">
      <a class="brand" href="/"><img src="/images/brand/ateam-logo.png" alt="" /><div><div class="eyebrow">Una Labs</div><strong>ATEAM Cloud Intake</strong></div></a>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <a class="btn btn-secondary" href="/mission-control">Mission Control</a>
        <a class="btn btn-primary" href="/work-with-ftc">Start a Project</a>
      </div>
    </div>
    <section class="hero">
      <div class="card">
        <p class="eyebrow">ATEAM inside Una Labs</p>
        <h1>Drop a rough idea. Watch it become a real run.</h1>
        <p class="lead">This route is now cloud-backed. The public surface is narrowed to four modules only: Intake, System, Work, and Output. Full admin controls stay private.</p>
        <div class="meta">
          <div class="box"><strong>Narrative intake</strong><div class="muted tiny">Start with one rough paragraph.</div></div>
          <div class="box"><strong>Visible work state</strong><div class="muted tiny">Runs, jobs, blockers, and movement.</div></div>
          <div class="box"><strong>Run-owned artifacts</strong><div class="muted tiny">Outputs stay tied to execution.</div></div>
          <div class="box"><strong>Safe fallback</strong><div class="muted tiny">If the workflow API stalls, you can still continue into project intake.</div></div>
        </div>
      </div>
      <div class="card hero-preview">
        <div id="serviceState" class="state checking">Checking ATEAM service</div>
        <p class="muted">The public page is isolated from the private control plane. Office, logs, approvals, and overrides stay private.</p>
        <img src="/images/brand/ateam-mission-control.png" alt="ATEAM preview" />
      </div>
    </section>
    <section class="card">
      <p class="eyebrow">Public flow view</p>
      <h2>Only the public-safe modules stay on this route.</h2>
      <p class="muted">Clients see intake, system state, visible work, and output. Office, approvals, logs, and overrides remain private.</p>
      <div class="module-grid">
        <article class="module"><p class="eyebrow">Intake</p><h3>Open narrative</h3><span>Capture the rough idea and the last clarifiers without forcing a rigid form.</span></article>
        <article class="module"><p class="eyebrow">System</p><h3>State and routing</h3><span>Show the run state, lane, movement reason, and blocker context clearly.</span></article>
        <article class="module"><p class="eyebrow">Work</p><h3>Visible execution</h3><span>Keep jobs, ownership, and timeline movement readable on the public-safe surface.</span></article>
        <article class="module"><p class="eyebrow">Output</p><h3>Client-ready pack</h3><span>Return run-owned artifacts and the clearest next move into Una Labs delivery.</span></article>
      </div>
    </section>
    <section class="layout">
      <div class="stack">
        <div class="card">
          <p class="eyebrow">Module 1 · Intake</p>
          <h2>Start the workflow run</h2>
          <p class="muted">Keep it natural. ATEAM will ask the last two clarifiers, route the work, and build the first pack.</p>
          <div id="stepRail" class="steprail"></div>
          <label class="tiny">Drop your rough idea
            <textarea id="idea" placeholder="Example: I want a WhatsApp-first workflow that captures leads, routes staff tasks, and shows status back clearly."></textarea>
          </label>
          <div style="margin-top:12px">
            <label class="tiny">Lane
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
            <button id="startBtn" class="btn btn-primary" type="button">Start ATEAM workflow</button>
            <button id="resetBtn" class="btn btn-secondary" type="button">Start fresh</button>
          </div>
          <div id="errorBox" class="error" hidden></div>
          <div id="noticeBox" class="notice" hidden></div>
        </div>
        <div id="questionsCard" class="card" hidden>
          <p class="eyebrow">Module 1 · Intake</p>
          <h2>Answer the last gaps</h2>
          <p class="muted">Short answers are enough. ATEAM only needs enough signal to route and build the first pass.</p>
          <div id="questions" class="questions"></div>
          <div class="actions" style="margin-top:16px">
            <button id="buildBtn" class="btn btn-primary" type="button">Build the preview pack</button>
          </div>
        </div>
        <div id="resultCard" class="card" hidden>
          <p class="eyebrow">Module 4 · Output</p>
          <h2 id="resultTitle">ATEAM result</h2>
          <p id="resultSummary" class="muted"></p>
          <div id="resultVerdict" class="state">Waiting</div>
          <div id="resultGrid" class="grid2" style="margin-top:16px"></div>
          <div class="actions" style="margin-top:18px">
            <button id="continueBtn" class="btn btn-primary" type="button">Continue with Una Labs</button>
            <a class="btn btn-secondary" href="/mission-control">Open Mission Control</a>
          </div>
        </div>
      </div>
      <aside class="stack">
        <div class="card">
          <p class="eyebrow">Module 2 · System</p>
          <h2>What the system is doing</h2>
          <div id="statusBox" class="empty">No run yet.</div>
        </div>
        <div class="card">
          <p class="eyebrow">Module 3 · Work</p>
          <h2>Visible work state</h2>
          <div id="jobsBox" class="grid2"><div class="empty">Jobs appear here once ATEAM routes the run.</div></div>
        </div>
        <div class="card">
          <p class="eyebrow">Module 4 · Output</p>
          <h2>Run-owned outputs</h2>
          <div id="artifactsBox" class="grid2"><div class="empty">Artifact ownership appears here once the pack is generated.</div></div>
        </div>
        <div class="card">
          <p class="eyebrow">Module 3 · Work</p>
          <h2>Why the work moved</h2>
          <div id="timelineBox" class="timeline"><div class="empty">Timeline events appear here once the run starts moving.</div></div>
        </div>
      </aside>
    </section>
  </div>
  <script>
    const STEPS=["Idea in","Structure","Route","Build pass","Decision pack"];
    const WORKFLOW_STORAGE_KEY="unalabs_ateam_workflow_handoff_v2";
    const state={run:null,answers:{},service:"checking"};
    const $=(id)=>document.getElementById(id);
    const esc=(v)=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
    const setBox=(id,msg,type)=>{const el=$(id); if(!msg){el.hidden=true; el.textContent=""; return;} el.hidden=false; el.textContent=msg; if(type==="error"){ $("noticeBox").hidden=true; } else { $("errorBox").hidden=true; }};
    const req=(path,init)=>fetch(path,{method:init&&init.method?init.method:"GET",headers:{"content-type":"application/json",...(init&&init.headers?init.headers:{})},body:init&&init.body?init.body:undefined,cache:"no-store"}).then(async(r)=>{const p=await r.json().catch(()=>({})); if(!r.ok||p.ok===false) throw new Error(p.message||p.details||p.error||"ATEAM request failed."); return p;});
    function renderSteps(){const idx=!state.run?0:state.run.phase==="analysis"?1:state.run.phase==="brief_approval"||state.run.phase==="initiation"?2:state.run.phase==="prototype_pack"||state.run.phase==="pack_approval"?3:state.run.phase==="handoff"||state.run.phase==="archived"?4:0; $("stepRail").innerHTML=STEPS.map((s,i)=>'<div class="step '+(i<idx||idx===4?'done ':'')+(i===idx?'active':'')+'"><strong>'+esc(s)+'</strong></div>').join("");}
    function renderStatus(){if(!state.run){$("statusBox").className="empty"; $("statusBox").textContent="No run yet."; return;} const n=state.run.statusNarrative||{}; $("statusBox").className="box"; $("statusBox").innerHTML='<strong>'+esc(n.label||state.run.phase||"Run active")+'</strong><div class="muted tiny">Run ID: '+esc(state.run.id)+'</div><p>'+esc(n.summary||"ATEAM is holding the current workflow state.")+'</p>'+(n.movementReason?'<div class="muted tiny">Reason: '+esc(n.movementReason)+'</div>':'')+(n.blockerReason?'<div class="muted tiny">Blocker: '+esc(n.blockerReason)+'</div>':'');}
    function renderQuestions(){const questions=Array.isArray(state.run&&state.run.questions)?state.run.questions:[]; if(!questions.length||state.run.phase==="handoff"||state.run.phase==="archived"){ $("questionsCard").hidden=true; $("questions").innerHTML=""; return; } $("questionsCard").hidden=false; $("questions").innerHTML=questions.map((q)=>'<label class="box"><strong>'+esc(q.prompt)+'</strong><textarea data-q="'+esc(q.id)+'" rows="4" placeholder="'+esc(q.placeholder||"")+'">'+esc(state.answers[q.id]||(state.run.answers&&state.run.answers[q.id])||"")+'</textarea>'+(q.hint?'<div class="muted tiny">'+esc(q.hint)+'</div>':'')+'</label>').join(""); document.querySelectorAll("[data-q]").forEach((el)=>el.addEventListener("input",()=>{state.answers[el.getAttribute("data-q")]=el.value;}));}
    function renderJobs(){const jobs=Array.isArray(state.run&&state.run.jobs)?state.run.jobs:[]; $("jobsBox").innerHTML=jobs.length?jobs.slice(0,6).map((j)=>'<div class="box"><strong>'+esc(j.title||"Job")+'</strong><div class="muted tiny">Stage: '+esc(j.stage||j.stageKey||j.status||"queued")+'</div><div class="muted tiny">Owner: '+esc(j.ownerAgentId||"Unassigned")+'</div><p>'+esc(j.objective||j.blockerReason||j.waitingReason||"Work item created from this run.")+'</p></div>').join(""):'<div class="empty">Jobs appear here once ATEAM routes the run.</div>';}
    function renderArtifacts(){const items=Array.isArray(state.run&&state.run.artifactSummaries)?state.run.artifactSummaries:[]; $("artifactsBox").innerHTML=items.length?items.slice(0,6).map((a)=>'<div class="box"><strong>'+esc(a.title||"Artifact")+'</strong><div class="muted tiny">Type: '+esc(a.type||a.kind||"artifact")+'</div><div class="muted tiny">Ownership: '+esc(a.projectId?"Project-linked":"Run-owned")+'</div><p>'+esc(a.summary||"")+'</p></div>').join(""):'<div class="empty">Artifact ownership appears here once the pack is generated.</div>';}
    function renderTimeline(){const items=Array.isArray(state.run&&state.run.history)?state.run.history:[]; $("timelineBox").innerHTML=items.length?items.slice(-8).reverse().map((i)=>'<div class="box"><strong>'+esc(i.message||i.eventType||"Event")+'</strong><div class="muted tiny">'+esc(i.createdAt||"")+'</div>'+(i.metadata&&i.metadata.reason?'<p>'+esc(i.metadata.reason)+'</p>':'')+'</div>').join(""):'<div class="empty">Timeline events appear here once the run starts moving.</div>';}
    function renderResults(){const ready=!!(state.run&&(state.run.phase==="handoff"||(state.run.handoff&&state.run.handoff.version===2))); if(!ready){$("resultCard").hidden=true; $("resultGrid").innerHTML=""; return;} const brief=state.run.brief||{}; const artifacts=state.run.artifacts||{}; const project=state.run.project||{}; $("resultCard").hidden=false; $("resultTitle").textContent=brief.title||state.run.title||"ATEAM result"; $("resultSummary").textContent=brief.summary||"ATEAM has packaged the first pass and project handoff."; $("resultVerdict").textContent=brief.quickVerdict||"Decision pack ready"; $("resultGrid").innerHTML='<div class="box"><strong>Recommended lane</strong><div>'+esc(state.run.recommendedLane||brief.recommendedLane||"Scoped first pass")+'</div></div><div class="box"><strong>Project</strong><div>'+esc(project.name||"Run-owned project shell")+'</div></div><div class="box"><strong>Prototype</strong><div>'+esc(artifacts.prototype&&artifacts.prototype.title||"Prototype direction")+'</div></div><div class="box"><strong>Document</strong><div>'+esc(artifacts.doc&&artifacts.doc.title||"Structured scope")+'</div></div>'; }
    function handoffPayload(){const h=state.run&&state.run.handoff; if(h&&h.version===2&&h.runId) return h; const b=state.run&&state.run.brief?state.run.brief:{}; const a=state.run&&state.run.artifacts?state.run.artifacts:{}; const label=(state.run&&state.run.category)||$("category").value||"auto"; return {version:2,runId:state.run.id,createdAtMs:Date.now(),idea:state.run.idea||"",categoryValue:label,categoryLabel:label,recommendedLane:state.run.recommendedLane||b.recommendedLane||label,phase:state.run.phase||"handoff",brief:{title:b.title||"ATEAM result",summary:b.summary||"",audience:b.audience||"",primaryGoal:b.primaryGoal||"",likelyUserValue:b.likelyUserValue||"",recommendedDirection:b.recommendedDirection||"",quickVerdict:b.quickVerdict||"",goals:Array.isArray(b.goals)?b.goals:[],constraints:Array.isArray(b.constraints)?b.constraints:[],successCriteria:Array.isArray(b.successCriteria)?b.successCriteria:[],phasedPlan:Array.isArray(b.phasedPlan)?b.phasedPlan:[]},artifacts:{mockupTitle:a.mockup&&a.mockup.title||"Concept pack",prototypeTitle:a.prototype&&a.prototype.title||"Prototype direction",smokeSummary:a.smoke&&a.smoke.summary||"Quick QA view",docTitle:a.doc&&a.doc.title||"Structured scope"},nextSteps:Array.isArray(a.nextSteps)?a.nextSteps:[]};}
    function render(){renderSteps(); renderStatus(); renderQuestions(); renderJobs(); renderArtifacts(); renderTimeline(); renderResults();}
    async function loadRun(runId){const payload=await req("/api/ateam/workflow/runs/"+encodeURIComponent(runId)); state.run=payload.run; render();}
    async function start(){setBox("errorBox",""); setBox("noticeBox",""); const idea=$("idea").value.trim(); if(state.service!=="ready"){setBox("errorBox","ATEAM is not connected yet. You can still continue into Start a Project while the workflow service comes online.","error"); return;} if(idea.length<12){setBox("errorBox","Drop a little more context so ATEAM can shape a believable first pass.","error"); return;} $("startBtn").disabled=true; $("startBtn").textContent="Opening workflow..."; try{const payload=await req("/api/ateam/workflow/runs",{method:"POST",body:JSON.stringify({idea,category:$("category").value==="auto"?"":$("category").value})}); state.run=payload.run; state.answers={}; history.replaceState({}, "", "/ateam?run="+encodeURIComponent(payload.run.id)); render(); setBox("noticeBox","ATEAM captured the run. Answer the quick clarifiers and it will route, build, and package the first pass.","notice");}catch(err){setBox("errorBox",err instanceof Error?err.message:"Unable to start the ATEAM workflow run.","error");}finally{$("startBtn").disabled=false; $("startBtn").textContent="Start ATEAM workflow";}}
    async function buildPack(){if(!state.run) return; const qs=Array.isArray(state.run.questions)?state.run.questions:[]; const missing=qs.find((q)=>!String(state.answers[q.id]||"").trim()); if(missing){setBox("errorBox","Answer the quick clarifiers so ATEAM can shape the first pass cleanly.","error"); return;} $("buildBtn").disabled=true; $("buildBtn").textContent="Building run..."; setBox("errorBox",""); setBox("noticeBox",""); try{await req("/api/ateam/workflow/runs/"+encodeURIComponent(state.run.id)+"/answers",{method:"POST",body:JSON.stringify({answers:state.answers})}); await req("/api/ateam/workflow/runs/"+encodeURIComponent(state.run.id)+"/approve",{method:"POST",body:JSON.stringify({gate:"brief",decision:"approved"})}); await req("/api/ateam/workflow/runs/"+encodeURIComponent(state.run.id)+"/generate-pack",{method:"POST",body:JSON.stringify({})}); const finalPayload=await req("/api/ateam/workflow/runs/"+encodeURIComponent(state.run.id)+"/approve",{method:"POST",body:JSON.stringify({gate:"pack",decision:"approved"})}); state.run=finalPayload.run; render(); setBox("noticeBox","ATEAM shaped the brief, created the preview artifacts, and lined up the delivery handoff.","notice");}catch(err){setBox("errorBox",err instanceof Error?err.message:"ATEAM could not finish the workflow run right now.","error");}finally{$("buildBtn").disabled=false; $("buildBtn").textContent="Build the preview pack";}}
    function reset(){state.run=null; state.answers={}; $("idea").value=""; history.replaceState({}, "", "/ateam"); setBox("errorBox",""); setBox("noticeBox",""); render();}
    function cont(){if(!state.run){location.href="/work-with-ftc"; return;} const raw=JSON.stringify(handoffPayload()); try{sessionStorage.setItem(WORKFLOW_STORAGE_KEY,raw);}catch{} try{localStorage.setItem(WORKFLOW_STORAGE_KEY,raw);}catch{} location.href="/work-with-ftc?from=ateam";}
    async function boot(){render(); try{await req("/api/ateam/workflow/runs?limit=1"); state.service="ready"; $("serviceState").className="state"; $("serviceState").textContent="ATEAM workflow service is live";}catch{state.service="unavailable"; $("serviceState").className="state offline"; $("serviceState").textContent="ATEAM workflow service is unavailable"; setBox("noticeBox","The cloud workflow service is still warming up. You can still continue into Start a Project while we reconnect it.","notice");} const runId=new URL(location.href).searchParams.get("run"); if(runId){try{await loadRun(runId);}catch(err){setBox("errorBox",err instanceof Error?err.message:"Unable to load the requested run.","error");}}}
    $("startBtn").addEventListener("click",start); $("buildBtn").addEventListener("click",buildPack); $("resetBtn").addEventListener("click",reset); $("continueBtn").addEventListener("click",cont); boot();
  </script>
</body>
</html>`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const canonicalOrigin = trimTrailingSlash(env.CANONICAL_SITE_ORIGIN || `${url.protocol}//${url.host}`);

    if (request.method === "HEAD" && url.pathname === "/ateam") {
      return new Response(null, { status: 200 });
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
      return html(buildPage(canonicalOrigin));
    }

    if (url.pathname.startsWith("/ateam/")) {
      return Response.redirect(`${canonicalOrigin}/ateam${url.search}`, 302);
    }

    return fetch(request);
  }
};
