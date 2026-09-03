import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

// ── Firebase Web Client Configuration ─────────────────────────────────────────
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'jinkzo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'jinkzo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'jinkzo.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '71878062534',
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || null;

// Determine if Firebase Web configuration has minimum parameters
export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let app = null;
if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  } catch (err) {
    console.warn('[Firebase] Client initialization notice:', err);
  }
}

export { app };

/**
 * Safely retrieve the Firebase Messaging instance if supported by the browser environment
 */
export const getFirebaseMessagingInstance = async () => {
  if (!app) return null;
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (err) {
    console.warn('[Firebase] Messaging is not supported in this browser environment:', err);
  }
  return null;
};
