import fs from 'node:fs'
import path from 'node:path'

const baseUrl = process.env.CAPSIGMA_BASE_URL || 'https://capsigma-growth-desk.pages.dev'
const handoffPath = path.join(process.cwd(), '.local', 'capsigma-secrets-handoff.txt')
const defaultQuery = 'Canadian healthcare records management back office operations public contact email'
const requestRetries = Number.parseInt(process.env.CAPSIGMA_E2E_RETRIES || '3', 10)

function readPassword() {
  if (process.env.CAPSIGMA_ADMIN_PASSWORD) return process.env.CAPSIGMA_ADMIN_PASSWORD
  if (!fs.existsSync(handoffPath)) return ''
  const text = fs.readFileSync(handoffPath, 'utf8')
  return text.match(/^ADMIN_PASSWORD=(.+)$/m)?.[1]?.trim() || ''
}

function cookieFrom(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0]
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, options = {}) {
  let lastError
  const attempts = Number.isFinite(requestRetries) && requestRetries > 0 ? requestRetries : 3

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options)
    } catch (error) {
      lastError = error
      if (attempt === attempts) throw error
      await sleep(1000 * attempt)
    }
  }

  throw lastError
}

async function request(pathname, options = {}, cookie = '') {
  const response = await fetchWithRetry(`${baseUrl}${pathname}`, {
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

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function healthcareContext(lead = {}) {
  const text = [
    lead.company,
    lead.industry,
    lead.reason,
    lead.contact_title,
    lead.service_lane,
    lead.research_summary,
    lead.source,
  ]
    .filter(Boolean)
    .join(' ')

  return /\b(health(care)?|medical|clinical|non[-\s]?clinical|patient|hospital|clinic|physician|pharma(ceutical)?|revenue cycle|insurance verification|hipaa)\b/i.test(text)
}

async function main() {
  const password = readPassword()
  if (!password) throw new Error('Missing admin password.')

  const login = await fetchWithRetry(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!login.ok) throw new Error(`Login failed: ${login.status}`)
  const cookie = cookieFrom(login)

  const session = (await request('/api/session', {}, cookie)).data
  assert(session.authenticated, 'Session did not authenticate.')
  assert(session.configured?.database, 'D1 database is not configured.')
  assert(session.configured?.openai, 'OpenAI is not configured.')
  assert(session.configured?.sendgrid, 'SendGrid is not configured.')
  assert(session.configured?.gmailConnected, 'Gmail reply monitor is not connected.')
  assert(session.configured?.sandboxMode, 'Sandbox recipient override is not active; refusing live E2E send.')

  const query = process.env.CAPSIGMA_E2E_QUERY || defaultQuery
  const prospect = await request('/api/prospect-runs', {
    method: 'POST',
    body: JSON.stringify({
      query,
      industries: ['healthcare', 'records management', 'back-office operations'],
      maxResults: 3,
    }),
  }, cookie)

  const imported = prospect.data.imported || []
  const selected = imported.find((lead) =>
    lead.email &&
    lead.source_url &&
    Number(lead.fit_score || 0) >= Number(session.configured.autoSendMinFitScore || 60)
  )
  assert(selected, `Prospect Builder did not return an eligible source-backed prospect. Imported=${imported.length}; rejected=${prospect.data.rejected?.length || 0}`)

  const draft = (await request('/api/draft', {
    method: 'POST',
    body: JSON.stringify({
      leadId: selected.id,
      notes: 'Production sandbox E2E. Keep direct, useful, and human. No placeholder text.',
    }),
  }, cookie)).data
  assert(draft.draftId, 'Draft was not created.')

  const sent = (await request('/api/send-email', {
    method: 'POST',
    body: JSON.stringify({ leadId: selected.id }),
  }, cookie)).data
  assert(sent.status === 'sandbox_sent', `Expected sandbox_sent, got ${sent.status}`)
  assert(sent.providerMessageId, 'SendGrid provider message id is missing.')
  assert(sent.intendedRecipient === selected.email, 'Intended recipient does not match selected prospect email.')
  assert(sent.actualRecipient === session.configured.recipientOverride, 'Actual recipient does not match sandbox override.')
  assert(sent.actualRecipient !== sent.intendedRecipient, 'Sandbox send should preserve a real intended recipient and route actual delivery to the override.')

  const sends = (await request('/api/sends', {}, cookie)).data.sends || []
  const proof = sends.find((entry) => entry.id === sent.sendId)
  assert(proof, 'Sent Review proof is missing.')
  assert(proof.providerMessageId, 'Sent Review provider id is missing.')
  assert(proof.sourceUrl || selected.source_url, 'Source/background link is missing.')
  assert(proof.body && proof.body.includes('CapSigma'), 'Stored sent body is missing CapSigma footer.')
  assert(
    healthcareContext(selected) || !/\bHIPAA\b/i.test(proof.body || ''),
    'Draft mentioned HIPAA outside a healthcare or medical prospect context.',
  )

  const sync = await request('/api/mailbox/gmail/sync?maxResults=10', { method: 'POST' }, cookie)
  const replies = (await request('/api/replies?attention=1', {}, cookie)).data.replies || []
  const activity = (await request('/api/activity', {}, cookie)).data.activity || []

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    mode: 'production_sandbox',
    query,
    configured: {
      database: session.configured.database,
      openai: session.configured.openai,
      sendgrid: session.configured.sendgrid,
      gmailConnected: session.configured.gmailConnected,
      fromEmail: session.configured.fromEmail,
      replyToEmail: session.configured.replyToEmail,
      recipientOverride: session.configured.recipientOverride,
      sandboxMode: session.configured.sandboxMode,
      autoSendMinFitScore: session.configured.autoSendMinFitScore,
      dailySendLimit: session.configured.dailySendLimit,
    },
    prospectRun: {
      runId: prospect.data.runId,
      importedCount: imported.length,
      rejectedCount: prospect.data.rejected?.length || 0,
      selectedLeadId: selected.id,
      company: selected.company,
      industry: selected.industry,
      fitScore: selected.fit_score,
      serviceLane: selected.service_lane,
      intendedRecipient: selected.email,
      sourceUrl: selected.source_url,
      reason: selected.reason,
      researchSummary: selected.research_summary,
    },
    draft: {
      draftId: draft.draftId,
      subject: draft.draftSubject || draft.subject,
      qualityIssues: draft.qualityIssues || [],
    },
    send: {
      sendId: sent.sendId,
      status: sent.status,
      providerMessageId: sent.providerMessageId,
      intendedRecipient: sent.intendedRecipient,
      actualRecipient: sent.actualRecipient,
      sandbox: sent.sandbox,
      preview: sent.preview,
      cc: sent.cc || [],
    },
    sentReview: {
      present: Boolean(proof),
      providerMessageId: proof.providerMessageId,
      sourceUrl: proof.sourceUrl || selected.source_url,
      subject: proof.subject,
      bodyLength: String(proof.body || '').length,
    },
    gmailSync: {
      status: sync.status,
      checked: sync.data.checked,
      imported: sync.data.imported?.length || 0,
      duplicates: sync.data.duplicates?.length || 0,
      rejected: sync.data.rejected?.length || 0,
      syncedAt: sync.data.syncedAt,
    },
    dashboard: {
      humanAttentionReplies: replies.length,
      recentActivityCount: activity.length,
    },
  }

  const outDir = path.join(process.cwd(), 'ops')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `PRODUCTION-E2E-SANDBOX-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))

  console.log(JSON.stringify({ outPath, ...report }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
