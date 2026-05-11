import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { buildDailyReport, renderDailyReport } from "../src/reporter.js";
import { seedSampleData } from "../src/seed.js";

describe("daily report", () => {
  it("renders expected subject and key body sections", () => {
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL UNIQUE,
        thread_id TEXT,
        role_title TEXT NOT NULL,
        location TEXT NOT NULL,
        match_score INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL UNIQUE,
        thread_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        resume_path TEXT NOT NULL,
        approved INTEGER NOT NULL DEFAULT 0,
        sent INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    seedSampleData(db, "2026-05-11");
    const report = buildDailyReport(db, new Date("2026-05-11T18:00:00.000Z"));
    const rendered = renderDailyReport(report);

    expect(rendered.subject).toBe("Job Reply Agent Daily Report - 2026-05-11");
    expect(rendered.body).toContain("Job Reply Agent Daily Report");
    expect(rendered.body).toContain("Top Opportunities:");
    expect(rendered.body).toContain("Blocked / Risk Items:");
    expect(rendered.body).toContain("Suggested Tomorrow Actions:");
    expect(rendered.body).toContain("Technical Program Manager II - Remote - 82% match - Drafted");
  });
});
