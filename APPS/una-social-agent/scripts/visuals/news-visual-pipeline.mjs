import fs from 'node:fs/promises'
import path from 'node:path'

const ACCEPTANCE = {
  overallScore: 78,
  storyAlignment: 80,
  technologySpecificity: 70,
  editorialCredibility: 75,
  stereotypeRiskMax: 19,
  genericStockRiskMax: 34,
}

const BLOCKED_GENERIC = [
  'abstract screen',
  'glowing ai brain',
  'robot head',
  'generic server room',
  'generic city skyline',
  'floating hologram',
  'phone as the main subject',
  'people standing beside a screen',
]

export function slugify(value = '') {
  return String(value || 'story')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'story'
}

export function normalizeText(value = '') {
  return String(value || '')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ|â€�/g, '"')
    .replace(/â€“|â€”/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(value = '') {
  return normalizeText(value)
    .split(/\s+/)
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : word))
    .join(' ')
}

function hasAny(text, words) {
  const haystack = text.toLowerCase()
  return words.some((word) => haystack.includes(word))
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function inferCountry(region, text) {
  const lower = text.toLowerCase()
  const countries = [
    ['nigeria', 'Nigeria'],
    ['kenya', 'Kenya'],
    ['ghana', 'Ghana'],
    ['south africa', 'South Africa'],
    ['canada', 'Canada'],
    ['united states', 'United States'],
    ['u.s.', 'United States'],
    ['india', 'India'],
    ['china', 'China'],
    ['germany', 'Germany'],
    ['europe', 'Europe'],
    ['uk', 'United Kingdom'],
  ]
  for (const [needle, label] of countries) if (lower.includes(needle)) return label
  return region === 'Africa' ? 'Africa' : region === 'North America' ? 'North America' : 'Global'
}

function inferDomain(text) {
  const lower = text.toLowerCase()
  if (hasAny(lower, ['weather', 'climate', 'earth-system', 'satellite', 'storm', 'forecast'])) return 'weather'
  if (hasAny(lower, ['earthquake', 'disaster', 'relief', 'missing persons', 'missing people', 'emergency response', 'citizen-led'])) return 'disaster response'
  if (hasAny(lower, ['daily brief', 'inbox', 'calendar', 'assistant', 'attention each day', 'morning'])) return 'workplace AI'
  if (hasAny(lower, ['cryptography', 'cryptographic', 'symcrypt', 'verified code', 'code verification', 'memory safety'])) return 'cybersecurity'
  if (hasAny(lower, ['nvidia', 'gpu', 'blackwell', 'semiconductor', 'foundry', 'chip'])) return 'semiconductor'
  if (hasAny(lower, ['web3', 'blockchain', 'stablecoin'])) return 'web3'
  if (hasAny(lower, ['whatsapp', 'encryption', 'username', 'messaging', 'platform rule', 'platform policy', 'ban'])) return 'platform policy'
  if (hasAny(lower, ['payment', 'fintech', 'merchant', 'bank', 'wallet', 'remittance', 'mobile money'])) return 'fintech'
  if (hasAny(lower, ['robot', 'robotics', 'factory', 'manufacturing'])) return 'robotics'
  if (hasAny(lower, ['breach', 'cyber', 'security', 'ransomware', 'vulnerability'])) return 'cybersecurity'
  if (hasAny(lower, ['solar', 'wind', 'grid', 'renewable', 'energy'])) return 'renewable energy'
  if (hasAny(lower, ['chip', 'semiconductor', 'foundry', 'gpu'])) return 'semiconductor'
  if (hasAny(lower, ['health', 'hospital', 'clinical', 'patient', 'medical'])) return 'health technology'
  if (hasAny(lower, ['identity', 'public sector', 'government', 'digital id'])) return 'digital identity'
  if (hasAny(lower, ['satellite', 'space', 'launch', 'orbit'])) return 'satellite'
  if (hasAny(lower, ['agent', 'workflow', 'office', 'productivity', 'customer service'])) return 'workplace AI'
  if (hasAny(lower, ['logistics', 'warehouse', 'supply chain', 'delivery', 'fleet'])) return 'logistics automation'
  if (hasAny(lower, ['telecom', 'network', 'phone network', 'operator'])) return 'telecom AI'
  return 'technology operations'
}

const DOMAIN_VISUALS = {
  weather: {
    primarySubject: 'weather and Earth-system forecasting platform',
    technology: ['AI weather model', 'Earth-system modelling', 'satellite observations', 'probability forecasting'],
    roles: ['meteorologist', 'climate researcher', 'energy operator'],
    environment: 'operational forecasting and climate research centre',
    objects: ['satellite cloud imagery', 'pressure map', 'temperature layer screen', 'storm probability panel'],
    actions: ['interpreting probabilistic atmospheric forecasts', 'comparing satellite observations', 'reviewing energy forecast panels'],
    applications: ['severe-weather planning', 'renewable-energy forecasting', 'climate risk analysis'],
  },
  fintech: {
    primarySubject: 'digital payment workflow',
    technology: ['mobile payments', 'merchant settlement', 'fraud checks', 'payment rails'],
    roles: ['merchant', 'payment operations analyst', 'customer'],
    environment: 'busy urban merchant counter or payments operations workspace',
    objects: ['point-of-sale terminal', 'receipt printer', 'merchant phone', 'transaction dashboard'],
    actions: ['confirming a mobile payment', 'checking settlement status', 'serving a customer'],
    applications: ['merchant payments', 'cross-border commerce', 'small business cash flow'],
  },
  web3: {
    primarySubject: 'regulated digital asset infrastructure',
    technology: ['wallet security', 'stablecoin rails', 'blockchain settlement'],
    roles: ['fintech founder', 'compliance analyst', 'product operator'],
    environment: 'startup operations room with compliance review',
    objects: ['risk checklist', 'settlement dashboard', 'compliance notes'],
    actions: ['reviewing transaction risk', 'mapping settlement flows', 'checking compliance controls'],
    applications: ['payments infrastructure', 'capital movement', 'financial inclusion'],
  },
  robotics: {
    primarySubject: 'robotics manufacturing line',
    technology: ['industrial robots', 'computer vision', 'quality inspection'],
    roles: ['manufacturing engineer', 'quality operator'],
    environment: 'modern factory floor',
    objects: ['robotic arm', 'inspection station', 'safety markings', 'parts tray'],
    actions: ['inspecting automated assembly', 'checking computer vision output'],
    applications: ['factory productivity', 'quality control', 'worker safety'],
  },
  cybersecurity: {
    primarySubject: 'security operations response',
    technology: ['threat detection', 'incident response', 'identity logs'],
    roles: ['security analyst', 'incident commander'],
    environment: 'security operations centre',
    objects: ['alert board', 'access log timeline', 'incident checklist'],
    actions: ['triaging alerts', 'confirming impacted systems', 'coordinating containment'],
    applications: ['data protection', 'service continuity', 'risk control'],
  },
  'renewable energy': {
    primarySubject: 'renewable-energy operations',
    technology: ['grid monitoring', 'energy forecasting', 'battery storage'],
    roles: ['field engineer', 'grid operator'],
    environment: 'solar or wind operations site with control dashboard',
    objects: ['solar panels', 'battery cabinets', 'grid monitor', 'maintenance tablet'],
    actions: ['checking output forecasts', 'inspecting equipment', 'balancing supply'],
    applications: ['grid reliability', 'clean energy planning'],
  },
  semiconductor: {
    primarySubject: 'semiconductor manufacturing process',
    technology: ['chip fabrication', 'wafer inspection', 'clean-room automation'],
    roles: ['process engineer', 'quality technician'],
    environment: 'semiconductor clean room',
    objects: ['wafer carrier', 'inspection tool', 'clean-room suit', 'equipment console'],
    actions: ['inspecting wafers', 'monitoring yield data'],
    applications: ['AI hardware supply', 'advanced manufacturing'],
  },
  'health technology': {
    primarySubject: 'clinical technology workflow',
    technology: ['health AI', 'patient triage', 'clinical records'],
    roles: ['clinician', 'health operations analyst'],
    environment: 'modern clinic operations room',
    objects: ['patient queue board', 'clinical workstation', 'privacy screen'],
    actions: ['reviewing patient workflow', 'checking triage recommendations'],
    applications: ['patient access', 'clinical support', 'care coordination'],
  },
  'digital identity': {
    primarySubject: 'public-sector digital identity service',
    technology: ['identity verification', 'government services', 'secure records'],
    roles: ['service officer', 'resident', 'policy operator'],
    environment: 'public service counter or digital services centre',
    objects: ['service counter', 'verification checklist', 'secure terminal'],
    actions: ['verifying identity documents', 'helping a resident access a service'],
    applications: ['public services', 'benefits access', 'secure onboarding'],
  },
  'disaster response': {
    primarySubject: 'AI-assisted disaster response coordination',
    technology: ['AI search', 'missing-person reports', 'relief coordination', 'crisis mapping'],
    roles: ['volunteer coordinator', 'developer', 'community responder'],
    environment: 'community response workspace or emergency coordination room',
    objects: ['missing-person list', 'relief map', 'message queue', 'coordination dashboard'],
    actions: ['matching reports to known locations', 'coordinating relief requests', 'checking updates from families'],
    applications: ['disaster response', 'public safety coordination', 'community support'],
  },
  'platform policy': {
    primarySubject: 'encrypted messaging policy review',
    technology: ['encrypted messaging', 'platform policy', 'cyber fraud controls', 'user privacy'],
    roles: ['policy analyst', 'trust and safety operator', 'product counsel'],
    environment: 'platform policy review room with legal, safety and product workflow',
    objects: ['policy checklist', 'secure messaging flow diagram', 'risk review board', 'privacy notes'],
    actions: ['reviewing policy tradeoffs', 'checking fraud risk controls', 'mapping user privacy impact'],
    applications: ['messaging safety', 'privacy protection', 'platform governance'],
  },
  satellite: {
    primarySubject: 'satellite data operations',
    technology: ['Earth observation', 'orbital data', 'ground station telemetry'],
    roles: ['mission operator', 'remote-sensing analyst'],
    environment: 'satellite operations room',
    objects: ['ground station display', 'Earth observation map', 'telemetry console'],
    actions: ['reviewing satellite passes', 'checking imagery quality'],
    applications: ['mapping', 'climate monitoring', 'communications'],
  },
  'workplace AI': {
    primarySubject: 'work-focused AI agent in daily operations',
    technology: ['AI agents', 'workflow automation', 'document review', 'customer support'],
    roles: ['operations manager', 'support lead', 'analyst'],
    environment: 'real team workspace or meeting room',
    objects: ['workflow board', 'ticket queue', 'review checklist', 'shared dashboard'],
    actions: ['checking agent output', 'reviewing a task queue', 'deciding the next action'],
    applications: ['support operations', 'admin work', 'research and reporting'],
  },
  'logistics automation': {
    primarySubject: 'logistics automation workflow',
    technology: ['warehouse systems', 'route optimization', 'fleet tracking'],
    roles: ['logistics coordinator', 'warehouse supervisor'],
    environment: 'warehouse control desk or loading dock',
    objects: ['route board', 'barcode scanner', 'pallets', 'dispatch screen'],
    actions: ['checking routes', 'validating order status', 'coordinating dispatch'],
    applications: ['delivery reliability', 'inventory flow', 'supply-chain visibility'],
  },
  'telecom AI': {
    primarySubject: 'AI-assisted telecom operations',
    technology: ['network operations', 'customer service AI', 'voice workflow', 'incident routing'],
    roles: ['network operator', 'customer service lead', 'field coordinator'],
    environment: 'telecom network operations centre',
    objects: ['network map', 'call queue panel', 'incident timeline', 'field-service board'],
    actions: ['reviewing network alerts', 'routing customer issues', 'checking service quality'],
    applications: ['phone networks', 'customer service', 'field operations'],
  },
  'technology operations': {
    primarySubject: 'technology operations workflow',
    technology: ['AI systems', 'automation', 'reporting workflow'],
    roles: ['operator', 'analyst', 'team lead'],
    environment: 'practical technology operations workspace',
    objects: ['operations board', 'review checklist', 'system dashboard'],
    actions: ['checking a workflow', 'reviewing source-backed information'],
    applications: ['daily operations', 'decision support'],
  },
}

function domainPreset(domain) {
  return DOMAIN_VISUALS[domain] || DOMAIN_VISUALS['technology operations']
}

export function buildStoryFacts(entry, index = 0) {
  const story = entry.story || entry
  const headline = normalizeText(story.title || story.headline || '')
  const summary = normalizeText(story.summary || story.description || entry.takeaway || '')
  const text = `${headline} ${summary}`
  const domain = inferDomain(text)
  const preset = domainPreset(domain)
  return {
    story_id: `${slugify(entry.region || story.region || 'region')}-${slugify(headline).slice(0, 42)}-${index + 1}`,
    region: entry.region || story.region || '',
    country_or_market: inferCountry(entry.region || story.region || '', text),
    headline,
    plain_language_summary: summary,
    primary_subject: preset.primarySubject,
    technology: unique(preset.technology),
    organization: story.sourceName || story.organization || '',
    people_or_roles: unique(preset.roles),
    physical_environment: preset.environment,
    visible_objects: unique(preset.objects),
    important_actions: unique(preset.actions),
    real_world_application: unique(preset.applications),
    visual_evidence_from_source: unique([
      domain,
      ...(story.topics || []).slice(0, 2),
      headline.match(/\b(OpenAI|Google|Microsoft|Meta|Amazon|Deutsche Telekom|Aurora)\b/i)?.[0],
    ]),
    source_name: story.sourceName || '',
    source_url: story.url || '',
    publication_date: story.publishedAt || story.publication_date || '',
    confidence: domain === 'technology operations' ? 0.72 : 0.86,
  }
}

export function createVisualBrief(facts) {
  const preset = domainPreset(inferDomain(`${facts.headline} ${facts.plain_language_summary} ${facts.technology.join(' ')}`))
  const humanAppropriate = facts.people_or_roles.length > 0
  const subjectAction = facts.important_actions[0] || 'reviewing the operational workflow'
  const supporting = unique([...facts.visible_objects, ...facts.real_world_application].slice(0, 7))
  const regionalContext = facts.country_or_market && !['Global', facts.region].includes(facts.country_or_market)
    ? [`authentic ${facts.country_or_market} market context where relevant`]
    : [`authentic ${facts.region || 'global'} business context where relevant`]
  const promptParts = [
    'Authentic editorial technology photography for a professional global newsroom.',
    `The image must communicate this story without requiring the headline: ${facts.headline}.`,
    `Primary subject: ${facts.primary_subject}.`,
    humanAppropriate
      ? `Show a ${facts.people_or_roles[0]} actively ${subjectAction} in a ${facts.physical_environment}.`
      : `Show the ${facts.primary_subject} inside a ${facts.physical_environment}.`,
    `Story-specific technology: ${facts.technology.join(', ')}.`,
    `Visible supporting details: ${supporting.join(', ')}.`,
    'Composition: wide editorial image, subject dominates, one clean lower area reserved for slide copy.',
    'Lighting and mood: mature, credible, contemporary, practical, not glossy stock.',
    `Regional context: ${regionalContext.join(', ')}.`,
    'No visible words, no logos, no watermarks, no fake branded interface, no decorative science-fiction elements.',
  ]
  const mustNotShow = unique([
    ...BLOCKED_GENERIC,
    'decorative people',
    'stereotype imagery',
    'flags as the main subject',
    'unlicensed logos',
    'visible text',
  ])
  return {
    story_id: facts.story_id,
    region: facts.region,
    editorial_angle: `${titleCase(facts.primary_subject)} moving into practical use`,
    image_type: preset.environment.includes('centre') || preset.environment.includes('room') ? 'editorial_photo' : 'documentary_photo',
    primary_subject: facts.primary_subject,
    subject_action: subjectAction,
    environment: facts.physical_environment,
    supporting_elements: supporting,
    composition: 'wide editorial scene with the story subject dominant and a clean lower text-safe area',
    camera_perspective: 'eye-level documentary perspective, 35mm editorial feel',
    lighting: 'natural professional lighting',
    mood: 'credible, operational, human, practical',
    regional_context: regionalContext,
    technology_signals: facts.technology,
    must_show: unique([facts.primary_subject, ...facts.technology.slice(0, 3), subjectAction]),
    must_not_show: mustNotShow,
    text_safe_area: 'bottom',
    generation_prompt: promptParts.join(' '),
    negative_prompt: mustNotShow.join(', '),
    visual_confidence: facts.confidence,
  }
}

export function evaluateImageRelevance(facts, brief, assetMeta = {}) {
  const prompt = `${brief.generation_prompt} ${brief.supporting_elements.join(' ')} ${brief.must_show.join(' ')}`.toLowerCase()
  let storyAlignment = 62
  let technologySpecificity = 52
  let editorialCredibility = 68
  let regionalAuthenticity = 70
  let compositionQuality = 78
  let textSafeAreaQuality = brief.text_safe_area ? 86 : 58
  let stereotypeRisk = 8
  let genericStockRisk = 48

  if (prompt.includes(facts.primary_subject.toLowerCase())) storyAlignment += 18
  if (facts.technology.filter((tech) => prompt.includes(tech.toLowerCase().split(' ')[0])).length >= 2) technologySpecificity += 24
  if (prompt.includes(facts.physical_environment.toLowerCase().split(' ')[0])) editorialCredibility += 12
  if (/operator|researcher|engineer|merchant|analyst|clinician|meteorologist|coordinator/.test(prompt)) editorialCredibility += 6
  if (brief.regional_context.length) regionalAuthenticity += 8
  if (/clean lower area|text-safe|reserved for slide copy/.test(prompt)) compositionQuality += 8
  if (!BLOCKED_GENERIC.some((word) => prompt.includes(word))) genericStockRisk -= 18
  if (/stereotype|safari|poverty|village|generic traditional/.test(prompt)) stereotypeRisk += 40
  if (assetMeta.fallback_used) {
    genericStockRisk += 4
  }

  const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)))
  storyAlignment = clamp(storyAlignment)
  technologySpecificity = clamp(technologySpecificity)
  regionalAuthenticity = clamp(regionalAuthenticity)
  editorialCredibility = clamp(editorialCredibility)
  compositionQuality = clamp(compositionQuality)
  textSafeAreaQuality = clamp(textSafeAreaQuality)
  stereotypeRisk = clamp(stereotypeRisk)
  genericStockRisk = clamp(genericStockRisk)

  const overallScore = clamp(
    storyAlignment * 0.26 +
      technologySpecificity * 0.2 +
      regionalAuthenticity * 0.11 +
      editorialCredibility * 0.18 +
      compositionQuality * 0.12 +
      textSafeAreaQuality * 0.08 -
      stereotypeRisk * 0.08 -
      genericStockRisk * 0.08 +
      12,
  )

  const failureReasons = []
  const retryInstructions = []
  if (storyAlignment < ACCEPTANCE.storyAlignment) {
    failureReasons.push('The image brief does not make the selected story subject dominant enough.')
    retryInstructions.push(`Make ${facts.primary_subject} the dominant visible subject.`)
  }
  if (technologySpecificity < ACCEPTANCE.technologySpecificity) {
    failureReasons.push('The visual brief needs more story-specific technology details.')
    retryInstructions.push(`Show ${facts.technology.slice(0, 4).join(', ')} as visible objects or workflows.`)
  }
  if (editorialCredibility < ACCEPTANCE.editorialCredibility) {
    failureReasons.push('The scene still reads too generic for a credible newsroom image.')
    retryInstructions.push(`Anchor the image in ${facts.physical_environment} with practical equipment and a connected human action.`)
  }
  if (genericStockRisk > ACCEPTANCE.genericStockRiskMax) {
    failureReasons.push('Generic stock image risk is too high.')
    retryInstructions.push('Remove generic office, phone, robot, skyline, and decorative AI tropes.')
  }
  if (stereotypeRisk > ACCEPTANCE.stereotypeRiskMax) {
    failureReasons.push('Stereotype risk is too high.')
    retryInstructions.push('Remove regional stereotypes and keep regional context secondary to the story.')
  }

  const decision =
    overallScore >= ACCEPTANCE.overallScore &&
    storyAlignment >= ACCEPTANCE.storyAlignment &&
    technologySpecificity >= ACCEPTANCE.technologySpecificity &&
    editorialCredibility >= ACCEPTANCE.editorialCredibility &&
    stereotypeRisk <= ACCEPTANCE.stereotypeRiskMax &&
    genericStockRisk <= ACCEPTANCE.genericStockRiskMax
      ? 'accept'
      : failureReasons.length >= 3
        ? 'fallback'
        : 'retry'

  return {
    story_alignment: storyAlignment,
    technology_specificity: technologySpecificity,
    regional_authenticity: regionalAuthenticity,
    editorial_credibility: editorialCredibility,
    composition_quality: compositionQuality,
    text_safe_area_quality: textSafeAreaQuality,
    stereotype_risk: stereotypeRisk,
    generic_stock_risk: genericStockRisk,
    overall_score: overallScore,
    failure_reasons: failureReasons,
    retry_instructions: retryInstructions,
    decision,
    evaluation_mode: assetMeta.evaluation_mode || 'brief_static',
  }
}

export function improveBriefFromEvaluation(brief, evaluation) {
  const retryText = evaluation.retry_instructions.join(' ')
  return {
    ...brief,
    generation_prompt: `${brief.generation_prompt} ${retryText} Use concrete visible evidence and remove anything that feels like a generic technology poster.`,
    must_show: unique([...brief.must_show, ...evaluation.retry_instructions]),
    visual_confidence: Math.min(0.98, brief.visual_confidence + 0.04),
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function visualSceneHtml(facts, brief) {
  const domain = inferDomain(`${facts.headline} ${facts.plain_language_summary} ${facts.technology.join(' ')}`)
  const colors = {
    weather: ['#153d5a', '#6fc3ff', '#f4f8ff'],
    fintech: ['#123f34', '#45c489', '#fff3d5'],
    web3: ['#30234d', '#8b77ff', '#fff3d5'],
    robotics: ['#2a3136', '#ff7a1a', '#e8edf0'],
    cybersecurity: ['#161b24', '#f35f5f', '#e4f2ff'],
    'renewable energy': ['#184735', '#5fd186', '#fff4c7'],
    semiconductor: ['#20233a', '#71b9ff', '#eee8ff'],
    'health technology': ['#113b4a', '#4cc6b7', '#fff5f5'],
    'digital identity': ['#23314a', '#ffb44a', '#f4f5ff'],
    'disaster response': ['#23314a', '#ff8a1c', '#fff4e8'],
    satellite: ['#0d2235', '#74b6ff', '#f9fbff'],
    'workplace AI': ['#202d33', '#4db8a8', '#fff8ea'],
    'logistics automation': ['#25352d', '#ff8c1a', '#f2efe5'],
    'telecom AI': ['#102b3c', '#45b6ff', '#fff8ea'],
    'technology operations': ['#112f35', '#4db8a8', '#fff8ea'],
  }[domain] || ['#112f35', '#4db8a8', '#fff8ea']
  const [bg, accent, cream] = colors
  const isAfrica = facts.region === 'Africa'
  const isRest = facts.region === 'Rest of World'
  const skin = isAfrica ? '#6f3f27' : isRest ? '#8a5a3d' : '#744226'
  const jacket = isAfrica ? '#0e6060' : isRest ? '#153f46' : '#164a59'
  const sceneLabel = {
    weather: 'forecast centre',
    fintech: 'merchant workflow',
    web3: 'payments review',
    robotics: 'factory review',
    cybersecurity: 'incident room',
    'platform policy': 'policy review',
    'renewable energy': 'energy site',
    semiconductor: 'clean-room review',
    'health technology': 'clinic workflow',
    'disaster response': 'relief coordination',
    satellite: 'mission desk',
    'workplace AI': 'team workflow',
    'logistics automation': 'dispatch floor',
    'telecom AI': 'network desk',
  }[domain] || 'tech workflow'
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    *{box-sizing:border-box} html,body{margin:0;width:1280px;height:760px;overflow:hidden;background:${bg};font-family:Arial,Helvetica,sans-serif}
    .scene{position:relative;width:1280px;height:760px;background:
      radial-gradient(circle at 82% 12%, ${accent}55 0 170px, transparent 172px),
      radial-gradient(circle at 22% 88%, #000 0 260px, transparent 261px),
      linear-gradient(135deg, ${bg}, #071012 78%)}
    .photo-grain{position:absolute;inset:0;background-image:linear-gradient(90deg,#ffffff08 1px,transparent 1px),linear-gradient(#ffffff06 1px,transparent 1px);background-size:18px 18px;opacity:.28}
    .subject{position:absolute;left:92px;bottom:44px;width:430px;height:610px}
    .torso{position:absolute;left:42px;right:42px;bottom:0;height:330px;border-radius:140px 140px 34px 34px;background:linear-gradient(135deg,${jacket},#08252c);box-shadow:0 26px 52px #0009}
    .neck{position:absolute;left:181px;bottom:306px;width:72px;height:82px;border-radius:0 0 34px 34px;background:${skin}}
    .face{position:absolute;left:120px;bottom:372px;width:190px;height:214px;border-radius:92px 92px 82px 82px;background:radial-gradient(circle at 36% 38%,#9b674b 0 8px,transparent 9px),radial-gradient(circle at 64% 38%,#2b1712 0 8px,transparent 9px),linear-gradient(135deg,${skin},#4d291b);box-shadow:inset -22px -20px 34px #0003,0 18px 34px #0007}
    .hair{position:absolute;left:108px;bottom:560px;width:212px;height:86px;border-radius:110px 110px 44px 44px;background:#111}
    .beard{position:absolute;left:145px;bottom:382px;width:140px;height:78px;border-radius:0 0 80px 80px;background:#16100e}
    .nose{position:absolute;left:207px;bottom:462px;width:24px;height:54px;border-radius:16px;background:#4b291d99}
    .mouth{position:absolute;left:187px;bottom:424px;width:58px;height:10px;border-radius:999px;background:#1c100e}
    .table{position:absolute;left:34px;right:34px;bottom:0;height:74px;border-radius:28px;background:#000b;border:2px solid ${accent}66}
    .screen-main{position:absolute;right:78px;top:86px;width:560px;height:360px;border-radius:28px;border:5px solid ${cream};background:linear-gradient(135deg,#061015,#0c2228);box-shadow:0 28px 58px #000b}
    .screen-main:before{content:"";position:absolute;left:38px;right:38px;top:42px;height:120px;border-radius:26px;background:radial-gradient(circle at 28% 40%,${accent} 0 18px,transparent 19px),linear-gradient(120deg,transparent 0 45%,${accent}66 46% 50%,transparent 51%),linear-gradient(#ffffff2b,#ffffff10)}
    .screen-main:after{content:"";position:absolute;left:44px;right:44px;bottom:52px;height:18px;border-radius:999px;background:${accent};box-shadow:0 -46px 0 ${cream}99,0 -92px 0 #ff5a1f}
    .screen-side{position:absolute;right:522px;top:188px;width:190px;height:160px;border-radius:22px;border:4px solid ${accent};background:#050b0ddd;box-shadow:0 20px 42px #0008}
    .screen-side:before{content:"";position:absolute;left:26px;top:30px;width:58px;height:58px;border-radius:999px;background:${accent}}
    .screen-side:after{content:"";position:absolute;right:24px;bottom:34px;width:78px;height:16px;border-radius:999px;background:#ff5a1f;box-shadow:0 -34px 0 ${cream}aa}
    .badge{position:absolute;left:44px;top:34px;color:${cream};font-size:28px;font-weight:950;letter-spacing:1px;text-transform:uppercase}
    .story{position:absolute;right:92px;bottom:76px;color:${cream};font-size:31px;line-height:1.05;font-weight:950;max-width:560px;text-shadow:0 4px 14px #000}
    .accent-line{position:absolute;right:92px;bottom:52px;width:180px;height:10px;border-radius:999px;background:${accent};box-shadow:74px 0 0 #ff5a1f}
    .safe{position:absolute;left:0;right:0;bottom:0;height:206px;background:linear-gradient(transparent,#000d)}
  </style></head><body><main class="scene">
    <div class="photo-grain"></div>
    <div class="badge">${escapeHtml(sceneLabel)}</div>
    <div class="subject"><div class="torso"></div><div class="neck"></div><div class="face"></div><div class="hair"></div><div class="beard"></div><div class="nose"></div><div class="mouth"></div></div>
    <div class="screen-side"></div><div class="screen-main"></div><div class="table"></div><div class="safe"></div>
    <div class="story">${escapeHtml(facts.visible_objects.slice(0, 2).join(' + ') || facts.primary_subject)}</div><div class="accent-line"></div>
  </main></body></html>`
}

function searchTermsForFacts(facts) {
  const domain = inferDomain(`${facts.headline} ${facts.plain_language_summary} ${facts.technology.join(' ')}`)
  const terms = {
    weather: ['weather forecasting operations center meteorologist', 'meteorologist weather radar control room', 'climate research scientist weather model'],
    fintech: ['African mobile money merchant payment', 'mobile payment merchant Africa', 'digital payment shop Africa'],
    web3: ['African startup office team', 'African business team laptop', 'African fintech office', 'African fintech startup team office', 'Lagos technology startup meeting'],
    robotics: ['manufacturing engineer robot factory', 'industrial robot worker factory'],
    cybersecurity: ['security operations center analyst', 'cybersecurity analyst operations room'],
    'renewable energy': ['solar engineer Africa', 'renewable energy technician solar panels'],
    semiconductor: ['semiconductor clean room engineer', 'wafer inspection clean room'],
    'health technology': ['doctor computer clinic workflow', 'health technology hospital staff'],
    'digital identity': ['public service office digital identity', 'government service counter computer'],
    'disaster response': ['volunteer disaster relief coordination room', 'emergency response team laptops map', 'community disaster response volunteers computer'],
    'platform policy': ['smartphone privacy policy meeting', 'India technology policy meeting', 'people using smartphones India'],
    satellite: ['satellite control room operator', 'earth observation control room'],
    'workplace AI': ['diverse team office computer workflow', 'business analyst team dashboard'],
    'logistics automation': ['warehouse dispatch operator', 'logistics control room warehouse'],
    'telecom AI': ['telecom network operations center', 'network operations center engineer'],
  }[domain] || ['technology operations team office']
  const country = facts.country_or_market && !['Global', 'North America', 'Africa'].includes(facts.country_or_market)
    ? facts.country_or_market
    : ''
  return terms.map((term) => `${term} ${country}`.trim())
}

function imageCandidateRejected(candidate) {
  const text = `${candidate.title || ''} ${candidate.url || ''}`.toLowerCase()
  return /logo|icon|diagram|clipart|flag|seal|map only|cartoon|illustration|screenshot|poster|infographic|museum|disney|historic house|estate|mansion|castle/.test(text)
}

async function downloadImage(candidate, outPath) {
  const imageResponse = await fetch(candidate.url, {
    headers: { 'User-Agent': 'UnaLabsSocialAgent/0.1 visual preview builder' },
  })
  if (!imageResponse.ok) return null
  const contentType = imageResponse.headers.get('content-type') || ''
  if (!/^image\/(jpeg|png|webp)/i.test(contentType)) return null
  const buffer = Buffer.from(await imageResponse.arrayBuffer())
  if (buffer.length < 50_000) return null
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, buffer)
  return candidate
}

async function fetchOpenverseImage(facts, outPath) {
  const terms = searchTermsForFacts(facts)
  for (const term of terms) {
    const api = new URL('https://api.openverse.org/v1/images/')
    api.searchParams.set('q', term)
    api.searchParams.set('page_size', '12')
    let payload
    try {
      const response = await fetch(api, {
        headers: { 'User-Agent': 'UnaLabsSocialAgent/0.1 visual preview builder' },
      })
      if (!response.ok) continue
      payload = await response.json()
    } catch {
      continue
    }
    const candidates = (payload.results || [])
      .map((item) => ({
        title: item.title || '',
        url: item.url || item.thumbnail || '',
        source: item.foreign_landing_url || item.url || '',
        license: [item.license, item.license_version].filter(Boolean).join(' '),
        artist: item.creator || '',
        search_term: term,
        provider: item.provider || 'openverse',
      }))
      .filter((item) => item.url && !imageCandidateRejected(item))
    for (const candidate of candidates) {
      try {
        const saved = await downloadImage(candidate, outPath)
        if (!saved) continue
        return {
          ok: true,
          image_asset_path: outPath,
          image_model: 'openverse-editorial-photo',
          fallback_used: false,
          fallback_reason: '',
          attribution: {
            title: saved.title,
            source_url: saved.source,
            license: saved.license,
            artist: saved.artist,
            search_term: saved.search_term,
            provider: saved.provider,
          },
        }
      } catch {
        continue
      }
    }
  }
  return { ok: false }
}

async function fetchCommonsImage(facts, outPath) {
  const terms = searchTermsForFacts(facts)
  for (const term of terms) {
    const api = new URL('https://commons.wikimedia.org/w/api.php')
    api.searchParams.set('action', 'query')
    api.searchParams.set('generator', 'search')
    api.searchParams.set('gsrsearch', `${term} filetype:bitmap`)
    api.searchParams.set('gsrnamespace', '6')
    api.searchParams.set('gsrlimit', '8')
    api.searchParams.set('prop', 'imageinfo')
    api.searchParams.set('iiprop', 'url|mime|extmetadata')
    api.searchParams.set('iiurlwidth', '1400')
    api.searchParams.set('format', 'json')
    let payload
    try {
      const response = await fetch(api, {
        headers: { 'User-Agent': 'UnaLabsSocialAgent/0.1 visual preview builder' },
      })
      if (!response.ok) continue
      payload = await response.json()
    } catch {
      continue
    }
    const pages = Object.values(payload?.query?.pages || {})
    const candidates = pages
      .map((page) => {
        const info = page.imageinfo?.[0] || {}
        return {
          title: page.title,
          url: info.thumburl || info.url,
          source: info.descriptionurl,
          mime: info.mime || '',
          license: info.extmetadata?.LicenseShortName?.value || '',
          artist: info.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '',
        }
      })
      .filter((item) => item.url && /^image\/(jpeg|png|webp)/i.test(item.mime))
      .filter((item) => !imageCandidateRejected(item))
    for (const candidate of candidates) {
      try {
        const saved = await downloadImage(candidate, outPath)
        if (!saved) continue
        return {
          ok: true,
          image_asset_path: outPath,
          image_model: 'wikimedia-commons-editorial-photo',
          fallback_used: false,
          fallback_reason: '',
          attribution: {
            title: candidate.title,
            source_url: candidate.source,
            license: candidate.license,
            artist: candidate.artist,
            search_term: term,
          },
        }
      } catch {
        continue
      }
    }
  }
  return { ok: false }
}

function clampWords(value, maxWords) {
  const words = normalizeText(value).split(/\s+/).filter(Boolean)
  return words.length <= maxWords ? words.join(' ') : `${words.slice(0, maxWords).join(' ')}...`
}

function sourceDisplayName(sourceName = '', sourceUrl = '') {
  const clean = normalizeText(sourceName)
  if (/^rest of world$/i.test(clean)) return 'restofworld.org'
  if (/^the register ai$/i.test(clean)) return 'The Register'
  if (/^openai news$/i.test(clean)) return 'OpenAI'
  if (/^microsoft research$/i.test(clean)) return 'Microsoft Research'
  if (/^techcabal$/i.test(clean)) return 'TechCabal'
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, '')
    return clean || host
  } catch {
    return clean || 'Source'
  }
}

export function slideHtml({ facts, brief, imageDataUrl, index, sourceName }) {
  const headline = clampWords(facts.headline, 10).toUpperCase()
  const summary = clampWords(facts.plain_language_summary || facts.real_world_application.join(', '), 18)
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    *{box-sizing:border-box} html,body{margin:0;width:1080px;height:1350px;overflow:hidden;background:#f47f13;font-family:Arial,Helvetica,sans-serif}
    .wrap{width:1080px;height:1350px;padding:44px 54px;display:flex;align-items:center;justify-content:center}
    .card{width:940px;min-height:1240px;background:#fff8ea;border-radius:36px;border:10px solid #ffffffb8;box-shadow:0 28px 60px #2b180833;padding:24px;position:relative}
    .image{height:610px;border-radius:24px;overflow:hidden;border:8px solid #fff;background:#111}
    .image img{width:100%;height:100%;object-fit:cover;display:block}
    .label{position:absolute;left:52px;top:50px;background:#fff;color:#111;border-radius:10px;padding:13px 20px;font-size:30px;font-weight:950;letter-spacing:1px}
    .body{padding:34px 34px 112px}
    .region{color:#b84c00;font-size:26px;font-weight:950;text-transform:uppercase;letter-spacing:1px;margin-bottom:18px}
    h1{font-size:54px;line-height:1.02;margin:0 0 22px;color:#171717;font-weight:950;letter-spacing:0}
    .summary{font-size:29px;line-height:1.18;font-weight:750;color:#222;margin:0 0 22px;max-width:790px}
    .why{font-size:25px;line-height:1.22;color:#242424;font-weight:700;margin:0;max-width:790px}
    .source{position:absolute;left:70px;bottom:42px;color:#8d4b0e;font-weight:900;font-size:22px}
    .page{position:absolute;right:70px;bottom:42px;color:#8d4b0e;font-weight:900;font-size:22px}
  </style></head><body><main class="wrap"><section class="card">
    <div class="image"><img src="${imageDataUrl}" alt=""/></div>
    <div class="label">AI NEWS</div>
    <div class="body">
      <div class="region">${escapeHtml(facts.region)}</div>
      <h1>${escapeHtml(headline)}</h1>
      <p class="summary">${escapeHtml(summary)}</p>
      <p class="why">Why it matters: ${escapeHtml(clampWords(facts.real_world_application.join(', ') || brief.editorial_angle, 24))}.</p>
    </div>
    <div class="source">Source: ${escapeHtml(sourceDisplayName(sourceName, facts.source_url))}</div>
    <div class="page">${index + 1} / 3</div>
  </section></main></body></html>`
}

export async function renderHtmlToPng(html, outPath, viewport) {
  const { chromium } = await import('playwright')
  let browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (error) {
    if (!/Executable doesn't exist|playwright install/i.test(String(error?.message || error))) throw error
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  }
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'load' })
    await page.screenshot({ path: outPath, type: 'png', fullPage: false })
  } finally {
    await browser?.close()
  }
}

export async function renderRawVisual(facts, brief, outPath) {
  const openverse = await fetchOpenverseImage(facts, outPath)
  if (openverse.ok) return openverse
  const commons = await fetchCommonsImage(facts, outPath)
  if (commons.ok) return commons
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await renderHtmlToPng(visualSceneHtml(facts, brief), outPath, { width: 1280, height: 760 })
  return {
    image_asset_path: outPath,
    image_model: 'deterministic-technical-composition',
    fallback_used: true,
    fallback_reason: 'Image generation is not configured for unattended use; rendered a deterministic story-specific technical composition.',
  }
}

export async function imageDataUrl(filePath) {
  const buffer = await fs.readFile(filePath)
  return `data:image/png;base64,${buffer.toString('base64')}`
}
