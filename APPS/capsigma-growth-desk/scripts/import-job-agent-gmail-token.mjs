import fs from 'node:fs'
import path from 'node:path'

const baseUrl = process.env.CAPSIGMA_BASE_URL || 'https://capsigma-growth-desk.pages.dev'
const repoRoot = path.resolve(process.cwd(), '..', '..')
const jobAgentEnvPath = path.join(repoRoot, 'APPS', 'job-reply-agent', '.env')
const jobAgentTokenPath = path.join(repoRoot, 'APPS', 'job-reply-agent', 'data', 'gmail_tokens.json')
const handoffPath = path.join(process.cwd(), '.local', 'capsigma-secrets-handoff.txt')

function readKeyValueFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const entries = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    entries[key.trim()] = rest.join('=').trim()
  }
  return entries
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${filePath}`)
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function getSecret(name, fallbackFiles = []) {
  if (process.env[name]) return process.env[name]
  for (const file of fallbackFiles) {
    if (file[name]) return file[name]
  }
  return ''
}

function cookieFrom(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0]
}

async function refreshGmailToken({ clientId, clientSecret, refreshToken }) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Google refresh failed ${response.status}: ${data.error || JSON.stringify(data)}`)
  }
  if (!data.access_token) throw new Error('Google refresh did not return an access token.')
  return data
}

async function request(pathname, options = {}, cookie = '') {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`${pathname} failed ${response.status}: ${data.error || JSON.stringify(data)}`)
  }
  return data
}

async function main() {
  const jobEnv = readKeyValueFile(jobAgentEnvPath)
  const handoffEnv = readKeyValueFile(handoffPath)
  const token = readJson(jobAgentTokenPath)

  const clientId = getSecret('GMAIL_CLIENT_ID', [jobEnv]) || getSecret('GOOGLE_CLIENT_ID', [jobEnv])
  const clientSecret = getSecret('GMAIL_CLIENT_SECRET', [jobEnv]) || getSecret('GOOGLE_CLIENT_SECRET', [jobEnv])
  const adminPassword = getSecret('CAPSIGMA_ADMIN_PASSWORD', [handoffEnv]) || getSecret('ADMIN_PASSWORD', [handoffEnv])
  const refreshToken = String(token.refresh_token || '').trim()

  if (!clientId || !clientSecret) throw new Error('Missing Gmail client id/secret.')
  if (!adminPassword) throw new Error('Missing CapSigma admin password.')
  if (!refreshToken) throw new Error('Job Reply Agent Gmail token file does not contain a refresh token.')

  const refreshed = await refreshGmailToken({ clientId, clientSecret, refreshToken })

  const login = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: adminPassword }),
  })
  if (!login.ok) throw new Error(`CapSigma login failed: ${login.status}`)
  const cookie = cookieFrom(login)

  const imported = await request('/api/mailbox/gmail/import-token', {
    method: 'POST',
    body: JSON.stringify({
      accessToken: refreshed.access_token,
      refreshToken,
      expiresIn: refreshed.expires_in,
      scope: refreshed.scope || token.scope || '',
    }),
  }, cookie)

  const status = await request('/api/mailbox/gmail/status', {}, cookie)
  console.log(JSON.stringify({
    connected: imported.connected,
    email: imported.email,
    productionConnected: status.connected,
    lastSyncAt: status.lastSyncAt,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
