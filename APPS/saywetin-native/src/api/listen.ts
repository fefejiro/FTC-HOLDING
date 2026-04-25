import type { MatchSource, RitualTrack } from '../state/ritual-state';

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
    matchedInMs: 1400,
    lyric: 'Tap Follow live lyrics to decode line-by-line meaning.',
    meaning: 'This match came from live listening. Open Live Lyrics for contextual breakdown.',
    spotifyUrl: links.spotifyUrl,
    youtubeUrl: links.youtubeUrl,
    chips: [recognized.genre || 'Recognized live', 'Now playing'],
    syncedLyrics: [],
    matchSource,
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

  const firstLine = firstNonEmptyLine(lyrics?.text);
  const firstAnalysis = culturalAnalysis && culturalAnalysis.length > 0 ? culturalAnalysis[0] : undefined;
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
    lyric: firstLine || base.lyric,
    meaning: meaningText,
    chips: [track.genre || 'Recognized live', 'Now playing'],
    spotifyUrl: links.spotifyUrl,
    youtubeUrl: links.youtubeUrl,
  };
}

export async function uploadListenSample(
  recordingUri: string,
  durationMs: number,
): Promise<RitualTrack> {
  if (!apiBaseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is missing');
  }

  const body = new FormData();
  body.append('duration', String(durationMs));
  body.append('audio', {
    uri: recordingUri,
    name: 'recording.m4a',
    type: 'audio/mp4',
  } as any);

  const response = await fetch(`${apiBaseUrl}/api/listen`, {
    method: 'POST',
    body,
  });

  let payload: ListenResponse;
  try {
    payload = (await response.json()) as ListenResponse;
  } catch {
    throw new Error('Listen API returned non-JSON response');
  }

  if (!response.ok || !payload.success || !payload.recognizedTrack) {
    throw new Error(payload.error || 'Could not identify song');
  }

  const matchSource = normalizeMatchSource(
    payload.recognizedTrack.matchSource ?? payload.matchSource ?? 'acrcloud',
  );
  const baseTrack = mapRecognizedTrack(payload.recognizedTrack, matchSource);

  try {
    const detailResponse = await fetch(
      `${apiBaseUrl}/api/recognized-tracks/${encodeURIComponent(payload.recognizedTrack.id)}`,
    );

    if (detailResponse.ok) {
      const detail = (await detailResponse.json()) as RecognizedTrackDetailResponse;
      return mergeDetailedTrack(baseTrack, detail);
    }
  } catch {
    // Fall back to base recognition metadata if detail endpoint fails.
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
  const baseTrack = mapRecognizedTrack(payload.recognizedTrack, matchSource);

  try {
    const detailResponse = await fetch(
      `${apiBaseUrl}/api/recognized-tracks/${encodeURIComponent(payload.recognizedTrack.id)}`,
    );

    if (detailResponse.ok) {
      const detail = (await detailResponse.json()) as RecognizedTrackDetailResponse;
      return mergeDetailedTrack(baseTrack, detail);
    }
  } catch {
    // ignore
  }

  return baseTrack;
}
