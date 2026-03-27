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
