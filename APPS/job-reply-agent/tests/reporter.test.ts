import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { buildDailyReport, renderDailyReport } from "../src/reporter.js";
import { seedSampleData } from "../src/seed.js";

describe("daily report", () => {
  it("renders expected subject and key body sections", () => {
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL UNIQUE,
        thread_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        subject TEXT NOT NULL,
        received_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL UNIQUE,
        thread_id TEXT,
        company TEXT,
        role_title TEXT NOT NULL,
        location TEXT NOT NULL,
        employment_type TEXT,
        salary_or_rate TEXT,
        parser_confidence INTEGER,
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
        gmail_draft_id TEXT,
        recipient_email TEXT,
        approved INTEGER NOT NULL DEFAULT 0,
        sent INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

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
