import { useEffect, useRef } from 'react';

interface EventHandlers {
  onRequestNew?: (data: unknown) => void;
  onRequestUpdated?: (data: unknown) => void;
  onIncidentNew?: (data: unknown) => void;
}

/**
 * Connects to /api/events (SSE) and calls handlers on each event.
 * EventSource auto-reconnects on network loss — no polling needed.
 */
export function useEvents(handlers: EventHandlers): void {
  // Keep a ref so handlers never cause the effect to re-run
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const es = new EventSource('/api/events');

    es.addEventListener('request:new', (e: Event) => {
      try {
        ref.current.onRequestNew?.(JSON.parse((e as MessageEvent).data));
      } catch { /* malformed payload */ }
    });

    es.addEventListener('request:updated', (e: Event) => {
      try {
        ref.current.onRequestUpdated?.(JSON.parse((e as MessageEvent).data));
      } catch { /* malformed payload */ }
    });

    es.addEventListener('incident:new', (e: Event) => {
      try {
        ref.current.onIncidentNew?.(JSON.parse((e as MessageEvent).data));
      } catch { /* malformed payload */ }
    });

    es.onerror = () => {
      // EventSource will reconnect automatically — no action needed
    };

    return () => es.close();
  }, []); // intentionally empty — connects once, stays open
}
