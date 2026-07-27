import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dateArg = process.argv.includes('--date')
  ? process.argv[process.argv.indexOf('--date') + 1]
  : todayInTimeZone()

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

async function readMaybe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

const draftDir = path.join(root, 'content', 'drafts', dateArg)
const assetDir = path.join(root, 'content', 'assets', dateArg)
const topicRaw = await readMaybe(path.join(draftDir, 'topic.json'))
const instagram = await readMaybe(path.join(draftDir, 'instagram-caption.md'))
const linkedin = await readMaybe(path.join(draftDir, 'linkedin-post.md'))
const checklist = await readMaybe(path.join(draftDir, 'review-checklist.md'))
const briefPath = path.join(draftDir, 'posting-brief.md')
const briefExists = Boolean(await readMaybe(briefPath))
const pngPath = path.join(assetDir, 'instagram-card.png')
const svgPath = path.join(assetDir, 'instagram-card.svg')
const pngExists = Boolean(await readMaybe(pngPath))
const svgExists = Boolean(await readMaybe(svgPath))

if (!topicRaw) {
  console.log(`No Una Labs social draft found for ${dateArg}. Run npm run draft:today first.`)
  process.exit(1)
}

const topic = JSON.parse(topicRaw)

console.log(`# Una Labs Social Draft Report - ${dateArg}

Status: ${topic.policy?.status || 'drafted'}
Posting mode: ${topic.policy?.postingMode || 'manual_review_required'}
Auto-post: ${topic.policy?.autoPost ? 'yes' : 'no'}

Topic: ${topic.selected?.title}
Source: ${topic.selected?.sourceName}
URL: ${topic.selected?.url}
Posting brief: ${briefExists ? path.relative(root, briefPath) : 'missing'}
Instagram PNG: ${pngExists ? path.relative(root, pngPath) : 'missing'}
Editable SVG: ${svgExists ? path.relative(root, svgPath) : 'missing'}

## Instagram Caption

${instagram.trim()}

## LinkedIn Post

${linkedin.trim()}

## Checklist

${checklist.trim()}
`)
