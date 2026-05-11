import { useMemo, useState } from 'react';

// 'matching' is no longer a separate navigation step. It is an internal
// sub-state owned by ListenScreen. The navigator owns: home -> listen -> result.
export type RitualScreen = 'home' | 'listen' | 'result';

export type RecognitionStatus =
  | 'idle'
  | 'recording'
  | 'identifying'
  | 'matched'
  | 'failed'
  | 'cancelled';

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
  vibe: string;
  culture: string;
  artistIntent: string;
  reply: string;
  alternates: string[];
  related: string[];
};

export type ResolvedSpotifyLink = {
  trackId: string | null;
  uri: string | null;
  url: string | null;
  source: 'direct' | 'search_fallback' | 'unknown';
};

export type ResolvedYoutubeLink = {
  videoId: string | null;
  url: string | null;
  title: string | null;
  channelTitle: string | null;
  source: 'official' | 'vevo' | 'topic' | 'search_fallback' | 'unknown';
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
  spotify: ResolvedSpotifyLink;
  youtube: ResolvedYoutubeLink;
  chips: string[];
  syncedLyrics: SyncedLyricLine[];
  lyricsAnchorOffsetMs?: number;
  sampleCapturedAtMs?: number;
  matchSource: MatchSource;
  recognitionSource: RecognitionSource;
  culturalAnalyses: CulturalAnalysisEntry[];
  // Phase 2c: Timing fields for performance metrics
  listenStartedAtMs?: number;
  listenEndedAtMs?: number;
  audioSampleMidpointAtMs?: number;
  recognitionStartedAtMs?: number;
  recognitionEndedAtMs?: number;
  recognitionReceivedAtMs?: number;
  resultShownAtMs?: number;
  providerSongOffsetMs?: number;
  matchedSongOffsetMs?: number;
  displaySongOffsetMs?: number;
};

export type RitualController = {
  screen: RitualScreen;
  track: RitualTrack;
  recognitionStatus: RecognitionStatus;
  setRecognizedTrack: (track: RitualTrack) => void;
  startListening: () => void;
  revealResult: () => void;
  resetRecognitionSession: () => void;
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
  spotify: {
    trackId: null,
    uri: null,
    url: 'https://open.spotify.com',
    source: 'unknown',
  },
  youtube: {
    videoId: null,
    url: 'https://www.youtube.com',
    title: null,
    channelTitle: null,
    source: 'unknown',
  },
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
  const [recognitionStatus, setRecognitionStatus] = useState<RecognitionStatus>('idle');

  const actions = useMemo(
    () => ({
      setRecognizedTrack: (nextTrack: RitualTrack) => setTrack(nextTrack),
      startListening: () => setScreen('listen'),
      revealResult: () => setScreen('result'),
      resetRecognitionSession: () => {
        setTrack(demoTrack);
        setScreen('home');
        setRecognitionStatus('idle');
      },
    }),
    [],
  );

  return {
    screen,
    track,
    recognitionStatus,
    ...actions,
  } as RitualController;
}