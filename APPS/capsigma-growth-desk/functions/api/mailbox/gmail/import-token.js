import { requireAuth } from '../../../_lib/auth.js'
import { addActivity, getDb } from '../../../_lib/db.js'
import { getGmailProfile, saveGmailConnection } from '../../../_lib/gmail.js'
import { json, methodNotAllowed, readJson } from '../../../_lib/json.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method !== 'POST') return methodNotAllowed()

  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })
  if (!env.TOKEN_ENCRYPTION_KEY) {
    return json({ error: 'TOKEN_ENCRYPTION_KEY is not configured' }, { status: 500 })
  }

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  const accessToken = String(body.accessToken || body.access_token || '').trim()
  const refreshToken = String(body.refreshToken || body.refresh_token || '').trim()
  if (!accessToken || !refreshToken) {
    return json({ error: 'accessToken and refreshToken are required' }, { status: 400 })
  }

  const profile = await getGmailProfile(accessToken)
  const connection = await saveGmailConnection(db, env, {
    email: profile.emailAddress,
    accessToken,
    refreshToken,
    expiresIn: body.expiresIn || body.expires_in || 3600,
    scope: body.scope || 'https://www.googleapis.com/auth/gmail.readonly',
    historyId: profile.historyId,
  })

  await addActivity(db, {
    type: 'mailbox_connected',
    label: `Gmail connected for ${profile.emailAddress}`,
    metadata: { connectionId: connection.id, provider: 'gmail', method: 'local_loopback_import' },
  })

  return json({
    connected: true,
    provider: 'gmail',
    email: profile.emailAddress,
    connectionId: connection.id,
  })
}
