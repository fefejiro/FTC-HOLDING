import webpush from 'web-push';
import { storage } from './storage';
import { config } from './config';

// NOTE: firebase-admin package needs to be installed for native push notifications
let admin: any = null;
let firebaseInitialized = false;

// VAPID keys from environment variables
// Generate keys with: npx web-push generate-vapid-keys
// Development fallback keys (REPLACE IN PRODUCTION)
const DEV_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFVvGPlWkZ5bvAKixGJXnRnZNfLKvShYvH9I44lBuDzKRk';
const DEV_PRIVATE_KEY = 'vL7u8JXqShHEhVfuJ-TZ1JQrj1NKT65wHO4nG5fKsqM';

// Clean VAPID keys (remove any trailing =, whitespace, or newlines)
function cleanVapidKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return key.trim().replace(/[\s\n\r=]+/g, '');
}

const VAPID_PUBLIC_KEY = cleanVapidKey(config.integrations.vapidPublicKey) || DEV_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = cleanVapidKey(config.integrations.vapidPrivateKey) || DEV_PRIVATE_KEY;

// Warn if using development keys in production
if (!config.integrations.vapidPublicKey && config.isProduction) {
  console.warn('WARNING: Using development VAPID keys. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables for production!');
}

// Configure web-push with VAPID details
try {
  webpush.setVapidDetails(
    config.integrations.vapidEmail || 'mailto:support@peacepad.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push VAPID configured successfully');
} catch (error: any) {
  console.error('❌ Failed to configure VAPID:', error?.message);
  console.warn('Web push notifications will not work. Check VAPID key format.');
}

// CRITICAL: Initialization promise to prevent race conditions
// sendPushNotification will await this before attempting FCM delivery
const firebaseInitPromise = (async () => {
  try {
    const firebaseModule = await import('firebase-admin');
    admin = firebaseModule.default || firebaseModule;
    console.log('✅ firebase-admin package loaded successfully');
    
    // Initialize Firebase Admin SDK for FCM/APNs.
    // Accepts FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON_PATH.
    const firebaseServiceAccountJson = config.integrations.firebaseServiceAccountJson;
    if (firebaseServiceAccountJson) {
      try {
        const serviceAccount = JSON.parse(firebaseServiceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        firebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin SDK:', error);
        console.warn('Native push notifications will not work. Check FIREBASE_SERVICE_ACCOUNT_JSON configuration.');
      }
    } else {
      console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT_JSON not set. Native push notifications disabled.');
    }
  } catch (error: any) {
    console.warn('⚠️  firebase-admin failed to load:', error?.message || error);
    console.warn('Native push notifications will not work. Install with: npm install --legacy-peer-deps firebase-admin');
  }
})();

// Helper function to serialize data object for FCM (requires all string values)
function serializeFCMData(data: any): Record<string, string> {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const serialized: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      continue; // Skip null/undefined values
    }
    // Convert all values to strings (FCM requirement)
    serialized[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return serialized;
}

// Android notification channel IDs (must match MainActivity.java)
const ANDROID_CHANNEL_IDS = {
  messages: 'peacepad_messages',
  conch: 'peacepad_conch',
  general: 'peacepad_general',
};

export async function sendPushNotification(userId: string, notification: {
  title: string;
  body: string;
  icon?: string;
  data?: any;
  actions?: Array<{ action: string; title: string }>;
  channel?: 'messages' | 'conch' | 'general'; // Which notification channel to use
}) {
  try {
    // CRITICAL: Wait for firebase-admin to initialize before sending notifications
    // This prevents race conditions where early notifications are silently dropped
    await firebaseInitPromise;
    
    // Get all push subscriptions for the user
    const subscriptions = await storage.getPushSubscriptionsByUser(userId);

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return;
    }

    // Send notification to all user's subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      // Handle web push
      if (sub.platform === 'web' && sub.endpoint && sub.p256dh && sub.auth) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const payload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon-192.png',
          badge: '/icon-192.png',
          data: notification.data || {},
          actions: notification.actions || [],
        });

        try {
          await webpush.sendNotification(pushSubscription, payload);
          console.log(`Web push notification sent to ${sub.endpoint}`);
        } catch (error: any) {
          // If subscription is invalid/expired, remove it
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`Removing invalid web subscription: ${sub.endpoint}`);
            await storage.deletePushSubscription({ endpoint: sub.endpoint || '' });
          } else {
            console.error(`Error sending web push to ${sub.endpoint}:`, error);
          }
        }
      }
      
      // Handle native push (FCM/APNs) via Firebase Cloud Messaging
      if ((sub.platform === 'android' || sub.platform === 'ios') && sub.deviceToken) {
        if (!firebaseInitialized || !admin) {
          console.warn(`Firebase Admin not initialized. Skipping native push for ${sub.platform}`);
          return;
        }

        try {
          // CRITICAL: FCM requires data payload to be string-only key-value pairs
          const serializedData = serializeFCMData(notification.data);
          
          const message: any = {
            token: sub.deviceToken,
            notification: {
              title: notification.title,
              body: notification.body,
            },
            data: serializedData,
          };

          // Platform-specific configuration
          if (sub.platform === 'android') {
            // Determine which notification channel to use
            const channelId = notification.channel 
              ? ANDROID_CHANNEL_IDS[notification.channel] 
              : ANDROID_CHANNEL_IDS.general;
            
            message.android = {
              priority: 'high',
              notification: {
                channelId: channelId, // Required for Android 8+ to respect user sound/vibration settings
                icon: 'notification_icon',
                color: '#7C3AED', // PeacePad primary color
                // NOTE: Don't set sound here - let the channel handle it
                // This ensures notifications respect the user's phone settings (silent/vibrate/ring)
              },
            };
          } else if (sub.platform === 'ios') {
            message.apns = {
              payload: {
                aps: {
                  alert: {
                    title: notification.title,
                    body: notification.body,
                  },
                  sound: 'default',
                  badge: 1,
                  // iOS action buttons require category registration
                },
              },
            };
          }

          await admin.messaging().send(message);
          console.log(`Native push notification sent to ${sub.platform} device: ${sub.deviceToken}`);
        } catch (error: any) {
          console.error(`Error sending native push to ${sub.platform}:`, error);
          
          // If token is invalid/expired, remove it by deviceToken
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered') {
            console.log(`Removing invalid ${sub.platform} token: ${sub.deviceToken}`);
            await storage.deletePushSubscription({ deviceToken: sub.deviceToken || '' });
          }
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}
