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
    .prepare('SELECT * FROM activities ORDER BY created_at DESC LIMIT 50')
    .all()

  return json({
    activity: (results || []).map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      type: row.type,
      label: row.label,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
    })),
  })
}
