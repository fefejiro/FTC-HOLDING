import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assetFingerprint,
  buildEditorialImagePrompt,
  sanitizeDeck,
  sanitizeHeadline,
  selectUniqueAssets,
  validateSlideCopy,
} from '../src/editorial-quality.mjs'
import {
  assertPublishable,
  assertSingleSlidePublishable,
  prepareCarouselForPublish,
  prepareSingleSlideForPublish,
  publishApprovedRun,
} from '../src/publish-guard.mjs'

test('three unique valid images pass', () => {
  const result = prepareCarouselForPublish(validRun())
  assert.equal(result.publishable, true)
  assert.equal(result.assets.length, 3)
})

test('two identical images fail', () => {
  const result = prepareCarouselForPublish(validRun(['a', 'b', 'b']))
  assert.equal(result.publishable, false)
  assert.ok(result.failures.some((failure) => failure.startsWith('insufficient_unique_assets')))
})

test('same bytes with different filenames fail', () => {
  const buffer = Buffer.from('same image bytes')
  const same = assetFingerprint(buffer)
  const result = selectUniqueAssets([
    validAsset({ path: 'first.png', fingerprint: same }),
    validAsset({ path: 'second.png', fingerprint: same }),
    validAsset({ path: 'third.png', fingerprint: 'third' }),
  ])
  assert.equal(result.ok, false)
  assert.ok(result.rejected.some((item) => item.path === 'second.png' && item.rejectionReasons.includes('duplicate_asset')))
})

test('recent 30-post window fingerprint fails', () => {
  const result = prepareCarouselForPublish(validRun(['a', 'b', 'c']), { recentFingerprints: ['b'] })
  assert.equal(result.publishable, false)
  assert.ok(result.rejectedAssets.some((asset) => asset.rejectionReasons.includes('duplicate_asset')))
})

test('missing image fails', () => {
  const result = selectUniqueAssets([validAsset({ exists: false, missing: true })])
  assert.equal(result.ok, false)
  assert.ok(result.rejected[0].rejectionReasons.includes('missing_image'))
})

test('blank fallback fails', () => {
  const result = selectUniqueAssets([validAsset({ placeholder: true, fallback: 'blank' })])
  assert.equal(result.ok, false)
  assert.ok(result.rejected[0].rejectionReasons.includes('blank_or_placeholder_asset'))
})

test('deterministic fallback asset fails', () => {
  const result = selectUniqueAssets([validAsset({ fallbackUsed: true, imageModel: 'deterministic-technical-composition' })])
  assert.equal(result.ok, false)
  assert.ok(result.rejected[0].rejectionReasons.includes('fallback_asset'))
})

test('low-resolution image fails', () => {
  const result = selectUniqueAssets([validAsset({ width: 999, height: 699 })])
  assert.equal(result.ok, false)
  assert.ok(result.rejected[0].rejectionReasons.includes('low_resolution'))
})

test('quality score below 78 fails', () => {
  const result = selectUniqueAssets([validAsset({ qualityScore: 77 })])
  assert.equal(result.ok, false)
  assert.ok(result.rejected[0].rejectionReasons.includes('quality_below_78'))
})

test('story alignment below 80 fails', () => {
  const result = selectUniqueAssets([validAsset({ storyAlignment: 79 })])
  assert.equal(result.ok, false)
  assert.ok(result.rejected[0].rejectionReasons.includes('story_alignment_below_80'))
})

test('editorial credibility below 75 fails', () => {
  const result = selectUniqueAssets([validAsset({ editorialCredibility: 74 })])
  assert.equal(result.ok, false)
  assert.ok(result.rejected[0].rejectionReasons.includes('editorial_credibility_below_75'))
})

test('stock and AI artifact risk fail closed', () => {
  const result = selectUniqueAssets([
    validAsset({ fingerprint: 'stock', genericStockRisk: 35 }),
    validAsset({ fingerprint: 'artifact', aiArtifactRisk: 20 }),
  ])
  assert.equal(result.ok, false)
  assert.ok(result.rejected.some((item) => item.rejectionReasons.includes('generic_stock_risk_too_high')))
  assert.ok(result.rejected.some((item) => item.rejectionReasons.includes('ai_artifact_risk_too_high')))
})

test('missing region fails', () => {
  const run = validRun()
  run.slides[0].region = ''
  const result = prepareCarouselForPublish(run)
  assert.equal(result.publishable, false)
  assert.ok(result.failures.includes('missing_region:africa'))
})

test('four slides fail', () => {
  const run = validRun()
  run.slides.push(validSlide('Europe', 'd'))
  const result = prepareCarouselForPublish(run)
  assert.equal(result.publishable, false)
  assert.ok(result.failures.includes('expected_3_slides:received_4'))
})

test('two slides fail', () => {
  const run = validRun()
  run.slides.pop()
  const result = prepareCarouselForPublish(run)
  assert.equal(result.publishable, false)
  assert.ok(result.failures.includes('expected_3_slides:received_2'))
})

test('single-slide rescue can approve one strong slide from a failed carousel', () => {
  const run = validRun(['a', 'a', 'c'])
  const full = prepareCarouselForPublish(run)
  assert.equal(full.publishable, false)
  const rescue = assertSingleSlidePublishable(run)
  assert.equal(rescue.mode, 'single_slide_rescue')
  assert.equal(rescue.slides.length, 1)
  assert.equal(rescue.assets.length, 1)
})

test('single-slide rescue still fails when no image clears quality', () => {
  const run = validRun()
  for (const slide of run.slides) slide.asset.qualityScore = 60
  const rescue = prepareSingleSlideForPublish(run)
  assert.equal(rescue.publishable, false)
  assert.ok(rescue.failures.includes('no_single_slide_rescue_candidate'))
})

test('trailing ellipsis is removed', () => {
  assert.equal(
    sanitizeHeadline('Airtel Money Kenya chief exits months before planned London listing...'),
    'Airtel Money Kenya chief exits months before planned London listing',
  )
})

test('long headline is shortened cleanly', () => {
  const headline = sanitizeHeadline('This is a very long technology headline that keeps going past the limit and should not end badly')
  assert.ok(headline.length <= 78)
  assert.ok(headline.split(' ').length <= 13)
  assert.doesNotMatch(headline, /(?:and|with|for|to)$/i)
})

test('long deck ends as a complete thought', () => {
  const deck = sanitizeDeck('The company announced a long update about AI systems, operator review, team workflows, policy checks, compliance reviews, and')
  assert.ok(deck.length <= 210)
  assert.doesNotMatch(deck, /\b(and|or|but|with|for|to)$/i)
})

test('empty Instagram caption fails', () => {
  const run = validRun()
  run.captions.instagram = ''
  const result = prepareCarouselForPublish(run)
  assert.equal(result.publishable, false)
  assert.ok(result.failures.includes('instagram_caption_missing'))
})

test('empty LinkedIn caption fails', () => {
  const run = validRun()
  run.captions.linkedin = ''
  const result = prepareCarouselForPublish(run)
  assert.equal(result.publishable, false)
  assert.ok(result.failures.includes('linkedin_caption_missing'))
})

test('a blocked run never calls either publishing adapter', async () => {
  let calls = 0
  await assert.rejects(
    publishApprovedRun(validRun(['a', 'a', 'c']), {
      publishInstagram: async () => { calls += 1 },
      publishLinkedIn: async () => { calls += 1 },
    }),
    /Publish blocked/,
  )
  assert.equal(calls, 0)
})

test('a successful run calls both publishing adapters with normalized captions', async () => {
  const calls = []
  await publishApprovedRun(validRun(), {
    publishInstagram: async (payload) => calls.push(['instagram', payload.caption]),
    publishLinkedIn: async (payload) => calls.push(['linkedin', payload.caption]),
  })
  assert.deepEqual(calls.map(([name]) => name), ['instagram', 'linkedin'])
})

test('publishable runs expose three image fingerprints for persistence', () => {
  const approved = assertPublishable(validRun())
  assert.deepEqual(approved.assets.map((asset) => asset.fingerprint), ['a', 'b', 'c'])
})

test('prompt asks for image-only magazine-grade story-specific editorial photography', () => {
  const prompt = buildEditorialImagePrompt({
    headline: 'Aurora expands weather forecasting',
    primarySubject: 'an operational Earth-system forecasting model',
    subjectAction: 'a meteorologist interpreting probabilistic storm forecasts',
    environment: 'a modern forecasting centre',
    technologySignals: ['satellite cloud imagery', 'pressure layers', 'renewable-energy forecasts'],
  })
  assert.match(prompt, /respected international business magazine/i)
  assert.match(prompt, /satellite cloud imagery/i)
  assert.match(prompt, /Do not include words, logos, watermarks/i)
})

test('copy validation removes vague filler from decks', () => {
  const copy = validateSlideCopy({
    region: 'Africa',
    headline: 'A concrete AI story',
    deck: 'Why it matters: daily operations, decision support.',
  })
  assert.equal(copy.deck, '')
  assert.ok(copy.errors.includes('deck_missing'))
})

function validRun(fingerprints = ['a', 'b', 'c']) {
  return {
    slides: [
      validSlide('Africa', fingerprints[0]),
      validSlide('North America', fingerprints[1]),
      validSlide('Rest of World', fingerprints[2]),
    ],
    captions: {
      instagram: 'Today in tech, from three places that matter. Sources: OpenAI News, TechCabal, Rest of World #TechNews',
      linkedin: 'A useful tech update today from three regions. Sources: OpenAI News, TechCabal, Rest of World.',
    },
  }
}

function validSlide(region, fingerprint) {
  return {
    region,
    category: 'AI News',
    headline: `${region} technology story earns attention`,
    deck: 'A concrete development with a clear operational consequence for businesses and builders.',
    asset: validAsset({ path: `${fingerprint}.png`, fingerprint }),
  }
}

function validAsset(overrides = {}) {
  return {
    path: 'asset.png',
    fingerprint: 'asset',
    qualityScore: 90,
    storyAlignment: 90,
    editorialCredibility: 86,
    genericStockRisk: 20,
    aiArtifactRisk: 10,
    width: 1080,
    height: 1350,
    ...overrides,
  }
}
