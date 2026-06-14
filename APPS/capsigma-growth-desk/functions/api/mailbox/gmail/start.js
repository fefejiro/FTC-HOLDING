import { requireAuth } from '../../../_lib/auth.js'
import { getDb, newId, nowIso } from '../../../_lib/db.js'
import { gmailAuthUrl, gmailConfigured, gmailRedirectUri } from '../../../_lib/gmail.js'
import { json, methodNotAllowed } from '../../../_lib/json.js'

export async function onRequest(context) {
  const { request, env } = context
  if (!['GET', 'POST'].includes(request.method)) return methodNotAllowed()

  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })
  if (!gmailConfigured(env)) {
    return json(
      { error: 'Gmail OAuth is not configured', required: ['GMAIL_CLIENT_ID or GOOGLE_CLIENT_ID', 'GMAIL_CLIENT_SECRET or GOOGLE_CLIENT_SECRET', 'TOKEN_ENCRYPTION_KEY'] },
      { status: 500 },
    )
  }

  const url = new URL(request.url)
  const state = newId('oauth_state')
  const createdAt = nowIso()
  await db
    .prepare('INSERT INTO oauth_states (id, provider, redirect_to, created_at) VALUES (?, ?, ?, ?)')
    .bind(state, 'gmail', '/', createdAt)
    .run()

  const authUrl = gmailAuthUrl({ request, env, state })
  if (url.searchParams.get('redirect') === '1') {
    return Response.redirect(authUrl, 302)
  }

  return json({ authUrl, redirectUri: gmailRedirectUri(request, env), state })
}
