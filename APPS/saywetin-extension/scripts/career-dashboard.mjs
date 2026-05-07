import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const CAREER_DIR = path.join(ROOT, "career");
const OUTPUTS_DIR = path.join(CAREER_DIR, "outputs");
const PROFILE_PATH = path.join(CAREER_DIR, "profile.json");
const ANSWERS_PATH = path.join(CAREER_DIR, "candidate-answers.json");

function parseArg(flag, fallback = "") {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function newestFileByPrefixAndExt(dir, prefix, ext) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(ext))
    .map((f) => ({
      name: f,
      full: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.full || "";
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function splitName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] || "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function isQuickApplyLikely(job) {
  const blob =
    `${job.source || ""} ${job.title || ""} ${job.description || ""} ${job.link || ""}`.toLowerCase();
  if (/easy\s*apply/.test(blob)) return true;
  if (/linkedin|indeed/.test(String(job.source || "").toLowerCase()))
    return true;
  return false;
}

function escHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildAutofillPayload(profile, answers) {
  const { firstName, lastName } = splitName(
    profile?.candidate?.name || answers?.contact?.name || "",
  );
  const location = profile?.candidate?.location || "";

  return {
    firstName,
    lastName,
    fullName: profile?.candidate?.name || answers?.contact?.name || "",
    email: answers?.contact?.email || profile?.candidate?.email || "",
    phone: answers?.contact?.phone || profile?.candidate?.phone || "",
    location,
    city: location.split(",")[0]?.trim() || "",
    linkedin: answers?.contact?.linkedin || profile?.candidate?.linkedin || "",
    website: answers?.contact?.website || profile?.candidate?.website || "",
    availabilityToStart: answers?.availabilityToStart || "Immediate",
    availabilityToInterview: answers?.availabilityToInterview || "Immediate",
    rateExpectation:
      answers?.rateExpectation ||
      "Starting at $85/hr contract, can be higher depending on scope and complexity",
    authorizedToWork: answers?.authorizedToWork || "Yes",
    requiresSponsorship: answers?.requiresSponsorship || "No",
    openToTravel: answers?.openToTravel || "Yes",
    workPreference:
      answers?.workPreference ||
      "Remote priority, open to US and Canada contract roles, open to Ontario hybrid",
  };
}

function buildAutofillScript(payload) {
  const json = JSON.stringify(payload);
  return `(function(){
  const p = ${json};
  const mappings = {
    firstName: ['input[name*="first" i]','input[id*="first" i]','input[autocomplete="given-name"]'],
    lastName: ['input[name*="last" i]','input[id*="last" i]','input[autocomplete="family-name"]'],
    fullName: ['input[name*="full" i][name*="name" i]','input[id*="full" i][id*="name" i]'],
    email: ['input[type="email"]','input[name*="email" i]','input[id*="email" i]'],
    phone: ['input[type="tel"]','input[name*="phone" i]','input[id*="phone" i]'],
    location: ['input[name*="location" i]','input[id*="location" i]'],
    city: ['input[name*="city" i]','input[id*="city" i]'],
    linkedin: ['input[name*="linkedin" i]','input[id*="linkedin" i]'],
    website: ['input[name*="website" i]','input[id*="website" i]','input[name*="portfolio" i]'],
    availabilityToStart: ['input[name*="start" i]','textarea[name*="start" i]'],
    availabilityToInterview: ['input[name*="interview" i]','textarea[name*="interview" i]'],
    rateExpectation: ['input[name*="rate" i]','input[name*="salary" i]','textarea[name*="rate" i]'],
    authorizedToWork: ['input[name*="authorized" i]','textarea[name*="authorized" i]'],
    requiresSponsorship: ['input[name*="sponsorship" i]','textarea[name*="sponsorship" i]'],
    openToTravel: ['input[name*="travel" i]','textarea[name*="travel" i]'],
    workPreference: ['input[name*="work model" i]','input[name*="remote" i]','textarea[name*="work" i]']
  };

  const setValue = (el, val) => {
    if (!el || val == null || val === '') return false;
    const tag = (el.tagName || '').toLowerCase();
    const type = (el.type || '').toLowerCase();

    if (tag === 'input' || tag === 'textarea') {
      if (type === 'checkbox' || type === 'radio') {
        const low = String(val).toLowerCase();
        if (['yes','true','1'].includes(low)) el.checked = true;
      } else {
        el.focus();
        el.value = String(val);
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    if (tag === 'select') {
      const opts = Array.from(el.options || []);
      const low = String(val).toLowerCase();
      const exact = opts.find(o => String(o.text).toLowerCase() === low || String(o.value).toLowerCase() === low);
      if (exact) {
        el.value = exact.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }

    return false;
  };

  let filled = 0;
  for (const [key, selectors] of Object.entries(mappings)) {
    const val = p[key];
    for (const sel of selectors) {
      const nodes = document.querySelectorAll(sel);
      for (const n of nodes) {
        if (setValue(n, val)) filled += 1;
      }
      if (nodes.length > 0) break;
    }
  }

  alert('Auto-fill completed. Fields updated: ' + filled + '. Please review before submit.');
})();`;
}

function createDashboardHtml(jobs, payload, autoScript, runFileName) {
  const total = jobs.length;
  const quick = jobs.filter(isQuickApplyLikely);
  const manual = jobs.filter((j) => !isQuickApplyLikely(j));

  const rows = jobs
    .map((j, idx) => {
      const applyType = isQuickApplyLikely(j)
        ? "Quick Apply Likely"
        : "Manual Apply";
      const outreach = escHtml(j.outreach || "");
      const bullets = escHtml((j.bullets?.summary || []).join("\n"));
      const desc = escHtml(j.description || "No description");
      return `<tr>
        <td>${idx + 1}</td>
        <td>${escHtml(j.score ?? "")}</td>
        <td><a class="roleLink" href="${escHtml(j.link)}" target="_blank" rel="noreferrer">${escHtml(j.title)}</a></td>
        <td>${escHtml(j.company)}</td>
        <td>${escHtml(j.source)}</td>
        <td>${escHtml(applyType)}</td>
        <td>
          <a class="btn" href="${escHtml(j.link)}" target="_blank" rel="noreferrer">Open Job</a>
          <button class="btn alt deepDive" data-idx="${idx}">Deep Dive</button>
          <button class="btn" data-copy="${outreach}">Copy Outreach</button>
          <button class="btn" data-copy="${bullets}">Copy Resume Bullets</button>
        </td>
      </tr>
      <tr class="expandRow" id="expand-${idx}" style="display:none">
        <td colspan="7" style="padding:0">
          <div class="expandInner">
            <div class="expandActions">
              <a class="btn" href="${escHtml(j.link)}" target="_blank" rel="noreferrer">Open Job</a>
              <button class="btn alt" data-copy="${outreach}">Copy Outreach</button>
              <button class="btn alt" data-copy="${bullets}">Copy Resume Bullets</button>
              <button class="btn alt closeExpand" data-idx="${idx}">Collapse ▲</button>
            </div>
            <div class="expandGrid">
              <div>
                <div class="k">Description</div>
                <pre class="expandPre">${desc}</pre>
              </div>
              <div>
                <div class="k">Outreach Draft</div>
                <pre class="expandPre">${outreach}</pre>
              </div>
              <div>
                <div class="k">Tailored Resume Bullets</div>
                <pre class="expandPre">${bullets || "No tailored bullets"}</pre>
              </div>
            </div>
          </div>
        </td>
      </tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Private Job Apply Dashboard</title>
<style>
  :root {
    --bg: #0f172a;
    --card: #111827;
    --ink: #e5e7eb;
    --muted: #94a3b8;
    --line: #23324d;
    --ok: #34d399;
    --warn: #f59e0b;
    --btn: #2563eb;
  }
  body { margin: 0; font-family: Segoe UI, Arial, sans-serif; color: var(--ink); background: radial-gradient(circle at top right, #1f2937, var(--bg)); }
  .wrap { max-width: 1200px; margin: 28px auto; padding: 0 18px; }
  h1 { margin: 0 0 10px; font-size: 30px; }
  .muted { color: var(--muted); }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin: 16px 0; }
  .card { background: rgba(17,24,39,.85); border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
  .k { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
  .v { font-size: 26px; font-weight: 700; margin-top: 6px; }
  .ok { color: var(--ok); }
  .warn { color: var(--warn); }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 18px; }
  .btn { appearance: none; border: 0; padding: 9px 12px; border-radius: 8px; background: var(--btn); color: #fff; text-decoration: none; cursor: pointer; font-size: 13px; }
  .btn.alt { background: #374151; }
  .roleLink { color: #c7d2fe; text-decoration: none; }
  .roleLink:hover { text-decoration: underline; }
  .tblwrap { overflow: auto; border: 1px solid var(--line); border-radius: 12px; }
  table { width: 100%; border-collapse: collapse; min-width: 1000px; }
  th, td { border-bottom: 1px solid var(--line); text-align: left; padding: 10px; vertical-align: top; font-size: 13px; }
  th { background: rgba(30,41,59,.7); position: sticky; top: 0; }
  .expandInner { padding: 14px; background: #0f1c30; border-top: 2px solid var(--btn); }
  .expandActions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
  .expandGrid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .expandPre { white-space: pre-wrap; background: #0b1220; border: 1px solid var(--line); border-radius: 10px; padding: 12px; color: #dbeafe; margin: 6px 0 0; font-size: 12px; max-height: 260px; overflow: auto; }
  .panel { margin-top: 16px; }
  pre { white-space: pre-wrap; background: #0b1220; border: 1px solid var(--line); border-radius: 10px; padding: 12px; color: #dbeafe; }
  @media (max-width: 900px) { .expandGrid { grid-template-columns: 1fr; } }
  @media (max-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
</style>
</head>
<body>
  <div class="wrap">
    <h1>Private Auto-Apply Dashboard</h1>
    <div class="muted">Visible private link: <strong>http://127.0.0.1:4317</strong> • Source file: ${escHtml(runFileName)}</div>

    <div class="grid">
      <div class="card"><div class="k">Total Jobs</div><div class="v">${total}</div></div>
      <div class="card"><div class="k">Quick Apply Likely</div><div class="v ok">${quick.length}</div></div>
      <div class="card"><div class="k">Manual Apply</div><div class="v warn">${manual.length}</div></div>
      <div class="card"><div class="k">Rate Target</div><div class="v">${escHtml(payload.rateExpectation)}</div></div>
    </div>

    <div class="actions">
      <button class="btn" id="copyAutofill">Copy Auto-Fill Script</button>
      <button class="btn alt" id="copyPayload">Copy Field Payload JSON</button>
      <button class="btn alt" id="openTop5">Open Top 5 Jobs</button>
    </div>

    <div class="tblwrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Score</th>
            <th>Role</th>
            <th>Company</th>
            <th>Source</th>
            <th>Apply Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="panel card">
      <div class="k">How To Use Manual Apply Fast</div>
      <ol>
        <li>Click Open Job.</li>
        <li>On the application page, open browser DevTools Console (F12).</li>
        <li>Click Copy Auto-Fill Script, paste in console, press Enter.</li>
        <li>Review filled fields, attach tailored resume/cover letter, submit.</li>
      </ol>
      <div class="muted">This keeps you compliant: human review + one-click fill, no hidden bot submission.</div>
    </div>

    <div class="panel card">
      <div class="k">Field Payload</div>
      <pre id="payloadView"></pre>
    </div>


  </div>

<script>
  const autoFillScript = ${JSON.stringify(autoScript)};
  const fieldPayload = ${JSON.stringify(payload, null, 2)};

  const copyText = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt);
      alert('Copied');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      alert('Copied');
    }
  };

  document.getElementById('payloadView').textContent = JSON.stringify(fieldPayload, null, 2);
  document.getElementById('copyAutofill').addEventListener('click', () => copyText(autoFillScript));
  document.getElementById('copyPayload').addEventListener('click', () => copyText(JSON.stringify(fieldPayload, null, 2)));

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => copyText(btn.getAttribute('data-copy') || ''));
  });

  document.getElementById('openTop5').addEventListener('click', () => {
    Array.from(document.querySelectorAll('tbody tr a.btn')).slice(0, 5).forEach((a) => window.open(a.href, '_blank'));
  });

  let openIdx = null;

  const closeAll = () => {
    document.querySelectorAll('.expandRow').forEach((r) => (r.style.display = 'none'));
    openIdx = null;
  };

  document.querySelectorAll('.deepDive').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-idx'));
      const row = document.getElementById('expand-' + idx);
      if (!row) return;
      if (openIdx === idx) {
        closeAll();
        return;
      }
      closeAll();
      row.style.display = 'table-row';
      openIdx = idx;
      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  document.querySelectorAll('.closeExpand').forEach((btn) => {
    btn.addEventListener('click', () => closeAll());
  });
</script>
</body>
</html>`;
}

function openBrowser(url) {
  if (process.platform === "win32") {
    spawnSync("cmd", ["/c", "start", "", url], { stdio: "ignore" });
    return;
  }
  if (process.platform === "darwin") {
    spawnSync("open", [url], { stdio: "ignore" });
    return;
  }
  spawnSync("xdg-open", [url], { stdio: "ignore" });
}

function main() {
  const port = Number(parseArg("--port", "4317")) || 4317;
  const buildOnly = hasFlag("--build-only");
  const noOpen = hasFlag("--no-open");

  const latestQuickApply = newestFileByPrefixAndExt(
    OUTPUTS_DIR,
    "quick-apply-",
    ".json",
  );
  if (!latestQuickApply) {
    console.error("No quick-apply JSON found. Run discovery + batch first.");
    process.exit(1);
  }

  const jobs = readJson(latestQuickApply);
  const profile = readJson(PROFILE_PATH);
  const answers = readJson(ANSWERS_PATH);
  const payload = buildAutofillPayload(profile, answers);
  const autoScript = buildAutofillScript(payload);

  const dashboardDir = path.join(OUTPUTS_DIR, "dashboard");
  const dashboardPath = path.join(dashboardDir, "index.html");
  if (!fs.existsSync(dashboardDir))
    fs.mkdirSync(dashboardDir, { recursive: true });

  const html = createDashboardHtml(
    jobs,
    payload,
    autoScript,
    path.basename(latestQuickApply),
  );
  fs.writeFileSync(dashboardPath, html, "utf8");

  if (buildOnly) {
    console.log(`Dashboard built: ${dashboardPath}`);
    return;
  }

  const server = http.createServer((req, res) => {
    const pathname = (req.url || "/").split("?")[0];
    if (pathname !== "/" && pathname !== "/index.html") {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const data = fs.readFileSync(dashboardPath);
    res.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(data);
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`Private dashboard running at: ${url}`);
    console.log("Press Ctrl+C to stop.");
    if (!noOpen) openBrowser(url);
  });
}

main();
