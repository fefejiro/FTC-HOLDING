import { describe, expect, it } from "vitest";
import { calculateConflictEscalationScore } from "../../server/aiHelper";

describe("CES non-profanity escalation coverage", () => {
  it("detects accusatory escalation even without profanity", () => {
    const result = calculateConflictEscalationScore(
      "You always forget pickup and you never listen. This is getting exhausting!!",
      [],
      "user-1",
    );

    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.interventionLevel === "soft_nudge" || result.interventionLevel === "modal").toBe(true);
    expect(result.signals.some((signal) => signal.signal === "accusatory")).toBe(true);
    expect(result.signals.some((signal) => signal.signal === "hostile_language")).toBe(false);
  });

  it("keeps collaborative child-focused language low risk", () => {
    const result = calculateConflictEscalationScore(
      "Could we discuss school supplies for the kids and agree what works best? Please let me know.",
      [],
      "user-1",
    );

    expect(result.score).toBeLessThan(31);
    expect(result.interventionLevel).toBe("none");
    expect(result.signals.some((signal) => signal.signal === "collaborative_language")).toBe(true);
  });
});
