import { requireAuth } from '../_lib/auth.js'
import { getDb, newId, nowIso } from '../_lib/db.js'
import { json, methodNotAllowed } from '../_lib/json.js'

async function count(db, sql) {
  const row = await db.prepare(sql).first()
  return Number(row?.count || 0)
}

function buildCheckList(checks, evidence) {
  return [
    { id: 'database', label: 'D1 database', ok: checks.database, detail: checks.database ? 'CAPSIGMA_DB binding responded.' : 'CAPSIGMA_DB binding is missing.' },
    { id: 'evidenceTables', label: 'Normalized evidence tables', ok: checks.evidenceTables, detail: `${evidence.normalizedSourceCount} source rows, ${evidence.normalizedEmailEvidenceCount} email rows.` },
    { id: 'intelligenceConfigured', label: 'Campaign intelligence', ok: checks.intelligenceConfigured, detail: 'Editable intelligence and campaign settings are available.' },
    { id: 'scheduledQueueReady', label: 'Scheduled send queue', ok: checks.scheduledQueueReady, detail: `${evidence.scheduledSendCount} scheduled send row(s) currently stored.` },
    { id: 'proofLedgerReady', label: 'Proof ledger', ok: checks.proofLedgerReady, detail: 'Activity/proof table exists for operator evidence.' },
    { id: 'gmailConnected', label: 'Reply mailbox', ok: checks.gmailConnected, detail: checks.gmailConnected ? 'Gmail connection record exists.' : 'Connect Gmail before turnkey reply monitoring.' },
    { id: 'sendgridConfigured', label: 'SendGrid delivery', ok: checks.sendgridConfigured, detail: checks.sendgridConfigured ? 'SendGrid key is configured.' : 'Preview-only until SendGrid is configured.' },
    { id: 'sandboxMode', label: 'Sandbox guardrail', ok: checks.sandboxMode, detail: checks.sandboxMode ? 'Outbound override is active.' : 'No sandbox override detected.' },
  ]
}

function mapAcceptanceRun(row) {
  return {
    id: row.id,
    status: row.status,
    checks: JSON.parse(row.checks_json || '{}'),
    evidence: JSON.parse(row.evidence_json || '{}'),
    createdAt: row.created_at,
  }
}

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth
  if (request.method !== 'GET' && request.method !== 'POST') return methodNotAllowed()

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const checks = {
    database: Boolean(db),
    evidenceTables: await count(db, 'SELECT COUNT(*) AS count FROM sqlite_master WHERE type = "table" AND name IN ("lead_sources","email_evidence")') === 2,
    intelligenceConfigured: await count(db, 'SELECT COUNT(*) AS count FROM campaign_settings') > 0,
    scheduledQueueReady: await count(db, 'SELECT COUNT(*) AS count FROM sqlite_master WHERE type = "table" AND name = "scheduled_sends"') === 1,
    proofLedgerReady: await count(db, 'SELECT COUNT(*) AS count FROM sqlite_master WHERE type = "table" AND name = "activities"') === 1,
    gmailConnected: await count(db, 'SELECT COUNT(*) AS count FROM mailbox_connections') > 0,
    sendgridConfigured: Boolean(env.SENDGRID_API_KEY),
    sandboxMode: Boolean(env.OUTBOUND_RECIPIENT_OVERRIDE),
  }
  const ready = Object.values(checks).every(Boolean)
  const status = ready ? 'green' : 'yellow'
  const evidence = {
    checkedAt: nowIso(),
    leadCount: await count(db, 'SELECT COUNT(*) AS count FROM leads'),
    normalizedSourceCount: await count(db, 'SELECT COUNT(*) AS count FROM lead_sources'),
    normalizedEmailEvidenceCount: await count(db, 'SELECT COUNT(*) AS count FROM email_evidence'),
    scheduledSendCount: await count(db, 'SELECT COUNT(*) AS count FROM scheduled_sends'),
    humanReplyCount: await count(db, "SELECT COUNT(*) AS count FROM replies WHERE needs_human = 1 AND COALESCE(lead_id, '') <> '' AND COALESCE(send_event_id, '') <> ''"),
  }

  if (request.method === 'POST') {
    const id = newId('acceptance')
    await db
      .prepare('INSERT INTO acceptance_runs (id, status, checks_json, evidence_json, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, status, JSON.stringify(checks), JSON.stringify(evidence), evidence.checkedAt)
      .run()
    return json({ id, status, ready, checks: buildCheckList(checks, evidence), rawChecks: checks, evidence, lastRun: { id, status, createdAt: evidence.checkedAt } })
  }

  const lastRun = await db.prepare('SELECT * FROM acceptance_runs ORDER BY created_at DESC LIMIT 1').first()
  return json({ status, ready, checks: buildCheckList(checks, evidence), rawChecks: checks, evidence, lastRun: lastRun ? mapAcceptanceRun(lastRun) : null })
}
