import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPublishedStoryIdentities, normalizePublishedText } from '../src/publication-history.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const runDate = readArg('--date') || todayInTimeZone()
const slot = readArg('--slot') || 'evergreen'
const mode = readArg('--mode') || (slot === 'weekly-recap' ? 'weekly-recap' : 'tip')
const forcedTipId = readArg('--tip-id')
const allowPublishedReuse = process.argv.includes('--allow-published-reuse')

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

function audienceLabel(level) {
  return {
    beginner: 'new AI users',
    builder: 'everyday builders',
    'power-user': 'AI power users',
    business: 'business leaders',
  }[level] || 'AI users'
}

function promptBlock(tip) {
  return tip.prompt ? `\nTry this prompt:\n"${tip.prompt}"\n` : ''
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
${promptBlock(tip)}

Why it matters: ${tip.why}

Useful for: ${audienceLabel(tip.level)}

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
${promptBlock(tip)}

The point is not to make AI look clever. The point is to make the work easier to check, easier to repeat, and safer to hand off.

This one is especially useful for ${audienceLabel(tip.level)}.

${tip.question || 'What would you test this on first?'}
`
}

const levelOrder = ['beginner', 'builder', 'power-user', 'business']

function selectTip(tips, usedIds, usedTitles) {
  if (forcedTipId) {
    const found = tips.find((tip) => tip.id === forcedTipId)
    if (!found) throw new Error(`Unknown evergreen tip id: ${forcedTipId}`)
    if (!allowPublishedReuse && (usedIds.has(found.id) || usedTitles.has(normalizePublishedText(found.title)))) {
      throw new Error(`Evergreen tip was already published: ${found.id}`)
    }
    return found
  }
  const unused = tips.filter((tip) => !usedIds.has(tip.id) && !usedTitles.has(normalizePublishedText(tip.title)))
  if (unused.length > 0) {
    const usedCountByLevel = new Map(levelOrder.map((level) => [level, 0]))
    for (const tip of tips) {
      if ((usedIds.has(tip.id) || usedTitles.has(normalizePublishedText(tip.title))) && usedCountByLevel.has(tip.level)) {
        usedCountByLevel.set(tip.level, usedCountByLevel.get(tip.level) + 1)
      }
    }
    const dayNumber = Math.floor(Date.parse(`${runDate}T00:00:00Z`) / 86400000)
    const rotationStart = ((dayNumber % levelOrder.length) + levelOrder.length) % levelOrder.length
    const rankedLevels = [...levelOrder].sort((a, b) => {
      const countDifference = usedCountByLevel.get(a) - usedCountByLevel.get(b)
      if (countDifference !== 0) return countDifference
      const aIndex = (levelOrder.indexOf(a) - rotationStart + levelOrder.length) % levelOrder.length
      const bIndex = (levelOrder.indexOf(b) - rotationStart + levelOrder.length) % levelOrder.length
      return aIndex - bIndex
    })
    for (const level of rankedLevels) {
      const match = unused.find((tip) => tip.level === level)
      if (match) return match
    }
    return unused[0]
  }
  throw new Error('No unpublished evergreen tips remain. Add a new tip instead of recycling a published story or visual.')
}

function validateTipLibrary(tips) {
  const ids = new Set()
  for (const [index, tip] of tips.entries()) {
    const label = tip?.id || `item ${index + 1}`
    if (!tip?.id || ids.has(tip.id)) throw new Error(`Evergreen tip has a missing or duplicate id: ${label}`)
    ids.add(tip.id)
    if (!levelOrder.includes(tip.level)) throw new Error(`Evergreen tip has an invalid level: ${label}`)
    for (const field of ['category', 'title', 'hook', 'tip', 'why', 'prompt', 'question']) {
      if (!String(tip[field] || '').trim()) throw new Error(`Evergreen tip ${label} is missing ${field}`)
    }
    if (!Array.isArray(tip.steps) || tip.steps.length !== 4 || tip.steps.some((step) => !String(step).trim())) {
      throw new Error(`Evergreen tip ${label} must have exactly four usable steps`)
    }
  }
}

const tipsPath = path.join(root, 'content', 'evergreen', mode === 'weekly-recap' ? 'weekly-recaps.json' : 'tips.json')
const tips = await readJson(tipsPath)
if (!Array.isArray(tips) || tips.length === 0) throw new Error(`No evergreen tips found in ${tipsPath}`)
if (mode !== 'weekly-recap') validateTipLibrary(tips)

const usedIds = new Set()
const usedTitles = new Set()
for (const identity of await loadPublishedStoryIdentities(root)) {
  if (identity.startsWith('content:')) usedIds.add(identity.slice(8))
  if (identity.startsWith('title:')) usedTitles.add(identity.slice(6))
}

const tip = selectTip(tips, usedIds, usedTitles)
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
    topics: [tip.category, tip.level, 'AI tips', 'workflow'],
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
Level: ${tip.level || 'general'}

## Hook

${tip.hook}

## Tip

${tip.tip}

## Why

${tip.why}

## Prompt

${tip.prompt || 'Not applicable'}
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
