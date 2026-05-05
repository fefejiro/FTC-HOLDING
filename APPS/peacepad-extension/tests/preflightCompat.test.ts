import { describe, expect, it } from "vitest";
import {
  mapLegacyPreviewToPreflight,
  shouldFallbackToLegacyPreview,
  type LegacyPreviewResponse,
} from "../src/preflightCompat";

describe("preflight compatibility helpers", () => {
  it("maps legacy preview payloads into canonical preflight shape", () => {
    const payload: LegacyPreviewResponse = {
      tone: "hostile",
      summary: "This message is likely to escalate conflict.",
      emoji: "??",
      rewordingSuggestion: "I'm upset right now. Let's pause and focus on what needs to happen for the kids.",
      originalMessage: "Fuck you.",
      ces: {
        score: 84,
        state: "escalated",
        interventionLevel: "hard_block",
        trajectory: "upward",
        signals: [
          {
            type: "linguistic",
            signal: "hostile_language",
            weight: 0.9,
            description: "Hostile wording detected.",
          },
        ],
        suggestedActions: ["pause"],
        pauseRecommended: true,
        pauseDuration: 10,
        childImpactReminder: true,
        deescalationSuggestion: "I'm upset right now. Let's pause and focus on what needs to happen for the kids.",
      },
    };

    const result = mapLegacyPreviewToPreflight(payload);

    expect(result.conflict_score).toBe(84);
    expect(result.risk_level).toBe("critical");
    expect(result.calm_version).toContain("Let's pause");
    expect(result.moderation_flags).toContain("abusive_language");
    expect(result.send_policy.requires_acknowledgement).toBe(true);
  });

  it("recognizes the production 404 as a signal to use legacy preview fallback", () => {
    expect(
      shouldFallbackToLegacyPreview(
        "This host only serves the PeacePad API. Use https://peacepad.ca for the web app.",
        404,
      ),
    ).toBe(true);
    expect(shouldFallbackToLegacyPreview("Unauthorized", 401)).toBe(false);
  });
});
