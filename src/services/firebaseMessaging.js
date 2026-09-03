import { getToken, onMessage } from 'firebase/messaging';
import { getFirebaseMessagingInstance, isFirebaseConfigured, VAPID_KEY, firebaseConfig } from '../config/firebase';
import { API_BASE } from '../config/api';

const WEB_TOKEN_KEY = 'jinkzo_fcm_web_token';
const DEVICE_ID_KEY = 'jinkzo_web_device_id';
const PERMISSION_REQUESTED_KEY = 'jinkzo_push_prompt_dismissed';

/**
 * Retrieve or generate a persistent device identifier for this browser instance
 */
export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'web_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Check if the current browser environment supports Push Notifications and Service Workers
 */
export function isPushNotificationSupported() {
  const checks = {
    hasWindow: typeof window !== 'undefined',
    hasNotification: typeof window !== 'undefined' && 'Notification' in window,
    hasServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    hasPushManager: typeof window !== 'undefined' && 'PushManager' in window,
    isFirebaseConfigured
  };
  const supported = Boolean(
    checks.hasWindow &&
    checks.hasNotification &&
    checks.hasServiceWorker &&
    checks.hasPushManager &&
    checks.isFirebaseConfigured
  );
  console.log('[FCM-DIAGNOSTIC] isPushNotificationSupported check:', { supported, ...checks });
  return supported;
}

let registrationInFlight = null;

/**
 * Register Firebase Web Push for the authenticated user
 * @param {string} authToken - Current user JWT
 * @param {object} user - Current user object
 * @param {boolean} forcePrompt - If true, ignores past dismissal and prompts user
 */
export async function registerWebPush(authToken, user, forcePrompt = false) {
  if (registrationInFlight) {
    console.log('[FCM-DIAGNOSTIC] registerWebPush already in flight, returning existing promise');
    return registrationInFlight;
  }

  registrationInFlight = (async () => {
    try {
      console.log('[FCM-DIAGNOSTIC] Stage 4: registerWebPush entry', {
        hasAuthToken: !!authToken,
        authTokenValue: authToken ? `${String(authToken).substring(0, 15)}...` : 'none',
        userEmail: user?.email,
        userRole: user?.role,
        userId: user?._id || user?.id,
        currentPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
      });

      if (!user) {
        console.warn('[FCM-DIAGNOSTIC] Early return: missing user object', { user });
        return null;
      }

      if (!isPushNotificationSupported()) {
        console.warn('[FCM-DIAGNOSTIC] Early return: Push notification not supported in this environment');
        return null;
      }

      // Handle permission states
      const currentPermission = Notification.permission;
      console.log('[FCM-DIAGNOSTIC] Stage 5: Notification.permission =', currentPermission);

      if (currentPermission === 'denied') {
        console.warn('[FCM-DIAGNOSTIC] Early return: Permission is DENIED by user in browser settings');
        return null;
      }

      if (currentPermission === 'default') {
        const alreadyPrompted = localStorage.getItem(PERMISSION_REQUESTED_KEY);
        console.log('[FCM-DIAGNOSTIC] Stage 5: Permission default, alreadyPrompted =', alreadyPrompted, 'forcePrompt =', forcePrompt);
        if (alreadyPrompted && !forcePrompt) {
          console.warn('[FCM-DIAGNOSTIC] Early return: default permission already prompted previously');
          return null;
        }

        localStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');
        const requested = await Notification.requestPermission();
        console.log('[FCM-DIAGNOSTIC] Stage 5: User prompt result =', requested);
        if (requested !== 'granted') {
          console.warn('[FCM-DIAGNOSTIC] Early return: Permission was not granted on prompt');
          return null;
        }
      }

      // At this point, permission is granted. Obtain messaging instance.
      console.log('[FCM-DIAGNOSTIC] Stage 6: Obtaining Firebase Messaging instance...');
      const messaging = await getFirebaseMessagingInstance();
      console.log('[FCM-DIAGNOSTIC] Stage 6 Result: messaging instance =', !!messaging);
      if (!messaging) {
        console.warn('[FCM-DIAGNOSTIC] Early return: getFirebaseMessagingInstance returned null');
        return null;
      }

      // Register / update the Firebase messaging service worker
      const swParams = new URLSearchParams();
      if (firebaseConfig.apiKey) swParams.set('apiKey', firebaseConfig.apiKey);
      if (firebaseConfig.projectId) swParams.set('projectId', firebaseConfig.projectId);
      if (firebaseConfig.messagingSenderId) swParams.set('messagingSenderId', firebaseConfig.messagingSenderId);
      if (firebaseConfig.appId) swParams.set('appId', firebaseConfig.appId);

      const swUrl = `/firebase-messaging-sw.js?${swParams.toString()}`;
      console.log('[FCM-DIAGNOSTIC] Stage 7: Registering Service Worker at', swUrl);
      await navigator.serviceWorker.register(swUrl, { scope: '/' });
      console.log('[FCM-DIAGNOSTIC] Stage 7: Waiting for navigator.serviceWorker.ready...');
      const readyReg = await navigator.serviceWorker.ready;
      console.log('[FCM-DIAGNOSTIC] Stage 7 Result: Service Worker active =', !!readyReg.active, 'scope =', readyReg.scope);

      // Retrieve FCM Web Token
      const tokenOptions = {
        serviceWorkerRegistration: readyReg
      };
      if (VAPID_KEY) {
        tokenOptions.vapidKey = VAPID_KEY;
      }

      console.log('[FCM-DIAGNOSTIC] Stage 8: Calling getToken() with VAPID_KEY =', !!VAPID_KEY);
      const pushToken = await getToken(messaging, tokenOptions);
      console.log('[FCM-DIAGNOSTIC] Stage 8 Result: pushToken received =', !!pushToken, pushToken ? `${pushToken.substring(0, 12)}...` : 'null');

      if (!pushToken) {
        console.warn('[FCM-DIAGNOSTIC] Early return: Empty FCM token received from Firebase');
        return null;
      }

      // Save token locally
      localStorage.setItem(WEB_TOKEN_KEY, pushToken);

      // Sync token with backend
      const role = user.role === 'user' ? 'customer' : (user.role || 'customer');
      const deviceId = getOrCreateDeviceId();
      const tokenToUse = authToken || localStorage.getItem('qb-auth-token') || localStorage.getItem('token');

      console.log('[FCM-DIAGNOSTIC] Stage 9: Sending POST to /api/notifications/register-device', {
        role,
        deviceId,
        hasToken: !!tokenToUse
      });

      const headers = { 'Content-Type': 'application/json' };
      if (tokenToUse && tokenToUse !== 'cookie-auth-active') {
        headers['Authorization'] = `Bearer ${tokenToUse}`;
      }

      const res = await fetch(`${API_BASE}/notifications/register-device`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          pushToken,
          platform: 'web',
          deviceId,
          role
        })
      });

      console.log('[FCM-DIAGNOSTIC] Stage 10 Result: Backend HTTP Status =', res.status, res.statusText);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn('[WebPush] Backend registration failed:', errData.message || res.status);
      } else {
        const responseData = await res.json().catch(() => ({}));
        console.log('[WebPush] Firebase Web FCM token registered successfully with backend for role:', role, responseData);
      }

      return pushToken;
    } catch (err) {
      console.error('[FCM-DIAGNOSTIC] Web push registration error:', err?.message || err, err);
      return null;
    } finally {
      registrationInFlight = null;
    }
  })();

  return registrationInFlight;
}

/**
 * Unregister Web Push token from backend on user logout
 */
export async function unregisterWebPush(authToken) {
  try {
    const pushToken = localStorage.getItem(WEB_TOKEN_KEY);
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    const tokenToUse = authToken || localStorage.getItem('qb-auth-token') || localStorage.getItem('token');

    if ((pushToken || deviceId)) {
      const headers = { 'Content-Type': 'application/json' };
      if (tokenToUse && tokenToUse !== 'cookie-auth-active') {
        headers['Authorization'] = `Bearer ${tokenToUse}`;
      }

      await fetch(`${API_BASE}/notifications/unregister-device`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          pushToken: pushToken || undefined,
          deviceId: deviceId || undefined
        })
      }).catch(() => {});
    }

    localStorage.removeItem(WEB_TOKEN_KEY);
  } catch (err) {
    console.warn('[WebPush] Web push unregistration error:', err);
  }
}

/**
 * Attach foreground message listener for active browser tab
 */
export async function setupForegroundNotificationListener(onNotificationReceived) {
  try {
    const messaging = await getFirebaseMessagingInstance();
    if (!messaging) return () => {};

    return onMessage(messaging, (payload) => {
      console.log('[WebPush] Foreground push notification received:', payload);
      if (typeof onNotificationReceived === 'function') {
        onNotificationReceived(payload);
      }
    });
  } catch (err) {
    console.warn('[WebPush] Error attaching foreground listener:', err);
    return () => {};
  }
}
