/**
 * Result Card Layout and Spacing Optimization
 * Improves visual hierarchy and removes crowding
 */

export const RESULT_CARD_SPACING = {
  // Vertical spacing between major sections
  majorSectionGapPx: 24,

  // Vertical spacing between minor elements
  minorSectionGapPx: 16,

  // Padding for card container
  cardPaddingPx: 20,

  // Padding for individual sections
  sectionPaddingPx: 16,

  // Artwork sizing
  artworkSizePx: 240,
  artworkCornerRadiusPx: 12,

  // Title and artist sizing
  titleFontSizePx: 24,
  titleLineHeightPx: 32,
  titleMarginBottomPx: 8,

  artistFontSizePx: 16,
  artistLineHeightPx: 24,
  artistMarginBottomPx: 12,

  // Badge row sizing
  badgeRowGapPx: 8,
  badgeRowMarginBottomPx: 16,

  // Section header sizing
  sectionHeaderFontSizePx: 14,
  sectionHeaderLineHeightPx: 20,
  sectionHeaderMarginBottomPx: 12,
  sectionHeaderColorOpacity: 0.7,

  // Button sizing
  buttonHeightPx: 48,
  buttonCornerRadiusPx: 12,
  buttonGroupGapPx: 12,
  buttonGroupMarginTopPx: 24,

  // Lyric section text sizing
  lyricFontSizePx: 16,
  lyricLineHeightPx: 24,
  lyricMarginBottomPx: 8,

  // Meaning section text sizing
  meaningFontSizePx: 15,
  meaningLineHeightPx: 22,
  meaningMarginBottomPx: 8,

  // Loading state sizing
  skeletonHeightPx: 12,
  skeletonCornerRadiusPx: 4,
};

/**
 * Calculate dynamic spacing based on screen width
 * Reduces gaps on small screens
 */
export function getResponsiveSpacing(screenWidthPx: number) {
  const isMobileSmall = screenWidthPx < 375;
  const scaleFactor = isMobileSmall ? 0.85 : 1;

  return {
    majorSectionGapPx: Math.round(RESULT_CARD_SPACING.majorSectionGapPx * scaleFactor),
    minorSectionGapPx: Math.round(RESULT_CARD_SPACING.minorSectionGapPx * scaleFactor),
    cardPaddingPx: Math.round(RESULT_CARD_SPACING.cardPaddingPx * scaleFactor),
    sectionPaddingPx: Math.round(RESULT_CARD_SPACING.sectionPaddingPx * scaleFactor),
    buttonHeightPx: RESULT_CARD_SPACING.buttonHeightPx,
    buttonCornerRadiusPx: RESULT_CARD_SPACING.buttonCornerRadiusPx,
    buttonGroupGapPx: Math.round(RESULT_CARD_SPACING.buttonGroupGapPx * scaleFactor),
  };
}

/**
 * Section layout modes for progressive rendering
 */
export type SectionLayoutMode = 'loading' | 'loaded' | 'error' | 'stalled';

/**
 * Get height estimation for section based on mode
 * Used for calculating scroll position and layout transitions
 */
export function estimateSectionHeightPx(
  mode: SectionLayoutMode,
  contentLengthChars?: number,
): number {
  switch (mode) {
    case 'loading':
      return 60; // Placeholder skeleton height

    case 'stalled':
      return 40; // Minimal height for "still loading" state

    case 'error':
      return 50; // Error message height

    case 'loaded':
      if (!contentLengthChars) return 100;
      // Rough estimate: 16px font, 24px line height, ~50 chars per line
      const estimatedLines = Math.ceil(contentLengthChars / 50);
      const estimatedHeightPx = 20 + estimatedLines * 24; // +20 for header
      return Math.max(estimatedHeightPx, 100);

    default:
      return 100;
  }
}

/**
 * Language tag (chip) sizing and layout
 */
export const LANGUAGE_TAG_SPACING = {
  containerMarginTopPx: 16,
  containerMarginBottomPx: 0,
  chipHeightPx: 32,
  chipPaddingHorizontalPx: 12,
  chipMarginPx: 6,
  chipBorderRadiusPx: 16,
  chipFontSizePx: 13,
  chipLineHeightPx: 16,
  maxVisibleChips: 3,
  moreChipsIndicatorFontSizePx: 12,
};

/**
 * Calculate visible chips and overflow count
 */
export function calculateChipsLayout(
  totalChips: number,
  containerWidthPx: number,
): { visibleCount: number; overflowCount: number } {
  const avgChipWidthPx = 60;
  const gaps = (totalChips - 1) * LANGUAGE_TAG_SPACING.chipMarginPx * 2;
  const maxChipsForWidth = Math.floor(
    (containerWidthPx - gaps) / (avgChipWidthPx + LANGUAGE_TAG_SPACING.chipMarginPx * 2),
  );

  const visibleCount = Math.min(maxChipsForWidth, LANGUAGE_TAG_SPACING.maxVisibleChips);
  const overflowCount = Math.max(0, totalChips - visibleCount);

  return { visibleCount, overflowCount };
}

/**
 * Button layout configurations
 */
export type ButtonLayoutConfig = {
  variant: 'primary' | 'secondary' | 'tertiary';
  fullWidth?: boolean;
  isLoading?: boolean;
};

/**
 * Get button styling based on config
 */
export function getButtonStyle(
  config: ButtonLayoutConfig,
  screenWidthPx: number,
): {
  widthPercent?: number;
  marginHorizontalPx?: number;
} {
  if (config.fullWidth) {
    return {
      widthPercent: 100,
    };
  }

  // On mobile, buttons stack; on tablet, buttons split
  const isMobile = screenWidthPx < 600;
  if (isMobile) {
    return { widthPercent: 100 };
  }

  return {
    widthPercent: 48, // Side by side with gap
    marginHorizontalPx: RESULT_CARD_SPACING.buttonGroupGapPx / 2,
  };
}

/**
 * Result card progressive loading order
 * Defines sequence in which sections become visible
 */
export const PROGRESSIVE_LOAD_ORDER = [
  'artwork',
  'title-artist',
  'match-badges',
  'lyrics-header',
  'lyrics-content',
  'meaning-header',
  'meaning-content',
  'buttons',
] as const;

export type ProgressiveLoadPhase = (typeof PROGRESSIVE_LOAD_ORDER)[number];

/**
 * Get delay before each section should attempt to appear
 */
export function getProgressiveLoadDelayMs(phase: ProgressiveLoadPhase): number {
  const baseDelay = 0;
  const stepDelay = 100;

  const phaseIndex = PROGRESSIVE_LOAD_ORDER.indexOf(phase);
  return baseDelay + phaseIndex * stepDelay;
}

/**
 * Calculate safe bottom padding for result card
 * Ensures buttons/content not hidden behind nav/keyboard
 */
export function getSafeAreaBottomPaddingPx(
  screenHeightPx: number,
  keyboardHeightPx?: number,
  tabBarHeightPx?: number,
): number {
  const keyboardPadding = keyboardHeightPx ? keyboardHeightPx + 16 : 0;
  const tabBarPadding = tabBarHeightPx ? tabBarHeightPx + 8 : 0;

  return Math.max(keyboardPadding, tabBarPadding, 20); // Minimum 20px
}

/**
 * Check if content likely fits in viewport without scrolling
 */
export function willContentFit(
  contentHeightPx: number,
  viewportHeightPx: number,
  safeAreaPaddingPx: number,
): boolean {
  const availableHeightPx = viewportHeightPx - safeAreaPaddingPx;
  return contentHeightPx <= availableHeightPx;
}
