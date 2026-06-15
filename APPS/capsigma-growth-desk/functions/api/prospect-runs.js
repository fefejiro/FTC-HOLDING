import { requireAuth } from '../_lib/auth.js'
import { addActivity, getDb, newId, nowIso } from '../_lib/db.js'
import { json, methodNotAllowed, readJson } from '../_lib/json.js'
import { normalizeLead, validateLead } from '../_lib/validation.js'

function extractResponseText(data) {
  if (data?.output_text) return data.output_text
  const chunks = []
  for (const item of data?.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text)
      if (content.type === 'text' && content.text) chunks.push(content.text)
    }
  }
  return chunks.join('\n').trim()
}

function parseJsonText(text) {
  const clean = String(text || '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

function prospectPrompt({ query, industries, maxResults }) {
  const targetIndustries = industries || 'healthcare, real estate, energy, financial services, logistics, retail, technology'
  return `Find source-backed CapSigma outreach prospects.

CapSigma services:
- admin processing
- forms and records digitization
- data cleanup and enrichment
- transaction processing
- non-clinical support
- back-office operations

Target query: ${query}
Target industries: ${targetIndustries}
Maximum prospects: ${maxResults}

Rules:
- Use public web sources only.
- Treat the target industries as a hard filter. Do not return prospects outside the target industries.
- If the query or target industries say "only", return only that industry and do not substitute adjacent industries.
- Do not invent email addresses.
- Include an email only when the source publicly lists a valid email address.
- If no public email is listed, leave "email" as an empty string. Do not write "not publicly available", "n/a", or placeholder email text.
- Each prospect must include a sourceUrl.
- Keep reason, researchSummary, sourceQuote, and whyReachOut concise so the JSON is complete.
- fitScore must be an integer from 0 to 100. For good matches, use 60 to 95, not a 1 to 10 scale.
- Prefer operational leaders, administration, revenue operations, records, finance operations, back-office, data operations, or contact mailboxes.
- Return JSON only.

JSON shape:
{
  "summary": "short run summary",
  "prospects": [
    {
      "company": "",
      "industry": "",
      "fitScore": 0,
      "reason": "",
      "contactName": "",
      "contactTitle": "",
      "email": "",
      "sourceUrl": "",
      "source": "public web research",
      "serviceLane": "",
      "researchSummary": "",
      "evidence": {
        "sourceTitle": "",
        "sourceQuote": "",
        "whyReachOut": ""
      }
    }
  ]
}`
}

export function cleanProspectEmail(value = '') {
  const email = String(value || '').trim()
  if (!email) return ''
  if (/^(not\s+publicly\s+available|not\s+available|unavailable|unknown|none|null|n\/a|na)$/i.test(email)) {
    return ''
  }
  return email
}

function textForProspect(prospect = {}) {
  return [
    prospect.company,
    prospect.industry,
    prospect.reason,
    prospect.contactTitle,
    prospect.serviceLane,
    prospect.researchSummary,
    prospect.sourceUrl,
    prospect.source,
    prospect.evidence?.sourceTitle,
    prospect.evidence?.sourceQuote,
    prospect.evidence?.whyReachOut,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function strictTarget(query, industries) {
  const text = `${query || ''} ${industries || ''}`.toLowerCase()
  if (/\boil\s*(and|&)?\s*gas\b|\bpetroleum\b|\bupstream\b|\bmidstream\b|\bdownstream\b|\blng\b/.test(text)) {
    return {
      label: 'oil and gas',
      patterns: [
        /\boil\s*(and|&)?\s*gas\b/i,
        /\bpetroleum\b/i,
        /\bnatural gas\b/i,
        /\bupstream\b/i,
        /\bmidstream\b/i,
        /\bdownstream\b/i,
        /\bpipeline(s)?\b/i,
        /\bdrilling\b/i,
        /\brefiner(y|ies|ing)\b/i,
        /\bpetrochemical(s)?\b/i,
        /\bhydrocarbon(s)?\b/i,
        /\blng\b/i,
        /\bexploration\b/i,
      ],
    }
  }
  return null
}

export function validateTargetIndustry(prospect, target) {
  if (!target) return []
  const text = textForProspect(prospect)
  return target.patterns.some((pattern) => pattern.test(text))
    ? []
    : [`Prospect does not match target industry: ${target.label}`]
}

async function insertRun(db, run) {
  await db
    .prepare(
      `INSERT INTO prospect_runs (
        id, query, target_industries, status, requested_limit, imported_count,
        rejected_count, summary, raw_response, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      run.id,
      run.query,
      run.targetIndustries,
      run.status,
      run.requestedLimit,
      run.importedCount,
      run.rejectedCount,
      run.summary,
      run.rawResponse,
      run.createdAt,
      run.completedAt,
    )
    .run()
}

async function insertLead(db, lead, now) {
  await db
    .prepare(
      `INSERT INTO leads (
        id, company, industry, fit_score, reason, contact_name, contact_title,
        email, source_url, source, service_lane, research_summary, evidence_json,
        review_status, discovery_run_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        company = excluded.company,
        industry = excluded.industry,
        fit_score = excluded.fit_score,
        reason = excluded.reason,
        contact_name = excluded.contact_name,
        contact_title = excluded.contact_title,
        email = excluded.email,
        source_url = excluded.source_url,
        source = excluded.source,
        service_lane = excluded.service_lane,
        research_summary = excluded.research_summary,
        evidence_json = excluded.evidence_json,
        review_status = excluded.review_status,
        discovery_run_id = excluded.discovery_run_id,
        updated_at = excluded.updated_at`,
    )
    .bind(
      lead.id,
      lead.company,
      lead.industry,
      lead.fit_score,
      lead.reason,
      lead.contact_name,
      lead.contact_title,
      lead.email,
      lead.source_url,
      lead.source,
      lead.service_lane,
      lead.research_summary,
      lead.evidence_json,
      lead.review_status,
      lead.discovery_run_id,
      lead.status,
      now,
      now,
    )
    .run()
}

async function handleGet({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const { results } = await db
    .prepare('SELECT * FROM prospect_runs ORDER BY created_at DESC LIMIT 25')
    .all()

  return json({
    runs: (results || []).map((row) => ({
      id: row.id,
      query: row.query,
      targetIndustries: row.target_industries,
      status: row.status,
      requestedLimit: row.requested_limit,
      importedCount: row.imported_count,
      rejectedCount: row.rejected_count,
      summary: row.summary,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    })),
  })
}

async function handlePost({ request, env }) {
  const auth = await requireAuth(request, env)
  if (auth) return auth

  const db = getDb(env)
  if (!db) return json({ error: 'CAPSIGMA_DB is not configured' }, { status: 500 })

  const body = await readJson(request)
  if (!body) return json({ error: 'Invalid JSON body' }, { status: 400 })

  const query = String(body.query || '').trim()
  if (!query) return json({ error: 'query is required' }, { status: 400 })

  const apiKey = env.OPENAI_API_KEY
  if (!apiKey) return json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 })

  const maxResults = Math.max(1, Math.min(Number.parseInt(body.maxResults || '5', 10) || 5, 10))
  const industries = Array.isArray(body.industries)
    ? body.industries.join(', ')
    : String(body.industries || '').trim()
  const target = strictTarget(query, industries)
  const model = env.OPENAI_PROSPECT_MODEL || 'gpt-4.1-mini'

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      tools: [{ type: 'web_search', search_context_size: 'low' }],
      tool_choice: 'required',
      input: prospectPrompt({ query, industries, maxResults }),
      max_output_tokens: 5000,
      temperature: 0.2,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    return json(
      { error: 'OpenAI prospect research failed', status: response.status, details: data },
      { status: response.status },
    )
  }

  const outputText = extractResponseText(data)
  const parsed = parseJsonText(outputText)
  if (!parsed || !Array.isArray(parsed.prospects)) {
    return json({ error: 'Prospect research returned unparseable JSON', raw: outputText }, { status: 502 })
  }

  const now = nowIso()
  const runId = newId('prospect_run')
  const imported = []
  const rejected = []

  for (const prospect of parsed.prospects.slice(0, maxResults)) {
    const email = cleanProspectEmail(prospect.email)
    const lead = normalizeLead({
      ...prospect,
      email,
      discoveryRunId: runId,
      status: email ? 'qualified' : 'needs_review',
      reviewStatus: email ? '' : 'Missing public email; review before outreach.',
      source: prospect.source || 'public web research',
      evidence: prospect.evidence || {},
    })
    const errors = validateLead(lead)
    if (!lead.source_url) errors.push('sourceUrl is required for prospect research')
    errors.push(...validateTargetIndustry(prospect, target))
    if (errors.length) {
      rejected.push({ prospect, errors })
      continue
    }
    await insertLead(db, lead, now)
    imported.push(lead)
  }

  await insertRun(db, {
    id: runId,
    query,
    targetIndustries: industries,
    status: 'completed',
    requestedLimit: maxResults,
    importedCount: imported.length,
    rejectedCount: rejected.length,
    summary: String(parsed.summary || '').trim(),
    rawResponse: outputText.slice(0, 10000),
    createdAt: now,
    completedAt: now,
  })

  await addActivity(db, {
    type: 'prospect_run_completed',
    label: `Prospect run imported ${imported.length} prospect${imported.length === 1 ? '' : 's'}`,
    metadata: { runId, query, rejected: rejected.length },
  })

  return json({ runId, imported, rejected, summary: parsed.summary || '' }, { status: rejected.length ? 207 : 200 })
}

export function onRequest(context) {
  if (context.request.method === 'GET') return handleGet(context)
  if (context.request.method === 'POST') return handlePost(context)
  return methodNotAllowed()
}
