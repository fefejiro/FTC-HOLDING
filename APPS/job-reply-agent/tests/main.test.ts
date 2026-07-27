import { describe, expect, it } from "vitest";
import { parseCommandArgs } from "../src/main.js";

describe("CLI argument parsing", () => {
  it("supports documented separate --file value form", () => {
    const parsed = parseCommandArgs(["node", "main.js", "hunt:ingest", "--file", "./data/manual_job.txt"]);

    expect(parsed.command).toBe("hunt:ingest");
    expect(parsed.fileArg).toBe("./data/manual_job.txt");
  });

  it("parses the required instance selector", () => {
    const parsed = parseCommandArgs(["node", "main.js", "instance:status", "--instance=chukwuma"]);
    expect(parsed.instanceArg).toBe("chukwuma");
  });

  it("keeps existing --file=value form working", () => {
    const parsed = parseCommandArgs(["node", "main.js", "hunt:ingest", "--file=./data/manual_job.txt"]);

    expect(parsed.command).toBe("hunt:ingest");
    expect(parsed.fileArg).toBe("./data/manual_job.txt");
  });

  it("recognizes the follow-up command", () => {
    const parsed = parseCommandArgs(["node", "main.js", "hunt:followups"]);

    expect(parsed.command).toBe("hunt:followups");
  });

  it("recognizes apply assist and interview prep commands", () => {
    expect(parseCommandArgs(["node", "main.js", "hunt:apply-assist"]).command).toBe("hunt:apply-assist");
    expect(parseCommandArgs(["node", "main.js", "hunt:interview-prep"]).command).toBe("hunt:interview-prep");
  });

  it("recognizes the new automation commands", () => {
    expect(parseCommandArgs(["node", "main.js", "hunt:applications"]).command).toBe("hunt:applications");
    expect(parseCommandArgs(["node", "main.js", "hunt:auto-apply"]).command).toBe("hunt:auto-apply");
    expect(parseCommandArgs(["node", "main.js", "hunt:auto-email"]).command).toBe("hunt:auto-email");
    expect(parseCommandArgs(["node", "main.js", "hunt:auto-run"]).command).toBe("hunt:auto-run");
    expect(parseCommandArgs(["node", "main.js", "hunt:daily"]).command).toBe("hunt:daily");
  });
});
