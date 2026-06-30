import { useEffect, useMemo, useState } from 'react'

const industries = [
  {
    name: 'Healthcare',
    items: ['Referral management', 'Insurance verification', 'Encounter documentation', 'Scheduling records'],
  },
  {
    name: 'Real Estate',
    items: ['Lease abstraction', 'Property records management', 'Transaction data', 'Tenancy records'],
  },
  {
    name: 'Energy',
    items: ['Field operations logs', 'Maintenance records', 'HSE inspection reports', 'Work orders'],
  },
  {
    name: 'Financial Services',
    items: ['KYC and KYB onboarding data', 'Invoice indexing', 'AP and AR processing', 'Reconciliation support'],
  },
  {
    name: 'Technology and SaaS',
    items: ['CRM cleanup and enrichment', 'AI data labeling', 'Migration support', 'Ticket structuring'],
  },
  {
    name: 'Logistics',
    items: ['Shipment event logs', 'Route records', 'Delivery manifests', 'Tracking data'],
  },
  {
    name: 'Retail',
    items: ['SKU management', 'Product data enrichment', 'E-commerce catalog processing'],
  },
]

const csvExample = `company,industry,fitScore,reason,contactName,contactTitle,email,sourceUrl,source
Acme Health,Healthcare,88,Referral records are handled across disconnected intake teams,Jordan Lee,VP Revenue Operations,jordan.lee@example.com,https://example.com,manual research`

const defaultProspectQuery =
  'Find healthcare, real estate, logistics, and finance companies with records, data cleanup, transaction processing, or back-office workflow needs'
const defaultProspectIndustries = 'Healthcare, Real Estate, Logistics, Financial Services, Retail'
const defaultSendWindows = ['08:00', '15:00']

const statusLabels = {
  new: 'New',
  qualified: 'Qualified',
  drafted: 'Drafted',
  approved: 'Approved',
  needs_review: 'Needs review',
  preview_ready: 'Preview proof',
  sent: 'Sent',
  sandbox_sent: 'Sandbox sent',
  live_sent: 'Live sent',
  replied: 'Replied',
  not_fit: 'Not fit',
  do_not_contact: 'Do not contact',
}

const palette = {
  bg: '#F6F7FA',
  panel: '#FFFFFF',
  panel2: '#F1F4F8',
  line: '#DDE3EC',
  text: '#172033',
  muted: '#647084',
  gold: '#B88A2B',
  green: '#168A56',
  red: '#C2413A',
  blue: '#2563EB',
  amberBg: '#FFF7E6',
  greenBg: '#EAF8F0',
  redBg: '#FFF0EF',
}

function formatTime(value) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function maskEmail(email = '') {
  const [name, domain] = String(email || '').split('@')
  if (!name || !domain) return email || '-'
  return `${name.slice(0, 2)}***@${domain}`
}

function metricValue(leads, status) {
  return leads.filter((lead) => lead.status === status).length
}

function parseEvidenceJson(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function latestTimestamp(records, keys = ['updatedAt', 'createdAt']) {
  const values = records
    .flatMap((record) => keys.map((key) => record[key]).filter(Boolean))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)
  if (!values.length) return ''
  return new Date(Math.max(...values)).toISOString()
}

function includesSearch(record, query) {
  if (!query.trim()) return true
  const needle = query.toLowerCase()
  return Object.values(record).some((value) =>
    String(value || '').toLowerCase().includes(needle),
  )
}

function csvEscape(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadCsv(filename, rows) {
  const headers = [
    'company',
    'contact',
    'email',
    'status',
    'fitScore',
    'source',
    'sourceUrl',
    'discoveryRunId',
    'updatedAt',
  ]
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function toLeadDrilldownRecord(lead) {
  const evidence = parseEvidenceJson(lead.evidenceJson)
  return {
    id: lead.id,
    type: 'lead',
    company: lead.company,
    contact: lead.contactName || lead.contactTitle || '',
    email: lead.email || '',
    status: statusLabels[lead.status] || lead.status,
    rawStatus: lead.status,
    fitScore: lead.fitScore || 0,
    source: lead.source || evidence.sourceTitle || '',
    sourceUrl: lead.sourceUrl || '',
    sourceEvidence: evidence.sourceQuote || evidence.whyReachOut || lead.researchSummary || '',
    discoveryRunId: lead.discoveryRunId || '',
    updatedAt: lead.updatedAt || lead.createdAt || '',
  }
}

function isValidEmailText(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function qualityFlagsForLead(lead = {}) {
  const flags = []
  const evidence = parseEvidenceJson(lead.evidenceJson)
  if (!lead.sourceUrl) flags.push({ type: 'missing_source', label: 'Missing source', severity: 'high' })
  if (!lead.email) flags.push({ type: 'missing_email', label: 'Missing email', severity: 'high' })
  if (lead.email && !isValidEmailText(lead.email)) flags.push({ type: 'invalid_email', label: 'Invalid email', severity: 'high' })
  if (lead.email && /example\.|first|name@/i.test(lead.email)) flags.push({ type: 'unverified_email', label: 'Unverified email', severity: 'medium' })
  if (!lead.serviceLane) flags.push({ type: 'no_service_lane', label: 'No service lane', severity: 'medium' })
  if (!lead.discoveryRunId && !lead.sourceUrl) flags.push({ type: 'low_confidence_source', label: 'Low source confidence', severity: 'medium' })
  if (lead.status === 'needs_review' || lead.reviewStatus) flags.push({ type: 'needs_review', label: 'Needs review', severity: 'medium' })
  if (!evidence.sourceQuote && !evidence.whyReachOut && !lead.researchSummary) {
    flags.push({ type: 'missing_source_evidence', label: 'Thin evidence', severity: 'low' })
  }
  return flags
}

function sourceConfidenceForLead(lead = {}) {
  const flags = qualityFlagsForLead(lead)
  if (!lead.sourceUrl) return { label: 'No source', tone: 'bad' }
  if (flags.some((flag) => flag.severity === 'high')) return { label: 'Needs proof', tone: 'warn' }
  if (lead.discoveryRunId || lead.researchSummary || lead.evidenceJson) return { label: 'Source-backed', tone: 'good' }
  return { label: 'Basic source', tone: 'warn' }
}

function verifiedEmailLabel(lead = {}) {
  if (!lead.email) return { label: 'No email', tone: 'warn' }
  if (!isValidEmailText(lead.email)) return { label: 'Invalid', tone: 'bad' }
  if (/example\.|first|name@/i.test(lead.email)) return { label: 'Unverified', tone: 'warn' }
  return { label: 'Format valid', tone: 'good' }
}

function QualityBadge({ flag }) {
  const color = flag.severity === 'high' ? palette.red : flag.severity === 'medium' ? palette.gold : palette.muted
  return (
    <span style={{ display: 'inline-block', color, border: `1px solid ${color}`, borderRadius: 999, padding: '3px 7px', fontSize: 11, margin: '2px 4px 2px 0' }}>
      {flag.label}
    </span>
  )
}

function StatusPill({ value, tone }) {
  const color = tone === 'good' ? palette.green : tone === 'bad' ? palette.red : palette.gold
  return (
    <span style={{ color, fontWeight: 800, whiteSpace: 'nowrap' }}>{value}</span>
  )
}

function toSendDrilldownRecord(send) {
  return {
    id: send.id,
    type: 'send',
    leadId: send.leadId,
    company: send.company || '',
    contact: send.contactName || send.contactTitle || '',
    email: send.intendedRecipient || send.toEmail || '',
    status: send.status,
    rawStatus: send.status,
    fitScore: send.fitScore || 0,
    source: send.provider || send.source || '',
    sourceUrl: send.sourceUrl || '',
    sourceEvidence: send.providerMessageId ? `Provider message id: ${send.providerMessageId}` : send.error || '',
    discoveryRunId: '',
    updatedAt: send.createdAt || '',
  }
}

function toReplyDrilldownRecord(reply) {
  return {
    id: reply.id,
    type: 'reply',
    leadId: reply.leadId,
    company: reply.company || reply.fromEmail || '',
    contact: reply.fromName || reply.fromEmail || '',
    email: reply.fromEmail || '',
    status: reply.classification || 'reply',
    rawStatus: reply.classification || 'reply',
    fitScore: '',
    source: reply.provider || 'mailbox',
    sourceUrl: reply.sourceUrl || '',
    sourceEvidence: reply.body || reply.subject || '',
    discoveryRunId: '',
    updatedAt: reply.receivedAt || reply.createdAt || '',
  }
}

function toScheduledDrilldownRecord(send) {
  return {
    id: send.id,
    type: 'scheduled_send',
    leadId: send.leadId,
    company: send.contactEmail || 'Scheduled send',
    contact: send.contactEmail || '',
    email: send.contactEmail || '',
    status: send.status,
    rawStatus: send.status,
    fitScore: send.confidence || '',
    source: 'scheduled_sends',
    sourceUrl: '',
    sourceEvidence: send.subject || '',
    discoveryRunId: '',
    updatedAt: send.updatedAt || send.scheduledAt || send.createdAt || '',
  }
}

function metricRecord(id, label, description, query, records) {
  return {
    id,
    label,
    value: records.length,
    description,
    query,
    records,
    lastUpdated: latestTimestamp(records),
  }
}

function buildMetricRegistry({ leads, sends, replies, prospectRuns, scheduledSends }) {
  const leadRecords = leads.map(toLeadDrilldownRecord)
  const sendRecords = sends.map(toSendDrilldownRecord)
  const replyRecords = replies.map(toReplyDrilldownRecord)
  const scheduledRecords = scheduledSends.map(toScheduledDrilldownRecord)
  const leadBy = (id, label, description, query, predicate) => {
    const records = leadRecords.filter((record) => predicate(record))
    return {
      id,
      label,
      value: records.length,
      description,
      query,
      records,
      lastUpdated: latestTimestamp(records),
    }
  }
  const sendBy = (id, label, description, query, predicate) => {
    const records = sendRecords.filter((record) => predicate(record))
    return {
      id,
      label,
      value: records.length,
      description,
      query,
      records,
      lastUpdated: latestTimestamp(records),
    }
  }
  const replyBy = (id, label, description, query, predicate) => {
    const records = replyRecords.filter((record) => predicate(record))
    return {
      id,
      label,
      value: records.length,
      description,
      query,
      records,
      lastUpdated: latestTimestamp(records),
    }
  }

  return [
    leadBy('total-leads', 'Total Leads Discovered', 'All leads currently in the CapSigma pipeline.', 'leads: all records', () => true),
    leadBy('new-leads-this-run', 'New Leads This Run', 'Leads tied to the latest prospect run.', `leads.discoveryRunId == latest prospect run (${prospectRuns[0]?.id || 'none'})`, (record) => record.discoveryRunId && record.discoveryRunId === prospectRuns[0]?.id),
    leadBy('leads-imported', 'Leads Imported', 'Leads that have a source record from import, research, or manual entry.', 'leads.source OR leads.sourceUrl present', (record) => Boolean(record.source || record.sourceUrl)),
    leadBy('leads-deduplicated', 'Leads Deduplicated', 'Existing lead IDs overwritten by import/research upsert are represented by stable lead IDs.', 'lead.id uniqueness enforced by D1 primary key', () => false),
    leadBy('leads-rejected', 'Leads Rejected', 'Rejected prospects are stored in prospect run summaries and not inserted as leads.', 'prospect_runs.rejected_count aggregate', () => false),
    leadBy('leads-enriched', 'Leads Enriched', 'Leads with research summary, evidence, source URL, or service lane context.', 'researchSummary OR evidenceJson OR serviceLane OR sourceUrl present', (record) => Boolean(record.sourceEvidence || record.sourceUrl || record.source)),
    leadBy('emails-found', 'Emails Found', 'Lead records with an email address captured.', 'leads.email != empty', (record) => Boolean(record.email)),
    leadBy('emails-verified', 'Emails Verified', 'Emails considered send-eligible by current validation rules and non-placeholder format.', 'valid email format; no placeholder status stored yet', (record) => Boolean(record.email) && !/example\.|first|name@/i.test(record.email)),
    leadBy('qualified-leads', 'Qualified Leads', 'Leads marked qualified or beyond the qualified workflow.', 'status IN qualified,drafted,approved,preview_ready,sandbox_sent,live_sent,sent,replied', (record) => ['qualified', 'drafted', 'approved', 'preview_ready', 'sandbox_sent', 'live_sent', 'sent', 'replied'].includes(record.rawStatus)),
    leadBy('high-fit-leads', 'High-Fit Leads', 'Leads with fit score 80 or higher.', 'fitScore >= 80', (record) => Number(record.fitScore) >= 80),
    leadBy('medium-fit-leads', 'Medium-Fit Leads', 'Leads with fit score from 60 through 79.', 'fitScore >= 60 AND fitScore < 80', (record) => Number(record.fitScore) >= 60 && Number(record.fitScore) < 80),
    leadBy('low-fit-leads', 'Low-Fit Leads', 'Leads with fit score below 60.', 'fitScore < 60', (record) => Number(record.fitScore) < 60),
    leadBy('drafts-generated', 'Drafts Generated', 'Leads with a generated or saved draft.', 'draftSubject OR draftBody present', (record) => ['drafted', 'approved', 'preview_ready', 'sandbox_sent', 'live_sent', 'sent'].includes(record.rawStatus)),
    leadBy('drafts-pending-review', 'Drafts Pending Review', 'Leads requiring operator review before outreach.', 'status == needs_review', (record) => record.rawStatus === 'needs_review'),
    leadBy('drafts-approved', 'Drafts Approved', 'Leads approved for sending or already sent.', 'status IN approved,preview_ready,sandbox_sent,live_sent,sent', (record) => ['approved', 'preview_ready', 'sandbox_sent', 'live_sent', 'sent'].includes(record.rawStatus)),
    metricRecord('emails-scheduled', 'Emails Scheduled', 'Approved drafts waiting in the scheduled send queue.', 'scheduled_sends.status == scheduled', scheduledRecords.filter((record) => record.rawStatus === 'scheduled')),
    sendBy('emails-sent', 'Emails Sent', 'Provider-recorded send events, including sandbox and live proof.', 'send_events.status IN sent,sandbox_sent,live_sent', (record) => ['sent', 'sandbox_sent', 'live_sent'].includes(record.rawStatus)),
    metricRecord(
      'bounces',
      'Bounces',
      'Failed send events and replies classified as bounces.',
      'send_events.status == failed OR replies.classification == bounce',
      [
        ...sendRecords.filter((record) => record.rawStatus === 'failed'),
        ...replyRecords.filter((record) => /bounce/i.test(record.rawStatus)),
      ],
    ),
    replyBy('auto-replies', 'Auto Replies', 'Replies classified as auto replies.', 'replies.classification contains auto', (record) => /auto/i.test(record.rawStatus)),
    replyBy('out-of-office-replies', 'Out of Office Replies', 'Replies classified as out of office.', 'replies.classification contains out of office/ooo', (record) => /out.?of.?office|ooo/i.test(record.rawStatus)),
    replyBy('human-replies', 'Human Replies', 'Replies that need human attention.', 'replies.needsHuman == true', (record) => replies.find((reply) => reply.id === record.id)?.needsHuman),
    replyBy('positive-human-replies', 'Positive Human Replies', 'Human replies classified as positive.', 'replies.classification contains positive', (record) => /positive/i.test(record.rawStatus)),
    metricRecord(
      'needs-attention',
      'Needs Attention',
      'Human-attention replies and leads explicitly marked needs review.',
      'replies.needsHuman OR leads.status == needs_review',
      [
        ...replyRecords.filter((record) => replies.find((reply) => reply.id === record.id)?.needsHuman),
        ...leadRecords.filter((record) => record.rawStatus === 'needs_review'),
      ],
    ),
    leadBy('suppressed-do-not-contact', 'Suppressed / Do Not Contact', 'Leads marked do not contact.', 'status == do_not_contact', (record) => record.rawStatus === 'do_not_contact'),
  ]
}

function MetricDrilldown({ metric, search, onSearch, onOpenLead, onClose }) {
  const records = useMemo(
    () => (metric?.records || []).filter((record) => includesSearch(record, search)),
    [metric, search],
  )
  if (!metric) return null

  return (
    <Card style={{ borderColor: palette.gold }} data-testid="metric-drilldown">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'start' }}>
        <div style={{ maxWidth: 760 }}>
          <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>
            Metric drilldown
          </div>
          <h2 style={{ margin: '6px 0', fontSize: 22 }}>{metric.label}</h2>
          <div data-testid="metric-drilldown-count" style={{ fontSize: 34, fontWeight: 900, marginBottom: 6 }}>
            {metric.value}
          </div>
          <div style={{ color: palette.muted, lineHeight: 1.6 }}>{metric.description}</div>
          <div style={{ color: palette.muted, fontSize: 13, marginTop: 8 }}>
            Filter: {metric.query}
          </div>
          <div style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>
            Last updated: {formatTime(metric.lastUpdated)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {onClose && (
            <Button variant="secondary" onClick={onClose}>
              Collapse
            </Button>
          )}
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search records"
            aria-label="Search drilldown records"
            style={{ ...inputStyle, width: 220 }}
          />
          <Button
            variant="secondary"
            onClick={() => downloadCsv(`${metric.id}.csv`, records)}
            disabled={!records.length}
          >
            Export CSV
          </Button>
        </div>
      </div>
      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: palette.muted }}>
              <th style={{ padding: 12 }}>Company</th>
              <th style={{ padding: 12 }}>Contact</th>
              <th style={{ padding: 12 }}>Email</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Fit</th>
              <th style={{ padding: 12 }}>Source</th>
              <th style={{ padding: 12 }}>Run ID</th>
              <th style={{ padding: 12 }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={`${record.type}-${record.id}`} data-testid="metric-drilldown-row" style={{ borderTop: `1px solid ${palette.line}` }}>
                <td style={{ padding: 12, fontWeight: 800 }}>
                  {record.leadId || record.type === 'lead' ? (
                    <button
                      type="button"
                      onClick={() => onOpenLead(record.leadId || record.id)}
                      style={{ padding: 0, border: 'none', background: 'transparent', color: palette.blue, fontWeight: 800, cursor: 'pointer' }}
                    >
                      {record.company || 'Open lead'}
                    </button>
                  ) : (
                    record.company || '-'
                  )}
                </td>
                <td style={{ padding: 12 }}>{record.contact || '-'}</td>
                <td style={{ padding: 12, color: palette.muted }}>{record.email || '-'}</td>
                <td style={{ padding: 12 }}>{record.status || '-'}</td>
                <td style={{ padding: 12, color: Number(record.fitScore) >= 80 ? palette.green : palette.gold }}>{record.fitScore || '-'}</td>
                <td style={{ padding: 12 }}>
                  {record.sourceUrl ? (
                    <a href={record.sourceUrl} target="_blank" rel="noreferrer" style={{ color: palette.blue }}>
                      {record.source || 'Source'}
                    </a>
                  ) : (
                    record.source || '-'
                  )}
                  {record.sourceEvidence && (
                    <div style={{ color: palette.muted, fontSize: 12, marginTop: 4, maxWidth: 320 }}>
                      {String(record.sourceEvidence).slice(0, 180)}
                    </div>
                  )}
                </td>
                <td style={{ padding: 12, color: palette.muted }}>{record.discoveryRunId || '-'}</td>
                <td style={{ padding: 12, color: palette.muted }}>{formatTime(record.updatedAt)}</td>
              </tr>
            ))}
            {!records.length && (
              <tr>
                <td colSpan="8" style={{ padding: 18, color: palette.muted }}>
                  No records match this metric and search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function MetricCard({ metric, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`metric-card-${metric.id}`}
      aria-label={`Drill down ${metric.label}`}
      style={{
        textAlign: 'left',
        border: `1px solid ${selected ? palette.gold : palette.line}`,
        borderRadius: 8,
        padding: 14,
        background: palette.panel,
        color: 'inherit',
        cursor: 'pointer',
        minHeight: 108,
      }}
      title={metric.description}
    >
      <div style={{ color: palette.muted, fontSize: 13 }}>{metric.label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{metric.value}</div>
      <div style={{ color: palette.gold, fontSize: 12, marginTop: 8, fontWeight: 800 }}>
        Drill down
      </div>
      <div style={{ color: palette.muted, fontSize: 12, marginTop: 4 }}>
        Updated {formatTime(metric.lastUpdated)}
      </div>
    </button>
  )
}

function TrustItem({ label, value, tone = 'default' }) {
  const color = tone === 'good' ? palette.green : tone === 'warn' ? palette.gold : palette.text
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={{ color: palette.muted, fontSize: 12 }}>{label}</div>
      <div style={{ color, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{value || '-'}</div>
    </div>
  )
}

function LeadTrustLedger({ lead, activity, evidence: evidenceData }) {
  const legacyEvidence = parseEvidenceJson(lead.evidenceJson)
  const normalizedSources = (evidenceData?.leadSources || []).filter((source) => source.leadId === lead.id)
  const normalizedEmails = (evidenceData?.emailEvidence || []).filter((item) => item.leadId === lead.id)
  const leadActivity = activity.filter((entry) => entry.leadId === lead.id)
  const emailLooksVerified = Boolean(lead.email) && !/example\.|first|name@/i.test(lead.email)
  const sourceConfidence = lead.sourceUrl ? 'Source-backed' : 'Needs source proof'
  const fitTone = Number(lead.fitScore || 0) >= 80 ? 'good' : Number(lead.fitScore || 0) >= 60 ? 'warn' : 'default'

  return (
    <div style={{ borderTop: `1px solid ${palette.line}`, paddingTop: 14, display: 'grid', gap: 14 }}>
      <h3 style={{ margin: 0, fontSize: 17 }}>Lead trust ledger</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <TrustItem label="Source confidence" value={sourceConfidence} tone={lead.sourceUrl ? 'good' : 'warn'} />
        <TrustItem label="Email trust" value={lead.email ? (emailLooksVerified ? 'Valid format, not placeholder' : 'Needs verification') : 'No email'} tone={emailLooksVerified ? 'good' : 'warn'} />
        <TrustItem label="Fit score" value={lead.fitScore} tone={fitTone} />
        <TrustItem label="Discovery run" value={lead.discoveryRunId || 'Manual/imported'} />
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <TrustItem label="Service lane" value={lead.serviceLane || 'Not assigned yet'} />
        <TrustItem label="Research summary" value={lead.researchSummary || lead.reason || 'No research summary recorded.'} />
        <TrustItem label="Source title" value={legacyEvidence.sourceTitle || lead.source || 'No source title captured.'} />
        <TrustItem label="Source proof" value={legacyEvidence.sourceQuote || legacyEvidence.whyReachOut || 'No source quote captured.'} />
        {lead.reviewStatus && <TrustItem label="Review flag" value={lead.reviewStatus} tone="warn" />}
      </div>
      <div>
        <div style={{ color: palette.muted, fontSize: 12, marginBottom: 8 }}>Normalized evidence</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {normalizedSources.map((source) => (
            <div key={source.id} style={{ border: `1px solid ${palette.line}`, borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 800 }}>{source.sourceName || source.sourceType || 'Source record'}</div>
              <div style={{ color: palette.muted, fontSize: 12 }}>Confidence {source.confidenceScore || 0} | Run {source.agentRunId || '-'}</div>
              {source.sourceUrl && <a href={source.sourceUrl} target="_blank" rel="noreferrer" style={{ color: palette.blue }}>Open source</a>}
            </div>
          ))}
          {normalizedEmails.map((item) => (
            <div key={item.id} style={{ border: `1px solid ${palette.line}`, borderRadius: 8, padding: 10 }}>
              <div style={{ fontWeight: 800 }}>{item.email}</div>
              <div style={{ color: palette.muted, fontSize: 12 }}>
                {item.validationStatus || 'unknown'} | confidence {item.validationConfidence || 0} | {item.discoveryMethod || 'unknown method'}
              </div>
            </div>
          ))}
          {!normalizedSources.length && !normalizedEmails.length && (
            <div style={{ color: palette.muted }}>No normalized evidence rows yet. New imports and prospect runs will populate this table.</div>
          )}
        </div>
      </div>
      <div>
        <div style={{ color: palette.muted, fontSize: 12, marginBottom: 8 }}>Agent decision log</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {leadActivity.map((entry) => (
            <div key={entry.id} style={{ borderLeft: `3px solid ${palette.gold}`, paddingLeft: 10 }}>
              <div style={{ fontWeight: 800 }}>{entry.label}</div>
              <div style={{ color: palette.muted, fontSize: 12 }}>
                {entry.type} | {formatTime(entry.createdAt)}
              </div>
            </div>
          ))}
          {!leadActivity.length && (
            <div style={{ color: palette.muted }}>
              No lead-scoped activity events captured yet. Future draft, send, reply, suppression, and purge events will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function replyMatchesFilter(reply, filter) {
  if (filter === 'all') return true
  if (filter === 'needs_human') return Boolean(reply.needsHuman)
  if (filter === 'auto') return /auto/i.test(reply.classification || '')
  if (filter === 'out_of_office') return /out.?of.?office|ooo/i.test(reply.classification || '')
  if (filter === 'bounce') return /bounce/i.test(reply.classification || '')
  if (filter === 'handled') return reply.lastAction?.action === 'handled' || reply.needsHuman === false
  return true
}

function AcceptanceCheck({ check }) {
  const color = check?.ok ? palette.green : palette.gold
  return (
    <div style={{ border: `1px solid ${palette.line}`, borderRadius: 8, padding: 12 }}>
      <div style={{ color, fontWeight: 800 }}>{check?.ok ? 'Ready' : 'Needs work'}</div>
      <div style={{ marginTop: 4, fontWeight: 800 }}>{check?.label}</div>
      <div style={{ color: palette.muted, fontSize: 13, marginTop: 4 }}>{check?.detail}</div>
    </div>
  )
}

function DashboardTile({ label, value, detail, tone = 'default', onClick, testId }) {
  const color = tone === 'good' ? palette.green : tone === 'warn' ? palette.gold : tone === 'bad' ? palette.red : palette.text
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      style={{
        textAlign: 'left',
        border: `1px solid ${palette.line}`,
        borderRadius: 8,
        padding: 14,
        background: palette.panel,
        color: palette.text,
        cursor: onClick ? 'pointer' : 'default',
        minHeight: 104,
      }}
    >
      <div style={{ color: palette.muted, fontSize: 13 }}>{label}</div>
      <div style={{ color, fontSize: 30, fontWeight: 900, marginTop: 6 }}>{value}</div>
      {detail && <div style={{ color: palette.muted, fontSize: 12, marginTop: 8, lineHeight: 1.45 }}>{detail}</div>}
    </button>
  )
}

function SidebarItem({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        width: '100%',
        textAlign: 'left',
        border: 'none',
        borderRadius: 8,
        padding: '12px 14px',
        background: active ? 'rgba(213,175,98,0.16)' : 'transparent',
        color: active ? palette.gold : palette.text,
        cursor: 'pointer',
        fontWeight: active ? 800 : 700,
      }}
    >
      {item.label}
      <div style={{ color: palette.muted, fontSize: 11, fontWeight: 500, marginTop: 3 }}>{item.caption}</div>
    </button>
  )
}

function Badge({ children, tone = 'neutral' }) {
  const styles = {
    neutral: { color: palette.muted, background: '#F3F5F8', border: palette.line },
    good: { color: palette.green, background: palette.greenBg, border: '#BFE8D0' },
    warn: { color: palette.gold, background: palette.amberBg, border: '#F3D79B' },
    bad: { color: palette.red, background: palette.redBg, border: '#F1B8B3' },
    blue: { color: palette.blue, background: '#EEF4FF', border: '#C7D8FF' },
  }
  const style = styles[tone] || styles.neutral
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${style.border}`, borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 800, color: style.color, background: style.background, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function FilterChip({ label, value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? palette.blue : palette.line}`,
        borderRadius: 999,
        padding: '8px 11px',
        background: active ? '#EEF4FF' : '#fff',
        color: active ? palette.blue : palette.text,
        cursor: 'pointer',
        fontWeight: 800,
        fontSize: 12,
      }}
    >
      {label}: {value}
    </button>
  )
}

function LeadDrawer({ lead, activity, evidence, sends, replies, onClose }) {
  if (!lead) return null
  const sourceStatus = sourceConfidenceForLead(lead)
  const emailStatus = verifiedEmailLabel(lead)
  const leadActivity = activity.filter((entry) => entry.leadId === lead.id)
  const leadSources = (evidence?.leadSources || []).filter((source) => source.leadId === lead.id)
  const emailEvidence = (evidence?.emailEvidence || []).filter((item) => item.leadId === lead.id)
  const leadSends = sends.filter((send) => send.leadId === lead.id)
  const leadReplies = replies.filter((reply) => reply.leadId === lead.id)
  const timeline = [
    { label: 'Discovered', time: lead.createdAt, detail: lead.discoveryRunId || lead.source || 'Imported lead' },
    lead.researchSummary && { label: 'Enriched', time: lead.updatedAt, detail: lead.researchSummary },
    lead.draftBody && { label: 'Drafted', time: lead.lastDraftedAt || lead.updatedAt, detail: lead.draftSubject || 'Draft captured' },
    ['approved', 'preview_ready', 'sandbox_sent', 'live_sent', 'sent'].includes(lead.status) && { label: 'Approved', time: lead.updatedAt, detail: 'Draft approved for outreach' },
    ...leadSends.map((send) => ({ label: send.status, time: send.createdAt, detail: send.subject })),
    ...leadReplies.map((reply) => ({ label: reply.classification || 'Reply', time: reply.receivedAt || reply.createdAt, detail: reply.subject || reply.body })),
    ...leadActivity.map((entry) => ({ label: entry.type, time: entry.createdAt, detail: entry.label })),
  ].filter(Boolean)

  return (
    <aside data-testid="lead-detail-drawer" style={{ position: 'fixed', top: 0, right: 0, width: 'min(560px, 96vw)', height: '100vh', background: '#fff', color: palette.text, borderLeft: `1px solid ${palette.line}`, boxShadow: '-18px 0 40px rgba(23,32,51,0.18)', zIndex: 30, overflowY: 'auto' }}>
      <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: `1px solid ${palette.line}`, padding: 18, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ color: palette.muted, fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Lead detail</div>
          <h2 style={{ margin: '4px 0 0', fontSize: 24 }}>{lead.company}</h2>
        </div>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
      <div style={{ padding: 18, display: 'grid', gap: 16 }}>
        <Card style={{ boxShadow: 'none' }}>
          <h3 style={{ marginTop: 0 }}>Overview</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <Badge tone={Number(lead.fitScore) >= 80 ? 'good' : 'warn'}>Fit {lead.fitScore || 0}</Badge>
            <Badge tone={emailStatus.tone === 'good' ? 'good' : 'warn'}>{emailStatus.label}</Badge>
            <Badge tone={sourceStatus.tone === 'good' ? 'good' : 'warn'}>{sourceStatus.label}</Badge>
            <Badge tone="blue">{statusLabels[lead.status] || lead.status}</Badge>
          </div>
          <TrustItem label="Why selected" value={lead.reason || lead.researchSummary || 'No reason captured.'} />
          {lead.reviewStatus && <TrustItem label="Review flag" value={lead.reviewStatus} tone="warn" />}
          <TrustItem label="Recommended service" value={lead.serviceLane || 'Not assigned yet'} />
        </Card>

        <Card style={{ boxShadow: 'none' }}>
          <h3 style={{ marginTop: 0 }}>Contact</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <TrustItem label="Name" value={lead.contactName || '-'} />
            <TrustItem label="Title" value={lead.contactTitle || '-'} />
            <TrustItem label="Email" value={lead.email || '-'} tone={emailStatus.tone === 'good' ? 'good' : 'warn'} />
            <TrustItem label="Industry" value={lead.industry || '-'} />
          </div>
        </Card>

        <Card style={{ boxShadow: 'none' }}>
          <h3 style={{ marginTop: 0 }}>Evidence</h3>
          <TrustItem label="Source" value={lead.source || 'Unknown'} />
          <TrustItem label="Source URL" value={lead.sourceUrl || '-'} tone={lead.sourceUrl ? 'good' : 'warn'} />
          <TrustItem label="Discovery run" value={lead.discoveryRunId || '-'} />
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {leadSources.map((source) => (
              <div key={source.id} style={{ border: `1px solid ${palette.line}`, borderRadius: 8, padding: 10 }}>
                <strong>{source.sourceName || source.sourceType}</strong>
                <div style={{ color: palette.muted, fontSize: 12 }}>Confidence {source.confidenceScore || 0} | Run {source.agentRunId || '-'}</div>
              </div>
            ))}
            {!leadSources.length && <div style={{ color: palette.muted }}>No normalized source rows yet.</div>}
          </div>
        </Card>

        <Card style={{ boxShadow: 'none' }}>
          <h3 style={{ marginTop: 0 }}>Email Trust</h3>
          {emailEvidence.map((item) => (
            <div key={item.id} style={{ border: `1px solid ${palette.line}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <strong>{item.email}</strong>
              <div style={{ color: palette.muted, fontSize: 12 }}>{item.validationStatus || 'unknown'} | confidence {item.validationConfidence || 0} | {item.discoveryMethod || 'unknown'}</div>
            </div>
          ))}
          {!emailEvidence.length && <div style={{ color: palette.muted }}>No normalized email trust row yet.</div>}
        </Card>

        <Card style={{ boxShadow: 'none' }}>
          <h3 style={{ marginTop: 0 }}>Outreach</h3>
          <TrustItem label="Subject" value={lead.draftSubject || '-'} />
          <TrustItem label="Send status" value={statusLabels[lead.status] || lead.status || '-'} />
          <TrustItem label="Last send" value={formatTime(lead.lastSentAt)} />
          <TrustItem label="Last reply" value={formatTime(lead.lastReplyAt)} />
        </Card>

        <Card style={{ boxShadow: 'none' }}>
          <h3 style={{ marginTop: 0 }}>Timeline</h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {timeline.map((item, index) => (
              <div key={`${item.label}-${index}`} style={{ borderLeft: `3px solid ${palette.blue}`, paddingLeft: 10 }}>
                <div style={{ fontWeight: 900 }}>{item.label}</div>
                <div style={{ color: palette.muted, fontSize: 12 }}>{formatTime(item.time)}</div>
                <div style={{ color: palette.muted, marginTop: 3 }}>{item.detail}</div>
              </div>
            ))}
            {!timeline.length && <div style={{ color: palette.muted }}>No timeline events yet.</div>}
          </div>
        </Card>
      </div>
    </aside>
  )
}

function inferProspectIndustries(query = '') {
  const text = String(query || '').toLowerCase()
  if (/\boil\s*(and|&)?\s*gas\b|\bpetroleum\b|\bupstream\b|\bmidstream\b|\bdownstream\b|\blng\b/.test(text)) {
    return 'Oil and Gas'
  }
  if (/\b(accounting|bookkeeping|cpa|tax|payroll|audit|business services|professional services|outsourced accounting|fractional cfo|controller services|accounts payable|accounts receivable|ap\/ar|finance operations)\b/.test(text)) {
    return 'Accounting, Business Services, Professional Services'
  }
  if (/\bhealthcare|medical|clinic|hospital|patient|records management\b/.test(text)) {
    return 'Healthcare'
  }
  if (/\breal estate|property|brokerage|lease|tenant\b/.test(text)) {
    return 'Real Estate'
  }
  if (/\blogistics|warehouse|transport|freight|shipment|supply chain\b/.test(text)) {
    return 'Logistics'
  }
  if (/\bretail|store|ecommerce|e-commerce|merchandising\b/.test(text)) {
    return 'Retail'
  }
  if (/\bfinance|financial services|bank|credit union|insurance\b/.test(text)) {
    return 'Financial Services'
  }
  return ''
}

function parseCsv(text) {
  const rows = []
  let cell = ''
  let row = []
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  if (rows.length < 2) return []

  const headers = rows[0].map((value) => value.trim())
  return rows.slice(1).map((values) =>
    headers.reduce((record, header, index) => {
      record[header] = values[index] || ''
      return record
    }, {}),
  )
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`)
  }
  return data
}

function Button({ children, variant = 'primary', disabled, ...props }) {
  const styles = {
    primary: { background: '#E7C56F', color: palette.text, border: '1px solid #C99732' },
    secondary: { background: '#fff', color: palette.text, border: `1px solid ${palette.line}` },
    danger: { background: palette.redBg, color: palette.red, border: '1px solid #F1B8B3' },
  }
  return (
    <button
      disabled={disabled}
      style={{
        minHeight: 44,
        borderRadius: 8,
        border: 'none',
        padding: '0 16px',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        ...styles[variant],
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function Card({ children, style, ...props }) {
  return (
    <section
      style={{
        background: palette.panel,
        border: `1px solid ${palette.line}`,
        borderRadius: 8,
        padding: 18,
        boxShadow: '0 8px 26px rgba(23, 32, 51, 0.06)',
        ...style,
      }}
      {...props}
    >
      {children}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 8, color: palette.muted, fontSize: 13 }}>
      {label}
      {children}
    </label>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#FFFFFF',
  color: palette.text,
  border: `1px solid ${palette.line}`,
  borderRadius: 8,
  padding: '12px 14px',
  outline: 'none',
}

export default function App() {
  const [session, setSession] = useState(null)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState('Command Center')
  const [leads, setLeads] = useState([])
  const [activity, setActivity] = useState([])
  const [sends, setSends] = useState([])
  const [prospectRuns, setProspectRuns] = useState([])
  const [replies, setReplies] = useState([])
  const [mailboxStatus, setMailboxStatus] = useState(null)
  const [purgePlan, setPurgePlan] = useState(null)
  const [purgeConfirmation, setPurgeConfirmation] = useState('')
  const [purgeResult, setPurgeResult] = useState(null)
  const [evidence, setEvidence] = useState({ leadSources: [], emailEvidence: [] })
  const [intelligence, setIntelligence] = useState(null)
  const [scheduledSends, setScheduledSends] = useState([])
  const [agentEvents, setAgentEvents] = useState([])
  const [reports, setReports] = useState({ summary: [], drilldowns: {}, snapshots: [] })
  const [acceptance, setAcceptance] = useState({ checks: [], lastRun: null, ready: false })
  const [scheduleWindows, setScheduleWindows] = useState(defaultSendWindows)
  const [scheduleWindow, setScheduleWindow] = useState(defaultSendWindows[0])
  const [intelligenceForm, setIntelligenceForm] = useState(null)
  const [qualityFilter, setQualityFilter] = useState('all')
  const [replyFilter, setReplyFilter] = useState('needs_human')
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [csvText, setCsvText] = useState('')
  const [notes, setNotes] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [prospectQuery, setProspectQuery] = useState(defaultProspectQuery)
  const [prospectIndustries, setProspectIndustries] = useState(defaultProspectIndustries)
  const [prospectLimit, setProspectLimit] = useState(5)
  const [selectedMetricId, setSelectedMetricId] = useState('total-leads')
  const [expandedMetricId, setExpandedMetricId] = useState('')
  const [metricSearch, setMetricSearch] = useState('')
  const [leadSearch, setLeadSearch] = useState('')
  const [leadSavedView, setLeadSavedView] = useState('All leads')
  const [leadDensity, setLeadDensity] = useState('comfortable')
  const [leadSort, setLeadSort] = useState('updated_desc')
  const [showColumnControls, setShowColumnControls] = useState(false)
  const [visibleLeadColumns, setVisibleLeadColumns] = useState({
    title: true,
    industry: true,
    source: true,
    draft: true,
    send: true,
    reply: true,
  })
  const [selectedLeadIds, setSelectedLeadIds] = useState([])
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false)
  const [leadStatusFilter, setLeadStatusFilter] = useState('All')
  const [leadEmailFilter, setLeadEmailFilter] = useState('All')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const detectedProspectIndustries = inferProspectIndustries(prospectQuery)

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || leads[0] || null,
    [leads, selectedLeadId],
  )

  const metrics = useMemo(
    () => buildMetricRegistry({ leads, sends, replies, prospectRuns, scheduledSends }),
    [leads, sends, replies, prospectRuns, scheduledSends],
  )

  const selectedMetric = useMemo(
    () => metrics.find((metric) => metric.id === selectedMetricId) || metrics[0],
    [metrics, selectedMetricId],
  )

  const qualityOptions = useMemo(() => {
    const seen = new Map([['all', 'All quality states']])
    for (const lead of leads) {
      for (const flag of qualityFlagsForLead(lead)) seen.set(flag.type, flag.label)
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }))
  }, [leads])

  const filteredLeads = useMemo(() => {
    if (qualityFilter === 'all') return leads
    return leads.filter((lead) => qualityFlagsForLead(lead).some((flag) => flag.type === qualityFilter))
  }, [leads, qualityFilter])

  const filteredReplies = useMemo(
    () => replies.filter((reply) => replyMatchesFilter(reply, replyFilter)),
    [replies, replyFilter],
  )

  const workspaceLeads = useMemo(() => {
    const filtered = leads.filter((lead) => {
      const searchOk = !leadSearch.trim() || includesSearch(toLeadDrilldownRecord(lead), leadSearch)
      const statusOk = leadStatusFilter === 'All' || lead.status === leadStatusFilter
      const email = verifiedEmailLabel(lead).label
      const emailOk = leadEmailFilter === 'All' || email === leadEmailFilter
      const viewOk =
        leadSavedView === 'All leads' ||
        (leadSavedView === 'Needs review' && (lead.status === 'needs_review' || lead.reviewStatus)) ||
        (leadSavedView === 'Ready for outreach' && ['qualified', 'drafted', 'approved'].includes(lead.status)) ||
        (leadSavedView === 'Missing email' && !lead.email)
      return searchOk && statusOk && emailOk && viewOk
    })
    return [...filtered].sort((a, b) => {
      if (leadSort === 'fit_desc') return Number(b.fitScore || 0) - Number(a.fitScore || 0)
      if (leadSort === 'fit_asc') return Number(a.fitScore || 0) - Number(b.fitScore || 0)
      if (leadSort === 'company_asc') return String(a.company || '').localeCompare(String(b.company || ''))
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
    })
  }, [leads, leadSearch, leadSavedView, leadStatusFilter, leadEmailFilter, leadSort])

  const leadStatuses = useMemo(() => ['All', ...Array.from(new Set(leads.map((lead) => lead.status).filter(Boolean)))], [leads])

  useEffect(() => {
    loadSession()
  }, [])

  useEffect(() => {
    if (!selectedLead) return
    setSelectedLeadId(selectedLead.id)
    setDraftSubject(selectedLead.draftSubject || '')
    setDraftBody(selectedLead.draftBody || '')
  }, [selectedLead?.id])

  async function loadSession() {
    try {
      const data = await api('/api/session')
      setSession(data)
      if (data.authenticated) await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function loadData() {
    const [leadData, activityData, runData, replyData, mailboxData, purgeData, evidenceData, intelligenceData, scheduleData, agentEventData, reportData, acceptanceData] = await Promise.all([
      api('/api/leads'),
      api('/api/activity'),
      api('/api/prospect-runs').catch(() => ({ runs: [] })),
      api('/api/replies').catch(() => ({ replies: [] })),
      api('/api/mailbox/gmail/status').catch(() => null),
      api('/api/admin/purge-demo-data').catch(() => null),
      api('/api/evidence').catch(() => ({ leadSources: [], emailEvidence: [] })),
      api('/api/intelligence').catch(() => ({ intelligence: null })),
      api('/api/schedule').catch(() => ({ scheduledSends: [], sendWindows: defaultSendWindows })),
      api('/api/agent-events').catch(() => ({ events: [] })),
      api('/api/reports').catch(() => ({ summary: [], drilldowns: {}, snapshots: [] })),
      api('/api/acceptance').catch(() => ({ checks: [], lastRun: null, ready: false })),
    ])
    setLeads(leadData.leads || [])
    setActivity(activityData.activity || [])
    setProspectRuns(runData.runs || [])
    setReplies(replyData.replies || [])
    setMailboxStatus(mailboxData)
    setPurgePlan(purgeData)
    setEvidence(evidenceData || { leadSources: [], emailEvidence: [] })
    setIntelligence(intelligenceData?.intelligence || null)
    setIntelligenceForm(intelligenceData?.intelligence || null)
    setScheduledSends(scheduleData?.scheduledSends || [])
    setAgentEvents(agentEventData?.events || [])
    setReports(reportData || { summary: [], drilldowns: {}, snapshots: [] })
    setAcceptance(acceptanceData || { checks: [], lastRun: null, ready: false })
    setScheduleWindows(scheduleData?.sendWindows?.length ? scheduleData.sendWindows : defaultSendWindows)
    setScheduleWindow((scheduleData?.sendWindows?.[0]) || defaultSendWindows[0])
    const sendData = await api('/api/sends')
    setSends(sendData.sends || [])
    if (!selectedLeadId && leadData.leads?.length) {
      setSelectedLeadId(leadData.leads[0].id)
    }
  }

  async function login(event) {
    event.preventDefault()
    setBusy('login')
    setError('')
    try {
      await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      setPassword('')
      await loadSession()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function logout() {
    await api('/api/logout', { method: 'POST', body: '{}' })
    setSession({ authenticated: false })
    setLeads([])
    setActivity([])
  }

  async function importLeads() {
    const parsed = parseCsv(csvText)
    if (!parsed.length) {
      setError('Paste CSV with a header row and at least one lead.')
      return
    }
    setBusy('import')
    setError('')
    setNotice('')
    try {
      const result = await api('/api/leads', {
        method: 'POST',
        body: JSON.stringify({ leads: parsed }),
      })
      setNotice(`Imported ${result.imported.length} leads. Rejected ${result.rejected.length}.`)
      setCsvText('')
      await loadData()
      setActiveTab('Command Center')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function runProspectDiscovery() {
    if (!prospectQuery.trim()) {
      setError('Enter a prospect research query first.')
      return
    }
    const effectiveIndustries = detectedProspectIndustries || prospectIndustries
    if (detectedProspectIndustries && detectedProspectIndustries !== prospectIndustries) {
      setProspectIndustries(detectedProspectIndustries)
    }
    setBusy('prospect')
    setError('')
    setNotice('')
    try {
      const result = await api('/api/prospect-runs', {
        method: 'POST',
        body: JSON.stringify({
          query: prospectQuery,
          industries: effectiveIndustries,
          maxResults: prospectLimit,
          searchParameters: {
            targetLocations: intelligenceForm?.parameters?.targetLocations || intelligence?.parameters?.targetLocations || ['Houston, TX'],
            startingRadius: intelligenceForm?.parameters?.startingRadius || intelligence?.parameters?.startingRadius || 25,
            radiusIncrement: intelligenceForm?.parameters?.radiusIncrement || intelligence?.parameters?.radiusIncrement || 25,
            maxRadius: intelligenceForm?.parameters?.maxRadius || intelligence?.parameters?.maxRadius || 100,
          },
        }),
      })
      setNotice(`Prospect run imported ${result.imported?.length || 0} prospect(s). Rejected ${result.rejected?.length || 0}. Radius used: ${result.searchParameters?.startingRadius || intelligenceForm?.parameters?.startingRadius || 25} mi.`)
      await loadData()
      setActiveTab('Drafts')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  function updateProspectQuery(value) {
    const currentIndustries = prospectIndustries.trim().toLowerCase()
    const nextIndustries = inferProspectIndustries(value)
    setProspectQuery(value)
    if (
      nextIndustries &&
      (!currentIndustries || currentIndustries === defaultProspectIndustries.toLowerCase())
    ) {
      setProspectIndustries(nextIndustries)
    }
  }

  async function connectGmail() {
    setBusy('gmail-connect')
    setError('')
    setNotice('')
    try {
      const result = await api('/api/mailbox/gmail/start', {
        method: 'POST',
        body: '{}',
      })
      window.location.href = result.authUrl
    } catch (err) {
      setError(err.message)
      setBusy('')
    }
  }

  async function syncGmailReplies() {
    setBusy('gmail-sync')
    setError('')
    setNotice('')
    try {
      const result = await api('/api/mailbox/gmail/sync', {
        method: 'POST',
        body: '{}',
      })
      setNotice(`Gmail sync checked ${result.checked} message(s), imported ${result.imported.length}, duplicates ${result.duplicates.length}.`)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function generateDraft() {
    if (!selectedLead) return
    setBusy('draft')
    setError('')
    setNotice('')
    try {
      const result = await api('/api/draft', {
        method: 'POST',
        body: JSON.stringify({ leadId: selectedLead.id, notes }),
      })
      setDraftSubject(result.draftSubject)
      setDraftBody(result.draftBody)
      setNotice('Draft generated and recorded.')
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function approveDraft() {
    if (!selectedLead) return
    setBusy('approve')
    setError('')
    setNotice('')
    try {
      await api(`/api/leads/${selectedLead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'approved',
          draftSubject,
          draftBody,
        }),
      })
      setNotice('Draft approved. This lead is now eligible to send.')
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function sendEmail() {
    if (!selectedLead) return
    setBusy('send')
    setError('')
    setNotice('')
    try {
      await api(`/api/leads/${selectedLead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: selectedLead.status,
          draftSubject,
          draftBody,
        }),
      })
      const result = await api('/api/send-email', {
        method: 'POST',
        body: JSON.stringify({ leadId: selectedLead.id }),
      })
      setNotice(result.sandbox
        ? `Sandbox email sent to ${result.actualRecipient}; intended recipient ${result.intendedRecipient}.`
        : result.preview
          ? 'Proof recorded. Configure SendGrid to deliver.'
          : 'Email sent and proof recorded.')
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function autoSendLead(lead) {
    if (!lead) return
    setBusy(`auto-${lead.id}`)
    setError('')
    setNotice('')
    try {
      if (!lead.draftBody) {
        await api('/api/draft', {
          method: 'POST',
          body: JSON.stringify({ leadId: lead.id, notes: 'Auto-outreach candidate. Keep direct, specific, and human.' }),
        })
      }
      const result = await api('/api/send-email', {
        method: 'POST',
        body: JSON.stringify({ leadId: lead.id }),
      })
      setNotice(result.sandbox
        ? `Sandbox email sent to ${result.actualRecipient}; intended recipient ${result.intendedRecipient}.`
        : `Live email sent to ${result.actualRecipient}.`)
      await loadData()
    } catch (err) {
      setError(err.message)
      await loadData().catch(() => {})
    } finally {
      setBusy('')
    }
  }

  async function markNeedsEdit(lead) {
    if (!lead) return
    setBusy(`edit-${lead.id}`)
    setError('')
    setNotice('')
    try {
      await api(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'needs_review' }),
      })
      setNotice(`${lead.company} moved to review/edit.`)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function updateLeadStatus(status, replyType = undefined) {
    if (!selectedLead) return
    setBusy(status)
    setError('')
    setNotice('')
    try {
      await api(`/api/leads/${selectedLead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, replyType }),
      })
      setNotice(`Lead marked as ${statusLabels[status] || status}.`)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function suppressSelectedLead() {
    if (!selectedLead?.email) {
      setError('Selected lead has no email to suppress.')
      return
    }
    setBusy('suppress')
    setError('')
    setNotice('')
    try {
      await api('/api/suppressions', {
        method: 'POST',
        body: JSON.stringify({
          leadId: selectedLead.id,
          email: selectedLead.email,
          reason: 'manual operator suppression',
        }),
      })
      setNotice('Lead suppressed and marked do not contact.')
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function purgeDemoData() {
    setBusy('purge-demo')
    setError('')
    setNotice('')
    setPurgeResult(null)
    try {
      const result = await api('/api/admin/purge-demo-data', {
        method: 'POST',
        body: JSON.stringify({ confirmation: purgeConfirmation }),
      })
      setPurgeResult(result)
      setNotice(`Purged ${result.counts.leads} demo/test leads and refreshed the proof ledger.`)
      setPurgeConfirmation('')
      await loadData()
      setActiveTab('Admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  function updateIntelligenceField(section, key, value) {
    setIntelligenceForm((current) => ({
      ...(current || {}),
      [section]: {
        ...((current || {})[section] || {}),
        [key]: value,
      },
    }))
  }

  function updateIntelligenceList(key, value) {
    setIntelligenceForm((current) => ({
      ...(current || {}),
      [key]: String(value || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    }))
  }

  function updateParameter(key, value) {
    setIntelligenceForm((current) => ({
      ...(current || {}),
      parameters: {
        ...((current || {}).parameters || {}),
        [key]: value,
      },
    }))
  }

  async function saveIntelligence(options = {}) {
    if (!intelligenceForm) return
    const busyKey = options.busyKey || 'intelligence-save'
    setBusy(busyKey)
    setError('')
    setNotice('')
    try {
      const payload = {
        ...intelligenceForm,
        sendWindows: scheduleWindows,
      }
      const result = await api('/api/intelligence', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setIntelligence(result.intelligence)
      setIntelligenceForm(result.intelligence)
      setScheduleWindows(result.intelligence.sendWindows || defaultSendWindows)
      setNotice(options.successMessage || `CapSigma intelligence version ${result.intelligence.versionNumber} activated.`)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function scheduleSelectedLead() {
    if (!selectedLead) return
    setBusy('schedule')
    setError('')
    setNotice('')
    try {
      const result = await api('/api/schedule', {
        method: 'POST',
        body: JSON.stringify({ leadId: selectedLead.id, windowTime: scheduleWindow }),
      })
      setNotice(`${selectedLead.company} scheduled for ${result.scheduledSend.sendWindowLabel}.`)
      await loadData()
      setActiveTab('Drafts')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function processDueScheduledSends() {
    setBusy('schedule-due')
    setError('')
    setNotice('')
    try {
      const result = await api('/api/schedule', {
        method: 'POST',
        body: JSON.stringify({ due: true, limit: 10 }),
      })
      setNotice(`Processed ${result.processed?.length || 0} due scheduled send(s).`)
      await loadData()
      setActiveTab('Schedule')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function backfillEvidence() {
    setBusy('backfill-evidence')
    setError('')
    setNotice('')
    try {
      const result = await api('/api/admin/backfill-evidence', {
        method: 'POST',
        body: '{}',
      })
      setNotice(`Backfilled ${result.sourceRows} source row(s) and ${result.emailRows} email evidence row(s) across ${result.leadsScanned} lead(s).`)
      await loadData()
      setActiveTab('Admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function updateReplyWorkflow(reply, action, extra = {}) {
    if (!reply) return
    setBusy(`reply-${reply.id}-${action}`)
    setError('')
    setNotice('')
    try {
      const result = await api(`/api/replies/${reply.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, ...extra }),
      })
      setNotice(`Reply ${result.reply.classification || reply.classification || action} saved.`)
      await loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function saveReportSnapshot() {
    setBusy('report-snapshot')
    setError('')
    setNotice('')
    try {
      const result = await api('/api/reports', {
        method: 'POST',
        body: JSON.stringify({ reportType: 'daily_operator' }),
      })
      setNotice(`Report snapshot saved: ${result.snapshot.id}.`)
      await loadData()
      setActiveTab('Reports')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function runAcceptanceCheck() {
    setBusy('acceptance')
    setError('')
    setNotice('')
    try {
      const result = await api('/api/acceptance', {
        method: 'POST',
        body: '{}',
      })
      setAcceptance(result)
      setNotice(result.ready ? 'Production acceptance snapshot is green.' : 'Acceptance snapshot saved with remaining yellow items.')
      await loadData()
      setActiveTab('Admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  function openMetric(metric) {
    setSelectedMetricId(metric.id)
    setExpandedMetricId(metric.id)
    setMetricSearch('')
  }

  function openReportDrilldown(metricId) {
    const matchingMetric = metrics.find((metric) => metric.id === metricId)
    if (matchingMetric) {
      openMetric(matchingMetric)
    }
  }

  function openQualityFilter(filter) {
    setQualityFilter(filter)
    setExpandedMetricId('')
    setActiveTab('Command Center')
  }

  function openLeadFromDrilldown(leadId) {
    if (!leadId) return
    openLeadDrawer(leadId)
  }

  function openLeadDrawer(leadId) {
    setSelectedLeadId(leadId)
    setLeadDrawerOpen(true)
  }

  function toggleLeadSelection(leadId) {
    setSelectedLeadIds((current) =>
      current.includes(leadId)
        ? current.filter((id) => id !== leadId)
        : [...current, leadId],
    )
  }

  if (!session?.authenticated) {
    return (
      <main style={{ minHeight: '100vh', background: palette.bg, color: palette.text, display: 'grid', placeItems: 'center', padding: 24 }}>
        <Card style={{ width: '100%', maxWidth: 440 }}>
          <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>
            CapSigma Growth Desk
          </div>
          <h1 style={{ margin: '10px 0 6px', fontSize: 28 }}>Operator Login</h1>
          <p style={{ color: palette.muted, lineHeight: 1.6 }}>
            Sign in to manage real leads, approved outreach, and durable proof records.
          </p>
          <form onSubmit={login} style={{ display: 'grid', gap: 14, marginTop: 22 }}>
            <Field label="Admin password">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                style={inputStyle}
                autoFocus
              />
            </Field>
            {error && <div style={{ color: palette.red }}>{error}</div>}
            <Button disabled={!password || busy === 'login'}>{busy === 'login' ? 'Signing in...' : 'Sign in'}</Button>
          </form>
        </Card>
      </main>
    )
  }

  const getMetric = (id) => metrics.find((metric) => metric.id === id) || { id, label: id, value: 0, records: [] }
  const latestRun = prospectRuns[0] || null
  const currentMode = intelligence?.parameters?.automationMode || 'review_required'
  const systemHealthy = Boolean(session.configured?.database && session.configured?.openai && session.configured?.sendgrid && session.configured?.gmailConnected)
  const nextSendWindow = scheduleWindows[0] || '08:00'
  const targetLocations = intelligence?.parameters?.targetLocations || ['Houston, TX']
  const startingRadius = intelligence?.parameters?.startingRadius || 25
  const radiusIncrement = intelligence?.parameters?.radiusIncrement || 25
  const maxRadius = intelligence?.parameters?.maxRadius || 100
  const navItems = [
    { label: 'Command Center', caption: 'Agent overview' },
    { label: 'Leads', caption: 'Workspace' },
    { label: 'Drafts', caption: 'Outreach review' },
    { label: 'Replies', caption: 'Human response desk' },
    { label: 'Agent Runs', caption: 'Step logs' },
    { label: 'Reports', caption: 'Clickable summaries' },
    { label: 'Intelligence', caption: 'Campaign parameters' },
    { label: 'Settings', caption: 'Integrations' },
    { label: 'Admin', caption: 'QA and handoff' },
  ]
  const actionQueue = [
    { label: 'Drafts pending review', value: getMetric('drafts-pending-review').value, metricId: 'drafts-pending-review', tone: 'warn' },
    { label: 'Human replies', value: getMetric('human-replies').value, metricId: 'human-replies', tone: 'warn' },
    { label: 'Missing verified emails', value: qualityFlagsForLead ? leads.filter((lead) => qualityFlagsForLead(lead).some((flag) => flag.type === 'missing_email' || flag.type === 'unverified_email')).length : 0, qualityFilter: 'missing_email', tone: 'warn' },
    { label: 'Low-confidence sources', value: leads.filter((lead) => qualityFlagsForLead(lead).some((flag) => flag.type === 'missing_source' || flag.type === 'low_confidence_source')).length, qualityFilter: 'missing_source', tone: 'warn' },
    { label: 'Bounces / failed sends', value: getMetric('bounces').value, metricId: 'bounces', tone: getMetric('bounces').value ? 'bad' : 'good' },
  ]
  const funnelSteps = [
    { label: 'Leads', metricId: 'total-leads', note: 'all discovered or imported prospects' },
    { label: 'Emails found', metricId: 'emails-found', note: 'any email captured' },
    { label: 'Verified usable emails', metricId: 'emails-verified', note: 'valid, non-placeholder emails' },
    { label: 'Qualified leads', metricId: 'qualified-leads', note: 'fit and status ready for outreach' },
    { label: 'Approved drafts', metricId: 'drafts-approved', note: 'human-approved or send-ready drafts' },
    { label: 'Sent', metricId: 'emails-sent', note: 'SendGrid proof events only' },
    { label: 'Human replies', metricId: 'human-replies', note: 'operator should review' },
  ]
  const trustItems = [
    { label: 'Verified emails', value: getMetric('emails-verified').value, metricId: 'emails-verified', tone: 'good' },
    { label: 'Missing emails', value: leads.filter((lead) => !lead.email).length, qualityFilter: 'missing_email', tone: 'warn' },
    { label: 'Unverified emails', value: leads.filter((lead) => lead.email && /example\.|first|name@/i.test(lead.email)).length, qualityFilter: 'unverified_email', tone: 'warn' },
    { label: 'Low source confidence', value: leads.filter((lead) => qualityFlagsForLead(lead).some((flag) => flag.type === 'missing_source' || flag.type === 'low_confidence_source')).length, qualityFilter: 'missing_source', tone: 'warn' },
    { label: 'Suppressed contacts', value: getMetric('suppressed-do-not-contact').value, metricId: 'suppressed-do-not-contact', tone: 'default' },
    { label: 'Bounces', value: getMetric('bounces').value, metricId: 'bounces', tone: getMetric('bounces').value ? 'bad' : 'good' },
  ]

  return (
    <main style={{ minHeight: '100vh', background: palette.bg, color: palette.text, padding: 24 }}>
      <div style={{ maxWidth: 1480, margin: '0 auto', display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        <aside style={{ position: 'sticky', top: 24, display: 'grid', gap: 16 }}>
          <Card style={{ padding: 16 }}>
            <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 11, fontWeight: 900, letterSpacing: 1.2 }}>
              CapSigma
            </div>
            <h1 style={{ margin: '6px 0 2px', fontSize: 21 }}>Growth OS</h1>
            <div style={{ color: palette.muted, fontSize: 13 }}>Autonomous Sales Agent</div>
          </Card>
          <nav style={{ display: 'grid', gap: 4 }}>
            {navItems.map((item) => (
              <SidebarItem
                key={item.label}
                item={item}
                active={activeTab === item.label}
                onClick={() => setActiveTab(item.label)}
              />
            ))}
          </nav>
          <Card style={{ padding: 14 }}>
            <div style={{ color: systemHealthy ? palette.green : palette.gold, fontWeight: 900 }}>
              {systemHealthy ? 'System healthy' : 'Needs setup'}
            </div>
            <div style={{ color: palette.muted, fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
              Details live in Settings. Personal mailbox data is hidden from the client-facing header.
            </div>
          </Card>
        </aside>

        <div style={{ display: 'grid', gap: 18 }}>
          <header style={{ display: 'grid', gap: 14 }}>
            <Card style={{ background: '#FFFFFF', padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 900, letterSpacing: 1.2 }}>
                    CapSigma Growth OS
                  </div>
                  <h1 style={{ margin: '6px 0 4px', fontSize: 34 }}>Autonomous Sales Agent Control Room</h1>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', color: palette.muted }}>
                    <span>Status: <strong style={{ color: systemHealthy ? palette.green : palette.gold }}>{systemHealthy ? 'Active' : 'Needs setup'}</strong></span>
                    <span>Mode: <strong style={{ color: palette.text }}>{currentMode.replace(/_/g, ' ')}</strong></span>
                    <span>Environment: <strong style={{ color: session.configured?.sandboxMode ? palette.gold : palette.green }}>{session.configured?.sandboxMode ? 'Sandbox' : 'Production'}</strong></span>
                    <span>Last Run: <strong style={{ color: palette.text }}>{formatTime(latestRun?.completedAt || latestRun?.createdAt)}</strong></span>
                    <span>Next Send Window: <strong style={{ color: palette.text }}>{nextSendWindow}</strong></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button onClick={() => setActiveTab('Leads')}>Run Agent</Button>
                  <Button variant="secondary" onClick={() => setActiveTab('Leads')}>Import Leads</Button>
                  <Button variant="secondary" onClick={() => setActiveTab('Drafts')}>Review Drafts</Button>
                  <Button variant="secondary" onClick={() => setActiveTab('Schedule')}>Queue</Button>
                  <Button variant="secondary" onClick={() => setActiveTab('Replies')}>View Replies</Button>
                  <Button variant="secondary" onClick={loadData}>Refresh</Button>
                  <Button variant="secondary" onClick={logout}>Logout</Button>
                </div>
              </div>
            </Card>
          </header>

        {(notice || error) && (
          <div style={{ color: error ? palette.red : palette.green, fontWeight: 700 }}>
            {error || notice}
          </div>
        )}

        {activeTab === 'Command Center' && (
          <section style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.9fr) minmax(360px, 1.1fr)', gap: 18 }}>
              <Card>
                <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 900, letterSpacing: 1.1 }}>Needs Attention</div>
                <h2 style={{ margin: '8px 0 14px', fontSize: 22 }}>What the operator should handle next</h2>
                <div style={{ display: 'grid', gap: 10 }}>
                  {actionQueue.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => item.metricId ? openReportDrilldown(item.metricId) : openQualityFilter(item.qualityFilter)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                        border: `1px solid ${item.tone === 'bad' ? '#F1B8B3' : item.tone === 'good' ? '#BFE7CF' : palette.line}`,
                        borderRadius: 8,
                        background: item.tone === 'bad' ? palette.redBg : item.tone === 'good' ? palette.greenBg : '#fff',
                        color: palette.text,
                        padding: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <span>{item.label}</span>
                      <strong style={{ color: item.tone === 'bad' ? palette.red : item.tone === 'good' ? palette.green : palette.gold, fontSize: 22 }}>{item.value}</strong>
                    </button>
                  ))}
                </div>
              </Card>

              <Card>
                <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 900, letterSpacing: 1.1 }}>Agent Status</div>
                <h2 style={{ margin: '8px 0 14px', fontSize: 22 }}>{systemHealthy ? 'Running in review-required mode' : 'Setup needs attention'}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  <TrustItem label="Current search area" value={`${targetLocations[0] || 'Houston, TX'} + ${startingRadius} mi`} />
                  <TrustItem label="Next expansion" value={`${Math.min(startingRadius + radiusIncrement, maxRadius)} mi if volume is low`} />
                  <TrustItem label="Target country" value={intelligence?.parameters?.targetCountry || 'United States'} />
                  <TrustItem label="Daily send limit" value={session.configured?.dailySendLimit || intelligence?.parameters?.maxEmailsPerDay || 25} />
                  <TrustItem label="Next send window" value={nextSendWindow} />
                  <TrustItem label="Automation mode" value={currentMode.replace(/_/g, ' ')} />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                  <Button variant="secondary" onClick={() => setActiveTab('Leads')}>Run Now</Button>
                  <Button variant="secondary" onClick={() => setActiveTab('Intelligence')}>Edit Parameters</Button>
                  <Button variant="secondary" onClick={() => setActiveTab('Agent Runs')}>View Run Logs</Button>
                </div>
              </Card>
            </div>

            {expandedMetricId && (
              <MetricDrilldown
                metric={selectedMetric}
                search={metricSearch}
                onSearch={setMetricSearch}
                onOpenLead={openLeadFromDrilldown}
                onClose={() => setExpandedMetricId('')}
              />
            )}

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 900, letterSpacing: 1.1 }}>Pipeline Funnel</div>
                  <h2 style={{ margin: '8px 0 0', fontSize: 22 }}>From lead to human reply</h2>
                  <div style={{ color: palette.muted, marginTop: 6, lineHeight: 1.5 }}>
                    Each step is a stricter stage than the one before it. Evidence quality lives in Data Trust below.
                  </div>
                </div>
                <select aria-label="Dashboard time period" style={{ ...inputStyle, width: 160 }} defaultValue="all">
                  <option value="today">Today</option>
                  <option value="run">This Run</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                {funnelSteps.map(({ label, metricId, note }, index) => {
                  const metric = getMetric(metricId)
                  return (
                    <button
                      key={metricId}
                      type="button"
                      onClick={() => openReportDrilldown(metricId)}
                      data-testid={`funnel-step-${metricId}`}
                      style={{
                        border: `1px solid ${expandedMetricId === metricId ? '#B7CCFF' : palette.line}`,
                        borderRadius: 8,
                        padding: 12,
                        background: expandedMetricId === metricId ? '#EEF4FF' : '#fff',
                        color: palette.text,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ color: palette.muted, fontSize: 12 }}>{label}</div>
                      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 4 }}>{metric.value}</div>
                      <div style={{ color: palette.muted, fontSize: 11, marginTop: 6, minHeight: 30 }}>{note}</div>
                      <div style={{ color: palette.gold, fontSize: 12, marginTop: 8 }}>
                        {expandedMetricId === metricId ? 'Showing records' : 'View records'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 0.9fr) minmax(360px, 1.1fr)', gap: 18 }}>
              <Card>
                <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 900, letterSpacing: 1.1 }}>Data Trust</div>
                <h2 style={{ margin: '8px 0 14px', fontSize: 22 }}>Source and email confidence</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                  {trustItems.map((item) => (
                    <DashboardTile
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      tone={item.tone}
                      onClick={() => item.metricId ? openReportDrilldown(item.metricId) : openQualityFilter(item.qualityFilter)}
                    />
                  ))}
                </div>
              </Card>

              <Card>
                <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 900, letterSpacing: 1.1 }}>Latest Agent Run</div>
                <h2 style={{ margin: '8px 0 14px', fontSize: 22 }}>{latestRun?.query || 'No run recorded yet'}</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  <TrustItem label="Run ID" value={latestRun?.id || '-'} />
                  <TrustItem label="Run time" value={formatTime(latestRun?.completedAt || latestRun?.createdAt)} />
                  <TrustItem label="Leads found" value={latestRun?.importedCount ?? 0} />
                  <TrustItem label="Rejected" value={latestRun?.rejectedCount ?? 0} />
                  <TrustItem label="Radius" value={`${startingRadius} mi`} />
                  <TrustItem label="Next" value={`Expand toward ${Math.min(startingRadius + radiusIncrement, maxRadius)} mi`} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <Button variant="secondary" onClick={() => setActiveTab('Agent Runs')}>Open run log</Button>
                </div>
              </Card>
            </div>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 900, letterSpacing: 1.1 }}>Lead Pipeline</div>
                  <h2 style={{ margin: '8px 0 0', fontSize: 22 }}>Scannable lead list</h2>
                  <div style={{ color: palette.muted, marginTop: 6 }}>Showing {filteredLeads.length} of {leads.length} leads</div>
                </div>
                <select value={qualityFilter} onChange={(event) => setQualityFilter(event.target.value)} aria-label="Filter by data quality" style={{ ...inputStyle, width: 240 }}>
                  {qualityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: palette.muted }}>
                      <th style={{ padding: 12 }}>Company</th>
                      <th style={{ padding: 12 }}>Contact</th>
                      <th style={{ padding: 12 }}>Fit</th>
                      <th style={{ padding: 12 }}>Email Trust</th>
                      <th style={{ padding: 12 }}>Source</th>
                      <th style={{ padding: 12 }}>Status</th>
                      <th style={{ padding: 12 }}>Last Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => {
                      const emailStatus = verifiedEmailLabel(lead)
                      const sourceStatus = sourceConfidenceForLead(lead)
                      return (
                        <tr
                          key={lead.id}
                          data-testid="pipeline-row"
                          onClick={() => {
                            setSelectedLeadId(lead.id)
                            setActiveTab('Drafts')
                          }}
                          style={{ borderTop: `1px solid ${palette.line}`, cursor: 'pointer', background: lead.id === selectedLeadId ? '#F1F6FF' : 'transparent' }}
                        >
                          <td style={{ padding: 12, fontWeight: 800 }}>{lead.company}</td>
                          <td style={{ padding: 12 }}>{lead.contactName || lead.contactTitle || '-'}</td>
                          <td style={{ padding: 12, color: lead.fitScore >= 80 ? palette.green : palette.gold, fontWeight: 800 }}>{lead.fitScore || 0}</td>
                          <td style={{ padding: 12 }}><StatusPill value={emailStatus.label} tone={emailStatus.tone} /></td>
                          <td style={{ padding: 12 }}><StatusPill value={sourceStatus.label} tone={sourceStatus.tone} /></td>
                          <td style={{ padding: 12 }}>{statusLabels[lead.status] || lead.status}</td>
                          <td style={{ padding: 12, color: palette.muted }}>{formatTime(lead.updatedAt)}</td>
                        </tr>
                      )
                    })}
                    {!filteredLeads.length && (
                      <tr>
                        <td colSpan="7" style={{ padding: 18, color: palette.muted }}>
                          No leads match this data-quality filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        )}

        {activeTab === 'Pipeline' && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>Real lead pipeline</h2>
                <div style={{ color: palette.muted, marginTop: 6 }}>
                  Showing {filteredLeads.length} of {leads.length} lead{leads.length === 1 ? '' : 's'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={qualityFilter}
                  onChange={(event) => setQualityFilter(event.target.value)}
                  aria-label="Filter by data quality"
                  style={{ ...inputStyle, width: 240 }}
                >
                  {qualityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <Button variant="secondary" onClick={() => setActiveTab('Leads')}>Import leads</Button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1180 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: palette.muted }}>
                    <th style={{ padding: 12 }}>Company</th>
                    <th style={{ padding: 12 }}>Industry</th>
                    <th style={{ padding: 12 }}>Contact</th>
                    <th style={{ padding: 12 }}>Email</th>
                    <th style={{ padding: 12 }}>Verified Email</th>
                    <th style={{ padding: 12 }}>Source Confidence</th>
                    <th style={{ padding: 12 }}>Data Quality</th>
                    <th style={{ padding: 12 }}>Fit</th>
                    <th style={{ padding: 12 }}>Status</th>
                    <th style={{ padding: 12 }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const emailStatus = verifiedEmailLabel(lead)
                    const sourceStatus = sourceConfidenceForLead(lead)
                    const flags = qualityFlagsForLead(lead)
                    return (
                      <tr
                        key={lead.id}
                        data-testid="pipeline-row"
                        onClick={() => {
                          setSelectedLeadId(lead.id)
                          setActiveTab('Drafts')
                        }}
                        style={{
                          borderTop: `1px solid ${palette.line}`,
                          cursor: 'pointer',
                          background: lead.id === selectedLeadId ? '#F1F6FF' : 'transparent',
                        }}
                      >
                        <td style={{ padding: 12, fontWeight: 700 }}>{lead.company}</td>
                        <td style={{ padding: 12, color: palette.muted }}>{lead.industry || '-'}</td>
                        <td style={{ padding: 12 }}>{lead.contactName || lead.contactTitle || '-'}</td>
                        <td style={{ padding: 12, color: palette.muted }}>{lead.email || '-'}</td>
                        <td style={{ padding: 12 }}><StatusPill value={emailStatus.label} tone={emailStatus.tone} /></td>
                        <td style={{ padding: 12 }}><StatusPill value={sourceStatus.label} tone={sourceStatus.tone} /></td>
                        <td style={{ padding: 12, minWidth: 210 }}>
                          {flags.length ? flags.map((flag) => <QualityBadge key={flag.type} flag={flag} />) : <StatusPill value="Clean" tone="good" />}
                        </td>
                        <td style={{ padding: 12, color: lead.fitScore >= 80 ? palette.green : palette.gold }}>{lead.fitScore}</td>
                        <td style={{ padding: 12 }}>{statusLabels[lead.status] || lead.status}</td>
                        <td style={{ padding: 12, color: palette.muted }}>{formatTime(lead.updatedAt)}</td>
                      </tr>
                    )
                  })}
                  {!filteredLeads.length && (
                    <tr>
                      <td colSpan="10" style={{ padding: 18, color: palette.muted }}>
                        {leads.length
                          ? 'No leads match this data-quality filter.'
                          : 'No leads yet. Import verified leads to begin. This desk does not ship with fake production leads.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'Leads' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 18, alignItems: 'start' }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ color: palette.blue, textTransform: 'uppercase', fontSize: 12, fontWeight: 900, letterSpacing: 1.1 }}>Leads Workspace</div>
                  <h2 style={{ margin: '6px 0 4px', fontSize: 24 }}>Work leads from a source-backed table</h2>
                  <div style={{ color: palette.muted }}>Showing {workspaceLeads.length} of {leads.length} leads. Click any row to inspect trust, evidence, and outreach.</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <select value={leadSort} onChange={(event) => setLeadSort(event.target.value)} aria-label="Sort leads workspace" style={{ ...inputStyle, width: 150 }}>
                    <option value="updated_desc">Newest</option>
                    <option value="fit_desc">Fit high-low</option>
                    <option value="fit_asc">Fit low-high</option>
                    <option value="company_asc">Company A-Z</option>
                  </select>
                  <Button variant="secondary" onClick={() => setShowColumnControls((value) => !value)}>Columns</Button>
                  <Button variant="secondary" onClick={() => downloadCsv('capsigma-leads.csv', workspaceLeads.map(toLeadDrilldownRecord))}>Export</Button>
                  <Button variant="secondary" onClick={() => setLeadDensity(leadDensity === 'compact' ? 'comfortable' : 'compact')}>{leadDensity === 'compact' ? 'Comfortable' : 'Compact'}</Button>
                  <Button onClick={runProspectDiscovery} disabled={busy === 'prospect'}>{busy === 'prospect' ? 'Running...' : 'Run agent'}</Button>
                </div>
              </div>
              {showColumnControls && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, background: '#F8FAFC', border: `1px solid ${palette.line}`, borderRadius: 8, padding: 10 }}>
                  {Object.entries({
                    title: 'Title',
                    industry: 'Industry',
                    source: 'Source',
                    draft: 'Draft Status',
                    send: 'Send Status',
                    reply: 'Reply Status',
                  }).map(([key, label]) => (
                    <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: palette.muted, fontSize: 13, fontWeight: 800 }}>
                      <input
                        type="checkbox"
                        checked={visibleLeadColumns[key]}
                        onChange={() => setVisibleLeadColumns((current) => ({ ...current, [key]: !current[key] }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px 160px 160px', gap: 10, marginBottom: 12 }}>
                <input value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} placeholder="Search company, contact, email, source..." aria-label="Search leads workspace" style={inputStyle} />
                <select value={leadSavedView} onChange={(event) => setLeadSavedView(event.target.value)} aria-label="Saved lead view" style={inputStyle}>
                  <option>All leads</option>
                  <option>Needs review</option>
                  <option>Ready for outreach</option>
                  <option>Missing email</option>
                </select>
                <select value={leadStatusFilter} onChange={(event) => setLeadStatusFilter(event.target.value)} aria-label="Lead status filter" style={inputStyle}>
                  {leadStatuses.map((status) => <option key={status} value={status}>{status === 'All' ? 'All statuses' : statusLabels[status] || status}</option>)}
                </select>
                <select value={leadEmailFilter} onChange={(event) => setLeadEmailFilter(event.target.value)} aria-label="Email trust filter" style={inputStyle}>
                  <option>All</option>
                  <option>No email</option>
                  <option>Invalid</option>
                  <option>Unverified</option>
                  <option>Format valid</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <FilterChip label="View" value={leadSavedView} active={leadSavedView !== 'All leads'} onClick={() => setLeadSavedView('All leads')} />
                <FilterChip label="Status" value={leadStatusFilter} active={leadStatusFilter !== 'All'} onClick={() => setLeadStatusFilter('All')} />
                <FilterChip label="Email Trust" value={leadEmailFilter} active={leadEmailFilter !== 'All'} onClick={() => setLeadEmailFilter('All')} />
                <FilterChip label="Selected" value={selectedLeadIds.length} active={selectedLeadIds.length > 0} onClick={() => setSelectedLeadIds([])} />
                <Button variant="secondary" disabled={!selectedLeadIds.length}>Bulk qualify</Button>
                <Button variant="secondary" disabled={!selectedLeadIds.length}>Bulk export</Button>
              </div>

              <div style={{ overflowX: 'auto', border: `1px solid ${palette.line}`, borderRadius: 8 }}>
                <table data-testid="leads-workspace-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 1180 }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 1 }}>
                    <tr style={{ textAlign: 'left', color: palette.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      <th style={{ padding: 10, width: 36 }} />
                      <th style={{ padding: 10 }}>Company</th>
                      <th style={{ padding: 10 }}>Contact</th>
                      {visibleLeadColumns.title && <th style={{ padding: 10 }}>Title</th>}
                      {visibleLeadColumns.industry && <th style={{ padding: 10 }}>Industry</th>}
                      <th style={{ padding: 10 }}>Fit</th>
                      <th style={{ padding: 10 }}>Email Trust</th>
                      {visibleLeadColumns.source && <th style={{ padding: 10 }}>Source</th>}
                      {visibleLeadColumns.draft && <th style={{ padding: 10 }}>Draft Status</th>}
                      {visibleLeadColumns.send && <th style={{ padding: 10 }}>Send Status</th>}
                      {visibleLeadColumns.reply && <th style={{ padding: 10 }}>Reply Status</th>}
                      <th style={{ padding: 10 }}>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceLeads.map((lead) => {
                      const emailStatus = verifiedEmailLabel(lead)
                      const sourceStatus = sourceConfidenceForLead(lead)
                      const hasDraft = Boolean(lead.draftBody || lead.draftSubject)
                      const hasSent = ['sandbox_sent', 'live_sent', 'sent'].includes(lead.status) || Number(lead.emailsSent || 0) > 0
                      const replyStatus = lead.lastReplyAt || lead.replyType ? (lead.replyType || 'replied') : 'none'
                      return (
                        <tr
                          key={lead.id}
                          data-testid="leads-workspace-row"
                          onClick={() => openLeadDrawer(lead.id)}
                          style={{ borderTop: `1px solid ${palette.line}`, cursor: 'pointer', background: lead.id === selectedLeadId ? '#F1F6FF' : '#fff' }}
                        >
                          <td style={{ padding: leadDensity === 'compact' ? 7 : 11 }} onClick={(event) => event.stopPropagation()}>
                            <input type="checkbox" checked={selectedLeadIds.includes(lead.id)} onChange={() => toggleLeadSelection(lead.id)} aria-label={`Select ${lead.company}`} />
                          </td>
                          <td style={{ padding: leadDensity === 'compact' ? 7 : 11, fontWeight: 900 }}>{lead.company}</td>
                          <td style={{ padding: leadDensity === 'compact' ? 7 : 11 }}>{lead.contactName || '-'}</td>
                          {visibleLeadColumns.title && <td style={{ padding: leadDensity === 'compact' ? 7 : 11, color: palette.muted }}>{lead.contactTitle || '-'}</td>}
                          {visibleLeadColumns.industry && <td style={{ padding: leadDensity === 'compact' ? 7 : 11 }}>{lead.industry || '-'}</td>}
                          <td style={{ padding: leadDensity === 'compact' ? 7 : 11 }}><Badge tone={Number(lead.fitScore) >= 80 ? 'good' : Number(lead.fitScore) >= 60 ? 'warn' : 'neutral'}>{lead.fitScore || 0}</Badge></td>
                          <td style={{ padding: leadDensity === 'compact' ? 7 : 11 }}><Badge tone={emailStatus.tone === 'good' ? 'good' : emailStatus.tone === 'bad' ? 'bad' : 'warn'}>{emailStatus.label}</Badge></td>
                          {visibleLeadColumns.source && <td style={{ padding: leadDensity === 'compact' ? 7 : 11 }}><Badge tone={sourceStatus.tone === 'good' ? 'good' : 'warn'}>{sourceStatus.label}</Badge></td>}
                          {visibleLeadColumns.draft && <td style={{ padding: leadDensity === 'compact' ? 7 : 11 }}><Badge tone={hasDraft ? 'good' : 'neutral'}>{hasDraft ? 'Draft Ready' : 'No Draft'}</Badge></td>}
                          {visibleLeadColumns.send && <td style={{ padding: leadDensity === 'compact' ? 7 : 11 }}><Badge tone={hasSent ? 'good' : lead.status === 'preview_ready' ? 'warn' : 'neutral'}>{hasSent ? 'Sent' : statusLabels[lead.status] || lead.status}</Badge></td>}
                          {visibleLeadColumns.reply && <td style={{ padding: leadDensity === 'compact' ? 7 : 11 }}><Badge tone={replyStatus === 'none' ? 'neutral' : 'warn'}>{replyStatus}</Badge></td>}
                          <td style={{ padding: leadDensity === 'compact' ? 7 : 11, color: palette.muted }}>{formatTime(lead.updatedAt)}</td>
                        </tr>
                      )
                    })}
                    {!workspaceLeads.length && (
                      <tr>
                        <td colSpan="12" style={{ padding: 18, color: palette.muted }}>No leads match this workspace view.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div style={{ display: 'grid', gap: 18 }}>
              <Card>
                <h2 style={{ marginTop: 0, fontSize: 20 }}>Run agent</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  <Field label="Research query">
                    <textarea value={prospectQuery} onChange={(event) => updateProspectQuery(event.target.value)} rows={4} style={inputStyle} />
                  </Field>
                  <Field label="Industries">
                    <input value={prospectIndustries} onChange={(event) => setProspectIndustries(event.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Maximum prospects">
                    <input type="number" min="1" max="10" value={prospectLimit} onChange={(event) => setProspectLimit(event.target.value)} style={inputStyle} />
                  </Field>
                  <Field label="Target locations">
                    <textarea value={(intelligenceForm?.parameters?.targetLocations || intelligence?.parameters?.targetLocations || ['Houston, TX']).join('\n')} onChange={(event) => updateParameter('targetLocations', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} rows={2} style={inputStyle} />
                  </Field>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <input aria-label="Start radius miles" type="number" min="1" value={intelligenceForm?.parameters?.startingRadius || 25} onChange={(event) => updateParameter('startingRadius', Number(event.target.value))} style={inputStyle} />
                    <input aria-label="Radius step miles" type="number" min="1" value={intelligenceForm?.parameters?.radiusIncrement || 25} onChange={(event) => updateParameter('radiusIncrement', Number(event.target.value))} style={inputStyle} />
                    <input aria-label="Max radius miles" type="number" min="1" value={intelligenceForm?.parameters?.maxRadius || 100} onChange={(event) => updateParameter('maxRadius', Number(event.target.value))} style={inputStyle} />
                  </div>
                  <div style={{ color: palette.muted, fontSize: 13, lineHeight: 1.5 }}>
                    Starts at {intelligenceForm?.parameters?.startingRadius || 25} mi, expands by {intelligenceForm?.parameters?.radiusIncrement || 25} mi, max {intelligenceForm?.parameters?.maxRadius || 100} mi.
                  </div>
                  <Button variant="secondary" onClick={() => saveIntelligence({ busyKey: 'radius-save', successMessage: 'Campaign distance parameters saved.' })} disabled={busy === 'radius-save' || !intelligenceForm}>
                    {busy === 'radius-save' ? 'Saving...' : 'Save parameters'}
                  </Button>
                  <Button onClick={runProspectDiscovery} disabled={busy === 'prospect'}>{busy === 'prospect' ? 'Researching...' : 'Find prospects'}</Button>
                </div>
              </Card>

              <Card>
                <h2 style={{ marginTop: 0, fontSize: 20 }}>Import leads</h2>
                <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} rows={6} placeholder={csvExample} style={{ ...inputStyle, fontFamily: 'Consolas, monospace', lineHeight: 1.5 }} />
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button onClick={importLeads} disabled={busy === 'import'}>{busy === 'import' ? 'Importing...' : 'Import CSV'}</Button>
                  <Button variant="secondary" onClick={() => setCsvText(csvExample)}>Template</Button>
                </div>
              </Card>

              <Card>
                <h2 style={{ marginTop: 0, fontSize: 20 }}>Recent runs</h2>
                <div style={{ display: 'grid', gap: 10 }}>
                  {prospectRuns.slice(0, 5).map((run) => (
                    <div key={run.id} style={{ borderTop: `1px solid ${palette.line}`, paddingTop: 10 }}>
                      <div style={{ fontWeight: 900 }}>{run.query}</div>
                      <div style={{ color: palette.muted, fontSize: 13 }}>Imported {run.importedCount} | Rejected {run.rejectedCount} | {formatTime(run.createdAt)}</div>
                    </div>
                  ))}
                  {!prospectRuns.length && <div style={{ color: palette.muted }}>No prospect runs yet.</div>}
                </div>
              </Card>
            </div>
          </section>
        )}

        {activeTab === 'Drafts' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            {leads
              .filter((lead) => !['sandbox_sent', 'live_sent', 'sent', 'do_not_contact', 'not_fit'].includes(lead.status))
              .map((lead) => (
                <Card key={lead.id}>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <h2 style={{ margin: 0, fontSize: 19 }}>{lead.company}</h2>
                      <span style={{ color: lead.fitScore >= 60 ? palette.green : palette.gold, fontWeight: 800 }}>
                        {lead.fitScore}
                      </span>
                    </div>
                    <div style={{ color: palette.muted }}>{lead.industry || 'Unknown industry'}</div>
                    <div>{lead.contactName || lead.contactTitle || 'Contact not named'}</div>
                    <div style={{ color: palette.muted }}>{lead.email || 'No public email yet'}</div>
                    <div style={{ color: palette.muted, lineHeight: 1.6 }}>{lead.reason || lead.researchSummary || 'No background recorded.'}</div>
                    {lead.serviceLane && <div>Lane: {lead.serviceLane}</div>}
                    {lead.reviewStatus && <div style={{ color: palette.gold }}>{lead.reviewStatus}</div>}
                    {lead.sourceUrl && (
                      <a href={lead.sourceUrl} target="_blank" rel="noreferrer" style={{ color: palette.blue }}>
                        Source/background
                      </a>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <Button variant="secondary" onClick={() => markNeedsEdit(lead)} disabled={busy === `edit-${lead.id}`}>
                        Swipe left: edit
                      </Button>
                      <Button onClick={() => autoSendLead(lead)} disabled={busy === `auto-${lead.id}`}>
                        {busy === `auto-${lead.id}` ? 'Working...' : 'Swipe right: send'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            {!leads.filter((lead) => !['sandbox_sent', 'live_sent', 'sent', 'do_not_contact', 'not_fit'].includes(lead.status)).length && (
              <Card>
                <div style={{ color: palette.muted }}>No prospects waiting in the review queue.</div>
              </Card>
            )}
          </section>
        )}

        {activeTab === 'Drafts' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 380px) 1fr', gap: 18 }}>
            <Card>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>Selected lead</h2>
              {selectedLead ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <Field label="Lead">
                    <select
                      value={selectedLead.id}
                      onChange={(event) => setSelectedLeadId(event.target.value)}
                      style={inputStyle}
                    >
                      {leads.map((lead) => (
                        <option key={lead.id} value={lead.id}>{lead.company}</option>
                      ))}
                    </select>
                  </Field>
                  <div><strong>{selectedLead.company}</strong></div>
                  <div style={{ color: palette.muted, lineHeight: 1.6 }}>{selectedLead.reason || 'No background provided.'}</div>
                  <div>Email: {selectedLead.email || '-'}</div>
                  <div>Contact: {selectedLead.contactName || selectedLead.contactTitle || '-'}</div>
                  <div>Status: {statusLabels[selectedLead.status] || selectedLead.status}</div>
                  <div>Last drafted: {formatTime(selectedLead.lastDraftedAt)}</div>
                  <div>Last sent: {formatTime(selectedLead.lastSentAt)}</div>
                  <div>Last reply: {formatTime(selectedLead.lastReplyAt)}</div>
                  {selectedLead.sourceUrl && (
                    <a href={selectedLead.sourceUrl} target="_blank" rel="noreferrer" style={{ color: palette.blue }}>
                      Source
                    </a>
                  )}
                  <LeadTrustLedger lead={selectedLead} activity={activity} evidence={evidence} />
                  <Field label="Operator notes for this draft">
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} style={inputStyle} />
                  </Field>
                  <Button onClick={generateDraft} disabled={busy === 'draft'}>
                    {busy === 'draft' ? 'Generating...' : 'Generate draft'}
                  </Button>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Button variant="secondary" onClick={() => updateLeadStatus('qualified')} disabled={busy === 'qualified'}>
                      Qualify
                    </Button>
                    <Button variant="secondary" onClick={() => updateLeadStatus('not_fit')} disabled={busy === 'not_fit'}>
                      Not fit
                    </Button>
                    <Button variant="secondary" onClick={() => updateLeadStatus('replied', 'human')} disabled={busy === 'replied'}>
                      Human reply
                    </Button>
                    <Button variant="secondary" onClick={() => updateLeadStatus('replied', 'auto')} disabled={busy === 'replied'}>
                      Auto reply
                    </Button>
                  </div>
                  <Button variant="danger" onClick={suppressSelectedLead} disabled={busy === 'suppress' || !selectedLead.email}>
                    Suppress
                  </Button>
                </div>
              ) : (
                <div style={{ color: palette.muted }}>Import a lead first.</div>
              )}
            </Card>

            <Card>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>Draft and send</h2>
              <div style={{ display: 'grid', gap: 14 }}>
                <Field label="Subject">
                  <input value={draftSubject} onChange={(event) => setDraftSubject(event.target.value)} style={inputStyle} />
                </Field>
                <Field label="Email body">
                  <textarea value={draftBody} onChange={(event) => setDraftBody(event.target.value)} rows={16} style={{ ...inputStyle, lineHeight: 1.55 }} />
                </Field>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={approveDraft} disabled={!selectedLead || !draftSubject || !draftBody || busy === 'approve'}>
                    {busy === 'approve' ? 'Approving...' : 'Approve draft'}
                  </Button>
                  <Button onClick={sendEmail} disabled={!selectedLead || !draftSubject || !draftBody || busy === 'send'}>
                    {busy === 'send' ? 'Sending...' : 'Send if eligible'}
                  </Button>
                </div>
                <div style={{ borderTop: `1px solid ${palette.line}`, paddingTop: 14, display: 'grid', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 17 }}>Schedule into send queue</h3>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
                    <Field label="Send window">
                      <select value={scheduleWindow} onChange={(event) => setScheduleWindow(event.target.value)} style={{ ...inputStyle, width: 180 }}>
                        {scheduleWindows.map((windowTime) => (
                          <option key={windowTime} value={windowTime}>{windowTime}</option>
                        ))}
                      </select>
                    </Field>
                    <Button
                      variant="secondary"
                      onClick={scheduleSelectedLead}
                      disabled={!selectedLead || !draftSubject || !draftBody || busy === 'schedule'}
                    >
                      {busy === 'schedule' ? 'Scheduling...' : 'Schedule approved draft'}
                    </Button>
                  </div>
                  <div style={{ color: palette.muted, lineHeight: 1.6 }}>
                    Send windows are controlled from Intelligence and default to 08:00 and 15:00.
                  </div>
                </div>
                <div style={{ color: palette.muted, lineHeight: 1.6 }}>
                  Eligible prospects can send without manual approval. Placeholder emails, suppressed recipients, missing sources, low fit, and bad drafts are blocked server-side.
                </div>
              </div>
            </Card>
          </section>
        )}

        {activeTab === 'Schedule' && (
          <section style={{ display: 'grid', gap: 14 }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 20 }}>Scheduled send queue</h2>
                <Button variant="secondary" onClick={processDueScheduledSends} disabled={busy === 'schedule-due'}>
                  {busy === 'schedule-due' ? 'Processing...' : 'Process due sends'}
                </Button>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {scheduledSends.map((send) => (
                  <div key={send.id} data-testid="scheduled-send-row" style={{ borderTop: `1px solid ${palette.line}`, paddingTop: 10, display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 160px 120px 120px', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{send.contactEmail}</div>
                      <div style={{ color: palette.muted }}>{send.subject}</div>
                    </div>
                    <div>{formatTime(send.scheduledAt)}</div>
                    <div>{send.sendWindowLabel}</div>
                    <div style={{ color: palette.gold, fontWeight: 800 }}>{send.status}</div>
                  </div>
                ))}
                {!scheduledSends.length && <div style={{ color: palette.muted }}>No approved drafts are scheduled yet.</div>}
              </div>
            </Card>
            {sends.map((send) => (
              <Card key={send.id}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 360px) 1fr', gap: 18 }}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ color: ['sent', 'sandbox_sent', 'live_sent'].includes(send.status) ? palette.green : send.status === 'failed' ? palette.red : palette.gold, fontWeight: 800 }}>
                      {send.status.toUpperCase()}
                    </div>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{send.company || 'Unknown lead'}</h2>
                    <div>Actual recipient: {send.actualRecipient || send.toEmail}</div>
                    <div>Intended recipient: {send.intendedRecipient || send.toEmail}</div>
                    {send.sandbox && <div style={{ color: palette.gold }}>Sandbox proof delivery</div>}
                    <div>Contact: {send.contactName || send.contactTitle || '-'}</div>
                    <div>Fit: {send.fitScore || 0}</div>
                    <div>Sent: {formatTime(send.createdAt)}</div>
                    <div>Provider id: {send.providerMessageId || '-'}</div>
                    {send.sourceUrl && (
                      <a href={send.sourceUrl} target="_blank" rel="noreferrer" style={{ color: palette.blue }}>
                        Source
                      </a>
                    )}
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <div style={{ color: palette.muted, marginBottom: 6 }}>Background</div>
                      <div style={{ lineHeight: 1.6 }}>{send.reason || 'No background recorded.'}</div>
                    </div>
                    <div>
                      <div style={{ color: palette.muted, marginBottom: 6 }}>Subject</div>
                      <div style={{ fontWeight: 800 }}>{send.subject}</div>
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.55, background: '#F8FAFC', color: palette.text, border: `1px solid ${palette.line}`, borderRadius: 8, padding: 14 }}>
                      {send.body || 'No sent body recorded for this older send.'}
                    </pre>
                    {send.error && <div style={{ color: palette.red }}>{send.error}</div>}
                  </div>
                </div>
              </Card>
            ))}
            {!sends.length && (
              <Card>
                <div style={{ color: palette.muted }}>No send events yet.</div>
              </Card>
            )}
          </section>
        )}

        {activeTab === 'Replies' && (
          <section style={{ display: 'grid', gap: 14 }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Mailbox reply monitor</h2>
                  <div style={{ color: palette.muted, marginTop: 6, lineHeight: 1.6 }}>
                    {mailboxStatus?.connected
                      ? `Reply mailbox connected. Last sync: ${formatTime(mailboxStatus.lastSyncAt)}. Only replies matched to CapSigma sent outreach are shown.`
                      : mailboxStatus?.configured
                        ? 'Gmail OAuth is configured. Connect a reply mailbox to start campaign reply sync.'
                        : 'Gmail OAuth is not configured yet. Add Google OAuth secrets and a token encryption key.'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Button variant="secondary" onClick={connectGmail} disabled={busy === 'gmail-connect' || !mailboxStatus?.configured}>
                    {busy === 'gmail-connect' ? 'Connecting...' : mailboxStatus?.connected ? 'Reconnect Gmail' : 'Connect Gmail'}
                  </Button>
                  <Button onClick={syncGmailReplies} disabled={busy === 'gmail-sync' || !mailboxStatus?.connected}>
                    {busy === 'gmail-sync' ? 'Syncing...' : 'Sync replies'}
                  </Button>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={replyFilter} onChange={(event) => setReplyFilter(event.target.value)} aria-label="Filter replies" style={{ ...inputStyle, width: 220 }}>
                  <option value="needs_human">Needs human</option>
                  <option value="auto">Auto replies</option>
                  <option value="out_of_office">Out of office</option>
                  <option value="bounce">Bounces</option>
                  <option value="handled">Handled</option>
                  <option value="all">All replies</option>
                </select>
                <div style={{ color: palette.muted }}>Showing {filteredReplies.length} of {replies.length}</div>
              </div>
            </Card>
            {filteredReplies.map((reply) => (
              <Card key={reply.id}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 340px) 1fr', gap: 18 }}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ color: reply.needsHuman ? palette.gold : palette.muted, fontWeight: 800 }}>
                      {reply.classification || 'reply'}
                    </div>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{reply.company || reply.fromEmail}</h2>
                    <div>From: {reply.fromName || reply.fromEmail}</div>
                    <div>Received: {formatTime(reply.receivedAt || reply.createdAt)}</div>
                    {reply.sourceUrl && (
                      <a href={reply.sourceUrl} target="_blank" rel="noreferrer" style={{ color: palette.blue }}>
                        Source/background
                      </a>
                    )}
                    {reply.lastAction && (
                      <div style={{ color: palette.muted, fontSize: 13 }}>
                        Last action: {reply.lastAction.action} by {reply.lastAction.operator || 'operator'}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <Button variant="secondary" onClick={() => updateReplyWorkflow(reply, 'handled')} disabled={busy === `reply-${reply.id}-handled`}>
                        Mark handled
                      </Button>
                      <Button variant="secondary" onClick={() => updateReplyWorkflow(reply, 'follow_up_draft')} disabled={busy === `reply-${reply.id}-follow_up_draft`}>
                        Draft follow-up
                      </Button>
                      <Button variant="secondary" onClick={() => updateReplyWorkflow(reply, 'archive')} disabled={busy === `reply-${reply.id}-archive`}>
                        Archive
                      </Button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>{reply.subject || '(no subject)'}</div>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.55, background: '#F8FAFC', color: palette.text, border: `1px solid ${palette.line}`, borderRadius: 8, padding: 14 }}>
                      {reply.body || 'No body captured.'}
                    </pre>
                  </div>
                </div>
              </Card>
            ))}
            {!filteredReplies.length && (
              <Card>
                <div style={{ color: palette.muted }}>No replies match this workflow filter.</div>
              </Card>
            )}
          </section>
        )}

        {activeTab === 'Reports' && (
          <section style={{ display: 'grid', gap: 14 }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Clickable operator reports</h2>
                  <div style={{ color: palette.muted, marginTop: 6 }}>
                    Daily report cards open the matching drilldown or quality view.
                  </div>
                </div>
                <Button variant="secondary" onClick={saveReportSnapshot} disabled={busy === 'report-snapshot'}>
                  {busy === 'report-snapshot' ? 'Saving...' : 'Save report snapshot'}
                </Button>
              </div>
            </Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {(reports.summary || []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.metricId ? (setActiveTab('Command Center'), openReportDrilldown(item.metricId)) : item.qualityFilter ? openQualityFilter(item.qualityFilter) : undefined}
                  data-testid={`report-card-${item.id}`}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${palette.line}`,
                    borderRadius: 8,
                    padding: 16,
                    background: palette.panel,
                    color: palette.text,
                    cursor: item.metricId || item.qualityFilter ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ color: palette.muted, fontSize: 13 }}>{item.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{item.value}</div>
                  <div style={{ color: palette.gold, marginTop: 8, fontSize: 12, fontWeight: 800 }}>{item.actionLabel || 'Open detail'}</div>
                </button>
              ))}
              {!(reports.summary || []).length && <Card><div style={{ color: palette.muted }}>No report summary available yet.</div></Card>}
            </div>
            <Card>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>Recent snapshots</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {(reports.snapshots || []).map((snapshot) => (
                  <div key={snapshot.id} style={{ borderTop: `1px solid ${palette.line}`, paddingTop: 10 }}>
                    <div style={{ fontWeight: 800 }}>{snapshot.reportType || snapshot.report_type}</div>
                    <div style={{ color: palette.muted, fontSize: 13 }}>{snapshot.id}</div>
                    <div style={{ color: palette.muted }}>{formatTime(snapshot.createdAt || snapshot.created_at)}</div>
                  </div>
                ))}
                {!(reports.snapshots || []).length && <div style={{ color: palette.muted }}>No saved snapshots yet.</div>}
              </div>
            </Card>
          </section>
        )}

        {activeTab === 'Agent Runs' && (
          <section style={{ display: 'grid', gap: 14 }}>
            <Card>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>Agent run step logs</h2>
              <div style={{ color: palette.muted, lineHeight: 1.6 }}>
                Research, backfill, schedule, and acceptance jobs write step-level events here with inputs, outputs, confidence, and errors.
              </div>
            </Card>
            {agentEvents.map((event) => (
              <Card key={event.id} data-testid="agent-event-row">
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 280px) 1fr 160px', gap: 14 }}>
                  <div>
                    <div style={{ color: event.status === 'failed' ? palette.red : palette.green, fontWeight: 800 }}>{event.status}</div>
                    <h2 style={{ margin: '4px 0', fontSize: 19 }}>{event.workerName}</h2>
                    <div style={{ color: palette.muted }}>{event.eventType}</div>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.45, background: '#F8FAFC', color: palette.text, border: `1px solid ${palette.line}`, borderRadius: 8, padding: 12 }}>
                    {JSON.stringify({ input: event.input, output: event.output, error: event.error }, null, 2)}
                  </pre>
                  <div style={{ color: palette.muted }}>{formatTime(event.createdAt)}</div>
                </div>
              </Card>
            ))}
            {!agentEvents.length && <Card><div style={{ color: palette.muted }}>No agent events recorded yet.</div></Card>}
          </section>
        )}

        {activeTab === 'Legacy Import' && (
          <Card>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Import verified leads</h2>
            <p style={{ color: palette.muted, lineHeight: 1.6 }}>
              Paste CSV from a real lead source. Required column: company. Recommended columns: industry, fitScore,
              reason, contactName, contactTitle, email, sourceUrl, source.
            </p>
            <textarea
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              rows={12}
              placeholder={csvExample}
              style={{ ...inputStyle, fontFamily: 'Consolas, monospace', lineHeight: 1.5 }}
            />
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <Button onClick={importLeads} disabled={busy === 'import'}>{busy === 'import' ? 'Importing...' : 'Import CSV'}</Button>
              <Button variant="secondary" onClick={() => setCsvText(csvExample)}>Load CSV template</Button>
            </div>
          </Card>
        )}

        {activeTab === 'Intelligence' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 560px) 1fr', gap: 18 }}>
            <Card>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>CapSigma intelligence</h2>
              <div style={{ color: palette.muted, lineHeight: 1.6, marginBottom: 14 }}>
                Active version: {intelligence?.versionNumber || 'default'}. Future scoring, drafting, and scheduling should use this configuration.
              </div>
              <div style={{ display: 'grid', gap: 14 }}>
                <Field label="Short positioning">
                  <input
                    value={intelligenceForm?.positioning?.short || ''}
                    onChange={(event) => updateIntelligenceField('positioning', 'short', event.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Value proposition">
                  <textarea
                    value={intelligenceForm?.positioning?.valueProposition || ''}
                    onChange={(event) => updateIntelligenceField('positioning', 'valueProposition', event.target.value)}
                    rows={4}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Preferred CTA">
                  <input
                    value={intelligenceForm?.positioning?.preferredCta || ''}
                    onChange={(event) => updateIntelligenceField('positioning', 'preferredCta', event.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Services, one per line">
                  <textarea
                    value={(intelligenceForm?.services || []).join('\n')}
                    onChange={(event) => updateIntelligenceList('services', event.target.value)}
                    rows={8}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Differentiators, one per line">
                  <textarea
                    value={(intelligenceForm?.differentiators || []).join('\n')}
                    onChange={(event) => updateIntelligenceList('differentiators', event.target.value)}
                    rows={6}
                    style={inputStyle}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>Campaign parameters and send windows</h2>
              <div style={{ display: 'grid', gap: 14 }}>
                <Field label="Target country">
                  <input
                    value={intelligenceForm?.parameters?.targetCountry || 'United States'}
                    onChange={(event) => updateParameter('targetCountry', event.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Target locations, one per line">
                  <textarea
                    value={(intelligenceForm?.parameters?.targetLocations || []).join('\n')}
                    onChange={(event) => updateParameter('targetLocations', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
                    rows={4}
                    style={inputStyle}
                  />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  <Field label="Start radius">
                    <input type="number" value={intelligenceForm?.parameters?.startingRadius || 25} onChange={(event) => updateParameter('startingRadius', Number(event.target.value))} style={inputStyle} />
                  </Field>
                  <Field label="Radius step">
                    <input type="number" value={intelligenceForm?.parameters?.radiusIncrement || 25} onChange={(event) => updateParameter('radiusIncrement', Number(event.target.value))} style={inputStyle} />
                  </Field>
                  <Field label="Max radius">
                    <input type="number" value={intelligenceForm?.parameters?.maxRadius || 100} onChange={(event) => updateParameter('maxRadius', Number(event.target.value))} style={inputStyle} />
                  </Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                  <Field label="Fit minimum">
                    <input type="number" value={intelligenceForm?.parameters?.fitScoreMinimum || 60} onChange={(event) => updateParameter('fitScoreMinimum', Number(event.target.value))} style={inputStyle} />
                  </Field>
                  <Field label="Auto draft">
                    <input type="number" value={intelligenceForm?.parameters?.autoDraftThreshold || 70} onChange={(event) => updateParameter('autoDraftThreshold', Number(event.target.value))} style={inputStyle} />
                  </Field>
                  <Field label="Auto schedule">
                    <input type="number" value={intelligenceForm?.parameters?.autoScheduleThreshold || 80} onChange={(event) => updateParameter('autoScheduleThreshold', Number(event.target.value))} style={inputStyle} />
                  </Field>
                </div>
                <Field label="Automation mode">
                  <select
                    value={intelligenceForm?.parameters?.automationMode || 'review_required'}
                    onChange={(event) => updateParameter('automationMode', event.target.value)}
                    style={inputStyle}
                  >
                    <option value="manual">Manual</option>
                    <option value="review_required">Review Required</option>
                    <option value="trusted_auto_schedule">Trusted Auto-Schedule</option>
                    <option value="full_auto">Full Auto Future Mode</option>
                  </select>
                </Field>
                <Field label="Send windows, one HH:mm time per line">
                  <textarea
                    value={scheduleWindows.join('\n')}
                    onChange={(event) => setScheduleWindows(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
                    rows={4}
                    style={inputStyle}
                  />
                </Field>
                <Button onClick={saveIntelligence} disabled={busy === 'intelligence-save' || !intelligenceForm}>
                  {busy === 'intelligence-save' ? 'Saving...' : 'Save new intelligence version'}
                </Button>
                <div style={{ color: palette.muted, lineHeight: 1.6 }}>
                  Saving creates a new version. Draft and schedule proof can show which configuration was active.
                </div>
              </div>
            </Card>
          </section>
        )}

        {activeTab === 'Settings' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 520px) 1fr', gap: 18 }}>
            <Card>
              <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 900, letterSpacing: 1.1 }}>Settings</div>
              <h2 style={{ margin: '8px 0 12px', fontSize: 22 }}>Integrations</h2>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  ['Database', session.configured?.database, 'D1 persistence'],
                  ['OpenAI', session.configured?.openai, 'Draft and research generation'],
                  ['SendGrid', session.configured?.sendgrid, session.configured?.sendgrid ? 'Delivery provider connected' : 'Preview-only until configured'],
                  ['Gmail', session.configured?.gmailConnected, session.configured?.gmailConnected ? 'Reply mailbox connected' : 'Reply mailbox not connected'],
                ].map(([label, ok, detail]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderTop: `1px solid ${palette.line}`, paddingTop: 12 }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{label}</div>
                      <div style={{ color: palette.muted, fontSize: 13 }}>{detail}</div>
                    </div>
                    <StatusPill value={ok ? 'Connected' : 'Needs setup'} tone={ok ? 'good' : 'warn'} />
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 style={{ marginTop: 0, fontSize: 22 }}>Sender identity</h2>
              <div style={{ color: palette.muted, lineHeight: 1.6, marginBottom: 14 }}>
                Main dashboard hides personal mailbox details. Switch to the client sender only after client approval and SendGrid verification.
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <TrustItem label="Current sender" value={maskEmail(session.configured?.fromEmail)} />
                <TrustItem label="Reply-To" value={maskEmail(session.configured?.replyToEmail)} />
                <TrustItem label="Proof copy CC" value={(session.configured?.ccEmails || []).map(maskEmail).join(', ') || '-'} />
                <TrustItem label="Sandbox destination" value={session.configured?.sandboxMode ? maskEmail(session.configured?.recipientOverride) : 'Production delivery'} tone={session.configured?.sandboxMode ? 'warn' : 'good'} />
                <TrustItem label="Approved future sender" value="hello@capsigma.com after client approval and SendGrid verification" />
              </div>
            </Card>
          </section>
        )}

        {activeTab === 'Admin' && (
          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 520px) 1fr', gap: 18 }}>
            <Card style={{ borderColor: '#67323A' }}>
              <div style={{ color: palette.red, textTransform: 'uppercase', fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>
                Admin-only handover reset
              </div>
              <h2 style={{ margin: '8px 0 8px', fontSize: 20 }}>Purge demo data</h2>
              <p style={{ color: palette.muted, lineHeight: 1.6 }}>
                This removes records with explicit demo, test, smoke, internal QA, recipient-test, or example-domain signals.
                CapSigma intelligence, sender settings, suppressions, and system configuration are preserved.
              </p>
              <div style={{ display: 'grid', gap: 10, margin: '16px 0' }}>
                {[
                  ['Leads', purgePlan?.counts?.leads],
                  ['Drafts', purgePlan?.counts?.drafts],
                  ['Send events', purgePlan?.counts?.sends],
                  ['Replies', purgePlan?.counts?.replies],
                  ['Activity logs', purgePlan?.counts?.activities],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${palette.line}`, paddingTop: 10 }}>
                    <span style={{ color: palette.muted }}>{label}</span>
                    <strong>{value ?? '-'}</strong>
                  </div>
                ))}
              </div>
              <Field label={`Type ${purgePlan?.confirmationPhrase || 'PURGE CAPSIGMA DEMO DATA'} to confirm`}>
                <input
                  value={purgeConfirmation}
                  onChange={(event) => setPurgeConfirmation(event.target.value)}
                  style={inputStyle}
                  autoComplete="off"
                />
              </Field>
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <Button variant="secondary" onClick={loadData}>Refresh dry run</Button>
                <Button
                  variant="danger"
                  onClick={purgeDemoData}
                  disabled={
                    busy === 'purge-demo' ||
                    !purgePlan ||
                    purgeConfirmation !== (purgePlan.confirmationPhrase || 'PURGE CAPSIGMA DEMO DATA')
                  }
                >
                  {busy === 'purge-demo' ? 'Purging...' : 'Purge demo data'}
                </Button>
              </div>
            </Card>

            <Card>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>Handover proof</h2>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <div style={{ color: palette.muted, marginBottom: 8 }}>Normalized evidence backfill</div>
                  <Button variant="secondary" onClick={backfillEvidence} disabled={busy === 'backfill-evidence'}>
                    {busy === 'backfill-evidence' ? 'Backfilling...' : 'Backfill legacy evidence'}
                  </Button>
                </div>
                <div>
                  <div style={{ color: palette.muted, marginBottom: 8 }}>Configuration preserved</div>
                  <ul style={{ margin: 0, paddingLeft: 18, color: palette.muted, lineHeight: 1.8 }}>
                    {(purgePlan?.preservedConfig || []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <div style={{ color: palette.muted, marginBottom: 8 }}>Sample matched lead IDs</div>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.5, background: '#F8FAFC', color: palette.text, border: `1px solid ${palette.line}`, borderRadius: 8, padding: 14 }}>
                    {(purgePlan?.sampleLeadIds || []).join('\n') || 'No demo/test leads matched by dry run.'}
                  </pre>
                </div>
                {purgeResult && (
                  <div style={{ borderTop: `1px solid ${palette.line}`, paddingTop: 12 }}>
                    <div style={{ color: palette.green, fontWeight: 800 }}>Last purge completed</div>
                    <div style={{ color: palette.muted, marginTop: 6 }}>Snapshot: {purgeResult.preservedConfigSnapshotId}</div>
                    <div style={{ color: palette.muted }}>Time: {formatTime(purgeResult.purgedAt)}</div>
                  </div>
                )}
              </div>
            </Card>
          </section>
        )}

        {activeTab === 'Admin' && (
          <section style={{ display: 'grid', gap: 14 }}>
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>Production acceptance pass</h2>
                  <div style={{ color: acceptance.ready ? palette.green : palette.gold, marginTop: 6, fontWeight: 800 }}>
                    {acceptance.ready ? 'All required checks are green' : 'Some checks need review before turnkey handover'}
                  </div>
                  {acceptance.lastRun && (
                    <div style={{ color: palette.muted, marginTop: 4 }}>Last recorded: {formatTime(acceptance.lastRun.createdAt || acceptance.lastRun.created_at)}</div>
                  )}
                </div>
                <Button onClick={runAcceptanceCheck} disabled={busy === 'acceptance'}>
                  {busy === 'acceptance' ? 'Checking...' : 'Record acceptance pass'}
                </Button>
              </div>
            </Card>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {(acceptance.checks || []).map((check) => <AcceptanceCheck key={check.id} check={check} />)}
              {!(acceptance.checks || []).length && <Card><div style={{ color: palette.muted }}>No acceptance checks loaded yet.</div></Card>}
            </div>
          </section>
        )}

        {activeTab === 'Data Evidence' && (
          <Card>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Proof ledger</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {activity.map((entry) => (
                <div key={entry.id} style={{ borderTop: `1px solid ${palette.line}`, paddingTop: 12, display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{entry.label}</div>
                    <div style={{ color: palette.muted, fontSize: 13 }}>{entry.type}</div>
                  </div>
                  <div style={{ color: palette.muted }}>{formatTime(entry.createdAt)}</div>
                </div>
              ))}
              {!activity.length && <div style={{ color: palette.muted }}>No proof events yet.</div>}
            </div>
          </Card>
        )}
        <LeadDrawer
          lead={leadDrawerOpen ? selectedLead : null}
          activity={activity}
          evidence={evidence}
          sends={sends}
          replies={replies}
          onClose={() => setLeadDrawerOpen(false)}
        />
      </div>
      </div>
    </main>
  )
}
