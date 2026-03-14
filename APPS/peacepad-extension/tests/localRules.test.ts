import { describe, expect, it } from "vitest";
import { evaluateLocalPreflight } from "../src/localRules";

describe("local preflight rules", () => {
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
