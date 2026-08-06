import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(".");
const runner = fs.readFileSync(path.join(root, "scripts", "continuous-agent-run.ps1"), "utf8");
const registrar = fs.readFileSync(path.join(root, "scripts", "register-continuous-agent-task.ps1"), "utf8");
const backlog = fs.readFileSync(path.join(root, "ops", "CONTINUOUS_AGENT_BACKLOG.md"), "utf8");

describe("continuous product-agent scheduler", () => {
  it("uses bounded, non-overlapping, authenticated Codex runs", () => {
    expect(runner).toContain("MaxRunsPerDay = 2");
    expect(runner).toContain("MaxMinutes = 45");
    expect(runner).toContain("continuous-agent.lock");
    expect(runner).toContain("codex.Source login status");
    expect(runner).toContain('"--sandbox", "workspace-write"');
    expect(runner).toContain('"--ask-for-approval", "never"');
    expect(runner).not.toContain("dangerously-bypass-approvals-and-sandbox");
    expect(registrar).toContain("MultipleInstances IgnoreNew");
    expect(registrar).toContain("ExecutionTimeLimit");
  });

  it("requires an isolated clean branch and exactly one backlog item", () => {
    expect(runner).toContain('agent/job-agent-continuous*');
    expect(runner).toContain("status --porcelain");
    expect(runner).toContain("Select exactly one highest-priority unchecked item");
    expect(runner).toContain("Do not push.");
    expect(backlog.replace(/\s+/g, " ")).toContain(
      "Each scheduled run may complete at most one unchecked item",
    );
  });

  it("keeps live and sensitive operations outside unattended authority", () => {
    for (const boundary of [
      "do not send or draft live email",
      "do not browse or submit job applications",
      "do not deploy",
      "do not modify production, DNS, OAuth, secrets, tokens, billing, legal terms",
      "Do not weaken identity, proof, CAPTCHA, tenant isolation, approval, or privacy controls",
    ]) {
      expect(runner).toContain(boundary);
    }
    expect(backlog).toContain("Manual Or Live Gates");
  });
});
