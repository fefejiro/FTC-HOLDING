import fs from 'node:fs'
import path from 'node:path'

const baseUrl = process.env.CAPSIGMA_BASE_URL || 'https://capsigma-growth-desk.pages.dev'
const recipient = process.env.CAPSIGMA_REPORT_RECIPIENT || 'fejiro.efiuvwere@gmail.com'
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

function markdownTable(rows) {
  if (!rows.length) return 'No sent outreach found.'
  return [
    '| Company | Intended | Actual | Status | Provider ID | Source | Follow-up |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((send) => {
      const source = send.sourceUrl ? `[source](${send.sourceUrl})` : 'missing'
      const followUp = send.sandbox
        ? 'Sandbox proof only. Not live-contacted yet.'
        : 'Follow up in 3 business days if no reply.'
      return [
        send.company || '',
        send.intendedRecipient || send.toEmail || '',
        send.actualRecipient || send.toEmail || '',
        send.sandbox ? `${send.status} sandbox` : send.status || '',
        send.providerMessageId || '',
        source,
        followUp,
      ].map((value) => String(value).replace(/\|/g, '\\|')).join(' | ')
    }),
  ].join('\n')
}

function buildMarkdown(payload) {
  const report = payload.report
  const lines = [
    '# CapSigma Outreach Email Report',
    '',
    `Generated: ${payload.generatedAt}`,
    `Production URL: ${baseUrl}`,
    `Recipient: ${payload.recipient}`,
    `Email status: ${payload.status}`,
    `Provider message id: ${payload.providerMessageId || 'preview/no provider id'}`,
    '',
    '## Outreach Clients',
    '',
    markdownTable(report.sends || []),
    '',
    '## Email Bodies',
    '',
  ]

  for (const send of report.sends || []) {
    lines.push(
      `### ${send.company || 'Unknown company'}`,
      '',
      `Subject: ${send.subject || ''}`,
      '',
      `Intended recipient: ${send.intendedRecipient || send.toEmail || ''}`,
      '',
      `Actual recipient: ${send.actualRecipient || send.toEmail || ''}`,
      '',
      `Provider ID: ${send.providerMessageId || ''}`,
      '',
      `Source: ${send.sourceUrl || 'missing'}`,
      '',
      `Follow-up: ${send.sandbox ? 'Sandbox proof only. The real prospect has not been contacted yet.' : 'Follow up in 3 business days if no reply.'}`,
      '',
      '```text',
      send.body || '',
      '```',
      '',
    )
  }

  lines.push('## Replies Needing Human Attention', '')
  if (!report.replies?.length) {
    lines.push('No human-attention replies in this report window.', '')
  } else {
    for (const reply of report.replies) {
      lines.push(
        `### ${reply.fromName || reply.fromEmail || 'Unknown sender'}`,
        '',
        `Company: ${reply.company || 'Unknown company'}`,
        '',
        `Subject: ${reply.subject || ''}`,
        '',
        `Classification: ${reply.classification || 'unclassified'}`,
        '',
        `Received: ${reply.receivedAt || reply.createdAt || ''}`,
        '',
        '```text',
        reply.body || '',
        '```',
        '',
      )
    }
  }

  return lines.join('\n')
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
  if (!session.authenticated) throw new Error('Session did not authenticate.')
  if (!session.configured?.sendgrid) throw new Error('SendGrid is not configured in production.')

  const result = await request('/api/reports/outreach-email', {
    method: 'POST',
    body: JSON.stringify({
      recipient,
      limit: Number.parseInt(process.env.CAPSIGMA_REPORT_LIMIT || '10', 10) || 10,
    }),
  }, cookie)

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = path.join(process.cwd(), 'ops')
  fs.mkdirSync(outDir, { recursive: true })
  const jsonPath = path.join(outDir, `CAPSIGMA-OUTREACH-EMAIL-REPORT-${stamp}.json`)
  const mdPath = path.join(outDir, `CAPSIGMA-OUTREACH-EMAIL-REPORT-${stamp}.md`)
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2))
  fs.writeFileSync(mdPath, buildMarkdown(result).replace(/[ \t]+$/gm, ''))

  console.log(JSON.stringify({
    outPath: jsonPath,
    markdownPath: mdPath,
    recipient: result.recipient,
    status: result.status,
    providerMessageId: result.providerMessageId,
    sendCount: result.report?.sends?.length || 0,
    replyAttentionCount: result.report?.replies?.length || 0,
    subject: result.report?.subject,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
