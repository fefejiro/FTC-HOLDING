const PLACEHOLDER_EMAIL_PATTERNS = [
  /^first(name)?[._-]?last(name)?@/i,
  /^name@/i,
  /^contact@$/i,
  /example\./i,
]

const SERVICE_LANE_KEYWORDS = [
  ['admin_processing', ['admin processing', 'administrative support', 'back office', 'back-office', 'operations support']],
  ['forms_records_digitization', ['forms', 'records', 'digitization', 'document intake', 'document processing']],
  ['data_cleanup', ['data cleanup', 'data cleansing', 'data enrichment', 'crm cleanup', 'data quality']],
  ['transaction_processing', ['transaction processing', 'invoice', 'ap ', 'ar ', 'reconciliation', 'payment processing']],
  ['non_clinical_support', ['non-clinical', 'referral', 'insurance verification', 'scheduling records']],
  ['back_office_operations', ['workflow', 'processing workflows', 'operational processing', 'operations data']],
]

const FORBIDDEN_DRAFT_PATTERNS = [
  { pattern: /\b(e+)?u+m+\b/i, reason: 'Draft contains filler text.' },
  { pattern: /\beem+\b/i, reason: 'Draft contains filler text.' },
  { pattern: /[\u2013\u2014]/, reason: 'Draft contains non-ASCII dash punctuation.' },
  { pattern: /--+/, reason: 'Draft contains repeated dash filler.' },
  { pattern: /__+/, reason: 'Draft contains repeated underscore filler.' },
  { pattern: /\[[^\]]+\]/, reason: 'Draft contains bracketed placeholder text.' },
  { pattern: /\b(your|insert|placeholder)\s+(name|email|phone|contact|company)\b/i, reason: 'Draft contains placeholder language.' },
]

const HEALTHCARE_CONTEXT_PATTERNS = [
  /\bhealth(care)?\b/i,
  /\bmedical\b/i,
  /\bclinical\b/i,
  /\bnon[-\s]?clinical\b/i,
  /\bpatient(s)?\b/i,
  /\bhospital(s)?\b/i,
  /\bclinic(s)?\b/i,
  /\bphysician(s)?\b/i,
  /\bpharma(ceutical)?\b/i,
  /\brevenue cycle\b/i,
  /\binsurance verification\b/i,
  /\bhipaa\b/i,
]

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function isPlaceholderEmail(email) {
  const value = String(email || '').trim()
  if (!value) return true
  return PLACEHOLDER_EMAIL_PATTERNS.some((pattern) => pattern.test(value))
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

export function normalizeFitScore(value) {
  const parsed = Number.parseFloat(String(value ?? '').trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  const scaled = parsed <= 10 ? parsed * 10 : parsed
  return Math.round(scaled)
}

export function normalizeLead(input = {}) {
  const company = String(input.company || '').trim()
  const contactTitle = String(input.contactTitle || input.contact_title || input.contact || '').trim()
  const email = String(input.email || input.emailGuess || '').trim().toLowerCase()
  const sourceUrl = String(input.sourceUrl || input.source_url || '').trim()
  const idSeed = `${company}-${email || contactTitle || Date.now()}`

  return {
    id: String(input.id || `lead_${slugify(idSeed)}`).slice(0, 96),
    company,
    industry: String(input.industry || '').trim(),
    fit_score: normalizeFitScore(input.fitScore || input.fit_score || 0),
    reason: String(input.reason || '').trim(),
    contact_name: String(input.contactName || input.contact_name || '').trim(),
    contact_title: contactTitle,
    email,
    source_url: sourceUrl,
    source: String(input.source || '').trim(),
    service_lane: String(input.serviceLane || input.service_lane || '').trim(),
    research_summary: String(input.researchSummary || input.research_summary || '').trim(),
    evidence_json: typeof input.evidenceJson === 'string'
      ? input.evidenceJson
      : JSON.stringify(input.evidence || input.evidence_json || {}),
    review_status: String(input.reviewStatus || input.review_status || '').trim(),
    discovery_run_id: String(input.discoveryRunId || input.discovery_run_id || '').trim(),
    status: String(input.status || 'new').trim() || 'new',
  }
}

export function validateLead(lead) {
  const errors = []
  if (!lead.company) errors.push('company is required')
  if (lead.email && !isValidEmail(lead.email)) errors.push('email must be valid')
  if (lead.fit_score < 0 || lead.fit_score > 100) {
    errors.push('fit score must be between 0 and 100')
  }
  return errors
}

export function sanitizeOutreachText(text) {
  return String(text || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/--+/g, '-')
    .replace(/__+/g, '')
    .replace(/\b(e+)?u+m+\b/gi, '')
    .replace(/\beem+\b/gi, '')
    .replace(/\[[^\]]*(contact|email|phone|name|title|information|company)[^\]]*\]/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function scanDraftQuality(subject = '', body = '') {
  const text = `${subject}\n${body}`
  const issues = FORBIDDEN_DRAFT_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ reason }) => reason)
  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
  }
}

export function isHealthcareContext(lead = {}) {
  const text = [
    lead.company,
    lead.industry,
    lead.reason,
    lead.contact_title,
    lead.service_lane || lead.serviceLane,
    lead.research_summary || lead.researchSummary,
    lead.source,
  ]
    .filter(Boolean)
    .join(' ')

  return HEALTHCARE_CONTEXT_PATTERNS.some((pattern) => pattern.test(text))
}

export function scanDraftQualityForLead(lead = {}, subject = '', body = '') {
  const base = scanDraftQuality(subject, body)
  const issues = [...base.issues]
  const text = `${subject}\n${body}`

  if (/\bHIPAA\b/i.test(text) && !isHealthcareContext(lead)) {
    issues.push('Draft mentions HIPAA outside a healthcare or medical context.')
  }

  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
  }
}

export function inferServiceLane(lead = {}) {
  const explicit = String(lead.service_lane || lead.serviceLane || '').trim()
  if (explicit) return explicit

  const haystack = [
    lead.industry,
    lead.reason,
    lead.research_summary,
    lead.source,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  for (const [lane, keywords] of SERVICE_LANE_KEYWORDS) {
    if (keywords.some((keyword) => haystack.includes(keyword))) return lane
  }

  return ''
}

export function canSendLead(lead) {
  if (!lead?.email) return { ok: false, reason: 'Lead has no email address.' }
  if (!isValidEmail(lead.email)) return { ok: false, reason: 'Lead email is invalid.' }
  if (isPlaceholderEmail(lead.email)) {
    return { ok: false, reason: 'Lead email appears to be a placeholder.' }
  }
  if (!lead.draft_body) return { ok: false, reason: 'Lead has no draft.' }
  const draftQuality = scanDraftQualityForLead(lead, lead.draft_subject || '', lead.draft_body)
  if (!draftQuality.ok) return { ok: false, reason: draftQuality.issues.join(' ') }
  return { ok: true, reason: '' }
}

export function canAutoSendLead(lead, { suppressed = false, minFitScore = 60 } = {}) {
  const base = canSendLead(lead)
  if (!base.ok) return base
  if (suppressed) return { ok: false, reason: 'Recipient is suppressed.' }
  if (!lead.source_url) return { ok: false, reason: 'Lead has no public source URL.' }
  if ((Number.parseInt(lead.fit_score || lead.fitScore || 0, 10) || 0) < minFitScore) {
    return { ok: false, reason: `Fit score is below ${minFitScore}.` }
  }
  const lane = inferServiceLane(lead)
  if (!lane) {
    return { ok: false, reason: 'Lead does not match a CapSigma service lane.' }
  }
  return { ok: true, reason: '', serviceLane: lane }
}
