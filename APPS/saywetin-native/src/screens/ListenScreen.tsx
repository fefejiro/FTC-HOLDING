import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Audio } from 'expo-av';
import { FadeInView } from '../components/FadeInView';
import { OrbListener } from '../components/OrbListener';
import { useAudioSession } from '../audio/useAudioSession';
import { identifyByText, uploadListenSample } from '../api/listen';
import type { RitualTrack } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';

const { colors } = ritualTokens;
const MATCHING_AUTO_ADVANCE_MS = 600;
type ListenPhase = 'listening' | 'matching';
const CAPTURE_DURATION_MS = 8000;
const LISTEN_MICROCOPY = [
  'Tap once to listen. Tap again to stop early.',
  'Catch am quick. Match am clean.',
  'Live audio in, fingerprint out.',
  'One tap starts. Second tap cuts early.',
  'Play am loud. We go find am fast.',
];

export function ListenScreen({ onRecognized }: { onRecognized: (track: RitualTrack) => void }) {
  const [phase, setPhase] = useState<ListenPhase>('listening');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLyricInput, setShowLyricInput] = useState(false);
  const [lyricQuery, setLyricQuery] = useState('');
  const [lyricBusy, setLyricBusy] = useState(false);
  const [microcopy] = useState(
    () => LISTEN_MICROCOPY[Math.floor(Math.random() * LISTEN_MICROCOPY.length)],
  );
  const onRecognizedRef = useRef(onRecognized);
  const stopCaptureRef = useRef<(() => void) | null>(null);

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

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        throw new Error('Microphone permission denied');
      }

      setPhase('listening');

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      await new Promise((resolve) => {
        const timer = setTimeout(resolve, CAPTURE_DURATION_MS);
        stopCaptureRef.current = () => {
          clearTimeout(timer);
          resolve(null);
        };
      });

      await recording.stopAndUnloadAsync();
      const recordingUri = recording.getURI();

      if (!recordingUri) {
        throw new Error('No recording captured');
      }

      const status = await recording.getStatusAsync();
      const durationMs = status.durationMillis ?? CAPTURE_DURATION_MS;

      const recognizedTrack = await uploadListenSample(recordingUri, durationMs);

      setPhase('matching');
      setTimeout(() => {
        onRecognizedRef.current(recognizedTrack);
      }, MATCHING_AUTO_ADVANCE_MS);
    } catch (error: any) {
      setPhase('listening');
      setErrorMessage(error?.message || 'Could not identify song. Try again.');
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
    try {
      const recognizedTrack = await identifyByText(trimmed);
      setPhase('matching');
      setTimeout(() => {
        onRecognizedRef.current(recognizedTrack);
      }, MATCHING_AUTO_ADVANCE_MS);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Could not match that lyric. Try a different line.');
    } finally {
      setLyricBusy(false);
    }
  };

  const inMatching = phase === 'matching';

  return (
    <FadeInView duration={inMatching ? 220 : 180}>
      <View style={styles.screen}>
        <View style={styles.ambientTop} />
        <Text style={styles.eyebrow}>{inMatching ? 'Match Locking' : 'Listening Live'}</Text>
        <Text style={styles.title}>SayWetin</Text>
        <Text style={styles.subtitle}>
          {inMatching
            ? 'Tightening rings and fingerprint lock in motion.'
            : microcopy}
        </Text>

        <OrbListener phase={phase} onPress={inMatching ? undefined : startRecognition} />

        {!inMatching ? (
          <>
            <Text style={styles.orbHint}>{busy ? 'Listening... tap orb to stop early' : 'Tap orb to start match'}</Text>
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
    color: colors.violetSoft,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: 0.4,
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