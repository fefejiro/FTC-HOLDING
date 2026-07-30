import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assetIdentities,
  entryHasPublishedResult,
  normalizePublishedUrl,
  storyIdentities,
} from '../src/publication-history.mjs'

test('tracking parameters do not make a published story look new', () => {
  assert.equal(
    normalizePublishedUrl('https://www.example.com/story/?utm_source=rss&utm_campaign=daily'),
    'https://example.com/story',
  )
})

test('published story identities include every regional source', () => {
  const identities = storyIdentities({
    topic: { title: 'Daily brief', url: 'https://example.com/north' },
    sources: [
      { title: 'Africa story', url: 'https://example.com/africa?utm_source=rss' },
      { title: 'World story', url: 'https://example.com/world' },
    ],
    contentId: 'evergreen-tip-one',
  })
  assert.ok(identities.has('url:https://example.com/africa'))
  assert.ok(identities.has('title:world story'))
  assert.ok(identities.has('content:evergreen tip one'))
})

test('asset identities span all successfully posted channels', () => {
  const identities = assetIdentities({
    results: {
      instagram: {
        status: 'posted_verified',
        assetProof: {
          imageHashes: ['rendered-a'],
          rawImageHashes: ['raw-a'],
          sourceUrls: ['https://www.example.com/photo/?utm_source=feed'],
        },
      },
      linkedin: {
        status: 'publish_blocked',
        assetProof: { imageHashes: ['blocked-image'] },
      },
    },
  })
  assert.ok(identities.has('hash:rendered-a'))
  assert.ok(identities.has('raw:raw-a'))
  assert.ok(identities.has('source:https://example.com/photo'))
  assert.equal(identities.has('hash:blocked-image'), false)
})

test('blocked runs are not treated as published history', () => {
  assert.equal(entryHasPublishedResult({ status: 'publish_blocked', results: {} }), false)
  assert.equal(
    entryHasPublishedResult({ status: 'publish_blocked', results: { instagram: { status: 'posted_unverified' } } }),
    true,
  )
})
