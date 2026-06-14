function base64Url(bytes) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value) {
  const padded = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function encryptionKey(secret) {
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY is not configured')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptSecret(value, secret) {
  if (!value) return ''
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await encryptionKey(secret)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(String(value)),
  )
  return `${base64Url(iv)}.${base64Url(new Uint8Array(ciphertext))}`
}

export async function decryptSecret(value, secret) {
  if (!value) return ''
  const [ivText, cipherText] = String(value).split('.')
  if (!ivText || !cipherText) return ''
  const key = await encryptionKey(secret)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64Url(ivText) },
    key,
    fromBase64Url(cipherText),
  )
  return new TextDecoder().decode(plaintext)
}
