import type Database from "better-sqlite3";

export function initHuntSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS hunt_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      work_mode TEXT NOT NULL DEFAULT '',
      employment_type TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      apply_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      required_skills TEXT NOT NULL DEFAULT '[]',
      preferred_skills TEXT NOT NULL DEFAULT '[]',
      work_authorization_language TEXT NOT NULL DEFAULT '',
      salary_or_rate TEXT NOT NULL DEFAULT '',
      red_flags TEXT NOT NULL DEFAULT '[]',
      gmail_message_id TEXT NOT NULL DEFAULT '',
      gmail_thread_id TEXT NOT NULL DEFAULT '',
      recruiter_email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'discovered',
      needs_review INTEGER NOT NULL DEFAULT 0,
      score INTEGER,
      tier TEXT,
      tier_reason TEXT,
      next_action TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hunt_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL UNIQUE,
      resume_text TEXT NOT NULL,
      cover_letter_text TEXT NOT NULL,
      next_action TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hunt_outreach_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      draft_type TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'waiting',
      created_at TEXT NOT NULL,
      UNIQUE(job_id, draft_type)
    );

    CREATE TABLE IF NOT EXISTS hunt_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      company TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      last_job_id INTEGER,
      last_contacted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(email, company)
    );

    CREATE TABLE IF NOT EXISTS hunt_followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      contact_id INTEGER,
      followup_type TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      note TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(job_id, contact_id, followup_type)
    );

    CREATE TABLE IF NOT EXISTS hunt_apply_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL UNIQUE,
      apply_url TEXT NOT NULL,
      status TEXT NOT NULL,
      safe_fields_json TEXT NOT NULL,
      pause_fields_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hunt_interview_prep (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL UNIQUE,
      company_brief TEXT NOT NULL,
      role_fit_summary TEXT NOT NULL,
      likely_questions_json TEXT NOT NULL,
      star_stories_json TEXT NOT NULL,
      technical_talking_points_json TEXT NOT NULL,
      questions_for_interviewer_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS application_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_type TEXT NOT NULL,
      status TEXT NOT NULL,
      summary_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS application_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      job_id INTEGER NOT NULL UNIQUE,
      adapter TEXT NOT NULL,
      apply_url TEXT,
      status TEXT NOT NULL,
      required_fields_json TEXT NOT NULL,
      answered_fields_json TEXT NOT NULL,
      pause_reason TEXT,
      final_url TEXT,
      screenshot_path TEXT,
      resume_artifact_path TEXT,
      cover_letter_artifact_path TEXT,
      submitted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS application_submit_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER,
      job_id INTEGER,
      status TEXT NOT NULL,
      adapter TEXT,
      apply_url TEXT,
      final_url TEXT,
      reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_auto_response_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL UNIQUE,
      thread_id TEXT NOT NULL,
      sender TEXT,
      subject TEXT,
      status TEXT NOT NULL,
      score INTEGER,
      draft_id TEXT,
      sent_message_id TEXT,
      reason TEXT,
      body TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_status ON hunt_jobs (status);
    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_tier ON hunt_jobs (tier);
    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_source ON hunt_jobs (source);
    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_apply_url ON hunt_jobs (apply_url);
    CREATE INDEX IF NOT EXISTS idx_hunt_jobs_message_id ON hunt_jobs (gmail_message_id);
    CREATE INDEX IF NOT EXISTS idx_hunt_packages_job_id ON hunt_packages (job_id);
    CREATE INDEX IF NOT EXISTS idx_hunt_outreach_drafts_job_type ON hunt_outreach_drafts (job_id, draft_type);
    CREATE INDEX IF NOT EXISTS idx_hunt_contacts_updated_at ON hunt_contacts (updated_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_hunt_followups_status_due_at ON hunt_followups (status, due_at);
    CREATE INDEX IF NOT EXISTS idx_hunt_apply_sessions_status ON hunt_apply_sessions (status);
    CREATE INDEX IF NOT EXISTS idx_hunt_interview_prep_job_id ON hunt_interview_prep (job_id);
    CREATE INDEX IF NOT EXISTS idx_application_runs_created_at ON application_runs (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_application_attempts_run_id ON application_attempts (run_id);
    CREATE INDEX IF NOT EXISTS idx_application_submit_results_status ON application_submit_results (status);
    CREATE INDEX IF NOT EXISTS idx_email_auto_response_attempts_status ON email_auto_response_attempts (status);
  `);

  const attemptColumns = new Set(
    (db.prepare("PRAGMA table_info(application_attempts)").all() as Array<{ name: string }>).map((column) => column.name)
  );

  if (!attemptColumns.has("resume_artifact_path")) {
    db.exec("ALTER TABLE application_attempts ADD COLUMN resume_artifact_path TEXT");
  }

  if (!attemptColumns.has("cover_letter_artifact_path")) {
    db.exec("ALTER TABLE application_attempts ADD COLUMN cover_letter_artifact_path TEXT");
  }
}
