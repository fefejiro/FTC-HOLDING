import { requireAuth } from '../_lib/auth.js'
import { getDb } from '../_lib/db.js'
import { json, methodNotAllowed } from '../_lib/json.js'

function mapSource(row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    sourceType: row.source_type,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    providerRecordId: row.provider_record_id,
    searchQuery: row.search_query,
    searchParameters: JSON.parse(row.search_parameters_json || '{}'),
    radiusValue: row.radius_value,
    radiusUnit: row.radius_unit,
    locationSeed: row.location_seed,
    discoveredAt: row.discovered_at,
    agentRunId: row.agent_run_id,
    rawPayload: JSON.parse(row.raw_payload_json || '{}'),
    confidenceScore: row.confidence_score,
    createdAt: row.created_at,
  }
}

function mapEmail(row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    contactId: row.contact_id,
    email: row.email,
    sourceType: row.source_type,
    sourceName: row.source_name,
    discoveryMethod: row.discovery_method,
    validationProvider: row.validation_provider,
    validationStatus: row.validation_status,
    validationConfidence: row.validation_confidence,
    verifiedAt: row.verified_at,
    domainMatch: Boolean(row.domain_match),
    mxCheckStatus: row.mx_check_status,
    bounceStatus: row.bounce_status,
    notes: row.notes,
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
  const leadId = url.searchParams.get('leadId') || ''
  const sourceQuery = leadId
    ? db.prepare('SELECT * FROM lead_sources WHERE lead_id = ? ORDER BY created_at DESC').bind(leadId)
    : db.prepare('SELECT * FROM lead_sources ORDER BY created_at DESC LIMIT 200')
  const emailQuery = leadId
    ? db.prepare('SELECT * FROM email_evidence WHERE lead_id = ? ORDER BY created_at DESC').bind(leadId)
    : db.prepare('SELECT * FROM email_evidence ORDER BY created_at DESC LIMIT 200')

  const [sources, emails] = await Promise.all([sourceQuery.all(), emailQuery.all()])
  return json({
    leadSources: (sources.results || []).map(mapSource),
    emailEvidence: (emails.results || []).map(mapEmail),
  })
}
