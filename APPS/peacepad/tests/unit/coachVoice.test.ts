import { describe, expect, it } from "vitest";
import {
  normalizeCoachVoiceTranscript,
  shouldAutoSendCoachVoiceTurn,
} from "../../client/src/lib/coachVoice";

describe("coachVoice turn pipeline", () => {
  it("normalizes transcript before processing", () => {
    expect(normalizeCoachVoiceTranscript("  We   can talk   after pickup  ")).toBe(
      "We can talk after pickup",
    );
  });

  it("allows auto-send for non-empty transcript when mutation is idle", () => {
    expect(shouldAutoSendCoachVoiceTurn("Need help with this conflict", false)).toBe(true);
  });

  it("blocks auto-send for empty transcript or pending mutation", () => {
    expect(shouldAutoSendCoachVoiceTurn("   ", false)).toBe(false);
    expect(shouldAutoSendCoachVoiceTurn("Please help", true)).toBe(false);
  });
});
