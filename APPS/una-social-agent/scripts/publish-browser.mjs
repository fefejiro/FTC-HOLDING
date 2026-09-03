import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const env = process.env
const runDate = readArg('--date') || todayInTimeZone()
const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')
const headless = process.argv.includes('--headless') || env.UNA_SOCIAL_HEADLESS === 'true'
const cdpUrl = readArg('--cdp-url') || env.UNA_SOCIAL_CDP_URL || ''
const chromeProfileDirectory = readArg('--chrome-profile-directory') || env.UNA_SOCIAL_CHROME_PROFILE_DIRECTORY || ''
const channels = (readArg('--channels') || env.UNA_SOCIAL_CHANNELS || 'instagram,linkedin')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean)
const profileDir = path.resolve(readArg('--profile-dir') || env.UNA_SOCIAL_BROWSER_PROFILE_DIR || path.join(root, '.browser-profile'))
const browserIdentity = cdpUrl ? `CDP browser at ${redactUrl(cdpUrl)}` : `browser profile: ${profileDir}`
const proofDir = path.join(root, 'content', 'proof', runDate)
const draftDir = path.join(root, 'content', 'drafts', runDate)
const assetDir = path.join(root, 'content', 'assets', runDate)
const assetPath = path.join(assetDir, 'instagram-card.png')
const ledgerPath = path.join(root, 'content', 'ledger', 'social-ledger.jsonl')

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

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8')
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath))
}

async function appendLedger(entry) {
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true })
  await fs.appendFile(ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8')
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function readLedgerEntries() {
  if (!(await exists(ledgerPath))) return []
  const lines = (await readText(ledgerPath)).split(/\r?\n/).filter(Boolean)
  return lines.flatMap((line) => {
    try {
      return [JSON.parse(line)]
    } catch {
      return []
    }
  })
}

async function screenshot(page, name) {
  await fs.mkdir(proofDir, { recursive: true })
  const filePath = path.join(proofDir, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

async function gotoForProof(page, url, timeout = 20000) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
    return { ok: true, url: page.url(), title: await page.title().catch(() => '') }
  } catch (error) {
    return {
      ok: false,
      url: page.url(),
      title: await page.title().catch(() => ''),
      error: String(error?.message || error),
    }
  }
}

function firstWords(text, length = 90) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, length)
}

function linkedinPublicPostUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `https://www.linkedin.com/feed/update/${encodeURIComponent(value)}/`
}

async function clickFirst(page, locators, options = {}) {
  const timeout = options.timeout ?? 5000
  for (const locator of locators) {
    try {
      const target = typeof locator === 'function' ? locator() : locator
      await target.first().waitFor({ state: 'visible', timeout })
      await target.first().click({ timeout })
      return true
    } catch {
      // Keep trying equivalent labels; social UIs vary a lot.
    }
  }
  return false
}

async function pasteIntoFocused(page, text) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A')
  await page.keyboard.insertText(text)
}

async function isLikelyLoginPage(page, platform) {
  const url = page.url()
  if (/\/login|\/accounts\/login|uas\/login/i.test(url)) return true
  const loginVisible = await page.getByRole('button', { name: /^log in|sign in$/i }).first().isVisible({ timeout: 1500 }).catch(() => false)
  const passwordVisible = await page.locator('input[type="password"]').first().isVisible({ timeout: 1500 }).catch(() => false)
  if (loginVisible && passwordVisible) return true
  if (platform === 'linkedin') {
    return page.getByText(/join now|sign in/i).first().isVisible({ timeout: 1500 }).catch(() => false)
  }
  return false
}

async function publishInstagram(context, packageData) {
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.setDefaultNavigationTimeout(20000)
  const username = env.UNA_INSTAGRAM_USERNAME || 'unalabs.cloud'
  const result = {
    channel: 'instagram',
    status: 'started',
    permalink: '',
    proof: {},
    error: '',
  }

  try {
    result.navigation = await gotoForProof(page, 'https://www.instagram.com/')
    result.proof.home = await screenshot(page, 'instagram-home')
    if (await isLikelyLoginPage(page, 'instagram')) {
      throw new Error(`Instagram is not logged in for ${browserIdentity}`)
    }

    if (dryRun) {
      result.status = 'dry_run_ready'
      return result
    }

    let fileChooserPromise = page.waitForEvent('filechooser', { timeout: 15000 }).catch(() => null)
    const clickedCreate = await clickFirst(page, [
      () => page.getByRole('link', { name: /^create$/i }),
      () => page.getByRole('button', { name: /^create$/i }),
      () => page.locator('[aria-label="New post"]'),
      () => page.locator('svg[aria-label="New post"]').locator('xpath=ancestor::*[@role="button" or self::a][1]'),
      () => page.getByText(/^Create$/i),
    ])

    if (!clickedCreate) throw new Error('Could not find Instagram Create button.')

    let fileChooser = await fileChooserPromise
    if (!fileChooser) {
      fileChooserPromise = page.waitForEvent('filechooser', { timeout: 15000 }).catch(() => null)
      await clickFirst(page, [
        () => page.getByRole('button', { name: /select from computer/i }),
        () => page.getByText(/select from computer/i),
      ])
      fileChooser = await fileChooserPromise
    }
    if (!fileChooser) throw new Error('Instagram did not open a file chooser.')

    await fileChooser.setFiles(assetPath)
    result.proof.fileSelected = await screenshot(page, 'instagram-file-selected')

    for (let i = 0; i < 3; i += 1) {
      const clickedNext = await clickFirst(page, [
        () => page.getByRole('button', { name: /^next$/i }),
        () => page.getByText(/^Next$/i),
      ], { timeout: 8000 })
      if (!clickedNext) break
      await page.waitForTimeout(1200)
    }

    const captionBox = page.getByRole('textbox').last()
    await captionBox.waitFor({ state: 'visible', timeout: 15000 })
    await captionBox.click()
    await pasteIntoFocused(page, packageData.instagramCaption)
    result.proof.captionFilled = await screenshot(page, 'instagram-caption-filled')

    const sharedPromise = page.getByText(/your post has been shared|post shared|shared/i).first().waitFor({ state: 'visible', timeout: 45000 }).catch(() => null)
    const shareClicked = await clickFirst(page, [
      () => page.getByRole('button', { name: /^share$/i }),
      () => page.getByText(/^Share$/i),
    ], { timeout: 10000 })
    if (!shareClicked) throw new Error('Could not find Instagram Share button.')

    const sharedSignal = await sharedPromise
    result.proof.afterShare = await screenshot(page, 'instagram-after-share')

    result.profileNavigation = await gotoForProof(page, `https://www.instagram.com/${username}/`)
    await page.waitForTimeout(3000)
    const firstPermalink = await page.locator('a[href^="/p/"], a[href^="/reel/"]').first().getAttribute('href', { timeout: 10000 }).catch(() => '')
    result.proof.profile = await screenshot(page, 'instagram-profile-verify')
    result.permalink = firstPermalink ? new URL(firstPermalink, 'https://www.instagram.com').toString() : ''
    result.status = result.permalink || sharedSignal ? 'posted_verified' : 'posted_unverified'
    return result
  } catch (error) {
    result.status = 'failed'
    result.error = String(error?.message || error)
    result.proof.error = await screenshot(page, 'instagram-error').catch(() => '')
    return result
  } finally {
    await page.close().catch(() => {})
  }
}

async function publishLinkedIn(context, packageData) {
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.setDefaultNavigationTimeout(20000)
  const companySlug = env.UNA_LINKEDIN_COMPANY_SLUG || 'unalabs-cloud'
  const startUrl = env.UNA_LINKEDIN_CREATE_URL || `https://www.linkedin.com/company/${companySlug}/admin/`
  const result = {
    channel: 'linkedin',
    status: 'started',
    url: '',
    proof: {},
    error: '',
  }

  try {
    result.navigation = await gotoForProof(page, startUrl)
    result.proof.home = await screenshot(page, 'linkedin-home')
    if (await isLikelyLoginPage(page, 'linkedin')) {
      throw new Error(`LinkedIn is not logged in for ${browserIdentity}`)
    }

    if (dryRun) {
      result.status = 'dry_run_ready'
      return result
    }

    const clickedStart = await clickFirst(page, [
      () => page.getByRole('button', { name: /start a post|create a post|post/i }),
      () => page.getByText(/start a post|create a post/i),
      () => page.locator('[aria-label*="Start a post" i]'),
    ], { timeout: 12000 })
    if (!clickedStart) throw new Error('Could not find LinkedIn Start/Create post control.')

    const editor = page.locator('[contenteditable="true"]').last()
    await editor.waitFor({ state: 'visible', timeout: 15000 })
    await editor.click()
    await page.keyboard.insertText(packageData.linkedinPost)
    result.proof.postFilled = await screenshot(page, 'linkedin-post-filled')

    const postedSignal = page.getByText(/post successful|your post was published|posted/i).first().waitFor({ state: 'visible', timeout: 45000 }).catch(() => null)
    const postClicked = await clickFirst(page, [
      () => page.getByRole('button', { name: /^post$/i }),
      () => page.locator('button').filter({ hasText: /^Post$/i }),
    ], { timeout: 10000 })
    if (!postClicked) throw new Error('Could not find LinkedIn Post button.')
    await postedSignal
    result.proof.afterPost = await screenshot(page, 'linkedin-after-post')

    const verifyUrl = env.UNA_LINKEDIN_VERIFY_URL || `https://www.linkedin.com/company/${companySlug}/posts/`
    result.verifyNavigation = await gotoForProof(page, verifyUrl)
    await page.waitForTimeout(3000)
    const snippet = firstWords(packageData.linkedinPost, 60)
    const snippetVisible = await page.getByText(snippet, { exact: false }).first().isVisible({ timeout: 10000 }).catch(() => false)
    const postLink = await page.locator('a[href*="/feed/update/urn:li:"]').first().getAttribute('href', { timeout: 5000 }).catch(() => '')
    result.proof.verify = await screenshot(page, 'linkedin-verify')
    result.url = postLink ? new URL(postLink, 'https://www.linkedin.com').toString() : linkedinPublicPostUrl('')
    result.status = snippetVisible || postLink ? 'posted_verified' : 'posted_unverified'
    return result
  } catch (error) {
    result.status = 'failed'
    result.error = String(error?.message || error)
    result.proof.error = await screenshot(page, 'linkedin-error').catch(() => '')
    return result
  } finally {
    await page.close().catch(() => {})
  }
}

async function main() {
  const required = [
    path.join(draftDir, 'topic.json'),
    path.join(draftDir, 'instagram-caption.md'),
    path.join(draftDir, 'linkedin-post.md'),
    assetPath,
  ]
  for (const filePath of required) {
    if (!(await exists(filePath))) throw new Error(`Missing generated package file: ${path.relative(root, filePath)}`)
  }

  const packageData = {
    topic: await readJson(path.join(draftDir, 'topic.json')),
    instagramCaption: await readText(path.join(draftDir, 'instagram-caption.md')),
    linkedinPost: await readText(path.join(draftDir, 'linkedin-post.md')),
  }

  const prior = await readLedgerEntries()
  const alreadyPosted = prior.some((entry) => {
    if (entry.runDate !== runDate) return false
    if (!['posted_verified', 'posted_partial', 'posted_unverified'].includes(entry.status)) return false
    const previousChannels = new Set(entry.channels || Object.keys(entry.channelResults || {}))
    return channels.every((channel) => previousChannels.has(channel))
  })

  if (alreadyPosted && !force) {
    const result = {
      status: 'skipped_already_posted',
      runDate,
      channels,
      message: 'Use --force to attempt another publish for the same date.',
    }
    console.log(JSON.stringify(result, null, 2))
    return
  }

  const plan = {
    runDate,
    dryRun,
    headless,
    cdpUrl: cdpUrl ? redactUrl(cdpUrl) : '',
    profileDir,
    chromeProfileDirectory,
    channels,
    assetPath,
    instagramCaptionPreview: firstWords(packageData.instagramCaption),
    linkedinPostPreview: firstWords(packageData.linkedinPost),
  }
  if (dryRun) {
    await writeJson(path.join(proofDir, 'browser-publish-plan.json'), plan)
  }

  const { chromium } = await import('playwright')
  const browserSession = await openBrowserSession(chromium)
  const context = browserSession.context

  const channelResults = {}
  try {
    if (channels.includes('instagram')) channelResults.instagram = await publishInstagram(context, packageData)
    if (channels.includes('linkedin')) channelResults.linkedin = await publishLinkedIn(context, packageData)
  } finally {
    await browserSession.close().catch(() => {})
  }

  const statuses = Object.values(channelResults).map((item) => item.status)
  const verifiedCount = statuses.filter((status) => status === 'posted_verified' || status === 'dry_run_ready').length
  const failedCount = statuses.filter((status) => status === 'failed').length
  const status = dryRun
    ? (failedCount ? 'dry_run_blocked' : 'dry_run_ready')
    : (verifiedCount === statuses.length ? 'posted_verified' : (verifiedCount > 0 ? 'posted_partial' : 'publish_failed'))

  const entry = {
    id: `una-social-browser-${runDate}-${Date.now()}`,
    runDate,
    status,
    reviewStatus: dryRun ? 'dry_run' : 'posted',
    mode: 'browser',
    channels,
    topic: {
      title: packageData.topic.selected?.title,
      url: packageData.topic.selected?.url,
      sourceName: packageData.topic.selected?.sourceName,
      publishedAt: packageData.topic.selected?.publishedAt,
    },
    postedUrls: {
      ...(channelResults.instagram?.permalink ? { instagram: channelResults.instagram.permalink } : {}),
      ...(channelResults.linkedin?.url ? { linkedin: channelResults.linkedin.url } : {}),
    },
    channelResults,
    proofDir,
    createdAt: new Date().toISOString(),
  }

  await writeJson(path.join(proofDir, 'browser-publish-report.json'), entry)
  if (!dryRun) await appendLedger(entry)
  console.log(JSON.stringify(entry, null, 2))
  if (!dryRun && status === 'publish_failed') process.exitCode = 1
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error))
  process.exitCode = 1
})

function redactUrl(value) {
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`
  } catch {
    return 'configured'
  }
}

async function openBrowserSession(chromium) {
  if (cdpUrl) {
    const browser = await chromium.connectOverCDP(cdpUrl)
    const context = browser.contexts()[0] || await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    })
    return {
      context,
      close: async () => browser.close(),
    }
  }

  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless,
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-search-engine-choice-screen',
      '--disable-blink-features=AutomationControlled',
      ...(chromeProfileDirectory ? [`--profile-directory=${chromeProfileDirectory}`] : []),
    ],
  })
  context.setDefaultTimeout(10000)
  context.setDefaultNavigationTimeout(20000)
  return {
    context,
    close: async () => context.close(),
  }
}
