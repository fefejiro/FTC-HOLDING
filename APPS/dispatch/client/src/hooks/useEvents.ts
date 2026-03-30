import { useEffect, useRef, useState } from 'react';

interface EventHandlers {
  onRequestNew?: (data: unknown) => void;
  onRequestUpdated?: (data: unknown) => void;
  onIncidentNew?: (data: unknown) => void;
  onIncidentUpdated?: (data: unknown) => void;
}

/**
 * Connects to /api/events (SSE) and calls handlers on each event.
 * EventSource auto-reconnects on network loss.
 */
export function useEvents(handlers: EventHandlers): { connected: boolean } {
  // Keep a ref so handlers never cause the effect to re-run.
  const ref = useRef(handlers);
  const [connected, setConnected] = useState(false);
  ref.current = handlers;

  useEffect(() => {
    const es = new EventSource('/api/events');
    es.onopen = () => setConnected(true);

    es.addEventListener('request:new', (e: Event) => {
      try {
        ref.current.onRequestNew?.(JSON.parse((e as MessageEvent).data));
      } catch {
        // Ignore malformed payloads.
      }
    });

    es.addEventListener('request:updated', (e: Event) => {
      try {
        ref.current.onRequestUpdated?.(JSON.parse((e as MessageEvent).data));
      } catch {
        // Ignore malformed payloads.
      }
    });

    es.addEventListener('incident:new', (e: Event) => {
      try {
        ref.current.onIncidentNew?.(JSON.parse((e as MessageEvent).data));
      } catch {
        // Ignore malformed payloads.
      }
    });

    es.addEventListener('incident:updated', (e: Event) => {
      try {
        ref.current.onIncidentUpdated?.(JSON.parse((e as MessageEvent).data));
      } catch {
        // Ignore malformed payloads.
      }
    });

    es.onerror = () => {
      setConnected(false);
      // EventSource will reconnect automatically.
    };

    return () => {
      setConnected(false);
      es.close();
    };
  }, []); // intentionally empty - connects once, stays open

  return { connected };
}
