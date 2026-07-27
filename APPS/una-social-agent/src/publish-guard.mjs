import { humanizeCaption, selectUniqueAssets, validateSlideCopy } from './editorial-quality.mjs';

const REQUIRED_REGIONS = ['africa', 'north-america', 'rest-of-world'];

function key(value = '') {
  return String(value).trim().toLowerCase().replace(/[_\s]+/g, '-');
}

export function prepareCarouselForPublish(run, { recentFingerprints = [] } = {}) {
  const failures = [];
  const slides = Array.isArray(run?.slides) ? run.slides : [];

  const regionMap = new Map(slides.map((slide) => [key(slide.region), slide]));
  for (const region of REQUIRED_REGIONS) {
    if (!regionMap.has(region)) failures.push(`missing_region:${region}`);
  }
  if (slides.length !== 3) failures.push(`expected_3_slides:received_${slides.length}`);

  const candidateAssets = slides.map((slide) => ({
    ...slide.asset,
    region: slide.region,
    qualityScore: slide.asset?.qualityScore ?? slide.imageEvaluation?.overallScore,
    storyAlignment: slide.asset?.storyAlignment ?? slide.imageEvaluation?.storyAlignment
  }));
  const assetResult = selectUniqueAssets(candidateAssets, { required: 3, recentFingerprints });
  if (!assetResult.ok) failures.push(`insufficient_unique_assets:${assetResult.missing}`);

  const normalizedSlides = slides.map((slide) => {
    const copy = validateSlideCopy(slide);
    if (!copy.ok) failures.push(...copy.errors.map((error) => `${key(slide.region)}:${error}`));
    return {
      ...slide,
      headline: copy.headline,
      deck: copy.deck,
      summary: copy.deck
    };
  });

  const instagramCaption = humanizeCaption(run?.captions?.instagram || '');
  const linkedinCaption = humanizeCaption(run?.captions?.linkedin || '');
  if (!instagramCaption) failures.push('instagram_caption_missing');
  if (!linkedinCaption) failures.push('linkedin_caption_missing');

  return {
    publishable: failures.length === 0,
    failures: [...new Set(failures)],
    slides: normalizedSlides,
    assets: assetResult.selected,
    rejectedAssets: assetResult.rejected,
    captions: {
      instagram: instagramCaption,
      linkedin: linkedinCaption
    }
  };
}

export function assertPublishable(run, options) {
  const result = prepareCarouselForPublish(run, options);
  if (!result.publishable) {
    const error = new Error(`Publish blocked: ${result.failures.join(', ')}`);
    error.code = 'UNA_SOCIAL_PUBLISH_BLOCKED';
    error.details = result;
    throw error;
  }
  return result;
}
