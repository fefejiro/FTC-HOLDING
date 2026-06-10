import fs from 'node:fs'
import path from 'node:path'

const baseUrl = process.env.CAPSIGMA_BASE_URL || 'https://capsigma-growth-desk.pages.dev'
const handoffPath = path.join(process.cwd(), '.local', 'capsigma-secrets-handoff.txt')

function readHandoffPassword() {
  if (process.env.CAPSIGMA_ADMIN_PASSWORD) return process.env.CAPSIGMA_ADMIN_PASSWORD
  if (!fs.existsSync(handoffPath)) return ''
  const text = fs.readFileSync(handoffPath, 'utf8')
  const match = text.match(/^ADMIN_PASSWORD=(.+)$/m)
  return match ? match[1].trim() : ''
}

function cookieFrom(response) {
  const cookie = response.headers.get('set-cookie') || ''
  return cookie.split(';')[0]
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
  return { response, data }
}

async function main() {
  const password = readHandoffPassword()
  if (!password) {
    throw new Error('Set CAPSIGMA_ADMIN_PASSWORD or keep .local/capsigma-secrets-handoff.txt available.')
  }

  const before = await request('/api/session')
  const loginResponse = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!loginResponse.ok) throw new Error(`Login failed: ${loginResponse.status}`)
  const cookie = cookieFrom(loginResponse)
  const after = await request('/api/session', {}, cookie)

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const leadEmail = `fejiro.efiuvwere+capsigma-smoke-${Date.now()}@gmail.com`
  const leadPayload = {
    leads: [
      {
        company: `CapSigma Internal Smoke ${stamp}`,
        industry: 'Technology and SaaS',
        fitScore: 91,
        reason: 'Internal QA lead to verify import, AI draft, approval gate, and proof logging.',
        contactName: 'Fejiro QA',
        contactTitle: 'Internal QA Owner',
        email: leadEmail,
        sourceUrl: baseUrl,
        source: 'production smoke test',
      },
    ],
  }

  const imported = await request('/api/leads', {
    method: 'POST',
    body: JSON.stringify(leadPayload),
  }, cookie)
  const leadId = imported.data.imported[0].id

  const draft = await request('/api/draft', {
    method: 'POST',
    body: JSON.stringify({ leadId, notes: 'Internal smoke test. Keep the tone short and safe.' }),
  }, cookie)

  const approved = await request(`/api/leads/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'approved',
      draftSubject: draft.data.draftSubject,
      draftBody: draft.data.draftBody,
    }),
  }, cookie)

  const sent = await request('/api/send-email', {
    method: 'POST',
    body: JSON.stringify({ leadId }),
  }, cookie)

  const activity = await request('/api/activity', {}, cookie)
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    sessionBeforeAuth: before.data.authenticated,
    sessionAfterAuth: after.data.authenticated,
    configured: after.data.configured,
    importedLeadId: leadId,
    importedCount: imported.data.imported.length,
    rejectedCount: imported.data.rejected.length,
    draftCreated: Boolean(draft.data.draftId),
    draftId: draft.data.draftId,
    approved: Boolean(approved.data.ok),
    sendStatus: sent.data.status,
    preview: sent.data.preview,
    sendId: sent.data.sendId,
    activityCount: activity.data.activity.length,
    latestActivity: activity.data.activity.slice(0, 5),
  }

  const outDir = path.join(process.cwd(), 'ops')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `PRODUCTION-SMOKE-${stamp}.json`)
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ outPath, ...report }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
