import fs from "fs";
import os from "os";
import path from "path";
import { jest } from "@jest/globals";

import { resetDb } from "../../lib/sqliteDb.js";
import { createApprovalStore } from "../../lib/approvalStore.js";
import { createWorkItemStore } from "../../lib/workItemStore.js";
import { createWorkflowRunStore } from "../../lib/workflowRunStore.js";
import { createWorkflowService } from "../../lib/workflowService.js";

describe("workflowService", () => {
  let tempDir = "";
  let workflowService;
  let workItemStore;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ateam-workflow-service-"));
    process.env.ATEAM_SQLITE_PATH = path.join(tempDir, "workflow-service.sqlite");
    resetDb();

    workItemStore = createWorkItemStore();
    workflowService = createWorkflowService({
      workflowRunStore: createWorkflowRunStore(),
      approvalStore: createApprovalStore(),
      workItemStore,
      emitEvent: jest.fn()
    });
  });

  afterEach(() => {
    resetDb();
    delete process.env.ATEAM_SQLITE_PATH;
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("builds a public-safe workflow view with timelines, jobs, and run-owned artifacts", async () => {
    const started = await workflowService.startRun({
      idea: "Build a client intake system that turns rough ideas into a brief, route, and first delivery pack.",
      category: "internal-tool",
      requestedBy: "public"
    });

    expect(started.history[0].eventType).toBe("created");
    expect(started.statusNarrative.currentStage).toBe("routing");
    expect(started.state).toBe("awaiting_approval");
    expect(started.request?.rawInput).toContain("client intake system");
    expect(started.plan?.approvalActions).toEqual(expect.arrayContaining(["approve", "reject", "regenerate"]));
    expect(started.project.workflowRunId).toBe(started.id);
    expect(started.project.status).toBe("discovery");
    expect(started.publicFlow?.modules.map((module) => module.key)).toEqual([
      "intake",
      "system",
      "work",
      "output"
    ]);
    expect(started.publicFlow?.understanding?.title).toBeTruthy();

    const withBrief = await workflowService.captureAnswers(started.id, {
      actor: "public",
      answers: {
        audience: "small teams who bring rough briefs and need the next move fast",
        firstWin: "show the clearest direction, the brief, and what to build first",
        constraints: "keep the operator side private while the public intake stays simple",
        signals: "the current process feels intelligent but not yet trustworthy"
      }
    });

    const briefArtifact = withBrief.artifactSummaries.find((artifact) => artifact.type === "brief");
    expect(withBrief.history.some((entry) => entry.eventType === "artifact_created")).toBe(true);
    expect(briefArtifact).toBeTruthy();
    expect(briefArtifact.runId).toBe(withBrief.id);
    expect(briefArtifact.projectId).toBe("");
    expect(briefArtifact.promotionStatus).toBe("run_owned");
    expect(withBrief.state).toBe("awaiting_approval");

    const initiated = await workflowService.approveRun(withBrief.id, {
      actor: "operator",
      gate: "brief",
      decision: "approved"
    });

    expect(initiated.project.status).toBe("planning");
    expect(initiated.project.id).toBe(initiated.links.projectId);
    expect(initiated.jobs).toHaveLength(4);
    expect(initiated.links.jobIds).toEqual(initiated.links.workItemIds);
    expect(
      initiated.artifactSummaries.find((artifact) => artifact.id === `${initiated.id}_brief`)?.projectId
    ).toBe(initiated.project.id);

    const packed = await workflowService.generatePack(initiated.id, { actor: "operator" });
    expect(packed.artifactSummaries.map((artifact) => artifact.type)).toEqual(
      expect.arrayContaining(["brief", "mockup", "prototype", "smoke_report", "document"])
    );
    expect(packed.statusNarrative.currentStage).toBe("review");
    expect(packed.history.some((entry) => entry.eventType === "artifact_created")).toBe(true);

    const delivered = await workflowService.approveRun(packed.id, {
      actor: "operator",
      gate: "pack",
      decision: "approved"
    });

    expect(delivered.handoff.status).toBe("ready");
    expect(delivered.project.status).toBe("delivery");
    expect(delivered.history.some((entry) => entry.eventType === "delivered")).toBe(true);
    expect(delivered.artifactSummaries.every((artifact) => artifact.runId === delivered.id)).toBe(true);
    expect(delivered.artifactSummaries.every((artifact) => artifact.projectId === delivered.project.id)).toBe(true);
    expect(delivered.publicFlow?.modules.find((module) => module.key === "output")?.state).toBe("Decision pack ready");
    expect(delivered.evaluation?.finalStatus).toBe("completed");
  });

  test("regenerate loops the plan back to approval without losing request context", async () => {
    const started = await workflowService.startRun({
      idea: "Turn a rough services inquiry into a visible plan before any execution starts.",
      category: "lead-automation",
      requestedBy: "public"
    });

    const updated = await workflowService.captureAnswers(started.id, {
      actor: "public",
      answers: {
        goal: "show the user a clear plan before any execution happens",
        context: "public users do not know what will happen next",
        desiredOutput: "a concise decision pack",
        constraints: "keep the first pass public-safe",
        nonGoals: "do not expose operator internals"
      }
    });

    const regenerated = await workflowService.approveRun(updated.id, {
      actor: "public",
      gate: "brief",
      decision: "regenerate"
    });

    expect(regenerated.state).toBe("awaiting_approval");
    expect(regenerated.phase).toBe("brief_approval");
    expect(regenerated.request?.intake?.goal).toContain("clear plan");
    expect(regenerated.stateHistory?.some((entry) => entry.reason?.includes("regenerated"))).toBe(true);
  });

  test("job timelines persist stage movement and blocker reasons", async () => {
    const started = await workflowService.startRun({
      idea: "Build a workflow that can show why a delivery item got stuck and what it is waiting on.",
      category: "internal-tool",
      requestedBy: "public"
    });

    const withBrief = await workflowService.captureAnswers(started.id, {
      actor: "public",
      answers: {
        audience: "operators",
        firstWin: "see status with a blocker reason",
        constraints: "keep it readable",
        signals: "jobs move but the reason is hidden"
      }
    });

    const initiated = await workflowService.approveRun(withBrief.id, {
      actor: "operator",
      gate: "brief",
      decision: "approved"
    });

    const jobId = initiated.jobs[0].id;
    const updatedJob = await workItemStore.setStage(jobId, "BUILD", {
      actor: "henry",
      reason: "Routing completed",
      dataPatch: {
        blockerReason: "Waiting on the final logo asset"
      }
    });

    expect(updatedJob.jobStatus).toBe("blocked");
    expect(updatedJob.history.some((entry) => entry.type === "stage_changed" || entry.type === "status_updated")).toBe(
      true
    );

    const refreshed = await workflowService.getRun(initiated.id);
    const job = refreshed.jobs.find((item) => item.id === jobId);

    expect(job.status).toBe("blocked");
    expect(job.blockerReason).toContain("logo asset");
    expect(job.timeline.some((entry) => entry.eventType === "stage_changed" || entry.eventType === "status_updated")).toBe(
      true
    );
  });
});
