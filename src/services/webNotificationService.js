import { API_BASE } from '../config/api';

const FCM_TOKEN_STORAGE_KEY = 'jinkzo_web_fcm_token';

// Safe helper to mask tokens in logs
function maskToken(token) {
  if (!token || typeof token !== 'string') return 'N/A';
  if (token.length <= 16) return '***';
  return `${token.slice(0, 14)}...${token.slice(-6)}`;
}

/**
 * Check if the browser supports Web Push Notifications and Service Workers
 */
export function isWebPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Get current browser notification permission status ('default' | 'granted' | 'denied')
 */
export function getNotificationPermission() {
  if (!isWebPushSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Get Firebase client config from Vite environment variables
 */
function getFirebaseClientConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

let firebaseApp = null;
let firebaseMessaging = null;

/**
 * Lazily initialize Firebase Client SDK for Web Messaging
 */
async function initFirebaseMessaging() {
  if (firebaseMessaging) return firebaseMessaging;

  const config = getFirebaseClientConfig();
  if (!config.apiKey || !config.projectId) {
    console.warn('[WebNotification] Missing Firebase client environment variables. Web Push will remain inactive.');
    return null;
  }

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging } = await import('firebase/messaging');

    if (!getApps().length) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApps()[0];
    }

    firebaseMessaging = getMessaging(firebaseApp);
    return firebaseMessaging;
  } catch (err) {
    console.warn('[WebNotification] Firebase initialization error:', err.message);
    return null;
  }
}

/**
 * Register the Service Worker for background message delivery
 */
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const config = getFirebaseClientConfig();
    const params = new URLSearchParams({
      apiKey: config.apiKey || '',
      authDomain: config.authDomain || '',
      projectId: config.projectId || '',
      storageBucket: config.storageBucket || '',
      messagingSenderId: config.messagingSenderId || '',
      appId: config.appId || '',
    });

    const swUrl = `/firebase-messaging-sw.js?${params.toString()}`;
    const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.warn('[WebNotification] Service worker registration error:', err.message);
    return null;
  }
}

/**
 * Request notification permission and register FCM Web token with backend
 */
export async function setupWebNotifications(authToken, user) {
  if (!isWebPushSupported() || !authToken || !user) return null;

  try {
    // 1. Check existing permission
    let permission = Notification.permission;
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.log('[WebNotification] Browser notification permission not granted');
      return null;
    }

    // 2. Initialize Firebase & Service Worker
    const messaging = await initFirebaseMessaging();
    const swRegistration = await registerServiceWorker();

    if (!messaging || !swRegistration) return null;

    // 3. Obtain FCM Web Registration Token
    const { getToken, onMessage } = await import('firebase/messaging');
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

    const fcmToken = await getToken(messaging, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: swRegistration,
    });

    if (!fcmToken) {
      console.warn('[WebNotification] Failed to retrieve FCM Web Push token');
      return null;
    }

    // Safe debug logging (NEVER log full token)
    console.log('[WebNotification] FCM token retrieved:', {
      platform: 'web',
      maskedToken: maskToken(fcmToken),
    });

    // 4. Save token in local storage
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, fcmToken);

    // 5. Register with Jinkzo Backend
    let role = user.role || 'customer';
    if (role === 'user') role = 'customer';
    if (role === 'rider') role = 'delivery';

    const deviceId = `web_${navigator.userAgent.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}_${window.screen?.width || 0}`;

    const res = await fetch(`${API_BASE}/notifications/register-device`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        pushToken: fcmToken,
        platform: 'web',
        deviceId,
        role,
        appVersion: '1.0.0-web',
      }),
    });

    if (res.ok) {
      console.log('[WebNotification] Web device push token registered successfully on backend');
    }

    // 6. Setup foreground message listener
    try {
      onMessage(messaging, (payload) => {
        console.log('[WebNotification] Foreground message received:', payload);
        // Note: Socket.io in-app notifications and banner handle active foreground display.
      });
    } catch (e) {}

    return fcmToken;
  } catch (err) {
    console.warn('[WebNotification] Web Push setup error:', err.message);
    return null;
  }
}

/**
 * Unregister Web Push token from backend on logout
 */
export async function unregisterWebNotifications(authToken) {
  try {
    const fcmToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (fcmToken && authToken) {
      await fetch(`${API_BASE}/notifications/unregister-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pushToken: fcmToken }),
      }).catch(() => {});
    }
    localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
  } catch (err) {
    console.warn('[WebNotification] Unregistration error:', err.message);
  }
}
