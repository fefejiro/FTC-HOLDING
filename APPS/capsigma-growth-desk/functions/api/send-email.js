import { requireAuth } from '../_lib/auth.js'
import { addActivity, getDb, getLead, newId, nowIso } from '../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../_lib/json.js'
import { canAutoSendLead, canSendLead } from '../_lib/validation.js'

function addComplianceFooter(body, contactEmail) {
  return `${body.trim()}

CapSigma
You received this business outreach because your role may relate to data operations, records, or processing workflows.
To opt out, reply with "unsubscribe" or contact ${contactEmail}.`
}

export function parseEmailList(value) {
  return String(value || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

export function buildCcRecipients(ccEmails, toEmail) {
  const seen = new Set([String(toEmail || '').toLowerCase()])
  return ccEmails
    .filter((email) => {
      const normalized = email.toLowerCase()
      if (seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
    .map((email) => ({ email }))
}

export function resolveRecipients(leadEmail, env = {}) {
  const intendedRecipient = String(leadEmail || '').trim().toLowerCase()
  const overrideRecipient = String(env.OUTBOUND_RECIPIENT_OVERRIDE || '').trim().toLowerCase()
  const actualRecipient = overrideRecipient || intendedRecipient
  return {
    intendedRecipient,
    actualRecipient,
    sandbox: Boolean(overrideRecipient),
  }
}

async function recordSendEvent(db, event) {
  await db
    .prepare(
      `INSERT INTO send_events (
        id, lead_id, to_email, intended_recipient, actual_recipient,
        subject, body, status, provider, provider_message_id, error, sandbox, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.leadId,
      event.actualRecipient,
      event.intendedRecipient,
      event.actualRecipient,
      event.subject,
      event.body || '',
      event.status,
      event.provider,
      event.providerMessageId || '',
      event.error || '',
      event.sandbox ? 1 : 0,
      event.createdAt,
    )
    .run()
}

async function getSuppressed(db, email) {
  if (!email) return null
  return db.prepare('SELECT email FROM suppressions WHERE email = ?').bind(email).first()
}

function sendStatusFor({ sandbox, preview = false }) {
  if (preview) return 'needs_review'
  return sandbox ? 'sandbox_sent' : 'live_sent'
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

  const suppressed = await getSuppressed(db, lead.email)
  const sendCheck = canSendLead(lead)
  if (!sendCheck.ok) {
    return json({ error: sendCheck.reason }, { status: 400 })
  }
  if (suppressed) return json({ error: 'Recipient is suppressed' }, { status: 409 })

  const minFitScore = Number.parseInt(env.AUTO_SEND_MIN_FIT_SCORE || '60', 10)
  const autoCheck = canAutoSendLead(lead, {
    suppressed: Boolean(suppressed),
    minFitScore: Number.isFinite(minFitScore) ? minFitScore : 60,
  })
  const manuallyApproved = lead.status === 'approved'
  if (!manuallyApproved && !autoCheck.ok) {
    const now = nowIso()
    await db
      .prepare('UPDATE leads SET status = ?, review_status = ?, updated_at = ? WHERE id = ?')
      .bind('needs_review', autoCheck.reason, now, leadId)
      .run()
    await addActivity(db, {
      leadId,
      type: 'send_needs_review',
      label: `${lead.company} needs review before sending`,
      metadata: { reason: autoCheck.reason, minFitScore },
    })
    return json(
      { error: autoCheck.reason, status: 'needs_review', eligible: false },
      { status: 409 },
    )
  }

  const sendgridApiKey = env.SENDGRID_API_KEY
  const sendgridFromEmail = env.SENDGRID_FROM_EMAIL || ''
  const sendgridReplyToEmail = env.SENDGRID_REPLY_TO_EMAIL || sendgridFromEmail
  const sendgridReplyToName = env.SENDGRID_REPLY_TO_NAME || env.SENDGRID_FROM_NAME || 'CapSigma'
  const recipients = resolveRecipients(lead.email, env)
  const ccRecipients = buildCcRecipients(parseEmailList(env.SENDGRID_CC_EMAILS), recipients.actualRecipient)
  if (!sendgridFromEmail) {
    return json({ error: 'SENDGRID_FROM_EMAIL is not configured' }, { status: 500 })
  }

  const sendId = newId('send')
  const createdAt = nowIso()
  const emailBody = addComplianceFooter(lead.draft_body, sendgridReplyToEmail)
  const status = sendStatusFor({ sandbox: recipients.sandbox, preview: !sendgridApiKey })

  if (!sendgridApiKey) {
    await recordSendEvent(db, {
      id: sendId,
      leadId,
      intendedRecipient: recipients.intendedRecipient,
      actualRecipient: recipients.actualRecipient,
      subject: lead.draft_subject,
      body: emailBody,
      status,
      provider: 'sendgrid',
      sandbox: recipients.sandbox,
      createdAt,
    })
    await db
      .prepare(
        `UPDATE leads SET status = ?, review_status = ?, updated_at = ? WHERE id = ?`,
      )
      .bind('needs_review', 'SENDGRID_API_KEY is missing; preview proof only.', createdAt, leadId)
      .run()
    await addActivity(db, {
      leadId,
      type: 'send_preview',
      label: `Preview saved for ${lead.company}`,
      metadata: { sendId, intendedRecipient: recipients.intendedRecipient, actualRecipient: recipients.actualRecipient },
    })

    return json({
      sendId,
      preview: true,
      sandbox: recipients.sandbox,
      status,
      intendedRecipient: recipients.intendedRecipient,
      actualRecipient: recipients.actualRecipient,
      message: 'No SendGrid key configured. Email was recorded as proof only.',
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
         WHERE status IN ('sent', 'sandbox_sent', 'live_sent') AND created_at >= ?`,
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
          to: [{ email: recipients.actualRecipient, name: lead.contact_name || lead.contact_title }],
          ...(ccRecipients.length ? { cc: ccRecipients } : {}),
          custom_args: {
            lead_id: leadId,
            intended_recipient: recipients.intendedRecipient,
            sandbox: recipients.sandbox ? '1' : '0',
          },
        },
      ],
      from: {
        email: sendgridFromEmail,
        name: env.SENDGRID_FROM_NAME || 'CapSigma',
      },
      reply_to: {
        email: sendgridReplyToEmail,
        name: sendgridReplyToName,
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
      intendedRecipient: recipients.intendedRecipient,
      actualRecipient: recipients.actualRecipient,
      subject: lead.draft_subject,
      body: emailBody,
      status: 'failed',
      provider: 'sendgrid',
      error: `${sendResponse.status} ${responseText}`,
      sandbox: recipients.sandbox,
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
    intendedRecipient: recipients.intendedRecipient,
    actualRecipient: recipients.actualRecipient,
    subject: lead.draft_subject,
    body: emailBody,
    status,
    provider: 'sendgrid',
    providerMessageId,
    sandbox: recipients.sandbox,
    createdAt,
  })
  await db
    .prepare(
      `UPDATE leads
       SET status = ?, emails_sent = emails_sent + 1, last_sent_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(status, createdAt, createdAt, leadId)
    .run()
  await addActivity(db, {
    leadId,
    type: recipients.sandbox ? 'send_sandbox_sent' : 'send_live_sent',
    label: recipients.sandbox
      ? `Sandbox email sent for ${lead.company}`
      : `Live email sent to ${lead.company}`,
    metadata: {
      sendId,
      providerMessageId,
      intendedRecipient: recipients.intendedRecipient,
      actualRecipient: recipients.actualRecipient,
      cc: ccRecipients.map((recipient) => recipient.email),
      serviceLane: autoCheck.serviceLane || lead.service_lane || '',
    },
  })

  return json({
    sendId,
    preview: false,
    sandbox: recipients.sandbox,
    status,
    providerMessageId,
    intendedRecipient: recipients.intendedRecipient,
    actualRecipient: recipients.actualRecipient,
    cc: ccRecipients.map((recipient) => recipient.email),
    message: recipients.sandbox
      ? 'Sandbox email sent via SendGrid and recorded as proof.'
      : 'Live email sent via SendGrid and recorded as proof.',
  })
}
