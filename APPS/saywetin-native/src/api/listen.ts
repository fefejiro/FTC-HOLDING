import type { MatchSource, RitualTrack, ResolvedSpotifyLink, ResolvedYoutubeLink } from '../state/ritual-state';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const railWayFallbackBaseUrl = 'https://saywetin-api-production.up.railway.app';

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
    spotifyUrl?: string | null;
    youtubeUrl?: string | null;
    youtube?: {
      videoId?: string | null;
      url?: string | null;
      title?: string | null;
      channelTitle?: string | null;
      source?: string | null;
    } | null;
    confidenceScore?: number | null;
    coverArtUrl?: string | null;
    matchSource?: string | null;
    matchedOffsetMs?: number | null;
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
    matchedOffsetMs?: number | null;
    playOffsetMs?: number | null;
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

function resolveSpotifyUrl(
  spotifyId: string | null | undefined,
  spotifyUrl: string | null | undefined,
  fallbackSearchUrl: string,
) {
  const explicitUrl = (spotifyUrl || '').trim();
  if (explicitUrl) {
    return normalizeExternalUrl(explicitUrl, fallbackSearchUrl);
  }

  const value = (spotifyId || '').trim();
  if (!value) {
    return fallbackSearchUrl;
  }

  if (/^https?:\/\//i.test(value) || /^spotify:/i.test(value)) {
    return normalizeExternalUrl(value, fallbackSearchUrl);
  }

  return `https://open.spotify.com/track/${encodeURIComponent(value)}`;
}

function resolveYoutubeUrl(
  youtubeId: string | null | undefined,
  youtubeUrl: string | null | undefined,
  fallbackSearchUrl: string,
) {
  const explicitUrl = (youtubeUrl || '').trim();
  if (explicitUrl) {
    return normalizeExternalUrl(explicitUrl, fallbackSearchUrl);
  }

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

function extractSpotifyTrackId(input: string | null | undefined) {
  const value = (input || '').trim();
  if (!value) {
    return null;
  }

  const trackPathMatch = value.match(/track\/([a-zA-Z0-9]+)/);
  if (trackPathMatch?.[1]) {
    return trackPathMatch[1];
  }

  if (value.startsWith('spotify:track:')) {
    return value.split(':').pop() || null;
  }

  return /^[a-zA-Z0-9]+$/.test(value) ? value : null;
}

function extractYoutubeVideoId(input: string | null | undefined) {
  const value = (input || '').trim();
  if (!value) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{6,}$/.test(value) && !value.includes('http')) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '') || null;
    }
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

function normalizeYoutubeSource(
  source: string | null | undefined,
  hasDirectVideo: boolean,
): ResolvedYoutubeLink['source'] {
  const value = (source || '').toLowerCase().trim();
  if (value === 'official' || value === 'vevo' || value === 'topic') {
    return value;
  }
  if (!hasDirectVideo) {
    return 'search_fallback';
  }
  return 'unknown';
}

function buildTrackLinks(
  title: string,
  artist: string,
  spotifyId?: string | null,
  youtubeId?: string | null,
  spotifyUrl?: string | null,
  youtubeUrl?: string | null,
  youtubeMeta?: ListenResponse['recognizedTrack'] extends infer T
    ? T extends { youtube?: infer Y }
      ? Y
      : never
    : never,
) {
  const searchQuery = encodeURIComponent(`${artist} ${title}`.trim());
  const spotifySearchUrl = `https://open.spotify.com/search/${searchQuery}`;
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
  const resolvedSpotifyUrl = resolveSpotifyUrl(spotifyId, spotifyUrl, spotifySearchUrl);
  const resolvedYoutubeUrl = resolveYoutubeUrl(youtubeId, youtubeUrl, youtubeSearchUrl);

  const spotifyTrackId =
    extractSpotifyTrackId(spotifyId) ||
    extractSpotifyTrackId(spotifyUrl) ||
    extractSpotifyTrackId(resolvedSpotifyUrl);
  const youtubeVideoId =
    extractYoutubeVideoId(youtubeMeta?.videoId) ||
    extractYoutubeVideoId(youtubeId) ||
    extractYoutubeVideoId(youtubeMeta?.url) ||
    extractYoutubeVideoId(youtubeUrl) ||
    extractYoutubeVideoId(resolvedYoutubeUrl);

  const spotify: ResolvedSpotifyLink = {
    trackId: spotifyTrackId,
    uri: spotifyTrackId ? `spotify:track:${spotifyTrackId}` : null,
    url: resolvedSpotifyUrl,
    source: spotifyTrackId ? 'direct' : 'search_fallback',
  };

  const youtube: ResolvedYoutubeLink = {
    videoId: youtubeVideoId,
    url: youtubeVideoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}` : resolvedYoutubeUrl,
    title: youtubeMeta?.title?.trim() || null,
    channelTitle: youtubeMeta?.channelTitle?.trim() || null,
    source: normalizeYoutubeSource(youtubeMeta?.source, Boolean(youtubeVideoId)),
  };

  return { spotifyUrl: resolvedSpotifyUrl, youtubeUrl: resolvedYoutubeUrl, spotify, youtube };
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
    recognized.spotifyUrl,
    recognized.youtubeUrl,
    recognized.youtube,
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
    spotify: links.spotify,
    youtube: links.youtube,
    chips: recognized.genre ? [recognized.genre] : [],
    syncedLyrics: [],
    lyricsAnchorOffsetMs:
      typeof recognized.matchedOffsetMs === 'number' && Number.isFinite(recognized.matchedOffsetMs)
        ? Math.max(0, recognized.matchedOffsetMs)
        : 0,
    matchSource,
    recognitionSource: matchSource === 'lyric_text' ? 'text_query' : 'microphone',
    culturalAnalyses: [],
    matchedSongOffsetMs:
      typeof recognized.matchedOffsetMs === 'number' && Number.isFinite(recognized.matchedOffsetMs)
        ? Math.max(0, recognized.matchedOffsetMs)
        : 0,
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

  const matchedOffsetMs =
    typeof track.matchedOffsetMs === 'number' && Number.isFinite(track.matchedOffsetMs)
      ? track.matchedOffsetMs
      : typeof track.playOffsetMs === 'number' && Number.isFinite(track.playOffsetMs)
        ? track.playOffsetMs
        : base.lyricsAnchorOffsetMs;

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
    spotify: links.spotify,
    youtube: links.youtube,
    lyricsAnchorOffsetMs: Math.max(0, matchedOffsetMs || 0),
    matchedSongOffsetMs: Math.max(0, matchedOffsetMs || 0),
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

  const baseCandidates = [apiBaseUrl];
  if (apiBaseUrl !== railWayFallbackBaseUrl) {
    baseCandidates.push(railWayFallbackBaseUrl);
  }

  const form = new FormData();
  form.append('audio', {
    uri: recordingUri,
    type: 'audio/mp4',
    name: 'recording.m4a',
  } as unknown as Blob);
  form.append('duration', String(durationMs));

  let uploadResponse: Response | null = null;
  let lastNetworkError: unknown = null;

  for (const baseUrl of baseCandidates) {
    const uploadUrl = `${baseUrl}/api/listen`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    console.log('[listen] upload begin', { url: uploadUrl, uri: recordingUri, durationMs });
    try {
      uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log('[listen] upload done', {
        url: uploadUrl,
        status: uploadResponse.status,
        elapsedMs: Date.now() - startedAt,
      });
      break;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastNetworkError = err;
      console.warn('[listen] upload threw:', {
        url: uploadUrl,
        message: err?.message || String(err),
      });
    }
  }

  if (!uploadResponse) {
    throw new Error(`Listen upload failed: ${(lastNetworkError as any)?.message || String(lastNetworkError)}`);
  }

  let payload: ListenResponse;
  try {
    payload = (await uploadResponse.json()) as ListenResponse;
  } catch {
    throw new Error('Listen API returned non-JSON response');
  }

  if (!uploadResponse.ok || !payload.success || !payload.recognizedTrack) {
    throw new Error(payload.error || 'Could not identify song');
  }

  const matchSource = normalizeMatchSource(
    payload.recognizedTrack.matchSource ?? payload.matchSource ?? 'acrcloud',
  );
  const recognitionReceivedAt = Date.now();
  const baseTrack = {
    ...mapRecognizedTrack(payload.recognizedTrack, matchSource),
    matchedInMs: recognitionReceivedAt - startedAt,
    listenStartedAtMs: startedAt,
    recognitionStartedAtMs: startedAt,
    recognitionEndedAtMs: recognitionReceivedAt,
    recognitionReceivedAtMs: recognitionReceivedAt,
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

    // Do not block the first result screen too long; enrich only if quick.
    const detail = await Promise.race<RecognizedTrackDetailResponse | null>([
      fetchDetail(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 900)),
    ]);

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
    recognitionStartedAtMs: startedAt,
    recognitionEndedAtMs: Date.now(),
    recognitionReceivedAtMs: Date.now(),
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
