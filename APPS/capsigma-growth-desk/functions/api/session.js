import { isAuthenticated } from '../_lib/auth.js'
import { getDb } from '../_lib/db.js'
import { json } from '../_lib/json.js'

export async function onRequestGet({ request, env }) {
  const authenticated = await isAuthenticated(request, env)
  return json({
    authenticated,
    configured: {
      database: Boolean(getDb(env)),
      openai: Boolean(env.OPENAI_API_KEY),
      sendgrid: Boolean(env.SENDGRID_API_KEY),
      fromEmail: env.SENDGRID_FROM_EMAIL || '',
    },
  })
}
