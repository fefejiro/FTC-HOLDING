import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const runDate = readArg('--date') || todayInTimeZone()
const heroArg = readArg('--hero')

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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'))
}

async function imageDataUrl(filePath) {
  const buffer = await fs.readFile(filePath)
  return `data:image/png;base64,${buffer.toString('base64')}`
}

async function firstExisting(paths) {
  for (const filePath of paths) {
    try {
      await fs.access(filePath)
      return filePath
    } catch {
      // Try the next fallback.
    }
  }
  throw new Error(`No usable hero image found. Tried: ${paths.join(', ')}`)
}

function trimWords(text, maxWords) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  return words.length <= maxWords ? words.join(' ') : `${words.slice(0, maxWords).join(' ')}...`
}

function topicText(topic) {
  return `${topic?.title || ''} ${topic?.summary || ''} ${(topic?.topics || []).join(' ')}`.toLowerCase()
}

function headlineFor(topic) {
  const text = topicText(topic)
  if (/deutsche telekom|telecommunications|telco|network operations|future of voice/.test(text)) return 'AI is moving into phone networks'
  if (/developer|coding|code|api|agent|model/.test(text)) return 'AI work tools are moving fast'
  if (/security|privacy|risk|trust|safety/.test(text)) return 'AI trust is becoming the real test'
  return trimWords(topic?.title || 'AI news worth watching', 9)
}

function plainSummary(topic) {
  const text = topicText(topic)
  if (/deutsche telekom|telecommunications|telco|network operations|future of voice/.test(text)) {
    return 'Deutsche Telekom is testing OpenAI in customer support, employee tools, phone networks, and voice services.'
  }
  return trimWords(topic?.summary || 'A fresh AI story is moving from headlines into real work.', 24)
}

function whyLine(topic) {
  const text = topicText(topic)
  if (/deutsche telekom|telecommunications|telco|network operations|future of voice/.test(text)) {
    return 'Phone networks affect millions of people. AI can help, but teams still need testing, review, and proof.'
  }
  if (/developer|coding|code|api|agent|model|desktop workflow|work-focused|files|research/.test(text)) {
    return 'Work agents are useful when they can handle real files, real tasks, and real follow-through, not just chat.'
  }
  return 'The useful question is what changes in real work, not just what launched.'
}

function sourceBackedStats(topic) {
  const text = topicText(topic)
  if (/deutsche telekom|telecommunications|telco|network operations|future of voice/.test(text)) {
    return []
  }
  return []
}

async function renderHtmlToPng(html, outPath, viewport = { width: 1200, height: 627 }) {
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

function html({ topic, heroData, stats }) {
  const headline = headlineFor(topic)
  const summary = plainSummary(topic)
  const why = whyLine(topic)
  const sourceName = topic?.sourceName || 'Primary source'
  const hasStats = stats.length > 0
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; overflow: hidden; font-family: Arial, Helvetica, sans-serif; background: #f6f1e7; }
      .canvas { width: 1200px; height: 627px; padding: 36px; background: #f47f13; }
      .card {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: 520px 1fr;
        gap: 34px;
        background: #fff8ea;
        border: 8px solid rgba(255,255,255,.8);
        border-radius: 30px;
        box-shadow: 0 22px 52px rgba(55, 25, 4, .24);
        padding: 26px;
      }
      .photo { position: relative; height: 100%; border-radius: 20px; overflow: hidden; border: 8px solid #fff; background: #111; }
      .photo img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 31%; display: block; }
      .tag {
        position: absolute;
        left: 18px;
        top: 18px;
        background: #fff;
        color: #111;
        border-radius: 9px;
        padding: 11px 18px;
        font-size: 22px;
        font-weight: 900;
        letter-spacing: 1px;
        box-shadow: 0 5px 12px rgba(0,0,0,.16);
      }
      .content { padding: 8px 8px 0 0; display: flex; flex-direction: column; min-width: 0; }
      .eyebrow { color: #b84c00; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; }
      h1 { color: #151515; font-size: 46px; line-height: 1.02; letter-spacing: 0; margin: 0 0 16px; font-weight: 950; }
      .summary { color: #1f1f1f; font-size: 25px; line-height: 1.16; font-weight: 760; margin: 0 0 15px; }
      .why { color: #292929; font-size: 22px; line-height: 1.22; font-weight: 590; margin: 0 0 18px; }
      .stat-panel {
        margin-top: auto;
        background: #111;
        border-radius: 18px;
        padding: 20px 22px;
        color: #fff;
      }
      .stat-title { color: #ffb15d; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: .7px; margin-bottom: 14px; }
      .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .stat { border-left: 5px solid #ff8a16; padding-left: 12px; min-height: 72px; }
      .stat strong { display: block; font-size: 31px; line-height: 1; margin-bottom: 8px; }
      .stat span { display: block; font-size: 16px; line-height: 1.15; color: #f8f4ec; font-weight: 720; }
      .takeaway {
        margin-top: auto;
        background: #111;
        border-radius: 18px;
        padding: 18px 24px;
        color: #fff;
        font-size: 22px;
        line-height: 1.18;
        font-weight: 800;
      }
      .takeaway span { color: #ffb15d; }
      .source { margin-top: 15px; color: #775018; font-size: 18px; font-weight: 850; }
    </style>
  </head>
  <body>
    <main class="canvas">
      <section class="card">
        <div class="photo">
          <img src="${heroData}" alt="" />
          <div class="tag">AI NEWS</div>
        </div>
        <div class="content">
          <div class="eyebrow">What changed</div>
          <h1>${escapeHtml(headline)}</h1>
          <p class="summary">${escapeHtml(summary)}</p>
          <p class="why">${escapeHtml(why)}</p>
          ${
            hasStats
              ? `<div class="stat-panel">
                  <div class="stat-title">Source-backed numbers</div>
                  <div class="stat-grid">
                    ${stats
                      .slice(0, 3)
                      .map(
                        (stat) => `<div class="stat"><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></div>`,
                      )
                      .join('')}
                  </div>
                </div>`
              : `<div class="takeaway"><span>Simple takeaway:</span> use AI where it helps people, but keep review and proof before scaling it.</div>`
          }
          <div class="source">Source: ${escapeHtml(sourceName)}</div>
        </div>
      </section>
    </main>
  </body>
</html>`
}

const draftDir = path.join(root, 'content', 'drafts', runDate)
const assetDir = path.join(root, 'content', 'assets', runDate)
const previewDir = path.join(root, 'content', 'previews')
const topicPayload = await readJson(path.join('content', 'drafts', runDate, 'topic.json'))
const topic = topicPayload.selected || topicPayload
const heroPath = heroArg
  ? path.resolve(heroArg)
  : await firstExisting([
      path.join(assetDir, 'hero-editorial.png'),
      path.join(root, 'content', 'assets', '2026-07-10', 'hero-editorial.png'),
      path.join(assetDir, 'instagram-card.png'),
    ])
const heroData = await imageDataUrl(heroPath)
const stats = sourceBackedStats(topic)

await fs.mkdir(previewDir, { recursive: true })
const outPath = path.join(previewDir, `linkedin-news-preview-${runDate}.png`)
await renderHtmlToPng(html({ topic, heroData, stats }), outPath)

console.log(
  JSON.stringify(
    {
      status: 'rendered',
      runDate,
      hero: path.relative(root, heroPath),
      preview: path.relative(root, outPath),
      linkedinPost: path.relative(root, path.join(draftDir, 'linkedin-post.md')),
      statsMode: stats.length ? 'source_backed_stats' : 'no_stats_takeaway',
      stats,
    },
    null,
    2,
  ),
)
