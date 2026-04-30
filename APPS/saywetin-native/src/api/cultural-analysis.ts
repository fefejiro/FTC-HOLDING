/**
 * Direct client to the saywetin-ai Cloudflare Worker.
 * Independent of the Railway backend so /api/listen translations work
 * even when sunny-acceptance is paused.
 */

import type { CulturalAnalysisEntry } from '../state/ritual-state';

const DEFAULT_WORKER = 'https://saywetin-ai.fejiro-efiuvwere.workers.dev';
const workerUrl = (process.env.EXPO_PUBLIC_AI_WORKER_URL || DEFAULT_WORKER).replace(/\/$/, '');

type WorkerResponse = {
  translation?: string;
  detectedLanguage?: string;
  culturalContext?: string;
  artistIntent?: string;
  deeperMeaning?: string;
  languageNotes?: string;
  error?: string;
  // Timing model fields (scaffold)
  listenStartedAtMs?: number;
  listenEndedAtMs?: number;
  sampleMidpointAtMs?: number;
  recognitionReceivedAtMs?: number;
  resultShownAtMs?: number;
  providerSongOffsetMs?: number;
  calculatedDisplayOffsetMs?: number;
};

export async function analyzeLyricLine(args: {
  lyricText: string;
  songTitle?: string;
  artistName?: string;
  genre?: string;
  knownLanguage?: string;
  signal?: AbortSignal;
}): Promise<CulturalAnalysisEntry> {
  const { signal, ...body } = args;
  const res = await fetch(`${workerUrl}/v1/cultural-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let msg = `worker ${res.status}`;
    try {
      const data = (await res.json()) as WorkerResponse;
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  const data = (await res.json()) as WorkerResponse;
  return {
    translation: data.translation || '',
    culturalContext: data.culturalContext || data.artistIntent || '',
    deeperMeaning: data.deeperMeaning || data.languageNotes || '',
  };
}
