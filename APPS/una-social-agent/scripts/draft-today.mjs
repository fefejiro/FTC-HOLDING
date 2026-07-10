import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dryRun = process.argv.includes('--dry-run')
const forceNew = process.argv.includes('--force-new')
const dateArg = readArg('--date')
const runDate = dateArg || todayInTimeZone()
const manualTopicTitle = readArg('--topic-title')
const manualTopicUrl = readArg('--topic-url')
const manualTopicSource = readArg('--topic-source')
const manualTopicSummary = readArg('--topic-summary')
const manualTopicPublishedAt = readArg('--topic-published-at')

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

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'))
}

function decodeXml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function between(text, tag) {
  const patterns = [
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
    new RegExp(`<[^:>]+:${tag}[^>]*>([\\s\\S]*?)<\\/[^:>]+:${tag}>`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return decodeXml(match[1])
  }
  return ''
}

function linkFromEntry(entry) {
  const direct = between(entry, 'link')
  if (direct && /^https?:\/\//i.test(direct)) return direct
  const href = entry.match(/<link[^>]+href=["']([^"']+)["']/i)
  return href ? decodeXml(href[1]) : ''
}

function parseDate(value) {
  const parsed = Date.parse(value || '')
  return Number.isFinite(parsed) ? new Date(parsed) : null
}

function parseFeed(xml, source) {
  const blocks = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((m) => m[0])
  if (!blocks.length) {
    blocks.push(...[...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)].map((m) => m[0]))
  }
  return blocks
    .map((block) => {
      const publishedRaw = between(block, 'pubDate') || between(block, 'published') || between(block, 'updated')
      const publishedAt = parseDate(publishedRaw)
      return {
        sourceName: source.name,
        sourceTier: source.tier,
        feedUrl: source.url,
        title: between(block, 'title'),
        url: linkFromEntry(block) || between(block, 'guid'),
        summary: between(block, 'description') || between(block, 'summary') || between(block, 'content'),
        publishedAt: publishedAt ? publishedAt.toISOString() : '',
        topics: source.topics || [],
      }
    })
    .filter((item) => item.title && /^https?:\/\//i.test(item.url))
}

async function fetchText(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'UnaLabsSocialAgent/0.1 (+https://unalabs.cloud)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    })
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchCandidates(config) {
  const results = []
  const errors = []
  for (const feed of config.feeds) {
    try {
      const xml = await fetchText(feed.url)
      const parsed = parseFeed(xml, feed)
      results.push(...parsed)
    } catch (error) {
      errors.push({ sourceName: feed.name, url: feed.url, error: String(error.message || error) })
    }
  }
  return { results, errors }
}

function normalizeHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function daysOld(item, now = new Date(`${runDate}T12:00:00-04:00`)) {
  if (!item.publishedAt) return 30
  const published = new Date(item.publishedAt)
  return Math.max(0, Math.floor((now.getTime() - published.getTime()) / 86400000))
}

function scoreItem(item, config, usedUrls) {
  const text = `${item.title} ${item.summary} ${item.topics.join(' ')}`.toLowerCase()
  if (usedUrls.has(item.url)) return -100
  if ((config.avoidKeywords || []).some((keyword) => text.includes(keyword.toLowerCase()))) return -50
  let score = item.sourceTier === 'primary' ? 25 : 15
  const age = daysOld(item)
  score += Math.max(0, 30 - age * 7)
  for (const keyword of config.keywords || []) {
    if (text.includes(keyword.toLowerCase())) score += 4
  }
  if (/agent|workflow|automation|developer|enterprise|platform/.test(text)) score += 12
  return score
}

async function readUsedUrls() {
  const ledgerPath = path.join(root, 'content', 'ledger', 'social-ledger.jsonl')
  try {
    const text = await fs.readFile(ledgerPath, 'utf8')
    return new Set(
      text
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line).topic?.url || ''
          } catch {
            return ''
          }
        })
        .filter(Boolean),
    )
  } catch {
    return new Set()
  }
}

function pickTopic(candidates, config, usedUrls) {
  const scored = candidates
    .map((item) => ({ ...item, score: scoreItem(item, config, usedUrls) }))
    .sort((a, b) => b.score - a.score)
  return { selected: scored[0] || null, candidates: scored.slice(0, 8) }
}

function trimWords(text, maxWords) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  return words.length <= maxWords ? words.join(' ') : words.slice(0, maxWords).join(' ')
}

function plainSummary(item) {
  if (!item?.summary) return 'A new technology update is showing how artificial intelligence is moving from demos into real work people can use every day.'
  return trimWords(item.summary, 45)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function makeHeadline(title) {
  const clean = String(title || '').replace(/\s+-\s+[^-]+$/, '').trim()
  return trimWords(clean, 12)
}

function makeNewsHeadline(topic) {
  const text = topicText(topic)
  if (/muse spark|meta model api|meta ai/.test(text)) return 'AI JUST GOT A NEW DEVELOPER LANE'
  if (/climate|energy|electricity|emissions|water|data center|datacenter|carbon/.test(text)) return 'AI IS GROWING FAST. POWER IS THE NEXT PROBLEM'
  if (/openai|chatgpt|codex|gpt/.test(text)) return 'AI WORK TOOLS ARE MOVING FAST'
  if (/security|privacy|risk|trust|safety/.test(text)) return 'AI TRUST IS BECOMING THE REAL TEST'
  return makeHeadline(topic.title).toUpperCase()
}

function topicText(topic) {
  return `${topic?.title || ''} ${topic?.summary || ''} ${(topic?.topics || []).join(' ')}`.toLowerCase()
}

function categoryFromTopic(topic) {
  const text = topicText(topic)
  if (/climate|energy|electricity|emissions|water|data center|datacenter|carbon/.test(text)) return 'AI infrastructure'
  if (/security|privacy|risk|trust|safety|bug bounty/.test(text)) return 'trust and safety'
  if (/agent|workflow|automation|productivity|apps|work/.test(text)) return 'workflow automation'
  if (/model|gpt|gemini|llm|frontier|intelligence/.test(text)) return 'model capability'
  if (/developer|api|platform|cloud|open source/.test(text)) return 'developer platform'
  if (/robot|device|hardware/.test(text)) return 'applied AI'
  return 'AI operations'
}

function sourceFreshnessScore(topic) {
  const age = daysOld(topic)
  return clamp(100 - age * 18, 46, 100)
}

function workflowImpactScore(topic) {
  const text = topicText(topic)
  let score = 58
  if (/agent|workflow|automation|productivity|work/.test(text)) score += 22
  if (/enterprise|business|team|organization|company/.test(text)) score += 12
  if (/developer|api|platform|cloud|integration/.test(text)) score += 8
  if (/consumer|social|game|entertainment/.test(text)) score -= 6
  return clamp(score, 42, 96)
}

function operatorValueScore(topic) {
  const text = topicText(topic)
  let score = 55
  if (/action|tool|workflow|integration|automation|agent/.test(text)) score += 20
  if (/security|governance|review|source|proof|report/.test(text)) score += 10
  if (/research|paper|benchmark/.test(text)) score += 5
  return clamp(score, 40, 95)
}

function makeInsightPack(topic, related) {
  const category = categoryFromTopic(topic)
  const freshness = sourceFreshnessScore(topic)
  const impact = workflowImpactScore(topic)
  const operatorValue = operatorValueScore(topic)
  const relatedNames = related.map((item) => item.sourceName).filter(Boolean)
  return {
    category,
    hook: 'This matters because artificial intelligence tools are moving closer to real daily work.',
    visualCaption: 'The image should show a developer using the tool, not a confusing dashboard.',
    whyNow: 'This is fresh tech news, so the useful question is what it changes for builders and small teams.',
    operatorAngle: 'The simple takeaway is this: use the tool to help with real work, then check the result before trusting it.',
    discussionPrompt: 'Would you use this first for coding, planning, support, or daily admin work?',
    bars: [
      { label: 'Freshness', value: freshness },
      { label: 'Workflow impact', value: impact },
      { label: 'Operator value', value: operatorValue },
    ],
    contextLine: relatedNames.length
      ? `Related signals from ${[...new Set(relatedNames)].slice(0, 2).join(' and ')} help separate one-off hype from a broader pattern.`
      : 'The useful move is to separate one-off hype from a workflow pattern teams can repeat.',
  }
}

function visualTakeaway(topic) {
  const text = topicText(topic)
  if (/muse spark|meta model api|meta ai/.test(text)) {
    return 'Meta opened Muse Spark 1.1 to developers. The bigger story is AI agents moving closer to real coding and workflow tools.'
  }
  if (/climate|energy|electricity|emissions|water|data center|datacenter|carbon/.test(text)) {
    return 'AI is growing fast, but it needs power, cooling, and better planning.'
  }
  if (/developer|coding|code|api|agent|model/.test(text)) {
    return 'A developer can use it to code, plan, and finish longer tasks.'
  }
  if (/security|privacy|risk|trust|safety/.test(text)) {
    return 'New AI tools need simple checks before people trust the output.'
  }
  return 'The real value is turning the news into useful daily work.'
}

function simpleWhyItMatters(topic) {
  const text = topicText(topic)
  if (/muse spark|meta model api|meta ai/.test(text)) {
    return 'Developers now have another serious AI model to test for coding, computer use, and longer workflow tasks.'
  }
  if (/climate|energy|electricity|emissions|water|data center|datacenter|carbon/.test(text)) {
    return 'AI is not only software. It also needs real electricity, real buildings, and smart planning.'
  }
  if (/developer|coding|code|api|agent|model/.test(text)) {
    return 'Use it to help with real work, then check the result before trusting it.'
  }
  if (/security|privacy|risk|trust|safety/.test(text)) {
    return 'Move fast, but keep a human review step before trusting the result.'
  }
  return 'Ask what changes in real work, not just what launched.'
}

function makeInstagramCaption(topic, voice) {
  const hashtags = (voice.instagram?.hashtags || []).join(' ')
  return [
    `${makeNewsHeadline(topic)}`,
    '',
    'Meta released Muse Spark 1.1 and opened developer access through the Meta Model API.',
    '',
    'Why it matters: this is another sign that AI is moving from chatbots into tools that can code, use computers, and help with longer work.',
    '',
    'The real question is simple: would you trust an AI agent to help with your daily work yet?',
    '',
    hashtags,
  ].join('\n')
}

function makeLinkedInPost(topic, related, voice) {
  const sourceLine = `${topic.sourceName}: ${topic.url}`
  return [
    `${makeNewsHeadline(topic)}`,
    '',
    'Meta released Muse Spark 1.1 and opened access for developers through the Meta Model API.',
    '',
    'The important part is not just that another model launched. The important part is what it is built for: coding, computer use, tool use, multimodal understanding, and longer agent-style tasks.',
    '',
    'That tells me the AI race is moving deeper into real work. Less demo. More workflow. More building. More pressure to check the output before trusting it.',
    '',
    `Simple takeaway: ${simpleWhyItMatters(topic)}`,
    '',
    'For small teams, this means the next useful AI advantage may come from picking a clear task, testing the tool, keeping proof, and improving the workflow one step at a time.',
    '',
    `Source: ${sourceLine}`,
    '',
    'Would you use an AI agent first for coding, research, admin work, or customer support?',
  ]
    .filter((line) => line !== '')
    .join('\n\n')
}

function makeImagePrompt(topic, voice) {
  return [
    'Create a square 1080 x 1080 editorial technology news image.',
    `Headline: "${makeNewsHeadline(topic)}"`,
    'Style: bold social media tech-news graphic with illustrated public-tech-leader style portraits, a developer at a laptop, and AI interface elements.',
    `Colors: dark background ${voice.visual.background}, teal ${voice.visual.teal}, orange ${voice.visual.orange}, warm off-white ${voice.visual.cream}.`,
    'Show a serious tech-news mood, not a corporate promo. Put the big headline on the image and a short why-it-matters caption under it.',
    'Do not include logos from the source article. Do not mimic a news website screenshot.',
    'Do not include dates, source names, or Una Labs branding inside the image.',
    'Keep text minimal, bold, and easy to understand.',
  ].join('\n')
}

function escapeSvg(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrapSvgText(text, maxChars = 24) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > maxChars && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 5)
}

function makeSvgCard(topic, voice) {
  const v = voice.visual
  const lines = wrapSvgText(makeNewsHeadline(topic), 18)
  const lineNodes = lines
    .map((line, index) => `<text x="72" y="${680 + index * 72}" font-family="Arial Black, Impact, Arial, Helvetica, sans-serif" font-size="60" font-weight="900" fill="${index >= lines.length - 2 ? v.teal : v.cream}">${escapeSvg(line)}</text>`)
    .join('\n')
  const takeaway = wrapSvgText(visualTakeaway(topic), 34)
    .map((line, index) => `<text x="86" y="${888 + index * 34}" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" fill="${v.cream}" opacity="0.92">${escapeSvg(line)}</text>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-label="Technology news card">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#071014"/>
      <stop offset="50%" stop-color="${v.background}"/>
      <stop offset="100%" stop-color="#010506"/>
    </linearGradient>
    <linearGradient id="stage" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#15363f"/>
      <stop offset="100%" stop-color="#050b0e"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect x="42" y="42" width="996" height="996" rx="18" fill="#081519" stroke="${v.cream}" stroke-opacity="0.08" stroke-width="2"/>
  <rect x="80" y="78" width="920" height="520" rx="24" fill="url(#stage)" filter="url(#shadow)"/>
  <circle cx="250" cy="250" r="168" fill="#23363d"/>
  <circle cx="250" cy="196" r="82" fill="#e7c5ad"/>
  <path d="M166 198 C 178 96, 322 82, 338 200 C 308 146, 220 142, 166 198 Z" fill="#5f4032"/>
  <path d="M164 330 C 188 262, 315 260, 344 330 L 382 514 L 112 514 Z" fill="#1b4f5a"/>
  <text x="126" y="548" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${v.cream}" opacity="0.8">META</text>
  <circle cx="530" cy="285" r="130" fill="#18252b"/>
  <circle cx="530" cy="242" r="66" fill="#f0c7aa"/>
  <path d="M470 234 C 492 166, 574 160, 602 230 C 566 204, 514 204, 470 234 Z" fill="#2c1f1a"/>
  <rect x="430" y="326" width="200" height="138" rx="42" fill="${v.orange}" opacity="0.88"/>
  <text x="418" y="548" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${v.cream}" opacity="0.8">AI MODEL</text>
  <circle cx="790" cy="250" r="160" fill="#1c3037"/>
  <rect x="666" y="284" width="248" height="152" rx="16" fill="#050a0d" stroke="${v.teal}" stroke-width="5"/>
  <rect x="694" y="318" width="180" height="18" rx="6" fill="${v.teal}" opacity="0.9"/>
  <rect x="694" y="360" width="118" height="14" rx="5" fill="${v.cream}" opacity="0.55"/>
  <rect x="694" y="394" width="150" height="14" rx="5" fill="${v.orange}" opacity="0.76"/>
  <circle cx="790" cy="200" r="58" fill="#e9c1a5"/>
  <path d="M734 196 C 742 136, 834 132, 850 198 C 814 176, 770 176, 734 196 Z" fill="#33251f"/>
  <text x="666" y="548" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${v.cream}" opacity="0.8">DEVELOPERS</text>
  <text x="72" y="624" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="${v.orange}">AI NEWS</text>
  ${lineNodes}
  <rect x="72" y="832" width="936" height="154" rx="22" fill="#020608" opacity="0.82" stroke="${v.teal}" stroke-opacity="0.35"/>
  <text x="86" y="866" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="900" fill="${v.teal}">WHY IT MATTERS</text>
  ${takeaway}
  <rect x="72" y="1006" width="180" height="6" rx="3" fill="${v.orange}"/>
</svg>
`
}

async function exportSvgToPng(svgPath, pngPath, voice) {
  const { chromium } = await import('playwright')
  const width = Number(voice.visual?.width || 1080)
  const height = Number(voice.visual?.height || 1080)
  const svg = await fs.readFile(svgPath, 'utf8')
  const browser = await launchChromium(chromium)
  try {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    })
    await page.setContent(
      `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: ${voice.visual?.background || '#101820'}; }
      svg { display: block; width: ${width}px; height: ${height}px; }
    </style>
  </head>
  <body>${svg}</body>
</html>`,
      { waitUntil: 'load' },
    )
    await page.screenshot({ path: pngPath, type: 'png', fullPage: false })
  } finally {
    await browser.close()
  }
}

async function launchChromium(chromium) {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    if (!/Executable doesn't exist|playwright install/i.test(String(error?.message || error))) {
      throw error
    }
    return await chromium.launch({ channel: 'chrome', headless: true })
  }
}

function makeReviewChecklist(topic, sources) {
  return [
    '# Review Checklist',
    '',
    `Date: ${runDate}`,
    `Topic: ${topic.title}`,
    `Primary source: ${topic.url}`,
    '',
    '- [ ] Source link opens and matches the topic.',
    '- [ ] No copyrighted article screenshot is used.',
    '- [ ] Instagram caption is short, clear, and source-safe.',
    '- [ ] Instagram caption explains what the image is showing and why it matters.',
    '- [ ] LinkedIn post adds discussion, derived signal bars, and a practical insight.',
    '- [ ] Any graph values are framed as Una Labs signal scoring, not external facts.',
    '- [ ] Any claim that sounds factual is backed by one of the saved sources.',
    '- [ ] Final image is exported to a platform-friendly image format before posting.',
    '- [ ] Instagram post URL is recorded after posting.',
    '- [ ] LinkedIn post URL is recorded after posting.',
    '',
    'Sources:',
    ...sources.map((item, index) => `${index + 1}. ${item.sourceName} - ${item.title} - ${item.url}`),
    '',
  ].join('\n')
}

function makePostingBrief({ topic, sources, files, instagramCaption, linkedinPost }) {
  const rel = (filePath) => path.relative(root, filePath)
  const sourceList = sources.map((item, index) => `${index + 1}. ${item.sourceName} - ${item.title} - ${item.url}`).join('\n')
  return [
    `# Una Labs Posting Brief - ${runDate}`,
    '',
    'Status: ready for browser publish',
    'Auto-post: browser publish enabled',
    '',
    '## Topic',
    '',
    topic.title,
    '',
    `Primary source: ${topic.url}`,
    `Source name: ${topic.sourceName}`,
    '',
    '## Instagram',
    '',
    `Image upload: ${rel(files.png)}`,
    `Editable image source: ${rel(files.svg)}`,
    '',
    'Caption:',
    '',
    '```text',
    instagramCaption.trim(),
    '```',
    '',
    '## LinkedIn',
    '',
    'Post:',
    '',
    '```text',
    linkedinPost.trim(),
    '```',
    '',
    '## After Publishing',
    '',
    'Record the public post URLs:',
    '',
    '```powershell',
    'npm run post:record -- --instagram-url "https://..." --linkedin-url "https://..."',
    '```',
    '',
    '## Source Proof',
    '',
    sourceList,
    '',
  ].join('\n')
}

async function writeFileEnsured(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf8')
}

async function appendLedger(entry) {
  const ledgerPath = path.join(root, 'content', 'ledger', 'social-ledger.jsonl')
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true })
  await fs.appendFile(ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8')
}

function outputFilesForDate(date) {
  const draftDir = path.join(root, 'content', 'drafts', date)
  const assetDir = path.join(root, 'content', 'assets', date)
  return {
    topic: path.join(draftDir, 'topic.json'),
    sources: path.join(draftDir, 'sources.json'),
    instagram: path.join(draftDir, 'instagram-caption.md'),
    linkedin: path.join(draftDir, 'linkedin-post.md'),
    prompt: path.join(draftDir, 'image-prompt.md'),
    checklist: path.join(draftDir, 'review-checklist.md'),
    brief: path.join(draftDir, 'posting-brief.md'),
    svg: path.join(assetDir, 'instagram-card.svg'),
    png: path.join(assetDir, 'instagram-card.png'),
  }
}

function manualTopicFromArgs() {
  if (!manualTopicTitle || !manualTopicUrl || !manualTopicSource) return null
  return {
    sourceName: manualTopicSource,
    sourceTier: 'manual',
    feedUrl: '',
    title: manualTopicTitle,
    url: manualTopicUrl,
    summary:
      manualTopicSummary ||
      'A new technology story is moving through the market and deserves a practical operator read: what changed, why it matters, and what teams should do with it.',
    publishedAt: manualTopicPublishedAt || new Date().toISOString(),
    topics: ['ai', 'technology', 'news', 'workflow'],
    score: 999,
  }
}

async function readExistingPackage(files) {
  try {
    const topic = JSON.parse(await fs.readFile(files.topic, 'utf8'))
    const sources = JSON.parse(await fs.readFile(files.sources, 'utf8'))
    if (!topic?.selected?.title || !topic?.selected?.url) return null
    return { topic, sources: Array.isArray(sources) ? sources : [topic.selected] }
  } catch {
    return null
  }
}

async function writePackage({ files, selected, related, sources, voice, topicPayload, ledgerStatus }) {
  const instagramCaption = makeInstagramCaption(selected, voice)
  const linkedinPost = makeLinkedInPost(selected, related, voice)
  await writeFileEnsured(files.topic, `${JSON.stringify(topicPayload, null, 2)}\n`)
  await writeFileEnsured(files.sources, `${JSON.stringify(sources, null, 2)}\n`)
  await writeFileEnsured(files.instagram, `${instagramCaption}\n`)
  await writeFileEnsured(files.linkedin, `${linkedinPost}\n`)
  await writeFileEnsured(files.prompt, `${makeImagePrompt(selected, voice)}\n`)
  await writeFileEnsured(files.checklist, makeReviewChecklist(selected, sources))
  await writeFileEnsured(files.svg, makeSvgCard(selected, voice))
  await exportSvgToPng(files.svg, files.png, voice)
  await writeFileEnsured(
    files.brief,
    makePostingBrief({ topic: selected, sources, files, instagramCaption, linkedinPost }),
  )
  await appendLedger({
    id: `una-social-${runDate}-${Date.now()}`,
    runDate,
    status: ledgerStatus,
    reviewStatus: 'ready_for_browser_publish',
    channels: ['instagram', 'linkedin'],
    topic: {
      title: selected.title,
      url: selected.url,
      sourceName: selected.sourceName,
      publishedAt: selected.publishedAt,
    },
    sourceCount: sources.length,
    outputPaths: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, path.relative(root, value)])),
    autoPost: true,
    createdAt: new Date().toISOString(),
  })
}

async function main() {
  const config = await readJson('config/sources.json')
  const voice = await readJson('config/voice.json')
  const files = outputFilesForDate(runDate)
  const manualTopic = manualTopicFromArgs()

  if (manualTopic) {
    const related = []
    const sources = [manualTopic]
    const topicPayload = {
      runDate,
      selected: manualTopic,
      candidateCount: 1,
      feedErrors: [],
      policy: {
        status: 'drafted',
        postingMode: 'browser_publish',
        autoPost: true,
        selectionMode: 'manual_news_override',
      },
    }

    if (!dryRun) {
      await writePackage({
        files,
        selected: manualTopic,
        related,
        sources,
        voice,
        topicPayload,
        ledgerStatus: 'drafted_manual',
      })
    }

    console.log(
      JSON.stringify(
        {
          status: dryRun ? 'dry_run_manual_ok' : 'drafted_manual',
          runDate,
          topic: manualTopic.title,
          source: manualTopic.sourceName,
          url: manualTopic.url,
          files: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, path.relative(root, value)])),
        },
        null,
        2,
      ),
    )
    return
  }

  const existing = await readExistingPackage(files)

  if (existing && !forceNew) {
    const selected = existing.topic.selected
    const sources = existing.sources.length ? existing.sources : [selected]
    const related = sources.filter((item) => item.url !== selected.url).slice(0, 2)
    const topicPayload = {
      ...existing.topic,
      policy: {
        status: 'drafted',
        postingMode: 'browser_publish',
        autoPost: true,
      },
      refreshedAt: new Date().toISOString(),
    }

    if (!dryRun) {
      await writePackage({
        files,
        selected,
        related,
        sources,
        voice,
        topicPayload,
        ledgerStatus: 'refreshed',
      })
    }

    console.log(
      JSON.stringify(
        {
          status: dryRun ? 'dry_run_existing_ok' : 'refreshed_existing',
          runDate,
          topic: selected.title,
          source: selected.sourceName,
          url: selected.url,
          files: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, path.relative(root, value)])),
          note: 'Existing same-day topic reused. Pass --force-new to select a new topic.',
        },
        null,
        2,
      ),
    )
    return
  }

  const { results, errors } = await fetchCandidates(config)
  const usedUrls = await readUsedUrls()
  const { selected, candidates } = pickTopic(results, config, usedUrls)

  if (!selected) {
    const entry = {
      id: `una-social-${runDate}-${Date.now()}`,
      runDate,
      status: 'blocked',
      reason: 'No usable source-backed AI/tech news candidates were found.',
      errors,
      createdAt: new Date().toISOString(),
    }
    if (!dryRun) await appendLedger(entry)
    console.log(JSON.stringify(entry, null, 2))
    process.exitCode = 2
    return
  }

  const related = candidates.filter((item) => item.url !== selected.url).slice(0, 2)
  const sources = [selected, ...related]

  const topicPayload = {
    runDate,
    selected,
    candidateCount: results.length,
    feedErrors: errors,
    policy: {
      status: 'drafted',
      postingMode: 'browser_publish',
      autoPost: true,
    },
  }

  if (!dryRun) {
    await writePackage({
      files,
      selected,
      related,
      sources,
      voice,
      topicPayload,
      ledgerStatus: 'drafted',
    })
  }

  console.log(
    JSON.stringify(
      {
        status: dryRun ? 'dry_run_ok' : 'drafted',
        runDate,
        topic: selected.title,
        source: selected.sourceName,
        url: selected.url,
        score: selected.score,
        files: Object.fromEntries(Object.entries(files).map(([key, value]) => [key, path.relative(root, value)])),
        feedErrors: errors,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
