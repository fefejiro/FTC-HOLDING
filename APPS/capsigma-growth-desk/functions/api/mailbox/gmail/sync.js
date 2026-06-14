import { requireAuth } from '../../../_lib/auth.js'
import { getDb, nowIso } from '../../../_lib/db.js'
import {
  getActiveGmailConnection,
  getGmailMessage,
  getValidGmailAccessToken,
  listRecentGmailMessages,
  messageToReply,
} from '../../../_lib/gmail.js'
import { json, methodNotAllowed } from '../../../_lib/json.js'
import { findMatchingSend, insertReply } from '../../../_lib/reply-store.js'

async function requireAuthOrSyncToken(request, env) {
  const token = env.REPLY_SYNC_TOKEN || ''
  const headerToken = request.headers.get('X-Capsigma-Sync-Token') || ''
  if (token && headerToken && token === headerToken) return null
  return requireAuth(request, env)
}

export async function onRequest(context) {
  const { request, env } = context
  if (!['GET', 'POST'].includes(request.method)) return methodNotAllowed()

  const auth = await requireAuthOrSyncToken(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const connection = await getActiveGmailConnection(db)
  if (!connection) return json({ error: 'No Gmail mailbox is connected.' }, { status: 409 })

  const url = new URL(request.url)
  const maxResults = Number.parseInt(url.searchParams.get('maxResults') || env.GMAIL_SYNC_MAX_RESULTS || '10', 10)
  const query = url.searchParams.get('q') || env.GMAIL_REPLY_QUERY || 'in:inbox newer_than:14d'
  const accessToken = await getValidGmailAccessToken(db, env, connection)
  const refs = await listRecentGmailMessages(accessToken, query, maxResults)

  const imported = []
  const rejected = []
  const duplicates = []

  for (const ref of refs) {
    try {
      const message = await getGmailMessage(accessToken, ref.id)
      const reply = messageToReply(message)
      if (!reply.fromEmail || reply.fromEmail === connection.email.toLowerCase()) {
        rejected.push({ messageId: ref.id, errors: ['message has no external From address'] })
        continue
      }
      const match = await findMatchingSend(db, reply.fromEmail)
      const result = await insertReply(db, reply, match)
      if (result.duplicate) duplicates.push(result)
      else imported.push(result)
    } catch (err) {
      rejected.push({ messageId: ref.id, errors: [String(err.message || err)] })
    }
  }

  const syncedAt = nowIso()
  await db
    .prepare('UPDATE mailbox_connections SET last_sync_at = ?, updated_at = ? WHERE id = ?')
    .bind(syncedAt, syncedAt, connection.id)
    .run()

  return json({
    provider: 'gmail',
    email: connection.email,
    query,
    checked: refs.length,
    imported,
    duplicates,
    rejected,
    syncedAt,
  }, { status: rejected.length ? 207 : 200 })
}
