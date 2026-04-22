import { useState, useRef, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { trackListenStarted } from '@/lib/analytics';
import { getApiUrl } from '@/lib/api-config';
import { 
  isNativeApp, 
  isNativeAndroidApp,
  hasRecordingPermission, 
  requestRecordingPermission,
  startNativeRecording,
  stopNativeRecording,
  cancelNativeRecording
} from '@/lib/native-audio';
import { ListeningOrb } from '@/components/listening-orb';

type RecordingState = 'idle' | 'requesting' | 'listening' | 'identifying' | 'success' | 'error';
type RecognitionVisualMode = 'requesting' | 'listening' | 'matching' | 'success' | 'error';

interface RecognitionResult {
  success: boolean;
  sessionId: string;
  recognizedTrack: {
    id: string;
    title: string;
    artist: string;
    album?: string;
    genre?: string;
    spotifyId?: string;
    youtubeId?: string;
    coverArtUrl?: string | null;
    confidenceScore?: number;
  };
  lyrics?: {
    text: string;
    language: string;
  };
  culturalAnalysis?: any[];
  processingTime: number;
}

interface AudioRecorderProps {
  onSuccess?: (result: RecognitionResult) => void;
  listenDuration?: number;
  analyticsSource?: 'home_cta' | 'results_page' | 'other';
  autoStart?: boolean;
  immersive?: boolean;
}

type ApiError = Error & {
  code?: string;
  status?: number;
};

type ListenErrorKind =
  | 'offline'
  | 'backend_unreachable'
  | 'timeout'
  | 'provider_unavailable'
  | 'microphone_denied'
  | 'capture_failed'
  | 'empty_audio'
  | 'no_result'
  | 'provider_failed'
  | 'context_failed'
  | 'bad_response'
  | 'database_unavailable'
  | 'unknown';

type ListenError = Error & {
  kind?: ListenErrorKind;
  code?: string;
  status?: number;
};

type FailureDisplay = {
  title: string;
  body: string;
  ctaLabel: string;
  orbMode: RecognitionVisualMode;
};

const LISTEN_REQUEST_TIMEOUT_MS = 45_000;
const MIN_CAPTURE_DURATION_MS = 2_500;
const MIN_AUDIO_BLOB_BYTES = 8_000;

function createListenError(
  kind: ListenErrorKind,
  message: string,
  extras?: { code?: string; status?: number },
): ListenError {
  const error = new Error(message) as ListenError;
  error.kind = kind;
  if (extras?.code) error.code = extras.code;
  if (typeof extras?.status === 'number') error.status = extras.status;
  return error;
}

function isPermissionDeniedError(error: unknown): boolean {
  const message = String((error as any)?.message || '').toLowerCase();
  const name = String((error as any)?.name || '').toLowerCase();

  return (
    message.includes('permission denied') ||
    message.includes('microphone access denied') ||
    message.includes('notallowederror') ||
    name === 'notallowederror'
  );
}

function getFailureDisplay(error: unknown): FailureDisplay {
  const listenError = error as ListenError;
  const kind = listenError?.kind;
  const message = String(listenError?.message || '').trim().toLowerCase();

  switch (kind) {
    case 'microphone_denied':
      return {
        title: 'Microphone access is off',
        body: 'Turn on microphone access, then try again.',
        ctaLabel: 'Try again',
        orbMode: 'error',
      };
    case 'capture_failed':
      return {
        title: 'We could not capture the sound',
        body: 'Try again and keep the music close.',
        ctaLabel: 'Try again',
        orbMode: 'error',
      };
    case 'empty_audio':
    case 'no_result':
      return {
        title: 'We could not hear a clear song',
        body: 'Move closer to the music and try again.',
        ctaLabel: 'Try again',
        orbMode: 'error',
      };
    case 'provider_failed':
      if (
        message.includes('low-confidence') ||
        message.includes('match looked weak') ||
        message.includes('music may be incorrect') ||
        message.includes('no music') ||
        message.includes("can't generate fingerprint") ||
        message.includes('fingerprint')
      ) {
        return {
          title: 'We could not hear a clear song',
          body: 'Move closer to the music and try again.',
          ctaLabel: 'Try again',
          orbMode: 'error',
        };
      }
      return {
        title: 'We could not hear a clear song',
        body: 'Move closer to the music and try again.',
        ctaLabel: 'Try again',
        orbMode: 'error',
      };
    case 'provider_unavailable':
      return {
        title: 'Song matching is temporarily unavailable',
        body: 'Please try again in a moment.',
        ctaLabel: 'Try again',
        orbMode: 'error',
      };
    case 'offline':
    case 'backend_unreachable':
    case 'timeout':
    case 'context_failed':
    case 'database_unavailable':
    case 'bad_response':
      return {
        title: 'Could not reach SayWetin right now',
        body: 'Check connection and try again.',
        ctaLabel: 'Try again',
        orbMode: 'error',
      };
    default:
      return {
        title: 'Could not reach SayWetin right now',
        body: 'Check connection and try again.',
        ctaLabel: 'Try again',
        orbMode: 'error',
      };
  }
}

function getApiErrorMessage(payload: any): string | undefined {
  if (typeof payload?.error === "string") {
    return payload.error;
  }

  if (typeof payload?.error?.message === "string") {
    return payload.error.message;
  }

  if (typeof payload?.message === "string") {
    return payload.message;
  }

  return undefined;
}

function getApiErrorCode(payload: any): string | undefined {
  if (typeof payload?.errorCode === "string") {
    return payload.errorCode;
  }

  if (typeof payload?.error?.code === "string") {
    return payload.error.code;
  }

  return undefined;
}

function createApiError(payload: any, fallbackMessage: string): ApiError {
  const error = new Error(getApiErrorMessage(payload) || fallbackMessage) as ApiError;
  const code = getApiErrorCode(payload);
  if (code) {
    error.code = code;
  }
  if (typeof payload?.status === 'number') {
    error.status = payload.status;
  }
  return error;
}

function normalizeUploadError(error: unknown): ListenError {
  if ((error as ListenError)?.kind) {
    return error as ListenError;
  }

  const apiError = error as ApiError;
  const code = typeof apiError?.code === 'string' ? apiError.code : undefined;
  const status = typeof apiError?.status === 'number' ? apiError.status : undefined;
  const message = String(apiError?.message || '').trim();
  const normalizedMessage = message.toLowerCase();

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return createListenError('offline', 'Device is offline.');
  }

  if (code === 'DATABASE_UNAVAILABLE' || normalizedMessage.includes('database is currently unavailable')) {
    return createListenError('database_unavailable', message, { code, status });
  }

  if (code === 'ACRCLOUD_UPSTREAM_UNAVAILABLE' || normalizedMessage.includes('upstream unavailable')) {
    return createListenError('provider_unavailable', message || 'Recognition provider unavailable.', { code, status });
  }

  if (
    code === 'ACRCLOUD_NOT_CONFIGURED' ||
    normalizedMessage.includes('application not found') ||
    normalizedMessage.includes('api route not found')
  ) {
    return createListenError('backend_unreachable', message || 'Backend unreachable.', { code, status });
  }

  if (
    code === 'ACRCLOUD_RECOGNITION_FAILED' ||
    normalizedMessage.includes('low-confidence match') ||
    normalizedMessage.includes('match looked weak') ||
    normalizedMessage.includes('music may be incorrect')
  ) {
    return createListenError('provider_failed', message, { code, status });
  }

  if (normalizedMessage.includes('no result') || normalizedMessage.includes('no music')) {
    return createListenError('no_result', message || 'No music found.', { code, status });
  }

  if (normalizedMessage.includes('lyrics') || normalizedMessage.includes('breakdown')) {
    return createListenError('context_failed', message, { code, status });
  }

  if (normalizedMessage === 'connection' || normalizedMessage.includes('network') || normalizedMessage.includes('fetch')) {
    return createListenError('backend_unreachable', message || 'Could not reach backend.', { code, status });
  }

  return createListenError('unknown', message || 'Could not identify the song.', { code, status });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function RecognitionStageVisual({
  mode,
  immersive,
}: {
  mode: RecognitionVisualMode;
  immersive: boolean;
}) {
  const nativeAndroid = isNativeAndroidApp();
  const modeMotion: Record<RecognitionVisualMode, { scale: number; y: number; rotate: number }> = {
    requesting: { scale: nativeAndroid ? 0.995 : 0.99, y: 0, rotate: 0 },
    listening: { scale: nativeAndroid ? 1.01 : 1.02, y: 0, rotate: 0 },
    matching: { scale: nativeAndroid ? 0.972 : 0.96, y: nativeAndroid ? -5 : -10, rotate: nativeAndroid ? 0.15 : 0.6 },
    success: { scale: nativeAndroid ? 0.995 : 1, y: nativeAndroid ? -2 : -4, rotate: 0 },
    error: { scale: nativeAndroid ? 0.998 : 0.985, y: nativeAndroid ? 0 : 2, rotate: 0 },
  };

  return (
    <motion.div
      initial={false}
      animate={{
        scale: modeMotion[mode].scale,
        y: modeMotion[mode].y,
        rotate: modeMotion[mode].rotate,
        opacity: 1,
      }}
      transition={{ type: 'spring', stiffness: 210, damping: 20, mass: 0.88 }}
    >
      <ListeningOrb mode={mode} size={immersive ? 'immersive' : 'compact'} />
    </motion.div>
  );
}

interface WebCaptureProfile {
  listenDurationSec: number;
  gain: number;
  sampleRate: number;
  autoGainControl: boolean;
}

function isDesktopWebRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer:fine)').matches || window.innerWidth >= 1024;
}

function getWebCaptureProfile(requestedDuration: number): WebCaptureProfile {
  const desktop = isDesktopWebRuntime();
  if (desktop) {
    return {
      // Desktop mics and speaker distance usually need a longer window + stronger make-up gain.
      listenDurationSec: Math.max(requestedDuration, 9),
      gain: 3.6,
      sampleRate: 48000,
      autoGainControl: true,
    };
  }

  return {
    listenDurationSec: Math.max(requestedDuration, 6),
    gain: 2.6,
    sampleRate: 44100,
    autoGainControl: true,
  };
}

function getNativeCaptureDurationSec(requestedDuration: number, nativeAndroid: boolean): number {
  if (nativeAndroid) {
    return Math.max(requestedDuration, 8);
  }

  return Math.max(requestedDuration, 5);
}

export function AudioRecorder({
  onSuccess,
  listenDuration = 5,
  analyticsSource = 'other',
  autoStart = false,
  immersive = false,
}: AudioRecorderProps) {
  const nativeAndroid = isNativeAndroidApp();
  const [recordingState, setRecordingState] = useState<RecordingState>(autoStart ? 'requesting' : 'idle');
  const [failureDisplay, setFailureDisplay] = useState<FailureDisplay | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStartedRef = useRef(false);
  const startAttemptInFlightRef = useRef(false);
  const nativeRecordingActiveRef = useRef(false);
  const webRecordingActiveRef = useRef(false);
  const captureDurationMsRef = useRef(Math.max(listenDuration, 0) * 1000);

  const clearRuntimeResources = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  const cancelActiveCapture = () => {
    if (isNativeApp()) {
      if (nativeRecordingActiveRef.current) {
        nativeRecordingActiveRef.current = false;
        cancelNativeRecording().catch(() => {});
      }
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }

    webRecordingActiveRef.current = false;
    mediaRecorderRef.current = null;
    clearRuntimeResources();
  };

  const cleanup = (cancelCapture = false) => {
    if (cancelCapture) {
      cancelActiveCapture();
      return;
    }

    clearRuntimeResources();
  };

  const showInlineFailure = (error: unknown) => {
    const normalizedError = normalizeUploadError(error);
    setFailureDisplay(getFailureDisplay(normalizedError));
    setRecordingState('error');
  };

  // Native recording for Capacitor (Android/iOS)
  const startNativeListening = async () => {
    try {
      console.log('[SAYWETIN] startNativeListening called, listenDuration:', listenDuration);
      setFailureDisplay(null);
      setRecordingState('requesting');
      audioChunksRef.current = [];
      const effectiveListenDuration = getNativeCaptureDurationSec(listenDuration, nativeAndroid);

      let hasPermission = await hasRecordingPermission();
      console.log('[SAYWETIN] hasPermission:', hasPermission);
      if (!hasPermission) {
        hasPermission = await requestRecordingPermission();
        console.log('[SAYWETIN] requestPermission result:', hasPermission);
        if (!hasPermission) {
          throw createListenError('microphone_denied', 'Permission denied');
        }
      }

      captureDurationMsRef.current = effectiveListenDuration * 1000;
      console.log('[SAYWETIN] Native effective listen duration (s):', effectiveListenDuration);
      const started = await startNativeRecording();
      console.log('[SAYWETIN] startNativeRecording result:', started);
      if (!started) {
        throw createListenError('capture_failed', 'Failed to start recording');
      }

      nativeRecordingActiveRef.current = true;
      trackListenStarted({ source: analyticsSource });
      setRecordingState('listening');

      recordingTimeoutRef.current = setTimeout(async () => {
        console.log('[SAYWETIN] Recording timeout fired, stopping recording...');
        nativeRecordingActiveRef.current = false;
        const nativeRecording = await stopNativeRecording();
        clearRuntimeResources();
        const audioBlob = nativeRecording?.blob ?? null;
        if (nativeRecording?.msDuration) {
          captureDurationMsRef.current = nativeRecording.msDuration;
        }
        console.log(
          '[SAYWETIN] audioBlob after stop:',
          audioBlob ? `${audioBlob.size} bytes, type: ${audioBlob.type}` : 'NULL',
          'actualDurationMs:',
          nativeRecording?.msDuration ?? 'unknown',
        );
        if (audioBlob && audioBlob.size > 0) {
          if ((nativeRecording?.msDuration ?? 0) < MIN_CAPTURE_DURATION_MS || audioBlob.size < MIN_AUDIO_BLOB_BYTES) {
            showInlineFailure(
              createListenError(
                'capture_failed',
                'Recording was too short to identify. Keep the phone near the music and try again.',
              ),
            );
            return;
          }
          audioChunksRef.current = [audioBlob];
          handleUpload();
        } else {
          showInlineFailure(createListenError('capture_failed', 'Could not capture audio. Please try again.'));
        }
      }, effectiveListenDuration * 1000);

    } catch (error: any) {
      console.error('[SAYWETIN] Native recording failed:', error);
      nativeRecordingActiveRef.current = false;
      cleanup(true);
      showInlineFailure(
        isPermissionDeniedError(error)
          ? createListenError('microphone_denied', 'Permission denied')
          : (error as ListenError)?.kind
            ? error
            : createListenError('capture_failed', 'Failed to start recording'),
      );
    }
  };

  // Web recording (fallback for browser)
  const startWebListening = async () => {
    try {
      const captureProfile = getWebCaptureProfile(listenDuration);
      const effectiveListenDuration = captureProfile.listenDurationSec;
      captureDurationMsRef.current = effectiveListenDuration * 1000;

      setFailureDisplay(null);
      setRecordingState('requesting');
      audioChunksRef.current = [];

      // Request microphone with settings optimized for music recognition
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,  // Keep off to preserve music fidelity
          noiseSuppression: false,  // Keep off to preserve music detail
          autoGainControl: captureProfile.autoGainControl,
          sampleRate: captureProfile.sampleRate,
          channelCount: 1,
        }
      });
      streamRef.current = stream;

      // Create audio context and amplify the signal for better recognition
      const audioContext = new AudioContext({ sampleRate: captureProfile.sampleRate });
      audioContextRef.current = audioContext;
      console.log('[SAYWETIN-REC] Using web capture profile:', captureProfile);
      
      const source = audioContext.createMediaStreamSource(stream);
      const highPass = audioContext.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 100;

      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -30;
      compressor.knee.value = 30;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.2;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = captureProfile.gain;
      
      const destination = audioContext.createMediaStreamDestination();
      source.connect(highPass);
      highPass.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(destination);
      
      // Use the amplified stream for recording
      const amplifiedStream = destination.stream;

      const mediaRecorder = new MediaRecorder(amplifiedStream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleUpload;

      mediaRecorder.start();
      webRecordingActiveRef.current = true;
      trackListenStarted({ source: analyticsSource });
      setRecordingState('listening');

      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          webRecordingActiveRef.current = false;
          mediaRecorderRef.current.stop();
          clearRuntimeResources();
        }
      }, effectiveListenDuration * 1000);

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      cleanup(true);
      showInlineFailure(
        isPermissionDeniedError(error)
          ? createListenError('microphone_denied', 'Permission denied')
          : createListenError('capture_failed', 'Failed to capture audio'),
      );
    }
  };

  // Main entry point - routes to native or web recording
  const startListening = async () => {
    if (startAttemptInFlightRef.current) {
      console.info('[SAYWETIN] Ignoring duplicate startListening call: start already in progress');
      return;
    }

    if (nativeRecordingActiveRef.current || webRecordingActiveRef.current) {
      console.info('[SAYWETIN] Ignoring duplicate startListening call: capture already active');
      return;
    }

    if (recordingState === 'listening' || recordingState === 'identifying') {
      console.info('[SAYWETIN] Ignoring duplicate startListening call: state already active', recordingState);
      return;
    }

    startAttemptInFlightRef.current = true;
    console.info('[SAYWETIN] startListening accepted', {
      autoStart,
      isNative: isNativeApp(),
      nativeAndroid,
      recordingState,
    });

    try {
    if (isNativeApp()) {
      await startNativeListening();
    } else {
      await startWebListening();
    }
    } finally {
      startAttemptInFlightRef.current = false;
    }
  };

  const sendAudioToServer = async (audioBlob: Blob, mimeType: string, ext: string): Promise<any> => {
    if (!audioBlob || audioBlob.size <= 0) {
      throw createListenError('empty_audio', 'No audio sample captured.');
    }

    const apiUrl = getApiUrl('/api/listen');
    console.log('[SAYWETIN-UPLOAD] Sending to:', apiUrl);
    console.log('[SAYWETIN-UPLOAD] Duration payload (ms):', captureDurationMsRef.current);

    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${ext}`);
    formData.append('duration', String(captureDurationMsRef.current));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LISTEN_REQUEST_TIMEOUT_MS);

    let response: Response;

    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        signal: controller.signal,
      });
    } catch (error: any) {
      clearTimeout(timeout);
      if (error?.name === 'AbortError') {
        throw createListenError('timeout', 'Listen request timed out.');
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw createListenError('offline', 'Device is offline.');
      }
      throw createListenError('backend_unreachable', error?.message || 'Could not reach backend.');
    }

    clearTimeout(timeout);

    console.log('[SAYWETIN-UPLOAD] Response status:', response.status, response.statusText);

    const contentType = response.headers.get('content-type');
    console.log('[SAYWETIN-UPLOAD] Response content-type:', contentType);
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      console.error('[SAYWETIN-UPLOAD] Non-JSON response body (first 500 chars):', responseText.substring(0, 500));
      if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
        throw createListenError('bad_response', 'The listen request reached a web page instead of the API.');
      }
      throw createListenError('backend_unreachable', 'Server returned a non-JSON response.');
    }

    const result = await response.json();
    console.log('[SAYWETIN-UPLOAD] Result:', JSON.stringify(result).substring(0, 500));

    if (!response.ok || !result.success) {
      const apiError = createApiError(
        { ...result, status: response.status },
        'Could not identify the song',
      );
      throw normalizeUploadError(apiError);
    }

    return result;
  };

  const handleUpload = async () => {
    nativeRecordingActiveRef.current = false;
    webRecordingActiveRef.current = false;
    setFailureDisplay(null);
    setRecordingState('identifying');

    try {
      const firstBlob = audioChunksRef.current[0];
      const mimeType = firstBlob?.type || 'audio/webm';
      const audioBlob = audioChunksRef.current.length === 1 
        ? firstBlob 
        : new Blob(audioChunksRef.current, { type: mimeType });
      
      const ext = mimeType.includes('m4a') || mimeType.includes('aac') ? 'm4a' 
        : mimeType.includes('mp3') ? 'mp3' 
        : mimeType.includes('wav') ? 'wav'
        : 'webm';

      if (!audioBlob || audioBlob.size <= 0) {
        throw createListenError('empty_audio', 'No audio sample captured.');
      }
      
      console.log('[SAYWETIN-UPLOAD] Audio blob details:', {
        size: audioBlob.size,
        type: audioBlob.type,
        mimeType,
        ext,
        chunksCount: audioChunksRef.current.length,
        isNative: isNativeApp(),
      });

      let result: any;
      let noMusicRetries = 0;
      let databaseRetries = 0;
      while (!result) {
        try {
          result = await sendAudioToServer(audioBlob, mimeType, ext);
        } catch (attemptError: any) {
          const errorMessage = String(attemptError?.message || '').toLowerCase();
          const errorCode = typeof attemptError?.code === 'string' ? attemptError.code : '';
          const isNoMusic =
            errorMessage.includes('no music') ||
            errorMessage.includes('no result');
          const isDatabaseUnavailable =
            errorCode === 'DATABASE_UNAVAILABLE' ||
            errorMessage.includes('database pooler is temporarily unavailable') ||
            errorMessage.includes('database is currently unavailable');

          if (isNoMusic && noMusicRetries < 1) {
            noMusicRetries += 1;
            console.log('[SAYWETIN-UPLOAD] First attempt failed with "no music found", retrying...');
            continue;
          }

          if (isDatabaseUnavailable && databaseRetries < 2) {
            databaseRetries += 1;
            const waitMs = databaseRetries * 1200;
            console.log(
              `[SAYWETIN-UPLOAD] Database temporarily unavailable, retry ${databaseRetries}/2 in ${waitMs}ms...`,
            );
            await delay(waitMs);
            continue;
          }

          throw attemptError;
        }
      }

      setFailureDisplay(null);
      setRecordingState('success');

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      showInlineFailure(error);
    }
  };

  useEffect(() => {
    return () => cleanup(true);
  }, []);

  useEffect(() => {
    if (!autoStart || hasAutoStartedRef.current || (recordingState !== 'idle' && recordingState !== 'requesting')) {
      return;
    }

    hasAutoStartedRef.current = true;
    startListening().catch((error) => {
      console.error('Auto-start listening failed:', error);
    });
  }, [autoStart, recordingState]);

  const resolvedFailureDisplay =
    failureDisplay || getFailureDisplay(createListenError('unknown', 'Could not reach backend.'));

  return (
    <div
      className={`flex w-full flex-col items-center gap-5 ${immersive ? 'max-w-md py-8 text-center' : 'py-4'}`}
      data-testid="audio-recorder"
    >
      <AnimatePresence mode={nativeAndroid ? 'wait' : 'sync'}>
        {recordingState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <button
              onClick={startListening}
              className={`relative flex items-center justify-center rounded-full transition-all active:scale-95 ${
                immersive
                  ? 'h-40 w-40 bg-gradient-to-br from-orange-500 via-amber-500 to-green-500 shadow-2xl shadow-orange-500/25 hover:scale-[1.02]'
                  : 'h-32 w-32 bg-primary shadow-lg hover:scale-105 hover:bg-primary/90'
              }`}
              data-testid="button-start-listening"
            >
              {immersive ? (
                <>
                  <div className="absolute inset-1 rounded-full bg-gradient-to-br from-orange-500/95 via-amber-500/95 to-green-500/95" />
                  <Mic className="relative z-10 h-16 w-16 text-white" />
                </>
              ) : (
                <Mic className="h-12 w-12 text-primary-foreground" />
              )}
            </button>
            <div className="space-y-2 text-center">
              <p className="text-lg font-medium">{immersive ? 'Tap to start listening' : 'Tap to Listen'}</p>
              {immersive ? (
                <p className="text-sm text-muted-foreground">Hold your device near the music.</p>
              ) : null}
            </div>
          </motion.div>
        )}

        {recordingState === 'requesting' && (
          <motion.div
            key="requesting"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className="flex flex-col items-center gap-4"
          >
            <RecognitionStageVisual mode="requesting" immersive={immersive} />
            <div className="space-y-2 text-center">
              <p className="text-xl font-semibold text-foreground">Getting ready to listen</p>
              <p className="text-sm text-muted-foreground">Checking the microphone.</p>
            </div>
          </motion.div>
        )}

        {recordingState === 'listening' && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985, transition: { duration: 0.18 } }}
            className="flex flex-col items-center gap-4"
          >
            <RecognitionStageVisual mode="listening" immersive={immersive} />

            <div className="space-y-2 text-center">
              <p className={`${immersive ? 'text-2xl' : 'text-lg'} font-semibold`}>Listening</p>
              <p className="max-w-xs text-sm text-muted-foreground">Hold near the music.</p>
            </div>
          </motion.div>
        )}

        {recordingState === 'identifying' && (
          <motion.div
            key="identifying"
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22 } }}
            exit={{ opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.16 } }}
            className="flex flex-col items-center gap-4"
          >
            <RecognitionStageVisual mode="matching" immersive={immersive} />
            <div className="space-y-2 text-center">
              <p className={`${immersive ? 'text-2xl' : 'text-lg'} font-semibold`}>Matching the song</p>
              <p className="max-w-xs text-sm text-muted-foreground">Locking in the strongest hit.</p>
            </div>
          </motion.div>
        )}

        {recordingState === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <RecognitionStageVisual mode="success" immersive={immersive} />
            <div className="space-y-2 text-center">
              <p className={`${immersive ? 'text-2xl' : 'text-lg'} font-semibold text-green-600 dark:text-green-400`}>Song found</p>
              {immersive ? (
                <p className="text-sm text-muted-foreground">Opening the meaning now.</p>
              ) : null}
            </div>
            <Button
              variant="outline"
              onClick={() => setRecordingState('idle')}
              data-testid="button-listen-again"
            >
              Listen again
            </Button>
          </motion.div>
        )}

        {recordingState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex w-full flex-col items-center gap-5"
          >
            <RecognitionStageVisual mode={resolvedFailureDisplay.orbMode} immersive={immersive} />
            <div
              className={`w-full max-w-sm rounded-[1.75rem] border border-border/70 px-5 py-5 text-center shadow-[0_20px_50px_rgba(15,23,42,0.18)] ${
                nativeAndroid ? 'bg-background/94' : 'bg-background/75 backdrop-blur-xl'
              }`}
            >
              <div className="space-y-2">
                <p className={`${immersive ? 'text-xl' : 'text-lg'} font-semibold text-foreground`}>
                  {resolvedFailureDisplay.title}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {resolvedFailureDisplay.body}
                </p>
              </div>
            </div>
            <Button
              onClick={startListening}
              size={immersive ? 'lg' : 'default'}
              className="min-w-[180px] rounded-full px-6 shadow-lg shadow-orange-500/20"
              data-testid="button-try-again"
            >
              {resolvedFailureDisplay.ctaLabel}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
