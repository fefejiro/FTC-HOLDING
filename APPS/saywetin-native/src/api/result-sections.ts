/**
 * Phase 2b: Per-Section Result Hydration
 * Provides independent fetch functions for lyrics, meaning, and cultural analysis
 * Each section can be refetched independently with proper error handling
 */

import type { CulturalAnalysisEntry } from '../state/ritual-state';
import { getApiBaseUrl } from './config';

// ============================================================================
// Type Definitions
// ============================================================================

export type LyricSectionResult = {
  lyric: string;
  source: 'backend' | 'fallback' | 'unavailable';
};

export type MeaningSectionResult = {
  meaning: string;
  culturalAnalyses: CulturalAnalysisEntry[];
};

export type SectionError = {
  code:
    | 'network_error'
    | 'timeout'
    | 'not_found'
    | 'server_error'
    | 'parse_error'
    | 'unavailable';
  message: string;
  statusCode?: number;
};

// ============================================================================
// Configuration
// ============================================================================

const FETCH_TIMEOUT_MS = 8000;
const RETRY_ATTEMPTS = 2;

// ============================================================================
// Type Guards & Utilities
// ============================================================================

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message?.toLowerCase() || '';
    return msg.includes('network') || msg.includes('fetch') || msg.includes('failed');
  }
  if (err instanceof Error) {
    const msg = err.message?.toLowerCase() || '';
    return msg.includes('network') || msg.includes('timeout') || msg.includes('abort');
  }
  return false;
}

function isTimeoutError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message?.toLowerCase() || '';
    return msg.includes('timeout') || msg.includes('abort');
  }
  return false;
}

async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`HTTP_404`);
      }
      if (response.status >= 500) {
        throw new Error(`HTTP_${response.status}`);
      }
      throw new Error(`HTTP_${response.status}`);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new Error('PARSE_ERROR');
    }
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// ============================================================================
// Lyric Section Fetching
// ============================================================================

type RecognizedTrackResponse = {
  track?: {
    id: string;
    title: string;
    artist: string;
    genre?: string | null;
  };
  lyrics?: {
    text?: string;
  } | null;
  culturalAnalysis?: Array<{
    translation?: string;
    culturalContext?: string;
    deeperMeaning?: string;
  }> | null;
};

/**
 * Fetch lyrics for a track from the backend
 * Falls back to fallback-unavailable gracefully on network issues
 */
export async function fetchLyricSection(trackId: string): Promise<LyricSectionResult | SectionError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/recognized-tracks/${encodeURIComponent(trackId)}`;

  try {
    console.log('[result-sections] lyric fetch start', { url });

    const data = await fetchWithTimeout<RecognizedTrackResponse>(url, {}, FETCH_TIMEOUT_MS);

    console.log('[result-sections] lyric fetch success', {
      hasLyrics: Boolean(data?.lyrics?.text),
      lyricsLen: data?.lyrics?.text?.length ?? 0,
    });

    const lyricText = (data?.lyrics?.text || '').trim();

    if (!lyricText) {
      return {
        code: 'unavailable',
        message: 'Lyrics not available from backend. Open Live Lyrics to search.',
      };
    }

    return {
      lyric: lyricText,
      source: 'backend',
    };
  } catch (err) {
    console.error('[result-sections] lyric fetch error', {
      message: err instanceof Error ? err.message : String(err),
    });

    if (isTimeoutError(err)) {
      return {
        code: 'timeout',
        message: 'Lyrics request timed out. Check your connection and retry.',
      };
    }

    if (isNetworkError(err)) {
      return {
        code: 'network_error',
        message: 'Connection issue. Check your network.',
      };
    }

    const errorMsg = err instanceof Error ? err.message : String(err);

    if (errorMsg.includes('404')) {
      return {
        code: 'not_found',
        message: 'Lyrics not available from backend. Open Live Lyrics to search.',
      };
    }

    if (errorMsg.includes('5')) {
      return {
        code: 'server_error',
        message: 'Backend service unavailable. Please try again.',
      };
    }

    if (errorMsg.includes('PARSE')) {
      return {
        code: 'parse_error',
        message: 'Invalid response from backend. Please retry.',
      };
    }

    return {
      code: 'unavailable',
      message: 'Failed to load lyrics. Try again?',
    };
  }
}

// ============================================================================
// Meaning Section Fetching
// ============================================================================

/**
 * Fetch meaning and cultural analysis for a track
 * Gracefully handles missing cultural context
 */
export async function fetchMeaningSection(trackId: string): Promise<MeaningSectionResult | SectionError> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/recognized-tracks/${encodeURIComponent(trackId)}`;

  try {
    console.log('[result-sections] meaning fetch start', { url });

    const data = await fetchWithTimeout<RecognizedTrackResponse>(url, {}, FETCH_TIMEOUT_MS);

    console.log('[result-sections] meaning fetch success', {
      analysisCount: data?.culturalAnalysis?.length ?? 0,
    });

    const rawAnalyses = data?.culturalAnalysis ?? [];

    // Normalize cultural analyses
    const analyses: CulturalAnalysisEntry[] = rawAnalyses
      .filter((entry) => entry)
      .map((entry) => ({
        translation: (entry?.translation || '').trim(),
        culturalContext: (entry?.culturalContext || '').trim(),
        deeperMeaning: (entry?.deeperMeaning || '').trim(),
      }));

    if (analyses.length === 0) {
      return {
        code: 'unavailable',
        message: 'Meaning analysis not available yet. Check Live Lyrics for context.',
      };
    }

    return {
      meaning: '',
      culturalAnalyses: analyses,
    };
  } catch (err) {
    console.error('[result-sections] meaning fetch error', {
      message: err instanceof Error ? err.message : String(err),
    });

    if (isTimeoutError(err)) {
      return {
        code: 'timeout',
        message: 'Meaning request timed out. Check your connection and retry.',
      };
    }

    if (isNetworkError(err)) {
      return {
        code: 'network_error',
        message: 'Connection issue. Check your network.',
      };
    }

    const errorMsg = err instanceof Error ? err.message : String(err);

    if (errorMsg.includes('404')) {
      return {
        code: 'not_found',
        message: 'Meaning analysis not available. Check Live Lyrics for context.',
      };
    }

    if (errorMsg.includes('5')) {
      return {
        code: 'server_error',
        message: 'Backend service unavailable. Please try again.',
      };
    }

    return {
      code: 'unavailable',
      message: 'Failed to load meaning. Try again?',
    };
  }
}

// ============================================================================
// Helper: Check if result is error
// ============================================================================

export function isSectionError(result: unknown): result is SectionError {
  return (
    typeof result === 'object' &&
    result !== null &&
    'code' in result &&
    'message' in result &&
    ['network_error', 'timeout', 'not_found', 'server_error', 'parse_error', 'unavailable'].includes(
      (result as any).code,
    )
  );
}
