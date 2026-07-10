import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dateArg = readArg('--date') || todayInTimeZone()

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

const voice = await readJson('config/voice.json')
const svgPath = path.join(root, 'content', 'assets', dateArg, 'instagram-card.svg')
const pngPath = path.join(root, 'content', 'assets', dateArg, 'instagram-card.png')

await fs.access(svgPath)
await fs.mkdir(path.dirname(pngPath), { recursive: true })
await exportSvgToPng(svgPath, pngPath, voice)

console.log(
  JSON.stringify(
    {
      status: 'exported',
      runDate: dateArg,
      svg: path.relative(root, svgPath),
      png: path.relative(root, pngPath),
    },
    null,
    2,
  ),
)
