import { requireAuth } from '../_lib/auth.js'
import { addActivity, getDb, nowIso } from '../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../_lib/json.js'
import { normalizeLead, validateLead } from '../_lib/validation.js'

function mapLead(row) {
  return {
    id: row.id,
    company: row.company,
    industry: row.industry,
    fitScore: row.fit_score,
    reason: row.reason,
    contactName: row.contact_name,
    contactTitle: row.contact_title,
    email: row.email,
    sourceUrl: row.source_url,
    source: row.source,
    serviceLane: row.service_lane,
    researchSummary: row.research_summary,
    evidenceJson: row.evidence_json,
    reviewStatus: row.review_status,
    discoveryRunId: row.discovery_run_id,
    status: row.status,
    draftSubject: row.draft_subject,
    draftBody: row.draft_body,
    emailsDrafted: row.emails_drafted,
    emailsSent: row.emails_sent,
    lastDraftedAt: row.last_drafted_at,
    lastSentAt: row.last_sent_at,
    lastReplyAt: row.last_reply_at,
    replyType: row.reply_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  if (request.method === 'GET') {
    const { results } = await db
      .prepare('SELECT * FROM leads ORDER BY updated_at DESC, created_at DESC')
      .all()
    return json({ leads: (results || []).map(mapLead) })
  }

  if (request.method !== 'POST') return methodNotAllowed()

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  const inputLeads = Array.isArray(body.leads) ? body.leads : [body]
  const imported = []
  const rejected = []
  const now = nowIso()

  for (const input of inputLeads) {
    const lead = normalizeLead(input)
    const errors = validateLead(lead)
    if (errors.length) {
      rejected.push({ input, errors })
      continue
    }

    await db
      .prepare(
        `INSERT INTO leads (
          id, company, industry, fit_score, reason, contact_name, contact_title,
          email, source_url, source, service_lane, research_summary, evidence_json,
          review_status, discovery_run_id, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          company = excluded.company,
          industry = excluded.industry,
          fit_score = excluded.fit_score,
          reason = excluded.reason,
          contact_name = excluded.contact_name,
          contact_title = excluded.contact_title,
          email = excluded.email,
          source_url = excluded.source_url,
          source = excluded.source,
          service_lane = excluded.service_lane,
          research_summary = excluded.research_summary,
          evidence_json = excluded.evidence_json,
          review_status = excluded.review_status,
          discovery_run_id = excluded.discovery_run_id,
          updated_at = excluded.updated_at`,
      )
      .bind(
        lead.id,
        lead.company,
        lead.industry,
        lead.fit_score,
        lead.reason,
        lead.contact_name,
        lead.contact_title,
        lead.email,
        lead.source_url,
        lead.source,
        lead.service_lane,
        lead.research_summary,
        lead.evidence_json,
        lead.review_status,
        lead.discovery_run_id,
        lead.status,
        now,
        now,
      )
      .run()

    imported.push(lead)
  }

  if (imported.length) {
    await addActivity(db, {
      type: 'lead_import',
      label: `Imported ${imported.length} lead${imported.length === 1 ? '' : 's'}`,
      metadata: { rejected: rejected.length },
    })
  }

  return json({ imported, rejected }, { status: rejected.length ? 207 : 200 })
}
