import { requireAuth } from '../_lib/auth.js'
import { getDb } from '../_lib/db.js'
import { json, methodNotAllowed } from '../_lib/json.js'

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  if (request.method !== 'GET') return methodNotAllowed()

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const { results } = await db
    .prepare(
      `SELECT
        s.id,
        s.lead_id,
        s.to_email,
        s.subject,
        COALESCE(NULLIF(s.body, ''), l.draft_body, '') AS body,
        s.status,
        s.provider,
        s.provider_message_id,
        s.error,
        s.created_at,
        l.company,
        l.industry,
        l.fit_score,
        l.reason,
        l.contact_name,
        l.contact_title,
        l.source_url,
        l.source
      FROM send_events s
      LEFT JOIN leads l ON l.id = s.lead_id
      ORDER BY s.created_at DESC
      LIMIT 50`,
    )
    .all()

  return json({
    sends: (results || []).map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      toEmail: row.to_email,
      subject: row.subject,
      body: row.body,
      status: row.status,
      provider: row.provider,
      providerMessageId: row.provider_message_id,
      error: row.error,
      createdAt: row.created_at,
      company: row.company,
      industry: row.industry,
      fitScore: row.fit_score,
      reason: row.reason,
      contactName: row.contact_name,
      contactTitle: row.contact_title,
      sourceUrl: row.source_url,
      source: row.source,
    })),
  })
}
