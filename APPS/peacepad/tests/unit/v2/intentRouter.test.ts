import { describe, expect, it } from "vitest";
import { MODULE_IDS } from "../../../server/v2/registry/moduleRegistry";
import { routeIntent } from "../../../server/v2/router/intentRouter";

const mockConflictAnalysis = {
  hasConflict: false,
  conflictType: "none" as const,
  severity: "low" as const,
  triggerPhrases: [],
  rootCause: "",
  resolution: {
    immediate: "",
    shortTerm: "",
    longTerm: "",
  },
  communicationTip: "",
  language: "en",
};

describe("v2 intent router", () => {
  it("returns a valid module_id for free-form text", async () => {
    const result = await routeIntent(
      {
        text: "Can you help me word this message to my co-parent?",
      },
      {
        analyzeConflictFn: async () => mockConflictAnalysis,
      },
    );

    expect([
      MODULE_IDS.ROUTER_INTENT,
      MODULE_IDS.CONFLICT_CHECK,
      MODULE_IDS.REWRITE_MESSAGE,
      MODULE_IDS.SUPPORT_DISCOVERY,
    ]).toContain(result.module_id);
  });

  it("routes high-risk language to support discovery", async () => {
    const result = await routeIntent(
      {
        text: "I feel unsafe and need help now",
      },
      {
        analyzeConflictFn: async () => ({
          ...mockConflictAnalysis,
          hasConflict: true,
          conflictType: "communication",
          severity: "high",
        }),
      },
    );

    expect(result.module_id).toBe(MODULE_IDS.SUPPORT_DISCOVERY);
    expect(result.conflict_level).toBe(4);
    expect(result.safety_flags).toContain("immediate_danger");
  });
});
