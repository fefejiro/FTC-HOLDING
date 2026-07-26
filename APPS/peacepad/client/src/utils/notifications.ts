// Web Push notification management for PeacePad
// Using W3C Push API with VAPID (not FCM)

let registration: ServiceWorkerRegistration | null = null;
const SERVICE_WORKER_ENABLED = import.meta.env.VITE_ENABLE_SW === 'true';

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Initialize push notifications
 * Request permission and register service worker
 */
export async function initPushNotifications(): Promise<PushSubscriptionData | null> {
  try {
    if (!SERVICE_WORKER_ENABLED) {
      console.warn('[notifications] Service Worker disabled by config (VITE_ENABLE_SW!=true)');
      return null;
    }

    // Check if service worker and push are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('[notifications] Service Worker not supported');
      return null;
    }

    if (!('PushManager' in window)) {
      console.warn('[notifications] Push notifications not supported');
      return null;
    }

    // Register service worker if not already registered
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[notifications] Service Worker registered');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
    }

    // Initialization can occur outside a user gesture. Never trigger a
    // permission prompt here; Settings and the contextual notification banner
    // own the explicit request flow.
    if (Notification.permission !== 'granted') {
      console.log('[notifications] Notification permission has not been granted');
      return null;
    }

    console.log('[notifications] Notification permission granted');

    // Get VAPID public key from server
    const response = await fetch('/api/push/vapid-public-key');
    if (!response.ok) {
      throw new Error('Failed to get VAPID public key');
    }
    
    const { publicKey } = await response.json();

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    console.log('[notifications] Push subscription created');

    // Extract subscription data
    const subscriptionJSON = subscription.toJSON();
    
    if (!subscriptionJSON.endpoint || !subscriptionJSON.keys?.p256dh || !subscriptionJSON.keys?.auth) {
      throw new Error('Invalid subscription data');
    }

    const subscriptionData: PushSubscriptionData = {
      endpoint: subscriptionJSON.endpoint,
      p256dh: subscriptionJSON.keys.p256dh,
      auth: subscriptionJSON.keys.auth,
    };

    // Send subscription to server
    await saveSubscriptionToServer(subscriptionData);

    return subscriptionData;
  } catch (error) {
    console.error('[notifications] Failed to initialize push:', error);
    return null;
  }
}

/**
 * Save push subscription to server
 */
async function saveSubscriptionToServer(subscription: PushSubscriptionData): Promise<void> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    console.log('[notifications] Subscription saved to server');
  } catch (error) {
    console.error('[notifications] Failed to save subscription:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      return false;
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe();
    
    // Remove from server
    await fetch('/api/push/unsubscribe', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    console.log('[notifications] Unsubscribed from push');
    return true;
  } catch (error) {
    console.error('[notifications] Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Check if user has granted notification permission
 */
export function hasNotificationPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Check if user has an active push subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    
    return subscription !== null;
  } catch (error) {
    console.error('[notifications] Failed to check subscription:', error);
    return false;
  }
}

/**
 * Listen for foreground push messages
 * (messages received when app is open)
 */
export function onForegroundPush(handler: (payload: any) => void): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'push-notification') {
      try {
        handler(event.data.payload);
      } catch (error) {
        console.error('[notifications] Foreground push handler error:', error);
      }
    }
  });
}

/**
 * Helper function to convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}
