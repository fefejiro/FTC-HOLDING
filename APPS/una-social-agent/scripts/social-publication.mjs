import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const command = process.argv[2] || 'generate-meta'
const runDate = readArg('--date') || todayInTimeZone()

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

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function writeJson(filePath, value) {
  await ensureDir(filePath)
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function writeText(filePath, value) {
  await ensureDir(filePath)
  await fs.writeFile(filePath, value, 'utf8')
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function splitHeadline(value, maxLines = 3) {
  const words = String(value).toUpperCase().split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (next.length > 18 && line && lines.length < maxLines - 1) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, maxLines)
}

function storyDir(story) {
  return path.join(root, 'content', 'stories', `${runDate}-${story.storyId}`)
}

function seededStories() {
  const meta = {
    storyId: 'meta-muse-spark',
    status: 'draft',
    category: 'AI NEWS',
    headline: 'META OPENED A NEW AI LANE',
    summary:
      'Meta announced Muse Spark 1.1 and opened a public preview of the Meta Model API for developers.',
    whatHappened:
      'Meta released Muse Spark 1.1, a multimodal reasoning model focused on agentic tasks, coding, computer use, tool use, and developer workflows. The company says developers can access it through the Meta Model API public preview.',
    whyItMatters: [
      'Developers get another serious model to test for coding and workflow automation.',
      'The AI race is moving from chatbot demos into tools that can work across apps.',
      'Teams still need source checks, review steps, and proof before trusting agent output.',
    ],
    signal: {
      type: 'capability',
      value: 'Public developer API preview',
      context: 'The useful signal is developer access, not only benchmark claims.',
    },
    whatToWatch: [
      'How developers compare Muse Spark 1.1 with existing coding models.',
      'Whether agentic computer-use features become reliable in real work.',
      'How pricing and API compatibility affect adoption.',
    ],
    people: ['Mark Zuckerberg'],
    companies: ['Meta'],
    primarySources: [
      {
        title: 'Introducing Muse Spark 1.1',
        publisher: 'Meta AI Blog',
        url: 'https://ai.meta.com/blog/introducing-muse-spark-meta-model-api/',
        publishedAt: '2026-07-09',
        retrievedAt: new Date().toISOString(),
        verifiedClaims: [
          'Meta announced Muse Spark 1.1.',
          'Muse Spark 1.1 is described as a multimodal reasoning model for agentic tasks.',
          'Developer access is available through the Meta Model API public preview.',
        ],
      },
    ],
    image: {
      type: 'generated-illustration',
      sourceUrl: '',
      credit: 'AI-generated editorial illustration created locally from structured template art.',
      license: 'internal generated editorial asset',
      disclosureRequired: true,
    },
    heroVariant: 'people',
  }

  const drafts = [
    meta,
    seed('big-tech-ai', 'BIG TECH', 'GOOGLE PUT AI DEEPER INTO WORK', 'Google AI product updates show AI moving into daily work tools.', 'Google', 'https://blog.google/technology/ai/', 'product'),
    seed('ai-agents', 'AI AGENTS', 'AI AGENTS ARE ENTERING THE OFFICE', 'AI agent products are shifting from demos into business workflows.', 'OpenAI', 'https://openai.com/news/', 'agent'),
    seed('physical-ai', 'ROBOTICS', 'PHYSICAL AI IS GETTING REAL', 'Robotics and embodied AI are becoming a bigger part of the AI market.', 'NVIDIA', 'https://nvidianews.nvidia.com/', 'robot'),
    seed('ai-policy', 'TECH POLICY', 'AI RULES ARE MOVING FASTER', 'Governments are formalizing expectations for AI safety, disclosure, and governance.', 'Government source', 'https://www.whitehouse.gov/ostp/ai/', 'policy'),
    seed('developer-tools', 'DEV TOOLS', 'DEVELOPERS GET NEW AI TOOLS', 'Developer platforms are competing on integrations, context, and speed.', 'GitHub', 'https://github.blog/', 'developer'),
    seed('enterprise-ai', 'ENTERPRISE', 'AI IS MOVING INTO OPERATIONS', 'Enterprise adoption is becoming more about integration than experimentation.', 'Microsoft', 'https://blogs.microsoft.com/ai/', 'enterprise'),
    seed('ai-partnerships', 'AI DEALS', 'AI PARTNERSHIPS ARE STACKING UP', 'Funding and partnerships are shaping who gets compute, data, and distribution.', 'Anthropic', 'https://www.anthropic.com/news', 'partnership'),
    seed('research-breakthrough', 'RESEARCH', 'AI RESEARCH KEEPS RAISING THE BAR', 'Research labs continue to push model capability, safety, and evaluation methods.', 'MIT Technology Review', 'https://www.technologyreview.com/topic/artificial-intelligence/', 'research'),
  ]
  return drafts
}

function seed(storyId, category, headline, summary, publisher, url, heroVariant = 'product') {
  return {
    storyId,
    status: 'draft',
    category,
    headline,
    summary,
    whatHappened: summary,
    whyItMatters: [
      'The useful question is how this changes real work.',
      'Teams need a practical way to test the tool before trusting it.',
      'The winners will make AI easier to deploy, not just more impressive to demo.',
    ],
    signal: {
      type: 'context',
      value: 'Watch the implementation layer',
      context: 'Adoption depends on workflow fit, reliability, and access.',
    },
    whatToWatch: ['Product access', 'Real user adoption', 'Integration into existing workflows'],
    people: [],
    companies: [publisher],
    primarySources: [
      {
        title: `${publisher} official AI news source`,
        publisher,
        url,
        publishedAt: runDate,
        retrievedAt: new Date().toISOString(),
        verifiedClaims: ['Draft feed seed. Requires story-specific verification before publication.'],
      },
    ],
    image: {
      type: 'generated-illustration',
      sourceUrl: '',
      credit: 'AI-generated/local editorial illustration placeholder for draft feed preview.',
      license: 'internal generated draft asset',
      disclosureRequired: true,
    },
    heroVariant,
  }
}

function instagramCaption(story) {
  return `${story.companies[0] || 'A major AI company'} has a new signal worth watching.

${story.whatHappened}

Why this matters: ${story.whyItMatters[0]} ${story.whyItMatters[1]}

Una Labs take: the model race is becoming a workflow race. Powerful AI matters, but the bigger business question is whether teams can place it inside real products, support flows, coding work, and daily operations without losing control of quality.

Would you test this now, or wait until the ecosystem matures?

Source: ${story.primarySources[0].publisher} - ${story.primarySources[0].url}
Image: ${story.image.credit}

#ArtificialIntelligence #AINews #Developers #Technology #Workflow #AITools
`
}

function linkedinCaption(story) {
  return `${story.headline}

${story.whatHappened}

The business relevance is practical: AI tools are moving closer to real implementation work. For leaders and builders, the question is less "which model is trending today?" and more "which model can reliably support a workflow we can measure, review, and improve?"

Una Labs perspective: the next advantage will come from pairing AI capability with operating discipline. Pick a narrow workflow, test the output, keep proof, and improve the process before scaling it.

What would you test first: coding, research, support, operations, or internal admin?

Primary source: ${story.primarySources[0].publisher} - ${story.primarySources[0].url}

#ArtificialIntelligence #AITools #Technology #Innovation
`
}

function baseCss(tokens) {
  const c = tokens.colors
  const t = tokens.type
  return `
    * { box-sizing: border-box; }
    body { margin: 0; width: 1080px; height: 1350px; overflow: hidden; background: ${c.black}; font-family: ${t.body}; color: ${c.offWhite}; }
    .slide { position: relative; width: 1080px; height: 1350px; overflow: hidden; background: radial-gradient(circle at 70% 15%, ${c.deepTeal} 0, ${c.black} 46%, #020405 100%); padding: 80px; }
    .label { position: absolute; top: 70px; left: 80px; color: ${c.orange}; font-weight: 900; font-size: 34px; letter-spacing: 0; }
    .handle { position: absolute; left: 80px; bottom: 70px; color: ${c.offWhite}; font-weight: 700; font-size: 28px; }
    .swipe { position: absolute; right: 80px; bottom: 70px; color: ${c.offWhite}; font-weight: 900; font-size: 28px; }
    .headline { position: absolute; left: 80px; right: 80px; bottom: 170px; z-index: 5; font-family: ${t.headline}; font-weight: 900; line-height: 0.92; font-size: 86px; color: ${c.offWhite}; text-transform: uppercase; text-shadow: 0 10px 30px #000; }
    .headline .accent { color: ${c.cyan}; }
    .hero { position: absolute; left: 80px; right: 80px; top: 140px; height: 650px; border-radius: 28px; overflow: hidden; background: linear-gradient(145deg, #182D34, #050809); box-shadow: 0 35px 80px rgba(0,0,0,.55); }
    .hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 52%, rgba(0,0,0,.82) 100%); }
    .person { position: absolute; bottom: 0; width: 310px; height: 520px; border-radius: 180px 180px 24px 24px; background: linear-gradient(180deg, #173F47, #0D252B); filter: drop-shadow(0 22px 35px rgba(0,0,0,.52)); }
    .person::before { content: ""; position: absolute; left: 72px; top: 25px; width: 166px; height: 166px; border-radius: 50%; background: #EAC3A5; box-shadow: inset 0 18px 0 #593A2E; }
    .person.large { left: 45px; transform: scale(1.18); transform-origin: bottom left; }
    .person.mid { left: 355px; bottom: 0; background: linear-gradient(180deg, ${c.orange}, #8E260B); transform: scale(.9); transform-origin: bottom; }
    .person.small { right: 35px; transform: scale(.78); transform-origin: bottom right; }
    .device { position: absolute; right: 70px; bottom: 120px; width: 310px; height: 195px; border: 7px solid ${c.cyan}; border-radius: 24px; background: #020608; z-index: 3; }
    .device span { display: block; height: 22px; margin: 32px 38px; border-radius: 8px; background: ${c.cyan}; }
    .device span:nth-child(2) { width: 58%; background: ${c.mutedGrey}; }
    .device span:nth-child(3) { width: 74%; background: ${c.orange}; }
    .orb { position:absolute; border-radius: 50%; background: radial-gradient(circle at 32% 28%, ${c.offWhite}, ${c.cyan} 34%, #052b31 70%); box-shadow: 0 0 60px rgba(25,211,209,.38); }
    .chip { position:absolute; border-radius: 28px; background:#020608; border: 6px solid ${c.cyan}; box-shadow: 0 20px 40px rgba(0,0,0,.45); }
    .chip::before, .chip::after { content:""; position:absolute; left:34px; right:34px; height:24px; border-radius:10px; background:${c.cyan}; }
    .chip::before { top:40px; }
    .chip::after { top:92px; width:56%; background:${c.orange}; }
    .robot { position:absolute; left:340px; top:100px; width:300px; height:360px; border-radius:110px 110px 42px 42px; background:linear-gradient(180deg,#dce4e6,#65777c); box-shadow: 0 28px 55px rgba(0,0,0,.45); }
    .robot::before { content:""; position:absolute; left:70px; top:80px; width:160px; height:86px; border-radius:28px; background:#020608; border:5px solid ${c.cyan}; }
    .robot::after { content:""; position:absolute; left:106px; top:112px; width:28px; height:28px; border-radius:50%; background:${c.cyan}; box-shadow: 62px 0 ${c.orange}; }
    .columns { position:absolute; left:150px; right:150px; bottom:115px; height:330px; display:flex; gap:34px; align-items:flex-end; }
    .column { flex:1; border-radius:24px 24px 0 0; background:linear-gradient(180deg,${c.cyan},#0c4b50); box-shadow:0 20px 35px rgba(0,0,0,.38); }
    .column:nth-child(2) { height:85%; background:linear-gradient(180deg,${c.orange},#5b1908); }
    .column:nth-child(3) { height:62%; }
    .column:nth-child(4) { height:94%; background:linear-gradient(180deg,${c.offWhite},#69777b); }
    .content-title { color: ${c.cyan}; font-family: ${t.headline}; font-size: 58px; line-height: .96; margin: 80px 0 40px; text-transform: uppercase; }
    .body { font-size: 43px; line-height: 1.18; font-weight: 700; max-width: 870px; }
    .points { margin-top: 40px; display: grid; gap: 28px; }
    .point { font-size: 38px; line-height: 1.15; font-weight: 800; padding-left: 34px; border-left: 8px solid ${c.orange}; }
    .signal { margin-top: 70px; padding: 42px; border: 3px solid rgba(25,211,209,.42); border-radius: 28px; background: rgba(0,0,0,.42); }
    .signal-value { font-family: ${t.headline}; font-size: 62px; line-height: 1; color: ${c.offWhite}; text-transform: uppercase; }
    .credit { position: absolute; left: 80px; right: 80px; bottom: 76px; color: ${c.mutedGrey}; font-size: 23px; line-height: 1.25; }
  `
}

function coverHtml(story, tokens) {
  const lines = splitHeadline(story.headline)
  const hero = heroMarkup(story.heroVariant || 'people')
  return htmlPage(tokens, `
    <section class="slide">
      <div class="label">${escapeHtml(story.category)}</div>
      <div class="hero">
        ${hero}
      </div>
      <div class="headline">
        ${lines.map((line, index) => `<div class="${index === lines.length - 1 ? 'accent' : ''}">${escapeHtml(line)}</div>`).join('')}
      </div>
      <div class="handle">@unalabs.cloud</div>
      <div class="swipe">SWIPE -&gt;</div>
    </section>
  `)
}

function heroMarkup(variant) {
  if (variant === 'robot') {
    return '<div class="orb" style="width:250px;height:250px;left:110px;top:90px"></div><div class="robot"></div><div class="chip" style="right:95px;bottom:145px;width:270px;height:190px"></div>'
  }
  if (variant === 'policy') {
    return '<div class="columns"><div class="column" style="height:70%"></div><div class="column"></div><div class="column"></div><div class="column"></div></div><div class="chip" style="left:310px;top:105px;width:300px;height:180px"></div>'
  }
  if (variant === 'research') {
    return '<div class="orb" style="width:390px;height:390px;left:90px;top:90px"></div><div class="orb" style="width:210px;height:210px;right:160px;bottom:125px;background:radial-gradient(circle at 30% 30%,#fff,#F05A28 38%,#381106 78%)"></div><div class="chip" style="left:510px;top:160px;width:310px;height:210px"></div>'
  }
  if (variant === 'enterprise') {
    return '<div class="columns"><div class="column" style="height:46%"></div><div class="column" style="height:72%"></div><div class="column" style="height:92%"></div><div class="column" style="height:58%"></div></div><div class="device"><span></span><span></span><span></span></div>'
  }
  if (variant === 'partnership') {
    return '<div class="person large" style="left:80px;transform:scale(.95);"></div><div class="person small" style="right:95px;transform:scale(.95);"></div><div class="orb" style="width:170px;height:170px;left:455px;top:240px"></div><div class="chip" style="left:370px;bottom:115px;width:340px;height:160px"></div>'
  }
  if (variant === 'agent' || variant === 'developer') {
    return '<div class="person large" style="left:85px;transform:scale(.98);"></div><div class="device" style="right:110px;bottom:185px;width:380px;height:240px"><span></span><span></span><span></span></div><div class="orb" style="width:150px;height:150px;right:170px;top:95px"></div>'
  }
  if (variant === 'product') {
    return '<div class="orb" style="width:330px;height:330px;left:120px;top:120px"></div><div class="chip" style="right:130px;top:145px;width:360px;height:245px"></div><div class="device" style="left:230px;bottom:95px;width:450px;height:230px"><span></span><span></span><span></span></div>'
  }
  return '<div class="person large"></div><div class="person mid"></div><div class="person small"></div><div class="device"><span></span><span></span><span></span></div>'
}

function bodyHtml(story, tokens, title, content) {
  return htmlPage(tokens, `
    <section class="slide">
      <div class="label">${escapeHtml(story.category)}</div>
      <h1 class="content-title">${escapeHtml(title)}</h1>
      ${content}
      <div class="handle">@unalabs.cloud</div>
    </section>
  `)
}

function htmlPage(tokens, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(tokens)}</style></head><body>${body}</body></html>`
}

function slideHtml(story, tokens, index) {
  if (index === 1) return coverHtml(story, tokens)
  if (index === 2) {
    return bodyHtml(story, tokens, 'What happened', `<div class="body">${escapeHtml(story.whatHappened)}</div>`)
  }
  if (index === 3) {
    return bodyHtml(story, tokens, 'Why it matters', `<div class="points">${story.whyItMatters.slice(0, 3).map((p) => `<div class="point">${escapeHtml(p)}</div>`).join('')}</div>`)
  }
  if (index === 4) {
    return bodyHtml(story, tokens, 'The signal', `<div class="signal"><div class="signal-value">${escapeHtml(story.signal.value)}</div><div class="body" style="margin-top:34px">${escapeHtml(story.signal.context)}</div></div>`)
  }
  return bodyHtml(
    story,
    tokens,
    'Watch next',
    `<div class="points">${story.whatToWatch.slice(0, 3).map((p) => `<div class="point">${escapeHtml(p)}</div>`).join('')}</div><div class="credit">Source: ${escapeHtml(story.primarySources[0].publisher)}. Image: ${escapeHtml(story.image.credit)}. Follow @unalabs.cloud for the next signal.</div>`,
  )
}

async function renderHtmlToPng(html, outPath) {
  const { chromium } = await import('playwright')
  const browser = await launchChromium(chromium)
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'load' })
    await ensureDir(outPath)
    await page.screenshot({ path: outPath, type: 'png', fullPage: false })
  } finally {
    await browser.close()
  }
}

async function launchChromium(chromium) {
  try {
    return await chromium.launch({ headless: true })
  } catch (error) {
    if (!/Executable doesn't exist|playwright install/i.test(String(error?.message || error))) throw error
    return chromium.launch({ channel: 'chrome', headless: true })
  }
}

async function generateStory(story, tokens) {
  const dir = storyDir(story)
  const files = []
  const storyWithCopy = {
    ...story,
    instagramCaption: instagramCaption(story),
    linkedInCaption: linkedinCaption(story),
    slides: [1, 2, 3, 4, 5].map((slide) => ({ slide, purpose: ['cover', 'what happened', 'why it matters', 'signal', 'watch next'][slide - 1] })),
    createdAt: new Date().toISOString(),
    approvedAt: null,
    publishedAt: null,
    instagramUrl: null,
    linkedInUrl: null,
  }

  await writeJson(path.join(dir, 'brief.json'), storyWithCopy)
  await writeJson(path.join(dir, 'source-manifest.json'), {
    storyId: story.storyId,
    confidenceLevel: story.storyId === 'meta-muse-spark' ? 'high' : 'draft-needs-story-specific-verification',
    primarySources: story.primarySources,
    secondarySources: [],
    remainingUncertainty:
      story.storyId === 'meta-muse-spark' ? [] : ['Seed feed item needs a specific current primary-source story before publication.'],
  })
  await writeJson(path.join(dir, 'asset-manifest.json'), {
    storyId: story.storyId,
    image: story.image,
    generatedAt: new Date().toISOString(),
  })
  await writeJson(path.join(dir, 'headline-options.json'), headlineOptions(story))
  await writeText(path.join(dir, 'instagram-caption.md'), storyWithCopy.instagramCaption)
  await writeText(path.join(dir, 'linkedin-caption.md'), storyWithCopy.linkedInCaption)

  for (let slide = 1; slide <= 5; slide += 1) {
    const fileName = `slide-${String(slide).padStart(2, '0')}-${['cover', 'what-happened', 'why-it-matters', 'signal', 'watch-next'][slide - 1]}.png`
    const outPath = path.join(dir, fileName)
    await renderHtmlToPng(slideHtml(story, tokens, slide), outPath)
    files.push(outPath)
  }

  await makeCarouselPreview(files, path.join(dir, 'proof', 'carousel-preview.png'))
  await makeGridPreview([files[0]], path.join(dir, 'proof', 'grid-preview.png'), 1)
  const qa = await qaStory(story, dir)
  await writeJson(path.join(dir, 'qa-report.json'), qa)
  await writeJson(path.join(dir, 'publish-result.json'), {
    status: 'draft_not_published',
    reason: 'Generated for approval. No publication attempted by this command.',
    createdAt: new Date().toISOString(),
  })
  return { story, dir, cover: files[0], qa }
}

function headlineOptions(story) {
  const options = [
    story.headline,
    'META JUST OPENED A NEW AI LANE',
    'META GIVES DEVELOPERS A NEW AI TOOL',
    'A NEW AI MODEL ENTERS THE WORKFLOW RACE',
    'META PUSHES AI AGENTS TOWARD DEVELOPERS',
  ]
  return options.map((text) => ({
    text,
    scores: {
      clarity: text.length < 45 ? 9 : 7,
      accuracy: /META|AI|DEVELOPER|MODEL|WORKFLOW/.test(text) ? 9 : 7,
      curiosity: /NEW|OPENED|RACE/.test(text) ? 8 : 7,
      mobileReadability: splitHeadline(text).length <= 3 ? 9 : 6,
      visualLength: text.split(/\s+/).length <= 9 ? 9 : 7,
      lackOfExaggeration: /DESTROYED|BROKE|EVERYTHING/.test(text) ? 2 : 9,
    },
  }))
}

async function makeCarouselPreview(files, outPath) {
  const resized = await Promise.all(files.map((file) => sharp(file).resize(270, 338).png().toBuffer()))
  await ensureDir(outPath)
  await sharp({
    create: { width: 270 * files.length, height: 338, channels: 4, background: '#070B0E' },
  })
    .composite(resized.map((input, index) => ({ input, left: index * 270, top: 0 })))
    .png()
    .toFile(outPath)
}

async function makeGridPreview(covers, outPath, columns = 3) {
  const cell = 360
  const rows = Math.ceil(covers.length / columns)
  const inputs = await Promise.all(covers.map((file) => sharp(file).resize(cell, cell, { fit: 'cover' }).png().toBuffer()))
  await ensureDir(outPath)
  await sharp({
    create: { width: columns * cell, height: rows * cell, channels: 4, background: '#070B0E' },
  })
    .composite(inputs.map((input, index) => ({ input, left: (index % columns) * cell, top: Math.floor(index / columns) * cell })))
    .png()
    .toFile(outPath)
}

async function makeContactSheet(covers, outPath) {
  const width = 540
  const height = 675
  const inputs = await Promise.all(covers.map((file) => sharp(file).resize(width, height).png().toBuffer()))
  await ensureDir(outPath)
  await sharp({
    create: { width: width * 3, height: height * 3, channels: 4, background: '#070B0E' },
  })
    .composite(inputs.map((input, index) => ({ input, left: (index % 3) * width, top: Math.floor(index / 3) * height })))
    .png()
    .toFile(outPath)
}

async function makeBeforeAfter(newCover) {
  const before = path.join(root, 'content', 'assets', runDate, 'instagram-card.png')
  const outPath = path.join(root, 'content', 'previews', 'before-after-meta-muse.png')
  const beforeBuffer = await sharp(before).resize(540, 675, { fit: 'cover' }).png().toBuffer().catch(() => null)
  const afterBuffer = await sharp(newCover).resize(540, 675, { fit: 'cover' }).png().toBuffer()
  const composites = []
  if (beforeBuffer) composites.push({ input: beforeBuffer, left: 0, top: 0 })
  composites.push({ input: afterBuffer, left: 540, top: 0 })
  await ensureDir(outPath)
  await sharp({ create: { width: 1080, height: 675, channels: 4, background: '#070B0E' } })
    .composite(composites)
    .png()
    .toFile(outPath)
  return outPath
}

async function qaStory(story, dir) {
  const issues = []
  const warnings = []
  const slideFiles = [
    'slide-01-cover.png',
    'slide-02-what-happened.png',
    'slide-03-why-it-matters.png',
    'slide-04-signal.png',
    'slide-05-watch-next.png',
  ].map((prefix) => path.join(dir, prefix))

  const actualSlideFiles = (await fs.readdir(dir)).filter((name) => /^slide-\d\d-.*\.png$/.test(name)).map((name) => path.join(dir, name))
  if (actualSlideFiles.length !== 5) issues.push(`Expected 5 slides, found ${actualSlideFiles.length}.`)

  for (const file of actualSlideFiles) {
    const meta = await sharp(file).metadata()
    if (meta.width !== 1080 || meta.height !== 1350) issues.push(`${path.basename(file)} is ${meta.width}x${meta.height}, expected 1080x1350.`)
  }

  if (story.headline.split(/\s+/).length > 12) issues.push('Headline has more than 12 words.')
  if (splitHeadline(story.headline).length > 3) issues.push('Headline has more than 3 lines.')
  if (!story.primarySources?.[0]?.url?.startsWith('http')) issues.push('Primary source URL missing.')
  if (!story.image?.credit) issues.push('Image credit missing.')
  if (instagramCaption(story).includes('[') || linkedinCaption(story).includes('[')) issues.push('Caption contains template bracket placeholder.')

  const cover = actualSlideFiles[0]
  if (cover) {
    await sharp(cover).resize(320).png().toFile(path.join(dir, 'proof', 'cover-thumb-320.png'))
    await sharp(cover).resize(160).png().toFile(path.join(dir, 'proof', 'cover-thumb-160.png'))
  }

  if (story.storyId !== 'meta-muse-spark') {
    warnings.push('Draft seed story: source must be replaced with story-specific primary source before publishing.')
  }

  return {
    status: issues.length ? 'failed' : 'passed',
    checkedAt: new Date().toISOString(),
    dimensions: '1080x1350',
    thumbnailChecks: ['proof/cover-thumb-320.png', 'proof/cover-thumb-160.png'],
    issues,
    warnings,
  }
}

async function runGenerateMeta() {
  const tokens = await readJson('config/visual-tokens.json')
  const meta = seededStories()[0]
  const result = await generateStory(meta, tokens)
  const beforeAfter = await makeBeforeAfter(result.cover)
  console.log(JSON.stringify({
    status: 'generated',
    storyId: meta.storyId,
    storyDir: path.relative(root, result.dir),
    qa: result.qa.status,
    beforeAfter: path.relative(root, beforeAfter),
  }, null, 2))
}

async function runSeedFeed() {
  const tokens = await readJson('config/visual-tokens.json')
  const results = []
  for (const story of seededStories()) {
    results.push(await generateStory(story, tokens))
  }
  const covers = results.map((item) => item.cover)
  const grid = path.join(root, 'content', 'previews', 'current-nine-post-grid.png')
  const contact = path.join(root, 'content', 'previews', 'current-nine-post-contact-sheet.png')
  await makeGridPreview(covers, grid, 3)
  await makeContactSheet(covers, contact)
  const beforeAfter = await makeBeforeAfter(results[0].cover)
  console.log(JSON.stringify({
    status: 'seed_feed_generated',
    runDate,
    stories: results.map((item) => ({ storyId: item.story.storyId, storyDir: path.relative(root, item.dir), qa: item.qa.status })),
    grid: path.relative(root, grid),
    contactSheet: path.relative(root, contact),
    beforeAfter: path.relative(root, beforeAfter),
  }, null, 2))
}

async function runQa() {
  const storiesRoot = path.join(root, 'content', 'stories')
  const dirs = (await fs.readdir(storiesRoot).catch(() => [])).filter((name) => name.startsWith(runDate))
  const reports = []
  for (const dirName of dirs) {
    const dir = path.join(storiesRoot, dirName)
    const brief = JSON.parse(await fs.readFile(path.join(dir, 'brief.json'), 'utf8'))
    const qa = await qaStory(brief, dir)
    await writeJson(path.join(dir, 'qa-report.json'), qa)
    reports.push({ storyDir: path.relative(root, dir), status: qa.status, issues: qa.issues, warnings: qa.warnings })
  }
  console.log(JSON.stringify({ status: reports.some((r) => r.status === 'failed') ? 'failed' : 'passed', reports }, null, 2))
}

if (command === 'generate-meta') await runGenerateMeta()
else if (command === 'seed-feed') await runSeedFeed()
else if (command === 'qa') await runQa()
else {
  console.error(`Unknown command: ${command}`)
  process.exitCode = 1
}
