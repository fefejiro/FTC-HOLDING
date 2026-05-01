import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { FadeInView } from '../components/FadeInView';
import { OrbListener } from '../components/OrbListener';
import { HeadphonesDetectedBanner } from '../components/HeadphonesDetectedBanner';
import { useAudioSession } from '../audio/useAudioSession';
import { useAudioRoute } from '../audio/useAudioRoute';
import { identifyByText, uploadListenSample } from '../api/listen';
import { logRecognitionAttempt } from '../api/recognition-logger';
import type { FailureReason, RitualTrack } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;
const MATCHING_AUTO_ADVANCE_MS = 250;
type ListenPhase = 'idle' | 'listening' | 'matching';
const CAPTURE_DURATION_MS = 5000;
const LISTEN_MICROCOPY = [
  'Tap to listen again.',
  'Listen again.',
  'Catch am quick. Match am clean.',
  'Live audio in, fingerprint out.',
  'One tap starts. Second tap cuts early.',
  'Play am loud. We go find am fast.',
];

type ListenScreenProps = {
  onRecognized: (track: RitualTrack) => void;
  onOpenShareMode: () => void;
  onOpenVibeSearch: () => void;
};

export function ListenScreen({ onRecognized, onOpenShareMode, onOpenVibeSearch }: ListenScreenProps) {
  const [phase, setPhase] = useState<ListenPhase>('idle');
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLyricInput, setShowLyricInput] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [lyricQuery, setLyricQuery] = useState('');
  const [lyricBusy, setLyricBusy] = useState(false);
  const [microcopy] = useState(
    () => LISTEN_MICROCOPY[Math.floor(Math.random() * LISTEN_MICROCOPY.length)],
  );
  const onRecognizedRef = useRef(onRecognized);
  const stopCaptureRef = useRef<(() => void) | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRoute = useAudioRoute();

  useEffect(() => {
    onRecognizedRef.current = onRecognized;
  }, [onRecognized]);

  useEffect(() => {
    if (phase !== 'matching') {
      return;
    }

    const timer = setTimeout(() => {
      // Recognition callback is triggered after successful upload.
    }, MATCHING_AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [phase]);

  // Configure AVAudioSession so music apps keep playing while we record
  useAudioSession();

  const headphonesConnected =
    audioRoute.outputRoute === 'bluetooth' || audioRoute.outputRoute === 'wired_headphones';

  function mapFailureReason(message: string): FailureReason {
    const lowered = message.toLowerCase();

    if (lowered.includes('microphone permission denied')) {
      return 'MICROPHONE_PERMISSION_MISSING';
    }
    if (lowered.includes('network request failed') || lowered.includes('failed to fetch')) {
      return 'NO_NETWORK';
    }
    if (lowered.includes('timeout')) {
      return 'RECOGNITION_TIMEOUT';
    }
    if (lowered.includes('no recording captured') || lowered.includes('no audio')) {
      return headphonesConnected ? 'HEADPHONES_PRIVATE_AUDIO' : 'NO_AUDIO_DETECTED';
    }

    return 'UNKNOWN_ERROR';
  }

  const stopCaptureEarly = () => {
    if (stopCaptureRef.current) {
      stopCaptureRef.current();
      stopCaptureRef.current = null;
    }
  };

  const startRecognition = async () => {
    if (busy) {
      stopCaptureEarly();
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    setQuietMode(false);
    console.log('[listen] starting recognition');

    const listenStartedAtMs = Date.now();
    let listenEndedAtMs = listenStartedAtMs;
    let recognitionStartedAtMs = 0;
    let recognitionEndedAtMs = 0;
    let failureReason: FailureReason | null = null;
    let confidence: number | null = null;
    let matchedSongId: string | null = null;
    let matchedOffsetMs: number | null = null;

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        failureReason = 'MICROPHONE_PERMISSION_MISSING';
        throw new Error('Microphone permission denied');
      }

      setPhase('listening');
      setSecondsLeft(Math.ceil(CAPTURE_DURATION_MS / 1000));

      await audioRecorder.prepareToRecordAsync();
      await audioRecorder.record();
      console.log('[listen] recorder started');

      const tickId = setInterval(() => {
        setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
      }, 1000);

      await new Promise((resolve) => {
        const timer = setTimeout(resolve, CAPTURE_DURATION_MS);
        stopCaptureRef.current = () => {
          clearTimeout(timer);
          resolve(null);
        };
      });
      clearInterval(tickId);
      setSecondsLeft(0);
      listenEndedAtMs = Date.now();

      await audioRecorder.stop();
      const recordingUri = audioRecorder.uri;
      console.log('[listen] recorder stopped, uri=', recordingUri);

      if (!recordingUri) {
        throw new Error('No recording captured');
      }

      const durationMs = CAPTURE_DURATION_MS;

      setPhase('matching');
  recognitionStartedAtMs = Date.now();
      const recognizedTrack = await uploadListenSample(recordingUri, durationMs);
  recognitionEndedAtMs = Date.now();
  confidence = recognizedTrack.matchConfidence;
  matchedSongId = recognizedTrack.id;
  matchedOffsetMs = recognizedTrack.matchedInMs;
      console.log('[listen] recognized:', recognizedTrack.title, 'by', recognizedTrack.artist);

      setTimeout(() => {
        onRecognizedRef.current(recognizedTrack);
      }, MATCHING_AUTO_ADVANCE_MS);
    } catch (error: any) {
      if (!recognitionEndedAtMs && recognitionStartedAtMs) {
        recognitionEndedAtMs = Date.now();
      }
      if (!listenEndedAtMs || listenEndedAtMs < listenStartedAtMs) {
        listenEndedAtMs = Date.now();
      }
      failureReason = failureReason || mapFailureReason(error?.message || 'unknown');
      console.warn('[listen] recognition failed:', error?.message, error?.stack);
      setPhase('idle');
      setSecondsLeft(0);
      setErrorMessage(error?.message || 'Could not identify song. Try again.');
      setShowLyricInput(true);
      if (failureReason === 'HEADPHONES_PRIVATE_AUDIO' || failureReason === 'NO_AUDIO_DETECTED') {
        setQuietMode(true);
      }
    } finally {
      const endedNow = Date.now();
      if (!listenEndedAtMs || listenEndedAtMs < listenStartedAtMs) {
        listenEndedAtMs = endedNow;
      }
      if (recognitionStartedAtMs && !recognitionEndedAtMs) {
        recognitionEndedAtMs = endedNow;
      }

      logRecognitionAttempt({
        recognitionSource: 'microphone',
        outputRoute: audioRoute.outputRoute,
        inputRoute: audioRoute.inputRoute,
        listenStartedAtMs,
        listenEndedAtMs,
        recognitionStartedAtMs,
        recognitionEndedAtMs,
        failureReason,
        confidence,
        matchedSongId,
        matchedOffsetMs,
      });

      stopCaptureRef.current = null;
      setBusy(false);
    }
  };

  const submitLyric = async () => {
    if (lyricBusy) {
      return;
    }
    const trimmed = lyricQuery.trim();
    if (trimmed.length < 3) {
      setErrorMessage('Type at least 3 characters of a lyric, phrase, or song title.');
      return;
    }
    setLyricBusy(true);
    setErrorMessage(null);
    setQuietMode(false);
    console.log('[listen] identifying by text:', trimmed);

    const listenStartedAtMs = Date.now();
    const listenEndedAtMs = listenStartedAtMs;
    const recognitionStartedAtMs = Date.now();
    let recognitionEndedAtMs = 0;
    let failureReason: FailureReason | null = null;
    let confidence: number | null = null;
    let matchedSongId: string | null = null;
    let matchedOffsetMs: number | null = null;

    try {
      const recognizedTrack = await identifyByText(trimmed);
      recognitionEndedAtMs = Date.now();
      confidence = recognizedTrack.matchConfidence;
      matchedSongId = recognizedTrack.id;
      matchedOffsetMs = recognizedTrack.matchedInMs;
      console.log('[listen] text-match recognized:', recognizedTrack.title);
      setPhase('matching');
      setTimeout(() => {
        onRecognizedRef.current(recognizedTrack);
      }, MATCHING_AUTO_ADVANCE_MS);
    } catch (error: any) {
      recognitionEndedAtMs = Date.now();
      failureReason = mapFailureReason(error?.message || 'unknown');
      console.warn('[listen] text-match failed:', error?.message);
      setErrorMessage(error?.message || 'Could not match that lyric. Try a different line.');
    } finally {
      logRecognitionAttempt({
        recognitionSource: 'manual_lyrics',
        outputRoute: audioRoute.outputRoute,
        inputRoute: audioRoute.inputRoute,
        listenStartedAtMs,
        listenEndedAtMs,
        recognitionStartedAtMs,
        recognitionEndedAtMs,
        failureReason,
        confidence,
        matchedSongId,
        matchedOffsetMs,
      });
      setLyricBusy(false);
    }
  };

  const inMatching = phase === 'matching';
  const inListening = phase === 'listening';
  const eyebrowText = inMatching ? 'Match Locking' : inListening ? 'Listening Live' : 'Ready';
  const subtitleText = inMatching
    ? 'Tightening rings and fingerprint lock in motion.'
    : inListening
      ? `Capturing audio — ${secondsLeft}s left. Tap orb to stop early.`
      : microcopy;

  return (
    <FadeInView duration={inMatching ? 220 : 180}>
      <View style={styles.screen}>
        <View style={styles.ambientTop} />
        <Text style={[styles.eyebrow, inListening && styles.eyebrowLive, inMatching && styles.eyebrowMatch]}>
          {eyebrowText}
        </Text>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          SayWetin
        </Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>
        <HeadphonesDetectedBanner visible={headphonesConnected || quietMode} />

        <OrbListener phase={phase} onPress={inMatching ? undefined : startRecognition} />

        {!inMatching ? (
          <>
            <Text style={styles.orbHint}>
              {inListening
                ? `Listening… ${secondsLeft}s — tap orb to stop early`
                : 'Tap orb to start match'}
            </Text>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {quietMode ? (
              <View style={styles.quietCard}>
                <Text style={styles.quietTitle}>Could not hear the headphone audio</Text>
                <Text style={styles.quietBody}>
                  Your music may be playing privately through headphones. Try Headphone Mode, share a song link, search lyrics, or play it out loud.
                </Text>
                <View style={styles.quietActionsRow}>
                  <Pressable style={styles.quietAction} onPress={() => setQuietMode(false)}>
                    <Text style={styles.quietActionText}>Try Headphone Mode</Text>
                  </Pressable>
                  <Pressable style={styles.quietAction} onPress={onOpenShareMode}>
                    <Text style={styles.quietActionText}>Share song link</Text>
                  </Pressable>
                </View>
                <View style={styles.quietActionsRow}>
                  <Pressable style={styles.quietAction} onPress={onOpenVibeSearch}>
                    <Text style={styles.quietActionText}>Search lyrics</Text>
                  </Pressable>
                  <Pressable style={styles.quietAction} onPress={() => setShowLyricInput(true)}>
                    <Text style={styles.quietActionText}>Paste a line</Text>
                  </Pressable>
                  <Pressable style={styles.quietAction} onPress={startRecognition}>
                    <Text style={styles.quietActionText}>Try microphone again</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {showLyricInput ? (
              <View style={styles.lyricBox}>
                <Text style={styles.lyricHint}>Paste a lyric, phrase, or song title</Text>
                <TextInput
                  value={lyricQuery}
                  onChangeText={setLyricQuery}
                  placeholder="e.g. dem dey vibe for ginger street"
                  placeholderTextColor={colors.textMuted}
                  style={styles.lyricInput}
                  multiline
                  editable={!lyricBusy}
                />
                <Pressable
                  onPress={submitLyric}
                  style={[styles.lyricButton, lyricBusy && styles.lyricButtonDisabled]}
                  disabled={lyricBusy}
                >
                  <Text style={styles.lyricButtonText}>
                    {lyricBusy ? 'Matching lyric...' : 'Match by lyric'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    gap: 10,
  },
  ambientTop: {
    position: 'absolute',
    top: -120,
    width: 340,
    height: 340,
    borderRadius: 999,
    backgroundColor: colors.violetWash,
  },
  eyebrow: {
    color: colors.textMuted,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '700',
  },
  eyebrowLive: {
    color: colors.violetSoft,
  },
  eyebrowMatch: {
    color: colors.mint,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
  },
  orbHint: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    color: colors.amber,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 320,
  },
  quietCard: {
    marginTop: 10,
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    gap: 10,
  },
  quietTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  quietBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  quietActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quietAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: colors.violetWash,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  quietActionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  lyricBox: {
    marginTop: 14,
    width: '100%',
    maxWidth: 340,
    gap: 8,
  },
  lyricHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  lyricInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  lyricButton: {
    alignSelf: 'center',
    backgroundColor: colors.violetSoft,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  lyricButtonDisabled: {
    opacity: 0.6,
  },
  lyricButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
});