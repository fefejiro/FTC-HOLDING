import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertPublishable } from '../src/publish-guard.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const runDate = readArg('--date') || todayInTimeZone()
const maxSourceAgeDays = Number(readArg('--max-source-age-days') || 7)

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

function todayInTimeZone(timeZone = 'America/New_York') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8')
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'))
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function wordCount(text) {
  return String(text || '').split(/\s+/).filter(Boolean).length
}

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function daysOld(isoDate) {
  if (!isoDate) return Infinity
  const parsed = Date.parse(isoDate)
  if (!Number.isFinite(parsed)) return Infinity
  const noon = new Date(`${runDate}T12:00:00-04:00`).getTime()
  return Math.max(0, Math.floor((noon - parsed) / 86400000))
}

function relative(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, '/')
}

function resolveMaybe(relativeOrAbsolute = '') {
  if (!relativeOrAbsolute) return ''
  return path.isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : path.join(root, relativeOrAbsolute)
}

async function sha256File(filePath) {
  const buffer = await fs.readFile(filePath)
  return createHash('sha256').update(buffer).digest('hex')
}

async function pngDimensions(filePath) {
  const buffer = await fs.readFile(filePath)
  if (buffer.length < 24) return { width: 0, height: 0, byteLength: buffer.length }
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (!png) return { width: 0, height: 0, byteLength: buffer.length }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    byteLength: buffer.length,
  }
}

function normalizeEval(evaluation = {}) {
  return {
    overallScore: Number(evaluation.overall_score ?? evaluation.overallScore ?? 0),
    storyAlignment: Number(evaluation.story_alignment ?? evaluation.storyAlignment ?? 0),
    editorialCredibility: Number(evaluation.editorial_credibility ?? evaluation.editorialCredibility ?? 0),
    genericStockRisk: Number(evaluation.generic_stock_risk ?? evaluation.genericStockRisk ?? 100),
    aiArtifactRisk: Number(evaluation.ai_artifact_risk ?? evaluation.aiArtifactRisk ?? 10),
    rejectionReasons: evaluation.failure_reasons || evaluation.rejectionReasons || [],
  }
}

async function loadRecentImageFingerprints(limit = 30) {
  const ledgerPath = path.join(root, 'content', 'ledger', 'social-ledger.jsonl')
  if (!(await exists(ledgerPath))) return []
  const lines = (await readText(ledgerPath)).split(/\r?\n/)
  const fingerprints = []
  for (const line of lines.reverse()) {
    if (!line.trim()) continue
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      continue
    }
    if (entry.dryRun) continue
    const results = entry.results || {}
    for (const channel of ['instagram', 'linkedin']) {
      const result = results[channel] || {}
      if (!String(result.status || '').startsWith('posted')) continue
      const hashes = result.assetProof?.imageHashes || []
      for (const hash of hashes) fingerprints.push(hash)
    }
    for (const slide of entry.slides || []) {
      if (slide.assetFingerprint) fingerprints.push(slide.assetFingerprint)
      if (slide.slideFingerprint) fingerprints.push(slide.slideFingerprint)
    }
    if (fingerprints.length >= limit) break
  }
  return [...new Set(fingerprints.filter(Boolean))].slice(0, limit)
}

async function appendLedger(entry) {
  const ledgerPath = path.join(root, 'content', 'ledger', 'social-ledger.jsonl')
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true })
  await fs.appendFile(ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8')
}

async function writeJson(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8')
}

async function buildRenderedRun({ topic, sources, instagram, linkedin, visualLedger }) {
  const records = Array.isArray(visualLedger?.records) ? visualLedger.records : []
  const slides = []
  for (const [index, record] of records.entries()) {
    const slidePath = path.join(root, 'content', 'previews', `regional-news-preview-${runDate}-slide-${index + 1}.png`)
    const rawPath = resolveMaybe(record.image_asset_path)
    const assetPath = (await exists(rawPath)) ? rawPath : slidePath
    const dims = (await exists(slidePath)) ? await pngDimensions(slidePath) : { width: 0, height: 0, byteLength: 0 }
    const assetDims = (await exists(assetPath)) ? await pngDimensions(assetPath) : { width: 0, height: 0, byteLength: 0 }
    const evaluation = normalizeEval(record.image_evaluation)
    slides.push({
      storyId: record.story_id,
      region: record.region,
      sourceUrl: record.source_url || record.story_facts?.source_url || '',
      headline: record.headline || record.story_facts?.headline || '',
      deck: record.story_facts?.plain_language_summary || '',
      summary: record.story_facts?.plain_language_summary || '',
      imageEvaluation: evaluation,
      fallbackUsed: record.fallback_used === true,
      imageModel: record.image_model || '',
      asset: {
        path: relative(slidePath),
        rawPath: relative(assetPath),
        exists: await exists(slidePath),
        missing: !(await exists(slidePath)),
        blank: dims.byteLength < 50_000,
        fingerprint: (await exists(assetPath)) ? await sha256File(assetPath) : '',
        slideFingerprint: (await exists(slidePath)) ? await sha256File(slidePath) : '',
        width: dims.width || assetDims.width,
        height: dims.height || assetDims.height,
        byteLength: dims.byteLength,
        qualityScore: evaluation.overallScore,
        storyAlignment: evaluation.storyAlignment,
        editorialCredibility: evaluation.editorialCredibility,
        genericStockRisk: evaluation.genericStockRisk,
        aiArtifactRisk: record.fallback_used ? 100 : evaluation.aiArtifactRisk,
        fallbackUsed: record.fallback_used === true,
        imageModel: record.image_model || '',
      },
    })
  }
  return {
    id: visualLedger?.run_id || `una-social-${runDate}`,
    runDate,
    topic: topic?.selected?.title || '',
    sources,
    slides,
    captions: {
      instagram,
      linkedin,
    },
  }
}

function platformFlags(approved) {
  return {
    instagramPublished: false,
    linkedinPublished: false,
    publishedUrls: [],
    screenshots: [],
    publishBlockedReasons: approved.failures || [],
  }
}

const draftDir = path.join(root, 'content', 'drafts', runDate)
const proofDir = path.join(root, 'content', 'proof', runDate)
const paths = {
  topic: path.join(draftDir, 'topic.json'),
  sources: path.join(draftDir, 'sources.json'),
  instagram: path.join(draftDir, 'instagram-caption.md'),
  linkedin: path.join(draftDir, 'linkedin-post.md'),
  slide1: path.join(root, 'content', 'previews', `regional-news-preview-${runDate}-slide-1.png`),
  slide2: path.join(root, 'content', 'previews', `regional-news-preview-${runDate}-slide-2.png`),
  slide3: path.join(root, 'content', 'previews', `regional-news-preview-${runDate}-slide-3.png`),
  visualLedger: path.join(root, 'content', 'visuals', runDate, 'visual-proof-ledger.json'),
}

const issues = []
const warnings = []
const voice = await readJson('config/voice.json')

for (const [name, filePath] of Object.entries(paths)) {
  if (!(await exists(filePath))) issues.push(`Missing ${name}: ${relative(filePath)}`)
}

let topic = null
let sources = []
let instagram = ''
let linkedin = ''
let visualLedger = null

if (await exists(paths.topic)) topic = JSON.parse(await readText(paths.topic))
if (await exists(paths.sources)) sources = JSON.parse(await readText(paths.sources))
if (await exists(paths.instagram)) instagram = await readText(paths.instagram)
if (await exists(paths.linkedin)) linkedin = await readText(paths.linkedin)
if (await exists(paths.visualLedger)) visualLedger = JSON.parse(await readText(paths.visualLedger))

const instagramWords = wordCount(instagram)
const linkedinWords = wordCount(linkedin)

if (instagramWords < voice.instagram.captionWordsMin || instagramWords > voice.instagram.captionWordsMax) {
  issues.push(`Instagram caption word count ${instagramWords} is outside ${voice.instagram.captionWordsMin}-${voice.instagram.captionWordsMax}.`)
}
if (linkedinWords < voice.linkedin.wordsMin || linkedinWords > voice.linkedin.wordsMax) {
  issues.push(`LinkedIn post word count ${linkedinWords} is outside ${voice.linkedin.wordsMin}-${voice.linkedin.wordsMax}.`)
}
if (!/\bSources?:\s+\S+/i.test(instagram)) issues.push('Instagram caption is missing a Source/Sources line.')
if (!/#\w+/.test(instagram)) issues.push('Instagram caption is missing hashtags.')
if (/\[[^\]]+\]|lorem ipsum|caption goes here|todo/i.test(instagram)) issues.push('Instagram caption contains placeholder text.')
if (!topic?.selected?.title) issues.push('Topic title is missing.')
if (!isHttpUrl(topic?.selected?.url || '')) issues.push('Primary topic URL is missing or invalid.')
if (!Array.isArray(sources) || sources.length !== 3) {
  issues.push(`Exactly three regional sources are required; received ${Array.isArray(sources) ? sources.length : 0}.`)
} else {
  for (const [index, source] of sources.entries()) {
    if (!source.title) issues.push(`Source ${index + 1} is missing a title.`)
    if (!isHttpUrl(source.url || '')) issues.push(`Source ${index + 1} has an invalid URL.`)
  }
}

const primaryAge = daysOld(topic?.selected?.publishedAt)
if (!Number.isFinite(primaryAge) || primaryAge > maxSourceAgeDays) {
  issues.push(`Primary source is stale or undated: ${topic?.selected?.publishedAt || 'missing date'}.`)
}

if (topic?.feedErrors?.length) warnings.push(`${topic.feedErrors.length} feed error(s) were recorded in topic.json.`)
if (!visualLedger) {
  issues.push('Visual proof ledger is missing. Run npm run visual:today before quality.')
} else if (!Array.isArray(visualLedger.records) || visualLedger.records.length !== 3) {
  issues.push(`Visual proof ledger must contain exactly three regional visual records; received ${visualLedger.records?.length || 0}.`)
}

let renderedRun = null
let approved = null
let recentFingerprints = []
if (!issues.length) {
  renderedRun = await buildRenderedRun({ topic, sources, instagram, linkedin, visualLedger })
  recentFingerprints = await loadRecentImageFingerprints()
  try {
    approved = assertPublishable(renderedRun, { recentFingerprints })
    const approvedPayload = {
      approved: true,
      runDate,
      approvedAt: new Date().toISOString(),
      gate: 'assertPublishable',
      slides: approved.slides.map((slide, index) => ({
        storyId: slide.storyId,
        region: slide.region,
        sourceUrl: slide.sourceUrl,
        assetPath: slide.asset?.path,
        assetFingerprint: approved.assets[index]?.fingerprint || slide.asset?.fingerprint || '',
        slideFingerprint: slide.asset?.slideFingerprint || '',
        generationAttempt: visualLedger.records[index]?.generation_attempts || 0,
        qualityScore: slide.asset?.qualityScore,
        storyAlignment: slide.asset?.storyAlignment,
        editorialCredibility: slide.asset?.editorialCredibility,
        genericStockRisk: slide.asset?.genericStockRisk,
        aiArtifactRisk: slide.asset?.aiArtifactRisk,
        rejectionReasons: [],
        copyValidation: slide.copyValidation,
      })),
      captions: approved.captions,
    }
    await writeJson(path.join(draftDir, 'publish-approved.json'), approvedPayload)
    await writeJson(path.join(proofDir, 'publish-guard-report.json'), {
      status: 'ready',
      runDate,
      ...platformFlags({ failures: [] }),
      recentFingerprintCount: recentFingerprints.length,
      ...approvedPayload,
    })
  } catch (error) {
    if (error.code !== 'UNA_SOCIAL_PUBLISH_BLOCKED') throw error
    const details = error.details || {}
    const holdPayload = {
      id: `una-social-quality-hold-${runDate}-${Date.now()}`,
      runDate,
      status: 'quality_hold',
      dryRun: true,
      mode: 'publish_guard',
      publishBlockedReasons: details.failures || [error.message],
      rejectedAssets: details.rejectedAssets || [],
      instagramPublished: false,
      linkedinPublished: false,
      publishedUrls: [],
      screenshots: [],
      slides: (renderedRun?.slides || []).map((slide) => ({
        storyId: slide.storyId,
        region: slide.region,
        sourceUrl: slide.sourceUrl,
        assetPath: slide.asset?.path,
        assetFingerprint: slide.asset?.fingerprint,
        slideFingerprint: slide.asset?.slideFingerprint,
        generationAttempt: 0,
        qualityScore: slide.asset?.qualityScore,
        storyAlignment: slide.asset?.storyAlignment,
        editorialCredibility: slide.asset?.editorialCredibility,
        genericStockRisk: slide.asset?.genericStockRisk,
        aiArtifactRisk: slide.asset?.aiArtifactRisk,
        rejectionReasons: details.rejectedAssets?.find((asset) => asset.region === slide.region)?.rejectionReasons || [],
        copyValidation: details.slides?.find((item) => item.region === slide.region)?.copyValidation || { errors: [] },
      })),
      createdAt: new Date().toISOString(),
    }
    await writeJson(path.join(draftDir, 'quality-hold.json'), holdPayload)
    await writeJson(path.join(proofDir, 'publish-guard-report.json'), holdPayload)
    await appendLedger(holdPayload)
    issues.push(...holdPayload.publishBlockedReasons.map((reason) => `Publish guard blocked: ${reason}`))
  }
}

const result = {
  status: issues.length ? 'failed' : 'passed',
  runDate,
  topic: topic?.selected?.title || '',
  source: topic?.selected?.sourceName || '',
  instagramWords,
  linkedinWords,
  sourceCount: Array.isArray(sources) ? sources.length : 0,
  visualRecordCount: Array.isArray(visualLedger?.records) ? visualLedger.records.length : 0,
  primarySourceAgeDays: Number.isFinite(primaryAge) ? primaryAge : null,
  recentFingerprintCount: recentFingerprints.length,
  issues,
  warnings,
}

console.log(JSON.stringify(result, null, 2))
if (issues.length) process.exitCode = 1
