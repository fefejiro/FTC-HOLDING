import { requireAuth } from '../_lib/auth.js'
import { addActivity, getDb, getLead, newId, nowIso } from '../_lib/db.js'
import { buildScheduleSafety, nextScheduledTime, normalizeSendWindows } from '../_lib/evidence.js'
import { json, methodNotAllowed, readJson } from '../_lib/json.js'
import { buildCcRecipients, parseEmailList, resolveRecipients } from './send-email.js'

function mapScheduled(row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    contactEmail: row.contact_email,
    subject: row.subject,
    body: row.body,
    status: row.status,
    scheduledAt: row.scheduled_at,
    sendWindowLabel: row.send_window_label,
    approvalStatus: row.approval_status,
    confidence: row.confidence,
    safetyChecks: JSON.parse(row.safety_checks_json || '{}'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function activeSendWindows(db) {
  const row = await db.prepare('SELECT send_windows_json FROM campaign_settings WHERE id = ?').bind('active').first()
  return normalizeSendWindows(JSON.parse(row?.send_windows_json || '["08:00","15:00"]'))
}

function addComplianceFooter(body, contactEmail) {
  return `${String(body || '').trim()}

CapSigma
You received this business outreach because your role may relate to data operations, records, or processing workflows.
To opt out, reply with "unsubscribe" or contact ${contactEmail}.`
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

async function processDueSends(db, env, { limit = 10 } = {}) {
  const now = nowIso()
  const { results } = await db
    .prepare(
      `SELECT * FROM scheduled_sends
       WHERE status = 'scheduled' AND scheduled_at <= ?
       ORDER BY scheduled_at ASC
       LIMIT ?`,
    )
    .bind(now, limit)
    .all()

  const processed = []
  for (const scheduled of results || []) {
    const lead = await getLead(db, scheduled.lead_id)
    if (!lead) {
      await db.prepare('UPDATE scheduled_sends SET status = ?, updated_at = ? WHERE id = ?').bind('failed', now, scheduled.id).run()
      processed.push({ id: scheduled.id, status: 'failed', error: 'Lead not found' })
      continue
    }

    const recipients = resolveRecipients(scheduled.contact_email, env)
    const sendgridFromEmail = env.SENDGRID_FROM_EMAIL || ''
    const sendgridReplyToEmail = env.SENDGRID_REPLY_TO_EMAIL || sendgridFromEmail
    const sendgridReplyToName = env.SENDGRID_REPLY_TO_NAME || env.SENDGRID_FROM_NAME || 'CapSigma'
    const sendgridApiKey = env.SENDGRID_API_KEY
    const ccRecipients = buildCcRecipients(parseEmailList(env.SENDGRID_CC_EMAILS), recipients.actualRecipient)
    const sendId = newId('send')
    const emailBody = addComplianceFooter(scheduled.body, sendgridReplyToEmail)
    const sendStatus = !sendgridApiKey ? 'needs_review' : recipients.sandbox ? 'sandbox_sent' : 'live_sent'

    if (!sendgridFromEmail) {
      await db.prepare('UPDATE scheduled_sends SET status = ?, updated_at = ? WHERE id = ?').bind('failed', now, scheduled.id).run()
      processed.push({ id: scheduled.id, status: 'failed', error: 'SENDGRID_FROM_EMAIL is not configured' })
      continue
    }

    if (!sendgridApiKey) {
      await recordSendEvent(db, {
        id: sendId,
        leadId: scheduled.lead_id,
        intendedRecipient: recipients.intendedRecipient,
        actualRecipient: recipients.actualRecipient,
        subject: scheduled.subject,
        body: emailBody,
        status: sendStatus,
        provider: 'sendgrid',
        sandbox: recipients.sandbox,
        createdAt: now,
      })
      await db.prepare('UPDATE scheduled_sends SET status = ?, updated_at = ? WHERE id = ?').bind('preview_ready', now, scheduled.id).run()
      processed.push({ id: scheduled.id, sendId, status: 'preview_ready' })
      continue
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
              lead_id: scheduled.lead_id,
              scheduled_send_id: scheduled.id,
              intended_recipient: recipients.intendedRecipient,
              sandbox: recipients.sandbox ? '1' : '0',
            },
          },
        ],
        from: { email: sendgridFromEmail, name: env.SENDGRID_FROM_NAME || 'CapSigma' },
        reply_to: { email: sendgridReplyToEmail, name: sendgridReplyToName },
        subject: scheduled.subject,
        content: [{ type: 'text/plain', value: emailBody }],
      }),
    })

    if (!sendResponse.ok) {
      const responseText = await sendResponse.text()
      await recordSendEvent(db, {
        id: sendId,
        leadId: scheduled.lead_id,
        intendedRecipient: recipients.intendedRecipient,
        actualRecipient: recipients.actualRecipient,
        subject: scheduled.subject,
        body: emailBody,
        status: 'failed',
        provider: 'sendgrid',
        error: `${sendResponse.status} ${responseText}`,
        sandbox: recipients.sandbox,
        createdAt: now,
      })
      await db.prepare('UPDATE scheduled_sends SET status = ?, updated_at = ? WHERE id = ?').bind('failed', now, scheduled.id).run()
      processed.push({ id: scheduled.id, sendId, status: 'failed', error: `${sendResponse.status} ${responseText}` })
      continue
    }

    const providerMessageId = sendResponse.headers.get('x-message-id') || ''
    await recordSendEvent(db, {
      id: sendId,
      leadId: scheduled.lead_id,
      intendedRecipient: recipients.intendedRecipient,
      actualRecipient: recipients.actualRecipient,
      subject: scheduled.subject,
      body: emailBody,
      status: sendStatus,
      provider: 'sendgrid',
      providerMessageId,
      sandbox: recipients.sandbox,
      createdAt: now,
    })
    await db.prepare('UPDATE scheduled_sends SET status = ?, updated_at = ? WHERE id = ?').bind('sent', now, scheduled.id).run()
    await db
      .prepare('UPDATE leads SET status = ?, emails_sent = emails_sent + 1, last_sent_at = ?, updated_at = ? WHERE id = ?')
      .bind(sendStatus, now, now, scheduled.lead_id)
      .run()
    await addActivity(db, {
      leadId: scheduled.lead_id,
      type: recipients.sandbox ? 'scheduled_send_sandbox_sent' : 'scheduled_send_live_sent',
      label: `${lead.company} scheduled send processed`,
      metadata: { scheduledSendId: scheduled.id, sendId, providerMessageId, intendedRecipient: recipients.intendedRecipient, actualRecipient: recipients.actualRecipient },
    })
    processed.push({ id: scheduled.id, sendId, status: sendStatus, providerMessageId })
  }
  return processed
}

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  if (request.method === 'GET') {
    const { results } = await db
      .prepare('SELECT * FROM scheduled_sends ORDER BY scheduled_at ASC, created_at DESC LIMIT 100')
      .all()
    return json({ scheduledSends: (results || []).map(mapScheduled), sendWindows: await activeSendWindows(db) })
  }

  if (request.method !== 'POST') return methodNotAllowed()

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  if (body.due) {
    const processed = await processDueSends(db, env, { limit: Number.parseInt(body.limit || '10', 10) || 10 })
    return json({ processed })
  }

  const leadId = String(body.leadId || '')
  const windowTime = String(body.windowTime || '').trim()
  if (!leadId) return json({ error: 'leadId is required' }, { status: 400 })

  const windows = await activeSendWindows(db)
  const selectedWindow = normalizeSendWindows([windowTime])[0] || windows[0]
  if (!windows.includes(selectedWindow)) {
    return json({ error: `Send window ${selectedWindow} is not configured.` }, { status: 400 })
  }

  const lead = await getLead(db, leadId)
  if (!lead) return json({ error: 'Lead not found' }, { status: 404 })

  const safety = buildScheduleSafety(lead, selectedWindow)
  if (!safety.ok) return json({ error: 'Lead is not safe to schedule.', safetyChecks: safety.checks }, { status: 409 })

  const now = nowIso()
  const scheduledAt = body.scheduledAt || nextScheduledTime(selectedWindow)
  const scheduleId = newId('scheduled_send')

  await db
    .prepare(
      `INSERT INTO scheduled_sends (
        id, lead_id, contact_email, subject, body, status, scheduled_at,
        send_window_label, approval_status, confidence, safety_checks_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      scheduleId,
      leadId,
      lead.email,
      lead.draft_subject,
      lead.draft_body,
      'scheduled',
      scheduledAt,
      selectedWindow,
      lead.status === 'approved' ? 'approved' : 'auto_eligible',
      Number.parseInt(lead.fit_score || '0', 10) || 0,
      JSON.stringify(safety.checks),
      now,
      now,
    )
    .run()

  await db.prepare('UPDATE leads SET status = ?, updated_at = ? WHERE id = ?').bind('preview_ready', now, leadId).run()
  await addActivity(db, {
    leadId,
    type: 'send_scheduled',
    label: `${lead.company} scheduled for ${selectedWindow}`,
    metadata: { scheduleId, scheduledAt, windowTime: selectedWindow, safetyChecks: safety.checks },
  })

  const row = await db.prepare('SELECT * FROM scheduled_sends WHERE id = ?').bind(scheduleId).first()
  return json({ scheduledSend: mapScheduled(row) })
}
