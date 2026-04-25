import { useMemo, useState } from 'react';

export type RitualScreen = 'home' | 'listen' | 'result';

export type SyncedLyricLine = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  tappable: boolean;
  meaning: string;
  alternates: string[];
  related: string[];
};

export type MatchSource = 'acrcloud' | 'ai_transcript' | 'lyric_text' | 'manual' | 'spotify' | 'unknown';

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
};

export type RitualController = {
  screen: RitualScreen;
  track: RitualTrack;
  startListening: () => void;
  setRecognizedTrack: (track: RitualTrack) => void;
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
};

export function useRitualState() {
  const [screen, setScreen] = useState<RitualScreen>('home');
  const [track, setTrack] = useState<RitualTrack>(demoTrack);

  const actions = useMemo(
    () => ({
      startListening: () => setScreen('listen'),
      setRecognizedTrack: (nextTrack: RitualTrack) => setTrack(nextTrack),
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