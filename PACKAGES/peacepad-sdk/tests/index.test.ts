import { describe, expect, it } from "vitest";
import { PeacepadApiError, createPeacepadClient } from "../src/index";

const validResponse = {
  conflict_score: 62,
  risk_level: "high",
  signals: [
    {
      category: "linguistic",
      code: "escalating_language",
      weight: 20,
      description: "Belittling language detected",
    },
  ],
  moderation_flags: ["coercive_language"],
  recommendation: "review_and_rewrite",
  calm_version: "Could we revisit this calmly and agree on pickup timing?",
  send_policy: {
    allow_send_original: true,
    requires_acknowledgement: false,
    recommended_action: "review_and_rewrite",
    pause_minutes: 20,
  },
  model_or_ruleset_version: {
    contract: "preflight-v1",
    tone_model: "gpt-4o-mini",
    escalation_ruleset: "ces-v1",
  },
  source: {
    tone: "hostile",
    summary: "Escalating message",
  },
};

describe("peacepad-sdk client", () => {
  it("returns typed preflight response", async () => {
    const client = createPeacepadClient({
      baseUrl: "https://api.peacepad.ca",
      fetchImpl: async () =>
        new Response(JSON.stringify(validResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });

    const response = await client.analyzeMessage({
      text: "You always forget pickup.",
      channel: "whatsapp",
    });

    expect(response.conflict_score).toBe(62);
    expect(response.risk_level).toBe("high");
    expect(response.calm_version).toContain("pickup timing");
  });

  it("throws PeacepadApiError on API failure", async () => {
    const client = createPeacepadClient({
      fetchImpl: async () =>
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    });

    await expect(client.analyzeMessage({ text: "Hello" })).rejects.toBeInstanceOf(PeacepadApiError);
  });

  it("throws validation error for malformed payload", async () => {
    const client = createPeacepadClient({
      fetchImpl: async () =>
        new Response(JSON.stringify({ conflict_score: 33 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });

    await expect(client.analyzeMessage({ text: "Hello" })).rejects.toThrow(
      "Invalid preflight response",
    );
  });
});
