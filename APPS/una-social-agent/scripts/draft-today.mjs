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
  const text = topicText(item)
  if (/deutsche telekom|telecommunications|telco|customer service|network operations|future of voice/.test(text)) {
    return 'Deutsche Telekom says it is using OpenAI across customer service, employee workflows, network operations, and voice experiences.'
  }
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
  if (/deutsche telekom|telecommunications|telco|network operations|future of voice/.test(text)) return 'AI IS MOVING INTO PHONE NETWORKS'
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
  if (/deutsche telekom|telecommunications|telco|network operations|future of voice/.test(text)) {
    return 'AI is moving into support, employee tools, network operations, and voice experiences.'
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

function visualSummary(topic) {
  const text = topicText(topic)
  if (/deutsche telekom|telecommunications|telco|network operations|future of voice/.test(text)) {
    return 'Deutsche Telekom says it is using OpenAI for customer service, network operations, and voice.'
  }
  if (/muse spark|meta model api|meta ai/.test(text)) {
    return 'Meta opened Muse Spark 1.1 to developers through the Meta Model API.'
  }
  return trimWords(plainSummary(topic), 22)
}

function visualHeroText(topic) {
  const text = topicText(topic)
  if (/deutsche telekom|telecommunications|telco|network operations|future of voice/.test(text)) return ['AI', 'PHONE', 'NETWORKS']
  if (/muse spark|meta model api|meta ai/.test(text)) return ['AI', 'DEVELOPER', 'TOOLS']
  return ['AI', 'NEWS']
}

function simpleWhyItMatters(topic) {
  const text = topicText(topic)
  if (/muse spark|meta model api|meta ai/.test(text)) {
    return 'Developers now have another serious AI model to test for coding, computer use, and longer workflow tasks.'
  }
  if (/deutsche telekom|telecommunications|telco|network operations|future of voice/.test(text)) {
    return 'Telecom work touches millions of customers, so AI needs clear testing, review, and proof before people trust it.'
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
    plainSummary(topic),
    '',
    `Why it matters: ${simpleWhyItMatters(topic)}`,
    '',
    'The real question is simple: where does this make real work easier, and where do people still need to check the output?',
    '',
    hashtags,
  ].join('\n')
}

function makeLinkedInPost(topic, related, voice) {
  const sourceLine = `${topic.sourceName}: ${topic.url}`
  return [
    `${makeNewsHeadline(topic)}`,
    '',
    plainSummary(topic),
    '',
    'The important part is not just the launch. The important part is what this changes for real teams: support, planning, operations, research, coding, or daily admin work.',
    '',
    'That tells me the AI race is moving deeper into real work. Less demo. More workflow. More pressure to check the output before trusting it.',
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
    'Style reference: orange editorial news carousel card with a stacked white paper panel, one strong top visual area, large readable body text, and carousel dots.',
    'Do not generate a realistic person or fake screenshot. Use an approved image when available, otherwise use a clean non-realistic visual block.',
    'Do not include logos from the source article. Do not mimic a news website screenshot.',
    'Keep it simple, human-readable, modern, and professional.',
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

function wrapSvgParagraph(text, maxChars = 42, maxLines = 6) {
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
  return lines.slice(0, maxLines)
}

function makeSvgCard(topic, voice) {
  const heroText = visualHeroText(topic)
  const summary = visualSummary(topic)
  const why = simpleWhyItMatters(topic)
  const summaryLines = wrapSvgParagraph(summary, 38, 3)
    .map((line, index) => `<text x="196" y="${666 + index * 46}" font-family="Arial, Helvetica, sans-serif" font-size="33" font-weight="800" fill="#9A4A08">${escapeSvg(line)}</text>`)
    .join('\n')
  const whyLines = wrapSvgParagraph(why, 43, 5)
    .map((line, index) => `<text x="196" y="${832 + index * 43}" font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="700" fill="#141414">${escapeSvg(line)}</text>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-label="Technology news card">
  <defs>
    <linearGradient id="orangeBg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#FF9C26"/>
      <stop offset="52%" stop-color="#FF7B09"/>
      <stop offset="100%" stop-color="#F26000"/>
    </linearGradient>
    <linearGradient id="visual" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#12253D"/>
      <stop offset="48%" stop-color="#1D6E87"/>
      <stop offset="100%" stop-color="#0E1117"/>
    </linearGradient>
    <filter id="paperShadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#4F2400" flood-opacity="0.38"/>
    </filter>
    <filter id="labelShadow" x="-20%" y="-20%" width="150%" height="150%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#4F2400" flood-opacity="0.30"/>
    </filter>
  </defs>
  <rect width="1080" height="1080" fill="url(#orangeBg)"/>
  <g transform="rotate(-2 540 540)">
    <rect x="176" y="110" width="744" height="854" rx="28" fill="#F4F1EA" opacity="0.55" filter="url(#paperShadow)"/>
  </g>
  <g filter="url(#paperShadow)">
    <rect x="142" y="92" width="792" height="884" rx="34" fill="#FFFFFF"/>
    <rect x="170" y="126" width="736" height="358" rx="24" fill="url(#visual)"/>
    <path d="M206 365 C 306 252, 395 410, 515 300 S 717 218, 870 330" fill="none" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round" opacity="0.28"/>
    <path d="M214 410 C 342 412, 414 252, 542 338 S 740 452, 872 372" fill="none" stroke="#FF8B1A" stroke-width="14" stroke-linecap="round" opacity="0.82"/>
    <circle cx="276" cy="244" r="58" fill="#FFFFFF" opacity="0.18"/>
    <circle cx="796" cy="206" r="84" fill="#FFFFFF" opacity="0.12"/>
    <rect x="284" y="208" width="232" height="168" rx="22" fill="#071014" opacity="0.86"/>
    <rect x="314" y="244" width="150" height="16" rx="7" fill="#FF8B1A"/>
    <rect x="314" y="286" width="172" height="14" rx="7" fill="#FFFFFF" opacity="0.65"/>
    <rect x="314" y="326" width="118" height="14" rx="7" fill="#FFFFFF" opacity="0.38"/>
    <text x="548" y="258" font-family="Arial Black, Impact, Arial, Helvetica, sans-serif" font-size="76" font-weight="900" fill="#FFFFFF" opacity="0.94">${escapeSvg(heroText[0] || 'AI')}</text>
    <text x="548" y="328" font-family="Arial Black, Impact, Arial, Helvetica, sans-serif" font-size="54" font-weight="900" fill="#FFFFFF" opacity="0.88">${escapeSvg(heroText[1] || 'NEWS')}</text>
    <text x="548" y="384" font-family="Arial Black, Impact, Arial, Helvetica, sans-serif" font-size="48" font-weight="900" fill="#FFFFFF" opacity="0.76">${escapeSvg(heroText[2] || '')}</text>
    <rect x="166" y="514" width="744" height="2" fill="#EAE2D7"/>
    ${summaryLines}
    <text x="196" y="794" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="800" fill="#111111">Why this matters:</text>
    ${whyLines}
  </g>
  <g transform="rotate(-5 280 112)" filter="url(#labelShadow)">
    <rect x="162" y="78" width="260" height="72" rx="14" fill="#FFFFFF"/>
    <circle cx="196" cy="114" r="17" fill="#FF8B1A"/>
    <circle cx="196" cy="114" r="9" fill="#111111"/>
    <text x="226" y="124" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="900" fill="#111111" letter-spacing="3">AI NEWS</text>
  </g>
  <rect x="354" y="1010" width="86" height="11" rx="6" fill="#9C5B26" opacity="0.7"/>
  <rect x="462" y="1010" width="86" height="11" rx="6" fill="#C87B2F" opacity="0.55"/>
  <circle cx="568" cy="1015" r="7" fill="#FFFFFF" opacity="0.92"/>
  <circle cx="588" cy="1015" r="7" fill="#FFFFFF" opacity="0.62"/>
  <circle cx="608" cy="1015" r="7" fill="#FFFFFF" opacity="0.62"/>
  <rect x="632" y="1010" width="86" height="11" rx="6" fill="#C87B2F" opacity="0.55"/>
  <rect x="740" y="1010" width="86" height="11" rx="6" fill="#9C5B26" opacity="0.50"/>
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
    'Status: draft for review',
    'Auto-post: disabled until visual style is approved',
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
    autoPost: false,
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
        postingMode: 'review_before_publish',
        autoPost: false,
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
        postingMode: 'review_before_publish',
        autoPost: false,
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
      postingMode: 'review_before_publish',
      autoPost: false,
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
