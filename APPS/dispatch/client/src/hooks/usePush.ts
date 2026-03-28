import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface UsePushOptions {
  operatorId: string | null;
}

interface UsePushResult {
  isSubscribed: boolean;
  isSupported: boolean;
  subscribe: () => Promise<void>;
}

export function usePush({ operatorId }: UsePushOptions): UsePushResult {
  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!isSupported || !operatorId) return;

    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) setIsSubscribed(true);
      })
      .catch(() => {/* ignore */});
  }, [isSupported, operatorId]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !operatorId) return;

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[push] Permission denied');
        return;
      }

      // Fetch VAPID public key
      const keyRes = await fetch('/api/push/vapid-key');
      if (!keyRes.ok) {
        console.warn('[push] VAPID key not available');
        return;
      }
      const { publicKey } = await keyRes.json() as { publicKey: string };

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, subscription }),
      });

      setIsSubscribed(true);
      console.log('[push] Subscribed successfully');
    } catch (err) {
      console.error('[push] Subscription failed:', err);
    }
  }, [isSupported, operatorId]);

  return { isSubscribed, isSupported, subscribe };
}
