import { describe, expect, it } from "vitest";
import { evaluateLocalPreflight, LOCAL_RULESET_ENTRY_COUNT } from "../src/localRules";

describe("local preflight rules", () => {
  it("keeps the active local ruleset above the demo target size", () => {
    expect(LOCAL_RULESET_ENTRY_COUNT).toBeGreaterThanOrEqual(1000);
  });

  it("classifies a safe logistical message locally", () => {
    const result = evaluateLocalPreflight({ text: "Hey, I am outside." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("safe");
    expect(result.response.risk_level).toBe("low");
    expect(result.response.recommendation).toBe("send_as_is");
  });

  it("classifies a mild accusation locally", () => {
    const result = evaluateLocalPreflight({ text: "You always pick up the kid late." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("mild");
    expect(result.response.risk_level).toBe("medium");
    expect(result.response.recommendation).toBe("review_and_rewrite");
    expect(result.response.calm_version).toContain("Pickup has been running late recently.");
  });

  it("classifies repeated lateness resentment locally", () => {
    const result = evaluateLocalPreflight({ text: "As usual you are late again." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("mild");
    expect(result.response.signals.some((signal) => signal.code === "accusatory")).toBe(true);
  });

  it("classifies profanity locally as strong", () => {
    const result = evaluateLocalPreflight({ text: "Fuck you." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("strong");
    expect(result.response.moderation_flags).toContain("profanity");
    expect(result.response.send_policy.requires_acknowledgement).toBe(true);
    expect(result.response.calm_version).toBe(
      "I want to keep this professional. Can we pause and focus on the next step?",
    );
  });

  it("classifies motherfucker profanity locally as strong", () => {
    const result = evaluateLocalPreflight({ text: "You motherfucker." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("strong");
    expect(result.response.signals.some((signal) => signal.code === "hostile_language")).toBe(true);
    expect(result.response.moderation_flags).toContain("profanity");
  });

  it("classifies bitch locally as strong", () => {
    const result = evaluateLocalPreflight({ text: "bitch" });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("strong");
    expect(result.response.recommendation).toBe("pause_before_send");
    expect(result.response.moderation_flags).toContain("profanity");
    expect(result.response.calm_version).toContain("keep this professional");
  });

  it("classifies standalone stupid locally as mild", () => {
    const result = evaluateLocalPreflight({ text: "This is stupid." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("mild");
    expect(result.response.recommendation).toBe("review_and_rewrite");
    expect(result.response.signals.some((signal) => signal.code === "dismissive_attack")).toBe(true);
  });

  it("classifies targeted stupid locally as strong", () => {
    const result = evaluateLocalPreflight({ text: "You are stupid." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("strong");
    expect(result.response.recommendation).toBe("pause_before_send");
  });

  it("classifies mama taunts locally as mild", () => {
    const result = evaluateLocalPreflight({ text: "ya mama" });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("mild");
    expect(result.response.recommendation).toBe("review_and_rewrite");
    expect(result.response.signals.some((signal) => signal.code === "dismissive_attack")).toBe(true);
  });

  it("classifies child-directed attack locally as strong", () => {
    const result = evaluateLocalPreflight({ text: "You never care about the kids." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("strong");
    expect(result.response.moderation_flags).toContain("harassment");
  });

  it("classifies parenting insult locally as strong", () => {
    const result = evaluateLocalPreflight({ text: "You are a terrible parent." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("strong");
    expect(result.response.risk_level === "high" || result.response.risk_level === "critical").toBe(true);
  });

  it("detects phrase-based escalation locally", () => {
    const result = evaluateLocalPreflight({ text: "If you do this again I'll take you to court." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("strong");
    expect(result.response.signals.some((signal) => signal.code === "legal_escalation")).toBe(true);
    expect(result.response.recommendation).toBe("pause_before_send");
  });

  it("classifies deal-risk blame locally as mild", () => {
    const result = evaluateLocalPreflight({ text: "You're costing us this deal." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("mild");
    expect(result.response.recommendation).toBe("review_and_rewrite");
    expect(result.response.calm_version).toContain("affect the deal");
  });

  it("classifies professional put-downs locally as mild", () => {
    const result = evaluateLocalPreflight({ text: "Stop wasting my time." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("mild");
    expect(result.response.recommendation).toBe("review_and_rewrite");
    expect(result.response.calm_version).toContain("send me an update as soon as possible");
  });

  it("rewrites professional urgency in a deal-safe tone", () => {
    const result = evaluateLocalPreflight({ text: "Answer me now." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("mild");
    expect(result.response.calm_version).toContain("keep this moving");
  });

  it("rewrites replacement threats in a professional way", () => {
    const result = evaluateLocalPreflight({ text: "I'll go with another agent." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("mild");
    expect(result.response.calm_version).toContain("clarify responsibilities and next steps");
  });

  it("escalates stacked business-risk phrases to strong", () => {
    const result = evaluateLocalPreflight({ text: "Stop wasting my time and use common sense." });

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") {
      return;
    }

    expect(result.classification).toBe("strong");
    expect(result.response.recommendation).toBe("pause_before_send");
  });

  it("marks child expense disputes as ambiguous for api fallback", () => {
    const result = evaluateLocalPreflight({
      text: "When are you going to send money for the kids' school supplies? It's been weeks.",
    });

    expect(result.kind).toBe("fallback");
    if (result.kind !== "fallback") {
      return;
    }

    expect(result.classification).toBe("ambiguous");
    expect(result.reason).toContain("api fallback");
  });
});
