import { requireAuth } from '../../_lib/auth.js'
import { addActivity, getDb, newId, nowIso } from '../../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../../_lib/json.js'

const HUMAN_CLASSIFICATIONS = new Set(['human', 'positive', 'positive_human', 'neutral_human', 'negative_human', 'unknown'])

export async function onRequest({ request, env, params }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth
  if (request.method !== 'PATCH') return methodNotAllowed()

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })
  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  const reply = await db.prepare('SELECT * FROM replies WHERE id = ?').bind(params.id).first()
  if (!reply) return json({ error: 'Reply not found' }, { status: 404 })

  const action = String(body.action || '').trim()
  const now = nowIso()
  let classification = reply.classification
  let needsHuman = reply.needs_human
  let status = 'completed'
  let notes = String(body.notes || '').trim()

  if (action === 'classify') {
    classification = String(body.classification || reply.classification || 'unknown')
    needsHuman = HUMAN_CLASSIFICATIONS.has(classification) ? 1 : 0
    await db.prepare('UPDATE replies SET classification = ?, needs_human = ? WHERE id = ?').bind(classification, needsHuman, params.id).run()
  } else if (action === 'handled') {
    needsHuman = 0
    await db.prepare('UPDATE replies SET needs_human = 0 WHERE id = ?').bind(params.id).run()
  } else if (action === 'archive') {
    needsHuman = 0
    status = 'archived'
    await db.prepare('UPDATE replies SET needs_human = 0 WHERE id = ?').bind(params.id).run()
  } else if (action === 'follow_up_draft') {
    status = 'draft_requested'
    notes = notes || 'Follow-up draft requested from reply workflow.'
  } else {
    return json({ error: 'Unsupported reply action' }, { status: 400 })
  }

  const actionId = newId('reply_action')
  await db
    .prepare(
      `INSERT INTO reply_actions (id, reply_id, lead_id, action_type, status, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(actionId, params.id, reply.lead_id || '', action, status, notes, 'operator', now)
    .run()

  await addActivity(db, {
    leadId: reply.lead_id || '',
    type: 'reply_action',
    label: `Reply ${action.replace(/_/g, ' ')}`,
    metadata: { replyId: params.id, actionId, classification, needsHuman: Boolean(needsHuman) },
  })

  return json({
    ok: true,
    actionId,
    reply: {
      id: params.id,
      classification,
      needsHuman: Boolean(needsHuman),
      lastAction: { action, status, notes, createdAt: now },
    },
    status,
  })
}
