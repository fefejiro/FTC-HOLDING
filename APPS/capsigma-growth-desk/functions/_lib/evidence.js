import { newId, nowIso } from './db.js'

export const DEFAULT_SEND_WINDOWS = ['08:00', '15:00']

export const DEFAULT_INTELLIGENCE = {
  positioning: {
    short: 'Your data, our discipline.',
    valueProposition: 'CapSigma helps teams turn messy records, forms, and operational data into reliable processing workflows.',
    preferredCta: 'Explore a no-cost pilot',
    tone: 'Direct, useful, specific, and human',
    forbiddenClaims: 'No fabricated relationships, no guaranteed savings, no unsupported compliance claims.',
  },
  services: [
    'Forms and Records Digitization',
    'Operational and Transaction Processing',
    'Data Cleansing and Enrichment',
    'Clinical and Administrative Support',
    'Financial Transaction Processing',
    'AI data labeling',
    'Lease abstraction',
    'Logistics manifest processing',
  ],
  industries: ['Healthcare', 'Energy', 'Financial Services', 'Logistics', 'Real Estate', 'Retail', 'SaaS/Tech'],
  differentiators: [
    'CapSigma Protocol',
    'Golden Set / quality standards',
    'Zero-trust security posture',
    'US governance / West Africa delivery',
    'Transparent reporting',
    'Free pilot offer',
  ],
  parameters: {
    targetCountry: 'United States',
    targetLocations: ['Houston, TX'],
    startingRadius: 25,
    radiusIncrement: 25,
    maxRadius: 100,
    maxLeadsPerRun: 25,
    maxLeadsPerDay: 50,
    maxEmailsPerDay: 25,
    includedIndustries: ['Healthcare', 'Energy', 'Financial Services', 'Logistics', 'Real Estate'],
    excludedIndustries: [],
    includedTitles: ['Operations', 'Revenue Operations', 'Finance', 'Records', 'Administration'],
    excludedTitles: [],
    emailValidationMinimum: 70,
    fitScoreMinimum: 60,
    autoDraftThreshold: 70,
    autoScheduleThreshold: 80,
    automationMode: 'review_required',
  },
  sendWindows: DEFAULT_SEND_WINDOWS,
}

function safeJson(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function parseJsonField(value, fallback) {
  return safeJson(value, fallback)
}

export function normalizeSendWindows(value) {
  const input = Array.isArray(value) ? value : String(value || '').split(',')
  const windows = input
    .map((item) => String(item || '').trim())
    .filter((item) => /^([01]\d|2[0-3]):[0-5]\d$/.test(item))
  return [...new Set(windows)].slice(0, 6)
}

export function normalizeIntelligenceInput(input = {}) {
  const parameters = {
    ...DEFAULT_INTELLIGENCE.parameters,
    ...(input.parameters || {}),
  }
  const sendWindows = normalizeSendWindows(input.sendWindows || parameters.sendWindows || DEFAULT_SEND_WINDOWS)
  return {
    positioning: { ...DEFAULT_INTELLIGENCE.positioning, ...(input.positioning || {}) },
    services: Array.isArray(input.services) ? input.services : DEFAULT_INTELLIGENCE.services,
    industries: Array.isArray(input.industries) ? input.industries : DEFAULT_INTELLIGENCE.industries,
    differentiators: Array.isArray(input.differentiators) ? input.differentiators : DEFAULT_INTELLIGENCE.differentiators,
    parameters,
    sendWindows: sendWindows.length ? sendWindows : DEFAULT_SEND_WINDOWS,
  }
}

export function mapIntelligence({ version, settings }) {
  if (!version && !settings) return DEFAULT_INTELLIGENCE
  const base = version
    ? {
        positioning: parseJsonField(version.positioning_json, DEFAULT_INTELLIGENCE.positioning),
        services: parseJsonField(version.services_json, DEFAULT_INTELLIGENCE.services),
        industries: parseJsonField(version.industries_json, DEFAULT_INTELLIGENCE.industries),
        differentiators: parseJsonField(version.differentiators_json, DEFAULT_INTELLIGENCE.differentiators),
        parameters: parseJsonField(version.parameters_json, DEFAULT_INTELLIGENCE.parameters),
        sendWindows: parseJsonField(version.send_windows_json, DEFAULT_SEND_WINDOWS),
        versionId: version.id,
        versionNumber: version.version_number,
        createdAt: version.created_at,
      }
    : DEFAULT_INTELLIGENCE

  if (!settings) return base
  return {
    ...base,
    parameters: {
      ...base.parameters,
      targetCountry: settings.target_country || base.parameters.targetCountry,
      targetLocations: parseJsonField(settings.target_locations_json, base.parameters.targetLocations),
      startingRadius: settings.starting_radius,
      radiusIncrement: settings.radius_increment,
      maxRadius: settings.max_radius,
      maxLeadsPerRun: settings.max_leads_per_run,
      maxLeadsPerDay: settings.max_leads_per_day,
      maxEmailsPerDay: settings.max_emails_per_day,
      includedIndustries: parseJsonField(settings.included_industries_json, base.parameters.includedIndustries),
      excludedIndustries: parseJsonField(settings.excluded_industries_json, base.parameters.excludedIndustries),
      includedTitles: parseJsonField(settings.included_titles_json, base.parameters.includedTitles),
      excludedTitles: parseJsonField(settings.excluded_titles_json, base.parameters.excludedTitles),
      emailValidationMinimum: settings.email_validation_minimum,
      fitScoreMinimum: settings.fit_score_minimum,
      autoDraftThreshold: settings.auto_draft_threshold,
      autoScheduleThreshold: settings.auto_schedule_threshold,
      automationMode: settings.automation_mode || base.parameters.automationMode,
    },
    sendWindows: parseJsonField(settings.send_windows_json, base.sendWindows),
  }
}

export async function recordLeadEvidence(db, lead, { sourceType = 'lead_import', sourceName = '' } = {}) {
  const now = nowIso()
  const emailCheck = checkEmailDomain({ email: lead.email, sourceUrl: lead.source_url })
  if (lead.source_url || lead.source || lead.discovery_run_id || lead.evidence_json) {
    await db
      .prepare(
        `INSERT OR REPLACE INTO lead_sources (
          id, lead_id, source_type, source_name, source_url, search_query,
          search_parameters_json, discovered_at, agent_run_id, raw_payload_json,
          confidence_score, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        `source_${lead.id}`,
        lead.id,
        sourceType,
        sourceName || lead.source || '',
        lead.source_url || '',
        '',
        '{}',
        lead.created_at || now,
        lead.discovery_run_id || '',
        lead.evidence_json || '{}',
        lead.source_url ? 80 : 40,
        now,
      )
      .run()
  }

  if (lead.email) {
    await db
      .prepare(
        `INSERT OR REPLACE INTO email_evidence (
          id, lead_id, email, source_type, source_name, discovery_method,
          validation_status, validation_confidence, verified_at, domain_match,
          mx_check_status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        `email_${lead.id}`,
        lead.id,
        lead.email,
        sourceType,
        sourceName || lead.source || '',
        lead.source_url ? 'source_record' : 'manual_import',
        emailCheck.formatValid ? (emailCheck.domainMatch ? 'format_valid_domain_match' : 'format_valid_domain_unmatched') : 'invalid',
        emailCheck.formatValid ? (emailCheck.domainMatch ? 80 : 65) : 0,
        now,
        emailCheck.domainMatch ? 1 : 0,
        emailCheck.mxCheckStatus,
        'Normalized from current lead record.',
        now,
      )
      .run()
  }
}

export async function logAgentEvent(db, {
  runId,
  leadId = '',
  workerName,
  eventType,
  status = 'completed',
  input = {},
  output = {},
  confidence = 0,
  error = '',
}) {
  const id = newId('agent_event')
  const createdAt = nowIso()
  await db
    .prepare(
      `INSERT INTO agent_run_events (
        id, run_id, lead_id, worker_name, event_type, status,
        input_json, output_json, confidence, error, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      runId,
      leadId,
      workerName,
      eventType,
      status,
      JSON.stringify(input),
      JSON.stringify(output),
      confidence,
      error,
      createdAt,
    )
    .run()
  return { id, runId, leadId, workerName, eventType, status, createdAt }
}

export async function backfillEvidenceFromLeads(db) {
  const { results } = await db.prepare('SELECT * FROM leads ORDER BY created_at ASC').all()
  let sourceRows = 0
  let emailRows = 0
  for (const lead of results || []) {
    const beforeSources = await db.prepare('SELECT COUNT(*) AS count FROM lead_sources WHERE lead_id = ?').bind(lead.id).first()
    const beforeEmails = await db.prepare('SELECT COUNT(*) AS count FROM email_evidence WHERE lead_id = ?').bind(lead.id).first()
    await recordLeadEvidence(db, lead, { sourceType: lead.discovery_run_id ? 'backfill_prospect_run' : 'backfill_legacy_lead', sourceName: lead.source || 'legacy lead record' })
    const afterSources = await db.prepare('SELECT COUNT(*) AS count FROM lead_sources WHERE lead_id = ?').bind(lead.id).first()
    const afterEmails = await db.prepare('SELECT COUNT(*) AS count FROM email_evidence WHERE lead_id = ?').bind(lead.id).first()
    sourceRows += Math.max(0, Number(afterSources?.count || 0) - Number(beforeSources?.count || 0))
    emailRows += Math.max(0, Number(afterEmails?.count || 0) - Number(beforeEmails?.count || 0))
  }
  return { leadsScanned: (results || []).length, sourceRows, emailRows }
}

export function domainFromEmail(email = '') {
  return String(email || '').split('@')[1]?.toLowerCase() || ''
}

export function checkEmailDomain({ email = '', sourceUrl = '' }) {
  const domain = domainFromEmail(email)
  let sourceHost = ''
  try {
    sourceHost = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    sourceHost = ''
  }
  return {
    domain,
    formatValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    domainMatch: Boolean(domain && sourceHost && (sourceHost === domain || sourceHost.endsWith(`.${domain}`) || domain.endsWith(sourceHost))),
    mxCheckStatus: domain ? 'not_checked_provider_needed' : 'missing_domain',
  }
}

export function nextScheduledTime(windowTime, from = new Date()) {
  const [hour, minute] = String(windowTime || DEFAULT_SEND_WINDOWS[0]).split(':').map((part) => Number.parseInt(part, 10))
  const scheduled = new Date(from)
  scheduled.setHours(Number.isFinite(hour) ? hour : 8, Number.isFinite(minute) ? minute : 0, 0, 0)
  if (scheduled <= from) scheduled.setDate(scheduled.getDate() + 1)
  return scheduled.toISOString()
}

export function buildScheduleSafety(lead, windowTime) {
  const checks = {
    qualified: ['qualified', 'drafted', 'approved'].includes(lead.status),
    hasVerifiedFormatEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email || ''),
    hasDraft: Boolean(lead.draft_subject && lead.draft_body),
    sendWindow: normalizeSendWindows([windowTime]).length === 1,
  }
  return {
    ok: Object.values(checks).every(Boolean),
    checks,
  }
}
