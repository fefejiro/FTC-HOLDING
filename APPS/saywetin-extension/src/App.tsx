import heroImg from "./assets/hero.png";

import React, { useState } from "react";

type Result = {
  track: string;
  lyric: string;
  meaning: string;
  trackId?: string;
} | string | null;

type TrackResult = Exclude<Result, string | null>;

const isTrackResult = (value: Result): value is TrackResult =>
  typeof value === "object" && value !== null && "track" in value;

const ListenOrb: React.FC<{ onTap: () => void; listening: boolean }> = ({ onTap, listening }) => (
  <button
    aria-label={listening ? "Listening..." : "Tap to listen"}
    className={`w-32 h-32 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${listening ? "bg-blue-500 animate-pulse" : "bg-gray-200 hover:bg-blue-100"}`}
    onClick={onTap}
    style={{ outline: "none", border: "none" }}
  >
    <span className="text-3xl font-bold text-white drop-shadow">
      {listening ? "🎤" : "🔊"}
    </span>
  </button>
);

const App: React.FC = () => {
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);


  // @ts-ignore: Chrome extension API
  const handleTap = async () => {
    setListening(true);
    setResult(null);
    setError(null);
    try {
      // Ask background to start tab capture
      // @ts-ignore: Chrome extension API
      chrome.runtime.sendMessage({ type: "START_TAB_CAPTURE" }, async (response: any) => {
        if (response?.error) {
          setError(response.error);
          setListening(false);
        } else {
          // Try to get the tab audio stream
          // @ts-ignore: Chrome extension API
          const stream = await navigator.mediaDevices.getUserMedia({ audio: { chromeMediaSource: 'tab' } });
          if (!stream) {
            setError("Could not capture tab audio");
            setListening(false);
            return;
          }
          // Record 7 seconds of audio
          const recorder = new MediaRecorder(stream);
          const chunks: BlobPart[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };
          recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            try {
              const formData = new FormData();
              formData.append('audio', blob, 'audio.webm');
              // Replace with your deployed backend endpoint
              const res = await fetch('https://saywetin.app/api/recognize', {
                method: 'POST',
                body: formData,
              });
              if (!res.ok) throw new Error('Recognition failed');
              const data = await res.json();
              // Example: { track: ..., lyric: ..., meaning: ... }
              setResult({
                track: data.track || 'Unknown',
                lyric: data.lyric || '',
                meaning: data.meaning || '',
                trackId: data.trackId || data.id || '',
              });
              // Sync recent recognition to user account if authenticated
              try {
                const session = localStorage.getItem('saywetin_session');
                if (session && data.trackId) {
                  await fetch('https://saywetin.app/api/recent-recognition', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session}`,
                    },
                    body: JSON.stringify({ trackId: data.trackId }),
                  });
                }
              } catch {}
            } catch (err: any) {
              setError(err.message || 'Recognition failed');
            }
            setListening(false);
          };
          recorder.start();
          setTimeout(() => {
            recorder.stop();
            stream.getTracks().forEach((t) => t.stop());
          }, 7000);
        }
      });
    } catch (e: any) {
      setError(e.message || "Unknown error");
      setListening(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] min-w-[320px] p-4 bg-gradient-to-br from-white via-blue-50 to-blue-100 border border-blue-200 rounded-2xl shadow-xl">
      <img src={heroImg} alt="SayWetin logo" className="w-24 h-24 mb-3 rounded-xl shadow-lg border border-blue-100" />
      <ListenOrb onTap={handleTap} listening={listening} />
      <div className="mt-6 w-full text-center">
        {listening && <div className="text-blue-500 font-semibold">Listening...</div>}
        {isTrackResult(result) ? (
          <div className="bg-gray-100 rounded p-2 mt-2 text-sm whitespace-pre-wrap border border-blue-50">
            <div><b>Track:</b> {result.track}</div>
            <div>
              <b>Lyric:</b>{' '}
              <span
                className="underline text-blue-600 cursor-pointer hover:text-blue-800"
                onClick={async () => {
                  setResult((r) => isTrackResult(r) ? { ...r, meaning: 'Loading meaning...' } : r);
                  try {
                    const res = await fetch('https://saywetin.app/v1/cultural-analysis', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: result.lyric }),
                    });
                    const data = await res.json();
                    setResult((r) => isTrackResult(r) ? { ...r, meaning: data.meaning || 'No meaning found' } : r);
                  } catch {
                    setResult((r) => isTrackResult(r) ? { ...r, meaning: 'Error fetching meaning' } : r);
                  }
                }}
                title="Tap for cultural meaning"
              >
                '{result.lyric}'
              </span>
            </div>
            <div><b>Meaning:</b> {result.meaning}</div>
            {result.trackId && (
              <div className="mt-3">
                <a
                  href={`https://saywetin.app/track/${result.trackId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-3 py-1 rounded bg-blue-500 text-white font-semibold text-xs hover:bg-blue-600 transition"
                >
                  View Full Track Page
                </a>
              </div>
            )}
          </div>
        ) : typeof result === 'string' && (
          <pre className="bg-gray-100 rounded p-2 mt-2 text-sm whitespace-pre-wrap border border-blue-50">{result}</pre>
        )}
        {error && <div className="text-red-500 mt-2">{error}</div>}
      </div>
      <div className="mt-8 text-xs text-blue-400 font-semibold tracking-wide">SayWetin Chrome Extension</div>
    </div>
  );
};

export default App;
