import { addActivity, newId, nowIso } from './db.js'
import { classifyReply } from './replies.js'

export async function findMatchingSend(db, fromEmail) {
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

export async function insertReply(db, reply, match) {
  const provider = reply.provider || 'manual_sync'
  const messageId = reply.messageId || ''
  if (messageId) {
    const existing = await db
      .prepare('SELECT id FROM replies WHERE provider = ? AND message_id = ? LIMIT 1')
      .bind(provider, messageId)
      .first()
    if (existing) return { id: existing.id, duplicate: true, classification: 'duplicate', needsHuman: false, match }
  }

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
      provider,
      messageId,
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
