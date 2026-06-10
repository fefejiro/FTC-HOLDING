export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
}

export function methodNotAllowed() {
  return json({ error: 'Method not allowed' }, { status: 405 })
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}
