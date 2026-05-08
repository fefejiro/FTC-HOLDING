import { useMemo, useState } from 'react';

// 'matching' is no longer a separate navigation step. It is an internal
// sub-state owned by ListenScreen. The navigator owns: home -> listen -> result.
export type RitualScreen = 'home' | 'listen' | 'result';

export type MatchSource =
  | 'acrcloud'
  | 'ai_transcript'
  | 'lyric_text'
  | 'manual'
  | 'spotify'
  | 'unknown';

export type RecognitionSource = 'microphone' | 'text_query';

export type FailureReason =
  | 'permission_denied'
  | 'capture_failed'
  | 'upload_failed'
  | 'match_not_found'
  | 'network_error'
  | 'unknown';

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

export type CulturalAnalysisEntry = {
  translation: string;
  culturalContext: string;
  deeperMeaning: string;
};

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
  lyricsAnchorOffsetMs?: number;
  sampleCapturedAtMs?: number;
  matchSource: MatchSource;
  recognitionSource: RecognitionSource;
  culturalAnalyses: CulturalAnalysisEntry[];
};

export type RitualController = {
  screen: RitualScreen;
  track: RitualTrack;
  setRecognizedTrack: (track: RitualTrack) => void;
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
  lyricsAnchorOffsetMs: 0,
  matchSource: 'unknown',
  recognitionSource: 'microphone',
  culturalAnalyses: [],
};

export function useRitualState() {
  const [screen, setScreen] = useState<RitualScreen>('home');
  const [track, setTrack] = useState<RitualTrack>(demoTrack);

  const actions = useMemo(
    () => ({
      setRecognizedTrack: (nextTrack: RitualTrack) => setTrack(nextTrack),
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