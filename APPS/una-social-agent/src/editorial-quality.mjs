import { createHash } from 'node:crypto'

const ELLIPSIS_RE = /(?:\.{3}|…)+\s*$/u
const TRAILING_FRAGMENT_RE = /(?:[,;:–—-]|\b(?:and|or|but|with|for|to|before|after|while|where|that|the|a|an))$/iu
const AI_CLICHES = [
  /\b(ai is changing|technology is changing|moving fast|game[- ]changer|revolutioni[sz]ing)\b/gi,
  /\bin today'?s (?:fast[- ]paced|digital) world\b/gi,
  /\bunlock(?:ing)? the (?:power|potential)\b/gi,
  /\bthe future is here\b/gi,
  /\bdelve(?:s|d)?\b/gi,
  /\bleverage(?:s|d|ing)?\b/gi,
  /\butili[sz]e(?:s|d|ing)?\b/gi,
  /\bseamless(?:ly)?\b/gi,
]
const VAGUE_FILLER = [
  /why it matters:\s*daily operations,\s*decision support\.?/i,
  /^daily operations,\s*decision support\.?$/i,
  /ai is moving fast\.?/i,
  /technology is changing quickly\.?/i,
  /this changes everything\.?/i,
]
const BOILERPLATE_COPY = [
  /this story originally appeared in [^.?!]+[.?!]?/gi,
  /to get stories like this in your inbox first,\s*sign up here[.?!]?/gi,
  /sign up here[.?!]?/gi,
]
const INCOMPLETE_PHRASES = [
  /\bwe(?:'|’)ve been here$/i,
  /\bwe have been here$/i,
  /\bbeen here$/i,
  /\bhere$/i,
]

function clean(value = '') {
  return String(value)
    .replace(/Ã¢â‚¬â„¢|â€™/g, "'")
    .replace(/Ã¢â‚¬Ëœ|â€˜/g, "'")
    .replace(/Ã¢â‚¬Å“|Ã¢â‚¬ï¿½|â€œ|â€�/g, '"')
    .replace(/Ã¢â‚¬â€œ|Ã¢â‚¬â€|â€“|â€”/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function trimBrokenEnding(value = '') {
  let text = clean(value).replace(ELLIPSIS_RE, '').replace(/[.:;,\-–—]+\s*$/u, '').trim()
  while (TRAILING_FRAGMENT_RE.test(text)) {
    text = text.replace(/\s+\S+$/, '').replace(/[.:;,\-–—]+\s*$/u, '').trim()
  }
  return text
}

function looksIncomplete(value = '') {
  const text = trimBrokenEnding(value)
  return TRAILING_FRAGMENT_RE.test(text) || INCOMPLETE_PHRASES.some((pattern) => pattern.test(text))
}

function firstCompleteSentence(value = '') {
  const sentences = clean(value).match(/[^.!?]+[.!?]?/g) || []
  for (const sentence of sentences) {
    const candidate = trimBrokenEnding(sentence)
    if (candidate && !looksIncomplete(candidate)) return candidate
  }
  return ''
}

function limitWordsAndChars(value, maxWords, maxChars) {
  let text = trimBrokenEnding(value)
  const words = text.split(' ').filter(Boolean)
  if (words.length > maxWords) text = words.slice(0, maxWords).join(' ')
  if (text.length > maxChars) text = text.slice(0, maxChars + 1).replace(/\s+\S*$/, '').trim()
  return trimBrokenEnding(text)
}

export function assetFingerprint(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return ''
  return createHash('sha256').update(buffer).digest('hex')
}

export function sanitizeHeadline(value, { maxWords = 13, maxChars = 78 } = {}) {
  const withoutPrefix = clean(value).replace(/^(breaking|exclusive|just in)\s*[:|-]\s*/i, '')
  if (withoutPrefix.length > maxChars || withoutPrefix.split(' ').filter(Boolean).length > maxWords) {
    const firstSentence = firstCompleteSentence(withoutPrefix)
    if (firstSentence && firstSentence.length <= maxChars && firstSentence.split(' ').filter(Boolean).length <= maxWords) {
      return firstSentence
    }
  }
  const limited = limitWordsAndChars(withoutPrefix, maxWords, maxChars)
  if (looksIncomplete(limited)) {
    const firstSentence = firstCompleteSentence(withoutPrefix)
    if (firstSentence && firstSentence !== limited) return limitWordsAndChars(firstSentence, maxWords, maxChars)
  }
  return limited
}

export function sanitizeDeck(value, { maxWords = 34, maxChars = 210 } = {}) {
  let text = clean(value)
    .replace(/\bwhy it matters:\s*/i, '')
    .replace(ELLIPSIS_RE, '')
  for (const boilerplate of BOILERPLATE_COPY) text = text.replace(boilerplate, '')
  for (const phrase of AI_CLICHES) text = text.replace(phrase, '')
  for (const filler of VAGUE_FILLER) text = text.replace(filler, '')

  const sentences = text.match(/[^.!?]+[.!?]?/g) || []
  const sentenceText = clean(sentences.slice(0, 2).join(' '))
  return limitWordsAndChars(sentenceText || text, maxWords, maxChars)
}

export function humanizeCaption(value) {
  let text = clean(value)
  for (const phrase of AI_CLICHES) text = text.replace(phrase, (match) => {
    const lower = match.toLowerCase()
    if (lower.startsWith('delve')) return 'look'
    if (lower.startsWith('leverage') || lower.startsWith('utilize') || lower.startsWith('utilise')) return 'use'
    if (lower.startsWith('seamless')) return 'smooth'
    return ''
  })
  return clean(text)
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
}

export function buildEditorialImagePrompt(story = {}) {
  const subject = clean(story.primarySubject || story.headline)
  const action = clean(story.subjectAction || 'being used in a real operational setting')
  const environment = clean(story.environment || 'a credible contemporary workplace')
  const signals = (story.technologySignals || story.visibleObjects || []).map(clean).filter(Boolean).slice(0, 6)
  const context = (story.regionalContext || []).map(clean).filter(Boolean).slice(0, 4)
  const mustShow = (story.mustShow || []).map(clean).filter(Boolean).slice(0, 6)
  const mustNotShow = (story.mustNotShow || []).map(clean).filter(Boolean).slice(0, 10)
  const textSafeArea = clean(story.textSafeArea || 'lower third')

  return [
    'Premium editorial technology photograph, art-directed for a respected international business magazine.',
    `Primary subject: ${subject}.`,
    `Show ${action} inside ${environment}.`,
    signals.length ? `Visible story-specific details: ${signals.join(', ')}.` : '',
    mustShow.length ? `Must show: ${mustShow.join(', ')}.` : '',
    context.length ? `Use restrained, authentic regional context: ${context.join(', ')}.` : '',
    `Leave a calm text-safe area in the ${textSafeArea}.`,
    'Documentary realism, mature composition, believable equipment, natural human posture, controlled contrast, realistic lighting, and restrained Photoshop-style polish.',
    [
      'Do not include words, logos, watermarks, fake interface text, generic AI brains, robot heads, floating holograms, duplicated people, distorted hands, cartoon styling, vector art, plastic skin, or generic stock-photo posing.',
      mustNotShow.length ? `Also avoid: ${mustNotShow.join(', ')}.` : '',
    ].filter(Boolean).join(' '),
  ].filter(Boolean).join(' ')
}

export function selectUniqueAssets(candidates, { required = 3, recentFingerprints = [] } = {}) {
  const used = new Set(recentFingerprints.filter(Boolean))
  const selected = []
  const rejected = []

  for (const candidate of candidates || []) {
    const fingerprint = clean(candidate.fingerprint || (candidate.buffer ? assetFingerprint(candidate.buffer) : ''))
    const rawFingerprint = clean(candidate.rawFingerprint || candidate.raw_fingerprint || '')
    const sourceUrl = clean(candidate.sourceUrl || candidate.assetSourceUrl || candidate.attributionSourceUrl || '')
    const sourceIdentity = sourceUrl ? `source:${sourceUrl.toLowerCase()}` : ''
    const identities = [fingerprint, rawFingerprint, sourceIdentity].filter(Boolean)
    const problems = []
    const qualityScore = Number(candidate.qualityScore ?? candidate.overallScore ?? 0)
    const storyAlignment = Number(candidate.storyAlignment ?? 0)
    const editorialCredibility = Number(candidate.editorialCredibility ?? 0)
    const genericStockRisk = Number(candidate.genericStockRisk ?? 100)
    const aiArtifactRisk = Number(candidate.aiArtifactRisk ?? 100)
    const width = Number(candidate.width ?? 0)
    const height = Number(candidate.height ?? 0)

    if (!fingerprint) problems.push('missing_fingerprint')
    if (!candidate.path && !candidate.url && !candidate.buffer) problems.push('missing_asset')
    if (candidate.missing === true || candidate.exists === false) problems.push('missing_image')
    if (candidate.blank === true || candidate.placeholder === true || candidate.fallback === 'blank') problems.push('blank_or_placeholder_asset')
    if (candidate.fallbackUsed === true || candidate.fallback_used === true) problems.push('fallback_asset')
    if (/deterministic|template|placeholder|fallback/i.test(String(candidate.imageModel || candidate.image_model || ''))) {
      problems.push('non_editorial_generated_asset')
    }
    if (!width || !height) problems.push('missing_image_dimensions')
    if (width && width < 1000) problems.push('low_resolution')
    if (height && height < 700) problems.push('low_resolution')
    if (identities.some((identity) => used.has(identity))) problems.push('duplicate_asset')
    if (qualityScore < 78) problems.push('quality_below_78')
    if (storyAlignment < 80) problems.push('story_alignment_below_80')
    if (editorialCredibility < 75) problems.push('editorial_credibility_below_75')
    if (genericStockRisk >= 35) problems.push('generic_stock_risk_too_high')
    if (aiArtifactRisk >= 20) problems.push('ai_artifact_risk_too_high')

    if (problems.length) {
      rejected.push({ ...candidate, fingerprint, rawFingerprint, sourceUrl, sourceIdentity, rejectionReasons: [...new Set(problems)] })
      continue
    }
    for (const identity of identities) used.add(identity)
    selected.push({ ...candidate, fingerprint, rawFingerprint, sourceUrl, sourceIdentity })
    if (selected.length === required) break
  }

  return {
    ok: selected.length === required,
    selected,
    rejected,
    missing: Math.max(0, required - selected.length),
  }
}

export function validateSlideCopy(slide) {
  const headline = sanitizeHeadline(slide.headline)
  const deck = sanitizeDeck(slide.deck || slide.summary)
  const errors = []
  const regionLabel = clean(slide.region)
  const categoryLabel = clean(slide.category || slide.label || '')
  if (!regionLabel) errors.push('region_missing')
  if (regionLabel.split(' ').filter(Boolean).length > 3) errors.push('region_too_long')
  if (categoryLabel && categoryLabel.split(' ').filter(Boolean).length > 3) errors.push('category_too_long')
  if (!headline) errors.push('headline_missing')
  if (!deck) errors.push('deck_missing')
  if (ELLIPSIS_RE.test(headline) || ELLIPSIS_RE.test(deck)) errors.push('trailing_ellipsis')
  if (headline.split(' ').filter(Boolean).length > 13 || headline.length > 78) errors.push('headline_too_long')
  if (deck.split(' ').filter(Boolean).length > 34 || deck.length > 210) errors.push('deck_too_long')
  if (looksIncomplete(headline)) errors.push('headline_incomplete')
  if (looksIncomplete(deck)) errors.push('deck_incomplete')
  if (VAGUE_FILLER.some((pattern) => pattern.test(deck))) errors.push('vague_deck')
  return { ok: errors.length === 0, headline, deck, errors: [...new Set(errors)] }
}
