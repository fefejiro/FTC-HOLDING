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
      requestedBy: "public",
      category: "website",
      idea: "Build a service site with a tighter lead funnel",
      questions: [{ id: "audience", prompt: "Who is it for?" }],
      recommendedLane: "Fast Website Launch"
    });

    expect(created.id).toMatch(/^wfr_/);
    expect(created.phase).toBe("analysis");
    expect(created.category).toBe("website");

    const updated = await store.update(created.id, {
      phase: "brief_approval",
      title: "Service Site Lead Funnel",
      answers: { audience: "local service owners" },
      brief: { summary: "Tighter lead funnel." },
      links: { projectId: "workflow_service_site" }
    });

    expect(updated.phase).toBe("brief_approval");
    expect(updated.title).toBe("Service Site Lead Funnel");
    expect(updated.answers.audience).toBe("local service owners");
    expect(updated.links.projectId).toBe("workflow_service_site");

    const listed = await store.list({ limit: 10 });
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(created.id);
  });
});
