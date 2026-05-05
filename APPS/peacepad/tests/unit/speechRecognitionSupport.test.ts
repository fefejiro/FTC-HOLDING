import { describe, expect, it } from "vitest";
import {
  detectSpeechRecognition,
  getSpeechRecognitionErrorMessage,
  normalizeSpeechTranscript,
  shouldFallbackToServerTranscription,
} from "../../client/src/lib/speechRecognitionSupport";

describe("speechRecognitionSupport", () => {
  it("detects native SpeechRecognition", () => {
    const scope = {
      SpeechRecognition: function SpeechRecognitionMock() {
        return undefined;
      },
    };

    expect(detectSpeechRecognition(scope)).toEqual({
      supported: true,
      engine: "speech-recognition",
    });
  });

  it("detects webkitSpeechRecognition fallback", () => {
    const scope = {
      webkitSpeechRecognition: function WebkitSpeechRecognitionMock() {
        return undefined;
      },
    };

    expect(detectSpeechRecognition(scope)).toEqual({
      supported: true,
      engine: "webkit-speech-recognition",
    });
  });

  it("returns unsupported engine when no recognition APIs exist", () => {
    expect(detectSpeechRecognition({})).toEqual({
      supported: false,
      engine: "none",
    });
  });

  it("normalizes transcript whitespace", () => {
    expect(normalizeSpeechTranscript("  hi    there \n friend   ")).toBe("hi there friend");
  });

  it("falls back to server transcription for allowed error codes only", () => {
    expect(shouldFallbackToServerTranscription("network")).toBe(true);
    expect(shouldFallbackToServerTranscription("service-not-allowed")).toBe(true);
    expect(shouldFallbackToServerTranscription("not-allowed")).toBe(false);
    expect(shouldFallbackToServerTranscription("audio-capture")).toBe(false);
  });

  it("maps recognition errors to user-safe messages", () => {
    expect(getSpeechRecognitionErrorMessage("not-allowed")).toContain("Microphone access is blocked");
    expect(getSpeechRecognitionErrorMessage("network")).toContain("Falling back");
    expect(getSpeechRecognitionErrorMessage("unknown-error-code")).toContain("Speech recognition failed");
  });
});
