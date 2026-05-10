/**
 * Network status detection for slow-network aware UX
 * Provides hooks and utilities to detect connection quality and adapt messaging
 */

import { useEffect, useRef, useState } from 'react';

export type NetworkStatus = 'online' | 'slow' | 'offline' | 'unknown';

export type NetworkQuality = {
  status: NetworkStatus;
  isSlowNetwork: boolean;
  isOffline: boolean;
  message: string;
};

/**
 * Hook to detect network quality and provide adaptive messaging
 * Uses fetch performance and error patterns to infer connection quality
 */
export function useNetworkStatus(): NetworkQuality {
  const [status, setStatus] = useState<NetworkStatus>('unknown');
  const lastCheckRef = useRef<number>(0);
  const slowCounterRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    const checkNetworkQuality = async () => {
      if (Date.now() - lastCheckRef.current < 5000) {
        return; // Don't check too frequently
      }

      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('/api/health', {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        if (isMounted) {
          // Classify based on response time
          if (duration > 2000) {
            slowCounterRef.current = Math.min(slowCounterRef.current + 1, 3);
            setStatus(slowCounterRef.current >= 2 ? 'slow' : 'online');
          } else if (response.ok) {
            slowCounterRef.current = Math.max(slowCounterRef.current - 1, 0);
            setStatus(slowCounterRef.current > 0 ? 'slow' : 'online');
          }
        }
      } catch (error) {
        if (isMounted) {
          // Timeout or network error
          if (error instanceof Error && error.message.includes('abort')) {
            setStatus('slow');
          } else {
            setStatus('offline');
          }
        }
      }

      lastCheckRef.current = Date.now();
    };

    // Initial check
    checkNetworkQuality();

    // Periodic checks (every 10s)
    const interval = setInterval(checkNetworkQuality, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const messageMap: Record<NetworkStatus, string> = {
    online: 'Connected',
    slow: 'Connection is slow',
    offline: 'You seem offline',
    unknown: 'Checking connection...',
  };

  return {
    status,
    isSlowNetwork: status === 'slow',
    isOffline: status === 'offline',
    message: messageMap[status],
  };
}

/**
 * Utility to check if a request should be retried based on network status
 */
export function shouldRetryOnNetwork(error: unknown, networkStatus: NetworkStatus): boolean {
  const isNetworkError = error instanceof TypeError && 
    (error.message.includes('fetch') || error.message.includes('network'));
  
  return isNetworkError && (networkStatus === 'slow' || networkStatus === 'offline');
}

/**
 * Utility to determine if a timeout should be extended on slow networks
 */
export function getAdjustedTimeout(baseMs: number, networkStatus: NetworkStatus): number {
  if (networkStatus === 'slow') {
    return Math.ceil(baseMs * 1.5); // 50% longer
  }
  if (networkStatus === 'offline') {
    return Math.ceil(baseMs * 2); // 2x longer
  }
  return baseMs;
}
