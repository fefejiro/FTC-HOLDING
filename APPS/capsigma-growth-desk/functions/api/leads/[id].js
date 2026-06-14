import { requireAuth } from '../../_lib/auth.js'
import { addActivity, getDb, getLead, nowIso } from '../../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../../_lib/json.js'

const ALLOWED_STATUSES = new Set([
  'new',
  'qualified',
  'drafted',
  'approved',
  'needs_review',
  'preview_ready',
  'sent',
  'sandbox_sent',
  'live_sent',
  'replied',
  'not_fit',
  'do_not_contact',
])

async function handlePatch({ request, env, params }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  const current = await getLead(db, params.id)
  if (!current) return json({ error: 'Lead not found' }, { status: 404 })

  const status = body.status
    ? String(body.status)
    : body.replyType !== undefined
      ? 'replied'
      : current.status
  if (!ALLOWED_STATUSES.has(status)) {
    return json({ error: `Invalid status: ${status}` }, { status: 400 })
  }

  const draftSubject =
    body.draftSubject !== undefined ? String(body.draftSubject) : current.draft_subject
  const draftBody = body.draftBody !== undefined ? String(body.draftBody) : current.draft_body
  const replyType = body.replyType !== undefined ? String(body.replyType) : current.reply_type
  const lastReplyAt =
    body.replyType !== undefined ? nowIso() : current.last_reply_at
  const now = nowIso()

  await db
    .prepare(
      `UPDATE leads
       SET status = ?, draft_subject = ?, draft_body = ?, reply_type = ?, last_reply_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(status, draftSubject, draftBody, replyType, lastReplyAt, now, params.id)
    .run()

  await addActivity(db, {
    leadId: params.id,
    type: 'lead_update',
    label: `${current.company} updated to ${status}`,
    metadata: { status, replyType },
  })

  return json({ ok: true })
}

async function handleDelete({ request, env, params }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const current = await getLead(db, params.id)
  if (!current) return json({ error: 'Lead not found' }, { status: 404 })

  await db.prepare('DELETE FROM leads WHERE id = ?').bind(params.id).run()
  await addActivity(db, {
    leadId: params.id,
    type: 'lead_delete',
    label: `${current.company} removed from pipeline`,
  })
  return json({ ok: true })
}

export function onRequest(context) {
  if (context.request.method === 'PATCH') return handlePatch(context)
  if (context.request.method === 'DELETE') return handleDelete(context)
  return methodNotAllowed()
}
