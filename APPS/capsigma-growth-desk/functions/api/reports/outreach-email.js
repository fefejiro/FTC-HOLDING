import { requireAuth } from '../../_lib/auth.js'
import { addActivity, getDb, nowIso } from '../../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../../_lib/json.js'

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function compact(value = '', max = 800) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 3)}...` : text
}

function defaultRecipient(env = {}) {
  const cc = String(env.SENDGRID_CC_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)

  return (
    env.OUTBOUND_RECIPIENT_OVERRIDE ||
    cc[0] ||
    env.SENDGRID_REPLY_TO_EMAIL ||
    env.SENDGRID_FROM_EMAIL ||
    ''
  )
}

function followUpFor(send) {
  if (send.sandbox) {
    return 'Sandbox proof only. The real prospect has not been contacted yet. After live mode is enabled and sent, follow up 3 business days later if no reply.'
  }
  if (send.status === 'live_sent') {
    return 'Live outreach sent. Watch Replies for responses and follow up in 3 business days if there is no reply.'
  }
  if (send.status === 'failed') return 'Do not follow up. Fix the failed send first.'
  return 'Review status before any follow-up.'
}

function buildReport({ generatedAt, baseUrl, configured, sends, replies }) {
  const sandboxMode = Boolean(configured.recipientOverride)
  const subject = `CapSigma Outreach Report - ${new Date(generatedAt).toLocaleDateString('en-CA')} - ${sends.length} sends`
  const summaryLines = [
    `Generated: ${generatedAt}`,
    `Production URL: ${baseUrl}`,
    `Mode: ${sandboxMode ? 'Fejiro sandbox, real prospects route to Fejiro only' : 'Live mode'}`,
    `From: ${configured.fromEmail || 'not configured'}`,
    `Reply-To: ${configured.replyToEmail || 'not configured'}`,
    `Actual recipient override: ${configured.recipientOverride || 'none'}`,
    `Recent sends in report: ${sends.length}`,
    `Human-attention replies: ${replies.length}`,
  ]

  const textSections = sends.map((send, index) => {
    return [
      `#${index + 1} ${send.company || 'Unknown company'}`,
      `Contact: ${send.contactName || send.contactTitle || 'Unknown'}${send.contactTitle ? `, ${send.contactTitle}` : ''}`,
      `Intended recipient: ${send.intendedRecipient || send.toEmail || ''}`,
      `Actual recipient: ${send.actualRecipient || send.toEmail || ''}`,
      `Status: ${send.status}${send.sandbox ? ' (sandbox)' : ''}`,
      `Provider ID: ${send.providerMessageId || 'missing'}`,
      `Source: ${send.sourceUrl || 'missing'}`,
      `Fit score: ${send.fitScore ?? ''}`,
      `Why this prospect: ${send.reason || 'not recorded'}`,
      `Subject: ${send.subject || ''}`,
      `Follow-up: ${followUpFor(send)}`,
      '',
      'Email body:',
      send.body || '',
    ].join('\n')
  })

  const replySections = replies.map((reply, index) => {
    return [
      `#${index + 1} ${reply.fromName || reply.fromEmail || 'Unknown sender'}`,
      `Company: ${reply.company || 'Unknown company'}`,
      `Subject: ${reply.subject || ''}`,
      `Classification: ${reply.classification || 'unclassified'}`,
      `Needs human: ${reply.needsHuman ? 'yes' : 'no'}`,
      `Received: ${reply.receivedAt || reply.createdAt || ''}`,
      `Body: ${compact(reply.body, 1000)}`,
    ].join('\n')
  })

  const text = [
    'CapSigma Outreach Report',
    '',
    ...summaryLines,
    '',
    'Recent Outreach Clients And Emails',
    sends.length ? textSections.join('\n\n---\n\n') : 'No sent outreach found.',
    '',
    'Replies Needing Human Attention',
    replies.length ? replySections.join('\n\n---\n\n') : 'No human-attention replies in this report window.',
  ].join('\n')

  const sendRows = sends.map((send) => `
    <tr>
      <td><strong>${escapeHtml(send.company || 'Unknown company')}</strong><br>${escapeHtml(send.contactName || send.contactTitle || '')}</td>
      <td>${escapeHtml(send.intendedRecipient || send.toEmail || '')}<br><small>Actual: ${escapeHtml(send.actualRecipient || send.toEmail || '')}</small></td>
      <td>${escapeHtml(send.status || '')}${send.sandbox ? '<br><small>Sandbox</small>' : ''}</td>
      <td>${escapeHtml(send.providerMessageId || 'missing')}</td>
      <td>${send.sourceUrl ? `<a href="${escapeHtml(send.sourceUrl)}">source</a>` : 'missing'}</td>
      <td>${escapeHtml(followUpFor(send))}</td>
    </tr>
    <tr>
      <td colspan="6">
        <strong>Subject:</strong> ${escapeHtml(send.subject || '')}<br>
        <strong>Why:</strong> ${escapeHtml(send.reason || 'not recorded')}<br>
        <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;background:#f6f7f9;padding:12px;border-radius:8px;">${escapeHtml(send.body || '')}</pre>
      </td>
    </tr>
  `)

  const replyRows = replies.map((reply) => `
    <tr>
      <td>${escapeHtml(reply.fromName || reply.fromEmail || 'Unknown sender')}</td>
      <td>${escapeHtml(reply.company || 'Unknown company')}</td>
      <td>${escapeHtml(reply.subject || '')}</td>
      <td>${escapeHtml(reply.classification || 'unclassified')}</td>
      <td>${escapeHtml(compact(reply.body, 700))}</td>
    </tr>
  `)

  const html = `
    <div style="font-family:Arial,sans-serif;color:#172033;line-height:1.45;">
      <h1>CapSigma Outreach Report</h1>
      <p><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p>
      <p><strong>Mode:</strong> ${sandboxMode ? 'Fejiro sandbox. Real prospects route to Fejiro only.' : 'Live mode.'}</p>
      <p><strong>Production URL:</strong> <a href="${escapeHtml(baseUrl)}">${escapeHtml(baseUrl)}</a></p>
      <ul>
        <li>From: ${escapeHtml(configured.fromEmail || 'not configured')}</li>
        <li>Reply-To: ${escapeHtml(configured.replyToEmail || 'not configured')}</li>
        <li>Actual recipient override: ${escapeHtml(configured.recipientOverride || 'none')}</li>
        <li>Recent sends in report: ${sends.length}</li>
        <li>Human-attention replies: ${replies.length}</li>
      </ul>
      <h2>Recent Outreach Clients And Emails</h2>
      <table border="1" cellspacing="0" cellpadding="8" style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th align="left">Client</th>
            <th align="left">Recipient</th>
            <th align="left">Status</th>
            <th align="left">Provider ID</th>
            <th align="left">Source</th>
            <th align="left">Follow-up</th>
          </tr>
        </thead>
        <tbody>${sendRows.join('') || '<tr><td colspan="6">No sent outreach found.</td></tr>'}</tbody>
      </table>
      <h2>Replies Needing Human Attention</h2>
      <table border="1" cellspacing="0" cellpadding="8" style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th align="left">From</th>
            <th align="left">Company</th>
            <th align="left">Subject</th>
            <th align="left">Classification</th>
            <th align="left">Snippet</th>
          </tr>
        </thead>
        <tbody>${replyRows.join('') || '<tr><td colspan="5">No human-attention replies in this report window.</td></tr>'}</tbody>
      </table>
    </div>
  `

  return { subject, text, html }
}

async function fetchReportData(db, limit) {
  const { results: sends = [] } = await db
    .prepare(
      `SELECT
        s.id,
        s.lead_id,
        s.to_email,
        s.intended_recipient,
        s.actual_recipient,
        s.subject,
        COALESCE(NULLIF(s.body, ''), l.draft_body, '') AS body,
        s.status,
        s.provider,
        s.provider_message_id,
        s.sandbox,
        s.error,
        s.created_at,
        l.company,
        l.industry,
        l.fit_score,
        l.reason,
        l.contact_name,
        l.contact_title,
        l.source_url,
        l.source
      FROM send_events s
      LEFT JOIN leads l ON l.id = s.lead_id
      WHERE s.status IN ('sent', 'sandbox_sent', 'live_sent')
        AND COALESCE(l.source, '') <> 'production recipient delivery test'
        AND COALESCE(l.company, '') NOT LIKE 'CapSigma Recipient Test%'
        AND COALESCE(l.company, '') NOT LIKE 'CapSigma Internal Smoke%'
        AND COALESCE(s.intended_recipient, s.to_email, '') NOT LIKE '%+capsigma-smoke%'
        AND COALESCE(s.subject, '') NOT LIKE 'Internal Delivery QA%'
      ORDER BY s.created_at DESC
      LIMIT ?`,
    )
    .bind(limit)
    .all()

  const { results: replies = [] } = await db
    .prepare(
      `SELECT
        r.*,
        l.company,
        l.contact_name,
        l.contact_title,
        l.source_url
      FROM replies r
      LEFT JOIN leads l ON l.id = r.lead_id
      WHERE r.needs_human = 1
        AND r.lead_id <> ''
        AND EXISTS (
          SELECT 1 FROM send_events s
          WHERE s.lead_id = r.lead_id
            AND s.status IN ('sent', 'sandbox_sent', 'live_sent')
        )
      ORDER BY r.created_at DESC
      LIMIT ?`,
    )
    .bind(limit)
    .all()

  return {
    sends: sends.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      toEmail: row.to_email,
      intendedRecipient: row.intended_recipient || row.to_email,
      actualRecipient: row.actual_recipient || row.to_email,
      subject: row.subject,
      body: row.body,
      status: row.status,
      provider: row.provider,
      providerMessageId: row.provider_message_id,
      sandbox: Boolean(row.sandbox),
      error: row.error,
      createdAt: row.created_at,
      company: row.company,
      industry: row.industry,
      fitScore: row.fit_score,
      reason: row.reason,
      contactName: row.contact_name,
      contactTitle: row.contact_title,
      sourceUrl: row.source_url,
      source: row.source,
    })),
    replies: replies.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      sendEventId: row.send_event_id,
      provider: row.provider,
      messageId: row.message_id,
      threadId: row.thread_id,
      fromEmail: row.from_email,
      fromName: row.from_name,
      subject: row.subject,
      body: row.body,
      classification: row.classification,
      needsHuman: Boolean(row.needs_human),
      receivedAt: row.received_at,
      createdAt: row.created_at,
      company: row.company,
      contactName: row.contact_name,
      contactTitle: row.contact_title,
      sourceUrl: row.source_url,
    })),
  }
}

async function sendReportEmail({ env, recipient, subject, text, html }) {
  if (!env.SENDGRID_API_KEY) {
    return { preview: true, providerMessageId: '', status: 'preview' }
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: recipient, name: 'Fejiro' }] }],
      from: {
        email: env.SENDGRID_FROM_EMAIL,
        name: env.SENDGRID_FROM_NAME || 'CapSigma',
      },
      reply_to: {
        email: env.SENDGRID_REPLY_TO_EMAIL || env.SENDGRID_FROM_EMAIL,
        name: env.SENDGRID_REPLY_TO_NAME || env.SENDGRID_FROM_NAME || 'CapSigma',
      },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
      custom_args: {
        capsigma_report: 'outreach_digest',
      },
    }),
  })

  if (!response.ok) {
    const responseText = await response.text()
    throw new Error(`SendGrid report email failed: ${response.status} ${responseText}`)
  }

  return {
    preview: false,
    providerMessageId: response.headers.get('x-message-id') || '',
    status: 'sent',
  }
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') return methodNotAllowed()

  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const body = (await readJson(request)) || {}
  const limit = Math.min(Math.max(Number.parseInt(body.limit || '10', 10) || 10, 1), 25)
  const recipient = String(body.recipient || defaultRecipient(env)).trim().toLowerCase()
  if (!recipient) return json({ error: 'Report recipient is not configured' }, { status: 400 })
  if (!env.SENDGRID_FROM_EMAIL) return json({ error: 'SENDGRID_FROM_EMAIL is not configured' }, { status: 500 })

  const generatedAt = nowIso()
  const configured = {
    fromEmail: env.SENDGRID_FROM_EMAIL || '',
    replyToEmail: env.SENDGRID_REPLY_TO_EMAIL || env.SENDGRID_FROM_EMAIL || '',
    recipientOverride: env.OUTBOUND_RECIPIENT_OVERRIDE || '',
    sandboxMode: Boolean(env.OUTBOUND_RECIPIENT_OVERRIDE),
  }
  const { sends, replies } = await fetchReportData(db, limit)
  const report = buildReport({
    generatedAt,
    baseUrl: new URL(request.url).origin,
    configured,
    sends,
    replies,
  })

  const delivery = await sendReportEmail({
    env,
    recipient,
    subject: report.subject,
    text: report.text,
    html: report.html,
  })

  await addActivity(db, {
    type: delivery.preview ? 'outreach_report_preview' : 'outreach_report_sent',
    label: delivery.preview
      ? `Outreach report preview generated for ${recipient}`
      : `Outreach report emailed to ${recipient}`,
    metadata: {
      recipient,
      providerMessageId: delivery.providerMessageId,
      sendCount: sends.length,
      replyAttentionCount: replies.length,
    },
  })

  return json({
    ok: true,
    recipient,
    status: delivery.status,
    preview: delivery.preview,
    providerMessageId: delivery.providerMessageId,
    generatedAt,
    report: {
      subject: report.subject,
      text: report.text,
      html: report.html,
      sends,
      replies,
    },
  })
}
