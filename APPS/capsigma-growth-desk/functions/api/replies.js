import { requireAuth } from '../_lib/auth.js'
import { getDb } from '../_lib/db.js'
import { json, methodNotAllowed } from '../_lib/json.js'

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  if (request.method !== 'GET') return methodNotAllowed()

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const url = new URL(request.url)
  const attentionOnly = url.searchParams.get('attention') === '1'
  const { results } = await db
    .prepare(
      `SELECT
        r.*,
        l.company,
        l.contact_name,
        l.contact_title,
        l.source_url
      FROM replies r
      LEFT JOIN leads l ON l.id = r.lead_id
      WHERE (? = 0 OR r.needs_human = 1)
      ORDER BY r.created_at DESC
      LIMIT 50`,
    )
    .bind(attentionOnly ? 1 : 0)
    .all()

  return json({
    replies: (results || []).map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      sendEventId: row.send_event_id,
      provider: row.provider,
      messageId: row.message_id,
      threadId: row.thread_id,
      fromEmail: row.from_email,
      fromName: row.from_name,
      subject: row.subject,
      body: row.body,
      classification: row.classification,
      needsHuman: Boolean(row.needs_human),
      receivedAt: row.received_at,
      createdAt: row.created_at,
      company: row.company,
      contactName: row.contact_name,
      contactTitle: row.contact_title,
      sourceUrl: row.source_url,
    })),
  })
}
