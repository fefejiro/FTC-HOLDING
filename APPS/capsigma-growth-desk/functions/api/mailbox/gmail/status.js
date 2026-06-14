import { requireAuth } from '../../../_lib/auth.js'
import { getDb } from '../../../_lib/db.js'
import { getActiveGmailConnection, gmailConfigured, gmailRedirectUri } from '../../../_lib/gmail.js'
import { json, methodNotAllowed } from '../../../_lib/json.js'

export async function onRequest({ request, env }) {
  if (request.method !== 'GET') return methodNotAllowed()

  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const connection = await getActiveGmailConnection(db)
  return json({
    configured: gmailConfigured(env),
    connected: Boolean(connection),
    provider: connection?.provider || 'gmail',
    email: connection?.email || '',
    lastSyncAt: connection?.last_sync_at || '',
    redirectUri: gmailRedirectUri(request, env),
  })
}
