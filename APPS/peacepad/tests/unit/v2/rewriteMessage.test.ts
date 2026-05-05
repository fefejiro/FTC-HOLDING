import { describe, expect, it } from "vitest";
import { runRewriteMessage } from "../../../server/v2/services/rewriteService";

const ESCALATION_REGEX = /\b(you always|you never|idiot|or else|shut up)\b/i;

describe("v2 rewrite message module", () => {
  it("returns three rewrite styles and avoids escalation language", async () => {
    const result = await runRewriteMessage(
      {
        text: "You never listen and you're an idiot.",
        user_style: "direct",
        coparent_style: "sensitive",
      },
      {
        analyzeDraftToneFn: async () => ({
          overallTone: "confrontational",
          toneScore: 22,
          potentialTriggers: ["you never listen"],
          howItMightBePerceived: "Likely to trigger defensiveness.",
          suggestedRevision: "You never listen and this is your fault.",
          strengthsIdentified: [],
        }),
      },
    );

    expect(result.rewritten_calm).toBeTruthy();
    expect(result.rewritten_neutral).toBeTruthy();
    expect(result.rewritten_boundary).toBeTruthy();
    expect(result.conflict_level).toBeGreaterThanOrEqual(3);

    expect(result.rewritten_calm).not.toMatch(ESCALATION_REGEX);
    expect(result.rewritten_neutral).not.toMatch(ESCALATION_REGEX);
    expect(result.rewritten_boundary).not.toMatch(ESCALATION_REGEX);
  });
});
