import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * PeacePad Native Push Notification Service
 * Handles native (Capacitor / FCM / APNs) ONLY
 * Web push is handled by usePushNotifications.ts hook
 * 
 * IMPORTANT: Native push permission requests must NEVER be called automatically
 * They must be user-initiated (button/toggle), after app mount, after Capacitor is ready
 */

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

let isInitialized = false;

export let pushEnabled = true;

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function canUseNotifications(): boolean {
  if (!pushEnabled) return false;
  if (isNativeApp()) {
    return Capacitor.isPluginAvailable('PushNotifications');
  }
  return 'Notification' in window;
}

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

/**
 * Request user permission - MUST be user-initiated (button click)
 * Never call this automatically on app load
 */
export async function requestPushConsent(): Promise<void> {
  if (!canUseNotifications()) {
    throw new Error('Push notifications disabled or unsupported');
  }

  if (isNativeApp()) {
    if (!Capacitor.isPluginAvailable('PushNotifications')) {
      throw new Error('PushNotifications plugin not available');
    }
    
    try {
      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive !== 'granted') {
        throw new Error('Permission denied');
      }
      await PushNotifications.register();
      await setupNativeListeners();
    } catch (err) {
      console.error('[Notifications] Native consent failed:', err);
      throw err;
    }
  } else {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permission denied');
    }
  }

  isInitialized = true;
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
    }
    isInitialized = false;
    console.log('[Notifications] Unregistered successfully');
  } catch (err) {
    console.error('[Notifications] Unregister failed:', err);
  }
}
