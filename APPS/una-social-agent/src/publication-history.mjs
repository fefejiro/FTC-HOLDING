import fs from 'node:fs/promises'
import path from 'node:path'

export function normalizePublishedUrl(value = '') {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(key)) url.searchParams.delete(key)
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    url.pathname = url.pathname.replace(/\/+$/, '') || '/'
    return url.toString().replace(/\?$/, '')
  } catch {
    return raw.toLowerCase()
  }
}

export function normalizePublishedText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function entryHasPublishedResult(entry = {}) {
  if (entry.dryRun) return false
  if (String(entry.status || '').startsWith('posted')) return true
  return Object.values(entry.results || {}).some((result) => String(result?.status || '').startsWith('posted'))
}

export function storyIdentities(entry = {}) {
  const identities = new Set()
  const addUrl = (value) => {
    const normalized = normalizePublishedUrl(value)
    if (normalized) identities.add(`url:${normalized}`)
  }
  const addTitle = (value) => {
    const normalized = normalizePublishedText(value)
    if (normalized) identities.add(`title:${normalized}`)
  }

  addUrl(entry.topic?.url)
  addTitle(entry.topic?.title)
  for (const source of entry.sources || []) {
    addUrl(source?.url)
    addTitle(source?.title)
  }
  if (entry.contentId) identities.add(`content:${normalizePublishedText(entry.contentId)}`)
  return identities
}

export function assetIdentities(entry = {}) {
  const identities = new Set()
  for (const result of Object.values(entry.results || {})) {
    if (!String(result?.status || '').startsWith('posted')) continue
    const proof = result.assetProof || {}
    for (const hash of proof.imageHashes || []) if (hash) identities.add(`hash:${String(hash).toLowerCase()}`)
    for (const hash of proof.rawImageHashes || []) if (hash) identities.add(`raw:${String(hash).toLowerCase()}`)
    for (const sourceUrl of proof.sourceUrls || []) {
      const normalized = normalizePublishedUrl(sourceUrl)
      if (normalized) identities.add(`source:${normalized}`)
    }
  }
  for (const slide of entry.slides || []) {
    if (slide.assetFingerprint) identities.add(`hash:${String(slide.assetFingerprint).toLowerCase()}`)
    if (slide.slideFingerprint) identities.add(`hash:${String(slide.slideFingerprint).toLowerCase()}`)
    if (slide.rawFingerprint) identities.add(`raw:${String(slide.rawFingerprint).toLowerCase()}`)
    const normalized = normalizePublishedUrl(slide.assetSourceUrl)
    if (normalized) identities.add(`source:${normalized}`)
  }
  return identities
}

export async function readPublishedEntries(root) {
  const ledgerPath = path.join(root, 'content', 'ledger', 'social-ledger.jsonl')
  let text = ''
  try {
    text = await fs.readFile(ledgerPath, 'utf8')
  } catch {
    return []
  }
  const entries = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const entry = JSON.parse(line)
      if (entryHasPublishedResult(entry)) entries.push(entry)
    } catch {
      // Historical ledger lines are best-effort.
    }
  }
  return entries
}

export async function loadPublishedStoryIdentities(root) {
  const identities = new Set()
  for (const entry of await readPublishedEntries(root)) {
    for (const identity of storyIdentities(entry)) identities.add(identity)
  }
  return identities
}

export async function loadPublishedAssetIdentities(root) {
  const identities = new Set()
  for (const entry of await readPublishedEntries(root)) {
    for (const identity of assetIdentities(entry)) identities.add(identity)
  }
  return identities
}
