import { isAuthenticated } from '../_lib/auth.js'
import { getDb } from '../_lib/db.js'
import { getActiveGmailConnection, gmailConfigured } from '../_lib/gmail.js'
import { json } from '../_lib/json.js'

export async function onRequestGet({ request, env }) {
  const authenticated = await isAuthenticated(request, env)
  const db = getDb(env)
  const gmailConnection = db ? await getActiveGmailConnection(db) : null
  return json({
    authenticated,
    configured: {
      database: Boolean(db),
      openai: Boolean(env.OPENAI_API_KEY),
      sendgrid: Boolean(env.SENDGRID_API_KEY),
      gmail: gmailConfigured(env),
      gmailConnected: Boolean(gmailConnection),
      gmailEmail: gmailConnection?.email || '',
      fromEmail: env.SENDGRID_FROM_EMAIL || '',
      replyToEmail: env.SENDGRID_REPLY_TO_EMAIL || env.SENDGRID_FROM_EMAIL || '',
      recipientOverride: env.OUTBOUND_RECIPIENT_OVERRIDE || '',
      sandboxMode: Boolean(env.OUTBOUND_RECIPIENT_OVERRIDE),
      autoSendMinFitScore: Number.parseInt(env.AUTO_SEND_MIN_FIT_SCORE || '60', 10),
      ccEmails: String(env.SENDGRID_CC_EMAILS || '')
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean),
      dailySendLimit: Number.parseInt(env.DAILY_SEND_LIMIT || '25', 10),
    },
  })
}
