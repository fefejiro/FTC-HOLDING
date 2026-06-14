import { requireAuth } from '../_lib/auth.js'
import { addActivity, getDb, getLead, newId, nowIso } from '../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../_lib/json.js'
import { sanitizeOutreachText, scanDraftQuality } from '../_lib/validation.js'

const signature = `Best regards,

Niyi Olumide, PMP, CSM
General Manager, CapSigma`

const systemPrompt = `You write concise business development outreach for CapSigma, a data operations company. CapSigma's positioning: Your data, our discipline. Services include forms and records digitization, operational and transaction processing, data cleansing and enrichment, non-clinical administrative support, and financial transaction processing. Differentiators: disciplined process design, versioned delivery guides, accuracy targets, HIPAA-aligned controls when relevant, West Africa delivery capacity with GMT/WAT overlap, and a no-cost pilot entry point. Write as Niyi Olumide, PMP, CSM. Be direct, useful, specific, and human. Do not fabricate a relationship, do not imply a prior conversation, and do not overpromise. Use plain ASCII punctuation. Do not use em dashes, repeated dashes, underscores, filler words like umm or eem, or bracketed placeholders. End with this exact signature:
${signature}`

function leadPrompt(lead, notes = '') {
  return `Create a cold outreach email for this prospect.

Company: ${lead.company}
Industry: ${lead.industry || 'Unknown'}
Contact name: ${lead.contact_name || 'Unknown'}
Contact title: ${lead.contact_title || 'Unknown'}
Known problem / fit reason: ${lead.reason || 'Operational data quality and processing needs'}
Source URL: ${lead.source_url || 'Not provided'}
Service lane: ${lead.service_lane || 'Infer from the fit reason'}
Research summary: ${lead.research_summary || 'None'}
Operator notes: ${notes || 'None'}

Return exactly:
Subject: <short subject>

<email body>`
}

function parseDraft(text, company) {
  const clean = sanitizeOutreachText(text)
  const subjectMatch = clean.match(/^Subject:\s*(.+)$/im)
  const subject = sanitizeOutreachText(
    subjectMatch ? subjectMatch[1].trim() : `CapSigma pilot for ${company}`,
  )
  const body = clean.replace(/^Subject:\s*.+\n*/i, '').trim()
  return { subject, body: cleanDraftBody(body || clean) }
}

function cleanDraftBody(text) {
  let body = sanitizeOutreachText(text)

  if (!body.includes('Niyi Olumide')) {
    body = `${body}\n\n${signature}`
  }

  body = body.replace(
    /Best regards,\s*\n+\s*Niyi Olumide, PMP, CSM\s*\n+\s*CapSigma\s*$/i,
    signature,
  )

  return sanitizeOutreachText(body)
}

export async function onRequest(context) {
  const { request, env } = context

  if (request.method !== 'POST') return methodNotAllowed()

  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  const leadId = String(body.leadId || '')
  if (!leadId) return json({ error: 'leadId is required' }, { status: 400 })

  const lead = await getLead(db, leadId)
  if (!lead) return json({ error: 'Lead not found' }, { status: 404 })

  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) return json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 })

  const model = env.OPENAI_MODEL || 'gpt-4o-mini'
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: leadPrompt(lead, body.notes) },
      ],
      max_tokens: 900,
      temperature: 0.2,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    return json(
      { error: 'OpenAI request failed', status: response.status, details: data },
      { status: response.status },
    )
  }

  const content = data?.choices?.[0]?.message?.content || ''
  const draft = parseDraft(content, lead.company)
  const quality = scanDraftQuality(draft.subject, draft.body)
  if (!quality.ok) {
    return json(
      { error: 'Generated draft failed quality checks', issues: quality.issues },
      { status: 422 },
    )
  }

  const now = nowIso()
  const draftId = newId('draft')

  await db
    .prepare(
      `INSERT INTO drafts (id, lead_id, subject, body, model, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(draftId, leadId, draft.subject, draft.body, model, now)
    .run()

  await db
    .prepare(
      `UPDATE leads
       SET draft_subject = ?, draft_body = ?, emails_drafted = emails_drafted + 1,
           last_drafted_at = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(draft.subject, draft.body, now, 'drafted', now, leadId)
    .run()

  await addActivity(db, {
    leadId,
    type: 'draft_created',
    label: `Draft created for ${lead.company}`,
    metadata: { draftId, model },
  })

  return json({ draftId, leadId, draftSubject: draft.subject, draftBody: draft.body })
}
