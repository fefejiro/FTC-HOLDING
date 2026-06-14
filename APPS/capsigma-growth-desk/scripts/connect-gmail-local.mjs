import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const baseUrl = process.env.CAPSIGMA_BASE_URL || 'https://capsigma-growth-desk.pages.dev'
const scope = 'https://www.googleapis.com/auth/gmail.readonly'
const profileEmail = process.env.GMAIL_CONNECT_PROFILE_EMAIL || 'fejiro.efiuvwere@gmail.com'
const repoRoot = path.resolve(process.cwd(), '..', '..')
const jobAgentEnvPath = path.join(repoRoot, 'APPS', 'job-reply-agent', '.env')
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

function getSecret(name, fallbackFiles = []) {
  if (process.env[name]) return process.env[name]
  for (const file of fallbackFiles) {
    if (file[name]) return file[name]
  }
  return ''
}

function findChromeProfileDirectory(email) {
  if (process.env.CHROME_PROFILE_DIRECTORY) return process.env.CHROME_PROFILE_DIRECTORY
  const localStatePath = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data', 'Local State')
  if (!email || !fs.existsSync(localStatePath)) return ''
  try {
    const localState = JSON.parse(fs.readFileSync(localStatePath, 'utf8'))
    const profiles = localState?.profile?.info_cache || {}
    for (const [directory, profile] of Object.entries(profiles)) {
      if (String(profile?.user_name || '').toLowerCase() === email.toLowerCase()) return directory
    }
  } catch {
    return ''
  }
  return ''
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    const profileDirectory = findChromeProfileDirectory(profileEmail)
    if (fs.existsSync(chromePath) && profileDirectory) {
      spawn(chromePath, [`--profile-directory=${profileDirectory}`, url], {
        detached: true,
        stdio: 'ignore',
      }).unref()
    } else {
      spawn('powershell.exe', ['-NoProfile', '-Command', 'Start-Process', url], {
        detached: true,
        stdio: 'ignore',
      }).unref()
    }
    return
  }
  const opener = process.platform === 'darwin' ? 'open' : 'xdg-open'
  spawn(opener, [url], { detached: true, stdio: 'ignore' }).unref()
}

function cookieFrom(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0]
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

function waitForOAuthCode({ port, state, timeoutMs = 600_000 }) {
  return new Promise((resolve, reject) => {
    let server
    const timer = setTimeout(() => {
      server.close()
      reject(new Error('Timed out waiting for Google OAuth callback.'))
    }, timeoutMs)

    server = createServer((request, response) => {
      const url = new URL(request.url || '/', `http://127.0.0.1:${port}`)
      const error = url.searchParams.get('error')
      const code = url.searchParams.get('code')
      const returnedState = url.searchParams.get('state')

      if (error) {
        response.writeHead(400, { 'Content-Type': 'text/html' })
        response.end(`<h1>Gmail connection failed</h1><p>${error}</p>`)
        clearTimeout(timer)
        server.close()
        reject(new Error(`Google OAuth failed: ${error}`))
        return
      }

      if (!code || returnedState !== state) {
        response.writeHead(400, { 'Content-Type': 'text/html' })
        response.end('<h1>Gmail connection failed</h1><p>Missing code or invalid state.</p>')
        return
      }

      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end('<h1>Gmail connected</h1><p>You can close this tab and return to Codex.</p>')
      clearTimeout(timer)
      server.close()
      resolve(code)
    })

    server.listen(port, '127.0.0.1')
  })
}

async function exchangeCode({ clientId, clientSecret, redirectUri, code }) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code,
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(`Google token exchange failed ${response.status}: ${JSON.stringify(data)}`)
  }
  if (!data.refresh_token) {
    throw new Error('Google did not return a refresh token. Revoke the app grant or force prompt=consent and try again.')
  }
  return data
}

async function main() {
  const jobEnv = readKeyValueFile(jobAgentEnvPath)
  const handoffEnv = readKeyValueFile(handoffPath)
  const clientId = getSecret('GMAIL_CLIENT_ID', [jobEnv]) || getSecret('GOOGLE_CLIENT_ID', [jobEnv])
  const clientSecret = getSecret('GMAIL_CLIENT_SECRET', [jobEnv]) || getSecret('GOOGLE_CLIENT_SECRET', [jobEnv])
  const redirectUri = getSecret('GMAIL_REDIRECT_URI', [jobEnv]) || 'http://127.0.0.1:3007'
  const adminPassword = getSecret('CAPSIGMA_ADMIN_PASSWORD', [handoffEnv]) || getSecret('ADMIN_PASSWORD', [handoffEnv])

  if (!clientId || !clientSecret) throw new Error('Missing GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET.')
  if (!adminPassword) throw new Error('Missing CAPSIGMA_ADMIN_PASSWORD or .local/capsigma-secrets-handoff.txt.')

  const redirect = new URL(redirectUri)
  const port = Number.parseInt(redirect.port || '80', 10)
  const state = randomUUID()
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scope)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('state', state)

  const codePromise = waitForOAuthCode({ port, state })
  fs.mkdirSync(path.join(process.cwd(), '.local'), { recursive: true })
  fs.writeFileSync(path.join(process.cwd(), '.local', 'gmail-local-auth-url.txt'), authUrl.toString())
  openBrowser(authUrl.toString())
  console.log(`Opened Google OAuth in browser for ${profileEmail}. Waiting on ${redirectUri}`)

  const code = await codePromise
  const token = await exchangeCode({ clientId, clientSecret, redirectUri, code })

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
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresIn: token.expires_in,
      scope: token.scope || scope,
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
