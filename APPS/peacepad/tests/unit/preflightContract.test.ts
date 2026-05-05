import { describe, expect, it } from "vitest";
import {
  mapPreviewToPreflight,
  parsePreflightRequest,
  resolveConversationIdFromMetadata,
  type PreviewAnalysisResponse,
} from "../../server/services/preflightContract";

function createPreviewFixture(): PreviewAnalysisResponse {
  return {
    tone: "hostile",
    summary: "Escalating message",
    emoji: "??",
    rewordingSuggestion: "Could we talk about pickup timing calmly?",
    originalMessage: "You always forget pickup and never listen!!",
    manipulationFlags: ["pressure language"],
    ces: {
      score: 67,
      state: "escalating",
      phase: "hot",
      interventionLevel: "modal",
      trajectory: "worsening",
      signals: [
        {
          type: "linguistic",
          signal: "escalating_language",
          weight: 20,
          description: "Belittling language detected",
        },
        {
          type: "behavioral",
          signal: "pressure_control",
          weight: 15,
          description: "Demanding immediate response",
        },
      ],
      suggestedActions: [
        {
          type: "rewrite",
          label: "Rewrite with calmer tone",
          priority: 1,
        },
      ],
      pauseRecommended: true,
      pauseDuration: 20,
      childImpactReminder: true,
      deescalationSuggestion: "Could we pause and agree on a pickup plan that works for both of us?",
    },
  };
}

describe("preflight contract mapper", () => {
  it("maps preview payload into canonical preflight contract", () => {
    const result = mapPreviewToPreflight(createPreviewFixture());

    expect(result.conflict_score).toBe(67);
    expect(result.risk_level).toBe("high");
    expect(result.recommendation).toBe("review_and_rewrite");
    expect(result.calm_version).toContain("pickup plan");
    expect(result.signals.length).toBe(2);
    expect(result.send_policy.allow_send_original).toBe(true);
    expect(result.send_policy.requires_acknowledgement).toBe(false);
    expect(result.send_policy.pause_minutes).toBe(20);
    expect(result.model_or_ruleset_version.contract).toBe("preflight-v1");
    expect(result.moderation_flags).toContain("hostile_tone");
    expect(result.moderation_flags).toContain("coercive_language");
    expect(result.moderation_flags).toContain("pressure_language");
  });

  it("falls back to tone-based scoring when CES payload is missing", () => {
    const result = mapPreviewToPreflight({
      tone: "neutral",
      summary: "Message ready",
      emoji: "??",
      originalMessage: "Can we sync tomorrow?",
      rewordingSuggestion: null,
      ces: null,
    });

    expect(result.conflict_score).toBe(22);
    expect(result.risk_level).toBe("low");
    expect(result.recommendation).toBe("send_or_review");
    expect(result.calm_version).toBeNull();
  });
});

describe("preflight request parsing", () => {
  it("parses valid request payload", () => {
    const parsed = parsePreflightRequest({
      text: "  Please confirm pickup time  ",
      context: "co-parenting",
      channel: "whatsapp",
      mode: "standard",
      metadata: {
        conversationId: "conv_123",
      },
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.text).toBe("Please confirm pickup time");
    expect(parsed?.context).toBe("co-parenting");
    expect(parsed?.channel).toBe("whatsapp");
    expect(parsed?.mode).toBe("standard");
    expect(resolveConversationIdFromMetadata(parsed?.metadata)).toBe("conv_123");
  });

  it("returns null when required text is missing", () => {
    const parsed = parsePreflightRequest({ context: "co-parenting" });
    expect(parsed).toBeNull();
  });

  it("supports conversation_id fallback key", () => {
    expect(resolveConversationIdFromMetadata({ conversation_id: "conv_abc" })).toBe("conv_abc");
  });
});
