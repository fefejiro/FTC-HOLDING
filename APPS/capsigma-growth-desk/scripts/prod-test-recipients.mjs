import fs from 'node:fs'
import path from 'node:path'

const baseUrl = process.env.CAPSIGMA_BASE_URL || 'https://capsigma-growth-desk.pages.dev'
const recipients = (process.env.CAPSIGMA_TEST_RECIPIENTS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

if (!recipients.length) {
  recipients.push('fejiro.efiuvwere@gmail.com')
}

const handoffPath = path.join(process.cwd(), '.local', 'capsigma-secrets-handoff.txt')
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

function healthcareContext(lead = {}) {
  const text = [
    lead.company,
    lead.industry,
    lead.reason,
    lead.contactTitle,
    lead.contact_title,
    lead.serviceLane,
    lead.service_lane,
    lead.researchSummary,
    lead.research_summary,
    lead.source,
  ]
    .filter(Boolean)
    .join(' ')

  return /\b(health(care)?|medical|clinical|non[-\s]?clinical|patient|hospital|clinic|physician|pharma(ceutical)?|revenue cycle|insurance verification|hipaa)\b/i.test(text)
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
  if (!response.ok) {
    throw new Error(`${pathname} failed ${response.status}: ${data.error || JSON.stringify(data)}`)
  }
  return data
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
  const session = await request('/api/session', {}, cookie)
  const configuredCcEmails = session.configured.ccEmails || []
  if (!configuredCcEmails.includes('fejiro.efiuvwere@gmail.com')) {
    throw new Error('SENDGRID_CC_EMAILS must include fejiro.efiuvwere@gmail.com for proof-copy testing.')
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const results = []

  for (const recipient of recipients) {
    const leadPayload = {
      leads: [
        {
          company: `CapSigma Recipient Test ${recipient} ${stamp}`,
          industry: 'Internal delivery QA',
          fitScore: 100,
          reason: `Internal production delivery test for ${recipient}. This verifies SendGrid delivery, reply-to routing, admin processing fit, D1 proof logging, and Sent Review visibility.`,
          contactName: recipient,
          contactTitle: 'Delivery QA recipient',
          email: recipient,
          sourceUrl: baseUrl,
          source: 'production recipient delivery test',
          serviceLane: 'admin_processing',
        },
      ],
    }

    const imported = await request('/api/leads', {
      method: 'POST',
      body: JSON.stringify(leadPayload),
    }, cookie)
    const leadId = imported.imported[0].id
    const draft = await request('/api/draft', {
      method: 'POST',
      body: JSON.stringify({
        leadId,
        notes: `Internal CapSigma delivery test to ${recipient}. Keep short. State that reply-to should route to hello@capsigma.com when live mode is enabled.`,
      }),
    }, cookie)
    const sent = await request('/api/send-email', {
      method: 'POST',
      body: JSON.stringify({ leadId }),
    }, cookie)
    results.push({
      recipient,
      leadId,
      draftId: draft.draftId,
      sendId: sent.sendId,
      status: sent.status,
      providerMessageId: sent.providerMessageId,
      preview: sent.preview,
      sandbox: sent.sandbox,
      intendedRecipient: sent.intendedRecipient,
      actualRecipient: sent.actualRecipient,
      cc: sent.cc || [],
    })
  }

  const sends = await request('/api/sends', {}, cookie)
  const proofBySendId = new Map(sends.sends.map((send) => [send.id, send]))
  for (const result of results) {
    if (!['sent', 'sandbox_sent', 'live_sent'].includes(result.status) || result.preview) {
      throw new Error(`Recipient ${result.recipient} was not sent: ${JSON.stringify(result)}`)
    }
    const proof = proofBySendId.get(result.sendId)
    if (!proof) throw new Error(`Sent Review proof missing for ${result.recipient}`)
    if (!proof.providerMessageId) {
      throw new Error(`Provider message id missing in Sent Review for ${result.recipient}`)
    }
    if (!proof.intendedRecipient || !proof.actualRecipient) {
      throw new Error(`Intended/actual recipient proof missing for ${result.recipient}`)
    }
    if (!proof.body.includes('contact ')) {
      throw new Error(`Reply/contact footer missing in Sent Review for ${result.recipient}`)
    }
    if (!healthcareContext(proof) && /\bHIPAA\b/i.test(proof.body || '')) {
      throw new Error(`Sent Review body mentions HIPAA outside healthcare context for ${result.recipient}`)
    }
    if (result.actualRecipient === 'fejiro.efiuvwere@gmail.com' && result.cc.includes('fejiro.efiuvwere@gmail.com')) {
      throw new Error(`Duplicate Fejiro CC was not removed for ${result.recipient}`)
    }
    if (result.actualRecipient !== 'fejiro.efiuvwere@gmail.com' && !result.cc.includes('fejiro.efiuvwere@gmail.com')) {
      throw new Error(`Fejiro proof-copy CC missing for ${result.recipient}`)
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    configured: session.configured,
    recipients,
    results,
    sentReviewSample: results.map((result) => proofBySendId.get(result.sendId)),
  }
  const outPath = path.join(process.cwd(), 'ops', `RECIPIENT-TEST-${stamp}.json`)
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ outPath, ...report }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
