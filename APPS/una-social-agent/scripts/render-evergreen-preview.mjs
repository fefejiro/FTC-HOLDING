import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const runDate = readArg('--date') || todayInTimeZone()
const slot = readArg('--slot') || 'evergreen'

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

function draftKey(date, slotName) {
  return slotName === 'news' ? date : `${date}-${slotName}`
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function shortText(value, maxWords) {
  const words = String(value || '').split(/\s+/).filter(Boolean)
  return words.length <= maxWords ? words.join(' ') : `${words.slice(0, maxWords).join(' ')}...`
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
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

async function imageDataUrl(filePath) {
  const buffer = await fs.readFile(filePath)
  return `data:image/png;base64,${buffer.toString('base64')}`
}

async function maybeImageDataUrl(filePath) {
  try {
    await fs.access(filePath)
    return await imageDataUrl(filePath)
  } catch {
    return ''
  }
}

function baseStyles() {
  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; overflow: hidden; font-family: Arial, Helvetica, sans-serif; }
    body { background: #ff8a16; }
    .wrap { width: 1080px; height: 1350px; padding: 52px 64px; display: flex; align-items: center; justify-content: center; }
    .card {
      width: 912px;
      min-height: 1212px;
      background: #fff8ea;
      border-radius: 34px;
      border: 10px solid rgba(255,255,255,.72);
      box-shadow: 0 24px 58px rgba(35, 21, 8, 0.26);
      padding: 42px 54px 88px;
      position: relative;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      background: #fff;
      color: #111;
      border-radius: 12px;
      padding: 14px 22px;
      font-size: 26px;
      font-weight: 950;
      letter-spacing: 1px;
      box-shadow: 0 6px 14px rgba(0,0,0,.12);
      margin-bottom: 34px;
    }
    .eyebrow { color: #b84c00; font-size: 27px; font-weight: 950; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 18px; }
    h1 { color: #151515; font-size: 64px; line-height: 1.02; letter-spacing: 0; margin: 0 0 28px; font-weight: 950; }
    .hook { color: #1f1f1f; font-size: 38px; line-height: 1.18; font-weight: 800; margin: 0 0 28px; }
    .body { color: #272727; font-size: 33px; line-height: 1.24; font-weight: 650; margin: 0; }
    .steps { display: grid; gap: 24px; margin-top: 40px; }
    .step { display: grid; grid-template-columns: 62px 1fr; gap: 18px; align-items: start; }
    .num { width: 56px; height: 56px; border-radius: 999px; background: #111; color: #ffb15d; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 950; }
    .step-text { color: #1b1b1b; font-size: 34px; line-height: 1.15; font-weight: 830; }
    .panel { margin-top: 36px; background: #111; color: #fff; border-radius: 24px; padding: 30px; }
    .panel-title { color: #ffb15d; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; font-weight: 950; margin-bottom: 16px; }
    .panel p { margin: 0; font-size: 34px; line-height: 1.2; font-weight: 760; }
    .visual {
      height: 390px;
      border-radius: 24px;
      background:
        radial-gradient(circle at 18% 26%, #4db8a8 0 54px, transparent 56px),
        radial-gradient(circle at 72% 22%, #ff8a16 0 72px, transparent 74px),
        linear-gradient(135deg, #061b21, #102f35);
      border: 8px solid #fff;
      margin-bottom: 38px;
      position: relative;
      overflow: hidden;
    }
    .visual.compact {
      height: 330px;
      margin-bottom: 30px;
    }
    .visual.photo {
      background: #111;
    }
    .visual.photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .visual.photo::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.30) 100%);
      pointer-events: none;
    }
    .screen { position: absolute; right: 68px; top: 70px; width: 430px; height: 230px; border-radius: 22px; background: #071216; border: 5px solid #f5f2ea; box-shadow: 0 14px 36px rgba(0,0,0,.28); padding: 34px; }
    .line { height: 18px; border-radius: 999px; margin-bottom: 22px; background: #4db8a8; }
    .line:nth-child(2) { width: 78%; background: #f5f2ea; }
    .line:nth-child(3) { width: 54%; background: #ff4b12; }
    .person { position: absolute; left: 78px; bottom: 0; width: 210px; height: 300px; background: linear-gradient(#123d46, #09252b); border-radius: 90px 90px 0 0; }
    .head { position: absolute; left: 118px; top: 74px; width: 108px; height: 108px; background: #6f3b20; border-radius: 999px; }
    .source { position: absolute; left: 78px; bottom: 38px; color: #7b3f07; font-size: 22px; font-weight: 850; }
    .cue { position: absolute; right: 78px; bottom: 38px; color: #7b3f07; font-size: 22px; font-weight: 850; }
  `
}

function photoBlock(dataUrl, className = '') {
  return dataUrl ? `<div class="visual photo ${className}"><img src="${dataUrl}" alt="" /></div>` : ''
}

function slideHtml({ tip, kind, slide, sourceLabel, tagLabel, heroDataUrl, stepsDataUrl, takeawayDataUrl }) {
  let content = ''
  if (kind === 'cover') {
    content = `
      ${
        heroDataUrl
          ? `<div class="visual photo"><img src="${heroDataUrl}" alt="" /></div>`
          : `<div class="visual">
              <div class="head"></div><div class="person"></div>
              <div class="screen"><div class="line"></div><div class="line"></div><div class="line"></div></div>
            </div>`
      }
      <div class="eyebrow">${escapeHtml(tip.category)}</div>
      <h1>${escapeHtml(tip.title)}</h1>
      <p class="hook">${escapeHtml(tip.hook)}</p>
      <p class="body">${escapeHtml(shortText(tip.tip, 24))}</p>`
  } else if (kind === 'steps') {
    content = `
      <div class="tag">HOW TO USE IT</div>
      ${photoBlock(stepsDataUrl, 'compact')}
      <h1>Make it a workflow</h1>
      <div class="steps">
        ${tip.steps
          .map((step, index) => `<div class="step"><div class="num">${index + 1}</div><div class="step-text">${escapeHtml(step)}</div></div>`)
          .join('')}
      </div>`
  } else {
    content = `
      <div class="tag">WHY IT MATTERS</div>
      ${photoBlock(takeawayDataUrl, 'compact')}
      <h1>Useful AI still needs judgment</h1>
      <p class="hook">${escapeHtml(tip.why)}</p>
      <div class="panel">
        <div class="panel-title">Simple takeaway</div>
        <p>Use AI to draft, compare, summarize, and organize. Keep a human check before the final decision.</p>
      </div>`
  }

  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><style>${baseStyles()}</style></head>
  <body>
    <main class="wrap">
      <section class="card">
        ${kind === 'cover' ? `<div class="tag">${escapeHtml(tagLabel)}</div>` : ''}
        ${content}
        <div class="source">Source: ${escapeHtml(sourceLabel)}</div>
        <div class="cue">${slide} / 3</div>
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
  <body><main class="sheet">${slides.map((src) => `<div class="item"><img src="${src}" alt="" /></div>`).join('')}</main></body>
</html>`
}

const key = draftKey(runDate, slot)
const draftDir = path.join(root, 'content', 'drafts', key)
const previewDir = path.join(root, 'content', 'previews')
const topic = await readJson(path.join(draftDir, 'topic.json'))
const tip = topic.evergreen
if (!tip) throw new Error(`Draft is not an evergreen tip: ${draftDir}`)
const isWeeklyRecap = topic?.policy?.contentLane === 'weekly-recap'
const sourceLabel = isWeeklyRecap ? 'Una Labs weekly AI notes' : 'Una Labs practical AI notes'
const tagLabel = isWeeklyRecap ? 'WEEK AHEAD' : 'UNA LABS TIP'
const heroDataUrl = await maybeImageDataUrl(path.join(root, 'content', 'assets', 'evergreen', `${tip.id}.png`))
const stepsDataUrl = await maybeImageDataUrl(path.join(root, 'content', 'assets', 'evergreen', `${tip.id}-steps.png`))
const takeawayDataUrl = await maybeImageDataUrl(path.join(root, 'content', 'assets', 'evergreen', `${tip.id}-takeaway.png`))

await fs.mkdir(previewDir, { recursive: true })
const slidePaths = [
  path.join(previewDir, `evergreen-tip-${runDate}-${slot}-slide-1.png`),
  path.join(previewDir, `evergreen-tip-${runDate}-${slot}-slide-2.png`),
  path.join(previewDir, `evergreen-tip-${runDate}-${slot}-slide-3.png`),
]

await renderHtmlToPng(slideHtml({ tip, kind: 'cover', slide: 1, sourceLabel, tagLabel, heroDataUrl }), slidePaths[0])
await renderHtmlToPng(slideHtml({ tip, kind: 'steps', slide: 2, sourceLabel, tagLabel, stepsDataUrl }), slidePaths[1])
await renderHtmlToPng(slideHtml({ tip, kind: 'takeaway', slide: 3, sourceLabel, tagLabel, takeawayDataUrl }), slidePaths[2])

const slideData = await Promise.all(slidePaths.map((filePath) => imageDataUrl(filePath)))
const contactPath = path.join(previewDir, `evergreen-tip-${runDate}-${slot}.png`)
await renderHtmlToPng(contactSheetHtml(slideData), contactPath, { width: 1440, height: 680 })

console.log(
  JSON.stringify(
    {
      status: 'rendered',
      runDate,
      slot,
      tipId: tip.id,
      slides: slidePaths.map((filePath) => path.relative(root, filePath)),
      contactSheet: path.relative(root, contactPath),
    },
    null,
    2,
  ),
)
