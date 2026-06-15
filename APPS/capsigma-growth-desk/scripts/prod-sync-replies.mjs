import fs from 'node:fs'
import path from 'node:path'

const baseUrl = process.env.CAPSIGMA_BASE_URL || 'https://capsigma-growth-desk.pages.dev'
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
  if (!response.ok && response.status !== 207) {
    throw new Error(`${pathname} failed ${response.status}: ${data.error || JSON.stringify(data)}`)
  }
  return { status: response.status, data }
}

async function main() {
  const handoffEnv = readKeyValueFile(handoffPath)
  const adminPassword = getSecret('CAPSIGMA_ADMIN_PASSWORD', [handoffEnv]) || getSecret('ADMIN_PASSWORD', [handoffEnv])
  if (!adminPassword) throw new Error('Missing CapSigma admin password.')

  const login = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: adminPassword }),
  })
  if (!login.ok) throw new Error(`CapSigma login failed: ${login.status}`)
  const cookie = cookieFrom(login)

  const maxResults = Number.parseInt(process.env.GMAIL_SYNC_MAX_RESULTS || '10', 10)
  const query = process.env.GMAIL_REPLY_QUERY || ''
  const params = new URLSearchParams({ maxResults: String(maxResults) })
  if (query) params.set('q', query)

  const { status, data } = await request(`/api/mailbox/gmail/sync?${params}`, {
    method: 'POST',
  }, cookie)

  const reportDir = process.env.CAPSIGMA_SYNC_REPORT_DIR
    ? path.resolve(process.env.CAPSIGMA_SYNC_REPORT_DIR)
    : path.join(process.cwd(), 'ops')
  fs.mkdirSync(reportDir, { recursive: true })
  const reportPath = path.join(
    reportDir,
    `GMAIL-SYNC-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  fs.writeFileSync(reportPath, JSON.stringify({ status, baseUrl, ...data }, null, 2))

  console.log(JSON.stringify({
    status,
    email: data.email,
    query: data.query,
    checked: data.checked,
    imported: data.imported?.length || 0,
    duplicates: data.duplicates?.length || 0,
    rejected: data.rejected?.length || 0,
    syncedAt: data.syncedAt,
    reportPath,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
