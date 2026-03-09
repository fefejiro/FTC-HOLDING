interface ArtworkLookupInput {
  title: string;
  artist: string;
  album?: string | null;
  spotifyId?: string | null;
  isrc?: string | null;
  existingCoverArtUrl?: string | null;
}

interface ArtworkCacheEntry {
  value: string | null;
  expiresAt: number;
}

const ARTWORK_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ITUNES_TIMEOUT_MS = 2200;
const DEEZER_TIMEOUT_MS = 2200;

const artworkCache = new Map<string, ArtworkCacheEntry>();
const inflightLookups = new Map<string, Promise<string | null>>();

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isValidArtworkUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function getLookupKey(input: ArtworkLookupInput): string {
  if (input.spotifyId && input.spotifyId.trim()) {
    return `spotify:${input.spotifyId.trim().toLowerCase()}`;
  }

  if (input.isrc && input.isrc.trim()) {
    return `isrc:${input.isrc.trim().toLowerCase()}`;
  }

  return `ta:${normalizeText(input.title)}|${normalizeText(input.artist)}`;
}

function scoreCandidate(
  input: ArtworkLookupInput,
  candidateTitle?: string | null,
  candidateArtist?: string | null,
  candidateAlbum?: string | null,
): number {
  const title = normalizeText(candidateTitle || "");
  const artist = normalizeText(candidateArtist || "");
  const album = normalizeText(candidateAlbum || "");
  const expectedTitle = normalizeText(input.title);
  const expectedArtist = normalizeText(input.artist);
  const expectedAlbum = normalizeText(input.album || "");

  let score = 0;

  if (title && expectedTitle) {
    if (title === expectedTitle) score += 80;
    else if (title.includes(expectedTitle) || expectedTitle.includes(title)) score += 45;
  }

  if (artist && expectedArtist) {
    if (artist === expectedArtist) score += 80;
    else if (artist.includes(expectedArtist) || expectedArtist.includes(artist)) score += 45;
  }

  if (album && expectedAlbum) {
    if (album === expectedAlbum) score += 25;
    else if (album.includes(expectedAlbum) || expectedAlbum.includes(album)) score += 10;
  }

  return score;
}

function withTimeoutSignal(timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  return undefined;
}

function normalizeITunesArtwork(url: string): string {
  // iTunes commonly returns .../100x100bb.jpg; request a larger variant.
  return url.replace(/\/\d+x\d+bb\./i, "/1200x1200bb.");
}

async function searchItunesArtwork(input: ArtworkLookupInput): Promise<string | null> {
  const query = `${input.title} ${input.artist}`.trim();
  const url =
    `https://itunes.apple.com/search?media=music&entity=song&limit=10&term=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "SayWetin/1.0 (+https://saywetin.app)",
    },
    signal: withTimeoutSignal(ITUNES_TIMEOUT_MS),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    results?: Array<{
      trackName?: string;
      artistName?: string;
      collectionName?: string;
      artworkUrl100?: string;
      artworkUrl60?: string;
      artworkUrl30?: string;
    }>;
  };

  const results = Array.isArray(payload.results) ? payload.results : [];
  if (results.length === 0) {
    return null;
  }

  let bestScore = -1;
  let bestArtwork: string | null = null;

  for (const candidate of results) {
    const artwork =
      candidate.artworkUrl100 ||
      candidate.artworkUrl60 ||
      candidate.artworkUrl30 ||
      null;
    if (!isValidArtworkUrl(artwork)) {
      continue;
    }

    const score = scoreCandidate(
      input,
      candidate.trackName,
      candidate.artistName,
      candidate.collectionName,
    );

    if (score > bestScore) {
      bestScore = score;
      bestArtwork = normalizeITunesArtwork(artwork);
    }
  }

  return bestScore >= 40 ? bestArtwork : null;
}

async function searchDeezerArtwork(input: ArtworkLookupInput): Promise<string | null> {
  const query = `track:"${input.title}" artist:"${input.artist}"`;
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=10`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "SayWetin/1.0 (+https://saywetin.app)",
    },
    signal: withTimeoutSignal(DEEZER_TIMEOUT_MS),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    data?: Array<{
      title?: string;
      title_short?: string;
      artist?: { name?: string };
      album?: {
        title?: string;
        cover_xl?: string;
        cover_big?: string;
        cover_medium?: string;
      };
    }>;
  };

  const results = Array.isArray(payload.data) ? payload.data : [];
  if (results.length === 0) {
    return null;
  }

  let bestScore = -1;
  let bestArtwork: string | null = null;

  for (const candidate of results) {
    const artwork =
      candidate.album?.cover_xl ||
      candidate.album?.cover_big ||
      candidate.album?.cover_medium ||
      null;
    if (!isValidArtworkUrl(artwork)) {
      continue;
    }

    const score = scoreCandidate(
      input,
      candidate.title || candidate.title_short,
      candidate.artist?.name,
      candidate.album?.title,
    );

    if (score > bestScore) {
      bestScore = score;
      bestArtwork = artwork;
    }
  }

  return bestScore >= 40 ? bestArtwork : null;
}

export async function resolveTrackArtwork(input: ArtworkLookupInput): Promise<string | null> {
  if (isValidArtworkUrl(input.existingCoverArtUrl)) {
    return input.existingCoverArtUrl;
  }

  if (!input.title?.trim() || !input.artist?.trim()) {
    return null;
  }

  const key = getLookupKey(input);
  const now = Date.now();
  const cached = artworkCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const inflight = inflightLookups.get(key);
  if (inflight) {
    return inflight;
  }

  const lookupPromise = (async () => {
    try {
      const itunes = await searchItunesArtwork(input);
      if (itunes) {
        return itunes;
      }

      const deezer = await searchDeezerArtwork(input);
      if (deezer) {
        return deezer;
      }
    } catch (error) {
      console.warn("[Artwork] Lookup failed:", error);
    }

    return null;
  })();

  inflightLookups.set(key, lookupPromise);

  const resolved = await lookupPromise;
  artworkCache.set(key, { value: resolved, expiresAt: now + ARTWORK_CACHE_TTL_MS });
  inflightLookups.delete(key);
  return resolved;
}
