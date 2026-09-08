/* eslint-disable no-undef */
// ══════════════════════════════════════════════════════════════════════════════
// Jinkzo — Firebase Cloud Messaging Service Worker for Web Background Push
// ══════════════════════════════════════════════════════════════════════════════

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Parse query params passed during service worker registration if available
const swUrl = new URL(location);
const searchParams = swUrl.searchParams;

// Public Firebase Web SDK configuration with safe production fallbacks
const firebaseConfig = {
  apiKey: searchParams.get('apiKey') || 'AIzaSyBdq09nGPtTxlM1DqptiJdyrTiOqaR3Yis',
  authDomain: searchParams.get('authDomain') || 'jinkzo.firebaseapp.com',
  projectId: searchParams.get('projectId') || 'jinkzo',
  storageBucket: searchParams.get('storageBucket') || 'jinkzo.firebasestorage.app',
  messagingSenderId: searchParams.get('messagingSenderId') || '71878062534',
  appId: searchParams.get('appId') || '1:71878062534:web:061a88bdc17ea3d174c2c7'
};

// Initialize Firebase in service worker context
let messaging = null;
try {
  if (firebaseConfig.apiKey) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    messaging = firebase.messaging();
  }
} catch (err) {
  console.warn('[firebase-messaging-sw] Firebase SW initialization notice:', err);
}

// ── Background Message Handler (when website is closed or backgrounded) ─────────
// Note: Handled cleanly via Firebase Messaging compat SDK.
// Redundant manual self.addEventListener('push') is intentionally NOT used
// to prevent duplicate notifications and "This site has been updated in the background" banners.
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const notifTitle = payload.notification?.title || payload.data?.title || 'Jinkzo Notification';
    const notifData = payload.data || {};
    const notifTag = notifData.orderId
      ? `jinkzo-order-${notifData.orderId}`
      : (notifData.rideId ? `jinkzo-ride-${notifData.rideId}` : (notifData.notificationType || 'jinkzo-update'));

    const notifOptions = {
      body: payload.notification?.body || notifData.body || 'You have a new update from Jinkzo.',
      icon: payload.notification?.icon || '/jinkzo-pwa-192.png',
      badge: '/jinkzo-favicon-32.png',
      vibrate: [200, 100, 200],
      data: notifData,
      tag: notifTag,
      renotify: true
    };

    return self.registration.showNotification(notifTitle, notifOptions);
  });
}

// ── Notification Click & Navigation Handler ──────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = (data.action || '').toUpperCase();

  // Resolve target route: Priority is deepLink -> link -> action route -> role fallback
  let targetRoute = null;

  if (data.deepLink && typeof data.deepLink === 'string' && data.deepLink !== 'NONE') {
    targetRoute = data.deepLink;
  } else if (data.link && typeof data.link === 'string' && data.link !== 'NONE') {
    targetRoute = data.link;
  }

  // If not resolved from links, resolve from action
  if (!targetRoute) {
    if (action === 'OPEN_ORDER') {
      const id = data.entityId || data.orderId;
      if (id) targetRoute = `/order-tracking/${id}`;
    } else if (action === 'OPEN_RIDE') {
      const id = data.entityId || data.rideId;
      if (id) targetRoute = `/order-tracking/${id}`;
    } else if (action === 'OPEN_RESTAURANT') {
      const id = data.entityId || data.restaurantId;
      if (id) targetRoute = `/restaurant/${id}`;
    } else if (action === 'OPEN_PRODUCT') {
      if (data.restaurantId) targetRoute = `/restaurant/${data.restaurantId}`;
      else if (data.entityId) targetRoute = `/restaurants?search=${encodeURIComponent(data.entityId)}`;
    } else if (action === 'OPEN_CATEGORY') {
      if (data.entityId) targetRoute = `/restaurants?category=${encodeURIComponent(data.entityId)}`;
    } else if (action === 'OPEN_RESTAURANT_ORDER') {
      const id = data.entityId || data.orderId;
      targetRoute = id ? `/restaurant-dashboard?tab=orders&order=${id}` : '/restaurant-dashboard';
    } else if (action === 'OPEN_RIDER_ORDER') {
      const id = data.entityId || data.orderId;
      targetRoute = id ? `/delivery-dashboard?tab=orders&order=${id}` : '/delivery-dashboard';
    } else if (action === 'OPEN_RIDER_RIDE') {
      const id = data.entityId || data.rideId;
      targetRoute = id ? `/delivery-dashboard?tab=orders&ride=${id}` : '/delivery-dashboard';
    } else if (action === 'OPEN_ADMIN_ORDER') {
      const id = data.entityId || data.orderId;
      targetRoute = id ? `/admin-dashboard?tab=orders&order=${id}` : '/admin-dashboard?tab=orders';
    } else if (action === 'OPEN_ADMIN_RESTAURANT') {
      const id = data.entityId || data.restaurantId;
      targetRoute = id ? `/admin-dashboard?tab=suppliers_items&restaurant=${id}` : '/admin-dashboard?tab=suppliers_items';
    }
  }

  // Canonicalize legacy /order/:id path to /order-tracking/:id
  if (targetRoute && targetRoute.startsWith('/order/')) {
    targetRoute = `/order-tracking/${data.orderId || data.rideId || targetRoute.replace('/order/', '')}`;
  }

  // Safe fallback for role-based notifications
  if (!targetRoute) {
    const role = (data.recipientRole || '').toLowerCase();
    if (data.orderId || data.rideId) {
      const id = data.orderId || data.rideId;
      if (role === 'restaurant') {
        targetRoute = `/restaurant-dashboard?tab=orders&order=${id}`;
      } else if (role === 'delivery') {
        targetRoute = `/delivery-dashboard?tab=orders&${data.rideId ? 'ride' : 'order'}=${id}`;
      } else if (role === 'admin') {
        targetRoute = `/admin-dashboard?tab=orders&order=${id}`;
      } else {
        targetRoute = `/order-tracking/${id}`;
      }
    } else if (role === 'restaurant' || data.screen === 'restaurant-orders' || data.notificationType === 'NEW_ORDER_RESTAURANT') {
      targetRoute = '/restaurant-dashboard';
    } else if (role === 'delivery' || data.screen === 'rider-orders' || data.notificationType === 'DELIVERY_ASSIGNED_RIDER') {
      targetRoute = '/delivery-dashboard';
    } else if (role === 'admin' || data.screen === 'admin-orders') {
      targetRoute = '/admin-dashboard';
    }
  }

  // If purely an informational notification with no relevant navigation, close without jumping
  if (!targetRoute) {
    return;
  }

  // Construct safe, same-origin target URL
  let targetUrl;
  try {
    targetUrl = new URL(targetRoute, self.location.origin).href;
    if (!targetUrl.startsWith(self.location.origin)) {
      targetUrl = self.location.origin;
    }
  } catch {
    targetUrl = self.location.origin;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If an existing tab or PWA window is open, focus and navigate it
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
