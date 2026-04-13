import { useState, useRef, useEffect } from 'react';
import { Mic, Loader2, Music, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { trackListenStarted } from '@/lib/analytics';
import { getApiUrl } from '@/lib/api-config';
import { 
  isNativeApp, 
  hasRecordingPermission, 
  requestRecordingPermission,
  startNativeRecording,
  stopNativeRecording,
  cancelNativeRecording
} from '@/lib/native-audio';

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

const LISTEN_REQUEST_TIMEOUT_MS = 45_000;

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

function classifyListenError(error: unknown): { title: string; description: string } {
  const listenError = error as ListenError;
  const kind = listenError?.kind;
  const message = String(listenError?.message || '').trim();

  switch (kind) {
    case 'offline':
      return {
        title: 'Internet no dey',
        description: 'Check your network, then try again.',
      };
    case 'backend_unreachable':
      return {
        title: 'Connection wahala',
        description: 'We no fit reach Saywetin server right now. Try again shortly.',
      };
    case 'timeout':
      return {
        title: 'E dey take too long',
        description: 'Server no answer in time. Try again.',
      };
    case 'microphone_denied':
      return {
        title: 'Mic permission needed',
        description: 'Allow microphone access make we fit hear the music.',
      };
    case 'capture_failed':
      return {
        title: 'Recording no gree',
        description: 'We no fit capture the sound well. Try again and keep the music close.',
      };
    case 'empty_audio':
      return {
        title: 'We no hear any song',
        description: 'Make sure the music dey play loud. Then try again.',
      };
    case 'no_result':
      return {
        title: 'We no hear any song',
        description: 'Make sure the music dey play loud. Then try again.',
      };
    case 'provider_failed':
      return {
        title: 'Music service wahala',
        description: message || 'Song recognition no complete this time. Try again shortly.',
      };
    case 'context_failed':
      return {
        title: 'Song don show, meaning never land',
        description: message || 'We found the track, but the deeper meaning no finish this time.',
      };
    case 'database_unavailable':
      return {
        title: 'Server dey rest small',
        description: 'Saywetin store no answer well. Try again shortly.',
      };
    case 'bad_response':
      return {
        title: 'Server answer no clear',
        description: 'We get invalid response from the server. Try again.',
      };
    default:
      return {
        title: 'E no work o',
        description: message || 'We no fit find the song. Try again abeg.',
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

  if (
    code === 'ACRCLOUD_UPSTREAM_UNAVAILABLE' ||
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
  const wrapperClass = immersive ? 'h-52 w-52' : 'h-36 w-36';
  const coreClass = immersive ? 'h-28 w-28' : 'h-20 w-20';
  const ringScale = mode === 'matching' ? 1.16 : mode === 'requesting' ? 1.1 : 1.3;
  const ringDuration = mode === 'matching' ? 1.9 : mode === 'requesting' ? 2.4 : 2.8;
  const coreAccent =
    mode === 'success'
      ? 'from-emerald-500 via-green-500 to-lime-500'
      : mode === 'error'
        ? 'from-muted via-muted to-muted'
        : 'from-orange-500 via-amber-500 to-green-500';

  return (
    <div className={`relative ${wrapperClass}`}>
      {[0, 1, 2, 3].map((index) => (
        <motion.div
          key={`${mode}-ring-${index}`}
          className="absolute inset-0 rounded-full border border-primary/20 bg-primary/5"
          animate={{
            scale: [0.82, ringScale, ringScale + 0.08],
            opacity: [0, 0.34 - index * 0.05, 0],
          }}
          transition={{
            duration: ringDuration,
            ease: 'easeOut',
            repeat: Infinity,
            delay: index * 0.22,
          }}
        />
      ))}

      <motion.div
        className="absolute inset-5 rounded-full bg-gradient-to-br from-orange-500/12 via-amber-500/12 to-green-500/12 blur-2xl"
        animate={{
          scale: mode === 'matching' ? [0.96, 1.05, 0.98] : [0.94, 1.08, 0.96],
          opacity: mode === 'matching' ? [0.28, 0.46, 0.3] : [0.22, 0.4, 0.24],
        }}
        transition={{
          duration: mode === 'matching' ? 1.8 : 2.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className={`${coreClass} rounded-full bg-gradient-to-br ${coreAccent} flex items-center justify-center shadow-2xl shadow-orange-500/25`}
          animate={
            mode === 'success'
              ? { scale: [0.96, 1.02, 1] }
              : mode === 'error'
                ? { scale: [1, 0.98, 1] }
                : { scale: [0.98, 1.04, 1], rotate: mode === 'matching' ? [0, 6, -6, 0] : [0, 0, 0] }
          }
          transition={{
            duration: mode === 'matching' ? 1.8 : 2.6,
            repeat: mode === 'success' ? 0 : Infinity,
            ease: 'easeInOut',
          }}
        >
          {mode === 'requesting' ? (
            <Loader2 className={`${immersive ? 'h-14 w-14' : 'h-10 w-10'} text-white animate-spin`} />
          ) : mode === 'listening' ? (
            <Volume2 className={`${immersive ? 'h-14 w-14' : 'h-10 w-10'} text-white`} />
          ) : mode === 'matching' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
            >
              <Music className={`${immersive ? 'h-14 w-14' : 'h-10 w-10'} text-white`} />
            </motion.div>
          ) : mode === 'success' ? (
            <Music className={`${immersive ? 'h-16 w-16' : 'h-12 w-12'} text-white`} />
          ) : (
            <Mic className={`${immersive ? 'h-14 w-14' : 'h-10 w-10'} text-muted-foreground`} />
          )}
        </motion.div>
      </div>
    </div>
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

export function AudioRecorder({
  onSuccess,
  listenDuration = 5,
  analyticsSource = 'other',
  autoStart = false,
  immersive = false,
}: AudioRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [progress, setProgress] = useState<number>(0);
  const { toast } = useToast();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoStartedRef = useRef(false);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    // Cancel any in-progress native recording
    if (isNativeApp()) {
      cancelNativeRecording();
    }
  };

  // Native recording for Capacitor (Android/iOS)
  const startNativeListening = async () => {
    try {
      console.log('[SAYWETIN] startNativeListening called, listenDuration:', listenDuration);
      setRecordingState('requesting');
      audioChunksRef.current = [];
      setProgress(0);

      let hasPermission = await hasRecordingPermission();
      console.log('[SAYWETIN] hasPermission:', hasPermission);
      if (!hasPermission) {
        hasPermission = await requestRecordingPermission();
        console.log('[SAYWETIN] requestPermission result:', hasPermission);
        if (!hasPermission) {
          throw createListenError('microphone_denied', 'Permission denied');
        }
      }

      const started = await startNativeRecording();
      console.log('[SAYWETIN] startNativeRecording result:', started);
      if (!started) {
        throw createListenError('capture_failed', 'Failed to start recording');
      }

      trackListenStarted({ source: analyticsSource });
      setRecordingState('listening');

      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setProgress(Math.min((elapsed / listenDuration) * 100, 100));
      }, 50);

      recordingTimeoutRef.current = setTimeout(async () => {
        console.log('[SAYWETIN] Recording timeout fired, stopping recording...');
        const audioBlob = await stopNativeRecording();
        cleanup();
        console.log('[SAYWETIN] audioBlob after stop:', audioBlob ? `${audioBlob.size} bytes, type: ${audioBlob.type}` : 'NULL');
        if (audioBlob && audioBlob.size > 0) {
          audioChunksRef.current = [audioBlob];
          handleUpload();
        } else {
          setRecordingState('error');
          const issue = classifyListenError(
            createListenError('capture_failed', 'Could not capture audio. Please try again.'),
          );
          toast({
            variant: 'destructive',
            title: issue.title,
            description: issue.description,
          });
        }
      }, listenDuration * 1000);

    } catch (error: any) {
      console.error('[SAYWETIN] Native recording failed:', error);
      cancelNativeRecording();
      cleanup();
      const issue = classifyListenError(
        isPermissionDeniedError(error)
          ? createListenError('microphone_denied', 'Permission denied')
          : (error as ListenError)?.kind
            ? error
            : createListenError('capture_failed', 'Failed to start recording'),
      );
      toast({
        variant: 'destructive',
        title: issue.title,
        description: issue.description,
      });
      setRecordingState('idle');
    }
  };

  // Web recording (fallback for browser)
  const startWebListening = async () => {
    try {
      const captureProfile = getWebCaptureProfile(listenDuration);
      const effectiveListenDuration = captureProfile.listenDurationSec;

      setRecordingState('requesting');
      audioChunksRef.current = [];
      setProgress(0);

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
      trackListenStarted({ source: analyticsSource });
      setRecordingState('listening');

      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setProgress(Math.min((elapsed / effectiveListenDuration) * 100, 100));
      }, 50);

      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          cleanup();
        }
      }, effectiveListenDuration * 1000);

    } catch (error: any) {
      console.error('Failed to start recording:', error);
      cleanup();
      const issue = classifyListenError(
        isPermissionDeniedError(error)
          ? createListenError('microphone_denied', 'Permission denied')
          : createListenError('capture_failed', 'Failed to capture audio'),
      );
      toast({
        variant: 'destructive',
        title: issue.title,
        description: issue.description,
      });
      setRecordingState('idle');
    }
  };

  // Main entry point - routes to native or web recording
  const startListening = async () => {
    if (isNativeApp()) {
      await startNativeListening();
    } else {
      await startWebListening();
    }
  };

  const sendAudioToServer = async (audioBlob: Blob, mimeType: string, ext: string): Promise<any> => {
    if (!audioBlob || audioBlob.size <= 0) {
      throw createListenError('empty_audio', 'No audio sample captured.');
    }

    const apiUrl = getApiUrl('/api/listen');
    console.log('[SAYWETIN-UPLOAD] Sending to:', apiUrl);

    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${ext}`);
    formData.append('duration', String(listenDuration));

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
    setRecordingState('identifying');
    setProgress(100);

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

      setRecordingState('success');

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setRecordingState('error');
      const issue = classifyListenError(normalizeUploadError(error));
      toast({
        variant: 'destructive',
        title: issue.title,
        description: issue.description,
      });
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  useEffect(() => {
    if (!autoStart || hasAutoStartedRef.current || recordingState !== 'idle') {
      return;
    }

    hasAutoStartedRef.current = true;
    startListening().catch((error) => {
      console.error('Auto-start listening failed:', error);
    });
  }, [autoStart, recordingState]);

  return (
    <div
      className={`flex w-full flex-col items-center gap-6 ${immersive ? 'max-w-sm py-8 text-center' : 'py-4'}`}
      data-testid="audio-recorder"
    >
      <AnimatePresence mode="wait">
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
                <p className="text-sm text-muted-foreground">Make sure your device can hear the song clearly</p>
              ) : null}
            </div>
          </motion.div>
        )}

        {recordingState === 'requesting' && (
          <motion.div
            key="requesting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <RecognitionStageVisual mode="requesting" immersive={immersive} />
            <div className="space-y-2 text-center">
              <p className="text-xl font-semibold text-foreground">Getting ready to listen</p>
              <p className="text-sm text-muted-foreground">
                {immersive ? 'Checking microphone access and preparing the recorder' : 'Requesting microphone...'}
              </p>
            </div>
          </motion.div>
        )}

        {recordingState === 'listening' && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <RecognitionStageVisual mode="listening" immersive={immersive} />
            
            <div className="space-y-2 text-center">
              <p className={`${immersive ? 'text-2xl' : 'text-lg'} font-semibold`}>Listening for music</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Make sure your device can hear the song clearly
              </p>
            </div>

            <div className={`${immersive ? 'w-56' : 'w-48'} h-1.5 bg-muted rounded-full overflow-hidden`}>
              <motion.div 
                className="h-full bg-primary rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        )}

        {recordingState === 'identifying' && (
          <motion.div
            key="identifying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <RecognitionStageVisual mode="matching" immersive={immersive} />
            <div className="space-y-2 text-center">
              <p className={`${immersive ? 'text-2xl' : 'text-lg'} font-semibold`}>Matching the song</p>
              <p className="max-w-xs text-sm text-muted-foreground">Hold on while we lock it in.</p>
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
              <p className={`${immersive ? 'text-2xl' : 'text-lg'} font-semibold text-green-600 dark:text-green-400`}>We don catch am!</p>
              {immersive ? (
                <p className="text-sm text-muted-foreground">Taking you to the meaning now.</p>
              ) : null}
            </div>
            <Button
              variant="outline"
              onClick={() => setRecordingState('idle')}
              data-testid="button-listen-again"
            >
              Hear Another One
            </Button>
          </motion.div>
        )}

        {recordingState === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <button
              onClick={startListening}
              className="transition-all active:scale-95"
              data-testid="button-try-again"
            >
              <RecognitionStageVisual mode="error" immersive={immersive} />
            </button>
            <div className="space-y-2 text-center">
              <p className={`${immersive ? 'text-xl' : 'text-lg'} font-medium`}>Tap to Try Again</p>
              <p className="max-w-xs text-sm text-muted-foreground">Make sure your device can hear the song clearly</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
