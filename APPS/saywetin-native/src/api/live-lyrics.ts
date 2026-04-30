import type { SyncedLyricLine } from '../state/ritual-state';

type SyncedLyricsResponse = {
  lines: Array<{
    t: string;
    startMs: number;
    endMs: number;
    id: string;
    tappable: boolean;
  }>;
  confidence: number;
  source: string;
  // Timing model fields (scaffold)
  listenStartedAtMs?: number;
  listenEndedAtMs?: number;
  sampleMidpointAtMs?: number;
  recognitionReceivedAtMs?: number;
  resultShownAtMs?: number;
  providerSongOffsetMs?: number;
  calculatedDisplayOffsetMs?: number;
};

type ExplainResponse = {
  literal: string;
  cultural: string;
  relatedPhrases: string[];
  alternates?: Array<{ title: string; body: string; confidence: number }>;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

function hasApiBaseUrl() {
  return Boolean(apiBaseUrl);
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchSyncedLyrics(trackId: string): Promise<SyncedLyricLine[] | null> {
  if (!hasApiBaseUrl()) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/v1/tracks/${trackId}/synced-lyrics`);
    const json = await readJson<SyncedLyricsResponse>(response);

    return json.lines.map((line) => ({
      id: line.id,
      text: line.t,
      startMs: line.startMs,
      endMs: line.endMs,
      tappable: line.tappable,
      meaning: '',
      alternates: [],
      related: [],
    }));
  } catch {
    return null;
  }
}

export async function fetchLineExplain(
  trackId: string,
  line: SyncedLyricLine,
  positionMs: number,
): Promise<Pick<SyncedLyricLine, 'meaning' | 'alternates' | 'related'> | null> {
  if (!hasApiBaseUrl()) {
    return null;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/v1/meaning/explain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trackId,
        lineId: line.id,
        lyric: line.text,
        positionMs,
      }),
    });

    const json = await readJson<ExplainResponse>(response);

    return {
      meaning: [json.literal, json.cultural].filter(Boolean).join(' '),
      alternates: (json.alternates ?? []).map((entry) => entry.body || entry.title),
      related: json.relatedPhrases ?? [],
    };
  } catch {
    return null;
  }
}

export async function postSignal(
  type: 'tap' | 'flag' | 'resync' | 'dwell' | 'exit' | 'fallback',
  trackId: string,
  lineId?: string,
  reason?: string,
  dwellMs?: number,
) {
  if (!hasApiBaseUrl()) {
    return;
  }

  try {
    await fetch(`${apiBaseUrl}/v1/signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, trackId, lineId, reason, dwellMs }),
    });
  } catch {
    // Signals are fire-and-forget.
  }
}
