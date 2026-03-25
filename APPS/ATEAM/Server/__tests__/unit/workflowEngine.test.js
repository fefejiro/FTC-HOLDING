import {
  buildWorkflowBrief,
  buildWorkflowHandoff,
  buildWorkflowPack,
  buildWorkflowQuestions,
  buildWorkflowWorkItems,
  normalizeWorkflowCategory
} from "../../lib/workflowEngine.js";

describe("workflowEngine", () => {
  test("normalizes categories and builds follow-up questions", () => {
    const category = normalizeWorkflowCategory("product-app");
    const questions = buildWorkflowQuestions({
      idea: "Build a restaurant booking assistant that works through WhatsApp",
      category
    });

    expect(category).toBe("product-app");
    expect(questions).toHaveLength(2);
    expect(questions[0].id).toBe("audience");
  });

  test("builds a brief, pack, and handoff payload from answers", () => {
    const run = {
      id: "wfr_test_001",
      idea: "Build a vendor ticketing workflow for WhatsApp",
      category: "internal-tool",
      answers: {
        audience: "field operators handling incoming maintenance requests",
        firstWin: "let a team receive a ticket, assign it, and report status back quickly",
        constraints: "needs a phase-one version in two weeks with low setup overhead",
        signals: "the team already handles requests manually and keeps losing track of updates"
      }
    };

    const brief = buildWorkflowBrief({
      idea: run.idea,
      category: run.category,
      answers: run.answers,
      runId: run.id
    });
    const pack = buildWorkflowPack({
      run: {
        ...run,
        brief,
        risks: ["Scope could sprawl without a narrow first pass."]
      }
    });
    const handoff = buildWorkflowHandoff({
      run: {
        ...run,
        phase: "pack_approval",
        brief,
        artifacts: pack
      }
    });
    const work = buildWorkflowWorkItems({
      ...run,
      brief
    });

    expect(brief.title).toContain("Build");
    expect(brief.recommendedLane).toBe("Internal Tool / Ops System");
    expect(pack.mockup.screens.length).toBeGreaterThanOrEqual(3);
    expect(pack.prototype.frames.length).toBe(3);
    expect(pack.smoke.checks).toHaveLength(3);
    expect(handoff.version).toBe(2);
    expect(handoff.runId).toBe(run.id);
    expect(work.projectId).toContain("workflow");
    expect(work.items).toHaveLength(4);
  });
});
