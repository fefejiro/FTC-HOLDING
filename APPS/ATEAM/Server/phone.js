/**
 * phone.js — Minimal voice interface: phone browser → Claude → PC bridge
 *
 * Start:  node Server/phone.js
 * Expose: cloudflared tunnel --url http://127.0.0.1:3002
 * Open:   tunnel URL on phone browser, tap mic, talk
 */

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dotenvCandidates = [
  path.join(process.cwd(), ".env"),
  path.join(__dirname, ".env"),
  path.join(__dirname, "..", ".env"),
];
for (const envPath of dotenvCandidates) {
  if (fs.existsSync(envPath)) { dotenv.config({ path: envPath }); break; }
}

const PORT        = Number(process.env.PHONE_PORT || 3002);
const BRIDGE_URL  = String(process.env.ATEAM_BRIDGE_URL || "http://127.0.0.1:3001/run").trim();
const ATEAM_KEY   = String(process.env.ATEAM_KEY || "").trim();
const ANTHROPIC_API_KEY = String(process.env.ANTHROPIC_API_KEY || "").trim();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

// ── Voice UI ──────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(HTML);
});

// ── Chat endpoint ─────────────────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ error: "message required" });
  if (!ANTHROPIC_API_KEY) return res.status(503).json({ error: "ANTHROPIC_API_KEY not set on server" });

  try {
    const reply = await runWithTools(message);
    res.json({ reply });
  } catch (err) {
    console.error("[PHONE] chat error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Claude agentic loop ───────────────────────────────────────────────────────
async function runWithTools(userMessage) {
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const tools = [
    {
      name: "run_on_pc",
      description:
        "Execute a task on the user's Windows PC. " +
        "Use mode 'shell' for direct system commands (dir, echo, git, node, etc). " +
        "Use mode 'codex' for AI-assisted code generation tasks.",
      input_schema: {
        type: "object",
        properties: {
          task: { type: "string", description: "The command or task to run" },
          mode: { type: "string", enum: ["shell", "codex"], description: "shell = direct command, codex = AI-assisted" },
        },
        required: ["task", "mode"],
      },
    },
  ];

  const messages = [{ role: "user", content: userMessage }];

  // Agentic loop — keeps going until Claude stops calling tools
  for (let i = 0; i < 10; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system:
        "You are a remote PC assistant. The user is on their phone talking to you via voice. " +
        "You can run commands on their Windows PC using the run_on_pc tool. " +
        "Be concise — your replies will be read aloud. Confirm what you did in plain language.",
      tools,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b) => b.type === "text");
      return text?.text || "Done.";
    }

    // Execute tool calls
    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      console.log(`[PHONE] tool call: ${block.input.mode} → ${block.input.task}`);

      let output;
      try {
        const bridgeRes = await fetch(BRIDGE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-ateam-key": ATEAM_KEY,
          },
          body: JSON.stringify({ task: block.input.task, mode: block.input.mode }),
          signal: AbortSignal.timeout(120000),
        });
        const payload = await bridgeRes.json();
        output = payload.stdout || payload.summary || payload.error || "No output.";
      } catch (err) {
        output = `Bridge error: ${err.message}`;
      }

      console.log(`[PHONE] tool result: ${output.slice(0, 120)}`);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: output });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return "Reached max tool iterations.";
}

// ── HTML UI ───────────────────────────────────────────────────────────────────
const HTML = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>PC Remote</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0d0d0d;color:#e8e8e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;height:100dvh;display:flex;flex-direction:column;overflow:hidden}
#messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.msg{max-width:85%;padding:10px 14px;border-radius:16px;font-size:15px;line-height:1.5;word-break:break-word}
.msg.user{background:#1a6cf5;align-self:flex-end;border-bottom-right-radius:4px}
.msg.assistant{background:#222;align-self:flex-start;border-bottom-left-radius:4px}
.msg.system{background:#161616;color:#555;align-self:center;font-size:12px;border-radius:8px;text-align:center}
#controls{padding:12px 16px;display:flex;align-items:center;gap:10px;border-top:1px solid #1c1c1c;background:#0d0d0d}
#mic{width:56px;height:56px;border-radius:50%;border:none;background:#1a6cf5;color:#fff;font-size:22px;cursor:pointer;flex-shrink:0;transition:background .15s,transform .1s;-webkit-tap-highlight-color:transparent}
#mic:active{transform:scale(.94)}
#mic.listening{background:#e53e3e;animation:pulse 1s infinite}
#mic.thinking{background:#2a2a2a;cursor:default}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
#input{flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:10px 14px;color:#e8e8e8;font-size:15px;resize:none;outline:none;min-height:44px;max-height:120px;overflow-y:auto;line-height:1.4}
#input:empty:before{content:attr(data-placeholder);color:#444}
#send{padding:10px 16px;border-radius:12px;border:none;background:#2a2a2a;color:#e8e8e8;font-size:14px;cursor:pointer;flex-shrink:0;-webkit-tap-highlight-color:transparent}
#send:active{background:#333}
</style>
</head>
<body>
<div id="messages">
  <div class="msg system">PC Remote — tap 🎤 and speak, or type below</div>
</div>
<div id="controls">
  <button id="mic">🎤</button>
  <div id="input" contenteditable="true" data-placeholder="Type or use mic..." role="textbox" aria-multiline="true"></div>
  <button id="send">Send</button>
</div>
<script>
const msgs = document.getElementById('messages');
const mic  = document.getElementById('mic');
const inp  = document.getElementById('input');
const btn  = document.getElementById('send');
let recog  = null;

function addMsg(role, text) {
  const d = document.createElement('div');
  d.className = 'msg ' + role;
  d.textContent = text;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
  return d;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  speechSynthesis.speak(u);
}

async function send(text) {
  text = text.trim();
  if (!text) return;
  addMsg('user', text);
  inp.textContent = '';
  setThinking(true);

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    const reply = data.reply || data.error || 'No response.';
    addMsg('assistant', reply);
    speak(reply);
  } catch(e) {
    addMsg('system', 'Network error: ' + e.message);
  } finally {
    setThinking(false);
  }
}

function setThinking(on) {
  mic.className = on ? 'thinking' : '';
  mic.textContent = on ? '⏳' : '🎤';
  btn.disabled = on;
}

mic.addEventListener('click', () => {
  if (mic.classList.contains('thinking')) return;

  if (mic.classList.contains('listening')) {
    recog?.stop(); return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { addMsg('system', 'Speech not supported — use Chrome on Android or Safari on iOS 17+'); return; }

  recog = new SR();
  recog.continuous = false;
  recog.interimResults = true;
  recog.lang = 'en-US';

  mic.className = 'listening';
  mic.textContent = '⏹';

  recog.onresult = e => {
    const t = Array.from(e.results).map(r => r[0].transcript).join('');
    inp.textContent = t;
    if (e.results[e.results.length-1].isFinal) { recog.stop(); send(t); }
  };

  recog.onend = () => {
    if (mic.classList.contains('listening')) { mic.className=''; mic.textContent='🎤'; }
  };

  recog.onerror = e => {
    addMsg('system', 'Mic error: ' + e.error);
    mic.className=''; mic.textContent='🎤';
  };

  recog.start();
});

btn.addEventListener('click', () => send(inp.textContent));
inp.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(inp.textContent); }
});
</script>
</body>
</html>`;

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
  console.log(`[PHONE] Voice UI → http://127.0.0.1:${PORT}`);
  console.log(`[PHONE] Bridge   → ${BRIDGE_URL}`);
  if (!ANTHROPIC_API_KEY) console.warn("[PHONE] WARNING: ANTHROPIC_API_KEY not set");
  if (!ATEAM_KEY) console.warn("[PHONE] WARNING: ATEAM_KEY not set — bridge auth will fail");
});
