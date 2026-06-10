import { createSessionCookie } from '../_lib/auth.js'
import { json, methodNotAllowed, readJson } from '../_lib/json.js'

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return methodNotAllowed()

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  if (!env.ADMIN_PASSWORD) {
    return json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 })
  }

  if (String(body.password || '') !== env.ADMIN_PASSWORD) {
    return json({ error: 'Invalid password' }, { status: 401 })
  }

  const cookie = await createSessionCookie(request, env)
  return json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': cookie,
      },
    },
  )
}
