import { requireAuth } from '../_lib/auth.js'
import { addActivity, getDb, nowIso } from '../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../_lib/json.js'
import { isValidEmail } from '../_lib/validation.js'

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  if (request.method === 'GET') {
    const { results } = await db
      .prepare('SELECT * FROM suppressions ORDER BY created_at DESC')
      .all()
    return json({ suppressions: results || [] })
  }

  if (request.method !== 'POST') return methodNotAllowed()

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  const email = String(body.email || '').trim().toLowerCase()
  const reason = String(body.reason || 'manual suppression').trim()
  const leadId = String(body.leadId || '').trim()
  if (!isValidEmail(email)) {
    return json({ error: 'A valid email is required' }, { status: 400 })
  }

  const now = nowIso()
  await db
    .prepare(
      `INSERT INTO suppressions (email, reason, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET reason = excluded.reason`,
    )
    .bind(email, reason, now)
    .run()

  if (leadId) {
    await db
      .prepare(
        `UPDATE leads
         SET status = 'do_not_contact', updated_at = ?
         WHERE id = ?`,
      )
      .bind(now, leadId)
      .run()
  }

  await addActivity(db, {
    leadId,
    type: 'suppression_added',
    label: `Suppressed ${email}`,
    metadata: { reason },
  })

  return json({ ok: true, email, reason })
}
