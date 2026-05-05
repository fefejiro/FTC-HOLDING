export type SpeechRecognitionEngine = "speech-recognition" | "webkit-speech-recognition" | "none";

export interface SpeechRecognitionAvailability {
  supported: boolean;
  engine: SpeechRecognitionEngine;
}

export function detectSpeechRecognition(globalScope: unknown): SpeechRecognitionAvailability {
  const scope = globalScope as Record<string, unknown> | null;
  if (!scope) {
    return { supported: false, engine: "none" };
  }

  if (typeof scope.SpeechRecognition === "function") {
    return { supported: true, engine: "speech-recognition" };
  }

  if (typeof scope.webkitSpeechRecognition === "function") {
    return { supported: true, engine: "webkit-speech-recognition" };
  }

  return { supported: false, engine: "none" };
}

export function normalizeSpeechTranscript(transcript: string): string {
  return (transcript || "").replace(/\s+/g, " ").trim();
}

export function shouldFallbackToServerTranscription(errorCode?: string): boolean {
  const normalized = (errorCode || "").toLowerCase();
  return normalized === "network" || normalized === "service-not-allowed";
}

export function getSpeechRecognitionErrorMessage(errorCode?: string): string {
  switch ((errorCode || "").toLowerCase()) {
    case "not-allowed":
    case "audio-capture":
      return "Microphone access is blocked. Allow microphone access and try again.";
    case "no-speech":
      return "No speech detected. Please try again.";
    case "network":
      return "Speech recognition network issue. Falling back to secure server transcription.";
    case "service-not-allowed":
      return "Speech service unavailable on this device. Falling back to secure server transcription.";
    default:
      return "Speech recognition failed. Please try again.";
  }
}
