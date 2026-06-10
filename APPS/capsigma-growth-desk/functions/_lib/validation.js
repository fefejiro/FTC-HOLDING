const PLACEHOLDER_EMAIL_PATTERNS = [
  /^first(name)?[._-]?last(name)?@/i,
  /^name@/i,
  /^contact@$/i,
  /example\./i,
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
    fit_score: Number.parseInt(input.fitScore || input.fit_score || 0, 10) || 0,
    reason: String(input.reason || '').trim(),
    contact_name: String(input.contactName || input.contact_name || '').trim(),
    contact_title: contactTitle,
    email,
    source_url: sourceUrl,
    source: String(input.source || '').trim(),
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

export function canSendLead(lead) {
  if (!lead?.email) return { ok: false, reason: 'Lead has no email address.' }
  if (!isValidEmail(lead.email)) return { ok: false, reason: 'Lead email is invalid.' }
  if (isPlaceholderEmail(lead.email)) {
    return { ok: false, reason: 'Lead email appears to be a placeholder.' }
  }
  if (!lead.draft_body) return { ok: false, reason: 'Lead has no approved draft.' }
  return { ok: true, reason: '' }
}
