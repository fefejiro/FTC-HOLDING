import express from "express";
import multer from "multer";

export function createSpeechClarityRoutes({ store, analyze } = {}) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

  function badRequest(res, message, details) {
    return res.status(400).json({
      ok: false,
      error: message,
      details: details || null
    });
  }

  function serverError(res, message, err) {
    return res.status(500).json({
      ok: false,
      error: message,
      details: err ? String(err.message || err) : null
    });
  }

  // POST /speech/session/create
  router.post("/session/create", async (req, res) => {
    try {
      const mode = String(req.body?.mode || "learning").trim();
      const title = String(req.body?.title || "").trim();

      if (!["learning", "podcast", "interview"].includes(mode)) {
        return badRequest(res, "invalid mode", "mode must be learning, podcast, or interview");
      }

      const session = await store.createSession(mode, title);
      await store.saveSession(session);

      res.json({ ok: true, session });
    } catch (err) {
      serverError(res, "failed_to_create_session", err);
    }
  });

  // POST /speech/session/:id/upload-audio
  router.post("/session/:id/upload-audio", upload.single("audio"), async (req, res) => {
    try {
      const sessionId = String(req.params.id || "").trim();
      if (!sessionId) return badRequest(res, "session_id required");
      if (!req.file || !req.file.buffer) return badRequest(res, "audio file required");

      const session = await store.getSession(sessionId);
      if (!session) return badRequest(res, "session not found");

      const audioPath = await store.saveAudioFile(sessionId, req.file.buffer);
      session.audio_path = audioPath;
      await store.saveSession(session);

      res.json({ ok: true, session });
    } catch (err) {
      if (err.message.includes("not found")) {
        return badRequest(res, "session not found");
      }
      serverError(res, "failed_to_upload_audio", err);
    }
  });

  // POST /speech/session/:id/save-transcript
  router.post("/session/:id/save-transcript", async (req, res) => {
    try {
      const sessionId = String(req.params.id || "").trim();
      const transcript = String(req.body?.transcript_text || "").trim();
      const duration = req.body?.duration_seconds;

      if (!sessionId) return badRequest(res, "session_id required");
      if (!transcript) return badRequest(res, "transcript_text required");

      const session = await store.getSession(sessionId);
      if (!session) return badRequest(res, "session not found");

      session.transcript_text = transcript;
      if (Number.isFinite(duration) && duration > 0) {
        session.duration_seconds = Number(duration);
      }

      await store.saveSession(session);
      res.json({ ok: true, session });
    } catch (err) {
      if (err.message.includes("not found")) {
        return badRequest(res, "session not found");
      }
      serverError(res, "failed_to_save_transcript", err);
    }
  });

  // POST /speech/session/:id/analyze
  router.post("/session/:id/analyze", async (req, res) => {
    try {
      const sessionId = String(req.params.id || "").trim();
      if (!sessionId) return badRequest(res, "session_id required");

      const session = await store.getSession(sessionId);
      if (!session) return badRequest(res, "session not found");
      if (!session.transcript_text) return badRequest(res, "no transcript to analyze");

      const { metrics, drills } = analyze.analyzeTranscript(session.transcript_text, session.duration_seconds);

      session.metrics_json = metrics;
      session.drills_json = drills;
      await store.saveSession(session);

      res.json({
        ok: true,
        session,
        metrics,
        drills
      });
    } catch (err) {
      if (err.message.includes("not found")) {
        return badRequest(res, "session not found");
      }
      serverError(res, "failed_to_analyze", err);
    }
  });

  // GET /speech/sessions
  router.get("/sessions", async (req, res) => {
    try {
      const sessions = await store.listSessions(14);
      res.json({
        ok: true,
        sessions,
        count: sessions.length
      });
    } catch (err) {
      serverError(res, "failed_to_list_sessions", err);
    }
  });

  // GET /speech/session/:id
  router.get("/session/:id", async (req, res) => {
    try {
      const sessionId = String(req.params.id || "").trim();
      if (!sessionId) return badRequest(res, "session_id required");

      const session = await store.getSession(sessionId);
      res.json({ ok: true, session });
    } catch (err) {
      if (err.message.includes("not found")) {
        return badRequest(res, "session not found");
      }
      serverError(res, "failed_to_get_session", err);
    }
  });

  // POST /speech/session/:id/reflection
  router.post("/session/:id/reflection", async (req, res) => {
    try {
      const sessionId = String(req.params.id || "").trim();
      const mode = String(req.body?.mode || "").trim();
      const notes = Array.isArray(req.body?.notes) ? req.body.notes : [];

      if (!sessionId) return badRequest(res, "session_id required");
      if (!["audioOnly", "videoMuted", "full"].includes(mode)) {
        return badRequest(res, "invalid reflection mode");
      }

      const session = await store.getSession(sessionId);
      if (!session) return badRequest(res, "session not found");

      if (!session.reflection_notes_json) {
        session.reflection_notes_json = { audioOnly: [], videoMuted: [], full: [] };
      }

      if (!Array.isArray(session.reflection_notes_json[mode])) {
        session.reflection_notes_json[mode] = [];
      }

      session.reflection_notes_json[mode].push(...notes);
      await store.saveSession(session);

      res.json({ ok: true, session });
    } catch (err) {
      if (err.message.includes("not found")) {
        return badRequest(res, "session not found");
      }
      serverError(res, "failed_to_save_reflection", err);
    }
  });

  return router;
}
