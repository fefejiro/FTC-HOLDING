import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const SERVICE_WORKER_ENABLED = import.meta.env.VITE_ENABLE_SW === 'true';

/**
 * PeacePad Unified Push Notification Service
 * 
 * ARCHITECTURE:
 * - Web push: Auto-initialized on mount (safe)
 * - Native push: MUST be user-initiated (button/toggle) to prevent crash
 * 
 * CRITICAL RULE:
 * Native push permission requests must NEVER be called automatically.
 * They must be user-initiated, after app mount, after Capacitor is ready.
 */

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

let isInitialized = false;

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if notifications are available
 */
export function canUseNotifications(): boolean {
  if (isNativeApp()) {
    return Capacitor.isPluginAvailable('PushNotifications');
  }
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Initialize notifications - WEB ONLY
 * Native push must be user-initiated via requestNativePushConsent()
 */
export async function initializeNotifications(): Promise<void> {
  if (isInitialized) {
    console.log('[Notifications] Already initialized');
    return;
  }

  // CRITICAL: Never auto-initialize on native - causes crash
  if (isNativeApp()) {
    console.log('[Notifications] Native mode - skipping auto-init (must be user-initiated)');
    return;
  }

  try {
    await initWebPush();
    isInitialized = true;
  } catch (error) {
    console.error('[Notifications] Web initialization failed:', error);
    throw error;
  }
}

/**
 * Initialize web push notifications (Service Worker + VAPID)
 */
async function initWebPush(): Promise<void> {
  console.log('[Notifications] Initializing web push...');

  if (!SERVICE_WORKER_ENABLED) {
    console.warn('[Notifications] Service Worker disabled by config (VITE_ENABLE_SW!=true)');
    return;
  }
  
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Web push not supported in this browser');
  }

  // Initialization may run during app startup. It must never trigger the
  // browser permission prompt; only an explicit user action may do that.
  if (Notification.permission !== 'granted') {
    console.log('[Notifications] Web permission has not been granted; skipping auto-init');
    return;
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  
  console.log('[Notifications] Service worker registered');

  const response = await fetch('/api/push/vapid-public-key');
  const { publicKey } = await response.json();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const subscriptionJSON = subscription.toJSON();
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      endpoint: subscriptionJSON.endpoint,
      p256dh: subscriptionJSON.keys?.p256dh,
      auth: subscriptionJSON.keys?.auth,
    }),
  });

  console.log('[Notifications] Web push initialized ✅');
}

/**
 * Request native push permission - MUST BE USER-INITIATED
 * Call this from a button click, not on mount
 */
export async function requestNativePushConsent(): Promise<void> {
  if (!isNativeApp()) {
    throw new Error('Not a native app');
  }

  if (!Capacitor.isPluginAvailable('PushNotifications')) {
    throw new Error('PushNotifications plugin not available');
  }

  try {
    console.log('[Notifications] Requesting native push permission...');
    const permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive !== 'granted') {
      throw new Error('Permission denied');
    }

    await PushNotifications.register();
    await setupNativeListeners();
    
    isInitialized = true;
    console.log('[Notifications] Native push initialized ✅');
  } catch (err) {
    console.error('[Notifications] Native consent failed:', err);
    throw err;
  }
}

/**
 * Check permission status
 */
export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!canUseNotifications()) return 'denied';

  if (isNativeApp()) {
    try {
      const perm = await PushNotifications.checkPermissions();
      return perm.receive === 'granted' ? 'granted' :
             perm.receive === 'denied' ? 'denied' : 'prompt';
    } catch (err) {
      console.error('[Notifications] Failed to check native permissions:', err);
      return 'denied';
    }
  }

  if (!('Notification' in window)) return 'denied';
  const perm = Notification.permission;
  return perm === 'default' ? 'prompt' : perm;
}

async function setupNativeListeners() {
  if (!isNativeApp()) return;
  if (!Capacitor.isPluginAvailable('PushNotifications')) return;

  try {
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[Notifications] Native device registration completed');
      try {
        await fetch('/api/push/register-native', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: token.value, platform: Capacitor.getPlatform() }),
        });
      } catch (err) {
        console.error('[Notifications] Failed to save token:', err);
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[Notifications] Registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[Notifications] Push received');
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[Notifications] Notification action received');
      const data = action.notification.data;
      if (data.url) window.location.href = data.url;
      else if (data.conversationId) window.location.href = '/messages';
      else if (data.sessionId) window.location.href = '/conch-mode';
    });
  } catch (err) {
    console.error('[Notifications] Failed to setup native listeners:', err);
  }
}

export async function unregisterNotifications(): Promise<void> {
  if (!canUseNotifications()) return;

  try {
    if (isNativeApp() && Capacitor.isPluginAvailable('PushNotifications')) {
      await PushNotifications.removeAllListeners();
      await fetch('/api/push/unregister-native', { method: 'POST', credentials: 'include' });
    } else {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
    }
    isInitialized = false;
    console.log('[Notifications] Unregistered successfully');
  } catch (err) {
    console.error('[Notifications] Unregister failed:', err);
  }
}

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
