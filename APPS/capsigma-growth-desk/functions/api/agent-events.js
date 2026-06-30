import { requireAuth } from '../_lib/auth.js'
import { getDb } from '../_lib/db.js'
import { json, methodNotAllowed } from '../_lib/json.js'

function mapEvent(row) {
  return {
    id: row.id,
    runId: row.run_id,
    leadId: row.lead_id,
    workerName: row.worker_name,
    eventType: row.event_type,
    status: row.status,
    input: JSON.parse(row.input_json || '{}'),
    output: JSON.parse(row.output_json || '{}'),
    confidence: row.confidence,
    error: row.error,
    createdAt: row.created_at,
  }
}

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth
  if (request.method !== 'GET') return methodNotAllowed()

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const url = new URL(request.url)
  const runId = url.searchParams.get('runId') || ''
  const leadId = url.searchParams.get('leadId') || ''
  let query = 'SELECT * FROM agent_run_events ORDER BY created_at DESC LIMIT 200'
  let stmt = db.prepare(query)
  if (runId) stmt = db.prepare('SELECT * FROM agent_run_events WHERE run_id = ? ORDER BY created_at DESC LIMIT 200').bind(runId)
  if (leadId) stmt = db.prepare('SELECT * FROM agent_run_events WHERE lead_id = ? ORDER BY created_at DESC LIMIT 200').bind(leadId)

  const { results } = await stmt.all()
  return json({ events: (results || []).map(mapEvent) })
}
