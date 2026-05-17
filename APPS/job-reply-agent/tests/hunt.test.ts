import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { initHuntSchema, recordAudit } from "../src/hunt/db.js";
import {
  upsertJob,
  setJobScore,
  getJobsByStatus,
  countByStatus,
  countBySource
} from "../src/hunt/job_store.js";
import { jobSchema } from "../src/hunt/types.js";

function makeDb() {
  const db = new Database(":memory:");
  initHuntSchema(db);
  return db;
}

describe("hunt foundation", () => {
  it("initializes additive hunt_* schema without errors", () => {
    const db = makeDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'hunt_%'")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        "hunt_applications",
        "hunt_audit_log",
        "hunt_contacts",
        "hunt_documents",
        "hunt_interview_packets",
        "hunt_jobs",
        "hunt_source_performance"
      ].sort()
    );
  });

  it("upserts a job idempotently on (source, source_id)", () => {
    const db = makeDb();
    const r1 = upsertJob(db, {
      source: "greenhouse",
      source_id: "abc-1",
      title: "Technical Program Manager",
      company: "Acme",
      location: "Toronto",
      remote: true,
      url: "https://boards.greenhouse.io/acme/jobs/abc-1",
      description: "TPM role",
      compensation: null,
      posted_at: null
    });
    expect(r1.inserted).toBe(true);
    expect(r1.job.status).toBe("discovered");

    const r2 = upsertJob(db, {
      source: "greenhouse",
      source_id: "abc-1",
      title: "Technical Program Manager (Updated)",
      company: "Acme",
      location: "Toronto",
      remote: true,
      url: "https://boards.greenhouse.io/acme/jobs/abc-1",
      description: "TPM role v2",
      compensation: null,
      posted_at: null
    });
    expect(r2.inserted).toBe(false);
    expect(r2.job.id).toBe(r1.job.id);

    const counts = countBySource(db);
    expect(counts.greenhouse).toBe(1);
  });

  it("scores a job and surfaces it via getJobsByStatus", () => {
    const db = makeDb();
    const { job } = upsertJob(db, {
      source: "lever",
      source_id: "lev-1",
      title: "Senior PM",
      company: "Beta",
      location: "Remote",
      remote: true,
      url: "https://jobs.lever.co/beta/lev-1",
      description: "Senior PM role",
      compensation: null,
      posted_at: null
    });

    const breakdown = {
      title_match: 18,
      skills_match: 22,
      industry_match: 12,
      location_fit: 10,
      compensation_fit: 8,
      work_authorization_fit: 10,
      seniority_fit: 5,
      application_effort: 4,
      total: 89,
      matched_terms: ["program management", "stakeholders"],
      missing_terms: []
    };

    setJobScore(db, job.id!, "package_ready", 89, breakdown, []);

    const ready = getJobsByStatus(db, "package_ready");
    expect(ready.length).toBe(1);
    expect(ready[0].score).toBe(89);
    expect(ready[0].status).toBe("package_ready");

    const byStatus = countByStatus(db);
    expect(byStatus.package_ready).toBe(1);
  });

  it("records audit entries", () => {
    const db = makeDb();
    recordAudit(db, { actor: "test", action: "hunt:test", detail: { foo: "bar" } });
    const rows = db.prepare("SELECT actor, action FROM hunt_audit_log").all();
    expect(rows.length).toBe(1);
  });

  it("validates a Job via zod schema", () => {
    const parsed = jobSchema.safeParse({
      source: "ashby",
      source_id: "ash-1",
      title: "Director, Program Management",
      company: "Gamma",
      location: "Toronto, ON",
      remote: false,
      url: "https://jobs.ashbyhq.com/gamma/ash-1",
      description: "Director role",
      discovered_at: new Date().toISOString(),
      status: "discovered"
    });
    expect(parsed.success).toBe(true);
  });
});
