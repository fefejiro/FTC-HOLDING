import { requireAuth } from '../../_lib/auth.js'
import { addActivity, getDb, newId } from '../../_lib/db.js'
import { backfillEvidenceFromLeads, logAgentEvent } from '../../_lib/evidence.js'
import { json, methodNotAllowed } from '../../_lib/json.js'

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth
  if (request.method !== 'POST') return methodNotAllowed()

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const runId = newId('backfill_run')
  const result = await backfillEvidenceFromLeads(db)
  await logAgentEvent(db, {
    runId,
    workerName: 'Evidence Backfill Worker',
    eventType: 'evidence_backfilled',
    output: result,
    confidence: 90,
  })
  await addActivity(db, {
    type: 'evidence_backfilled',
    label: `Backfilled evidence for ${result.leadsScanned} lead${result.leadsScanned === 1 ? '' : 's'}`,
    metadata: { runId, ...result },
  })

  return json({ runId, ...result })
}
