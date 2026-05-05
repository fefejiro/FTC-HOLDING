import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { exec, execFile, spawn } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dotenvCandidates = [
  path.join(process.cwd(), ".env"),
  path.join(__dirname, ".env"),
  path.join(__dirname, "..", ".env")
];

for (const envPath of dotenvCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const app = express();
const HOST = String(process.env.ATEAM_BRIDGE_HOST || "127.0.0.1").trim();
const PORT = Number(process.env.ATEAM_BRIDGE_PORT || 3001);
const REQUEST_TIMEOUT_MS = Number(process.env.ATEAM_BRIDGE_TIMEOUT_MS || 120000);
const MAX_BUFFER_BYTES = Number(process.env.ATEAM_BRIDGE_MAX_BUFFER_BYTES || 4 * 1024 * 1024);
const API_KEY = String(process.env.ATEAM_KEY || "").trim();
const ALLOWED_ORIGINS = String(process.env.ATEAM_BRIDGE_ALLOWED_ORIGINS || "*").trim();
const CLAUDE_BIN = String(process.env.CLAUDE_BIN || path.resolve(__dirname, "..", "..", "..", "claude.exe")).trim();

app.disable("x-powered-by");
app.use((req, res, next) => {
  const origin = safeText(req.get("origin"));
  const allowOrigin = ALLOWED_ORIGINS === "*" ? "*" : origin;

  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-ateam-key");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  next();
});
app.use(express.json({ limit: "128kb" }));

function safeText(value = "") {
  return String(value || "").replace(/\0/g, "").trim();
}

function timingSafeMatch(expected, provided) {
  const expectedBuffer = Buffer.from(String(expected || ""));
  const providedBuffer = Buffer.from(String(provided || ""));
  if (!expectedBuffer.length || expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function buildCodexPrompt(task, context) {
  if (!context) return task;
  return `${task}\n\nContext:\n${context}`;
}

function getExitCode(error) {
  if (!error) return 0;
  if (typeof error.code === "number") return error.code;
  if (typeof error.code === "string" && error.code.trim()) return -1;
  if (error.killed) return 124;
  return -1;
}

function buildStderr(stderr, error) {
  const parts = [];
  if (stderr) parts.push(String(stderr));
  if (error?.message) parts.push(String(error.message));
  return parts.join("\n").trim();
}

function firstUsefulLine(...chunks) {
  for (const chunk of chunks) {
    const line = String(chunk || "")
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find(Boolean);
    if (line) return line;
  }
  return "";
}

function summarizeResult({ mode, exitCode, stdout, stderr }) {
  const lead = firstUsefulLine(stdout, stderr);
  if (exitCode === 0) {
    if (lead) return `${mode} completed successfully. ${lead}`;
    return `${mode} completed successfully.`;
  }
  if (lead) return `${mode} finished with exit code ${exitCode}. ${lead}`;
  return `${mode} finished with exit code ${exitCode}.`;
}

function executeCodexCommand(args) {
  return new Promise((resolve) => {
    execFile(
      "codex",
      args,
      {
        timeout: REQUEST_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER_BYTES,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        resolve({
          stdout: String(stdout || ""),
          stderr: buildStderr(stderr, error),
          exitCode: getExitCode(error)
        });
      }
    );
  });
}

function shouldFallbackCodexRun(result) {
  if (result.exitCode === 0) return false;
  const stderr = String(result.stderr || "").toLowerCase();
  return stderr.includes("unexpected argument") || stderr.includes("usage: codex [options] [prompt]");
}

function shouldFallbackCodexExec(result) {
  if (result.exitCode === 0) return false;
  const stderr = String(result.stderr || "").toLowerCase();
  return stderr.includes("stdin is not a terminal") || stderr.includes("unrecognized subcommand");
}

async function executeCodex(task, context) {
  const prompt = buildCodexPrompt(task, context);
  const withExecSubcommand = await executeCodexCommand(["exec", prompt]);
  if (!shouldFallbackCodexExec(withExecSubcommand)) {
    return withExecSubcommand;
  }
  const withRunSubcommand = await executeCodexCommand(["run", prompt]);
  if (!shouldFallbackCodexRun(withRunSubcommand)) {
    return withRunSubcommand;
  }
  return executeCodexCommand([prompt]);
}

function executeShell(task) {
  return new Promise((resolve) => {
    exec(
      task,
      {
        timeout: REQUEST_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER_BYTES,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        resolve({
          stdout: String(stdout || ""),
          stderr: buildStderr(stderr, error),
          exitCode: getExitCode(error)
        });
      }
    );
  });
}

app.post("/run", async (req, res) => {
  const providedKey = safeText(req.get("x-ateam-key"));
  if (!API_KEY) {
    return res.status(503).json({
      ok: false,
      error: "bridge_not_configured",
      details: "ATEAM_KEY is not set on the local bridge."
    });
  }

  if (!timingSafeMatch(API_KEY, providedKey)) {
    return res.status(401).json({
      ok: false,
      error: "unauthorized",
      details: "Missing or invalid x-ateam-key header."
    });
  }

  const task = safeText(req.body?.task);
  const mode = safeText(req.body?.mode || "codex").toLowerCase() || "codex";
  const context = safeText(req.body?.context);

  if (!task) {
    return res.status(400).json({
      ok: false,
      error: "invalid_request",
      details: "task is required."
    });
  }

  if (!["codex", "shell"].includes(mode)) {
    return res.status(400).json({
      ok: false,
      error: "invalid_mode",
      details: 'mode must be "codex" or "shell".'
    });
  }

  const startedAt = Date.now();
  console.log(`[ATEAM] Incoming task: ${task}`);
  console.log(`[ATEAM] Mode: ${mode}`);

  try {
    const result = mode === "shell" ? await executeShell(task) : await executeCodex(task, context);
    const durationMs = Date.now() - startedAt;
    console.log(`[ATEAM] Completed in ${durationMs} ms`);

    return res.status(result.exitCode === 0 ? 200 : 500).json({
      ok: result.exitCode === 0,
      task,
      mode,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      summary: summarizeResult({
        mode,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      })
    });
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    console.log(`[ATEAM] Completed in ${durationMs} ms`);
    return res.status(500).json({
      ok: false,
      error: "bridge_execution_failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// ── Una Labs intake webhook ───────────────────────────────────────────────────

async function fetchIntakeFromSupabase(supabaseUrl, supabaseServiceKey, intakeId) {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured");
  }

  const url = `${supabaseUrl}/rest/v1/projects?intake_id=eq.${encodeURIComponent(intakeId)}&select=*`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "apikey": supabaseServiceKey,
      "Authorization": `Bearer ${supabaseServiceKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase fetch failed: ${response.status}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`No project found with intake_id: ${intakeId}`);
  }

  return rows[0];
}

async function callClaudeAPI(anthropicKey, intakeData, email, tier, billing) {
  if (!anthropicKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const prompt = `You are a professional services delivery manager at Una Labs.
A new client has signed up for the ${tier} plan.
Client: ${intakeData.name || email} from ${intakeData.company || "Unknown"}, role: ${intakeData.role || "N/A"}, team size: ${intakeData.teamSize || "N/A"}
Plan: ${tier} billed ${billing}

Generate a structured project intake brief with:
- Project title (concise, professional)
- 3-sentence summary of what this client likely needs based on their profile
- 3 recommended first milestones (title, description, estimated timeline like "1 week", "2 weeks", etc.)
- One clarifying question to ask the client in the kick-off message

Output ONLY valid JSON (no markdown, no code blocks):
{
  "title": "string",
  "summary": "string",
  "milestones": [
    {"title": "string", "description": "string", "timeline": "string"},
    {"title": "string", "description": "string", "timeline": "string"},
    {"title": "string", "description": "string", "timeline": "string"}
  ],
  "kickoff_question": "string"
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": anthropicKey,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in Claude response");
  }

  return JSON.parse(jsonMatch[0]);
}

async function writeMilestonesToSupabase(supabaseUrl, supabaseServiceKey, projectId, milestones) {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured");
  }

  for (const milestone of milestones) {
    const dueDate = calculateDueDate(milestone.timeline);
    const response = await fetch(`${supabaseUrl}/rest/v1/milestones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseServiceKey,
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        project_id: projectId,
        title: milestone.title,
        description: milestone.description,
        status: "pending",
        due_date: dueDate,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to write milestone: ${response.status}`);
    }
  }
}

function calculateDueDate(timeline) {
  const now = new Date();
  const match = timeline.match(/(\d+)\s*(\w+)/i);
  if (!match) return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [, value, unit] = match;
  const amount = parseInt(value, 10);
  const normalizedUnit = String(unit).toLowerCase();

  let days = 0;
  if (normalizedUnit.includes("day")) days = amount;
  else if (normalizedUnit.includes("week")) days = amount * 7;
  else if (normalizedUnit.includes("month")) days = amount * 30;
  else days = 7;

  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function updateProjectStatus(supabaseUrl, supabaseServiceKey, projectId) {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${projectId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseServiceKey,
      "Authorization": `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ status: "scoping" }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update project status: ${response.status}`);
  }
}

async function sendKickoffEmail(mailjetKey, mailjetSecret, clientEmail, clientName, tier, milestones, question) {
  if (!mailjetKey || !mailjetSecret) {
    console.warn("Mailjet not configured — skipping kickoff email");
    return;
  }

  const firstName = (clientName || clientEmail.split("@")[0]).split(" ")[0];
  const milestonesHtml = milestones
    .map(
      (m, i) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#0B0E11"><strong>${i + 1}. ${m.title}</strong></td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px">${m.timeline}</td></tr>`
    )
    .join("");

  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff">
  <div style="background:#4DB8A8;border-radius:10px;padding:20px 24px;margin-bottom:24px">
    <p style="color:white;font-weight:700;font-size:18px;margin:0">Your ${tier} project is being scoped</p>
    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0">Una Labs · unalabs.cloud</p>
  </div>

  <p style="font-size:15px;color:#0B0E11;margin-bottom:16px">Hey ${firstName},</p>
  <p style="font-size:15px;color:#374151;margin-bottom:20px;line-height:1.6">
    Thanks for joining Una Labs on the <strong>${tier}</strong> plan. Our team is already working on your project scope.
    Here are the three milestones we're planning:
  </p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#F9FAFB;border-radius:8px;overflow:hidden">
    ${milestonesHtml}
  </table>

  <div style="background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;padding:16px;margin-bottom:24px">
    <p style="font-size:13px;color:#0C4A6E;font-weight:600;margin:0 0 8px">Next step — we need clarity:</p>
    <p style="font-size:14px;color:#0B0E11;margin:0">${question}</p>
  </div>

  <a href="https://unalabs.cloud/login?redirect=/dashboard" style="display:inline-block;background:#F97316;color:white;font-weight:700;font-size:15px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:20px">
    View your dashboard →
  </a>

  <p style="font-size:13px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:16px;margin-top:16px">
    Questions? Reply to this email or reach us at <a href="mailto:hello@unalabs.cloud" style="color:#4DB8A8">hello@unalabs.cloud</a><br>
    Una Labs · unalabs.cloud
  </p>
</div>`;

  const credentials = Buffer.from(`${mailjetKey}:${mailjetSecret}`).toString("base64");
  await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: "hello@unalabs.cloud", Name: "Una Labs" },
          To: [{ Email: clientEmail, Name: firstName }],
          Subject: `Your ${tier} project is being scoped — Una Labs`,
          HTMLPart: html,
          TextPart: `Your ${tier} project is being scoped\n\nHey ${firstName},\n\nThanks for joining Una Labs. Here are the three milestones we're planning:\n\n${milestones.map((m, i) => `${i + 1}. ${m.title} (${m.timeline})\n${m.description}`).join("\n\n")}\n\nNext step: ${question}\n\nView your dashboard: https://unalabs.cloud/login?redirect=/dashboard\n\nQuestions? Email hello@unalabs.cloud\n\nUna Labs · unalabs.cloud`,
        },
      ],
    }),
  });
}

async function sendMikeNotification(mailjetKey, mailjetSecret, email, tier, summary, intakeId, sessionId) {
  if (!mailjetKey || !mailjetSecret) {
    console.warn("Mailjet not configured — skipping Mike notification");
    return;
  }

  const html = `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff">
  <div style="background:#4DB8A8;border-radius:8px;padding:16px 20px;margin-bottom:20px">
    <p style="color:white;font-weight:700;font-size:16px;margin:0">ATEAM — Una Labs Intake Processed</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Email</td><td style="padding:6px 0;font-size:13px;font-weight:600;color:#0B0E11">${email}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Plan</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${tier}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Intake ID</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${intakeId}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#6B7280;font-size:13px">Session ID</td><td style="padding:6px 0;font-size:13px;color:#0B0E11">${sessionId}</td></tr>
  </table>
  <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:6px;padding:12px;margin-bottom:16px">
    <p style="font-size:12px;color:#6B7280;margin:0 0 6px;font-weight:600">Generated Brief</p>
    <p style="font-size:13px;color:#0B0E11;margin:0;line-height:1.6">${summary}</p>
  </div>
  <p style="font-size:12px;color:#9CA3AF">ATEAM intake processor · $(new Date().toISOString())</p>
</div>`;

  const credentials = Buffer.from(`${mailjetKey}:${mailjetSecret}`).toString("base64");
  await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${credentials}`,
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: "hello@unalabs.cloud", Name: "ATEAM" },
          To: [{ Email: "mike.fejiro@gmail.com", Name: "Mike" }],
          Subject: `✓ Intake processed: ${email} — ${tier}`,
          HTMLPart: html,
          TextPart: `ATEAM — Una Labs Intake Processed\n\nEmail: ${email}\nPlan: ${tier}\nIntake ID: ${intakeId}\nSession ID: ${sessionId}\n\nGenerated Brief:\n${summary}`,
        },
      ],
    }),
  });
}

app.post("/webhook/intake", async (req, res) => {
  const source = safeText(req.get("x-unalabs-source"));
  const authHeader = safeText(req.get("authorization") || "");
  const providedKey = authHeader.replace(/^Bearer\s+/i, "");
  const configuredKey = String(process.env.ATEAM_KEY || "").trim();

  if (source !== "stripe-api-worker") {
    return res.status(401).json({ ok: false, error: "unauthorized_source" });
  }

  if (!configuredKey) {
    return res.status(503).json({ ok: false, error: "ateam_key_not_configured" });
  }

  if (!timingSafeMatch(configuredKey, providedKey)) {
    return res.status(401).json({ ok: false, error: "unauthorized_key" });
  }

  const { type, activation = {}, intake = {} } = req.body || {};
  if (type !== "una_new_subscription") {
    return res.status(400).json({ ok: false, error: "invalid_type" });
  }

  const { email = "", tier = "", billing = "", intake_id: intakeId = "", session_id: sessionId = "" } = activation;
  console.log(`[ATEAM-INTAKE] New subscription: ${email} — ${tier} (${billing}) — session ${sessionId}`);

  // Respond immediately — processing runs async
  res.json({ ok: true, email, status: "processing" });

  // Process intake async
  setImmediate(async () => {
    try {
      const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
      const supabaseServiceKey = String(process.env.SUPABASE_SERVICE_KEY || "").trim();
      const anthropicKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
      const mailjetKey = String(process.env.MAILJET_API_KEY || "").trim();
      const mailjetSecret = String(process.env.MAILJET_SECRET_KEY || "").trim();

      // 1. Fetch project and intake data from Supabase
      console.log(`[ATEAM-INTAKE] Fetching intake data for intake_id=${intakeId}`);
      const project = await fetchIntakeFromSupabase(supabaseUrl, supabaseServiceKey, intakeId);
      const projectId = project.id;

      // 2. Call Claude to generate brief
      console.log(`[ATEAM-INTAKE] Calling Claude API for brief generation`);
      const brief = await callClaudeAPI(anthropicKey, intake, email, tier, billing);

      // 3. Write milestones to Supabase
      console.log(`[ATEAM-INTAKE] Writing ${brief.milestones.length} milestones to Supabase`);
      await writeMilestonesToSupabase(supabaseUrl, supabaseServiceKey, projectId, brief.milestones);

      // 4. Update project status
      console.log(`[ATEAM-INTAKE] Updating project status to 'scoping'`);
      await updateProjectStatus(supabaseUrl, supabaseServiceKey, projectId);

      // 5. Send kickoff email to client
      console.log(`[ATEAM-INTAKE] Sending kickoff email to ${email}`);
      await sendKickoffEmail(mailjetKey, mailjetSecret, email, intake.name, tier, brief.milestones, brief.kickoff_question);

      // 6. Send notification to Mike
      console.log(`[ATEAM-INTAKE] Sending notification to Mike`);
      await sendMikeNotification(mailjetKey, mailjetSecret, email, tier, brief.summary, intakeId, sessionId);

      console.log(`[ATEAM-INTAKE] ✓ Completed for ${email}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[ATEAM-INTAKE] ✗ Failed: ${msg}`);
    }
  });
});

// ── Telegram gateway compatibility routes ─────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/events/:sessionId", (req, res) => {
  res.json({ ok: true, events: [] });
});

app.post("/events/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const event = req.body;
  console.log(`[ATEAM] Event[${sessionId}]: ${safeText(event?.type || "unknown")} — ${safeText(event?.summary || "").slice(0, 120)}`);
  res.json({ ok: true });
});

app.post("/api/orchestrator/plan", (req, res) => {
  res.json({ ok: true, output: { emit_events: [] } });
});

const AGENT_SYSTEM_PROMPT =
  "You are ATEAM, Mike's personal AI assistant running on his PC. " +
  "Mike is messaging you via Telegram from his phone. " +
  "Reply conversationally and concisely — no markdown headers, no bullet preamble, no code blocks unless actually needed. " +
  "If asked to do something on the PC (run code, edit files, check status), do it and report back briefly.";

function stripAnsi(str) {
  return String(str || "").replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").replace(/\x1B\][^\x07]*\x07/g, "").trim();
}

app.post("/agent/command", async (req, res) => {
  const message = safeText(req.body?.message);
  const taskId = safeText(req.body?.taskId || "");
  if (!message) {
    return res.status(400).json({ ok: false, error: "message is required" });
  }
  console.log(`[ATEAM] Agent command [${taskId}]: ${message}`);
  try {
    const result = await new Promise((resolve) => {
      const child = spawn(
        CLAUDE_BIN,
        ["--print", "--dangerously-skip-permissions", "-p", `${AGENT_SYSTEM_PROMPT}\n\n${message}`],
        { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }
      );
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => { child.kill(); resolve({ stdout, stderr: "timeout", exitCode: 124 }); }, REQUEST_TIMEOUT_MS);
      child.stdout.on("data", (d) => { stdout += d; });
      child.stderr.on("data", (d) => { stderr += d; });
      child.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr: buildStderr(stderr, null), exitCode: code ?? 0 }); });
      child.on("error", (err) => { clearTimeout(timer); resolve({ stdout: "", stderr: err.message, exitCode: -1 }); });
    });
    const reply = stripAnsi(result.stdout || result.stderr || "No response.").slice(0, 4000);
    return res.json({ ok: true, reply, agent: "ATEAM" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

// ──────────────────────────────────────────────────────────────────────────────

app.listen(PORT, HOST, () => {
  console.log(`[ATEAM] Bridge listening on http://${HOST}:${PORT}`);
});
