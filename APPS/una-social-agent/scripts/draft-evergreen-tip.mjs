import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const runDate = readArg('--date') || todayInTimeZone()
const slot = readArg('--slot') || 'evergreen'
const mode = readArg('--mode') || (slot === 'weekly-recap' ? 'weekly-recap' : 'tip')
const forceNew = process.argv.includes('--force-new')
const forcedTipId = readArg('--tip-id')

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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, value.trim() + '\n', 'utf8')
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

function draftKey(date, slotName) {
  return slotName === 'news' ? date : `${date}-${slotName}`
}

function hashtags(tip) {
  return (tip.hashtags || ['#ArtificialIntelligence', '#Automation', '#Workflow', '#AITools']).join(' ')
}

function instagramCaption(tip) {
  if (mode === 'weekly-recap') {
    return `
${tip.hook}

Three things worth watching this week:
${tip.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Why it matters: ${tip.why}

Source: Una Labs weekly AI notes

${hashtags(tip)}
`
  }

  return `
${tip.hook}

${tip.tip}

Simple way to use it today:
${tip.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Why it matters: ${tip.why}

Source: Una Labs practical AI notes

${hashtags(tip)}
`
}

function linkedinPost(tip) {
  if (mode === 'weekly-recap') {
    return `
Three AI and technology things I would keep an eye on this week.

${tip.hook}

The point is not to chase every headline. The point is to notice where the work is actually changing.

This week, I would watch:

1. ${tip.steps[0]}
2. ${tip.steps[1]}
3. ${tip.steps[2]}

Why it matters: ${tip.why}

For small teams, the advantage is not knowing every new tool first. The advantage is picking the few changes that can improve real workflows, then testing them carefully before trusting them.

What is one AI change you are watching this week?
`
  }

  return `
One practical AI tip for today: ${tip.title}

${tip.hook}

The move is simple: ${tip.tip}

This matters because ${tip.why.toLowerCase()}

How I would use it in real work:

1. ${tip.steps[0]}
2. ${tip.steps[1]}
3. ${tip.steps[2]}
4. ${tip.steps[3]}

The point is not to make AI look clever. The point is to make the work easier to check, easier to repeat, and safer to hand off.

For small teams, this is where AI starts to become useful: one clear workflow, one review step, one improvement at a time.

What is one task you would trust AI to draft, but not fully decide for you yet?
`
}

function selectTip(tips, usedIds) {
  if (forcedTipId) {
    const found = tips.find((tip) => tip.id === forcedTipId)
    if (!found) throw new Error(`Unknown evergreen tip id: ${forcedTipId}`)
    return found
  }
  if (forceNew) {
    const unused = tips.find((tip) => !usedIds.has(tip.id))
    if (unused) return unused
  }
  const dayNumber = Math.floor(Date.parse(`${runDate}T12:00:00-04:00`) / 86400000)
  return tips[dayNumber % tips.length]
}

const tipsPath = path.join(root, 'content', 'evergreen', mode === 'weekly-recap' ? 'weekly-recaps.json' : 'tips.json')
const ledgerPath = path.join(root, 'content', 'ledger', 'evergreen-ledger.jsonl')
const tips = await readJson(tipsPath)
if (!Array.isArray(tips) || tips.length === 0) throw new Error(`No evergreen tips found in ${tipsPath}`)

const usedIds = new Set()
if (await exists(ledgerPath)) {
  const lines = (await fs.readFile(ledgerPath, 'utf8')).split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    try {
      const entry = JSON.parse(line)
      if (entry?.tipId) usedIds.add(entry.tipId)
    } catch {
      // Ignore malformed historical ledger lines.
    }
  }
}

const tip = selectTip(tips, usedIds)
const key = draftKey(runDate, slot)
const draftDir = path.join(root, 'content', 'drafts', key)

const topic = {
  runDate,
  slot,
  selected: {
    title: tip.title,
    sourceName: 'Una Labs practical AI notes',
    url: 'https://unalabs.cloud',
    publishedAt: `${runDate}T12:00:00-04:00`,
    summary: tip.tip,
    topics: [tip.category, 'AI tips', 'workflow', 'automation'],
  },
  evergreen: tip,
  policy: {
    status: 'drafted',
    postingMode: 'auto_publish_after_quality_gate',
    autoPost: true,
    contentLane: mode === 'weekly-recap' ? 'weekly-recap' : 'evergreen',
  },
}

await writeJson(path.join(draftDir, 'topic.json'), topic)
await writeJson(path.join(draftDir, 'sources.json'), [
  {
    sourceName: mode === 'weekly-recap' ? 'Una Labs weekly AI notes' : 'Una Labs practical AI notes',
    sourceTier: 'owned',
    region: 'Global',
    title: tip.title,
    url: 'https://unalabs.cloud',
    summary: tip.tip,
    publishedAt: `${runDate}T12:00:00-04:00`,
    topics: topic.selected.topics,
  },
])
await writeText(path.join(draftDir, 'instagram-caption.md'), instagramCaption(tip))
await writeText(path.join(draftDir, 'linkedin-post.md'), linkedinPost(tip))
await writeText(
  path.join(draftDir, 'posting-brief.md'),
  `
# Una Labs Evergreen Tip - ${runDate}

Slot: ${slot}
Mode: ${mode}
Tip: ${tip.title}
Category: ${tip.category}

## Hook

${tip.hook}

## Tip

${tip.tip}

## Why

${tip.why}
`,
)

console.log(
  JSON.stringify(
    {
      status: 'drafted',
      runDate,
      slot,
      draftKey: key,
      tipId: tip.id,
      title: tip.title,
      draftDir: path.relative(root, draftDir),
    },
    null,
    2,
  ),
)
