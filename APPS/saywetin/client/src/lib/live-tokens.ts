/**
 * Design tokens for the SayWetin Live Lyrics feature.
 * Centralised here so all three screens (LiveLyricsPage, TapExplainSheet,
 * MeaningDetailScreen) and the MiniPlayer overlay share a single source
 * of truth instead of repeating inline CSS strings.
 */

export const LIVE_COLORS = {
  /** Deep dark background — primary canvas colour */
  obsidian: '#0A0A0F',
  /** Slightly lighter surface layer */
  obsidian2: '#14131A',
  /** Signature violet — hue-shiftable via CSS variable if needed */
  violet: 'oklch(0.72 0.18 272)',
  /** Violet with 14% opacity — used for washed card backgrounds */
  violetWash: 'oklch(0.72 0.18 272 / 0.14)',
  /** Violet with 35% opacity — used for bordered/edge highlights */
  violetEdge: 'oklch(0.72 0.18 272 / 0.35)',
  /** Mint green — live indicator dot */
  mint: '#7AD6A5',
  /** Amber — sync-warning banners and alternates flag */
  amber: '#E8B84C',
  /** Sheet backdrop overlay */
  sheetOverlay: 'rgba(10,10,15,0.55)',
} as const;

export const LIVE_MOTION = {
  /** CSS transition timing for highlighted lyric line scroll/shift */
  lyricEase: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
  /** Duration (ms) for lyric line transitions */
  lyricDurationMs: 400,
  /** Duration (ms) for the TapExplainSheet slide-up */
  sheetDurationMs: 320,
  /** CSS transition string ready to use in style={{ transition }} */
  lyricTransition: 'all 400ms cubic-bezier(0.2, 0.7, 0.3, 1)',
  sheetTransition: 'transform 320ms cubic-bezier(0.2, 0.7, 0.3, 1)',
} as const;
