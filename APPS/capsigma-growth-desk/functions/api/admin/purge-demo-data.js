import { requireAuth } from '../../_lib/auth.js'
import { addActivity, getDb, newId, nowIso } from '../../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../../_lib/json.js'
import { assertPurgeConfirmation, buildPurgePlan, PURGE_CONFIRMATION } from '../../_lib/demo-purge.js'

async function allRows(db, table) {
  const { results } = await db.prepare(`SELECT * FROM ${table}`).all()
  return results || []
}

async function deleteByIds(db, table, ids) {
  for (const id of ids) {
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run()
  }
}

async function readPlan(db) {
  const [leads, drafts, sends, replies, activities] = await Promise.all([
    allRows(db, 'leads'),
    allRows(db, 'drafts'),
    allRows(db, 'send_events'),
    allRows(db, 'replies'),
    allRows(db, 'activities'),
  ])
  return buildPurgePlan({ leads, drafts, sends, replies, activities })
}

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  if (request.method !== 'GET' && request.method !== 'POST') return methodNotAllowed()

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const plan = await readPlan(db)
  const dryRun = request.method === 'GET'

  if (dryRun) {
    return json({
      dryRun: true,
      confirmationPhrase: PURGE_CONFIRMATION,
      counts: plan.counts,
      preservedConfig: plan.preservedConfig,
      sampleLeadIds: plan.leadIds.slice(0, 10),
    })
  }

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })
  if (!assertPurgeConfirmation(body.confirmation)) {
    return json({
      error: `Type ${PURGE_CONFIRMATION} to confirm purge.`,
      requiredConfirmation: PURGE_CONFIRMATION,
    }, { status: 400 })
  }

  await deleteByIds(db, 'replies', plan.replyIds)
  await deleteByIds(db, 'send_events', plan.sendIds)
  await deleteByIds(db, 'drafts', plan.draftIds)
  await deleteByIds(db, 'activities', plan.activityIds)
  await deleteByIds(db, 'leads', plan.leadIds)

  const snapshotId = newId('preserved_config_snapshot')
  const purgedAt = nowIso()
  await addActivity(db, {
    type: 'demo_data_purged',
    label: `Purged ${plan.counts.leads} demo/test lead${plan.counts.leads === 1 ? '' : 's'}`,
    metadata: {
      counts: plan.counts,
      preservedConfig: plan.preservedConfig,
      preservedConfigSnapshotId: snapshotId,
      purgedAt,
    },
  })

  return json({
    ok: true,
    purgedAt,
    counts: plan.counts,
    preservedConfig: plan.preservedConfig,
    preservedConfigSnapshotId: snapshotId,
  })
}
