// Jinkzo — Firebase Cloud Messaging Service Worker for Web Push
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js');

// Parse Firebase configuration from query parameters or fallback
const urlParams = new URLSearchParams(location.search);
const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || '',
  authDomain: urlParams.get('authDomain') || '',
  projectId: urlParams.get('projectId') || '',
  storageBucket: urlParams.get('storageBucket') || '',
  messagingSenderId: urlParams.get('messagingSenderId') || '',
  appId: urlParams.get('appId') || ''
};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // ── Background Push Message Handler ──────────────────────────────────────────
    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM-SW] Received background message:', payload);
      const title = payload.notification?.title || payload.data?.title || 'Jinkzo Notification';
      const body = payload.notification?.body || payload.data?.message || payload.data?.body || '';
      const orderId = payload.data?.orderId || '';

      const notificationOptions = {
        body,
        icon: payload.notification?.icon || '/favicon.png',
        badge: '/favicon.png',
        data: payload.data || {},
        tag: orderId ? `jinkzo-order-${orderId}` : `jinkzo-${Date.now()}`,
        renotify: true,
        vibrate: [200, 100, 200]
      };

      return self.registration.showNotification(title, notificationOptions);
    });
  } catch (err) {
    console.warn('[FCM-SW] Error initializing Firebase Messaging in service worker:', err);
  }
}

// ── Notification Click Handler & Deep-Linking ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  // Resolve target URL
  let targetPath = '/';
  if (data.url) {
    targetPath = data.url;
  } else if (data.orderId) {
    targetPath = `/order-tracking/${data.orderId}`;
  } else if (data.recipientRole === 'restaurant' || data.screen === 'restaurant-orders') {
    targetPath = '/restaurant-dashboard';
  } else if (data.recipientRole === 'delivery' || data.screen === 'rider-orders') {
    targetPath = '/delivery-dashboard';
  } else if (data.screen === 'notifications') {
    targetPath = '/profile';
  }

  const fullTargetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. If an existing Jinkzo tab is already open, focus it and navigate
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(fullTargetUrl);
          }
          return client.focus();
        }
      }
      // 2. Otherwise open a new browser window
      if (clients.openWindow) {
        return clients.openWindow(fullTargetUrl);
      }
    })
  );
});
