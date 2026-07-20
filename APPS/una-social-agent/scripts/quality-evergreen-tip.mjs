import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const runDate = readArg('--date') || todayInTimeZone()
const slot = readArg('--slot') || 'evergreen'

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

function draftKey(date, slotName) {
  return slotName === 'news' ? date : `${date}-${slotName}`
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8')
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath))
}

function wordCount(text) {
  return String(text || '').split(/\s+/).filter(Boolean).length
}

const key = draftKey(runDate, slot)
const draftDir = path.join(root, 'content', 'drafts', key)
const previewDir = path.join(root, 'content', 'previews')
const paths = {
  topic: path.join(draftDir, 'topic.json'),
  instagram: path.join(draftDir, 'instagram-caption.md'),
  linkedin: path.join(draftDir, 'linkedin-post.md'),
  slide1: path.join(previewDir, `evergreen-tip-${runDate}-${slot}-slide-1.png`),
  slide2: path.join(previewDir, `evergreen-tip-${runDate}-${slot}-slide-2.png`),
  slide3: path.join(previewDir, `evergreen-tip-${runDate}-${slot}-slide-3.png`),
  contact: path.join(previewDir, `evergreen-tip-${runDate}-${slot}.png`),
}

const issues = []
const warnings = []

for (const [name, filePath] of Object.entries(paths)) {
  if (!(await exists(filePath))) issues.push(`Missing ${name}: ${path.relative(root, filePath)}`)
}

let topic = null
let instagram = ''
let linkedin = ''
if (await exists(paths.topic)) topic = await readJson(paths.topic)
if (await exists(paths.instagram)) instagram = await readText(paths.instagram)
if (await exists(paths.linkedin)) linkedin = await readText(paths.linkedin)

const instagramWords = wordCount(instagram)
const linkedinWords = wordCount(linkedin)

if (!topic?.evergreen?.id) issues.push('Topic is missing evergreen tip metadata.')
if (instagramWords < 45 || instagramWords > 140) issues.push(`Instagram caption word count ${instagramWords} is outside 45-140.`)
if (linkedinWords < 120 || linkedinWords > 280) issues.push(`LinkedIn post word count ${linkedinWords} is outside 120-280.`)
if (!/\bSource:\s+Una Labs (practical|weekly) AI notes/i.test(instagram)) issues.push('Instagram caption is missing the Una Labs source line.')
if (!/#\w+/.test(instagram)) issues.push('Instagram caption is missing hashtags.')
if (/\[[^\]]+\]|lorem ipsum|caption goes here|todo/i.test(instagram + linkedin)) issues.push('Draft contains placeholder text.')
if (/source-backed|breaking|today in tech/i.test(instagram)) warnings.push('Evergreen caption may sound like the news lane.')

const result = {
  status: issues.length ? 'failed' : 'passed',
  runDate,
  slot,
  draftKey: key,
  tipId: topic?.evergreen?.id || '',
  instagramWords,
  linkedinWords,
  issues,
  warnings,
}

console.log(JSON.stringify(result, null, 2))
if (issues.length) process.exitCode = 1
