import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { runHuntCommand } from "../src/hunt/cli.js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const TEST_DB = path.resolve(__dirname, "./test_hunt_package.db");
const TEST_TEMPLATE = path.resolve(__dirname, "../resumes/source/Fejiro_AI_Workflow.docx");
const OUTPUT_DIR = path.resolve(__dirname, "../resumes/");

function cleanup() {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
}

describe("hunt:package CLI integration", () => {
  let db: Database.Database;
  beforeAll(() => {
    cleanup();
    db = new Database(TEST_DB);
    // Minimal schema for test
    db.exec(`
      CREATE TABLE hunt_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT, source_id TEXT, url TEXT, company TEXT, title TEXT, location TEXT, remote INTEGER, description TEXT, compensation TEXT, posted_at TEXT, discovered_at TEXT, status TEXT, score INTEGER, score_breakdown_json TEXT, red_flags_json TEXT, reason TEXT
      );
      CREATE TABLE hunt_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER, state TEXT, submitted_at TEXT, submission_method TEXT, resume_path TEXT, cover_letter_path TEXT, notes TEXT, last_followup_at TEXT, next_followup_at TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE hunt_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER, kind TEXT, path TEXT, approved INTEGER, quality_flags_json TEXT, created_at TEXT
      );
      CREATE TABLE hunt_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT, actor TEXT, action TEXT, job_id INTEGER, application_id INTEGER, detail_json TEXT
      );
    `);
    // Insert a package_ready job and application
    db.prepare(`INSERT INTO hunt_jobs (id, source, source_id, url, company, title, location, remote, description, compensation, posted_at, discovered_at, status, score) VALUES (1, 'greenhouse', 'gh-123', 'https://example.com/job/123', 'OpenAI', 'AI Research Scientist', 'Remote', 1, 'We are looking for an AI Research Scientist.', null, null, ?, 'package_ready', 95)`)
      .run(new Date().toISOString());
    db.prepare(`INSERT INTO hunt_applications (job_id, state, created_at, updated_at) VALUES (1, 'draft', ?, ?)`)
      .run(new Date().toISOString(), new Date().toISOString());
  });

  afterAll(() => {
    db.close();
    cleanup();
  });

  it("should generate resume and cover letter, update DB, and log audit", async () => {
    process.env.RESUME_TEMPLATE_PATH = TEST_TEMPLATE;
    process.env.RESUME_OUTPUT_DIR = OUTPUT_DIR;
    await runHuntCommand({ command: "hunt:package", db });
    // Check documents
    const docs = db.prepare(`SELECT * FROM hunt_documents WHERE job_id = 1`).all();
    expect(docs.length).toBe(2);
    const kinds = docs.map(d => d.kind).sort();
    expect(kinds).toEqual(["cover_letter", "resume"]);
    // Check application updated
    const app = db.prepare(`SELECT * FROM hunt_applications WHERE job_id = 1`).get();
    expect(app.resume_path).toMatch(/\.docx$/);
    expect(app.cover_letter_path).toMatch(/_Cover_Letter\.docx$/);
    expect(app.state).toBe("package_ready");
    // Check audit log
    const audit = db.prepare(`SELECT * FROM hunt_audit_log WHERE action = 'hunt:package:complete'`).get();
    expect(audit).toBeTruthy();
  });
});
