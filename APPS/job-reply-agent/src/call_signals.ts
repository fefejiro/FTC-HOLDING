import type Database from "better-sqlite3";

export interface CallSignalInput {
  callerName?: string;
  phone?: string;
  company?: string;
  role?: string;
  sourcePlatform?: string;
  matchingJobId?: number | null;
  callNotes?: string;
  followUpDate?: string | null;
  confidenceScore?: number;
}

export interface CallSignalRow {
  id: number;
  caller_name: string;
  phone: string;
  company: string;
  role: string;
  source_platform: string;
  matching_job_id: number | null;
  call_notes: string;
  follow_up_date: string | null;
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export function logCallSignal(db: Database.Database, input: CallSignalInput): number {
  const now = new Date().toISOString();
  const confidence = Math.max(0, Math.min(100, Math.round(input.confidenceScore ?? 50)));
  const info = db
    .prepare(
      `INSERT INTO call_signals
       (caller_name, phone, company, role, source_platform, matching_job_id, call_notes, follow_up_date, confidence_score, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      clean(input.callerName),
      clean(input.phone),
      clean(input.company),
      clean(input.role),
      clean(input.sourcePlatform),
      input.matchingJobId ?? null,
      clean(input.callNotes),
      clean(input.followUpDate) || null,
      confidence,
      now,
      now
    );
  return Number(info.lastInsertRowid);
}

export function listCallSignals(db: Database.Database, limit = 20): CallSignalRow[] {
  return db
    .prepare(
      `SELECT id, caller_name, phone, company, role, source_platform, matching_job_id,
              call_notes, follow_up_date, confidence_score, created_at, updated_at
       FROM call_signals
       ORDER BY COALESCE(follow_up_date, created_at) DESC, id DESC
       LIMIT ?`
    )
    .all(Math.max(1, limit)) as CallSignalRow[];
}

function clean(value?: string | null): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}
