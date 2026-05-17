import type Database from "better-sqlite3";
import type { Job, JobStatus, RawJob, ScoreBreakdown } from "./types.js";

interface JobRow {
  id: number;
  source: string;
  source_id: string;
  url: string;
  company: string;
  title: string;
  location: string | null;
  remote: number | null;
  description: string | null;
  compensation: string | null;
  posted_at: string | null;
  discovered_at: string;
  status: string;
  score: number | null;
  score_breakdown_json: string | null;
  red_flags_json: string | null;
  reason: string | null;
}

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    source: row.source as Job["source"],
    source_id: row.source_id,
    url: row.url,
    company: row.company,
    title: row.title,
    location: row.location,
    remote: row.remote == null ? null : Boolean(row.remote),
    description: row.description,
    compensation: row.compensation,
    posted_at: row.posted_at,
    discovered_at: row.discovered_at,
    status: row.status as JobStatus,
    score: row.score,
    score_breakdown_json: row.score_breakdown_json,
    red_flags_json: row.red_flags_json,
    reason: row.reason
  };
}

export interface UpsertResult {
  job: Job;
  inserted: boolean;
}

export function upsertJob(db: Database.Database, raw: RawJob): UpsertResult {
  const existing = db
    .prepare(`SELECT * FROM hunt_jobs WHERE source = ? AND source_id = ?`)
    .get(raw.source, raw.source_id) as JobRow | undefined;

  if (existing) {
    db.prepare(
      `UPDATE hunt_jobs
       SET url = ?, company = ?, title = ?, location = ?, remote = ?,
           description = COALESCE(?, description),
           compensation = COALESCE(?, compensation),
           posted_at = COALESCE(?, posted_at)
       WHERE id = ?`
    ).run(
      raw.url,
      raw.company,
      raw.title,
      raw.location ?? null,
      raw.remote == null ? null : raw.remote ? 1 : 0,
      raw.description ?? null,
      raw.compensation ?? null,
      raw.posted_at ?? null,
      existing.id
    );
    const updated = db
      .prepare(`SELECT * FROM hunt_jobs WHERE id = ?`)
      .get(existing.id) as JobRow;
    return { job: rowToJob(updated), inserted: false };
  }

  const info = db
    .prepare(
      `INSERT INTO hunt_jobs (
        source, source_id, url, company, title, location, remote,
        description, compensation, posted_at, discovered_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'discovered')`
    )
    .run(
      raw.source,
      raw.source_id,
      raw.url,
      raw.company,
      raw.title,
      raw.location ?? null,
      raw.remote == null ? null : raw.remote ? 1 : 0,
      raw.description ?? null,
      raw.compensation ?? null,
      raw.posted_at ?? null,
      new Date().toISOString()
    );
  const created = db
    .prepare(`SELECT * FROM hunt_jobs WHERE id = ?`)
    .get(info.lastInsertRowid as number) as JobRow;
  return { job: rowToJob(created), inserted: true };
}

export function setJobScore(
  db: Database.Database,
  jobId: number,
  status: JobStatus,
  score: number,
  breakdown: ScoreBreakdown,
  redFlags: string[],
  reason?: string
): void {
  db.prepare(
    `UPDATE hunt_jobs
     SET status = ?, score = ?, score_breakdown_json = ?, red_flags_json = ?, reason = COALESCE(?, reason)
     WHERE id = ?`
  ).run(
    status,
    score,
    JSON.stringify(breakdown),
    JSON.stringify(redFlags),
    reason ?? null,
    jobId
  );
}

export function getJobsByStatus(
  db: Database.Database,
  status: JobStatus | JobStatus[],
  limit = 100
): Job[] {
  const statuses = Array.isArray(status) ? status : [status];
  const placeholders = statuses.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT * FROM hunt_jobs WHERE status IN (${placeholders})
       ORDER BY score DESC NULLS LAST, discovered_at DESC LIMIT ?`
    )
    .all(...statuses, limit) as JobRow[];
  return rows.map(rowToJob);
}

export function getJob(db: Database.Database, jobId: number): Job | null {
  const row = db
    .prepare(`SELECT * FROM hunt_jobs WHERE id = ?`)
    .get(jobId) as JobRow | undefined;
  return row ? rowToJob(row) : null;
}

export function countByStatus(db: Database.Database): Record<string, number> {
  const rows = db
    .prepare(`SELECT status, COUNT(*) AS n FROM hunt_jobs GROUP BY status`)
    .all() as Array<{ status: string; n: number }>;
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.status] = row.n;
  }
  return result;
}

export function countBySource(db: Database.Database): Record<string, number> {
  const rows = db
    .prepare(`SELECT source, COUNT(*) AS n FROM hunt_jobs GROUP BY source`)
    .all() as Array<{ source: string; n: number }>;
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.source] = row.n;
  }
  return result;
}
