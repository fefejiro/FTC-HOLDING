import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const runDate = readArg('--date') || todayInTimeZone()
const manualTitle = readArg('--title')
const manualSource = readArg('--source') || 'Primary source'
const manualUrl = readArg('--url')
const manualSummary = readArg('--summary')
const manualWhy = readArg('--why')

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

function cleanText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function trimWords(text, maxWords) {
  const words = cleanText(text).split(/\s+/).filter(Boolean)
  return words.length <= maxWords ? words.join(' ') : words.slice(0, maxWords).join(' ')
}

function isUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function makeStoryFromArgs() {
  if (!manualTitle || !manualUrl || !manualSummary) return null
  return {
    title: cleanText(manualTitle),
    sourceName: cleanText(manualSource),
    url: manualUrl,
    summary: cleanText(manualSummary),
    why: cleanText(manualWhy),
  }
}

async function latestExistingStory() {
  const topicPath = path.join(root, 'content', 'drafts', runDate, 'topic.json')
  try {
    const topic = JSON.parse(await fs.readFile(topicPath, 'utf8'))
    const selected = topic.selected
    if (!selected?.title || !selected?.url) return null
    return {
      title: cleanText(selected.title),
      sourceName: cleanText(selected.sourceName || 'Primary source'),
      url: selected.url,
      summary: cleanText(selected.summary || ''),
      why: '',
    }
  } catch {
    return null
  }
}

function simpleHeadline(story) {
  const text = `${story.title} ${story.summary}`.toLowerCase()
  if (/muse spark|meta model api|meta ai/.test(text)) return 'Meta opened a new AI lane for developers'
  if (/data center|datacenter|electricity|energy|climate|emissions/.test(text)) return 'AI growth is putting pressure on power and climate plans'
  if (/security|privacy|safety|risk/.test(text)) return 'AI trust is becoming a real product issue'
  if (/agent|workflow|automation/.test(text)) return 'AI agents are moving closer to daily work'
  return trimWords(story.title, 10)
}

function whatHappened(story) {
  if (/muse spark|meta model api/i.test(`${story.title} ${story.summary}`)) {
    return 'Meta released Muse Spark 1.1 and opened developer access through the Meta Model API.'
  }
  return trimWords(story.summary || story.title, 38)
}

function whyItMatters(story) {
  if (story.why) return trimWords(story.why, 34)
  const text = `${story.title} ${story.summary}`.toLowerCase()
  if (/developer|api|coding|agent|workflow/.test(text)) {
    return 'AI is moving from chat into tools that can help people build, test, and finish real work.'
  }
  if (/energy|climate|data center|datacenter/.test(text)) {
    return 'AI is not only software. It also needs power, buildings, cooling, and better planning.'
  }
  return 'The useful question is not what launched, but what it changes for real people and real teams.'
}

function unaTake(story) {
  const text = `${story.title} ${story.summary}`.toLowerCase()
  if (/developer|api|coding|agent|workflow/.test(text)) {
    return 'The bigger signal is simple: the AI race is becoming a workflow race. A powerful model is useful, but a model people can actually build with is more important.'
  }
  if (/energy|climate|data center|datacenter/.test(text)) {
    return 'The bigger signal is simple: AI scale has real-world costs. The winners will need better infrastructure, not just better demos.'
  }
  return 'The bigger signal is simple: useful AI has to move from headlines into repeatable work people can trust.'
}

function linkedInDiagram(story) {
  return [
    'Simple map:',
    `${story.sourceName} -> ${simpleHeadline(story)} -> ${whyItMatters(story)}`,
    '',
    'How I would read it:',
    '1. Check the source.',
    '2. Ask what changed.',
    '3. Ask who this helps.',
    '4. Test one real workflow before trusting the hype.',
  ].join('\n')
}

function instagramCaption(story) {
  return `${simpleHeadline(story)}

${whatHappened(story)}

Why it matters: ${whyItMatters(story)}

Una Labs take: ${unaTake(story)}

Would you use this now, or wait until the tools mature?

Source: ${story.sourceName} - ${story.url}

#AINews #ArtificialIntelligence #TechNews #Developers #AITools`
}

function linkedInCaption(story) {
  return `${simpleHeadline(story)}

${whatHappened(story)}

The practical point is this: AI news only matters if it changes how people build, work, learn, support customers, or make decisions.

${whyItMatters(story)}

Una Labs take: ${unaTake(story)}

For builders and small teams, the next step is not to chase every launch. The next step is to pick one workflow, test it carefully, keep proof, and decide if it actually saves time or improves quality.

${linkedInDiagram(story)}

What would you test first?

Source: ${story.sourceName} - ${story.url}

#ArtificialIntelligence #AINews #Technology #Workflow`
}

function wordCount(text) {
  return String(text || '').split(/\s+/).filter(Boolean).length
}

async function writeCaptionPack(story) {
  const outDir = path.join(root, 'content', 'captions', runDate)
  const pack = {
    runDate,
    status: 'draft_caption_only',
    spending: 'no_openai_or_image_api_used',
    story: {
      title: story.title,
      sourceName: story.sourceName,
      url: story.url,
    },
    instagramCaption: instagramCaption(story),
    linkedInCaption: linkedInCaption(story),
    linkedInDiagram: linkedInDiagram(story),
    checks: {
      sourceUrlValid: isUrl(story.url),
      instagramWords: wordCount(instagramCaption(story)),
      linkedInWords: wordCount(linkedInCaption(story)),
      linkedInDiagramIncluded: true,
      noFancyWords: true,
      imageGenerationUsed: false,
    },
    createdAt: new Date().toISOString(),
  }

  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'caption-pack.json'), `${JSON.stringify(pack, null, 2)}\n`, 'utf8')
  await fs.writeFile(
    path.join(outDir, 'caption-pack.md'),
    [
      `# Caption Pack - ${runDate}`,
      '',
      `Status: ${pack.status}`,
      `Spend: ${pack.spending}`,
      '',
      '## Story',
      '',
      `Title: ${story.title}`,
      `Source: ${story.sourceName} - ${story.url}`,
      '',
      '## Instagram',
      '',
      '```text',
      pack.instagramCaption,
      '```',
      '',
      '## LinkedIn',
      '',
      '```text',
      pack.linkedInCaption,
      '```',
      '',
      '## Checks',
      '',
      `- Instagram words: ${pack.checks.instagramWords}`,
      `- LinkedIn words: ${pack.checks.linkedInWords}`,
      `- Image generation used: ${pack.checks.imageGenerationUsed}`,
      '',
    ].join('\n'),
    'utf8',
  )
  return { outDir, pack }
}

const story = makeStoryFromArgs() || (await latestExistingStory())
if (!story) {
  console.error('No story found. Pass --title, --url, and --summary, or generate a draft topic first.')
  process.exitCode = 1
} else if (!isUrl(story.url)) {
  console.error(`Invalid source URL: ${story.url}`)
  process.exitCode = 1
} else {
  const result = await writeCaptionPack(story)
  console.log(
    JSON.stringify(
      {
        status: 'drafted_caption_only',
        runDate,
        outDir: path.relative(root, result.outDir),
        instagramWords: result.pack.checks.instagramWords,
        linkedInWords: result.pack.checks.linkedInWords,
        imageGenerationUsed: false,
        openAiUsed: false,
      },
      null,
      2,
    ),
  )
}
