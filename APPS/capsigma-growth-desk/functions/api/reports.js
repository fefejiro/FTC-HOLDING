import { requireAuth } from '../_lib/auth.js'
import { getDb, newId, nowIso } from '../_lib/db.js'
import { json, methodNotAllowed } from '../_lib/json.js'

async function count(db, sql, ...binds) {
  const row = await db.prepare(sql).bind(...binds).first()
  return Number(row?.count || 0)
}

function buildReportCards(summary) {
  return [
    { id: 'runs-completed', label: 'Runs completed', value: summary.dailyAgentSummary.runsCompleted, metricId: 'new-leads-this-run' },
    { id: 'leads-discovered', label: 'Leads discovered', value: summary.dailyAgentSummary.leadsDiscovered, metricId: 'total-leads' },
    { id: 'emails-scheduled', label: 'Emails scheduled', value: summary.dailyAgentSummary.emailsScheduled, metricId: 'emails-scheduled' },
    { id: 'emails-sent', label: 'Emails sent', value: summary.dailyAgentSummary.emailsSent, metricId: 'emails-sent' },
    { id: 'human-replies', label: 'Human replies', value: summary.dailyAgentSummary.humanReplies, metricId: 'human-replies' },
    { id: 'missing-source', label: 'Missing source', value: summary.sourceQualityReport.missingSource, qualityFilter: 'missing_source', actionLabel: 'Open quality filter' },
    { id: 'missing-email', label: 'Missing email', value: summary.sourceQualityReport.missingEmail, qualityFilter: 'missing_email', actionLabel: 'Open quality filter' },
    { id: 'data-quality-flags', label: 'Data quality flags', value: summary.agentTrustReport.dataQualityFlags, qualityFilter: 'needs_review', actionLabel: 'Open quality filter' },
  ]
}

function mapSnapshot(row) {
  return {
    id: row.id,
    reportType: row.report_type,
    title: row.title,
    summary: JSON.parse(row.summary_json || '{}'),
    drilldowns: JSON.parse(row.drilldowns_json || '{}'),
    createdAt: row.created_at,
  }
}

export async function onRequest({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth
  if (request.method !== 'GET' && request.method !== 'POST') return methodNotAllowed()

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const rawSummary = {
    dailyAgentSummary: {
      runsCompleted: await count(db, "SELECT COUNT(*) AS count FROM prospect_runs WHERE status = 'completed'"),
      leadsDiscovered: await count(db, 'SELECT COUNT(*) AS count FROM leads'),
      leadsQualified: await count(db, "SELECT COUNT(*) AS count FROM leads WHERE status IN ('qualified','drafted','approved','preview_ready','sandbox_sent','live_sent','sent','replied')"),
      draftsGenerated: await count(db, 'SELECT COUNT(*) AS count FROM drafts'),
      emailsScheduled: await count(db, "SELECT COUNT(*) AS count FROM scheduled_sends WHERE status = 'scheduled'"),
      emailsSent: await count(db, "SELECT COUNT(*) AS count FROM send_events WHERE status IN ('sent','sandbox_sent','live_sent')"),
      repliesReceived: await count(db, "SELECT COUNT(*) AS count FROM replies WHERE COALESCE(lead_id, '') <> '' AND COALESCE(send_event_id, '') <> ''"),
      humanReplies: await count(db, "SELECT COUNT(*) AS count FROM replies WHERE needs_human = 1 AND COALESCE(lead_id, '') <> '' AND COALESCE(send_event_id, '') <> ''"),
    },
    sourceQualityReport: {
      leadsWithSource: await count(db, 'SELECT COUNT(DISTINCT lead_id) AS count FROM lead_sources'),
      verifiedEmails: await count(db, "SELECT COUNT(*) AS count FROM email_evidence WHERE validation_status IN ('valid','format_valid','format_valid_domain_match','format_valid_domain_unmatched')"),
      missingSource: await count(db, "SELECT COUNT(*) AS count FROM leads WHERE COALESCE(source_url, '') = ''"),
      missingEmail: await count(db, "SELECT COUNT(*) AS count FROM leads WHERE COALESCE(email, '') = ''"),
    },
    agentTrustReport: {
      lowConfidenceSources: await count(db, 'SELECT COUNT(*) AS count FROM lead_sources WHERE confidence_score < 60'),
      rejectedLeads: await count(db, "SELECT SUM(rejected_count) AS count FROM prospect_runs"),
      duplicateSummary: 0,
      dataQualityFlags: await count(db, "SELECT COUNT(*) AS count FROM leads WHERE status = 'needs_review' OR COALESCE(review_status, '') <> ''"),
    },
  }

  const drilldowns = {
    leadsDiscovered: { metricId: 'total-leads' },
    emailsScheduled: { table: 'scheduled_sends', status: 'scheduled' },
    humanReplies: { tab: 'Replies', filter: 'needs_attention' },
    missingSource: { qualityFilter: 'missing_source' },
    missingEmail: { qualityFilter: 'missing_email' },
  }
  const summary = buildReportCards(rawSummary)

  if (request.method === 'POST') {
    const id = newId('report')
    const createdAt = nowIso()
    await db
      .prepare('INSERT INTO report_snapshots (id, report_type, title, summary_json, drilldowns_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, 'agent_trust', 'CapSigma Agent Trust Report', JSON.stringify(rawSummary), JSON.stringify(drilldowns), createdAt)
      .run()
    return json({ snapshot: { id, reportType: 'agent_trust', title: 'CapSigma Agent Trust Report', summary: rawSummary, drilldowns, createdAt } })
  }

  const { results } = await db.prepare('SELECT * FROM report_snapshots ORDER BY created_at DESC LIMIT 20').all()
  return json({ summary, rawSummary, drilldowns, snapshots: (results || []).map(mapSnapshot) })
}
