import { useSyncExternalStore } from 'react';

export type LiveExplanation = {
  lineId: string;
  lyric: string;
  literal: string;
  cultural: string;
  slangMap: Array<{ word: string; meaning: string; region: string }>;
  region: string[];
  confidence: number;
  alternates?: Array<{ title: string; body: string; confidence: number }>;
  relatedPhrases: string[];
  artistNote?: string;
};

type LiveModeState = {
  isLiveActive: boolean;
  currentTrackId: string | null;
  trackTitle: string;
  trackArtist: string;
  coverArtUrl: string | null;
  currentLineId: string | null;
  currentLineText: string;
  positionMs: number;
  lastExplanation: LiveExplanation | null;
};

const initialState: LiveModeState = {
  isLiveActive: false,
  currentTrackId: null,
  trackTitle: '',
  trackArtist: '',
  coverArtUrl: null,
  currentLineId: null,
  currentLineText: '',
  positionMs: 0,
  lastExplanation: null,
};

let state: LiveModeState = initialState;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getLiveModeState() {
  return state;
}

export function setLiveModeState(next: Partial<LiveModeState>) {
  state = { ...state, ...next };
  emit();
}

export function resetLiveModeState() {
  state = initialState;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLiveModeStore<T>(selector: (value: LiveModeState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}
