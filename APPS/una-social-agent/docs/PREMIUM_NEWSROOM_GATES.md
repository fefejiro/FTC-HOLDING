# Una Social Premium Newsroom Gates

This change adds a hard pre-publish contract for the Una Labs regional newsroom.

## Required integration point

The existing local newsroom runner should call `assertPublishable(run, options)` immediately after slide rendering and before any Instagram or LinkedIn browser action.

```js
import { assertPublishable } from './src/publish-guard.mjs';

const approved = assertPublishable(renderedRun, {
  recentFingerprints: proofLedger.recentImageFingerprints || []
});

await publishInstagram({
  slides: approved.slides,
  assets: approved.assets,
  caption: approved.captions.instagram
});
```

A blocked run must be recorded as `quality_hold`, not silently replaced with a blank image, an old image, or a repeated image.

## Publish-blocking conditions

- anything other than exactly three regional slides;
- Africa, North America, or Rest of World missing;
- missing, blank, placeholder, low-resolution, low-quality, or weakly aligned image;
- duplicate image inside the carousel;
- reuse of an image fingerprint from the configured recent-post window;
- trailing ellipsis or clipped copy;
- headline longer than 13 words;
- deck longer than 34 words;
- missing Instagram or LinkedIn caption.

## Image generation contract

Use `buildEditorialImagePrompt(story)` after the story-facts and visual-brief stages. It produces a story-first prompt intended for premium magazine-grade editorial photography. The image model must create the image only. Typography and Una Labs branding remain deterministic renderer responsibilities.

Do not publish an image-generation failure. Retry with evaluator feedback, then hold the run when no qualifying asset exists.

## Proof ledger additions

Store these fields per slide:

```json
{
  "assetFingerprint": "sha256",
  "qualityScore": 0,
  "storyAlignment": 0,
  "rejectionReasons": [],
  "copyValidation": {
    "headline": "",
    "deck": "",
    "errors": []
  }
}
```

Keep at least the last 30 published fingerprints for reuse prevention.
