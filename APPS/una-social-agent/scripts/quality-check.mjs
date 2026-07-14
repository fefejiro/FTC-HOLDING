import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const draftDir = path.join(root, 'content', 'drafts', runDate)
const assetDir = path.join(root, 'content', 'assets', runDate)
const paths = {
  topic: path.join(draftDir, 'topic.json'),
  sources: path.join(draftDir, 'sources.json'),
  instagram: path.join(draftDir, 'instagram-caption.md'),
  linkedin: path.join(draftDir, 'linkedin-post.md'),
  png: path.join(assetDir, 'instagram-card.png'),
  slide1: path.join(root, 'content', 'previews', `regional-news-preview-${runDate}-slide-1.png`),
  slide2: path.join(root, 'content', 'previews', `regional-news-preview-${runDate}-slide-2.png`),
  slide3: path.join(root, 'content', 'previews', `regional-news-preview-${runDate}-slide-3.png`),
  visualLedger: path.join(root, 'content', 'visuals', runDate, 'visual-proof-ledger.json'),
}

const issues = []
const warnings = []
const voice = await readJson('config/voice.json')

for (const [name, filePath] of Object.entries(paths)) {
  if (!(await exists(filePath))) issues.push(`Missing ${name}: ${path.relative(root, filePath)}`)
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

if (!/\bSources?:\s+\S+/i.test(instagram)) {
  issues.push('Instagram caption is missing a Source/Sources line.')
}

if (!/#\w+/.test(instagram)) {
  issues.push('Instagram caption is missing hashtags.')
}

if (/\[[^\]]+\]|lorem ipsum|caption goes here|todo/i.test(instagram)) {
  issues.push('Instagram caption contains placeholder text.')
}

if (!topic?.selected?.title) issues.push('Topic title is missing.')
if (!isHttpUrl(topic?.selected?.url || '')) issues.push('Primary topic URL is missing or invalid.')

if (!Array.isArray(sources) || sources.length < 3) {
  issues.push('Three regional sources are required.')
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

const regions = new Set((topic?.candidates || sources || []).map((item) => item.region || item.sourceName).filter(Boolean))
if (sources.length >= 3 && regions.size < 3) {
  warnings.push('Regional diversity could not be fully confirmed from source metadata.')
}

if (topic?.feedErrors?.length) {
  warnings.push(`${topic.feedErrors.length} feed error(s) were recorded in topic.json.`)
}

if (!visualLedger) {
  issues.push('Visual proof ledger is missing. Run npm run visual:today before quality.')
} else {
  if (visualLedger.publish_status !== 'review_required') {
    warnings.push(`Visual ledger publish_status is ${visualLedger.publish_status}; expected review_required before live publishing.`)
  }
  if (!Array.isArray(visualLedger.records) || visualLedger.records.length < 3) {
    issues.push('Visual proof ledger must contain three regional visual records.')
  } else {
    for (const record of visualLedger.records) {
      const evaluation = record.image_evaluation || {}
      if (evaluation.decision !== 'accept') {
        issues.push(`${record.region || 'Region'} visual was not accepted by image relevance review.`)
      }
      if ((evaluation.overall_score || 0) < 78) {
        issues.push(`${record.region || 'Region'} visual overall score ${evaluation.overall_score || 0} is below 78.`)
      }
      if ((evaluation.story_alignment || 0) < 80) {
        issues.push(`${record.region || 'Region'} visual story alignment ${evaluation.story_alignment || 0} is below 80.`)
      }
      if ((evaluation.technology_specificity || 0) < 70) {
        issues.push(`${record.region || 'Region'} visual technology specificity ${evaluation.technology_specificity || 0} is below 70.`)
      }
      if ((evaluation.editorial_credibility || 0) < 75) {
        issues.push(`${record.region || 'Region'} visual editorial credibility ${evaluation.editorial_credibility || 0} is below 75.`)
      }
      if ((evaluation.stereotype_risk || 100) > 19) {
        issues.push(`${record.region || 'Region'} visual stereotype risk ${evaluation.stereotype_risk || 100} is above 19.`)
      }
      if ((evaluation.generic_stock_risk || 100) > 34) {
        issues.push(`${record.region || 'Region'} visual generic stock risk ${evaluation.generic_stock_risk || 100} is above 34.`)
      }
    }
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
  issues,
  warnings,
}

console.log(JSON.stringify(result, null, 2))
if (issues.length) process.exitCode = 1
