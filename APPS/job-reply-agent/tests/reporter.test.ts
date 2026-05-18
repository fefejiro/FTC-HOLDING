import { describe, expect, it } from "vitest";
import { getDb } from "../src/db.js";
import { buildDailyReport, renderDailyReport } from "../src/reporter.js";
import { seedSampleData } from "../src/seed.js";

describe("daily report", () => {
  it("renders expected subject and key body sections", () => {
    const db = getDb(":memory:");

    seedSampleData(db, "2026-05-11");
    const report = buildDailyReport(db, new Date("2026-05-11T18:00:00.000Z"));
    const rendered = renderDailyReport(report);

    expect(rendered.subject).toContain("Job Agent:");
    expect(rendered.subject).toContain("2026-05-11");
    expect(rendered.body).toContain("Job Reply Agent - 2026-05-11");
    expect(rendered.body).toContain("AT A GLANCE");
    expect(rendered.body).toContain("TOP OPPORTUNITIES");
    expect(rendered.body).toContain("BLOCKED / RISK");
    expect(rendered.body).toContain("NEXT ACTIONS");
    expect(rendered.body).toContain("Technical Program Manager II");
  });
});
