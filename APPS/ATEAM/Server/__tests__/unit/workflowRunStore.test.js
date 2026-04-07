import fs from "fs";
import os from "os";
import path from "path";

import { resetDb } from "../../lib/sqliteDb.js";
import { createWorkflowRunStore } from "../../lib/workflowRunStore.js";

describe("workflowRunStore", () => {
  let tempDir = "";

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ateam-workflow-store-"));
    process.env.ATEAM_SQLITE_PATH = path.join(tempDir, "workflow.sqlite");
    resetDb();
  });

  afterEach(() => {
    resetDb();
    delete process.env.ATEAM_SQLITE_PATH;
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("creates, updates, and lists workflow runs", async () => {
    const store = createWorkflowRunStore();
    const created = await store.create({
      phase: "analysis",
      state: "planning",
      requestedBy: "public",
      category: "website",
      idea: "Build a service site with a tighter lead funnel",
      questions: [{ id: "audience", prompt: "Who is it for?" }],
      recommendedLane: "Fast Website Launch",
      request: { rawInput: "Build a service site with a tighter lead funnel" },
      plan: { summary: "Plan the first-pass website scope." },
      evaluation: { finalStatus: "pending" },
      stateHistory: [{ state: "planning", phase: "analysis", createdAt: new Date().toISOString() }]
    });

    expect(created.id).toMatch(/^wfr_/);
    expect(created.phase).toBe("analysis");
    expect(created.category).toBe("website");
    expect(created.state).toBe("planning");
    expect(created.request.rawInput).toContain("lead funnel");

    const updated = await store.update(created.id, {
      phase: "brief_approval",
      state: "awaiting_approval",
      title: "Service Site Lead Funnel",
      answers: { audience: "local service owners" },
      brief: { summary: "Tighter lead funnel." },
      links: { projectId: "workflow_service_site" },
      plan: { summary: "Show the visible plan before execution." },
      evaluation: { finalStatus: "pending_review" },
      stateHistory: [
        { state: "planning", phase: "analysis", createdAt: new Date().toISOString() },
        { state: "awaiting_approval", phase: "brief_approval", createdAt: new Date().toISOString() }
      ]
    });

    expect(updated.phase).toBe("brief_approval");
    expect(updated.title).toBe("Service Site Lead Funnel");
    expect(updated.answers.audience).toBe("local service owners");
    expect(updated.links.projectId).toBe("workflow_service_site");
    expect(updated.state).toBe("awaiting_approval");
    expect(updated.plan.summary).toContain("visible plan");
    expect(updated.evaluation.finalStatus).toBe("pending_review");
    expect(updated.stateHistory).toHaveLength(2);

    const listed = await store.list({ limit: 10 });
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(created.id);

    const byCategory = await store.list({ limit: 10, category: "website" });
    expect(byCategory).toHaveLength(1);

    const byState = await store.list({ limit: 10, state: "awaiting_approval" });
    expect(byState).toHaveLength(1);
  });
});
