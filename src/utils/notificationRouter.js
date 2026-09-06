import { API_BASE } from '../config/api';

/**
 * Marks a notification as read on the backend.
 * Fails silently so it never interrupts the user's flow or navigation.
 */
export const markNotificationAsRead = async (notificationId, token) => {
  if (!notificationId) return;
  const activeToken = token || localStorage.getItem('qb-auth-token') || localStorage.getItem('token');
  if (!activeToken) return;

  try {
    await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${activeToken}`
      }
    });
  } catch (err) {
    console.warn('[notificationRouter] Error marking notification as read:', err);
  }
};

/**
 * Resolves the appropriate frontend URL for a notification payload.
 * Returns null if the action is NONE or if a required entity is missing.
 */
export const resolveNotificationRoute = (notification) => {
  if (!notification) return null;

  const action = (notification.action || '').toUpperCase();
  const entityId = notification.entityId || notification.orderId || notification.rideId || notification.metadata?.orderId || notification.metadata?.rideId || notification.metadata?.restaurantId || notification.metadata?.categoryId;
  const deepLink = notification.deepLink || notification.link;

  // 1. Explicitly NONE -> Strict: Never navigate
  if (action === 'NONE') {
    return null;
  }

  // 2. Actionable Deep Links
  switch (action) {
    case 'OPEN_ORDER':
      if (entityId) return `/order-tracking/${entityId}`;
      if (deepLink) return deepLink;
      return null;

    case 'OPEN_RIDE':
      if (entityId) return `/order-tracking/${entityId}`;
      if (deepLink) return deepLink;
      return null;

    case 'OPEN_RESTAURANT':
      if (entityId) return `/restaurant/${entityId}`;
      if (deepLink) return deepLink;
      return null;

    case 'OPEN_PRODUCT':
      // If direct restaurantId is available or product link exists
      if (notification.metadata?.restaurantId) {
        return `/restaurant/${notification.metadata.restaurantId}`;
      }
      if (entityId) {
        return `/restaurants?search=${encodeURIComponent(entityId)}`;
      }
      if (deepLink) return deepLink;
      return null;

    case 'OPEN_CATEGORY':
      if (entityId) return `/restaurants?category=${encodeURIComponent(entityId)}`;
      if (deepLink) return deepLink;
      return null;

    case 'OPEN_RESTAURANT_ORDER':
      if (entityId) return `/restaurant-dashboard?tab=orders&order=${entityId}`;
      return '/restaurant-dashboard';

    case 'OPEN_RIDER_ORDER':
      if (entityId) return `/delivery-dashboard?tab=orders&order=${entityId}`;
      return '/delivery-dashboard';

    case 'OPEN_RIDER_RIDE':
      if (entityId) return `/delivery-dashboard?tab=orders&ride=${entityId}`;
      return '/delivery-dashboard';

    case 'OPEN_ADMIN_ORDER':
      if (entityId) return `/admin-dashboard?tab=orders&order=${entityId}`;
      return '/admin-dashboard?tab=orders';

    case 'OPEN_ADMIN_RESTAURANT':
      if (entityId) return `/admin-dashboard?tab=suppliers_items&restaurant=${entityId}`;
      return '/admin-dashboard?tab=suppliers_items';

    default:
      break;
  }

  // 3. Fallback for legacy or untyped notifications
  if (deepLink) {
    // Only accept internal relative paths or paths starting with /
    if (deepLink.startsWith('/')) {
      return deepLink;
    }
  }

  const role = notification.recipientRole || notification.metadata?.recipientRole;
  if (entityId) {
    if (role === 'restaurant') return `/restaurant-dashboard?tab=orders&order=${entityId}`;
    if (role === 'delivery') return `/delivery-dashboard?tab=orders&order=${entityId}`;
    if (role === 'admin') return `/admin-dashboard?tab=orders&order=${entityId}`;
    return `/order-tracking/${entityId}`;
  }

  if (role === 'restaurant') return '/restaurant-dashboard';
  if (role === 'delivery') return '/delivery-dashboard';
  if (role === 'admin') return '/admin-dashboard';

  return null;
};

/**
 * Central web notification router.
 * 
 * 1. Marks notification as read
 * 2. Checks if action is NONE (stays on page, closes popover)
 * 3. Validates entity / target route
 * 4. Navigates safely without crash
 * 
 * @param {Object} notification - Notification item from backend or socket
 * @param {Function} navigate - React Router navigate function
 * @param {Object} options - Optional callbacks: { onMarkRead, onClose, token }
 */
let lastNavigatedNotificationId = null;
let lastNavigatedAt = 0;

export const handleNotificationNavigation = async (notification, navigate, options = {}) => {
  if (!notification) return;

  const notifId = notification._id || notification.id || notification.eventId;
  const now = Date.now();
  if (notifId && notifId === lastNavigatedNotificationId && now - lastNavigatedAt < 2000) {
    console.log('[notificationRouter] Ignoring duplicate rapid navigation for notifId:', notifId);
    return;
  }
  if (notifId) {
    lastNavigatedNotificationId = notifId;
    lastNavigatedAt = now;
  }

  const { onMarkRead, onClose, token } = options;

  // Always mark as read locally and remotely
  try {
    if (onMarkRead && typeof onMarkRead === 'function') {
      onMarkRead(notification._id || notification.id);
    }
    await markNotificationAsRead(notification._id || notification.id, token);
  } catch (err) {
    console.warn('[notificationRouter] Error updating read state:', err);
  }

  // Close dropdown / modal if callback provided
  if (onClose && typeof onClose === 'function') {
    onClose();
  }

  const action = (notification.action || '').toUpperCase();

  // Strict check: festival greetings and general announcements stay on current page
  if (action === 'NONE') {
    return;
  }

  const route = resolveNotificationRoute(notification);

  if (!route) {
    // No valid destination target: remain safely on the current page
    return;
  }

  try {
    if (navigate && typeof navigate === 'function') {
      navigate(route);
    } else {
      window.location.href = route;
    }
  } catch (navErr) {
    console.error('[notificationRouter] Navigation failed safely:', navErr);
  }
};
