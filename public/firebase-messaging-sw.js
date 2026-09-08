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

// ── Fallback Push Event Handler for standard WebPush payloads ─────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const rawData = event.data.json();
    if (rawData && (rawData.notification || rawData.data)) {
      const title = rawData.notification?.title || rawData.data?.title || 'Jinkzo Notification';
      const body = rawData.notification?.body || rawData.data?.body || 'New notification received.';
      const notifData = rawData.data || {};
      const notifTag = notifData.orderId
        ? `jinkzo-order-${notifData.orderId}`
        : (notifData.rideId ? `jinkzo-ride-${notifData.rideId}` : (notifData.notificationType || 'jinkzo-update'));
      const options = {
        body,
        icon: rawData.notification?.icon || '/jinkzo-pwa-192.png',
        badge: '/jinkzo-favicon-32.png',
        vibrate: [200, 100, 200],
        data: notifData,
        tag: notifTag,
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
  const action = (data.action || '').toUpperCase();

  // Strict requirement: Announcements, greetings, and NONE actions close notification without navigating
  if (action === 'NONE' || data.notificationType === 'ANNOUNCEMENT') {
    return;
  }

  // Resolve target route based on structured metadata
  let targetRoute = null;

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

  // Fallback to explicit deepLink / link
  if (!targetRoute && (data.deepLink || data.link)) {
    targetRoute = data.deepLink || data.link;
    if (targetRoute.startsWith('/order/')) {
      targetRoute = `/order-tracking/${data.orderId || data.rideId || targetRoute.replace('/order/', '')}`;
    }
  }

  // Fallback for legacy role-based notifications
  if (!targetRoute) {
    if (data.orderId || data.rideId) {
      if (data.recipientRole === 'restaurant') {
        targetRoute = `/restaurant-dashboard?tab=orders&order=${data.orderId}`;
      } else if (data.recipientRole === 'delivery') {
        targetRoute = `/delivery-dashboard?tab=orders&${data.rideId ? 'ride' : 'order'}=${data.rideId || data.orderId}`;
      } else {
        targetRoute = `/order-tracking/${data.orderId || data.rideId}`;
      }
    } else if (data.recipientRole === 'restaurant' || data.screen === 'restaurant-orders' || data.notificationType === 'NEW_ORDER_RESTAURANT') {
      targetRoute = '/restaurant-dashboard';
    } else if (data.recipientRole === 'delivery' || data.screen === 'rider-orders' || data.notificationType === 'DELIVERY_ASSIGNED_RIDER') {
      targetRoute = '/delivery-dashboard';
    } else if (data.recipientRole === 'admin' || data.screen === 'admin-orders') {
      targetRoute = '/admin-dashboard';
    }
  }

  // If still no valid target route, close and do not open generic page
  if (!targetRoute) {
    return;
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
