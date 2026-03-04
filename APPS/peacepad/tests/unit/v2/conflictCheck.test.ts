import { describe, expect, it } from "vitest";
import { runConflictCheck } from "../../../server/v2/services/conflictService";

describe("v2 conflict check module", () => {
  it("returns conflict_level and safety_flags", async () => {
    const result = await runConflictCheck(
      {
        text: "If you do not answer me now, I will call my lawyer.",
        conversation_history: ["We need to discuss pickup times."],
      },
      {
        analyzeConflictFn: async () => ({
          hasConflict: true,
          conflictType: "communication",
          severity: "medium",
          triggerPhrases: ["answer me now"],
          rootCause: "Escalating demand language",
          resolution: {
            immediate: "Take a brief pause.",
            shortTerm: "Reset expectations.",
            longTerm: "Use a shared communication format.",
          },
          communicationTip: "Use one specific request.",
          language: "en",
        }),
        calculateCESFn: () =>
          ({
            score: 64,
            state: "escalating",
            phase: "warm",
            interventionLevel: "modal",
            trajectory: "worsening",
            signals: [
              {
                type: "linguistic",
                signal: "pressure_control",
                weight: 15,
                description: "Demanding immediate response",
              },
            ],
            suggestedActions: [],
            pauseRecommended: true,
            pauseDuration: 20,
            childImpactReminder: true,
          }) as any,
      },
    );

    expect(result.conflict_level).toBeGreaterThanOrEqual(3);
    expect(result.safety_flags.length).toBeGreaterThan(0);
    expect(result.safety_flags).toContain("legal_escalation");
    expect(result.safety_flags).toContain("pressure_control");
    expect(result.recommended_next_actions.length).toBeGreaterThan(0);
    expect(result.do_not_say.length).toBeGreaterThan(0);
  });
});
