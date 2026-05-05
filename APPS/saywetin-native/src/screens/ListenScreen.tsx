import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { FadeInView } from '../components/FadeInView';
import { OrbListener } from '../components/OrbListener';
import { useAudioRoute, type InputRoute } from '../audio/useAudioRoute';
import { useAudioSession } from '../audio/useAudioSession';
import { identifyByText, uploadListenSample } from '../api/listen';
import type { RitualTrack } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;
const MATCHING_AUTO_ADVANCE_MS = 250;
type ListenPhase = 'idle' | 'listening' | 'matching';
const CAPTURE_DURATION_MS = 5000;
const LISTEN_MICROCOPY = [
  'Tap once to listen. Tap again to stop early.',
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
  if (
    sample.includes('bluetooth') ||
    sample.includes('bt') ||
    sample.includes('sco') ||
    sample.includes('ble') ||
    sample.includes('airpods')
  ) {
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
  if (sample.includes('built-in') || sample.includes('builtin') || sample.includes('internal') || sample.includes('mic')) {
    return 1;
  }
  return 0;
}

export function ListenScreen({ onRecognized }: { onRecognized: (track: RitualTrack) => void }) {
  const [phase, setPhase] = useState<ListenPhase>('idle');
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLyricInput, setShowLyricInput] = useState(false);
  const [lyricQuery, setLyricQuery] = useState('');
  const [lyricBusy, setLyricBusy] = useState(false);
  const [microcopy] = useState(
    () => LISTEN_MICROCOPY[Math.floor(Math.random() * LISTEN_MICROCOPY.length)],
  );
  const onRecognizedRef = useRef(onRecognized);
  const stopCaptureRef = useRef<(() => void) | null>(null);
  const listenSessionStartedAtRef = useRef<number | null>(null);
  const selectedInputRouteRef = useRef<InputRoute>('unknown');
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
    setShowLyricInput(false);
    if (audioRoute.isPrivateListening || audioRoute.outputRoute === 'bluetooth' || audioRoute.outputRoute === 'wired_headphones') {
      console.warn('[listen] blocked: private listening route detected', audioRoute);
      setErrorMessage('Private Bluetooth or wired playback cannot be matched reliably. Switch output to phone speaker or use lyric search.');
      setShowLyricInput(true);
      setBusy(false);
      return;
    }
    selectedInputRouteRef.current = 'unknown';
    listenSessionStartedAtRef.current = Date.now();
    console.log('[listen] starting recognition');
    console.log('[listen] audio route snapshot', audioRoute);

    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission denied');
      }

      setPhase('listening');
      setSecondsLeft(Math.ceil(CAPTURE_DURATION_MS / 1000));

      await audioRecorder.prepareToRecordAsync();

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
            const selectedInputRoute = inferInputRoute(`${selectedInput.name} ${selectedInput.type}`);
            selectedInputRouteRef.current = selectedInputRoute;
            console.log(
              '[listen] selected input route:',
              selectedInput.name,
              selectedInput.type,
              selectedInputRoute,
            );
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

      await audioRecorder.stop();
      const recordingUri = audioRecorder.uri;
      console.log('[listen] recorder stopped, uri=', recordingUri);

      if (!recordingUri) {
        throw new Error('No recording captured');
      }

      const durationMs = CAPTURE_DURATION_MS;

      setPhase('matching');
      const recognizedTrack = await uploadListenSample(recordingUri, durationMs);
      console.log('[listen] recognized:', recognizedTrack.title, 'by', recognizedTrack.artist);
      // lyricsAnchorOffsetMs from the API is the song position at the START of the audio sample.
      // Add the capture window so we anchor to where the sample ENDED (current song position).
      const songPositionAtResponseMs = Math.max(
        0,
        (recognizedTrack.lyricsAnchorOffsetMs ?? 0) + CAPTURE_DURATION_MS,
      );
      const capturedAtMs = Date.now();

      setTimeout(() => {
        onRecognizedRef.current({
          ...recognizedTrack,
          // Advance by the auto-advance delay so sampleCapturedAtMs stays accurate
          lyricsAnchorOffsetMs: songPositionAtResponseMs + MATCHING_AUTO_ADVANCE_MS,
          sampleCapturedAtMs: capturedAtMs + MATCHING_AUTO_ADVANCE_MS,
        });
      }, MATCHING_AUTO_ADVANCE_MS);
    } catch (error: any) {
      console.warn('[listen] recognition failed:', error?.message, error?.stack);
      setPhase('idle');
      setSecondsLeft(0);
      const message = String(error?.message || 'Could not identify song. Try again.');
      const selectedInputRoute = selectedInputRouteRef.current;
      if (
        (
          audioRoute.isPrivateListening ||
          audioRoute.outputRoute === 'bluetooth' ||
          audioRoute.outputRoute === 'wired_headphones' ||
          selectedInputRoute === 'bluetooth_mic' ||
          selectedInputRoute === 'wired_mic'
        ) &&
        message.toLowerCase().includes('no music found in audio')
      ) {
        setErrorMessage('Bluetooth or wired private playback cannot be heard reliably through the microphone. Play the song out loud or use lyric search.');
      } else {
        setErrorMessage(message);
      }
      setShowLyricInput(true);
    } finally {
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
    console.log('[listen] identifying by text:', trimmed);
    try {
      const recognizedTrack = await identifyByText(trimmed);
      console.log('[listen] text-match recognized:', recognizedTrack.title);
      setPhase('matching');
      setTimeout(() => {
        onRecognizedRef.current({
          ...recognizedTrack,
          lyricsAnchorOffsetMs: 0,
        });
      }, MATCHING_AUTO_ADVANCE_MS);
    } catch (error: any) {
      console.warn('[listen] text-match failed:', error?.message);
      setErrorMessage(error?.message || 'Could not match that lyric. Try a different line.');
    } finally {
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

        <OrbListener phase={phase} onPress={inMatching ? undefined : startRecognition} />

        {!inMatching ? (
          <>
            <Text style={styles.orbHint}>
              {inListening
                ? `Listening… ${secondsLeft}s — tap orb to stop early`
                : 'Tap orb to start match'}
            </Text>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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