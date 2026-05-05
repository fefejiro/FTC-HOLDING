import { useRef, useCallback, useEffect } from 'react';
import { getApiUrl } from '@/lib/api-config';

type InteractionType =
  | 'recognition_success'
  | 'open_artist_info'
  | 'expand_song_context'
  | 'view_phrase_interpretation'
  | 'open_spotify'
  | 'add_lyrics_click'
  | 'collapse_section'
  | 'scroll_depth_reached';

interface InteractionEvent {
  sessionId: string;
  trackId?: string;
  confidenceBucket?: 'high' | 'medium' | 'low';
  interactionType: InteractionType;
  isAuto?: boolean;
  timeSinceRecognition?: number;
  dwellTime?: number;
}

const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

const getConfidenceBucket = (score?: number): 'high' | 'medium' | 'low' | undefined => {
  if (score === undefined || score === null) return undefined;
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

export function useInteractionLogger(trackId?: string, confidenceScore?: number) {
  const sessionIdRef = useRef<string>(generateSessionId());
  const recognitionTimeRef = useRef<number>(Date.now());
  const pendingEventsRef = useRef<InteractionEvent[]>([]);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confidenceBucket = getConfidenceBucket(confidenceScore);

  const getTimeSinceRecognition = useCallback(() => {
    return Math.floor((Date.now() - recognitionTimeRef.current) / 1000);
  }, []);

  const flushEvents = useCallback(async () => {
    if (pendingEventsRef.current.length === 0) return;

    const events = [...pendingEventsRef.current];
    pendingEventsRef.current = [];

    try {
      await fetch(getApiUrl('/api/analytics/log'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    } catch {
      // Silent fail - analytics should never block UI
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    flushTimeoutRef.current = setTimeout(flushEvents, 2000);
  }, [flushEvents]);

  const logInteraction = useCallback((
    interactionType: InteractionType,
    options?: { isAuto?: boolean; dwellTime?: number }
  ) => {
    const event: InteractionEvent = {
      sessionId: sessionIdRef.current,
      trackId,
      confidenceBucket,
      interactionType,
      isAuto: options?.isAuto ?? false,
      timeSinceRecognition: getTimeSinceRecognition(),
      dwellTime: options?.dwellTime,
    };

    pendingEventsRef.current.push(event);
    scheduleFlush();
  }, [trackId, confidenceBucket, getTimeSinceRecognition, scheduleFlush]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      if (pendingEventsRef.current.length > 0) {
        navigator.sendBeacon?.(
          getApiUrl('/api/analytics/log'),
          JSON.stringify({ events: pendingEventsRef.current })
        );
      }
    };
  }, []);

  return { logInteraction };
}
