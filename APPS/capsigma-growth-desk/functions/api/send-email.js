import { requireAuth } from '../_lib/auth.js'
import { addActivity, getDb, getLead, newId, nowIso } from '../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../_lib/json.js'
import { canSendLead } from '../_lib/validation.js'

function addComplianceFooter(body, fromEmail) {
  return `${body.trim()}

--
CapSigma
You received this business outreach because your role may relate to data operations, records, or processing workflows.
To opt out, reply with "unsubscribe" or contact ${fromEmail}.`
}

async function recordSendEvent(db, event) {
  await db
    .prepare(
      `INSERT INTO send_events (
        id, lead_id, to_email, subject, status, provider,
        provider_message_id, error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.leadId,
      event.toEmail,
      event.subject,
      event.status,
      event.provider,
      event.providerMessageId || '',
      event.error || '',
      event.createdAt,
    )
    .run()
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') return methodNotAllowed()

  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  const leadId = String(body.leadId || '')
  if (!leadId) return json({ error: 'leadId is required' }, { status: 400 })

  const lead = await getLead(db, leadId)
  if (!lead) return json({ error: 'Lead not found' }, { status: 404 })

  if (lead.status !== 'approved') {
    return json(
      { error: 'Draft must be reviewed and approved before sending.' },
      { status: 409 },
    )
  }

  const sendCheck = canSendLead(lead)
  if (!sendCheck.ok) {
    return json({ error: sendCheck.reason }, { status: 400 })
  }

  const suppressed = await db
    .prepare('SELECT email FROM suppressions WHERE email = ?')
    .bind(lead.email)
    .first()
  if (suppressed) return json({ error: 'Recipient is suppressed' }, { status: 409 })

  const sendgridApiKey = env.SENDGRID_API_KEY
  const sendgridFromEmail = env.SENDGRID_FROM_EMAIL || ''
  if (!sendgridFromEmail) {
    return json({ error: 'SENDGRID_FROM_EMAIL is not configured' }, { status: 500 })
  }

  const sendId = newId('send')
  const createdAt = nowIso()
  const emailBody = addComplianceFooter(lead.draft_body, sendgridFromEmail)

  if (!sendgridApiKey) {
    await recordSendEvent(db, {
      id: sendId,
      leadId,
      toEmail: lead.email,
      subject: lead.draft_subject,
      status: 'preview',
      provider: 'sendgrid',
      createdAt,
    })
    await db
      .prepare(
        `UPDATE leads SET status = ?, updated_at = ? WHERE id = ?`,
      )
      .bind('preview_ready', createdAt, leadId)
      .run()
    await addActivity(db, {
      leadId,
      type: 'send_preview',
      label: `Preview saved for ${lead.company}`,
      metadata: { sendId },
    })

    return json({
      sendId,
      preview: true,
      status: 'preview',
      message: 'No SendGrid key configured. Email was recorded as preview proof only.',
    })
  }

  const dailyLimit = Number.parseInt(env.DAILY_SEND_LIMIT || '25', 10)
  if (dailyLimit > 0) {
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const sentToday = await db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM send_events
         WHERE status = 'sent' AND created_at >= ?`,
      )
      .bind(startOfDay.toISOString())
      .first()

    if (Number(sentToday?.count || 0) >= dailyLimit) {
      return json(
        { error: `Daily send limit reached (${dailyLimit}).` },
        { status: 429 },
      )
    }
  }

  const sendResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sendgridApiKey}`,
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: lead.email, name: lead.contact_name || lead.contact_title }],
        },
      ],
      from: {
        email: sendgridFromEmail,
        name: env.SENDGRID_FROM_NAME || 'CapSigma',
      },
      subject: lead.draft_subject,
      content: [{ type: 'text/plain', value: emailBody }],
    }),
  })

  if (!sendResponse.ok) {
    const responseText = await sendResponse.text()
    await recordSendEvent(db, {
      id: sendId,
      leadId,
      toEmail: lead.email,
      subject: lead.draft_subject,
      status: 'failed',
      provider: 'sendgrid',
      error: `${sendResponse.status} ${responseText}`,
      createdAt,
    })
    await addActivity(db, {
      leadId,
      type: 'send_failed',
      label: `Send failed for ${lead.company}`,
      metadata: { sendId, status: sendResponse.status },
    })
    return json(
      { sendId, error: `SendGrid request failed: ${sendResponse.status} ${responseText}` },
      { status: sendResponse.status },
    )
  }

  const providerMessageId = sendResponse.headers.get('x-message-id') || ''
  await recordSendEvent(db, {
    id: sendId,
    leadId,
    toEmail: lead.email,
    subject: lead.draft_subject,
    status: 'sent',
    provider: 'sendgrid',
    providerMessageId,
    createdAt,
  })
  await db
    .prepare(
      `UPDATE leads
       SET status = ?, emails_sent = emails_sent + 1, last_sent_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind('sent', createdAt, createdAt, leadId)
    .run()
  await addActivity(db, {
    leadId,
    type: 'send_sent',
    label: `Email sent to ${lead.company}`,
    metadata: { sendId, providerMessageId },
  })

  return json({
    sendId,
    preview: false,
    status: 'sent',
    providerMessageId,
    message: 'Email sent via SendGrid and recorded as proof.',
  })
}
