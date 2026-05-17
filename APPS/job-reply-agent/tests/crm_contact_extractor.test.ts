import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { upsertContact, linkContactToJob, getContactDetail } from "../src/crm/contact_extractor";

describe("CRM contact extraction and dedupe", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = new Database(":memory:");
    // Minimal schema for crm_contacts
    db.exec(`CREATE TABLE crm_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      linkedin TEXT,
      company TEXT,
      role TEXT,
      dedupe_key TEXT,
      created_from TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`);
    db.exec(`CREATE UNIQUE INDEX idx_crm_contacts_email ON crm_contacts (email);`);
    db.exec(`CREATE UNIQUE INDEX idx_crm_contacts_linkedin ON crm_contacts (linkedin);`);
    db.exec(`CREATE INDEX idx_crm_contacts_dedupe_key ON crm_contacts (dedupe_key);`);

    // Add crm_contact_touchpoints table for linking contacts to jobs
    db.exec(`CREATE TABLE crm_contact_touchpoints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER,
      job_id INTEGER,
      type TEXT,
      channel TEXT,
      summary TEXT,
      occurred_at TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );`);

    // Add hunt_applications table for getContactDetail queries
    db.exec(`CREATE TABLE hunt_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      state TEXT,
      created_at TEXT,
      updated_at TEXT
    );`);

    // Add crm_followup_tasks table for getContactDetail queries
    db.exec(`CREATE TABLE crm_followup_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER,
      job_id INTEGER,
      outreach_draft_id INTEGER,
      due_at TEXT,
      status TEXT,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );`);
  });

  it("creates a new contact by email", () => {
    const id = upsertContact(db, { name: "Jane Doe", email: "jane@acme.com", company: "Acme" });
    const row = db.prepare(`SELECT * FROM crm_contacts WHERE id = ?`).get(id);
    expect(row.email).toBe("jane@acme.com");
    expect(row.name).toBe("Jane Doe");
  });

  it("updates existing contact by email", () => {
    const id1 = upsertContact(db, { name: "Jane Doe", email: "jane@acme.com", company: "Acme" });
    const id2 = upsertContact(db, { name: "Jane D.", email: "jane@acme.com", company: "Acme" });
    expect(id1).toBe(id2);
    const row = db.prepare(`SELECT * FROM crm_contacts WHERE id = ?`).get(id2);
    expect(row.name).toBe("Jane D.");
  });

  it("updates existing contact by LinkedIn URL", () => {
    const id1 = upsertContact(db, { name: "John Smith", linkedin: "https://linkedin.com/in/johnsmith", company: "Beta" });
    const id2 = upsertContact(db, { name: "J. Smith", linkedin: "https://linkedin.com/in/johnsmith", company: "Beta" });
    expect(id1).toBe(id2);
    const row = db.prepare(`SELECT * FROM crm_contacts WHERE id = ?`).get(id2);
    expect(row.name).toBe("J. Smith");
  });

  it("merges by normalized name plus company", () => {
    const id1 = upsertContact(db, { name: "Alice Lee", company: "Gamma" });
    const id2 = upsertContact(db, { name: "alice lee", company: "Gamma" });
    expect(id1).toBe(id2);
  });

  it("does not create duplicate contacts for same recruiter", () => {
    const id1 = upsertContact(db, { name: "Sam Recruiter", email: "sam@recruiters.com", company: "Delta" });
    const id2 = upsertContact(db, { name: "Sam Recruiter", email: "sam@recruiters.com", company: "Delta" });
    expect(id1).toBe(id2);
    const count = db.prepare(`SELECT COUNT(*) as n FROM crm_contacts WHERE email = ?`).get("sam@recruiters.com").n;

    expect(count).toBe(1);
  });

  it("links recruiter contact to a job and does not duplicate on second job", () => {
    // Create recruiter
    const recruiterId = upsertContact(db, { name: "Recruiter", email: "rec@jobs.com", company: "Jobs Inc" });
    // Create two jobs
    db.exec(`CREATE TABLE hunt_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, company TEXT);`);
    db.prepare(`INSERT INTO hunt_jobs (id, title, company) VALUES (1, 'Engineer', 'Jobs Inc'), (2, 'Designer', 'Jobs Inc')`).run();
    // Link recruiter to both jobs
    const tp1 = linkContactToJob(db, recruiterId, 1);
    const tp2 = linkContactToJob(db, recruiterId, 2);
    expect(tp1).not.toBe(tp2);
    // Should not create duplicate contact
    const recruiterId2 = upsertContact(db, { name: "Recruiter", email: "rec@jobs.com", company: "Jobs Inc" });
    expect(recruiterId2).toBe(recruiterId);
    // Contact history shows both jobs
    const detail = getContactDetail(db, recruiterId);
    expect(detail.jobs.length).toBe(2);
    expect(detail.touchpoints.length).toBe(2);
  });

  it("contact detail includes linked applications, last touch, and next action", () => {
    // Setup recruiter, job, application, followup
    const recruiterId = upsertContact(db, { name: "Recruiter", email: "rec@jobs.com", company: "Jobs Inc" });
    db.exec(`CREATE TABLE hunt_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, company TEXT);`);
    db.prepare(`INSERT INTO hunt_jobs (id, title, company) VALUES (1, 'Engineer', 'Jobs Inc')`).run();
    db.prepare(`INSERT INTO hunt_applications (id, job_id, state, created_at, updated_at) VALUES (1, 1, 'submitted', '2024-01-01', '2024-01-01')`).run();
    linkContactToJob(db, recruiterId, 1);
    db.prepare(`INSERT INTO crm_followup_tasks (contact_id, job_id, outreach_draft_id, due_at, status, notes, created_at, updated_at) VALUES (?, 1, NULL, '2024-05-20', 'pending', '', '2024-05-01', '2024-05-01')`).run(recruiterId);
    const detail = getContactDetail(db, recruiterId);
    expect(detail.contact.email).toBe("rec@jobs.com");
    expect(detail.jobs.length).toBe(1);
    expect(detail.applications.length).toBe(1);
    expect(detail.lastTouch).toBeTruthy();
    expect(detail.nextAction).toBe("2024-05-20");
  });

});
