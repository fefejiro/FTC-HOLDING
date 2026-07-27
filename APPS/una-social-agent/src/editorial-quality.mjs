import { createHash } from 'node:crypto';

const ELLIPSIS_RE = /(?:\.{3}|…)+\s*$/u;
const AI_CLICHES = [
  /\b(ai is changing|technology is changing|moving fast|game[- ]changer|revolutioni[sz]ing)\b/i,
  /\bin today'?s (?:fast[- ]paced|digital) world\b/i,
  /\bunlock(?:ing)? the (?:power|potential)\b/i,
  /\bthe future is here\b/i
];

function clean(value = '') {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function assetFingerprint(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return '';
  return createHash('sha256').update(buffer).digest('hex');
}

export function sanitizeHeadline(value, { maxWords = 13, maxChars = 78 } = {}) {
  let text = clean(value)
    .replace(ELLIPSIS_RE, '')
    .replace(/[.:;,\-–—]+\s*$/u, '')
    .replace(/^(breaking|exclusive|just in)\s*[:|-]\s*/i, '');

  const words = text.split(' ').filter(Boolean);
  if (words.length > maxWords) text = words.slice(0, maxWords).join(' ');
  if (text.length > maxChars) {
    text = text.slice(0, maxChars + 1).replace(/\s+\S*$/, '').trim();
  }
  return text.replace(/[.:;,\-–—]+\s*$/u, '').trim();
}

export function sanitizeDeck(value, { maxWords = 34, maxChars = 210 } = {}) {
  let text = clean(value)
    .replace(ELLIPSIS_RE, '')
    .replace(/\bwhy it matters:\s*/i, '')
    .replace(/\s+[.…]{2,}$/u, '');
  for (const phrase of AI_CLICHES) text = text.replace(phrase, '').replace(/^[,.;:\s]+/, '');

  const sentences = text.match(/[^.!?]+[.!?]?/g) || [];
  text = clean(sentences.slice(0, 2).join(' '));
  const words = text.split(' ').filter(Boolean);
  if (words.length > maxWords) text = words.slice(0, maxWords).join(' ');
  if (text.length > maxChars) text = text.slice(0, maxChars + 1).replace(/\s+\S*$/, '').trim();
  return text.replace(/[.…]{2,}$/u, '').replace(/[,:;\-–—]+\s*$/u, '').trim();
}

export function humanizeCaption(value) {
  let text = clean(value);
  for (const phrase of AI_CLICHES) text = text.replace(phrase, '');
  return clean(text)
    .replace(/\bdelve(?:s|d)?\b/gi, 'look')
    .replace(/\bleverage(?:s|d|ing)?\b/gi, 'use')
    .replace(/\butili[sz]e(?:s|d|ing)?\b/gi, 'use')
    .replace(/\bseamless(?:ly)?\b/gi, 'smooth')
    .replace(/\s+([,.!?])/g, '$1');
}

export function buildEditorialImagePrompt(story) {
  const subject = clean(story.primarySubject || story.headline);
  const action = clean(story.subjectAction || 'being used in a real operational setting');
  const environment = clean(story.environment || 'a credible contemporary workplace');
  const signals = (story.technologySignals || story.visibleObjects || []).map(clean).filter(Boolean).slice(0, 6);
  const context = (story.regionalContext || []).map(clean).filter(Boolean).slice(0, 4);

  return [
    'Premium editorial technology photograph, art-directed for a respected international business magazine.',
    `Primary subject: ${subject}.`,
    `Show ${action} inside ${environment}.`,
    signals.length ? `Visible, story-specific details: ${signals.join(', ')}.` : '',
    context.length ? `Use restrained, authentic regional context: ${context.join(', ')}.` : '',
    'Natural human posture and believable equipment. Documentary realism with deliberate Photoshop-style art direction, strong composition, subtle texture, controlled contrast, and realistic lighting.',
    'The scene must explain the news without relying on the headline. Leave a calm text-safe area in the lower third.',
    'No words, logos, watermarks, fake interface text, generic AI brain, robot head, floating holograms, duplicated people, distorted hands, cartoon illustration, clip-art, plastic skin, or generic stock-photo posing.'
  ].filter(Boolean).join(' ');
}

export function selectUniqueAssets(candidates, { required = 3, recentFingerprints = [] } = {}) {
  const used = new Set(recentFingerprints.filter(Boolean));
  const selected = [];
  const rejected = [];

  for (const candidate of candidates || []) {
    const fingerprint = clean(candidate.fingerprint || (candidate.buffer ? assetFingerprint(candidate.buffer) : ''));
    const problems = [];
    if (!fingerprint) problems.push('missing_fingerprint');
    if (!candidate.path && !candidate.url && !candidate.buffer) problems.push('missing_asset');
    if (candidate.placeholder || candidate.fallback === 'blank') problems.push('placeholder_asset');
    if (candidate.width && candidate.width < 1000) problems.push('low_resolution');
    if (candidate.height && candidate.height < 700) problems.push('low_resolution');
    if (fingerprint && used.has(fingerprint)) problems.push('duplicate_asset');
    if (Number(candidate.qualityScore || 0) < 78) problems.push('quality_below_78');
    if (Number(candidate.storyAlignment || 0) < 80) problems.push('story_alignment_below_80');

    if (problems.length) {
      rejected.push({ ...candidate, rejectionReasons: problems });
      continue;
    }
    used.add(fingerprint);
    selected.push({ ...candidate, fingerprint });
    if (selected.length === required) break;
  }

  return {
    ok: selected.length === required,
    selected,
    rejected,
    missing: Math.max(0, required - selected.length)
  };
}

export function validateSlideCopy(slide) {
  const headline = sanitizeHeadline(slide.headline);
  const deck = sanitizeDeck(slide.deck || slide.summary);
  const errors = [];
  if (!headline) errors.push('headline_missing');
  if (!deck) errors.push('deck_missing');
  if (ELLIPSIS_RE.test(clean(slide.headline))) errors.push('headline_trailing_ellipsis');
  if (ELLIPSIS_RE.test(clean(slide.deck || slide.summary))) errors.push('deck_trailing_ellipsis');
  if (headline.split(' ').length > 13) errors.push('headline_too_long');
  if (deck.split(' ').length > 34) errors.push('deck_too_long');
  return { ok: errors.length === 0, headline, deck, errors };
}
