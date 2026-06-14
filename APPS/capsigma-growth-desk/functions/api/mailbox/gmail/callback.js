import { addActivity, getDb, nowIso } from '../../../_lib/db.js'
import { exchangeGmailCode, getGmailProfile, saveGmailConnection } from '../../../_lib/gmail.js'

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function onRequestGet({ request, env }) {
  const db = getDb(env)
  if (!db) return html('<h1>CapSigma mailbox connection failed</h1><p>D1 is not configured.</p>', 500)

  const url = new URL(request.url)
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  const error = url.searchParams.get('error') || ''

  if (error) {
    return html(`<h1>CapSigma mailbox connection cancelled</h1><p>${error}</p><p><a href="/">Return to Growth Desk</a></p>`, 400)
  }
  if (!code || !state) {
    return html('<h1>CapSigma mailbox connection failed</h1><p>Missing OAuth code or state.</p>', 400)
  }

  const stateRow = await db
    .prepare("SELECT * FROM oauth_states WHERE id = ? AND provider = 'gmail' AND used_at = '' LIMIT 1")
    .bind(state)
    .first()
  if (!stateRow) {
    return html('<h1>CapSigma mailbox connection failed</h1><p>OAuth state is invalid or already used.</p>', 400)
  }

  try {
    const token = await exchangeGmailCode({ request, env, code })
    const profile = await getGmailProfile(token.access_token)
    if (!token.refresh_token) {
      return html('<h1>CapSigma mailbox connection failed</h1><p>Google did not return a refresh token. Start the connection again and approve offline access.</p>', 400)
    }

    const connection = await saveGmailConnection(db, env, {
      email: profile.emailAddress,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      scope: token.scope,
      historyId: profile.historyId,
    })
    const now = nowIso()
    await db.prepare('UPDATE oauth_states SET used_at = ? WHERE id = ?').bind(now, state).run()
    await addActivity(db, {
      type: 'mailbox_connected',
      label: `Gmail connected for ${profile.emailAddress}`,
      metadata: { connectionId: connection.id, provider: 'gmail' },
    })

    return html(`<h1>Gmail connected</h1><p>${profile.emailAddress} is connected to CapSigma Growth Desk reply monitoring.</p><p><a href="/">Return to Growth Desk</a></p>`)
  } catch (err) {
    return html(`<h1>CapSigma mailbox connection failed</h1><pre>${String(err.message || err)}</pre><p><a href="/">Return to Growth Desk</a></p>`, 500)
  }
}
