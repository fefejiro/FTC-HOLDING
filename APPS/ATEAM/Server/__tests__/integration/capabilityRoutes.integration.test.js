import express from "express";
import { createCapabilityRoutes } from "../../lib/capability/routes.js";

function createStubs() {
  const sessions = new Map();
  const eventsBySession = new Map();
  const tasks = new Map();

  const speechClarityAnalyze = {
    analyzeTranscript(text = "") {
      return {
        metrics: { wordCount: String(text).trim().split(/\s+/).filter(Boolean).length },
        drills: [{ id: "d1", title: "drill", description: "desc" }]
      };
    }
  };

  const speechClarityStore = {
    async createSession(mode = "learning", title = "") {
      return {
        id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        mode,
        title: title || "Session",
        transcript_text: "",
        duration_seconds: null,
        metrics_json: null,
        drills_json: null
      };
    },
    async saveSession(session) {
      sessions.set(session.id, { ...session });
      return session;
    },
    async getSession(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);
      return { ...session };
    },
    async saveAudioFile(sessionId) {
      return `audio/${sessionId}.webm`;
    }
  };

  const taskStore = {
    async updateTask(taskId, next) {
      const current = tasks.get(taskId) || { id: taskId, status: "open", updatedAt: null };
      const updated = { ...current, ...next, id: taskId, updatedAt: new Date().toISOString() };
      tasks.set(taskId, updated);
      return updated;
    },
    async getTask(taskId) {
      return tasks.get(taskId) || { id: taskId, status: "open", updatedAt: new Date().toISOString() };
    }
  };

  const threadStore = {
    async appendMessage() {}
  };

  const memoryStore = {
    async getContextBundle({ taskId, agent, mode }) {
      return {
        taskId,
        agent,
        mode,
        recentThread: [],
        rollingSummary: "ok"
      };
    }
  };

  const elevenlabsTts = {
    async synthesize() {
      return {
        contentType: "audio/mpeg",
        audioBuffer: Buffer.from("fake_audio")
      };
    },
    getConfigState() {
      return {
        configured: true,
        provider: "elevenlabs",
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
        profilesConfigured: 3,
        allProfilesConfigured: true,
        availableProfiles: ["male", "female", "prof"]
      };
    }
  };

  const voice = {
    getCapabilities() {
      return { mode: "stub", synthesis: { available: true } };
    }
  };

  const createEvent = (type, actor, lane, summary, meta = {}) => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    actor,
    lane,
    summary,
    meta,
    timestamp: new Date().toISOString()
  });
  const appendEvent = (sessionId, event) => {
    const existing = eventsBySession.get(sessionId) || [];
    existing.push(event);
    eventsBySession.set(sessionId, existing);
    return { event, deduped: false };
  };
  const getEvents = (sessionId) => eventsBySession.get(sessionId) || [];

  return {
    resolveScopedTaskId: (_req, taskId) => String(taskId || "global"),
    resolveScopedSessionId: (_req, sessionId) => String(sessionId || "global"),
    withScopedBody: (_req, body) => ({ ...(body || {}) }),
    handleAgentCommand: async (body = {}) => ({
      ok: true,
      taskId: String(body.taskId || "global"),
      reply: "ok",
      agent: String(body.agent || "Coach"),
      mood: "calm",
      intent: "assist"
    }),
    acquireAgentLaneLock: () => ({ acquired: true, key: "k1" }),
    releaseAgentLaneLock: () => {},
    threadStore,
    taskStore,
    memoryStore,
    voice,
    elevenlabsTts,
    speechClarityStore,
    speechClarityAnalyze,
    createEvent,
    appendEvent,
    getEvents,
    scopeErrorResponder: () => false
  };
}

describe("capability routes integration", () => {
  let server;
  let baseUrl = "";

  beforeAll(async () => {
    const app = express();
    app.use(express.json({ limit: "2mb" }));
    app.use((req, _res, next) => {
      req.principal = {
        mode: "local",
        tenantId: "tenant_local",
        workspaceId: "workspace_local",
        userId: "user_local",
        role: "owner"
      };
      next();
    });
    app.use("/capability", createCapabilityRoutes(createStubs()));
    server = await new Promise((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (!server) return;
    await new Promise((resolve) => server.close(resolve));
  });

  test("speech session create returns contract envelope", async () => {
    const response = await fetch(`${baseUrl}/capability/speech-clarity/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "req_speech_1",
        contractVersion: "v1alpha1",
        data: { mode: "learning", title: "My Session" }
      })
    });
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.requestId).toBe("req_speech_1");
    expect(json.contractVersion).toBe("v1alpha1");
    expect(json.session?.id).toBeTruthy();
  });

  test("workflow events append and read", async () => {
    const post = await fetch(`${baseUrl}/capability/workflow/events/session_a`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "req_event_1",
        contractVersion: "v1alpha1",
        data: {
          type: "agent_status_updated",
          actor: "system",
          lane: "talk",
          summary: "status changed"
        }
      })
    });
    expect(post.status).toBe(200);

    const read = await fetch(`${baseUrl}/capability/workflow/events/session_a`, {
      headers: { "x-request-id": "req_event_2", "x-ateam-contract-version": "v1alpha1" }
    });
    expect(read.status).toBe(200);
    const json = await read.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.events)).toBe(true);
    expect(json.events.length).toBe(1);
  });

  test("context bundle and agent respond endpoints return contract-shaped payloads", async () => {
    const context = await fetch(`${baseUrl}/capability/context/bundle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "req_ctx_1",
        contractVersion: "v1alpha1",
        data: {
          taskId: "task_1",
          agent: "Coach",
          mode: "dashboard"
        }
      })
    });
    expect(context.status).toBe(200);
    const contextJson = await context.json();
    expect(contextJson.ok).toBe(true);
    expect(contextJson.contextBundle?.rollingSummary).toBe("ok");

    const agent = await fetch(`${baseUrl}/capability/agent/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: "req_agent_1",
        contractVersion: "v1alpha1",
        data: {
          taskId: "task_1",
          message: "hello",
          agent: "Coach"
        }
      })
    });
    expect(agent.status).toBe(200);
    const agentJson = await agent.json();
    expect(agentJson.ok).toBe(true);
    expect(agentJson.reply).toBe("ok");
    expect(agentJson.requestId).toBe("req_agent_1");
  });
});
