import fs from 'node:fs'
import path from 'node:path'

const baseUrl = process.env.CAPSIGMA_BASE_URL || 'https://capsigma-growth-desk.pages.dev'
const recipients = (process.env.CAPSIGMA_TEST_RECIPIENTS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)

if (!recipients.length) {
  recipients.push('sales@capsigma.com', 'fejiro.efiuvwere@gmail.com')
}

const handoffPath = path.join(process.cwd(), '.local', 'capsigma-secrets-handoff.txt')

function readPassword() {
  if (process.env.CAPSIGMA_ADMIN_PASSWORD) return process.env.CAPSIGMA_ADMIN_PASSWORD
  if (!fs.existsSync(handoffPath)) return ''
  const text = fs.readFileSync(handoffPath, 'utf8')
  return text.match(/^ADMIN_PASSWORD=(.+)$/m)?.[1]?.trim() || ''
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

async function main() {
  const password = readPassword()
  if (!password) throw new Error('Missing admin password.')

  const login = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!login.ok) throw new Error(`Login failed: ${login.status}`)
  const cookie = cookieFrom(login)
  const session = await request('/api/session', {}, cookie)

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const results = []

  for (const recipient of recipients) {
    const leadPayload = {
      leads: [
        {
          company: `CapSigma Recipient Test ${recipient} ${stamp}`,
          industry: 'Internal delivery QA',
          fitScore: 100,
          reason: `Internal production delivery test for ${recipient}. This verifies SendGrid delivery, reply-to routing, D1 proof logging, and Sent Review visibility.`,
          contactName: recipient,
          contactTitle: 'Delivery QA recipient',
          email: recipient,
          sourceUrl: baseUrl,
          source: 'production recipient delivery test',
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
        notes: `Internal CapSigma delivery test to ${recipient}. Keep short. State that reply-to should route to sales@capsigma.com.`,
      }),
    }, cookie)
    await request(`/api/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'approved',
        draftSubject: `CapSigma delivery test for ${recipient}`,
        draftBody: `Hello,\n\nThis is a CapSigma production delivery test for ${recipient}.\n\nIt verifies that the Growth Desk can send through SendGrid, store the sent body, and show provider proof in Sent Review.\n\nReplies should route to sales@capsigma.com.\n\nBest regards,\n\nNiyi Olumide, PMP, CSM\nGeneral Manager, CapSigma`,
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
    })
  }

  const sends = await request('/api/sends', {}, cookie)
  const proofBySendId = new Map(sends.sends.map((send) => [send.id, send]))
  for (const result of results) {
    if (result.status !== 'sent' || result.preview) {
      throw new Error(`Recipient ${result.recipient} was not sent: ${JSON.stringify(result)}`)
    }
    const proof = proofBySendId.get(result.sendId)
    if (!proof) throw new Error(`Sent Review proof missing for ${result.recipient}`)
    if (!proof.providerMessageId) {
      throw new Error(`Provider message id missing in Sent Review for ${result.recipient}`)
    }
    if (!proof.body.includes('contact sales@capsigma.com')) {
      throw new Error(`Sales reply/contact footer missing in Sent Review for ${result.recipient}`)
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    configured: session.configured,
    recipients,
    results,
    sentReviewSample: sends.sends.slice(0, 6),
  }
  const outPath = path.join(process.cwd(), 'ops', `RECIPIENT-TEST-${stamp}.json`)
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ outPath, ...report }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
