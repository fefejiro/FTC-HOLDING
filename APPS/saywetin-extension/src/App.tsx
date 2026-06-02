import React, { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_SAYWETIN_API_BASE_URL?.replace(/\/$/, "") || "https://api.saywetin.app";

// ?mock=1 in the popup URL skips tab capture and returns fake data instantly
const IS_MOCK = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mock") === "1";

type TrackResult = {
  track: string;
  artist: string;
  lyric: string;
  meaning: string;
  trackId?: string;
  language?: string;
};

type AppState = "idle" | "listening" | "result" | "error";

// Ripple rings that pulse outward when listening
const Ripples: React.FC = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="absolute rounded-full border-2 border-purple-400/40"
        style={{
          width: 120 + i * 52,
          height: 120 + i * 52,
          animation: `ripple 2s ease-out ${i * 0.55}s infinite`,
        }}
      />
    ))}
  </div>
);

const OrbButton: React.FC<{ state: AppState; onClick: () => void; countdown: number }> = ({ state, onClick, countdown }) => {
  const isListening = state === "listening";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
      {isListening && <Ripples />}
      <button
        aria-label={isListening ? "Listening…" : "Tap to recognise"}
        onClick={onClick}
        disabled={isListening}
        className="relative z-10 rounded-full flex flex-col items-center justify-center transition-all duration-300 select-none focus:outline-none"
        style={{
          width: 132,
          height: 132,
          borderRadius: "50%",
          overflow: "hidden",
          border: isListening
            ? "1px solid rgba(255,255,255,0.28)"
            : "1px solid rgba(255,255,255,0.18)",
          background: isListening
            ? "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.05)), radial-gradient(circle at 30% 28%, rgba(255,255,255,0.42), rgba(255,255,255,0.08) 34%, rgba(115,74,255,0.36) 64%, rgba(22,16,44,0.92))"
            : "linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04)), radial-gradient(circle at 30% 28%, rgba(255,255,255,0.34), rgba(255,255,255,0.06) 34%, rgba(115,74,255,0.22) 64%, rgba(20,14,36,0.88))",
          boxShadow: isListening
            ? "0 0 0 1px rgba(255,255,255,0.12) inset, 0 22px 50px rgba(101,71,255,0.34), 0 0 0 8px rgba(133,92,255,0.12)"
            : "0 0 0 1px rgba(255,255,255,0.08) inset, 0 18px 42px rgba(86,62,192,0.26), 0 0 0 6px rgba(133,92,255,0.08)",
          backdropFilter: "blur(18px) saturate(170%)",
          WebkitBackdropFilter: "blur(18px) saturate(170%)",
          transform: isListening ? "scale(1.06)" : "scale(1)",
        }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0) 48%)",
            maskImage: "radial-gradient(circle at 50% 10%, black 0%, transparent 72%)",
          }}
        />
        {isListening && (
          <span
            aria-hidden="true"
            className="absolute inset-[10px] rounded-full"
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              background: "conic-gradient(from 0deg, rgba(255,255,255,0.34), rgba(255,255,255,0.02), rgba(168,85,247,0.28), rgba(255,255,255,0.3))",
              filter: "blur(0.5px)",
              animation: "orbSpin 5.8s linear infinite",
              opacity: 0.85,
            }}
          />
        )}
        <span
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            bottom: 10,
            width: 84,
            height: 28,
            background: isListening
              ? "radial-gradient(circle, rgba(244,114,182,0.32), rgba(244,114,182,0))"
              : "radial-gradient(circle, rgba(167,139,250,0.22), rgba(167,139,250,0))",
            filter: "blur(10px)",
          }}
        />
        <div
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: 84,
            height: 84,
            borderRadius: "50%",
            background: isListening
              ? "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), rgba(255,255,255,0.1) 42%, rgba(139,92,246,0.2) 72%, rgba(17,24,39,0.32))"
              : "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3), rgba(255,255,255,0.08) 42%, rgba(139,92,246,0.12) 72%, rgba(17,24,39,0.26))",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 1px 0 rgba(255,255,255,0.22) inset, 0 12px 24px rgba(15,23,42,0.22)",
          }}
        >
          <span
            style={{
              fontSize: 44,
              lineHeight: 1,
              fontWeight: 700,
              color: "rgba(255,255,255,0.96)",
              textShadow: "0 4px 16px rgba(255,255,255,0.22)",
              transform: isListening ? "rotate(-10deg)" : "rotate(-6deg)",
            }}
          >
            S
          </span>
        </div>
        {isListening && (
          <span
            className="relative z-10 text-xs font-semibold mt-2"
            style={{ color: "rgba(255,255,255,0.78)", letterSpacing: "0.08em" }}
          >
            {countdown}s
          </span>
        )}
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>("idle");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(7);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = () => {
    setCountdown(7);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const getStreamId = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // @ts-expect-error: Chrome extension API
        chrome.runtime.sendMessage({ type: "START_TAB_CAPTURE" }, (response: { error?: string; streamId?: string }) => {
          if (response?.error) {
            reject(new Error(response.error));
            return;
          }
          if (!response?.streamId) {
            reject(new Error("Could not obtain stream ID from background"));
            return;
          }
          resolve(response.streamId);
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to start tab capture"));
      }
    });
  };

  const isNetworkError = (message: string) => {
    const text = message.toLowerCase();
    return text.includes("network") || text.includes("failed") || text.includes("timeout") || text.includes("server");
  };

  const formatSearchUrl = (query: string, provider: "spotify" | "youtube") => {
    const encoded = encodeURIComponent(query);
    return provider === "spotify"
      ? `https://open.spotify.com/search/${encoded}`
      : `https://www.youtube.com/results?search_query=${encoded}`;
  };

  const normalizeResult = (payload: any): TrackResult => ({
    track: payload.track || payload.title || "Unknown song",
    artist: payload.artist || payload.performer || "Unknown artist",
    lyric: payload.lyric || payload.line || "",
    meaning: payload.meaning || payload.context || "",
    trackId: payload.trackId || payload.id || undefined,
    language: payload.language || payload.locale || undefined,
  });

  const createAudioConstraints = (streamId: string) => {
    return {
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
    } as unknown as MediaStreamConstraints;
  };

  const getPreferredRecorderOptions = (): MediaRecorderOptions | undefined => {
    if (typeof MediaRecorder === "undefined") {
      return undefined;
    }
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      return { mimeType: "audio/webm;codecs=opus" };
    }
    if (MediaRecorder.isTypeSupported("audio/webm")) {
      return { mimeType: "audio/webm" };
    }
    return undefined;
  };

  const recordTabAudio = async (stream: MediaStream): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      const recorderOptions = getPreferredRecorderOptions();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, recorderOptions as MediaRecorderOptions);
      } catch (error) {
        try {
          recorder = new MediaRecorder(stream);
        } catch (fallbackError) {
          reject(fallbackError instanceof Error ? fallbackError : new Error("MediaRecorder is not supported"));
          return;
        }
      }

      const chunks: BlobPart[] = [];
      let ended = false;

      const cleanup = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        if (!ended) {
          ended = true;
          cleanup();
          const recorderError = event as any;
          reject(new Error(recorderError.error?.message || "Recording failed"));
        }
      };

      recorder.onstop = () => {
        if (ended) {
          return;
        }
        ended = true;
        cleanup();
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (blob.size === 0) {
          reject(new Error("No audio was captured"));
          return;
        }
        resolve(blob);
      };

      try {
        recorder.start();
      } catch (startError) {
        cleanup();
        reject(startError instanceof Error ? startError : new Error("Failed to start audio recording"));
        return;
      }

      setTimeout(() => {
        if (!ended) {
          try {
            recorder.stop();
          } catch {
            if (!ended) {
              ended = true;
              cleanup();
              reject(new Error("Failed to stop recording"));
            }
          }
        }
      }, 7000);
    });
  };

  const renderTrackChips = (track: TrackResult) => {
    const chips = [track.language, track.artist, track.trackId ? "Matched" : undefined].filter(Boolean) as string[];
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
        {chips.map((chip) => (
          <span
            key={chip}
            style={{
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              padding: "6px 10px",
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#d1d5db",
            }}
          >
            {chip}
          </span>
        ))}
      </div>
    );
  };

  const handleTap = async () => {
    setAppState("listening");
    setResult(null);
    setError(null);
    startCountdown();

    if (IS_MOCK) {
      setTimeout(() => {
        setResult({
          track: "Essence (feat. Tems)",
          artist: "Wizkid",
          lyric: "You be the answer to my prayer",
          meaning:
            "A declaration of divine love — the beloved is answered prayer made flesh, rooted in Yoruba spiritual expression where blessings take human form.",
          trackId: "mock-001",
          language: "Yoruba / English",
        });
        setAppState("result");
      }, 3000);
      return;
    }

    const capturePromise = async () => {
      const streamId = await getStreamId();
      const constraints = createAudioConstraints(streamId);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const audioBlob = await recordTabAudio(stream);
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch(`${API_BASE}/api/recognize`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Recognition failed (${response.status})`);
      }

      const data = await response.json();
      const normalized = normalizeResult(data);

      if (!normalized.track || normalized.track === "Unknown song") {
        throw new Error(data.error || data.message || "Could not identify the song. Try again with clearer audio.");
      }

      setResult(normalized);
      setAppState("result");
    };

    try {
      await capturePromise();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Recognition failed";
      const userMessage = isNetworkError(message)
        ? "Network or server issue. Check your connection and try again."
        : message.toLowerCase().includes("permission")
          ? "Allow audio capture for SayWetin and try again."
          : message.toLowerCase().includes("tab")
            ? "Make sure a browser tab is playing audio and try again."
            : "I could not hear the song clearly. Try again with a louder tab audio source.";
      setError(userMessage);
      setAppState("error");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setResult(null);
    setError(null);
    setCountdown(7);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const searchQuery = result ? `${result.track} ${result.artist}`.trim() : "";
  const spotifySearchUrl = formatSearchUrl(searchQuery || "saywetin", "spotify");
  const youtubeSearchUrl = formatSearchUrl(searchQuery || "saywetin", "youtube");

  return (
    <div
      style={{
        width: 340,
        minHeight: 460,
        background: "linear-gradient(160deg, #0f0a1a 0%, #1a0d2e 50%, #0d1117 100%)",
        fontFamily: "system-ui, 'Segoe UI', sans-serif",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "28px 20px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -80,
          background:
            "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.16) 0%, transparent 28%), radial-gradient(circle at 80% 18%, rgba(168,85,247,0.18) 0%, transparent 32%), radial-gradient(circle at 50% 100%, rgba(244,114,182,0.14) 0%, transparent 34%)",
          animation: "ambientFloat 12s ease-in-out infinite alternate",
          pointerEvents: "none",
        }}
      />

      {/* Ambient glow behind orb */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          transform: "translateX(-50%)",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(134,59,255,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo + wordmark */}
      <div className="flex items-center gap-2 mb-3 z-10">
        <svg width="28" height="27" viewBox="0 0 48 46" fill="none">
          <path fill="#a855f7" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
        </svg>
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.04em", color: "#e9d5ff" }}>
          SayWetin
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 10, textAlign: "center", marginBottom: 18, maxWidth: 280 }}>
        <div style={{ fontSize: 10, color: "#c4b5fd", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 8 }}>
          Lyrics and meaning
        </div>
        <div style={{ fontSize: 22, lineHeight: 1.05, fontWeight: 800, color: "#ffffff" }}>
          Recognize the song. <span style={{ color: "#d8b4fe" }}>Catch the meaning.</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: "#cbd5e1" }}>
          Capture tab audio, pull the lyric, and explain the slang and cultural context behind the line.
        </div>
      </div>

      {/* Idle / Listening state */}
      {(appState === "idle" || appState === "listening") && (
        <>
          <OrbButton state={appState} onClick={handleTap} countdown={countdown} />
          <p style={{ marginTop: 20, fontSize: 14, color: appState === "listening" ? "#c084fc" : "#9ca3af", fontWeight: 500, letterSpacing: "0.03em" }}>
            {appState === "listening" ? "Listening to tab audio..." : "Tap to recognize"}
          </p>
          <p style={{ marginTop: 6, fontSize: 11, color: "#4b5563" }}>
            {appState === "idle" ? "Play a song in your browser tab first" : "Recording 7 seconds..."}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 14, maxWidth: 260 }}>
            {[
              "Song recognition",
              "Live lyric",
              "Slang meaning",
            ].map((item) => (
              <span
                key={item}
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  padding: "6px 10px",
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#d1d5db",
                }}
              >
                {item}
              </span>
            ))}
          </div>
          {IS_MOCK && (
            <div style={{ marginTop: 8, fontSize: 10, color: "#7c3aed", background: "rgba(124,58,237,0.12)", borderRadius: 6, padding: "3px 10px" }}>
              MOCK MODE — no real API call
            </div>
          )}
        </>
      )}

      {/* Result state */}
      {appState === "result" && result && (
        <div style={{ width: "100%", marginTop: 8, animation: "fadeUp 0.4s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
              {result.language || "African Track"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{result.track}</div>
            {result.artist && (
              <div style={{ fontSize: 13, color: "#a78bfa", marginTop: 4 }}>{result.artist}</div>
            )}
            {renderTrackChips(result)}
          </div>

          {result.lyric && (
            <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "#6d28d9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Live lyric</div>
              <div style={{ fontSize: 14, color: "#e9d5ff", fontStyle: "italic", lineHeight: 1.5 }}>"{result.lyric}"</div>
            </div>
          )}

          {result.meaning && (
            <div style={{ background: "rgba(71,191,255,0.06)", border: "1px solid rgba(71,191,255,0.15)", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#0ea5e9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Meaning and context</div>
              <div style={{ fontSize: 13, color: "#bae6fd", lineHeight: 1.6 }}>{result.meaning}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            {result.trackId && (
              <a
                href={`https://saywetin.app/track/${result.trackId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 10,
                  background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                  color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none",
                  letterSpacing: "0.03em",
                }}
              >
                Open on SayWetin →
              </a>
            )}
            <button
              onClick={handleReset}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 10,
                background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)",
                color: "#a78bfa", fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}
            >
              Recognize again
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <a
              href={spotifySearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none",
                letterSpacing: "0.03em",
              }}
            >
              Search Spotify
            </a>
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, textAlign: "center", padding: "10px 0", borderRadius: 10,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none",
                letterSpacing: "0.03em",
              }}
            >
              Search YouTube
            </a>
          </div>
        </div>
      )}

      {/* Error state */}
      {appState === "error" && (
        <div style={{ width: "100%", marginTop: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
          <div style={{ color: "#f87171", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>{error}</div>
          <button
            onClick={handleReset}
            style={{
              padding: "9px 28px", borderRadius: 10,
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{ position: "absolute", bottom: 12, fontSize: 10, color: "#4b5563", letterSpacing: "0.08em" }}>
        SAYWETIN · SONGS, LYRICS, MEANING
      </div>

      <style>{`
        @keyframes ambientFloat {
          0% { transform: translate3d(-8px, -4px, 0) scale(1); }
          100% { transform: translate3d(10px, 8px, 0) scale(1.06); }
        }
        @keyframes ripple {
          0% { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes orbSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default App;
