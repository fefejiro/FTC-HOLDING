import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const runDate = readArg('--date') || todayInTimeZone()
const dryRun = process.argv.includes('--dry-run')
const channels = (readArg('--channels') || 'instagram,linkedin')
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean)

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

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function env(name, fallback = '') {
  return process.env[name] || fallback
}

function requiredEnv(name, errors) {
  const value = env(name)
  if (!value) errors.push(`Missing ${name}`)
  return value
}

function rel(filePath) {
  return path.relative(root, filePath)
}

function publicUrlForAsset(filePath, publicBaseUrl) {
  const relative = rel(filePath).replace(/\\/g, '/')
  return `${publicBaseUrl.replace(/\/+$/, '')}/${relative}`
}

async function instagramImagePaths() {
  const previewDir = path.join(root, 'content', 'previews')
  const slides = [1, 2, 3].map((index) => path.join(previewDir, `regional-news-preview-${runDate}-slide-${index}.png`))
  if (await Promise.all(slides.map(exists)).then((items) => items.every(Boolean))) return slides
  const fallback = path.join(root, 'content', 'assets', runDate, 'instagram-card.png')
  if (await exists(fallback)) return [fallback]
  throw new Error(`No Instagram images found for ${runDate}`)
}

async function linkedinImagePaths() {
  const previewDir = path.join(root, 'content', 'previews')
  const contact = path.join(previewDir, `regional-news-preview-${runDate}.png`)
  if (await exists(contact)) return [contact]
  return instagramImagePaths()
}

async function graphPost(pathname, params) {
  const version = env('META_GRAPH_VERSION', 'v23.0')
  const url = new URL(`https://graph.facebook.com/${version}/${pathname.replace(/^\/+/, '')}`)
  const response = await fetch(url, {
    method: 'POST',
    body: new URLSearchParams(params),
  })
  const text = await response.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = { raw: text }
  }
  if (!response.ok) {
    throw new Error(`Meta Graph API ${pathname} failed: ${response.status} ${JSON.stringify(json)}`)
  }
  return json
}

async function publishInstagram({ caption, imagePaths }) {
  const errors = []
  const accessToken = requiredEnv('META_ACCESS_TOKEN', errors)
  const igUserId = requiredEnv('INSTAGRAM_IG_USER_ID', errors)
  const publicBaseUrl = requiredEnv('UNA_PUBLIC_ASSET_BASE_URL', errors)
  if (errors.length) return { status: 'blocked_missing_config', errors }

  const imageUrls = imagePaths.map((imagePath) => publicUrlForAsset(imagePath, publicBaseUrl))
  if (dryRun) {
    return {
      status: 'dry_run_ready',
      note: 'Instagram API is configured. Dry run did not create media containers.',
      igUserId,
      imageUrls,
      captionPreview: caption.slice(0, 220),
    }
  }

  const childContainers = []
  for (const imageUrl of imageUrls) {
    const child = await graphPost(`/${igUserId}/media`, {
      image_url: imageUrl,
      is_carousel_item: 'true',
      access_token: accessToken,
    })
    childContainers.push(child.id)
  }

  const carousel = await graphPost(`/${igUserId}/media`, {
    media_type: 'CAROUSEL',
    children: childContainers.join(','),
    caption,
    access_token: accessToken,
  })

  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: carousel.id,
    access_token: accessToken,
  })

  return {
    status: 'posted_api',
    igUserId,
    imageUrls,
    childContainers,
    carouselContainerId: carousel.id,
    publishedMediaId: published.id,
  }
}

async function linkedinApi(pathname, options = {}) {
  const token = env('LINKEDIN_ACCESS_TOKEN')
  const version = env('LINKEDIN_VERSION', '202606')
  const headers = {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': version,
    'X-Restli-Protocol-Version': '2.0.0',
    ...options.headers,
  }
  const response = await fetch(`https://api.linkedin.com${pathname}`, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  })
  const text = await response.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  if (!response.ok) {
    throw new Error(`LinkedIn API ${pathname} failed: ${response.status} ${JSON.stringify(json)}`)
  }
  return { json, headers: Object.fromEntries(response.headers.entries()) }
}

async function uploadLinkedinImage(imagePath, ownerUrn) {
  const init = await linkedinApi('/rest/images?action=initializeUpload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: ownerUrn,
      },
    }),
  })
  const value = init.json.value || init.json
  const uploadUrl = value.uploadUrl
  const imageUrn = value.image
  if (!uploadUrl || !imageUrn) throw new Error(`LinkedIn image initializeUpload response missing uploadUrl/image: ${JSON.stringify(init.json)}`)

  const bytes = await fs.readFile(imagePath)
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env('LINKEDIN_ACCESS_TOKEN')}`,
      'Content-Type': 'application/octet-stream',
    },
    body: bytes,
  })
  if (!uploadResponse.ok) {
    throw new Error(`LinkedIn image upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`)
  }
  return imageUrn
}

async function publishLinkedin({ post, imagePaths }) {
  const errors = []
  const accessToken = requiredEnv('LINKEDIN_ACCESS_TOKEN', errors)
  const organizationId = requiredEnv('LINKEDIN_ORGANIZATION_ID', errors)
  if (errors.length) return { status: 'blocked_missing_config', errors }

  const ownerUrn = `urn:li:organization:${organizationId}`
  if (dryRun) {
    return {
      status: 'dry_run_ready',
      note: 'LinkedIn API is configured. Dry run did not upload images or create a post.',
      ownerUrn,
      imagePaths: imagePaths.map(rel),
      postPreview: post.slice(0, 260),
      tokenPresent: Boolean(accessToken),
    }
  }

  const imageUrns = []
  for (const imagePath of imagePaths.slice(0, 9)) {
    imageUrns.push(await uploadLinkedinImage(imagePath, ownerUrn))
  }

  const content = imageUrns.length
    ? { media: { id: imageUrns[0] } }
    : undefined

  const response = await linkedinApi('/rest/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      author: ownerUrn,
      commentary: post,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
      ...(content ? { content } : {}),
    }),
  })

  return {
    status: 'posted_api',
    ownerUrn,
    imageUrns,
    postId: response.headers['x-restli-id'] || response.json.id || null,
    response: response.json,
  }
}

async function main() {
  const draftDir = path.join(root, 'content', 'drafts', runDate)
  const proofDir = path.join(root, 'content', 'proof', runDate)
  const reportPath = path.join(proofDir, 'api-social-post-report.json')

  const topic = await readJson(path.join(draftDir, 'topic.json'))
  const instagramCaption = (await readText(path.join(draftDir, 'instagram-caption.md'))).trim()
  const linkedinPost = (await readText(path.join(draftDir, 'linkedin-post.md'))).trim()
  const igImages = await instagramImagePaths()
  const liImages = await linkedinImagePaths()

  const results = {}
  if (channels.includes('instagram')) results.instagram = await publishInstagram({ caption: instagramCaption, imagePaths: igImages })
  if (channels.includes('linkedin')) results.linkedin = await publishLinkedin({ post: linkedinPost, imagePaths: liImages })

  const statuses = Object.values(results).map((item) => item.status)
  const status = statuses.every((item) => item === 'posted_api')
    ? 'posted_api'
    : statuses.every((item) => item === 'dry_run_ready')
      ? 'dry_run_ready'
      : 'blocked'

  const report = {
    id: `una-social-api-${runDate}-${Date.now()}`,
    runDate,
    mode: 'api',
    dryRun,
    channels,
    status,
    topic: topic.selected || {},
    results,
    createdAt: new Date().toISOString(),
  }

  await writeJson(reportPath, report)
  console.log(JSON.stringify(report, null, 2))
  process.exitCode = status === 'blocked' ? 1 : 0
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error))
  process.exitCode = 1
})
