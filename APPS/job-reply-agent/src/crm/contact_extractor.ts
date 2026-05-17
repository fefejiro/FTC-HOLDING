/**
 * Link a contact to a job (and optionally application) by creating a touchpoint.
 * Returns the touchpoint id.
 */
export function linkContactToJob(db: Database.Database, contactId: number, jobId: number, applicationId?: number, opts?: { type?: string; channel?: string; summary?: string; notes?: string; }): number {
  const type = opts?.type ?? "job_link";
  const channel = opts?.channel ?? null;
  const summary = opts?.summary ?? null;
  const notes = opts?.notes ?? null;
  const occurredAt = new Date().toISOString();
  const info = db.prepare(`INSERT INTO crm_contact_touchpoints (contact_id, job_id, type, channel, summary, occurred_at, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
    .run(contactId, jobId, type, channel, summary, occurredAt, notes);
  return info.lastInsertRowid as number;
}

/**
 * Get contact profile with linked jobs, applications, last touch, and next action.
 */
export function getContactDetail(db: Database.Database, contactId: number) {
  const contact = db.prepare(`SELECT * FROM crm_contacts WHERE id = ?`).get(contactId);
  const touchpoints = db.prepare(`SELECT * FROM crm_contact_touchpoints WHERE contact_id = ? ORDER BY occurred_at DESC`).all(contactId) as Array<{occurred_at:string}>;
  const jobs = db.prepare(`SELECT j.* FROM hunt_jobs j JOIN crm_contact_touchpoints t ON t.job_id = j.id WHERE t.contact_id = ?`).all(contactId);
  const applications = db.prepare(`SELECT a.* FROM hunt_applications a JOIN crm_contact_touchpoints t ON t.job_id = a.job_id WHERE t.contact_id = ?`).all(contactId);
  const lastTouch = touchpoints.length > 0 ? touchpoints[0].occurred_at : null;
  // Next action: look for a followup task
  const followup = db.prepare(`SELECT due_at FROM crm_followup_tasks WHERE contact_id = ? AND status = 'pending' ORDER BY due_at ASC LIMIT 1`).get(contactId) as {due_at?:string}|undefined;
  return {
    contact,
    jobs,
    applications,
    lastTouch,
    nextAction: followup?.due_at ?? null,
    touchpoints
  };
}
import type Database from "better-sqlite3";
import { normalizeName } from "../utils/normalize";

export interface ContactInput {
  name?: string;
  email?: string;
  linkedin?: string;
  company?: string;
  role?: string;
  created_from?: string;
}

/**
 * Extract or upsert a contact from any available fields, using dedupe priority:
 * 1. email
 * 2. LinkedIn URL
 * 3. normalized name + company
 * Returns the contact id.
 */
export function upsertContact(db: Database.Database, input: ContactInput): number {
  // 1. Try by email
  if (input.email) {
    const existing = db.prepare(`SELECT * FROM crm_contacts WHERE email = ?`).get(input.email) as {id:number}|undefined;
    if (existing) {
      db.prepare(`UPDATE crm_contacts SET name = COALESCE(?, name), linkedin = COALESCE(?, linkedin), company = COALESCE(?, company), role = COALESCE(?, role), updated_at = datetime('now') WHERE id = ?`)
        .run(input.name, input.linkedin, input.company, input.role, existing.id);
      return existing.id;
    }
  }
  // 2. Try by LinkedIn
  if (input.linkedin) {
    const existing = db.prepare(`SELECT * FROM crm_contacts WHERE linkedin = ?`).get(input.linkedin) as {id:number}|undefined;
    if (existing) {
      db.prepare(`UPDATE crm_contacts SET name = COALESCE(?, name), email = COALESCE(?, email), company = COALESCE(?, company), role = COALESCE(?, role), updated_at = datetime('now') WHERE id = ?`)
        .run(input.name, input.email, input.company, input.role, existing.id);
      return existing.id;
    }
  }
  // 3. Try by normalized name + company
  if (input.name && input.company) {
    const dedupeKey = normalizeName(input.name) + "::" + normalizeName(input.company);
    const existing = db.prepare(`SELECT * FROM crm_contacts WHERE dedupe_key = ?`).get(dedupeKey) as {id:number}|undefined;
    if (existing) {
      db.prepare(`UPDATE crm_contacts SET email = COALESCE(?, email), linkedin = COALESCE(?, linkedin), role = COALESCE(?, role), updated_at = datetime('now') WHERE id = ?`)
        .run(input.email, input.linkedin, input.role, existing.id);
      return existing.id;
    }
    // Insert new
    const info = db.prepare(`INSERT INTO crm_contacts (name, email, linkedin, company, role, dedupe_key, created_from, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`)
      .run(input.name, input.email, input.linkedin, input.company, input.role, dedupeKey, input.created_from ?? null);
    return info.lastInsertRowid as number;
  }
  // Fallback: insert with whatever is available
  const info = db.prepare(`INSERT INTO crm_contacts (name, email, linkedin, company, role, dedupe_key, created_from, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?, datetime('now'), datetime('now'))`)
    .run(input.name ?? null, input.email ?? null, input.linkedin ?? null, input.company ?? null, input.role ?? null, input.created_from ?? null);
  return info.lastInsertRowid as number;
}
