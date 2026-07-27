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

function firstNonEmptyLines(text, count) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, count)
}

function plainWhy(line) {
  return String(line || '').replace(/^Why it matters:\s*/i, '').trim()
}

function topicText(topic) {
  return `${topic?.selected?.title || topic?.title || ''} ${topic?.selected?.summary || topic?.summary || ''} ${(
    topic?.selected?.topics ||
    topic?.topics ||
    []
  ).join(' ')}`.toLowerCase()
}

function whyBullets(topic) {
  const text = topicText(topic)
  if (/agent|desktop workflow|work-focused|productivity|files|research|coding|developer/.test(text)) {
    return [
      'Longer tasks can move faster.',
      'Files and research can stay in one workflow.',
      'People still need review before sending.',
    ]
  }
  if (/deutsche telekom|telecommunications|telco|network operations|future of voice/.test(text)) {
    return [
      'Support teams may answer faster.',
      'Network teams may spot issues earlier.',
      'People still need review before trust.',
    ]
  }
  return [
    'Teams can test one real workflow.',
    'Useful work matters more than hype.',
    'Review still comes before trust.',
  ]
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

function baseStyles() {
  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; overflow: hidden; font-family: Arial, Helvetica, sans-serif; }
    body { background: #ff8a16; }
    .wrap { width: 1080px; height: 1350px; padding: 50px 62px; display: flex; align-items: center; justify-content: center; }
    .card {
      width: 912px;
      min-height: 1212px;
      background: #fff8ea;
      border-radius: 34px;
      box-shadow: 0 24px 58px rgba(35, 21, 8, 0.26);
      padding: 24px;
      position: relative;
      border: 10px solid rgba(255,255,255,.72);
    }
    .tag {
      position: absolute;
      left: 44px;
      top: 34px;
      background: #ffffff;
      color: #111111;
      border-radius: 10px;
      padding: 13px 24px;
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 2px;
      box-shadow: 0 6px 14px rgba(0,0,0,.14);
      z-index: 2;
    }
    .photo {
      width: 100%;
      height: 560px;
      border-radius: 22px 22px 10px 10px;
      overflow: hidden;
      border: 10px solid #ffffff;
      background: #111;
    }
    .photo img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 32%; display: block; }
    .photo.compact {
      height: 380px;
      border-radius: 22px 22px 10px 10px;
    }
    .photo.compact img { object-position: 50% 28%; }
    .body { padding: 42px 50px 92px; }
    .eyebrow { color: #b84c00; font-size: 26px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
    h1 { color: #151515; font-size: 57px; line-height: 1.02; letter-spacing: 0; margin: 0 0 24px; font-weight: 950; }
    .summary { color: #1f1f1f; font-size: 33px; line-height: 1.22; margin: 0 0 24px; font-weight: 750; max-width: 760px; }
    .why { color: #292929; font-size: 30px; line-height: 1.28; margin: 0; font-weight: 550; max-width: 770px; }
    .source { position: absolute; left: 74px; bottom: 38px; color: #7b3f07; font-size: 23px; font-weight: 850; }
    .cue { position: absolute; right: 74px; bottom: 38px; color: #7b3f07; font-size: 23px; font-weight: 850; }
    .big-text { padding: 88px 58px 110px; }
    .big-text h1 { font-size: 70px; line-height: 1.02; margin-bottom: 32px; }
    .big-text .why { font-size: 38px; line-height: 1.28; font-weight: 700; }
    .big-text.with-photo { padding: 34px 50px 92px; }
    .big-text.with-photo h1 { font-size: 54px; margin-bottom: 22px; }
    .big-text.with-photo .why { font-size: 29px; line-height: 1.25; }
    .bullets { margin-top: 38px; display: grid; gap: 22px; }
    .bullet { display: grid; grid-template-columns: 18px 1fr; gap: 18px; align-items: start; color: #1d1d1d; font-size: 35px; line-height: 1.18; font-weight: 760; }
    .with-photo .bullets { margin-top: 26px; gap: 16px; }
    .with-photo .bullet { font-size: 28px; line-height: 1.16; }
    .with-photo .bullet span:first-child { margin-top: 9px; }
    .bullet span:first-child { width: 16px; height: 16px; margin-top: 12px; border-radius: 999px; background: #d15d00; }
  `
}

function slideHtml({ kind, heroData, headline, summary, why, sourceName, slide, topic }) {
  const cue = `${slide} / 3`
  const source = `Source: ${sourceName}`
  const bullets = whyBullets(topic)
  let body = ''
  if (kind === 'cover') {
    body = `
      <div class="tag">AI NEWS</div>
      <div class="photo"><img src="${heroData}" alt="" /></div>
      <div class="body">
        <div class="eyebrow">What changed</div>
        <h1>${escapeHtml(headline)}</h1>
        <p class="summary">${escapeHtml(summary)}</p>
        <p class="why">${escapeHtml(why)}</p>
      </div>`
  } else if (kind === 'why') {
    body = `
      <div class="tag">AI NEWS</div>
      <div class="photo compact"><img src="${heroData}" alt="" /></div>
      <div class="big-text with-photo">
        <div class="eyebrow">Why it matters</div>
        <h1>AI is entering everyday systems</h1>
        <p class="why">${escapeHtml(why)}</p>
        <div class="bullets">
          ${bullets.map((bullet) => `<div class="bullet"><span></span><div>${escapeHtml(bullet)}</div></div>`).join('')}
        </div>
      </div>`
  } else {
    body = `
      <div class="tag">AI NEWS</div>
      <div class="photo compact"><img src="${heroData}" alt="" /></div>
      <div class="big-text with-photo">
        <div class="eyebrow">Simple takeaway</div>
        <h1>Use AI where it helps people</h1>
        <p class="why">Start with one real workflow. Test the output. Keep proof. Improve the process before scaling it.</p>
        <div class="bullets">
          <div class="bullet"><span></span><div>Pick one task.</div></div>
          <div class="bullet"><span></span><div>Check the result.</div></div>
          <div class="bullet"><span></span><div>Only then automate more.</div></div>
        </div>
      </div>`
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${baseStyles()}</style>
  </head>
  <body>
    <main class="wrap">
      <section class="card">
        ${body}
        <div class="source">${escapeHtml(source)}</div>
        <div class="cue">${escapeHtml(cue)}</div>
      </section>
    </main>
  </body>
</html>`
}

function contactSheetHtml(slides) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1440px; height: 680px; overflow: hidden; font-family: Arial, Helvetica, sans-serif; background: #1f1f1f; }
      .sheet { width: 100%; height: 100%; padding: 36px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
      .item { background: #111; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 30px rgba(0,0,0,.35); }
      img { display: block; width: 100%; height: 100%; object-fit: cover; }
    </style>
  </head>
  <body>
    <main class="sheet">${slides.map((src) => `<div class="item"><img src="${src}" alt="" /></div>`).join('')}</main>
  </body>
</html>`
}

const draftDir = path.join(root, 'content', 'drafts', runDate)
const assetDir = path.join(root, 'content', 'assets', runDate)
const previewDir = path.join(root, 'content', 'previews')
const topic = await readJson(path.join('content', 'drafts', runDate, 'topic.json'))
const caption = await fs.readFile(path.join(draftDir, 'instagram-caption.md'), 'utf8')
const [headline, summaryLine, whyLineRaw] = firstNonEmptyLines(caption, 3)
const whyLine = plainWhy(whyLineRaw)
const heroPath = heroArg
  ? path.resolve(heroArg)
  : await firstExisting([
      path.join(assetDir, 'hero-editorial.png'),
      path.join(root, 'content', 'assets', '2026-07-10', 'hero-editorial.png'),
      path.join(assetDir, 'instagram-card.png'),
    ])
const heroData = await imageDataUrl(heroPath)
const sourceName = topic.selected?.sourceName || 'Primary source'

await fs.mkdir(previewDir, { recursive: true })

const common = { heroData, headline, summary: summaryLine, why: whyLine, sourceName, topic }
const slidePaths = [
  path.join(previewDir, `editorial-news-preview-${runDate}-slide-1.png`),
  path.join(previewDir, `editorial-news-preview-${runDate}-slide-2.png`),
  path.join(previewDir, `editorial-news-preview-${runDate}-slide-3.png`),
]

await renderHtmlToPng(slideHtml({ ...common, kind: 'cover', slide: 1 }), slidePaths[0])
await renderHtmlToPng(slideHtml({ ...common, kind: 'why', slide: 2 }), slidePaths[1])
await renderHtmlToPng(slideHtml({ ...common, kind: 'takeaway', slide: 3 }), slidePaths[2])

const slideData = await Promise.all(slidePaths.map((filePath) => imageDataUrl(filePath)))
const contactPath = path.join(previewDir, `editorial-news-preview-${runDate}.png`)
await renderHtmlToPng(contactSheetHtml(slideData), contactPath, { width: 1440, height: 680 })

console.log(
  JSON.stringify(
    {
      status: 'rendered',
      runDate,
      hero: path.relative(root, heroPath),
      slides: slidePaths.map((filePath) => path.relative(root, filePath)),
      contactSheet: path.relative(root, contactPath),
      captionSource: path.relative(root, path.join(draftDir, 'instagram-caption.md')),
    },
    null,
    2,
  ),
)
