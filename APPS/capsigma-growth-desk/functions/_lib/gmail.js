import { decryptSecret, encryptSecret } from './crypto.js'
import { nowIso } from './db.js'

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

function clientId(env) {
  return env.GOOGLE_CLIENT_ID || env.GMAIL_CLIENT_ID || ''
}

function clientSecret(env) {
  return env.GOOGLE_CLIENT_SECRET || env.GMAIL_CLIENT_SECRET || ''
}

export function gmailRedirectUri(request, env) {
  if (env.GMAIL_REDIRECT_URI) return env.GMAIL_REDIRECT_URI
  const url = new URL(request.url)
  return `${url.origin}/api/mailbox/gmail/callback`
}

export function gmailConfigured(env) {
  return Boolean(clientId(env) && clientSecret(env) && env.TOKEN_ENCRYPTION_KEY)
}

export function gmailAuthUrl({ request, env, state }) {
  const params = new URLSearchParams({
    client_id: clientId(env),
    redirect_uri: gmailRedirectUri(request, env),
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeGmailCode({ request, env, code }) {
  const body = new URLSearchParams({
    code,
    client_id: clientId(env),
    client_secret: clientSecret(env),
    redirect_uri: gmailRedirectUri(request, env),
    grant_type: 'authorization_code',
  })
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Gmail token exchange failed: ${response.status} ${JSON.stringify(data)}`)
  }
  return data
}

export async function refreshGmailToken(env, connection) {
  const refreshToken = await decryptSecret(connection.refresh_token_enc, env.TOKEN_ENCRYPTION_KEY)
  if (!refreshToken) throw new Error('Gmail refresh token is missing')
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId(env),
      client_secret: clientSecret(env),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Gmail token refresh failed: ${response.status} ${JSON.stringify(data)}`)
  }
  return data
}

export async function getGmailProfile(accessToken) {
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Gmail profile request failed: ${response.status} ${JSON.stringify(data)}`)
  }
  return data
}

export async function saveGmailConnection(db, env, { email, accessToken, refreshToken, expiresIn, scope, historyId }) {
  const now = nowIso()
  const expiresAt = new Date(Date.now() + Math.max(60, Number(expiresIn || 3600) - 60) * 1000).toISOString()
  const existing = await db
    .prepare('SELECT * FROM mailbox_connections WHERE provider = ? AND email = ? LIMIT 1')
    .bind('gmail', email)
    .first()
  const accessTokenEnc = await encryptSecret(accessToken, env.TOKEN_ENCRYPTION_KEY)
  const refreshTokenEnc = refreshToken
    ? await encryptSecret(refreshToken, env.TOKEN_ENCRYPTION_KEY)
    : existing?.refresh_token_enc || ''

  if (existing) {
    await db
      .prepare(
        `UPDATE mailbox_connections
         SET scope = ?, access_token_enc = ?, refresh_token_enc = ?, expires_at = ?,
             history_id = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(scope || existing.scope || GMAIL_SCOPE, accessTokenEnc, refreshTokenEnc, expiresAt, historyId || existing.history_id || '', now, existing.id)
      .run()
    return { ...existing, access_token_enc: accessTokenEnc, refresh_token_enc: refreshTokenEnc, expires_at: expiresAt, history_id: historyId || existing.history_id || '', updated_at: now }
  }

  const id = `mailbox_${crypto.randomUUID()}`
  await db
    .prepare(
      `INSERT INTO mailbox_connections (
        id, provider, email, scope, access_token_enc, refresh_token_enc, expires_at,
        last_sync_at, history_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, 'gmail', email, scope || GMAIL_SCOPE, accessTokenEnc, refreshTokenEnc, expiresAt, '', historyId || '', now, now)
    .run()
  return { id, provider: 'gmail', email, scope: scope || GMAIL_SCOPE, access_token_enc: accessTokenEnc, refresh_token_enc: refreshTokenEnc, expires_at: expiresAt, history_id: historyId || '', created_at: now, updated_at: now }
}

export async function getActiveGmailConnection(db) {
  return db
    .prepare("SELECT * FROM mailbox_connections WHERE provider = 'gmail' ORDER BY updated_at DESC LIMIT 1")
    .first()
}

export async function getValidGmailAccessToken(db, env, connection) {
  const expiresAt = connection.expires_at ? Date.parse(connection.expires_at) : 0
  if (expiresAt > Date.now() + 60_000) {
    return decryptSecret(connection.access_token_enc, env.TOKEN_ENCRYPTION_KEY)
  }
  const refreshed = await refreshGmailToken(env, connection)
  const updated = await saveGmailConnection(db, env, {
    email: connection.email,
    accessToken: refreshed.access_token,
    refreshToken: '',
    expiresIn: refreshed.expires_in,
    scope: refreshed.scope || connection.scope,
    historyId: connection.history_id,
  })
  return decryptSecret(updated.access_token_enc, env.TOKEN_ENCRYPTION_KEY)
}

export function headerValue(headers = [], name) {
  const match = headers.find((header) => String(header.name || '').toLowerCase() === name.toLowerCase())
  return match?.value || ''
}

export function parseEmailAddress(value = '') {
  const text = String(value || '').trim()
  const match = text.match(/^(.*)<([^>]+)>$/)
  if (!match) return { name: '', email: text.toLowerCase() }
  return {
    name: match[1].trim().replace(/^"+|"+$/g, '').trim(),
    email: match[2].trim().toLowerCase(),
  }
}

export function messageToReply(message) {
  const headers = message.payload?.headers || []
  const from = parseEmailAddress(headerValue(headers, 'From'))
  const date = headerValue(headers, 'Date')
  return {
    provider: 'gmail',
    messageId: message.id || '',
    threadId: message.threadId || '',
    fromEmail: from.email,
    fromName: from.name,
    subject: headerValue(headers, 'Subject'),
    body: message.snippet || '',
    receivedAt: date ? new Date(date).toISOString() : nowIso(),
  }
}

export async function listRecentGmailMessages(accessToken, query, maxResults = 10) {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  url.searchParams.set('q', query || 'in:inbox newer_than:14d')
  url.searchParams.set('maxResults', String(Math.max(1, Math.min(maxResults, 25))))
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Gmail message list failed: ${response.status} ${JSON.stringify(data)}`)
  }
  return data.messages || []
}

export async function getGmailMessage(accessToken, id) {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`)
  url.searchParams.set('format', 'metadata')
  url.searchParams.set('metadataHeaders', 'From')
  url.searchParams.append('metadataHeaders', 'Subject')
  url.searchParams.append('metadataHeaders', 'Date')
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Gmail message get failed: ${response.status} ${JSON.stringify(data)}`)
  }
  return data
}
