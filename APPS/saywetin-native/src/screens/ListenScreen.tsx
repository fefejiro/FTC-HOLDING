import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { FadeInView } from '../components/FadeInView';
import { OrbListener } from '../components/OrbListener';
import { useAudioRoute, type InputRoute } from '../audio/useAudioRoute';
import { useAudioSession } from '../audio/useAudioSession';
import { identifyByText, uploadListenSample } from '../api/listen';
import type { RitualTrack } from '../state/ritual-state';
import { ritualTokens } from '../theme/tokens';
import { getStatusSubtitle, shouldShowSlowNetworkWarning, getSlowNetworkMessage } from '../utils/status-messaging';

const { colors } = ritualTokens;
const CAPTURE_DURATION_MS = 5000;
const MATCHING_AUTO_ADVANCE_MS = 250;
const LISTEN_MICROCOPY = ['Tap to listen'];

type ListenPhase =
  | 'idle'
  | 'requesting-permission'
  | 'capturing'
  | 'uploading'
  | 'matching'
  | 'failed'
  | 'offline'
  | 'cancelled';

type OrbPhase = 'idle' | 'listening' | 'matching';

type AttemptTimeline = {
  requestId: number;
  startedAtMs: number;
  permissionGrantedAtMs?: number;
  captureStartedAtMs?: number;
  captureEndedAtMs?: number;
  sampleMidpointAtMs?: number;
  uploadStartedAtMs?: number;
  recognitionStartedAtMs?: number;
  matchReadyAtMs?: number;
};

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
  if (
    sample.includes('built-in') ||
    sample.includes('builtin') ||
    sample.includes('internal') ||
    sample.includes('mic')
  ) {
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
  if (
    sample.includes('built-in') ||
    sample.includes('builtin') ||
    sample.includes('internal') ||
    sample.includes('mic')
  ) {
    return 1;
  }
  return 0;
}

function isNetworkError(message: string) {
  const sample = message.toLowerCase();
  return (
    sample.includes('network request failed') ||
    sample.includes('timed out') ||
    sample.includes('abort') ||
    sample.includes('fetch failed')
  );
}

function toOrbPhase(phase: ListenPhase): OrbPhase {
  if (phase === 'capturing') {
    return 'listening';
  }
  if (phase === 'uploading' || phase === 'matching') {
    return 'matching';
  }
  return 'idle';
}

function isBusyPhase(phase: ListenPhase) {
  return phase === 'requesting-permission' || phase === 'capturing' || phase === 'uploading' || phase === 'matching';
}

export function ListenScreen({ onRecognized }: { onRecognized: (track: RitualTrack) => void }) {
  const [phase, setPhase] = useState<ListenPhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLyricInput, setShowLyricInput] = useState(false);
  const [lyricQuery, setLyricQuery] = useState('');
  const [lyricBusy, setLyricBusy] = useState(false);
  const [stageElapsedMs, setStageElapsedMs] = useState(0);
  const [microcopy] = useState(() => LISTEN_MICROCOPY[Math.floor(Math.random() * LISTEN_MICROCOPY.length)]);

  const onRecognizedRef = useRef(onRecognized);
  const stopCaptureRef = useRef<(() => void) | null>(null);
  const selectedInputRouteRef = useRef<InputRoute>('unknown');
  const attemptIdRef = useRef(0);
  const stageStartedAtRef = useRef(0);
  const timelineRef = useRef<AttemptTimeline | null>(null);
  const abortControllerRef = useRef(new AbortController());

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const audioRoute = useAudioRoute();

  useEffect(() => {
    onRecognizedRef.current = onRecognized;
  }, [onRecognized]);

  // Configure audio session to avoid killing existing playback while recording.
  useAudioSession();

  // Handle hardware back button to cancel early if recording/uploading
  useFocusEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isBusyPhase(phase)) {
        // If recording: stop early
        if (phase === 'capturing') {
          stopCaptureEarly();
          return true;
        }
        // If uploading/matching: abort request and cancel
        abortControllerRef.current.abort();
        setPhase('cancelled');
        setTimeout(() => {
          setPhase('idle');
        }, 180);
        return true;
      }
      // If idle or error: allow default back behavior
      return false;
    });

    return () => backHandler.remove();
  });

  useEffect(() => {
    stageStartedAtRef.current = Date.now();
    setStageElapsedMs(0);

    if (phase !== 'uploading' && phase !== 'matching') {
      return;
    }

    const tick = setInterval(() => {
      setStageElapsedMs(Date.now() - stageStartedAtRef.current);
    }, 300);

    return () => clearInterval(tick);
  }, [phase]);

  const orbPhase = toOrbPhase(phase);
  const isBusy = isBusyPhase(phase) || lyricBusy;

  const stopCaptureEarly = () => {
    if (stopCaptureRef.current) {
      stopCaptureRef.current();
      stopCaptureRef.current = null;
      setPhase('cancelled');
      setTimeout(() => {
        setPhase('idle');
      }, 180);
    }
  };

  const startRecognition = async () => {
    if (isBusyPhase(phase)) {
      if (phase === 'capturing') {
        stopCaptureEarly();
      }
      return;
    }

    const requestId = attemptIdRef.current + 1;
    attemptIdRef.current = requestId;

    setErrorMessage(null);
    setShowLyricInput(false);
    selectedInputRouteRef.current = 'unknown';

    timelineRef.current = {
      requestId,
      startedAtMs: Date.now(),
    };

    console.log('[listen] start recognition', { requestId, audioRoute });

    try {
      setPhase('requesting-permission');
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (attemptIdRef.current !== requestId) {
        return;
      }
      if (!permission.granted) {
        throw new Error('Microphone permission denied');
      }

      timelineRef.current = {
        ...(timelineRef.current || { requestId, startedAtMs: Date.now() }),
        permissionGrantedAtMs: Date.now(),
      };

      setPhase('capturing');
      setSecondsLeft(Math.ceil(CAPTURE_DURATION_MS / 1000));

      await audioRecorder.prepareToRecordAsync();

      try {
        const inputs = audioRecorder.getAvailableInputs();
        if (Array.isArray(inputs) && inputs.length > 0) {
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
            console.log('[listen] selected input route', {
              requestId,
              input: selectedInput.name,
              type: selectedInput.type,
              selectedInputRoute,
            });
          }
        }
      } catch (inputError: any) {
        console.warn('[listen] input route selection failed', inputError?.message || String(inputError));
      }

      timelineRef.current = {
        ...(timelineRef.current || { requestId, startedAtMs: Date.now() }),
        captureStartedAtMs: Date.now(),
      };

      await audioRecorder.record();

      const tickId = setInterval(() => {
        setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
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

      if (attemptIdRef.current !== requestId) {
        return;
      }

      stopCaptureRef.current = null;
      const recordingUri = audioRecorder.uri;
      if (!recordingUri) {
        throw new Error('No recording captured');
      }

      const captureEndedAtMs = Date.now();
      const sampleMidpointAtMs =
        timelineRef.current?.captureStartedAtMs
          ? Math.round((timelineRef.current.captureStartedAtMs + captureEndedAtMs) / 2)
          : captureEndedAtMs;

      timelineRef.current = {
        ...(timelineRef.current || { requestId, startedAtMs: Date.now() }),
        captureEndedAtMs,
        sampleMidpointAtMs,
        uploadStartedAtMs: Date.now(),
      };

      setPhase('uploading');
      const recognizedTrack = await uploadListenSample(recordingUri, CAPTURE_DURATION_MS);

      if (attemptIdRef.current !== requestId) {
        return;
      }

      timelineRef.current = {
        ...(timelineRef.current || { requestId, startedAtMs: Date.now() }),
        captureEndedAtMs,
        sampleMidpointAtMs,
        recognitionStartedAtMs: timelineRef.current?.uploadStartedAtMs ?? captureEndedAtMs,
        matchReadyAtMs: Date.now(),
      };

      setPhase('matching');

      const songPositionAtResponseMs = Math.max(
        0,
        recognizedTrack.matchedSongOffsetMs ?? recognizedTrack.lyricsAnchorOffsetMs ?? 0,
      );
      const resultShownAtMs = Date.now() + MATCHING_AUTO_ADVANCE_MS;

      const displaySongOffsetMs = Math.max(
        0,
        songPositionAtResponseMs +
          (resultShownAtMs - (timelineRef.current?.sampleMidpointAtMs ?? resultShownAtMs)),
      );

      console.log('[listen] recognition timeline', {
        requestId,
        selectedInputRoute: selectedInputRouteRef.current,
        phases: timelineRef.current,
      });

      setTimeout(() => {
        if (attemptIdRef.current !== requestId) {
          return;
        }

        onRecognizedRef.current({
          ...recognizedTrack,
          listenStartedAtMs: timelineRef.current?.startedAtMs,
          listenEndedAtMs: timelineRef.current?.captureEndedAtMs,
          audioSampleMidpointAtMs: timelineRef.current?.sampleMidpointAtMs,
          recognitionStartedAtMs: timelineRef.current?.recognitionStartedAtMs,
          recognitionEndedAtMs: timelineRef.current?.matchReadyAtMs,
          recognitionReceivedAtMs: timelineRef.current?.matchReadyAtMs,
          matchedSongOffsetMs: songPositionAtResponseMs,
          displaySongOffsetMs,
          lyricsAnchorOffsetMs: displaySongOffsetMs,
          sampleCapturedAtMs: timelineRef.current?.captureEndedAtMs,
          resultShownAtMs,
        });
      }, MATCHING_AUTO_ADVANCE_MS);
    } catch (error: any) {
      if (attemptIdRef.current !== requestId) {
        return;
      }

      const message = String(error?.message || 'Could not identify song. Try again.');
      const network = isNetworkError(message);
      setPhase(network ? 'offline' : 'failed');
      setErrorMessage('I could not hear enough music.');
      setShowLyricInput(true);
      setSecondsLeft(0);

      console.warn('[listen] recognition failed', {
        requestId,
        message,
        selectedInputRoute: selectedInputRouteRef.current,
      });
    } finally {
      stopCaptureRef.current = null;
    }
  };

  const submitLyric = async () => {
    if (lyricBusy || isBusyPhase(phase)) {
      return;
    }

    const trimmed = lyricQuery.trim();
    if (trimmed.length < 3) {
      setErrorMessage('Type at least 3 characters of a lyric, phrase, or song title.');
      return;
    }

    const requestId = attemptIdRef.current + 1;
    attemptIdRef.current = requestId;

    setLyricBusy(true);
    setErrorMessage(null);
    setPhase('matching');

    try {
      const recognizedTrack = await identifyByText(trimmed);
      if (attemptIdRef.current !== requestId) {
        return;
      }

      const nowMs = Date.now();
      const matchedOffsetMs = recognizedTrack.matchedSongOffsetMs ?? recognizedTrack.lyricsAnchorOffsetMs ?? 0;

      onRecognizedRef.current({
        ...recognizedTrack,
        listenStartedAtMs: nowMs,
        listenEndedAtMs: nowMs,
        audioSampleMidpointAtMs: nowMs,
        recognitionStartedAtMs: nowMs,
        recognitionEndedAtMs: nowMs,
        recognitionReceivedAtMs: nowMs,
        matchedSongOffsetMs: matchedOffsetMs,
        displaySongOffsetMs: matchedOffsetMs,
        lyricsAnchorOffsetMs: matchedOffsetMs,
        sampleCapturedAtMs: nowMs,
        resultShownAtMs: nowMs,
      });
    } catch (error: any) {
      if (attemptIdRef.current !== requestId) {
        return;
      }

      const message = String(error?.message || 'Could not match that lyric. Try a different line.');
      setPhase(isNetworkError(message) ? 'offline' : 'failed');
      setErrorMessage(message);
    } finally {
      if (attemptIdRef.current === requestId) {
        setLyricBusy(false);
      }
    }
  };

  const subtitleText = useMemo(() => {
    return getStatusSubtitle({ phase, elapsedMs: stageElapsedMs, secondsLeft, errorMessage });
  }, [phase, stageElapsedMs, secondsLeft, errorMessage]);

  const slowNetworkWarningVisible = useMemo(() => {
    return shouldShowSlowNetworkWarning(phase, stageElapsedMs);
  }, [phase, stageElapsedMs]);

  const slowNetworkWarningText = useMemo(() => {
    return getSlowNetworkMessage(phase, stageElapsedMs);
  }, [phase, stageElapsedMs]);

  return (
    <FadeInView duration={orbPhase === 'matching' ? 220 : 180}>
      <View style={styles.screen}>
        <View style={styles.ambientTop} />

        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          SayWetin
        </Text>

        <Text style={styles.subtitle}>{subtitleText}</Text>

        <OrbListener phase={orbPhase} onPress={orbPhase === 'matching' ? undefined : startRecognition} />

        <Text style={styles.orbHint}>
          {phase === 'capturing' ? 'Tap to stop' : phase === 'idle' ? microcopy : ''}
        </Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {slowNetworkWarningVisible && slowNetworkWarningText ? (
          <Text style={[styles.errorText, { color: colors.amber, opacity: 0.8 }]}>{slowNetworkWarningText}</Text>
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
              editable={!lyricBusy && !isBusyPhase(phase)}
            />
            <Pressable
              onPress={submitLyric}
              style={[styles.lyricButton, (lyricBusy || isBusyPhase(phase)) && styles.lyricButtonDisabled]}
              disabled={lyricBusy || isBusyPhase(phase)}
            >
              <Text style={styles.lyricButtonText}>{lyricBusy ? 'Matching lyric...' : 'Match by lyric'}</Text>
            </Pressable>
          </View>
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
