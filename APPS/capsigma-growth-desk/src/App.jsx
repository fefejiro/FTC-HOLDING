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

const statusLabels = {
  new: 'New',
  qualified: 'Qualified',
  drafted: 'Drafted',
  approved: 'Approved',
  preview_ready: 'Preview proof',
  sent: 'Sent',
  replied: 'Replied',
  not_fit: 'Not fit',
  do_not_contact: 'Do not contact',
}

const palette = {
  bg: '#090A0F',
  panel: '#12141C',
  panel2: '#171A24',
  line: '#2C3140',
  text: '#F1F3F8',
  muted: '#9CA6BA',
  gold: '#D5AF62',
  green: '#78D99D',
  red: '#F28B82',
  blue: '#8AB4F8',
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

function metricValue(leads, status) {
  return leads.filter((lead) => lead.status === status).length
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
    primary: { background: palette.gold, color: '#111' },
    secondary: { background: palette.panel2, color: palette.text, border: `1px solid ${palette.line}` },
    danger: { background: '#3B1F24', color: palette.red, border: '1px solid #67323A' },
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

function Card({ children, style }) {
  return (
    <section
      style={{
        background: palette.panel,
        border: `1px solid ${palette.line}`,
        borderRadius: 8,
        padding: 18,
        ...style,
      }}
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
  background: '#0D0F16',
  color: palette.text,
  border: `1px solid ${palette.line}`,
  borderRadius: 8,
  padding: '12px 14px',
  outline: 'none',
}

export default function App() {
  const [session, setSession] = useState(null)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState('Pipeline')
  const [leads, setLeads] = useState([])
  const [activity, setActivity] = useState([])
  const [sends, setSends] = useState([])
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [csvText, setCsvText] = useState('')
  const [notes, setNotes] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) || leads[0] || null,
    [leads, selectedLeadId],
  )

  const metrics = useMemo(
    () => [
      { label: 'Leads', value: leads.length },
      { label: 'Drafted', value: metricValue(leads, 'drafted') },
      { label: 'Approved', value: metricValue(leads, 'approved') },
      { label: 'Sent', value: metricValue(leads, 'sent') },
      { label: 'Replies', value: leads.filter((lead) => lead.replyType).length },
    ],
    [leads],
  )

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
    const [leadData, activityData] = await Promise.all([
      api('/api/leads'),
      api('/api/activity'),
    ])
    setLeads(leadData.leads || [])
    setActivity(activityData.activity || [])
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
      setActiveTab('Pipeline')
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
      const result = await api('/api/send-email', {
        method: 'POST',
        body: JSON.stringify({ leadId: selectedLead.id }),
      })
      setNotice(result.preview ? 'Preview proof recorded. Configure SendGrid to deliver.' : 'Email sent and proof recorded.')
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

  return (
    <main style={{ minHeight: '100vh', background: palette.bg, color: palette.text, padding: 24 }}>
      <div style={{ maxWidth: 1380, margin: '0 auto', display: 'grid', gap: 18 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: palette.gold, textTransform: 'uppercase', fontSize: 12, fontWeight: 800, letterSpacing: 1.2 }}>
              CapSigma Growth Desk
            </div>
            <h1 style={{ margin: '6px 0 0', fontSize: 30 }}>Outreach operating desk</h1>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: session.configured?.database ? palette.green : palette.red }}>
              D1 {session.configured?.database ? 'ready' : 'missing'}
            </span>
            <span style={{ color: session.configured?.openai ? palette.green : palette.red }}>
              OpenAI {session.configured?.openai ? 'ready' : 'missing'}
            </span>
            <span style={{ color: session.configured?.sendgrid ? palette.green : palette.gold }}>
              SendGrid {session.configured?.sendgrid ? 'ready' : 'preview'}
            </span>
            {session.configured?.fromEmail && (
              <span style={{ color: palette.muted }}>From {session.configured.fromEmail}</span>
            )}
            {session.configured?.replyToEmail && (
              <span style={{ color: palette.muted }}>Reply-To {session.configured.replyToEmail}</span>
            )}
            {session.configured?.ccEmails?.length > 0 && (
              <span style={{ color: palette.muted }}>CC {session.configured.ccEmails.join(', ')}</span>
            )}
            <Button variant="secondary" onClick={loadData}>Refresh</Button>
            <Button variant="secondary" onClick={logout}>Logout</Button>
          </div>
        </header>

        <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Pipeline', 'Outreach', 'Sent Review', 'Import', 'Intelligence', 'Evidence'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </nav>

        {(notice || error) && (
          <div style={{ color: error ? palette.red : palette.green, fontWeight: 700 }}>
            {error || notice}
          </div>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {metrics.map((metric) => (
            <Card key={metric.label} style={{ padding: 14 }}>
              <div style={{ color: palette.muted, fontSize: 13 }}>{metric.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{metric.value}</div>
            </Card>
          ))}
        </section>

        {activeTab === 'Pipeline' && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Real lead pipeline</h2>
              <Button variant="secondary" onClick={() => setActiveTab('Import')}>Import leads</Button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: palette.muted }}>
                    <th style={{ padding: 12 }}>Company</th>
                    <th style={{ padding: 12 }}>Industry</th>
                    <th style={{ padding: 12 }}>Contact</th>
                    <th style={{ padding: 12 }}>Email</th>
                    <th style={{ padding: 12 }}>Fit</th>
                    <th style={{ padding: 12 }}>Status</th>
                    <th style={{ padding: 12 }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => {
                        setSelectedLeadId(lead.id)
                        setActiveTab('Outreach')
                      }}
                      style={{
                        borderTop: `1px solid ${palette.line}`,
                        cursor: 'pointer',
                        background: lead.id === selectedLeadId ? '#181B26' : 'transparent',
                      }}
                    >
                      <td style={{ padding: 12, fontWeight: 700 }}>{lead.company}</td>
                      <td style={{ padding: 12, color: palette.muted }}>{lead.industry || '-'}</td>
                      <td style={{ padding: 12 }}>{lead.contactName || lead.contactTitle || '-'}</td>
                      <td style={{ padding: 12, color: palette.muted }}>{lead.email || '-'}</td>
                      <td style={{ padding: 12, color: lead.fitScore >= 80 ? palette.green : palette.gold }}>{lead.fitScore}</td>
                      <td style={{ padding: 12 }}>{statusLabels[lead.status] || lead.status}</td>
                      <td style={{ padding: 12, color: palette.muted }}>{formatTime(lead.updatedAt)}</td>
                    </tr>
                  ))}
                  {!leads.length && (
                    <tr>
                      <td colSpan="7" style={{ padding: 18, color: palette.muted }}>
                        No leads yet. Import verified leads to begin. This desk does not ship with fake production leads.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'Outreach' && (
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
              <h2 style={{ marginTop: 0, fontSize: 20 }}>Review and approve</h2>
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
                  <Button onClick={sendEmail} disabled={!selectedLead || selectedLead.status !== 'approved' || busy === 'send'}>
                    {busy === 'send' ? 'Sending...' : 'Send approved email'}
                  </Button>
                </div>
                <div style={{ color: palette.muted, lineHeight: 1.6 }}>
                  Sending is blocked until the draft is approved. Placeholder emails and suppressed recipients are blocked server-side.
                </div>
              </div>
            </Card>
          </section>
        )}

        {activeTab === 'Sent Review' && (
          <section style={{ display: 'grid', gap: 14 }}>
            {sends.map((send) => (
              <Card key={send.id}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 360px) 1fr', gap: 18 }}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ color: send.status === 'sent' ? palette.green : send.status === 'failed' ? palette.red : palette.gold, fontWeight: 800 }}>
                      {send.status.toUpperCase()}
                    </div>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{send.company || 'Unknown lead'}</h2>
                    <div>To: {send.toEmail}</div>
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
                    <pre style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.55, background: '#0D0F16', border: `1px solid ${palette.line}`, borderRadius: 8, padding: 14 }}>
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

        {activeTab === 'Import' && (
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
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {industries.map((industry) => (
              <Card key={industry.name}>
                <h2 style={{ marginTop: 0, fontSize: 18 }}>{industry.name}</h2>
                <ul style={{ color: palette.muted, lineHeight: 1.7, paddingLeft: 18 }}>
                  {industry.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </Card>
            ))}
          </section>
        )}

        {activeTab === 'Evidence' && (
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
      </div>
    </main>
  )
}
