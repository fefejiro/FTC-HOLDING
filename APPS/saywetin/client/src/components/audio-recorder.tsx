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
        title: 'Song don show, story never land',
        description: message || 'We found the track, but the deeper explanation no finish this time.',
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
      toast({
        title: 'We don catch am!',
        description: (
          <div className="flex items-center gap-3 mt-1">
            {result.recognizedTrack.coverArtUrl && (
              <img 
                src={result.recognizedTrack.coverArtUrl} 
                alt={result.recognizedTrack.title} 
                className="w-10 h-10 rounded object-cover"
              />
            )}
            <div>
              <p className="font-semibold">{result.recognizedTrack.title}</p>
              <p className="text-sm opacity-90">{result.recognizedTrack.artist}</p>
            </div>
          </div>
        ) as any,
      });

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

  return (
    <div className="flex flex-col items-center gap-6 py-4" data-testid="audio-recorder">
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
              className="relative w-32 h-32 rounded-full bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-lg"
              data-testid="button-start-listening"
            >
              <Mic className="h-12 w-12 text-primary-foreground" />
            </button>
            <p className="text-lg font-medium">Tap to Listen</p>
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
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">Requesting microphone...</p>
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
            <div className="relative w-32 h-32">
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-2 rounded-full bg-primary/30"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              />
              <motion.div
                className="absolute inset-4 rounded-full bg-primary/40"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                  <Volume2 className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-lg font-medium">Dey hear am...</p>
              <p className="text-sm text-muted-foreground">Make the music dey play</p>
            </div>

            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
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
            <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center">
              <Loader2 className="h-12 w-12 text-primary-foreground animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Dey find am...</p>
              <p className="text-sm text-muted-foreground">We dey check millions of songs</p>
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
            <div className="w-32 h-32 rounded-full bg-green-500/20 flex items-center justify-center">
              <Music className="h-12 w-12 text-green-500" />
            </div>
            <p className="text-lg font-medium text-green-600 dark:text-green-400">We don catch am!</p>
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
              className="relative w-32 h-32 rounded-full bg-muted hover:bg-muted/80 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
              data-testid="button-try-again"
            >
              <Mic className="h-12 w-12 text-muted-foreground" />
            </button>
            <div className="text-center">
              <p className="text-lg font-medium">Tap to Try Again</p>
              <p className="text-sm text-muted-foreground">Make sure the music dey play loud</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
