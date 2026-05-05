import { useMemo, useState } from 'react';

// 'matching' is no longer a separate navigation step — it is an internal
// sub-state owned by ListenScreen. The navigator only owns: home → listen → result.
export type RitualScreen = 'home' | 'listen' | 'result';

export type RitualTrack = {
  id: string;
  title: string;
  artist: string;
  year: string;
  albumArt: string;
  matchConfidence: number;
  matchedInMs: number;
  lyric: string;
  meaning: string;
  spotifyUrl: string;
  youtubeUrl: string;
  chips: string[];
  syncedLyrics: SyncedLyricLine[];
  matchSource: MatchSource;
  recognitionSource: RecognitionSource;
  culturalAnalyses: CulturalAnalysisEntry[];
};

export type RitualController = {
  screen: RitualScreen;
  track: RitualTrack;
  startListening: () => void;
  revealResult: () => void;
  reset: () => void;
};

const demoTrack: RitualTrack = {
  id: 'pending-track',
  title: 'No song matched yet',
  artist: 'SayWetin',
  year: 'Live',
  albumArt: '',
  matchConfidence: 0,
  matchedInMs: 0,
  lyric: 'Tap Start Match Ritual to listen to the environment and identify the current song.',
  meaning: 'This screen updates after a real recognition response from the backend.',
  spotifyUrl: 'https://open.spotify.com',
  youtubeUrl: 'https://www.youtube.com',
  chips: ['Live recognition'],
  syncedLyrics: [],
  matchSource: 'unknown',
  recognitionSource: 'microphone',
  culturalAnalyses: [],
};

export function useRitualState() {
  const [screen, setScreen] = useState<RitualScreen>('home');
  const [track, setTrack] = useState<RitualTrack>(demoTrack);

  const actions = useMemo(
    () => ({
      startListening: () => setScreen('listen'),
      revealResult: () => setScreen('result'),
      reset: () => {
        setTrack(demoTrack);
        setScreen('home');
      },
    }),
    [],
  );

  return {
    screen,
    track,
    ...actions,
  } as RitualController;
}