import fs from "fs";
import path from "path";

export function createSpeechClarityStore({ memoryDir = "" } = {}) {
  const storageDir = path.join(memoryDir, "speech_clarity");

  async function ensure() {
    return new Promise((resolve, reject) => {
      fs.mkdir(storageDir, { recursive: true }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `sess_${timestamp}_${random}`;
  }

  async function createSession(mode = "learning", title = "") {
    const id = generateSessionId();
    const session = {
      id,
      created_at: new Date().toISOString(),
      mode,
      title: String(title || "").trim() || `Session ${new Date().toLocaleDateString()}`,
      audio_path: null,
      transcript_text: "",
      duration_seconds: null,
      metrics_json: null,
      drills_json: null,
      reflection_notes_json: { audioOnly: [], videoMuted: [], full: [] }
    };
    return session;
  }

  async function saveSession(session) {
    if (!session || !session.id) {
      throw new Error("Invalid session: missing id");
    }
    const filePath = path.join(storageDir, `${session.id}.json`);
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, JSON.stringify(session, null, 2), (err) => {
        if (err) reject(err);
        else resolve(session);
      });
    });
  }

  async function getSession(sessionId) {
    const filePath = path.join(storageDir, `${sessionId}.json`);
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          if (err.code === "ENOENT") {
            reject(new Error(`Session not found: ${sessionId}`));
          } else {
            reject(err);
          }
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse session JSON: ${e.message}`));
        }
      });
    });
  }

  async function listSessions(limit = 14) {
    return new Promise((resolve, reject) => {
      fs.readdir(storageDir, (err, files) => {
        if (err) {
          if (err.code === "ENOENT") {
            resolve([]);
          } else {
            reject(err);
          }
          return;
        }

        const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();
        const toLoad = jsonFiles.slice(0, limit);

        Promise.all(
          toLoad.map((file) =>
            new Promise((res) => {
              const filePath = path.join(storageDir, file);
              fs.readFile(filePath, "utf8", (err, data) => {
                if (err) {
                  res(null);
                  return;
                }
                try {
                  res(JSON.parse(data));
                } catch {
                  res(null);
                }
              });
            })
          )
        ).then((sessions) => {
          const valid = sessions.filter((s) => s !== null);
          resolve(valid);
        });
      });
    });
  }

  async function saveAudioFile(sessionId, audioBuffer) {
    const audioFileName = `${sessionId}.webm`;
    const audioPath = path.join(storageDir, "audio", audioFileName);
    const audioDir = path.dirname(audioPath);

    await new Promise((resolve, reject) => {
      fs.mkdir(audioDir, { recursive: true }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return new Promise((resolve, reject) => {
      fs.writeFile(audioPath, audioBuffer, (err) => {
        if (err) reject(err);
        else resolve(`audio/${audioFileName}`);
      });
    });
  }

  async function getAudioFile(sessionId) {
    const audioFileName = `${sessionId}.webm`;
    const audioPath = path.join(storageDir, "audio", audioFileName);

    return new Promise((resolve, reject) => {
      fs.readFile(audioPath, (err, data) => {
        if (err) {
          if (err.code === "ENOENT") {
            resolve(null);
          } else {
            reject(err);
          }
        } else {
          resolve(data);
        }
      });
    });
  }

  return {
    ensure,
    generateSessionId,
    createSession,
    saveSession,
    getSession,
    listSessions,
    saveAudioFile,
    getAudioFile
  };
}
