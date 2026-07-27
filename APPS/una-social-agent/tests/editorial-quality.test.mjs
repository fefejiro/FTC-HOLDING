import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEditorialImagePrompt,
  sanitizeDeck,
  sanitizeHeadline,
  selectUniqueAssets
} from '../src/editorial-quality.mjs';
import { prepareCarouselForPublish } from '../src/publish-guard.mjs';

test('headline never ends with an ellipsis or broken fragment', () => {
  assert.equal(
    sanitizeHeadline('Airtel Money Kenya chief exits months before planned London listing...'),
    'Airtel Money Kenya chief exits months before planned London listing'
  );
});

test('deck removes boilerplate and trailing ellipsis', () => {
  const result = sanitizeDeck('Why it matters: AI is changing fast. The company announced the move days before...');
  assert.equal(result, 'The company announced the move days before');
});

test('duplicate, blank and weak images are rejected', () => {
  const result = selectUniqueAssets([
    { path: 'a.png', fingerprint: 'same', qualityScore: 90, storyAlignment: 90, width: 1080, height: 1080 },
    { path: 'b.png', fingerprint: 'same', qualityScore: 92, storyAlignment: 91, width: 1080, height: 1080 },
    { path: 'blank.png', fingerprint: 'blank', placeholder: true, qualityScore: 99, storyAlignment: 99, width: 1080, height: 1080 },
    { path: 'c.png', fingerprint: 'third', qualityScore: 70, storyAlignment: 90, width: 1080, height: 1080 }
  ], { required: 3 });
  assert.equal(result.ok, false);
  assert.equal(result.selected.length, 1);
  assert.ok(result.rejected.some((item) => item.rejectionReasons.includes('duplicate_asset')));
  assert.ok(result.rejected.some((item) => item.rejectionReasons.includes('placeholder_asset')));
});

test('prompt asks for magazine-grade story-specific editorial photography', () => {
  const prompt = buildEditorialImagePrompt({
    headline: 'Aurora expands weather forecasting',
    primarySubject: 'an operational Earth-system forecasting model',
    subjectAction: 'a meteorologist interpreting probabilistic storm forecasts',
    environment: 'a modern forecasting centre',
    technologySignals: ['satellite cloud imagery', 'pressure layers', 'renewable-energy forecasts']
  });
  assert.match(prompt, /respected international business magazine/i);
  assert.match(prompt, /satellite cloud imagery/i);
  assert.match(prompt, /No words, logos, watermarks/i);
});

test('publishing is blocked unless all three regions have unique premium assets', () => {
  const run = {
    slides: [
      slide('Africa', 'a'),
      slide('North America', 'b'),
      slide('Rest of World', 'b')
    ],
    captions: { instagram: 'Three stories worth watching today.', linkedin: 'A closer look at three material technology shifts.' }
  };
  const result = prepareCarouselForPublish(run);
  assert.equal(result.publishable, false);
  assert.ok(result.failures.some((failure) => failure.startsWith('insufficient_unique_assets')));
});

function slide(region, fingerprint) {
  return {
    region,
    headline: `${region} technology story earns attention`,
    deck: 'A concrete development with a clear operational consequence for businesses and builders.',
    asset: {
      path: `${fingerprint}.png`,
      fingerprint,
      qualityScore: 90,
      storyAlignment: 90,
      width: 1080,
      height: 1080
    }
  };
}
