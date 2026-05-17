import type Database from "better-sqlite3";

/**
 * Job Hunt OS — additive schema. Coexists with existing
 * messages/opportunities/drafts tables. Safe to run repeatedly.
 */
export function initHuntSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS hunt_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      url TEXT NOT NULL,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT,
      remote INTEGER,
      description TEXT,
      compensation TEXT,
      posted_at TEXT,
      discovered_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'discovered',
      score INTEGER,
      score_breakdown_json TEXT,
      red_flags_json TEXT,
      reason TEXT,
      UNIQUE (source, source_id)
    );

    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_status ON hunt_jobs (status);
    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_score ON hunt_jobs (score DESC);
    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_discovered_at ON hunt_jobs (discovered_at DESC);

    CREATE TABLE IF NOT EXISTS hunt_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      state TEXT NOT NULL DEFAULT 'draft',
      submitted_at TEXT,
      submission_method TEXT,
      resume_path TEXT,
      cover_letter_path TEXT,
      notes TEXT,
      last_followup_at TEXT,
      next_followup_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES hunt_jobs (id)
    );

    CREATE INDEX IF NOT EXISTS idx_hunt_applications_job_id ON hunt_applications (job_id);
    CREATE INDEX IF NOT EXISTS idx_hunt_applications_state ON hunt_applications (state);


        -- CRM/Outreach schema additions (Phase 4)
        CREATE TABLE IF NOT EXISTS crm_contacts (
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
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts (email);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_linkedin ON crm_contacts (linkedin);
        CREATE INDEX IF NOT EXISTS idx_crm_contacts_dedupe_key ON crm_contacts (dedupe_key);

        CREATE TABLE IF NOT EXISTS crm_contact_touchpoints (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contact_id INTEGER NOT NULL,
          job_id INTEGER,
          type TEXT NOT NULL,
          channel TEXT,
          summary TEXT,
          occurred_at TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (contact_id) REFERENCES crm_contacts (id)
        );

        CREATE INDEX IF NOT EXISTS idx_crm_touchpoints_contact_id ON crm_contact_touchpoints (contact_id);
        CREATE INDEX IF NOT EXISTS idx_crm_touchpoints_job_id ON crm_contact_touchpoints (job_id);

        CREATE TABLE IF NOT EXISTS crm_outreach_drafts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contact_id INTEGER,
          job_id INTEGER,
          draft_type TEXT NOT NULL,
          content TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'draft',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (contact_id) REFERENCES crm_contacts (id)
        );

        CREATE INDEX IF NOT EXISTS idx_crm_outreach_contact_id ON crm_outreach_drafts (contact_id);
        CREATE INDEX IF NOT EXISTS idx_crm_outreach_job_id ON crm_outreach_drafts (job_id);

        CREATE TABLE IF NOT EXISTS crm_followup_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contact_id INTEGER,
          job_id INTEGER,
          outreach_draft_id INTEGER,
          due_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          notes TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (contact_id) REFERENCES crm_contacts (id),
          FOREIGN KEY (outreach_draft_id) REFERENCES crm_outreach_drafts (id)
        );

        CREATE INDEX IF NOT EXISTS idx_crm_followup_contact_id ON crm_followup_tasks (contact_id);
        CREATE INDEX IF NOT EXISTS idx_crm_followup_job_id ON crm_followup_tasks (job_id);
    CREATE TABLE IF NOT EXISTS hunt_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      path TEXT NOT NULL,
      approved INTEGER NOT NULL DEFAULT 0,
      quality_flags_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES hunt_jobs (id)
    );

    CREATE INDEX IF NOT EXISTS idx_hunt_documents_job_id ON hunt_documents (job_id);

    CREATE TABLE IF NOT EXISTS hunt_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER,
      company TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      linkedin TEXT,
      notes TEXT,
      last_touched_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_hunt_contacts_company ON hunt_contacts (company);

    CREATE TABLE IF NOT EXISTS hunt_interview_packets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      packet_json TEXT NOT NULL,
      path TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES hunt_jobs (id)
    );

    CREATE TABLE IF NOT EXISTS hunt_source_performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      jobs_discovered INTEGER NOT NULL DEFAULT 0,
      jobs_scored INTEGER NOT NULL DEFAULT 0,
      packages_generated INTEGER NOT NULL DEFAULT 0,
      applications_submitted INTEGER NOT NULL DEFAULT 0,
      responses INTEGER NOT NULL DEFAULT 0,
      interviews INTEGER NOT NULL DEFAULT 0,
      offers INTEGER NOT NULL DEFAULT 0,
      UNIQUE (source, period_start, period_end)
    );

    CREATE TABLE IF NOT EXISTS hunt_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      job_id INTEGER,
      application_id INTEGER,
      detail_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_hunt_audit_created_at ON hunt_audit_log (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_hunt_audit_job_id ON hunt_audit_log (job_id);
  `);
}

export function recordAudit(
  db: Database.Database,
  params: {
    actor: string;
    action: string;
    jobId?: number | null;
    applicationId?: number | null;
    detail?: Record<string, unknown>;
  }
): void {
  db.prepare(
    `INSERT INTO hunt_audit_log (created_at, actor, action, job_id, application_id, detail_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    new Date().toISOString(),
    params.actor,
    params.action,
    params.jobId ?? null,
    params.applicationId ?? null,
    params.detail ? JSON.stringify(params.detail) : null
  );
}
