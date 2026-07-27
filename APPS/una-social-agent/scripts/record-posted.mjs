import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const runDate = readArg('--date') || todayInTimeZone()
const instagramUrl = readArg('--instagram-url')
const linkedinUrl = readArg('--linkedin-url')
const status = readArg('--status') || 'posted_verified'
const dryRun = process.argv.includes('--dry-run')

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

function isHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

async function readTopic() {
  const topicPath = path.join(root, 'content', 'drafts', runDate, 'topic.json')
  return JSON.parse(await fs.readFile(topicPath, 'utf8'))
}

async function appendLedger(entry) {
  const ledgerPath = path.join(root, 'content', 'ledger', 'social-ledger.jsonl')
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true })
  await fs.appendFile(ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8')
}

if (!instagramUrl && !linkedinUrl) {
  console.error('Provide at least one URL: --instagram-url <url> and/or --linkedin-url <url>')
  process.exit(1)
}

for (const [label, value] of [
  ['instagram-url', instagramUrl],
  ['linkedin-url', linkedinUrl],
]) {
  if (value && !isHttpUrl(value)) {
    console.error(`Invalid ${label}: ${value}`)
    process.exit(1)
  }
}

const topic = await readTopic()
const entry = {
  id: `una-social-post-${runDate}-${Date.now()}`,
  runDate,
  status,
  reviewStatus: 'posted',
  channels: [
    ...(instagramUrl ? ['instagram'] : []),
    ...(linkedinUrl ? ['linkedin'] : []),
  ],
  topic: {
    title: topic.selected?.title,
    url: topic.selected?.url,
    sourceName: topic.selected?.sourceName,
    publishedAt: topic.selected?.publishedAt,
  },
  postedUrls: {
    ...(instagramUrl ? { instagram: instagramUrl } : {}),
    ...(linkedinUrl ? { linkedin: linkedinUrl } : {}),
  },
  createdAt: new Date().toISOString(),
}

if (!dryRun) await appendLedger(entry)
console.log(JSON.stringify(entry, null, 2))
