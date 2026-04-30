import type { MatchSource, RitualTrack } from '../state/ritual-state';
import * as FileSystem from 'expo-file-system/legacy';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

type ListenResponse = {
  success: boolean;
  sessionId?: string;
  recognizedTrack?: {
    id: string;
    title: string;
    artist: string;
    album?: string | null;
    duration?: string | null;
    genre?: string | null;
    spotifyId?: string | null;
    youtubeId?: string | null;
    confidenceScore?: number | null;
    coverArtUrl?: string | null;
    matchSource?: string | null;
    // Timing model fields (scaffold)
    listenStartedAtMs?: number;
    listenEndedAtMs?: number;
    sampleMidpointAtMs?: number;
    recognitionReceivedAtMs?: number;
    resultShownAtMs?: number;
    providerSongOffsetMs?: number;
    calculatedDisplayOffsetMs?: number;
  };
  matchSource?: string | null;
  confidence?: number | null;
  error?: string;
  errorCode?: string;
};

type RecognizedTrackDetailResponse = {
  track: {
    id: string;
    title: string;
    artist: string;
    album?: string | null;
    releaseYear?: number | null;
    genre?: string | null;
    confidenceScore?: number | null;
    coverArtUrl?: string | null;
    spotifyId?: string | null;
    youtubeId?: string | null;
  };
  lyrics?: {
    text?: string;
  } | null;
  culturalAnalysis?: Array<{
    translation?: string;
    culturalContext?: string;
    deeperMeaning?: string;
  }>;
};

function normalizeExternalUrl(url: string, fallbackUrl: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return fallbackUrl;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^spotify:/i.test(trimmed)) {
    const trackId = trimmed.split(':').pop();
    return trackId ? `https://open.spotify.com/track/${trackId}` : fallbackUrl;
  }

  if (/^youtube:/i.test(trimmed)) {
    const videoId = trimmed.split(':').pop();
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : fallbackUrl;
  }

  return fallbackUrl;
}

function resolveSpotifyUrl(spotifyId: string | null | undefined, fallbackSearchUrl: string) {
  const value = (spotifyId || '').trim();
  if (!value) {
    return fallbackSearchUrl;
  }

  if (/^https?:\/\//i.test(value) || /^spotify:/i.test(value)) {
    return normalizeExternalUrl(value, fallbackSearchUrl);
  }

  return `https://open.spotify.com/track/${encodeURIComponent(value)}`;
}

function resolveYoutubeUrl(youtubeId: string | null | undefined, fallbackSearchUrl: string) {
  const value = (youtubeId || '').trim();
  if (!value) {
    return fallbackSearchUrl;
  }

  if (/^https?:\/\//i.test(value)) {
    return normalizeExternalUrl(value, fallbackSearchUrl);
  }

  if (/^youtube:/i.test(value)) {
    return normalizeExternalUrl(value, fallbackSearchUrl);
  }

  return `https://www.youtube.com/watch?v=${encodeURIComponent(value)}`;
}

function buildTrackLinks(title: string, artist: string, spotifyId?: string | null, youtubeId?: string | null) {
  const searchQuery = encodeURIComponent(`${artist} ${title}`.trim());
  const spotifySearchUrl = `https://open.spotify.com/search/${searchQuery}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
  const spotifyUrl = resolveSpotifyUrl(spotifyId, spotifySearchUrl);
  const youtubeUrl = resolveYoutubeUrl(youtubeId, youtubeSearchUrl);

  return { spotifyUrl, youtubeUrl };
}

function normalizeMatchSource(value?: string | null): MatchSource {
  const v = (value || '').toLowerCase().trim();
  if (v === 'acrcloud' || v === 'ai_transcript' || v === 'lyric_text' || v === 'manual' || v === 'spotify') {
    return v;
  }
  return 'unknown';
}

function mapRecognizedTrack(
  recognized: NonNullable<ListenResponse['recognizedTrack']>,
  matchSource: MatchSource,
): RitualTrack {
  const links = buildTrackLinks(
    recognized.title,
    recognized.artist,
    recognized.spotifyId,
    recognized.youtubeId,
  );

  return {
    id: recognized.id,
    title: recognized.title,
    artist: recognized.artist,
    year: 'Live',
    albumArt: recognized.coverArtUrl ?? '',
    matchConfidence: Math.max(0, Math.min(100, Number(recognized.confidenceScore ?? 0))),
    matchedInMs: 0,
    lyric: '',
    meaning: '',
    spotifyUrl: links.spotifyUrl,
    youtubeUrl: links.youtubeUrl,
    chips: recognized.genre ? [recognized.genre] : [],
    syncedLyrics: [],
    matchSource,
    culturalAnalyses: [],
  };
}

function firstNonEmptyLine(text?: string) {
  if (!text) {
    return '';
  }

  const line = text
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.length > 0);

  return line || '';
}

function mergeDetailedTrack(base: RitualTrack, detail: RecognizedTrackDetailResponse): RitualTrack {
  const { track, lyrics, culturalAnalysis } = detail;
  const links = buildTrackLinks(base.title, base.artist, track.spotifyId, track.youtubeId);

  const fullLyrics = (lyrics?.text || '').trim();
  const analyses = (culturalAnalysis ?? []).map((entry) => ({
    translation: (entry.translation || '').trim(),
    culturalContext: (entry.culturalContext || '').trim(),
    deeperMeaning: (entry.deeperMeaning || '').trim(),
  }));
  const firstAnalysis = analyses[0];
  const meaningText =
    firstAnalysis?.deeperMeaning ||
    firstAnalysis?.culturalContext ||
    firstAnalysis?.translation ||
    base.meaning;

  return {
    ...base,
    year: track.releaseYear ? String(track.releaseYear) : base.year,
    albumArt: track.coverArtUrl || base.albumArt,
    matchConfidence: Math.max(0, Math.min(100, Number(track.confidenceScore ?? base.matchConfidence))),
    lyric: fullLyrics || base.lyric,
    meaning: meaningText || base.meaning,
    chips: track.genre ? [track.genre] : base.chips,
    spotifyUrl: links.spotifyUrl,
    youtubeUrl: links.youtubeUrl,
    culturalAnalyses: analyses.length > 0 ? analyses : base.culturalAnalyses,
  };
}

export async function uploadListenSample(
  recordingUri: string,
  durationMs: number,
): Promise<RitualTrack> {
  if (!apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is missing');
  }

  const startedAt = Date.now();

  // Use expo-file-system uploadAsync instead of fetch+FormData.
  // RN's fetch FormData with `file://` uri is unreliable on Android
  // (intermittent "Network request failed"). uploadAsync goes through
  // native HTTP and handles the file stream correctly.
  const uploadUrl = `${apiBaseUrl}/api/listen`;
  console.log('[listen] upload begin', { url: uploadUrl, uri: recordingUri, durationMs });
  let uploadResult: FileSystem.FileSystemUploadResult;
  try {
    const uploadPromise = FileSystem.uploadAsync(uploadUrl, recordingUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'audio',
      mimeType: 'audio/mp4',
      parameters: { duration: String(durationMs) },
    });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('upload timeout after 30s')), 30000);
    });
    uploadResult = (await Promise.race([uploadPromise, timeoutPromise])) as FileSystem.FileSystemUploadResult;
    console.log('[listen] upload done', {
      status: uploadResult.status,
      bodyLen: uploadResult.body?.length ?? 0,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err: any) {
    console.warn('[listen] upload threw:', err?.message || String(err));
    throw new Error(`Listen upload failed: ${err?.message || String(err)}`);
  }

  let payload: ListenResponse;
  try {
    payload = JSON.parse(uploadResult.body) as ListenResponse;
  } catch {
    throw new Error('Listen API returned non-JSON response');
  }

  const ok = uploadResult.status >= 200 && uploadResult.status < 300;
  if (!ok || !payload.success || !payload.recognizedTrack) {
    throw new Error(payload.error || 'Could not identify song');
  }

  const matchSource = normalizeMatchSource(
    payload.recognizedTrack.matchSource ?? payload.matchSource ?? 'acrcloud',
  );
  const baseTrack = {
    ...mapRecognizedTrack(payload.recognizedTrack, matchSource),
    matchedInMs: Date.now() - startedAt,
  };

  try {
    const detailUrl = `${apiBaseUrl}/api/recognized-tracks/${encodeURIComponent(payload.recognizedTrack.id)}`;
    const fetchDetail = async () => {
      console.log('[listen] detail fetch begin', detailUrl);
      const detailResponse = await fetch(detailUrl);
      console.log('[listen] detail fetch status', detailResponse.status);
      if (!detailResponse.ok) return null;
      const detail = (await detailResponse.json()) as RecognizedTrackDetailResponse;
      console.log('[listen] detail fetch payload', {
        hasLyrics: Boolean(detail?.lyrics?.text),
        lyricsLen: detail?.lyrics?.text?.length ?? 0,
        analysisCount: detail?.culturalAnalysis?.length ?? 0,
      });
      return detail;
    };

    let detail = await fetchDetail();
    // Backend sometimes returns empty lyrics on first fetch (race with enrichment).
    // Retry once after a short delay before falling back to the bare track.
    if (detail && (!detail.lyrics?.text || (detail.culturalAnalysis?.length ?? 0) === 0)) {
      await new Promise((r) => setTimeout(r, 1500));
      const retry = await fetchDetail();
      if (retry && (retry.lyrics?.text || (retry.culturalAnalysis?.length ?? 0) > 0)) {
        detail = retry;
      }
    }

    if (detail) {
      return { ...mergeDetailedTrack(baseTrack, detail), matchedInMs: Date.now() - startedAt };
    }
  } catch (err: any) {
    console.warn('[listen] detail fetch threw:', err?.message || String(err));
  }

  return baseTrack;
}

export type IdentifyByTextError = Error & { code?: string };

export async function identifyByText(query: string): Promise<RitualTrack> {
  if (!apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is missing');
  }

  const trimmed = query.trim();
  if (trimmed.length < 3) {
    const err = new Error('Type at least 3 characters of a lyric or phrase.') as IdentifyByTextError;
    err.code = 'QUERY_TOO_SHORT';
    throw err;
  }

  const startedAt = Date.now();
  const response = await fetch(`${apiBaseUrl}/api/identify-by-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: trimmed }),
  });

  let payload: ListenResponse;
  try {
    payload = (await response.json()) as ListenResponse;
  } catch {
    throw new Error('Identify-by-text returned non-JSON response');
  }

  if (!response.ok || !payload.success || !payload.recognizedTrack) {
    const err = new Error(payload.error || 'Could not match that lyric') as IdentifyByTextError;
    err.code = payload.errorCode;
    throw err;
  }

  const matchSource = normalizeMatchSource(
    payload.recognizedTrack.matchSource ?? payload.matchSource ?? 'lyric_text',
  );
  const baseTrack = {
    ...mapRecognizedTrack(payload.recognizedTrack, matchSource),
    matchedInMs: Date.now() - startedAt,
  };

  try {
    const detailResponse = await fetch(
      `${apiBaseUrl}/api/recognized-tracks/${encodeURIComponent(payload.recognizedTrack.id)}`,
    );

    if (detailResponse.ok) {
      const detail = (await detailResponse.json()) as RecognizedTrackDetailResponse;
      return { ...mergeDetailedTrack(baseTrack, detail), matchedInMs: Date.now() - startedAt };
    }
  } catch {
    // ignore
  }

  return baseTrack;
}
