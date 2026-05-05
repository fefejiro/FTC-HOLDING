import express from "express";
import multer from "multer";
import {
  CAPABILITY_CONTRACT_HEADER,
  CAPABILITY_REQUEST_ID_HEADER,
  readCapabilityEnvelope,
  capabilityError,
  capabilityOk
} from "./contracts.js";

function compact(text, max = 220) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeRole(role) {
  const r = String(role || "user").trim().toLowerCase();
  if (r === "assistant" || r === "system") return r;
  return "user";
}

function normalizeSpeechMode(mode) {
  const normalized = String(mode || "learning").trim().toLowerCase();
  if (normalized === "podcast" || normalized === "interview") return normalized;
  return "learning";
}

function mergeScopeIntoSession(session = {}, principal = {}) {
  if (!session || typeof session !== "object") return session;
  const merged = { ...session };
  merged.tenant_id = String(merged.tenant_id || principal?.tenantId || "").trim() || null;
  merged.workspace_id = String(merged.workspace_id || principal?.workspaceId || "").trim() || null;
  merged.user_id = String(merged.user_id || principal?.userId || "").trim() || null;
  return merged;
}

function assertSessionScope(session = {}, principal = {}) {
  const mode = String(principal?.mode || "").trim();
  const sessionWorkspace = String(session?.workspace_id || "").trim();
  const principalWorkspace = String(principal?.workspaceId || "").trim();
  if (!sessionWorkspace || !principalWorkspace) return;
  if (mode === "local") return;
  if (sessionWorkspace !== principalWorkspace) {
    const err = new Error("cross_workspace_session_access");
    err.code = "SCOPE_FORBIDDEN";
    err.status = 403;
    err.details = "cross_workspace_session_access";
    throw err;
  }
}

function isScopeHandled(scopeErrorResponder, res, err, envelope) {
  if (typeof scopeErrorResponder !== "function") return false;
  return Boolean(scopeErrorResponder(res, err, envelope));
}

export function createCapabilityRoutes({
  resolveScopedTaskId,
  resolveScopedSessionId,
  withScopedBody,
  handleAgentCommand,
  acquireAgentLaneLock,
  releaseAgentLaneLock,
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
  scopeErrorResponder
} = {}) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

  // ---- Speech Clarity capability ----
  router.post("/speech-clarity/session", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const mode = normalizeSpeechMode(envelope.data?.mode);
      const title = compact(envelope.data?.title, 160);
      let session = await speechClarityStore.createSession(mode, title);
      session = mergeScopeIntoSession(session, req.principal);
      await speechClarityStore.saveSession(session);
      return capabilityOk(res, envelope, { session }, 201);
    } catch (err) {
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: 500,
        error: "failed_to_create_speech_session",
        details: err?.message || err
      });
    }
  });

  router.post("/speech-clarity/session/:id/transcript", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const sessionId = String(req.params.id || "").trim();
      const transcript = String(envelope.data?.transcript_text || envelope.data?.transcriptText || "").trim();
      const duration = envelope.data?.duration_seconds ?? envelope.data?.durationSeconds ?? null;
      if (!sessionId) {
        return capabilityError(res, envelope, {
          status: 400,
          error: "session_id_required",
          code: "BAD_REQUEST"
        });
      }
      if (!transcript) {
        return capabilityError(res, envelope, {
          status: 400,
          error: "transcript_required",
          code: "BAD_REQUEST"
        });
      }
      const session = await speechClarityStore.getSession(sessionId);
      assertSessionScope(session, req.principal);
      session.transcript_text = transcript;
      if (Number.isFinite(Number(duration)) && Number(duration) > 0) session.duration_seconds = Number(duration);
      await speechClarityStore.saveSession(session);
      return capabilityOk(res, envelope, { session });
    } catch (err) {
      if (String(err?.message || "").includes("not found")) {
        return capabilityError(res, envelope, { status: 404, error: "session_not_found", code: "NOT_FOUND" });
      }
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 500),
        error: "failed_to_save_transcript",
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  router.post("/speech-clarity/session/:id/analyze", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const sessionId = String(req.params.id || "").trim();
      if (!sessionId) {
        return capabilityError(res, envelope, {
          status: 400,
          error: "session_id_required",
          code: "BAD_REQUEST"
        });
      }
      const session = await speechClarityStore.getSession(sessionId);
      assertSessionScope(session, req.principal);
      if (!session.transcript_text) {
        return capabilityError(res, envelope, {
          status: 400,
          error: "no_transcript_to_analyze",
          code: "BAD_REQUEST"
        });
      }
      const { metrics, drills } = speechClarityAnalyze.analyzeTranscript(
        session.transcript_text,
        session.duration_seconds
      );
      session.metrics_json = metrics;
      session.drills_json = drills;
      await speechClarityStore.saveSession(session);
      return capabilityOk(res, envelope, { session, metrics, drills });
    } catch (err) {
      if (String(err?.message || "").includes("not found")) {
        return capabilityError(res, envelope, { status: 404, error: "session_not_found", code: "NOT_FOUND" });
      }
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 500),
        error: "failed_to_analyze_speech_session",
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  router.post("/speech-clarity/session/:id/audio", upload.single("audio"), async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const sessionId = String(req.params.id || "").trim();
      if (!sessionId) {
        return capabilityError(res, envelope, { status: 400, error: "session_id_required", code: "BAD_REQUEST" });
      }
      if (!req.file || !req.file.buffer) {
        return capabilityError(res, envelope, { status: 400, error: "audio_required", code: "BAD_REQUEST" });
      }
      const session = await speechClarityStore.getSession(sessionId);
      assertSessionScope(session, req.principal);
      const audioPath = await speechClarityStore.saveAudioFile(sessionId, req.file.buffer);
      session.audio_path = audioPath;
      await speechClarityStore.saveSession(session);
      return capabilityOk(res, envelope, { session });
    } catch (err) {
      if (String(err?.message || "").includes("not found")) {
        return capabilityError(res, envelope, { status: 404, error: "session_not_found", code: "NOT_FOUND" });
      }
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 500),
        error: "failed_to_upload_audio",
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  router.get("/speech-clarity/session/:id", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const sessionId = String(req.params.id || "").trim();
      if (!sessionId) {
        return capabilityError(res, envelope, { status: 400, error: "session_id_required", code: "BAD_REQUEST" });
      }
      const session = await speechClarityStore.getSession(sessionId);
      assertSessionScope(session, req.principal);
      return capabilityOk(res, envelope, { session });
    } catch (err) {
      if (String(err?.message || "").includes("not found")) {
        return capabilityError(res, envelope, { status: 404, error: "session_not_found", code: "NOT_FOUND" });
      }
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 500),
        error: "failed_to_get_speech_session",
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  // ---- Voice synthesis capability ----
  router.post("/voice/synthesize", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const text = String(envelope.data?.text || "").trim();
      const profile = String(envelope.data?.profile || "").trim().toLowerCase();
      if (!text) {
        return capabilityError(res, envelope, { status: 400, error: "text_required", code: "BAD_REQUEST" });
      }
      if (!["male", "female", "prof"].includes(profile)) {
        return capabilityError(res, envelope, {
          status: 400,
          error: "invalid_profile",
          details: "profile must be one of male,female,prof",
          code: "BAD_REQUEST"
        });
      }
      const output = await elevenlabsTts.synthesize({ text, profile });
      res.setHeader(CAPABILITY_REQUEST_ID_HEADER, envelope.requestId);
      res.setHeader(CAPABILITY_CONTRACT_HEADER, envelope.contractVersion);
      res.setHeader("Content-Type", output.contentType || "audio/mpeg");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(output.audioBuffer);
    } catch (err) {
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 502),
        error: String(err?.error || "voice_synthesize_failed"),
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  router.get("/voice/capabilities", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const ttsState = elevenlabsTts.getConfigState();
      return capabilityOk(res, envelope, {
        capabilities: {
          ...voice.getCapabilities(),
          synthesis: {
            available: ttsState.configured,
            provider: ttsState.provider,
            modelId: ttsState.modelId,
            outputFormat: ttsState.outputFormat,
            profilesConfigured: ttsState.profilesConfigured,
            allProfilesConfigured: ttsState.allProfilesConfigured,
            availableProfiles: ttsState.availableProfiles || []
          }
        }
      });
    } catch (err) {
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: 500,
        error: "failed_to_get_voice_capabilities",
        details: err?.message || err
      });
    }
  });

  // ---- Workflow capability ----
  router.post("/workflow/events/:sessionId", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const sessionId = resolveScopedSessionId(req, req.params.sessionId, "global");
      const type = String(envelope.data?.type || "").trim();
      const actor = String(envelope.data?.actor || "").trim();
      const lane = String(envelope.data?.lane || "").trim();
      const summary = String(envelope.data?.summary || "").trim();
      const meta = envelope.data?.meta && typeof envelope.data.meta === "object" ? envelope.data.meta : {};
      if (!type || !actor || !lane) {
        return capabilityError(res, envelope, {
          status: 400,
          error: "missing_required_fields",
          code: "BAD_REQUEST"
        });
      }
      const event = createEvent(type, actor, lane, summary, meta);
      const result = appendEvent(sessionId, event);
      return capabilityOk(res, envelope, {
        sessionId,
        event: result.event,
        deduped: Boolean(result.deduped)
      });
    } catch (err) {
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 500),
        error: "failed_to_log_event",
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  router.get("/workflow/events/:sessionId", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const sessionId = resolveScopedSessionId(req, req.params.sessionId, "global");
      const events = getEvents(sessionId);
      return capabilityOk(res, envelope, { sessionId, events });
    } catch (err) {
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 500),
        error: "failed_to_fetch_events",
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  router.post("/workflow/tasks/:taskId/status", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const taskId = resolveScopedTaskId(req, req.params.taskId || envelope.data?.taskId || "global", "global");
      const status = String(envelope.data?.status || "").trim().toLowerCase();
      const decisionNote = String(envelope.data?.decisionNote || "").trim();
      if (!status) {
        return capabilityError(res, envelope, { status: 400, error: "status_required", code: "BAD_REQUEST" });
      }
      const task = await taskStore.updateTask(taskId, { status, decisionNote });
      await threadStore.appendMessage(taskId, {
        role: "system",
        agent: "System",
        content: `Task status updated to ${status}${decisionNote ? `: ${decisionNote}` : ""}`
      });
      return capabilityOk(res, envelope, { taskId, task });
    } catch (err) {
      if (String(err?.code || "") === "INVALID_STATUS") {
        return capabilityError(res, envelope, {
          status: 400,
          error: "invalid_status",
          details: JSON.stringify({ allowedStatuses: err.allowedStatuses || [] }),
          code: "INVALID_STATUS"
        });
      }
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 500),
        error: "failed_to_update_task_status",
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  router.get("/workflow/tasks/:taskId", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const taskId = resolveScopedTaskId(req, req.params.taskId || "global", "global");
      const task = await taskStore.getTask(taskId);
      return capabilityOk(res, envelope, { taskId, task });
    } catch (err) {
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 500),
        error: "failed_to_get_task",
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  // ---- Context capability ----
  router.post("/context/bundle", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const taskId = resolveScopedTaskId(req, envelope.data?.taskId || "global", "global");
      const agent = compact(envelope.data?.agent || "Coach", 40) || "Coach";
      const mode = compact(envelope.data?.mode || "dashboard", 24) || "dashboard";
      const contextBundle = await memoryStore.getContextBundle({ taskId, agent, mode });
      return capabilityOk(res, envelope, { taskId, agent, mode, contextBundle });
    } catch (err) {
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 500),
        error: "failed_to_build_context_bundle",
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  // ---- Agent runtime capability ----
  router.post("/agent/respond", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    try {
      const body = withScopedBody(req, envelope.data || {});
      const lock = acquireAgentLaneLock(body);
      if (!lock.acquired) {
        return capabilityError(res, envelope, {
          status: 409,
          error: "request_in_flight",
          details: `${lock.sessionId}:${lock.lane}`,
          code: "REQUEST_IN_FLIGHT"
        });
      }
      try {
        const result = await handleAgentCommand(body);
        return capabilityOk(res, envelope, result);
      } finally {
        releaseAgentLaneLock(lock);
      }
    } catch (err) {
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      return capabilityError(res, envelope, {
        status: Number(err?.status || 500),
        error: String(err?.code || "failed_to_run_agent"),
        details: err?.details || err?.message || err,
        code: err?.code || ""
      });
    }
  });

  router.post("/agent/respond/stream", async (req, res) => {
    const envelope = readCapabilityEnvelope(req);
    let lock = null;
    try {
      const body = withScopedBody(req, envelope.data || {});
      lock = acquireAgentLaneLock(body);
      if (!lock.acquired) {
        return capabilityError(res, envelope, {
          status: 409,
          error: "request_in_flight",
          details: `${lock.sessionId}:${lock.lane}`,
          code: "REQUEST_IN_FLIGHT"
        });
      }

      res.setHeader(CAPABILITY_REQUEST_ID_HEADER, envelope.requestId);
      res.setHeader(CAPABILITY_CONTRACT_HEADER, envelope.contractVersion);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      if (typeof res.flushHeaders === "function") res.flushHeaders();

      const writeEvent = (event, rawData) => {
        const safe = String(rawData ?? "");
        const lines = safe.split(/\r?\n/);
        res.write(`event: ${event}\n`);
        for (const line of lines) {
          res.write(`data: ${line}\n`);
        }
        res.write("\n");
      };

      const result = await handleAgentCommand(body, {
        stream: true,
        onToken: (token) => {
          if (res.writableEnded || res.destroyed) return;
          writeEvent("token", token);
        }
      });
      if (!res.writableEnded && !res.destroyed) {
        writeEvent("done", result.reply || "");
        res.end();
      }
    } catch (err) {
      if (res.writableEnded || res.destroyed) return;
      if (isScopeHandled(scopeErrorResponder, res, err, envelope)) return;
      res.setHeader(CAPABILITY_REQUEST_ID_HEADER, envelope.requestId);
      res.setHeader(CAPABILITY_CONTRACT_HEADER, envelope.contractVersion);
      res.write(`event: error\ndata: ${String(err?.message || err)}\n\n`);
      res.end();
    } finally {
      if (lock) releaseAgentLaneLock(lock);
    }
  });

  return router;
}
