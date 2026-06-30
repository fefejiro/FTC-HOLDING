export const PURGE_CONFIRMATION = 'PURGE CAPSIGMA DEMO DATA'

const DEMO_PATTERNS = [
  /\bdemo\b/i,
  /\btest\b/i,
  /\bsmoke\b/i,
  /\binternal qa\b/i,
  /\binternal production\b/i,
  /\bproduction recipient delivery test\b/i,
  /\bproduction smoke test\b/i,
  /\bcapsigma-recipient-test\b/i,
  /\bcapsigma-internal-smoke\b/i,
  /\bexample\.(com|org|net)\b/i,
]

const PRESERVED_CONFIG = [
  'CapSigma company intelligence',
  'campaign parameters',
  'sender settings',
  'approved templates',
  'suppression list',
  'system users',
]

function stringifyRecord(record = {}) {
  return Object.values(record)
    .map((value) => {
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return JSON.stringify(value)
      return String(value)
    })
    .join(' ')
}

export function isDemoRecord(record = {}) {
  const text = stringifyRecord(record)
  return DEMO_PATTERNS.some((pattern) => pattern.test(text))
}

export function buildPurgePlan({ leads = [], drafts = [], sends = [], replies = [], activities = [] }) {
  const demoLeadIds = new Set(leads.filter(isDemoRecord).map((lead) => lead.id).filter(Boolean))
  const demoSendIds = new Set()

  const draftIds = drafts
    .filter((draft) => demoLeadIds.has(draft.lead_id) || isDemoRecord(draft))
    .map((draft) => draft.id)
    .filter(Boolean)

  const sendIds = sends
    .filter((send) => demoLeadIds.has(send.lead_id) || isDemoRecord(send))
    .map((send) => {
      if (send.id) demoSendIds.add(send.id)
      return send.id
    })
    .filter(Boolean)

  const replyIds = replies
    .filter((reply) => demoLeadIds.has(reply.lead_id) || demoSendIds.has(reply.send_event_id) || isDemoRecord(reply))
    .map((reply) => reply.id)
    .filter(Boolean)

  const activityIds = activities
    .filter((activity) => demoLeadIds.has(activity.lead_id) || isDemoRecord(activity))
    .map((activity) => activity.id)
    .filter(Boolean)

  return {
    leadIds: [...demoLeadIds],
    draftIds,
    sendIds,
    replyIds,
    activityIds,
    counts: {
      leads: demoLeadIds.size,
      drafts: draftIds.length,
      sends: sendIds.length,
      replies: replyIds.length,
      activities: activityIds.length,
    },
    preservedConfig: PRESERVED_CONFIG,
  }
}

export function assertPurgeConfirmation(value) {
  return String(value || '').trim() === PURGE_CONFIRMATION
}
