import { describe, expect, it } from "vitest";
import { parseCommandArgs } from "../src/main.js";

describe("CLI argument parsing", () => {
  it("supports documented separate --file value form", () => {
    const parsed = parseCommandArgs(["node", "main.js", "hunt:ingest", "--file", "./data/manual_job.txt"]);

    expect(parsed.command).toBe("hunt:ingest");
    expect(parsed.fileArg).toBe("./data/manual_job.txt");
  });

  it("keeps existing --file=value form working", () => {
    const parsed = parseCommandArgs(["node", "main.js", "hunt:ingest", "--file=./data/manual_job.txt"]);

    expect(parsed.command).toBe("hunt:ingest");
    expect(parsed.fileArg).toBe("./data/manual_job.txt");
  });
});
