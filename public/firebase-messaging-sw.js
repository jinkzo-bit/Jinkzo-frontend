/* eslint-disable no-undef */
// ══════════════════════════════════════════════════════════════════════════════
// Jinkzo — Firebase Cloud Messaging Service Worker for Web Background Push
// ══════════════════════════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Parse query params passed during service worker registration if available
const swUrl = new URL(location);
const searchParams = swUrl.searchParams;

const firebaseConfig = {
  apiKey: searchParams.get('apiKey') || undefined,
  authDomain: searchParams.get('authDomain') || 'jinkzo.firebaseapp.com',
  projectId: searchParams.get('projectId') || 'jinkzo',
  storageBucket: searchParams.get('storageBucket') || 'jinkzo.firebasestorage.app',
  messagingSenderId: searchParams.get('messagingSenderId') || '71878062534',
  appId: searchParams.get('appId') || undefined
};

// Initialize Firebase in service worker context
let messaging = null;
try {
  if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
  }
} catch (err) {
  console.warn('[firebase-messaging-sw] Firebase SW initialization notice:', err);
}

// ── Background Message Handler (when website is closed or backgrounded) ─────────
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const notifTitle = payload.notification?.title || payload.data?.title || 'Jinkzo Notification';
    const notifOptions = {
      body: payload.notification?.body || payload.data?.body || 'You have a new update from Jinkzo.',
      icon: payload.notification?.icon || '/jinkzo-pwa-192.png',
      badge: '/jinkzo-favicon-32.png',
      vibrate: [200, 100, 200],
      data: payload.data || {},
      tag: payload.data?.notificationType || 'jinkzo-update',
      renotify: true
    };

    return self.registration.showNotification(notifTitle, notifOptions);
  });
}

// ── Fallback Push Event Handler for standard WebPush payloads ─────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const rawData = event.data.json();
    if (rawData && (rawData.notification || rawData.data)) {
      const title = rawData.notification?.title || rawData.data?.title || 'Jinkzo Notification';
      const body = rawData.notification?.body || rawData.data?.body || 'New notification received.';
      const options = {
        body,
        icon: rawData.notification?.icon || '/jinkzo-pwa-192.png',
        badge: '/jinkzo-favicon-32.png',
        vibrate: [200, 100, 200],
        data: rawData.data || {},
        tag: rawData.data?.notificationType || 'jinkzo-update',
        renotify: true
      };

      event.waitUntil(self.registration.showNotification(title, options));
    }
  } catch {
    // Non-JSON push payload, ignore
  }
});

// ── Notification Click & Navigation Handler ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  // Resolve target route based on payload data
  let targetRoute = '/';
  if (data.link) {
    targetRoute = data.link;
  } else if (data.orderId) {
    targetRoute = `/order/${data.orderId}`;
  } else if (data.recipientRole === 'restaurant' || data.screen === 'restaurant-orders' || data.notificationType === 'NEW_ORDER_RESTAURANT') {
    targetRoute = '/restaurant-dashboard';
  } else if (data.recipientRole === 'delivery' || data.screen === 'rider-orders' || data.notificationType === 'DELIVERY_ASSIGNED_RIDER') {
    targetRoute = '/delivery-dashboard';
  } else if (data.restaurantId) {
    targetRoute = `/restaurant/${data.restaurantId}`;
  }

  // Construct absolute target URL
  const targetUrl = new URL(targetRoute, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if an app window is already open
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no open tab/window, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
