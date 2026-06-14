import { requireAuth } from '../../_lib/auth.js'
import { addActivity, getDb, newId, nowIso } from '../../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../../_lib/json.js'
import { classifyReply } from '../../_lib/replies.js'

async function findMatchingSend(db, fromEmail) {
  if (!fromEmail) return null
  return db
    .prepare(
      `SELECT *
       FROM send_events
       WHERE LOWER(COALESCE(NULLIF(intended_recipient, ''), to_email)) = LOWER(?)
          OR LOWER(COALESCE(NULLIF(actual_recipient, ''), to_email)) = LOWER(?)
          OR LOWER(to_email) = LOWER(?)
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(fromEmail, fromEmail, fromEmail)
    .first()
}

async function insertReply(db, reply, match) {
  const createdAt = nowIso()
  const id = newId('reply')
  const classification = classifyReply(reply)

  await db
    .prepare(
      `INSERT INTO replies (
        id, lead_id, send_event_id, provider, message_id, thread_id, from_email,
        from_name, subject, body, classification, needs_human, received_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      match?.lead_id || '',
      match?.id || '',
      reply.provider || 'manual_sync',
      reply.messageId || '',
      reply.threadId || '',
      reply.fromEmail || '',
      reply.fromName || '',
      reply.subject || '',
      reply.body || '',
      classification.classification,
      classification.needsHuman ? 1 : 0,
      reply.receivedAt || createdAt,
      createdAt,
    )
    .run()

  if (match?.lead_id) {
    await db
      .prepare(
        `UPDATE leads
         SET status = ?, reply_type = ?, last_reply_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind('replied', classification.classification, reply.receivedAt || createdAt, createdAt, match.lead_id)
      .run()
  }

  await addActivity(db, {
    leadId: match?.lead_id || '',
    type: classification.needsHuman ? 'reply_needs_human' : 'reply_recorded',
    label: classification.needsHuman
      ? `Reply needs human attention from ${reply.fromEmail || 'unknown sender'}`
      : `Reply recorded from ${reply.fromEmail || 'unknown sender'}`,
    metadata: { replyId: id, classification: classification.classification, sendEventId: match?.id || '' },
  })

  return { id, classification: classification.classification, needsHuman: classification.needsHuman, match }
}

async function handleManualSync(db, body) {
  const inputReplies = Array.isArray(body.replies) ? body.replies : [body]
  const imported = []
  const rejected = []

  for (const input of inputReplies) {
    const fromEmail = String(input.fromEmail || input.from_email || '').trim().toLowerCase()
    const subject = String(input.subject || '').trim()
    const text = String(input.body || input.text || input.snippet || '').trim()
    if (!fromEmail || (!subject && !text)) {
      rejected.push({ input, errors: ['fromEmail and subject/body are required'] })
      continue
    }
    const reply = {
      provider: String(input.provider || 'manual_sync'),
      messageId: String(input.messageId || input.message_id || ''),
      threadId: String(input.threadId || input.thread_id || ''),
      fromEmail,
      fromName: String(input.fromName || input.from_name || ''),
      subject,
      body: text,
      receivedAt: String(input.receivedAt || input.received_at || ''),
    }
    const match = await findMatchingSend(db, fromEmail)
    imported.push(await insertReply(db, reply, match))
  }

  return { imported, rejected }
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') return methodNotAllowed()

  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  const result = await handleManualSync(db, body)
  return json(result, { status: result.rejected.length ? 207 : 200 })
}
