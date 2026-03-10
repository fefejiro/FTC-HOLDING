import { describe, expect, it } from "vitest";
import {
  mapPreviewToLegacyResponse,
  type PreviewAnalysisResponse,
} from "../../server/services/preflightContract";

describe("messages preview legacy parity", () => {
  it("keeps /api/messages/preview response shape stable", () => {
    const preview: PreviewAnalysisResponse = {
      tone: "hostile",
      summary: "Escalating language present",
      emoji: "⚠️",
      rewordingSuggestion: "Could we stick to pickup timing so the evening is easier for him?",
      originalMessage: "You always mess this up and never care",
      manipulationFlags: ["Pressure language"],
      translationToPlainEnglish: "This sounds like blame and frustration.",
      ces: {
        score: 74,
        state: "escalating",
        phase: "hot",
        interventionLevel: "modal",
        trajectory: "worsening",
        signals: [
          {
            type: "linguistic",
            signal: "always_never",
            weight: 14,
            description: "Absolute framing detected",
          },
        ],
        suggestedActions: [
          {
            type: "rewrite",
            label: "Use calmer wording",
            priority: 1,
          },
        ],
        pauseRecommended: true,
        pauseDuration: 20,
        childImpactReminder: true,
        deescalationSuggestion: "Can we align on pickup time so his routine stays consistent?",
      },
    };

    const result = mapPreviewToLegacyResponse(preview);

    expect(result).toEqual({
      tone: "hostile",
      summary: "Escalating language present",
      emoji: "⚠️",
      rewordingSuggestion: "Could we stick to pickup timing so the evening is easier for him?",
      originalMessage: "You always mess this up and never care",
      ces: {
        score: 74,
        state: "escalating",
        interventionLevel: "modal",
        trajectory: "worsening",
        signals: [
          {
            type: "linguistic",
            signal: "always_never",
            weight: 14,
            description: "Absolute framing detected",
          },
        ],
        suggestedActions: [
          {
            type: "rewrite",
            label: "Use calmer wording",
            priority: 1,
          },
        ],
        pauseRecommended: true,
        pauseDuration: 20,
        childImpactReminder: true,
        deescalationSuggestion: "Can we align on pickup time so his routine stays consistent?",
      },
    });

    expect(Object.keys(result).sort()).toEqual(
      ["ces", "emoji", "originalMessage", "rewordingSuggestion", "summary", "tone"].sort(),
    );
    expect(result.ces && Object.keys(result.ces).sort()).toEqual(
      [
        "childImpactReminder",
        "deescalationSuggestion",
        "interventionLevel",
        "pauseDuration",
        "pauseRecommended",
        "score",
        "signals",
        "state",
        "suggestedActions",
        "trajectory",
      ].sort(),
    );
  });

  it("returns null CES when no escalation payload is present", () => {
    const preview: PreviewAnalysisResponse = {
      tone: "neutral",
      summary: "No concerns",
      emoji: "🙂",
      originalMessage: "Thanks for handling pickup.",
      ces: null,
    };

    expect(mapPreviewToLegacyResponse(preview)).toEqual({
      tone: "neutral",
      summary: "No concerns",
      emoji: "🙂",
      rewordingSuggestion: undefined,
      originalMessage: "Thanks for handling pickup.",
      ces: null,
    });
  });
});
