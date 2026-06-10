import { json } from './json.js'

const COOKIE_NAME = 'capsigma_session'
const ONE_DAY_SECONDS = 24 * 60 * 60

function base64Url(input) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || ''
  const parts = cookie.split(';').map((part) => part.trim())
  const match = parts.find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : ''
}

async function sign(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  )
  return base64Url(signature)
}

function sessionSecret(env) {
  return env.AUTH_SECRET || env.ADMIN_PASSWORD || ''
}

export async function createSessionCookie(request, env) {
  const secret = sessionSecret(env)
  if (!secret) {
    throw new Error('AUTH_SECRET or ADMIN_PASSWORD is not configured')
  }

  const exp = Math.floor(Date.now() / 1000) + ONE_DAY_SECONDS
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({ exp })))
  const signature = await sign(secret, payload)
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''

  return `${COOKIE_NAME}=${encodeURIComponent(`${payload}.${signature}`)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ONE_DAY_SECONDS}${secure}`
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`
}

export async function isAuthenticated(request, env) {
  const secret = sessionSecret(env)
  if (!secret) return false

  const token = getCookie(request, COOKIE_NAME)
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  const expected = await sign(secret, payload)
  if (expected !== signature) return false

  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/')
    const jsonText = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
    const parsed = JSON.parse(jsonText)
    return Number(parsed.exp) > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export async function requireAuth(request, env) {
  if (await isAuthenticated(request, env)) return null
  return json({ error: 'Unauthorized' }, { status: 401 })
}
