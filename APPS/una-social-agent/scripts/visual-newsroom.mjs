import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildStoryFacts,
  createVisualBrief,
  evaluateImageRelevance,
  imageDataUrl,
  improveBriefFromEvaluation,
  renderHtmlToPng,
  renderRawVisual,
  slideHtml,
  slugify,
} from './visuals/news-visual-pipeline.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const runDate = readArg('--date') || todayInTimeZone()
const useAurora = process.argv.includes('--case') && readArg('--case') === 'aurora'

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

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, value, 'utf8')
}

async function copyReviewFile(sourcePath, targetPath) {
  try {
    await fs.copyFile(sourcePath, targetPath)
    return targetPath
  } catch (error) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
    const parsed = path.parse(targetPath)
    const fallbackPath = path.join(parsed.dir, `${parsed.name}-${stamp}${parsed.ext}`)
    await fs.copyFile(sourcePath, fallbackPath)
    return fallbackPath
  }
}

async function fileSha256(filePath) {
  const buffer = await fs.readFile(filePath)
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

async function replaceDuplicateRawVisual(record, seenImageHashes, index) {
  const hash = await fileSha256(record.rawPath)
  if (!seenImageHashes.has(hash)) {
    seenImageHashes.add(hash)
    return record
  }

  return {
    ...record,
    image_evaluation: {
      ...record.image_evaluation,
      decision: 'reject',
      failure_reasons: [
        ...(record.image_evaluation?.failure_reasons || []),
        'Downloaded image duplicated another slide in the same run. The run must stop instead of replacing it with a template fallback.',
      ],
      retry_instructions: [
        ...(record.image_evaluation?.retry_instructions || []),
        'Select a different story-specific editorial photo. Do not use a deterministic fallback or the same image under another filename.',
      ],
    },
    fallback_used: false,
    fallback_reason: 'Duplicate downloaded image rejected. No fallback replacement was used.',
  }
}

function auroraEntries() {
  return [
    {
      region: 'North America',
      label: 'AI weather',
      story: {
        sourceName: 'Microsoft Research',
        sourceTier: 'primary',
        region: 'North America',
        title: 'Aurora 1.5: Extending open foundation models for weather and Earth-system applications',
        url: 'https://www.microsoft.com/en-us/research/blog/aurora-1-5-extending-open-foundation-models-for-weather-and-earth-system-applications/',
        summary:
          'Aurora 1.5 extends open foundation models for weather and Earth-system applications, including atmospheric forecasting, climate modelling and energy planning.',
        publishedAt: `${runDate}T10:00:00.000Z`,
        topics: ['weather', 'earth-system', 'climate', 'forecasting', 'energy'],
      },
      takeaway: 'Weather AI only matters when operators can test it against real forecasts, risk, and planning work.',
    },
  ]
}

async function loadEntries() {
  if (useAurora) return auroraEntries()
  const briefPath = path.join(root, 'content', 'drafts', runDate, 'regional-brief.json')
  const brief = await readJson(briefPath)
  if (!Array.isArray(brief.entries) || brief.entries.length < 1) {
    throw new Error(`No regional entries found in ${path.relative(root, briefPath)}`)
  }
  return brief.entries
}

async function renderContactSheet(slidePaths, outPath) {
  const dataUrls = await Promise.all(slidePaths.map((slidePath) => imageDataUrl(slidePath)))
  const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
    *{box-sizing:border-box}html,body{margin:0;width:1440px;height:680px;overflow:hidden;background:#202020}
    .sheet{width:100%;height:100%;padding:34px;display:grid;grid-template-columns:repeat(${Math.max(1, slidePaths.length)},1fr);gap:24px}
    .item{border-radius:12px;overflow:hidden;background:#111;box-shadow:0 14px 36px #0008}
    img{width:100%;height:100%;object-fit:cover;display:block}
  </style></head><body><main class="sheet">${dataUrls.map((src) => `<div class="item"><img src="${src}" alt=""/></div>`).join('')}</main></body></html>`
  await renderHtmlToPng(html, outPath, { width: 1440, height: 680 })
}

async function buildVisual(entry, index) {
  const facts = buildStoryFacts(entry, index)
  let brief = createVisualBrief(facts)
  let evaluation = evaluateImageRelevance(facts, brief, { evaluation_mode: 'brief_static' })
  let attempts = 1
  const rejected = []

  while (evaluation.decision === 'retry' && attempts < 3) {
    rejected.push({ attempt: attempts, visual_brief: brief, image_evaluation: evaluation })
    brief = improveBriefFromEvaluation(brief, evaluation)
    attempts += 1
    evaluation = evaluateImageRelevance(facts, brief, { evaluation_mode: 'brief_static' })
  }

  const storySlug = `${String(index + 1).padStart(2, '0')}-${slugify(facts.region)}-${slugify(facts.headline).slice(0, 36)}`
  const outDir = path.join(root, 'content', 'visuals', runDate, storySlug)
  const rawPath = path.join(outDir, 'raw-image.png')
  const slidePath = path.join(outDir, 'slide.png')
  const assetMeta = await renderRawVisual(facts, brief, rawPath)
  const finalEvaluation = evaluateImageRelevance(facts, brief, {
    evaluation_mode: 'brief_static_with_rendered_fallback',
    fallback_used: assetMeta.fallback_used,
  })
  const rawData = await imageDataUrl(rawPath)
  await renderHtmlToPng(
    slideHtml({ facts, brief, imageDataUrl: rawData, index, sourceName: facts.source_name }),
    slidePath,
    { width: 1080, height: 1350 },
  )

  const record = {
    run_id: `una-visual-${runDate}`,
    story_id: facts.story_id,
    region: facts.region,
    headline: facts.headline,
    source_url: facts.source_url,
    source_date: facts.publication_date,
    story_score: entry.story?.score || 0,
    story_facts: facts,
    visual_brief: brief,
    image_prompt: brief.generation_prompt,
    image_asset_path: path.relative(root, rawPath),
    image_model: assetMeta.image_model,
    generation_attempts: attempts,
    image_evaluation: finalEvaluation,
    rejected_generations: rejected,
    fallback_used: assetMeta.fallback_used,
    fallback_reason: assetMeta.fallback_reason,
    attribution: assetMeta.attribution || null,
    slide_asset_path: path.relative(root, slidePath),
    publish_status: 'review_required',
    published_urls: [],
    screenshots: [],
    timestamp: new Date().toISOString(),
  }

  await writeJson(path.join(outDir, 'story-facts.json'), facts)
  await writeJson(path.join(outDir, 'visual-brief.json'), brief)
  await writeText(path.join(outDir, 'image-prompt.txt'), `${brief.generation_prompt}\n\nNegative: ${brief.negative_prompt}\n`)
  await writeJson(path.join(outDir, 'image-evaluation.json'), finalEvaluation)
  await writeJson(path.join(outDir, 'proof-ledger.json'), record)
  return { ...record, rawPath, slidePath, outDir }
}

const entries = await loadEntries()
const previewDir = path.join(root, 'content', 'previews')
const assetDir = path.join(root, 'content', 'assets', runDate)
await fs.mkdir(previewDir, { recursive: true })
await fs.mkdir(assetDir, { recursive: true })

const records = []
const slidePaths = []
const seenImageHashes = new Set()
for (const [index, entry] of entries.entries()) {
  const record = await replaceDuplicateRawVisual(await buildVisual(entry, index), seenImageHashes, index)
  records.push(record)
  slidePaths.push(record.slidePath)
  const regionalSlidePath = path.join(previewDir, `regional-news-preview-${runDate}-slide-${index + 1}.png`)
  const editorialSlidePath = path.join(previewDir, `editorial-news-preview-${runDate}-slide-${index + 1}.png`)
  await copyReviewFile(record.slidePath, regionalSlidePath)
  await copyReviewFile(record.slidePath, editorialSlidePath)
}

const allPublishable =
  records.length > 0 &&
  records.every(
    (record) => record.image_evaluation.decision === 'accept' && record.fallback_used !== true,
  )
const publishableAssetPath = path.join(assetDir, 'instagram-card.png')
if (allPublishable && slidePaths[0]) {
  await copyReviewFile(slidePaths[0], publishableAssetPath)
} else {
  await fs.rm(publishableAssetPath, { force: true })
}
const contactPath = path.join(previewDir, `regional-news-preview-${runDate}.png`)
await renderContactSheet(slidePaths, contactPath)
const editorialContactPath = path.join(previewDir, `editorial-news-preview-${runDate}.png`)
await copyReviewFile(contactPath, editorialContactPath)

const ledgerPath = path.join(root, 'content', 'visuals', runDate, 'visual-proof-ledger.json')
await writeJson(ledgerPath, {
  run_id: `una-visual-${runDate}`,
  runDate,
  status: allPublishable ? 'visual_review_ready' : 'visual_review_blocked',
  publish_status: 'review_required',
  note: allPublishable
    ? 'Visuals passed review and the publishable Instagram card was exported.'
    : 'Fallback/template visuals are preview-only. No publishable instagram-card.png was exported.',
  records: records.map(({ rawPath, slidePath, outDir, ...record }) => record),
  contact_sheet: path.relative(root, contactPath),
  createdAt: new Date().toISOString(),
})

console.log(
  JSON.stringify(
    {
      status: allPublishable ? 'visual_review_ready' : 'visual_review_blocked',
      runDate,
      case: useAurora ? 'aurora' : 'regional',
      publishable_asset: allPublishable ? path.relative(root, publishableAssetPath) : null,
      preview: path.relative(root, contactPath),
      slides: slidePaths.map((slidePath) => path.relative(root, slidePath)),
      ledger: path.relative(root, ledgerPath),
      evaluations: records.map((record) => ({
        region: record.region,
        headline: record.headline,
        decision: record.image_evaluation.decision,
        overall_score: record.image_evaluation.overall_score,
        story_alignment: record.image_evaluation.story_alignment,
        technology_specificity: record.image_evaluation.technology_specificity,
        fallback_used: record.fallback_used,
      })),
    },
    null,
    2,
  ),
)
