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

export type RecognitionSource =
  | 'microphone'
  | 'android_internal_audio'
  | 'ios_supported_internal_audio'
  | 'audio_file_import'
  | 'manual_lyrics'
  | 'streaming_metadata'
  | 'share_link'
  | 'vibesearch';

export type FailureReason =
  | 'NO_AUDIO_DETECTED'
  | 'HEADPHONES_PRIVATE_AUDIO'
  | 'INTERNAL_CAPTURE_NOT_SUPPORTED'
  | 'INTERNAL_CAPTURE_PERMISSION_DENIED'
  | 'INTERNAL_CAPTURE_BLOCKED_BY_SOURCE_APP'
  | 'INTERNAL_CAPTURE_NO_AUDIO'
  | 'LOW_CONFIDENCE'
  | 'NO_NETWORK'
  | 'RECOGNITION_TIMEOUT'
  | 'MICROPHONE_PERMISSION_MISSING'
  | 'UNKNOWN_ERROR';

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
  matchSource: MatchSource;
  recognitionSource: RecognitionSource;
  culturalAnalyses: CulturalAnalysisEntry[];
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
  recognitionSource: 'microphone',
  culturalAnalyses: [],
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