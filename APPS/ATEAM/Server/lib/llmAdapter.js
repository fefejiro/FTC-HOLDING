import { buildModelMeta, shouldRetryWithFallback } from "./fallback.js";

export const MANCHI_PROMPT_VERSION = "manchi_voice_v2";

function compact(text, limit = 220) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function formatRecentLines(recentThread = []) {
  return (Array.isArray(recentThread) ? recentThread : [])
    .slice(-12)
    .map((msg) => `${msg.role}${msg.agent ? `/${msg.agent}` : ""}: ${compact(msg.content, 140)}`);
}

function talkPersonaBlock() {
  return [
    `Prompt profile version: ${MANCHI_PROMPT_VERSION}.`,
    "You are Manchi AI, a strategic conversational co-pilot inside ATEAM Local.",
    "Identity: systems thinker first, cultural bridge second, reflective philosopher when invited.",
    "Think in systems, not fragments. Value clarity over comfort. Prefer strong reasoning over agreement.",
    "Challenge assumptions calmly and stay steady under pressure.",
    "Voice-first style: short sentences, clear thoughts, grounded tone, no lecture tone, no overexplaining.",
    "Start with one grounded acknowledgement, then answer directly.",
    "Ask at most one follow-up question.",
    "Keep most replies between 2 and 6 sentences unless deeper exploration is requested.",
    "Default register: structured articulate English.",
    "Warri cadence is a modulation layer for grounding, emphasis, or calibrated cruise. Do not sacrifice clarity.",
    "Use light calibrated phrases sparingly and never mock or escalate.",
    "Modes: normal (balanced strategist), cruise (light Warri flavor), heavy (high-stakes clarity), debate (structured opposition), review (observational analytical detached).",
    "Auto-enter heavy mode for high-stakes decisions, financial risk, architecture pivots, or long-term consequence.",
    "Strategic behavior: clarify the real issue, surface tradeoffs, identify leverage, convert ideas into next moves, optimize for long-term outcomes.",
    "When disagreeing: state disagreement clearly, identify weak assumption, offer stronger structure, then ask at most one clarifying question.",
    "For relationships topics: promote self-awareness and integrity, avoid manipulative tactics.",
    "Do not use roleplay actions, markdown formatting, asterisks, or bracketed stage directions.",
    "Do not repeat the user's question before answering.",
    "Avoid sounding like policy documentation or theatrical performance.",
    "Keep punctuation intentional, rhythm human, and delivery calm."
  ].join(" ");
}

function dashboardPersonaBlock() {
  return [
    "You are an execution-focused AI teammate for dashboard workflows.",
    "Use concise, structured, and formal language.",
    "Minimize slang and creativity. Prioritize precision and deterministic instructions."
  ].join(" ");
}

function buildSystemPrompt({ mode, agent, profile, contextBundle }) {
  const talkMode = String(mode || "dashboard").toLowerCase() === "talk";
  const recentLines = formatRecentLines(contextBundle?.recentThread || []);
  const rollingSummary = Array.isArray(contextBundle?.rollingSummary) ? contextBundle.rollingSummary.slice(0, 5) : [];
  const profileLines = Array.isArray(contextBundle?.profileLines) ? contextBundle.profileLines.slice(0, 8) : [];
  const clientContext = contextBundle?.clientContext && typeof contextBundle.clientContext === "object" ? contextBundle.clientContext : {};
  const taskStatus = String(contextBundle?.task?.status || "created");

  const sections = [];
  sections.push(talkMode ? talkPersonaBlock() : dashboardPersonaBlock());
  sections.push(`Agent profile: ${agent} (${profile?.role || "General"})`);
  sections.push(`Agent focus: ${profile?.focus || "coordination"}`);
  sections.push(`Task status: ${taskStatus}`);

  if (profileLines.length) {
    sections.push(`Profile memory:\n- ${profileLines.join("\n- ")}`);
  }

  if (rollingSummary.length) {
    sections.push(`Rolling summary:\n- ${rollingSummary.join("\n- ")}`);
  }

  if (recentLines.length) {
    sections.push(`Recent messages:\n- ${recentLines.join("\n- ")}`);
  }

  if (clientContext.activeSpeakerLabel) {
    sections.push(`Active speaker label: ${clientContext.activeSpeakerLabel}`);
  }

  if (clientContext.lastSessionSummary) {
    sections.push(`Latest session summary:\n- ${clientContext.lastSessionSummary}`);
  }

  if (clientContext.lastClaritySummary) {
    sections.push(`Latest clarity summary:\n- ${clientContext.lastClaritySummary}`);
  }

  if (clientContext.lastChapterTitle) {
    sections.push(`Latest chapter title: ${clientContext.lastChapterTitle}`);
  }

  if (clientContext.analyticsKey) {
    sections.push(`Latest analytics snapshot key: ${clientContext.analyticsKey}`);
  }

  if (Array.isArray(clientContext.highlights) && clientContext.highlights.length) {
    sections.push(`Recent highlights:\n- ${clientContext.highlights.join("\n- ")}`);
  }

  if (talkMode && clientContext.reviewMode) {
    sections.push("Review mode is active. Keep output concise and avoid proposing new capture actions.");
  }

  return sections.join("\n\n");
}

function buildUserPrompt({ message, toolOutput, voiceStyle }) {
  const style = String(voiceStyle || "male_assistant").trim();
  const voiceStyleDirective =
    style === "male_assistant"
      ? "Voice rhythm target: South South Warri male co-host in his 30s. Use confident, witty, street-natural phrasing, short punchy lines, and practical gist. Keep it human and not theatrical."
      : style === "nigerian_professor_ss"
      ? "Voice rhythm target: wise Nigerian professor with South South warmth. Keep it clear, grounded, and explanatory with calm authority."
      : "Voice rhythm target: warm female assistant delivery with natural Nigerian conversational flow.";
  return [
    `Selected voice style: ${style}`,
    voiceStyleDirective,
    `User message: ${compact(message, 1000)}`,
    toolOutput?.name ? `Tool output (${toolOutput.name}): ${compact(JSON.stringify(toolOutput.output), 600)}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function extractResponseText(payload) {
  if (payload && typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];
  const chunks = [];
  for (const item of output) {
    if (!Array.isArray(item?.content)) continue;
    for (const part of item.content) {
      const text = part?.text;
      if (typeof text === "string" && text.trim()) chunks.push(text.trim());
    }
  }
  return chunks.join("\n").trim();
}

function extractStreamDelta(evt) {
  if (!evt || typeof evt !== "object") return "";
  const type = String(evt.type || "");
  if (type.includes("delta") && typeof evt.delta === "string") return evt.delta;
  if (typeof evt.text === "string") return evt.text;
  if (typeof evt.output_text === "string") return evt.output_text;
  if (typeof evt.token === "string") return evt.token;
  return "";
}

function emitFallbackChunks(reply, onToken) {
  if (typeof onToken !== "function") return;
  const words = String(reply || "").split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i += 4) {
    onToken(`${words.slice(i, i + 4).join(" ")} `);
  }
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 45_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeoutErr = new Error("openai_timeout");
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function resolveRuntimeConfig(baseConfig, args = {}) {
  const mode = String(args?.mode || "dashboard").toLowerCase();
  const llmOptions = args?.llmOptions || {};
  const talkMode = mode === "talk";
  return {
    primaryModel: String(llmOptions.primaryModel || llmOptions.model || baseConfig.model || "gpt-4o-mini"),
    fallbackModel: String(llmOptions.fallbackModel || baseConfig.model || "gpt-4o-mini"),
    temperature: Number.isFinite(Number(llmOptions.temperature))
      ? Number(llmOptions.temperature)
      : talkMode
      ? 0.9
      : 0.55,
    stream: Boolean(llmOptions.stream)
  };
}

async function localStubResponder({ mode, message, contextBundle, toolOutput }) {
  const talkMode = String(mode || "dashboard").toLowerCase() === "talk";
  const latest = compact(message, 300);
  const summary = Array.isArray(contextBundle?.rollingSummary) ? contextBundle.rollingSummary : [];

  const reply = talkMode
    ? [
        `How far my person. I hear your point: ${latest}.`,
        summary.length ? `Quick recap wey I dey track: ${summary[0]}` : "",
        toolOutput?.name ? `Tool check (${toolOutput.name}): ${compact(JSON.stringify(toolOutput.output), 180)}.` : "",
        "Make we run this as clean podcast gist: one clear angle, one practical example, one takeaway."
      ]
        .filter(Boolean)
        .join("\n")
    : [
        "I can coordinate this into immediate execution.",
        `Request: ${latest}.`,
        "Next: confirm outcome, constraints, then execute first step."
      ].join("\n");

  return {
    reply,
    ...buildModelMeta({ modelUsed: "local_stub", fallbackUsed: false })
  };
}

async function openaiRequest({ apiKey, model, temperature, systemPrompt, userPrompt }) {
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 45_000);
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
    body: JSON.stringify({
      model,
      temperature,
      max_output_tokens: 500,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }]
          }
        ]
      })
    },
    Number.isFinite(timeoutMs) ? timeoutMs : 45_000
  );

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    const err = new Error(`openai_error_${res.status}: ${details}`.trim());
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const reply = extractResponseText(data);
  if (!reply) throw new Error("openai_empty_reply");
  return reply;
}

async function openaiStreamRequest({ apiKey, model, temperature, systemPrompt, userPrompt }, onToken) {
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 55_000);
  const res = await fetchWithTimeout(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
    body: JSON.stringify({
      model,
      temperature,
      stream: true,
      max_output_tokens: 500,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: systemPrompt }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: userPrompt }]
          }
        ]
      })
    },
    Number.isFinite(timeoutMs) ? timeoutMs : 55_000
  );

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    const err = new Error(`openai_stream_error_${res.status}: ${details}`.trim());
    err.status = res.status;
    throw err;
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("openai_stream_reader_unavailable");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let evt;
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }
      const delta = extractStreamDelta(evt);
      if (!delta) continue;
      fullText += delta;
      if (typeof onToken === "function") onToken(delta);
    }
  }

  if (!fullText.trim()) throw new Error("openai_stream_empty_reply");
  return fullText.trim();
}

export function createLlmAdapter({ mode = "auto" } = {}) {
  const configuredMode = String(mode || "auto").toLowerCase();
  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const resolvedMode =
    configuredMode === "openai"
      ? "openai"
      : configuredMode === "stub"
      ? "stub"
      : apiKey
      ? "openai"
      : "stub";

  const baseConfig = { apiKey, model };

  async function runOpenAiNonStream(args) {
    const runtime = resolveRuntimeConfig(baseConfig, args);
    const systemPrompt = buildSystemPrompt(args);
    const userPrompt = buildUserPrompt(args);
    let fallbackUsed = false;
    let modelUsed = runtime.primaryModel;

    try {
      const reply = await openaiRequest({
        apiKey,
        model: runtime.primaryModel,
        temperature: runtime.temperature,
        systemPrompt,
        userPrompt
      });
      return { reply, ...buildModelMeta({ modelUsed, fallbackUsed }) };
    } catch (err) {
      if (!shouldRetryWithFallback(err) || runtime.fallbackModel === runtime.primaryModel) {
        throw err;
      }
      fallbackUsed = true;
      modelUsed = runtime.fallbackModel;
      const reply = await openaiRequest({
        apiKey,
        model: runtime.fallbackModel,
        temperature: runtime.temperature,
        systemPrompt,
        userPrompt
      });
      return { reply, ...buildModelMeta({ modelUsed, fallbackUsed }) };
    }
  }

  async function runOpenAiStream(args, onToken) {
    const runtime = resolveRuntimeConfig(baseConfig, args);
    const systemPrompt = buildSystemPrompt(args);
    const userPrompt = buildUserPrompt(args);
    let fallbackUsed = false;
    let modelUsed = runtime.primaryModel;

    try {
      const reply = await openaiStreamRequest(
        {
          apiKey,
          model: runtime.primaryModel,
          temperature: runtime.temperature,
          systemPrompt,
          userPrompt
        },
        onToken
      );
      return { reply, ...buildModelMeta({ modelUsed, fallbackUsed }) };
    } catch (err) {
      if (!shouldRetryWithFallback(err) || runtime.fallbackModel === runtime.primaryModel) {
        throw err;
      }
      fallbackUsed = true;
      modelUsed = runtime.fallbackModel;
      const reply = await openaiStreamRequest(
        {
          apiKey,
          model: runtime.fallbackModel,
          temperature: runtime.temperature,
          systemPrompt,
          userPrompt
        },
        onToken
      );
      return { reply, ...buildModelMeta({ modelUsed, fallbackUsed }) };
    }
  }

  async function respond(args) {
    if (resolvedMode === "openai") {
      try {
        return await runOpenAiNonStream(args);
      } catch {
        return localStubResponder(args);
      }
    }
    return localStubResponder(args);
  }

  async function respondStream(args, onToken) {
    if (resolvedMode === "openai") {
      try {
        return await runOpenAiStream(args, onToken);
      } catch {
        const fallback = await localStubResponder(args);
        emitFallbackChunks(fallback.reply, onToken);
        return fallback;
      }
    }
    const fallback = await localStubResponder(args);
    emitFallbackChunks(fallback.reply, onToken);
    return fallback;
  }

  return {
    mode: resolvedMode,
    respond,
    respondStream
  };
}
