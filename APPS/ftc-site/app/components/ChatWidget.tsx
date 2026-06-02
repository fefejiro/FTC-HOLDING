"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

type SpeechRecognitionResultLike = { transcript: string };
type SpeechRecognitionAlternativeLike = {
  0?: SpeechRecognitionResultLike;
  isFinal?: boolean;
};
type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionAlternativeLike>;
};
type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

type CrispValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | ((...args: unknown[]) => void)
  | CrispValue[];
type CrispCommand = [string, string, ...CrispValue[]];
type CrispQueue = CrispCommand[] | { push: (command: CrispCommand) => unknown };

declare global {
  interface Window {
    $crisp?: CrispQueue;
    CRISP_WEBSITE_ID?: string;
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  }
}

const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
const NATURAL_VOICE_HINTS = [
  "natural",
  "neural",
  "aria",
  "jenny",
  "samantha",
  "google uk english female",
  "microsoft ava",
  "microsoft emma",
  "olivia"
];

function queueCrisp(command: CrispCommand) {
  const queue = window.$crisp;
  if (!queue) return;
  if (Array.isArray(queue)) {
    queue.push(command);
    return;
  }
  queue.push(command);
}

function chooseNaturalVoice(voices: SpeechSynthesisVoice[]) {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const ranked = englishVoices.find((voice) => {
    const lower = voice.name.toLowerCase();
    return NATURAL_VOICE_HINTS.some((hint) => lower.includes(hint));
  });
  return ranked || null;
}

function getSpeechErrorMessage(error?: string) {
  switch (error) {
    case "audio-capture":
      return "Microphone capture failed. Check your device input and try again.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow mic access in your browser settings.";
    case "network":
      return "Voice capture hit a network issue. Try again in a moment.";
    case "no-speech":
      return "No speech detected. Speak right after pressing start.";
    case "aborted":
      return "";
    default:
      return "Voice capture could not start. You can still type into chat.";
  }
}

export default function ChatWidget() {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const canSpeakNaturallyRef = useRef(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [supportsVoiceInput, setSupportsVoiceInput] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [draft, setDraft] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Ready for voice chat.");
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null);

  const canSpeakNaturally = useMemo(() => Boolean(preferredVoice), [preferredVoice]);

  useEffect(() => {
    preferredVoiceRef.current = preferredVoice;
    canSpeakNaturallyRef.current = canSpeakNaturally;
  }, [preferredVoice, canSpeakNaturally]);

  useEffect(() => {
    if (!CRISP_WEBSITE_ID) return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID;

    const script = document.createElement("script");
    script.src = "https://client.crisp.chat/l.js";
    script.async = true;
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const speechWindow = window;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSupportsVoiceInput(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-CA";

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus("Listening. Speak your request and press stop when done.");
    };

    recognition.onresult = (event) => {
      const parts: string[] = [];
      const results = event.results;
      for (let i = event.resultIndex || 0; i < results.length; i += 1) {
        const chunk = results[i]?.[0]?.transcript;
        if (chunk) parts.push(chunk);
      }
      if (parts.length) {
        setDraft((prev) => `${prev} ${parts.join(" ")}`.replace(/\s+/g, " ").trim());
      }
    };

    recognition.onerror = (event) => {
      const message = getSpeechErrorMessage(event.error);
      if (message) setVoiceStatus(message);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus((prev) => (prev.includes("Listening") ? "Voice capture paused." : prev));
    };

    recognitionRef.current = recognition;
    setSupportsVoiceInput(true);

    return () => {
      recognitionRef.current = null;
      recognition.abort?.();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const hydrateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      setPreferredVoice(chooseNaturalVoice(voices));
    };

    hydrateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", hydrateVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", hydrateVoices);
    };
  }, []);

  useEffect(() => {
    if (!CRISP_WEBSITE_ID) return;

    queueCrisp([
      "on",
      "message:received",
      (payload: unknown) => {
        const message =
          typeof payload === "string"
            ? payload
            : payload && typeof payload === "object" && "content" in payload
              ? String((payload as { content?: string }).content || "")
              : "";
        if (!message.trim()) return;
        if (!canSpeakNaturallyRef.current || !("speechSynthesis" in window)) return;
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = preferredVoiceRef.current?.lang || "en-CA";
        if (preferredVoiceRef.current) utterance.voice = preferredVoiceRef.current;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    ]);
  }, []);

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setVoiceStatus("Voice capture stopped. Send to chat when ready.");
      return;
    }
    recognition.start();
  }

  function sendDraftToChat() {
    const text = draft.trim();
    if (!text) return;
    queueCrisp(["do", "chat:open"]);
    queueCrisp(["do", "message:send", ["text", text]]);
    setVoiceStatus("Sent to concierge chat.");

    if (canSpeakNaturally && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(
        "Message sent. A concierge specialist will reply shortly."
      );
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.lang = preferredVoice?.lang || "en-CA";
      if (preferredVoice) utterance.voice = preferredVoice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }

  if (!CRISP_WEBSITE_ID) return null;

  return (
    <div className="voice-concierge-shell" aria-live="polite">
      {isPanelOpen ? (
        <section className="voice-concierge-card" aria-label="Voice concierge chat">
          <div className="voice-concierge-head">
            <strong>Voice Concierge</strong>
            <button
              type="button"
              className="voice-concierge-close"
              onClick={() => setIsPanelOpen(false)}
              aria-label="Close voice concierge"
            >
              Close
            </button>
          </div>
          <p className="voice-concierge-sub">
            Speak naturally, review your draft, then send directly into live concierge chat.
          </p>
          <textarea
            className="voice-concierge-draft"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Tell Una Labs what you need built, fixed, or shipped..."
            rows={4}
          />
          <div className="voice-concierge-actions">
            <button
              type="button"
              className={`voice-concierge-btn ${isListening ? "voice-concierge-btn--active" : ""}`}
              onClick={toggleListening}
              disabled={!supportsVoiceInput}
            >
              {isListening ? "Stop voice" : "Start voice"}
            </button>
            <button
              type="button"
              className="voice-concierge-btn voice-concierge-btn--secondary"
              onClick={sendDraftToChat}
              disabled={!draft.trim()}
            >
              Send to chat
            </button>
            <button
              type="button"
              className="voice-concierge-btn voice-concierge-btn--secondary"
              onClick={() => queueCrisp(["do", "chat:open"])}
            >
              Open chat
            </button>
          </div>
          <p className="voice-concierge-status">
            {voiceStatus}
            {!canSpeakNaturally ? " Natural playback voice is unavailable on this browser." : ""}
          </p>
        </section>
      ) : null}
      <button
        type="button"
        className="voice-concierge-launcher"
        onClick={() => setIsPanelOpen((prev) => !prev)}
        aria-expanded={isPanelOpen}
      >
        {isPanelOpen ? "Hide voice chat" : "Voice AI chat"}
      </button>
    </div>
  );
}
