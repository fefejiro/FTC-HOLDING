import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPublishedStoryIdentities, normalizePublishedUrl } from '../src/publication-history.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const runDate = readArg('--date') || todayInTimeZone()
const maxSourceAgeDays = Number(readArg('--max-source-age-days') || 3)
const feedFetchTimeoutMs = Number(readArg('--feed-timeout-ms') || process.env.UNA_FEED_TIMEOUT_MS || 12000)
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

function decodeXml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeText(value) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
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

async function fetchText(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), feedFetchTimeoutMs)
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'UnaLabsSocialAgent/0.1 (+https://unalabs.cloud)',
      Accept: 'application/rss+xml, application/xml, text/xml, text/html, */*',
    },
  }).finally(() => clearTimeout(timeout))
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.text()
}

function parseFeed(xml, source) {
  const blocks = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((m) => m[0])
  if (!blocks.length) blocks.push(...[...xml.matchAll(/<entry[\s\S]*?<\/entry>/gi)].map((m) => m[0]))
  return blocks
    .map((block) => {
      const publishedRaw = between(block, 'pubDate') || between(block, 'published') || between(block, 'updated')
      const publishedAt = parseDate(publishedRaw)
      return {
        sourceName: source.name,
        sourceTier: source.tier,
        region: source.region || '',
        title: between(block, 'title'),
        url: linkFromEntry(block) || between(block, 'guid'),
        summary: between(block, 'description') || between(block, 'summary') || between(block, 'content'),
        publishedAt: publishedAt ? publishedAt.toISOString() : '',
        topics: source.topics || [],
      }
    })
    .filter((item) => item.title && /^https?:\/\//i.test(item.url))
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'))
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf8')
}

async function walkFiles(dirPath, fileName) {
  const matches = []
  let entries = []
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true })
  } catch {
    return matches
  }
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      matches.push(...await walkFiles(fullPath, fileName))
    } else if (entry.isFile() && (entry.name === fileName || entry.name.startsWith('visible-social-post-report-'))) {
      matches.push(fullPath)
    }
  }
  return matches
}

async function usedPublishedUrls() {
  if (allowPublishedReuse) return new Set()
  const used = new Set()
  for (const identity of await loadPublishedStoryIdentities(root)) {
    if (identity.startsWith('url:')) used.add(identity.slice(4))
  }
  const ledgerPath = path.join(root, 'content', 'ledger', 'social-ledger.jsonl')
  try {
    const lines = (await fs.readFile(ledgerPath, 'utf8')).split(/\r?\n/).filter(Boolean)
    for (const line of lines) {
      let entry
      try {
        entry = JSON.parse(line)
      } catch {
        continue
      }
      if (entry?.dryRun) continue
      const posted = Object.values(entry.results || {}).some((result) => String(result?.status || '').startsWith('posted'))
      if (!posted) continue
      if (entry?.topic?.url) used.add(normalizePublishedUrl(entry.topic.url))
      for (const source of entry?.sources || []) {
        if (source?.url) used.add(normalizePublishedUrl(source.url))
      }
    }
  } catch {
    // The ledger is optional during local drafting and may be ignored.
  }
  const proofDir = path.join(root, 'content', 'proof', runDate)
  for (const filePath of await walkFiles(proofDir, 'visible-social-post-report.json')) {
    const report = await readJsonIfExists(filePath)
    if (!report || report.dryRun) continue
    const posted = Object.values(report.results || {}).some((result) => String(result?.status || '').startsWith('posted'))
    if (!posted) continue
    if (report?.topic?.url) used.add(normalizePublishedUrl(report.topic.url))
    for (const source of report?.sources || []) {
      if (source?.url) used.add(normalizePublishedUrl(source.url))
    }
  }
  return used
}

function trimWords(text, maxWords) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean)
  return words.length <= maxWords ? words.join(' ') : `${words.slice(0, maxWords).join(' ')}...`
}

function plainTitle(title) {
  return normalizeText(title)
    .replace(/\s+-\s+[^-]+$/, '')
    .replace(/^[^\w"]+/, '')
    .replace(/[.!?]+$/g, '')
    .trim()
}

function daysOld(item, now = new Date(`${runDate}T12:00:00-04:00`)) {
  if (!item?.publishedAt) return Infinity
  const published = new Date(item.publishedAt)
  if (Number.isNaN(published.getTime())) return Infinity
  return Math.max(0, Math.floor((now.getTime() - published.getTime()) / 86400000))
}

function isUsableStory(item, usedUrls = new Set()) {
  const text = `${item?.title || ''} ${item?.summary || ''}`.toLowerCase()
  if (!item?.title || !item?.url || daysOld(item) > maxSourceAgeDays) return false
  if (usedUrls.has(normalizePublishedUrl(item.url))) return false
  if (/\/brandpress\//i.test(item.url || '')) return false
  return !/(celebrity|gossip|career advice|how to transition|stock price|crypto price|\[d\]|request for expressions? of interest|capacity development|procurement|tender|call for applications|sponsored|advertorial|press release|world cup|football prediction|sports prediction|goldfish|hiring bias|biases when hiring|resume before a human sees it|e-visa|visa fee|labour mobility|song made with|suno|music opinion|entertainment|video game|gaming industry|sassa|payment dates?|grant amounts?|social grant|srd grant|pension grant|disability grant)/i.test(text)
}

function scoreStory(item, preferred = []) {
  const text = `${item.title} ${item.summary} ${(item.topics || []).join(' ')}`.toLowerCase()
  let score = item.sourceTier === 'primary' ? 25 : item.sourceTier === 'regional' ? 22 : item.sourceTier === 'secondary' ? 16 : -10
  score += Math.max(0, maxSourceAgeDays - daysOld(item)) * 8
  for (const word of preferred) if (text.includes(word)) score += 10
  if (/reddit|hacker news/i.test(item.sourceName || '')) score -= 25
  return score
}

function pickStory(items, preferredSources, preferredWords, usedUrls) {
  return items
    .filter((item) => isUsableStory(item, usedUrls))
    .filter((item) => preferredSources.includes(item.sourceName))
    .sort((a, b) => scoreStory(b, preferredWords) - scoreStory(a, preferredWords))[0]
}

function selectRegionalStories(items, usedUrls) {
  const northAmerica = pickStory(items, ['Microsoft Research', 'Google AI', 'OpenAI News', 'TechCrunch AI', 'MIT Technology Review AI', 'Axios Technology'], [
    'ai',
    'agent',
    'weather',
    'model',
    'developer',
    'research',
  ], usedUrls)
  const africa = pickStory(items, ['TechCabal', 'Techpoint Africa', 'Tech In Africa'], ['africa', 'payment', 'fintech', 'startup', 'web3', 'technology'], usedUrls)
  const world = pickStory(items, ['Rest of World', 'The Register AI', 'MIT Technology Review AI', 'The Verge AI'], ['policy', 'platform', 'ai', 'global', 'security'], usedUrls)

  return [
    {
      region: 'North America',
      label: 'AI systems',
      accent: '#0d5c83',
      story: northAmerica,
      takeaway: 'AI is moving from announcements into real systems, public tools, and everyday operations.',
    },
    {
      region: 'Africa',
      label: 'Africa tech',
      accent: '#0f7a49',
      story: africa,
      takeaway: 'Africa technology stories deserve the same attention as Silicon Valley stories because adoption is local and practical.',
    },
    {
      region: 'Rest of World',
      label: 'Platform rules',
      accent: '#b84c00',
      story: world,
      takeaway: 'Policy and platform decisions can shape how millions of people use technology every day.',
    },
  ].filter((entry) => entry.story)
}

function instagramCaption(entries) {
  return [
    'Today in tech, from three places that matter.',
    '',
    `North America: ${plainTitle(entries[0].story.title)}`,
    `Africa: ${plainTitle(entries[1].story.title)}`,
    `Rest of world: ${plainTitle(entries[2].story.title)}`,
    '',
    'My takeaway: do not only watch the loudest company in the room. Watch where the tools are becoming useful, where money is moving, and where policy is shaping what people can actually do.',
    '',
    `Sources: ${entries.map((entry) => entry.story.sourceName).join(', ')}`,
    '',
    '#TechNews #ArtificialIntelligence #AfricaTech #DigitalTransformation #Workflow',
  ].join('\n')
}

function linkedinPost(entries) {
  return [
    "A useful tech update today: the signal is not coming from only one place.",
    '',
    `In North America, ${plainTitle(entries[0].story.title)}. I watch this because AI is moving from demos into budgets, operating models, and accountability.`,
    '',
    `In Africa, ${plainTitle(entries[1].story.title)}. I like seeing this included because adoption does not only happen in Silicon Valley. It happens where people solve daily work problems with the tools they have.`,
    '',
    `For the rest of the world, ${plainTitle(entries[2].story.title)}. This is a reminder that the AI race is not only a U.S. story. Model access, open-source releases, regulation, and local adoption can shift quickly.`,
    '',
    'The simple pattern: useful technology is becoming less about hype and more about where it fits into actual work.',
    '',
    'For small teams and operators, that is the part to watch. Who is using it? What problem is it solving? What proof do we have? What needs to be checked before people depend on it?',
    '',
    'My takeaway: watch the regions, not only the brands. The next useful idea may come from a research lab, an African startup, or a field team trying to solve a real problem under pressure.',
    '',
    `Sources: ${entries.map((entry) => entry.story.sourceName).join(', ')}`,
    '',
    'Which story would you pay the most attention to today, and what would you want to verify before trusting it?',
  ].join('\n')
}

async function renderHtmlToPng(html, outPath, viewport = { width: 1080, height: 1350 }) {
  const { chromium } = await import('playwright')
  let browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (error) {
    if (!/Executable doesn't exist|playwright install/i.test(String(error?.message || error))) throw error
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  }
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'load' })
    await page.screenshot({ path: outPath, type: 'png', fullPage: false })
  } finally {
    await browser?.close()
  }
}

function slideHtml(entry, index) {
  const title = plainTitle(entry.story.title).toUpperCase()
  const summary = trimWords(entry.story.summary || entry.takeaway, 28)
  const scenes = [
    '<div class="person p1"></div><div class="person p2 small"></div><div class="screen"></div>',
    '<div class="phone"></div><div class="person p1"></div><div class="person p3 small"></div>',
    '<div class="person p2"></div><div class="screen wide"></div><div class="phone small-phone"></div>',
  ]
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; overflow: hidden; font-family: Arial, Helvetica, sans-serif; background: #f47f13; }
      .wrap { width: 1080px; height: 1350px; padding: 50px 62px; display: flex; align-items: center; justify-content: center; }
      .card { width: 912px; min-height: 1212px; background: #fff8ea; border-radius: 34px; border: 10px solid rgba(255,255,255,.72); box-shadow: 0 24px 58px rgba(35,21,8,.26); padding: 32px; position: relative; }
      .visual { height: 390px; border-radius: 24px; overflow: hidden; background: linear-gradient(135deg, ${entry.accent}, #111 72%); border: 8px solid #fff; position: relative; }
      .orb { position: absolute; width: 340px; height: 340px; border-radius: 50%; right: -80px; top: -80px; background: rgba(255,255,255,.13); }
      .city { position:absolute; inset:auto 0 0; height:112px; background:linear-gradient(90deg, rgba(255,255,255,.18), rgba(255,255,255,.05)); }
      .person { position:absolute; left:104px; bottom:52px; width:122px; height:170px; border-radius:60px 60px 28px 28px; background:#16464c; box-shadow:0 12px 26px rgba(0,0,0,.24); }
      .person:before { content:""; position:absolute; left:30px; top:-58px; width:68px; height:68px; border-radius:999px; background:#8b4b2a; }
      .person:after { content:""; position:absolute; left:17px; top:-65px; width:88px; height:34px; border-radius:999px 999px 20px 20px; background:#171717; }
      .person.small { transform:scale(.72); left:250px; bottom:35px; opacity:.92; }
      .p2 { left:155px; background:#0e5b62; }
      .p3 { left:308px; background:#f05a28; }
      .screen { position:absolute; right:86px; bottom:82px; width:244px; height:142px; border:5px solid #fff8ea; border-radius:18px; background:rgba(0,0,0,.45); }
      .screen:before,.screen:after { content:""; position:absolute; left:28px; right:28px; height:12px; border-radius:999px; background:#fff8ea; opacity:.82; }
      .screen:before { top:38px; } .screen:after { top:78px; width:120px; background:#f05a28; opacity:1; }
      .screen.wide { right:58px; width:320px; }
      .phone { position:absolute; right:128px; bottom:58px; width:112px; height:202px; border:8px solid #fff8ea; border-radius:28px; background:rgba(0,0,0,.42); }
      .small-phone { right:70px; bottom:58px; transform:scale(.72); }
      .region { position: absolute; left: 40px; top: 36px; background: #fff; color: #111; border-radius: 10px; padding: 14px 22px; font-size: 31px; font-weight: 950; letter-spacing: 1px; }
      .body { padding: 46px 36px 90px; }
      .eyebrow { color: ${entry.accent}; font-size: 28px; font-weight: 950; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
      h1 { color: #151515; font-size: 54px; line-height: 1.02; letter-spacing: 0; margin: 0 0 26px; font-weight: 950; }
      .summary { color: #1f1f1f; font-size: 31px; line-height: 1.2; font-weight: 760; margin: 0 0 28px; }
      .takeaway { color: #292929; font-size: 28px; line-height: 1.25; font-weight: 640; margin: 0; }
      .source { position: absolute; left: 72px; bottom: 38px; color: #7b3f07; font-size: 23px; font-weight: 850; }
      .cue { position: absolute; right: 72px; bottom: 38px; color: #7b3f07; font-size: 23px; font-weight: 850; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        <div class="visual">
          <div class="orb"></div>
          <div class="city"></div>
          <div class="region">${escapeHtml(entry.region)}</div>
          ${scenes[index] || scenes[0]}
        </div>
        <div class="body">
          <div class="eyebrow">${escapeHtml(entry.label)}</div>
          <h1>${escapeHtml(title)}</h1>
          <p class="summary">${escapeHtml(summary)}</p>
          <p class="takeaway">${escapeHtml(entry.takeaway)}</p>
        </div>
        <div class="source">Source: ${escapeHtml(entry.story.sourceName)}</div>
        <div class="cue">${index + 1} / 3</div>
      </section>
    </main>
  </body>
</html>`
}

async function imageDataUrl(filePath) {
  const buffer = await fs.readFile(filePath)
  return `data:image/png;base64,${buffer.toString('base64')}`
}

function contactSheetHtml(slides) {
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    *{box-sizing:border-box} html,body{margin:0;width:1440px;height:680px;overflow:hidden;background:#1f1f1f}
    .sheet{width:100%;height:100%;padding:36px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
    .item{background:#111;border-radius:12px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.35)}
    img{width:100%;height:100%;object-fit:cover;display:block}
  </style></head><body><main class="sheet">${slides.map((src) => `<div class="item"><img src="${src}" alt=""/></div>`).join('')}</main></body></html>`
}

const config = await readJson('config/sources.json')
const wanted = new Set([
  'OpenAI News',
  'Microsoft Research',
  'Google AI',
  'TechCrunch AI',
  'MIT Technology Review AI',
  'The Verge AI',
  'Axios Technology',
  'TechCabal',
  'Techpoint Africa',
  'Tech In Africa',
  'Rest of World',
  'The Register AI',
])
const errors = []
const items = []
const feedResults = await Promise.all(
  config.feeds
    .filter((item) => wanted.has(item.name))
    .map(async (feed) => {
      try {
        return { feed, items: parseFeed(await fetchText(feed.url), feed), error: null }
      } catch (error) {
        const reason = error?.name === 'AbortError' ? `fetch timed out after ${feedFetchTimeoutMs}ms` : String(error.message || error)
        return { feed, items: [], error: reason }
      }
    }),
)

for (const result of feedResults) {
  if (result.error) {
    errors.push({ sourceName: result.feed.name, url: result.feed.url, error: result.error })
  } else {
    items.push(...result.items)
  }
}

const usedUrls = await usedPublishedUrls()
const entries = selectRegionalStories(items, usedUrls)
if (entries.length !== 3) {
  throw new Error(`Expected 3 fresh regional stories, found ${entries.length}. Previously published URLs excluded: ${usedUrls.size}. Errors: ${JSON.stringify(errors)}`)
}

const draftDir = path.join(root, 'content', 'drafts', runDate)

const instagram = instagramCaption(entries)
const linkedin = linkedinPost(entries)
const sources = entries.map((entry) => entry.story)
const payload = { runDate, type: 'regional_brief', status: 'sample_ready', entries, errors, createdAt: new Date().toISOString() }
await writeFile(path.join(draftDir, 'regional-brief.json'), `${JSON.stringify(payload, null, 2)}\n`)
await writeFile(path.join(draftDir, 'regional-instagram-caption.md'), `${instagram}\n`)
await writeFile(path.join(draftDir, 'regional-linkedin-post.md'), `${linkedin}\n`)
await writeFile(path.join(draftDir, 'instagram-caption.md'), `${instagram}\n`)
await writeFile(path.join(draftDir, 'linkedin-post.md'), `${linkedin}\n`)
await writeFile(path.join(draftDir, 'sources.json'), `${JSON.stringify(sources, null, 2)}\n`)
await writeFile(
  path.join(draftDir, 'topic.json'),
  `${JSON.stringify(
    {
      runDate,
      selected: {
        title: 'Today in tech: three regions to watch',
        sourceName: sources.map((source) => source.sourceName).join(', '),
        url: sources[0].url,
        publishedAt: sources.map((source) => source.publishedAt).sort().at(-1) || new Date().toISOString(),
        summary: 'A source-backed regional brief covering North America, Africa, and the rest of the world.',
        topics: ['tech news', 'ai', 'africa tech', 'platform policy'],
      },
      candidates: sources,
      feedErrors: errors,
      policy: {
        status: 'drafted',
        postingMode: 'auto_publish_after_quality_gate',
        autoPost: true,
        maxSourceAgeDays,
      },
    },
    null,
    2,
  )}\n`,
)

console.log(
  JSON.stringify(
    {
      status: 'sample_ready',
      runDate,
      stories: entries.map((entry) => ({
        region: entry.region,
        sourceName: entry.story.sourceName,
        title: entry.story.title,
        url: entry.story.url,
        publishedAt: entry.story.publishedAt,
        sourceAgeDays: daysOld(entry.story),
      })),
      files: {
        brief: path.relative(root, path.join(draftDir, 'regional-brief.json')),
        instagram: path.relative(root, path.join(draftDir, 'instagram-caption.md')),
        linkedin: path.relative(root, path.join(draftDir, 'linkedin-post.md')),
      },
      errors,
      excludedPublishedUrlCount: usedUrls.size,
    },
    null,
    2,
  ),
)
