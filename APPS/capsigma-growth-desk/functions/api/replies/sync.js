import { requireAuth } from '../../_lib/auth.js'
import { getDb } from '../../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../../_lib/json.js'
import { findMatchingSend, insertReply } from '../../_lib/reply-store.js'

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
