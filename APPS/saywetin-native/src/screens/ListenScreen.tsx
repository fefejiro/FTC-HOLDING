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
import type { InputRoute } from '../audio/useAudioRoute';
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

function inferInputRoute(nameOrType: string): InputRoute {
  const sample = nameOrType.toLowerCase();
  if (
    sample.includes('bluetooth') ||
    sample.includes('bt') ||
    sample.includes('sco') ||
    sample.includes('ble') ||
    sample.includes('airpods')
  ) {
    return 'bluetooth_mic';
  }
  if (
    sample.includes('wired') ||
    sample.includes('headset') ||
    sample.includes('headphone') ||
    sample.includes('usb')
  ) {
    return 'wired_mic';
  }
  if (sample.includes('built-in') || sample.includes('builtin') || sample.includes('internal') || sample.includes('mic')) {
    return 'built_in_mic';
  }
  return 'unknown';
}

function scoreRecorderInput(name: string, type: string) {
  const sample = `${name} ${type}`.toLowerCase();
  // Built-in mic scores highest for ambient capture — it hears room audio.
  // BT headset mic is near the mouth, worst for recognizing music playing around you.
  if (sample.includes('built-in') || sample.includes('builtin') || sample.includes('internal') || sample.includes('mic')) {
    return 3;
  }
  if (
    sample.includes('wired') ||
    sample.includes('headset') ||
    sample.includes('headphone') ||
    sample.includes('usb')
  ) {
    return 2;
  }
  if (
    sample.includes('bluetooth') ||
    sample.includes('bt') ||
    sample.includes('sco') ||
    sample.includes('ble') ||
    sample.includes('airpods')
  ) {
    return 1;
  }
  return 0;
}

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
  const [lastFailureReason, setLastFailureReason] = useState<FailureReason | null>(null);
  const [showLyricInput, setShowLyricInput] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [lyricQuery, setLyricQuery] = useState('');
  const [lyricBusy, setLyricBusy] = useState(false);
  const [searchMode, setSearchMode] = useState<'lyrics' | 'song' | 'artist' | 'slang' | 'vibe'>('lyrics');
  const [bypassPrivateGuard, setBypassPrivateGuard] = useState(false);
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
    if (lowered.includes('no music found in audio') || lowered.includes('could not identify song')) {
      return headphonesConnected ? 'HEADPHONES_PRIVATE_AUDIO' : 'NO_AUDIO_DETECTED';
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

  const startRecognition = async (forceBypass = false) => {
    if (busy) {
      stopCaptureEarly();
      return;
    }

    const isPrivateRoute = audioRoute.isPrivateListening || audioRoute.outputRoute === 'bluetooth' || audioRoute.outputRoute === 'wired_headphones';
    if (isPrivateRoute && !forceBypass && !bypassPrivateGuard) {
      console.warn('[listen] advisory: private listening route detected', audioRoute);
      setErrorMessage('Headphone audio may be private. Your music may be playing through headphones where the microphone cannot hear it. Try the phone mic anyway, use Headphone Mode, or search lyrics.');
      setPhase('idle');
      return;
    }
    if (isPrivateRoute) {
      setBypassPrivateGuard(true);
      console.log('[listen] proceeding with built-in mic bypass', audioRoute);
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
    let effectiveInputRoute: InputRoute = audioRoute.inputRoute;

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        failureReason = 'MICROPHONE_PERMISSION_MISSING';
        throw new Error('Microphone permission denied');
      }

      setPhase('listening');
      setSecondsLeft(Math.ceil(CAPTURE_DURATION_MS / 1000));

      await audioRecorder.prepareToRecordAsync();

      // Prefer external microphone routes when available (Bluetooth/wired).
      try {
        const inputs = audioRecorder.getAvailableInputs();
        if (Array.isArray(inputs) && inputs.length > 0) {
          console.log(
            '[listen] available inputs:',
            inputs.map((input) => ({ name: input.name, type: input.type, uid: input.uid })),
          );

          const rankedInputs = [...inputs].sort(
            (left, right) => scoreRecorderInput(right.name, right.type) - scoreRecorderInput(left.name, left.type),
          );
          const preferred = rankedInputs[0];

          if (preferred?.uid && scoreRecorderInput(preferred.name, preferred.type) > 0) {
            audioRecorder.setInput(preferred.uid);
          }

          const selectedInput = await audioRecorder.getCurrentInput();
          if (selectedInput) {
            effectiveInputRoute = inferInputRoute(`${selectedInput.name} ${selectedInput.type}`);
            console.log('[listen] selected input route:', selectedInput.name, selectedInput.type, effectiveInputRoute);
          }
        }
      } catch (inputErr: any) {
        console.warn('[listen] input route selection failed:', inputErr?.message || String(inputErr));
      }

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
      setLastFailureReason(failureReason);
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
        inputRoute: effectiveInputRoute,
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
      : 'Tap to listen';

  // Derive smart failure copy from last failure reason
  const diagnosticTitle =
    lastFailureReason === 'HEADPHONES_PRIVATE_AUDIO'
      ? 'Headphone audio may be private.'
      : lastFailureReason === 'NO_AUDIO_DETECTED'
        ? 'I could not hear enough music.'
        : lastFailureReason === 'LOW_CONFIDENCE'
          ? 'Possible match was too weak.'
          : lastFailureReason === 'MICROPHONE_PERMISSION_MISSING'
            ? 'Microphone permission needed.'
            : lastFailureReason === 'NO_NETWORK'
              ? 'No network connection.'
              : errorMessage
                ? 'Could not identify the song.'
                : null;

  const diagnosticBody =
    lastFailureReason === 'HEADPHONES_PRIVATE_AUDIO'
      ? 'Your music may be playing through headphones where the microphone cannot hear it. Try Headphone Mode, share a song link, or search lyrics.'
      : lastFailureReason === 'NO_AUDIO_DETECTED'
        ? 'Move closer to the speaker, raise the volume, or try lyric search.'
        : lastFailureReason === 'LOW_CONFIDENCE'
          ? 'Try again closer to the sound, or search by lyric, artist, or vibe.'
          : lastFailureReason === 'MICROPHONE_PERMISSION_MISSING'
            ? 'Allow microphone access so SayWetin can listen.'
            : lastFailureReason === 'NO_NETWORK'
              ? 'Check your connection and try again.'
              : errorMessage ?? null;

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
        <HeadphonesDetectedBanner
          visible={headphonesConnected || quietMode}
          onTryAnyway={headphonesConnected ? () => startRecognition(true) : undefined}
        />

        <OrbListener phase={phase} onPress={inMatching ? undefined : startRecognition} />

        {!inMatching ? (
          <>
            <Text style={styles.orbHint}>
              {inListening
                ? `Listening… ${secondsLeft}s — tap orb to stop early`
                : 'Tap orb to start match'}
            </Text>
            {diagnosticTitle && !quietMode ? (
              <View style={styles.diagCard}>
                <Text style={styles.diagTitle}>{diagnosticTitle}</Text>
                {diagnosticBody ? <Text style={styles.diagBody}>{diagnosticBody}</Text> : null}
                {lastFailureReason === 'HEADPHONES_PRIVATE_AUDIO' && !bypassPrivateGuard ? (
                  <Pressable style={styles.diagAction} onPress={() => startRecognition(true)}>
                    <Text style={styles.diagActionText}>Try with phone mic</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
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
                  <Pressable style={styles.quietAction} onPress={() => { setBypassPrivateGuard(false); void startRecognition(true); }}>
                    <Text style={styles.quietActionText}>Try microphone again</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {showLyricInput ? (
              <View style={styles.wetinSheet}>
                <Text style={styles.wetinTitle}>Wetin be this?</Text>
                <Text style={styles.wetinSub}>
                  Paste a lyric, type a song, describe a vibe, or ask what a phrase means.
                </Text>
                {/* Mode chips */}
                <View style={styles.chipRow}>
                  {(['lyrics', 'song', 'artist', 'slang', 'vibe'] as const).map((m) => (
                    <Pressable
                      key={m}
                      style={[styles.chip, searchMode === m && styles.chipActive]}
                      onPress={() => setSearchMode(m)}
                    >
                      <Text style={[styles.chipText, searchMode === m && styles.chipTextActive]}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={lyricQuery}
                  onChangeText={setLyricQuery}
                  placeholder={
                    searchMode === 'lyrics'
                      ? 'that Burna Boy destiny line…'
                      : searchMode === 'song'
                        ? 'Asake lonely at the top'
                        : searchMode === 'artist'
                          ? 'Afrobeats churchy street anthem'
                          : searchMode === 'slang'
                            ? "what does 'omo ope' mean?"
                            : 'confident confrontational street energy'
                  }
                  placeholderTextColor={colors.textMuted}
                  style={styles.lyricInput}
                  multiline
                  editable={!lyricBusy}
                />
                <View style={styles.wetinActions}>
                  <Pressable
                    onPress={submitLyric}
                    style={[styles.wetinBtn, styles.wetinBtnPrimary, lyricBusy && styles.lyricButtonDisabled]}
                    disabled={lyricBusy}
                  >
                    <Text style={styles.wetinBtnPrimaryText}>
                      {lyricBusy ? 'Decoding…' : 'Decode'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={submitLyric}
                    style={[styles.wetinBtn, lyricBusy && styles.lyricButtonDisabled]}
                    disabled={lyricBusy}
                  >
                    <Text style={styles.wetinBtnText}>Match song</Text>
                  </Pressable>
                  <Pressable
                    onPress={onOpenVibeSearch}
                    style={styles.wetinBtn}
                  >
                    <Text style={styles.wetinBtnText}>Search lyrics</Text>
                  </Pressable>
                </View>
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
  diagCard: {
    marginTop: 8,
    width: '100%',
    maxWidth: 340,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,184,76,0.28)',
    backgroundColor: 'rgba(232,184,76,0.07)',
    padding: 14,
    gap: 6,
  },
  diagTitle: {
    color: colors.amber,
    fontSize: 14,
    fontWeight: '700',
  },
  diagBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  diagAction: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: colors.violetWash,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  diagActionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  wetinSheet: {
    marginTop: 14,
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    gap: 10,
  },
  wetinTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  wetinSub: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: colors.violet,
    borderColor: colors.violet,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  wetinActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  wetinBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.violetEdge,
    backgroundColor: colors.violetWash,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  wetinBtnPrimary: {
    backgroundColor: colors.violet,
    borderColor: colors.violet,
  },
  wetinBtnPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  wetinBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
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