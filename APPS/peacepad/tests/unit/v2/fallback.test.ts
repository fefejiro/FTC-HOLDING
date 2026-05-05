import { describe, expect, it } from "vitest";
import {
  fallbackScoreToLegacyConflictLevel,
  scoreConflictFallback,
} from "../../../server/v2/services/deterministicFallback";
import { runConflictCheck } from "../../../server/v2/services/conflictService";

describe("v2 deterministic fallback", () => {
  it("scores high when denied-access and legal threat language are present", () => {
    const result = scoreConflictFallback(
      "You denied me access to our child and I will take you to court.",
    );

    expect(result.score).toBeGreaterThanOrEqual(0.6);
    expect(result.level).toBe("high");
    expect(result.signals).toContain("denied_access_language");
    expect(result.signals).toContain("legal_threat_language");
  });

  it("keeps conflict-check operational when AI analysis fails", async () => {
    const output = await runConflictCheck(
      {
        text: "You denied me access and I will take legal action now.",
      },
      {
        analyzeConflictFn: async () => {
          throw new Error("provider_unavailable");
        },
        calculateCESFn: () => {
          throw new Error("ces_unavailable");
        },
      },
    );

    expect(output.conflict_level).toBeGreaterThanOrEqual(
      fallbackScoreToLegacyConflictLevel(0.7),
    );
    expect(output.signals.length).toBeGreaterThan(0);
  });
});
