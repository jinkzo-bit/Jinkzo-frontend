/**
 * unifiedOrder.js
 * 
 * Presentation-layer aggregation utility for Jinkzo:
 * ONE Cart -> ONE Order -> ONE Tracking -> ONE Rider Delivery Job
 * 
 * Aggregates split order documents (restaurants + store) sharing parentOrderId
 * into a single unified presentation model without altering backend database schemas.
 */

export const STORE_SERVICE_TYPES = ['GROCERY', 'BAKERY', 'VEG_FRUITS', 'MEAT', 'STORE'];

export const getCategoryLabel = (serviceType) => {
  const s = String(serviceType || '').trim().toUpperCase();
  if (['GROCERY', 'GROCERIES'].includes(s)) return 'Grocery';
  if (['BAKERY', 'BAKERY & BEVERAGES', 'BEVERAGES', 'COOL_HOT', 'HOT_COOL', 'COOL & HOT', 'HOT & COOL'].includes(s)) return 'Bakery';
  if (['VEG_FRUITS', 'FRUITS-VEGETABLES', 'FRUITS_VEGETABLES', 'VEGETABLES', 'FRUITS & VEGETABLES', 'VEG & FRUITS', 'FRUITS', 'VEG'].includes(s)) return 'Veg & Fruits';
  if (['MEAT', 'NON-VEG', 'MEAT & SEAFOOD', 'CHICKEN', 'MUTTON', 'FISH', 'SEAFOOD'].includes(s)) return 'Meat';
  if (s === 'FOOD') return 'Food';
  if (s === 'RIDE') return 'Ride';
  return s || 'Store';
};

export const isStoreCategory = (serviceType) => {
  const s = String(serviceType || '').trim().toUpperCase();
  return STORE_SERVICE_TYPES.includes(s);
};

export const isStoreOrderSegment = (segment) => {
  if (!segment) return false;
  if (segment.orderType === 'store') return true;
  if (segment.restaurantId === 'store_jinkzo') return true;
  if (isStoreCategory(segment.serviceType)) return true;
  if (Array.isArray(segment.items) && segment.items.some(i => isStoreCategory(i.serviceType) || String(i.restaurantId).startsWith('store_'))) {
    return true;
  }
  return false;
};

/**
 * Normalizes a single order document into a source representation
 */
export const normalizeOrderSource = (segment) => {
  const isStore = isStoreOrderSegment(segment);
  const items = Array.isArray(segment.items) ? segment.items : [];
  const subtotal = segment.subtotal || items.reduce((sum, it) => sum + (parseFloat(it.price || 0) * (it.quantity || 1)), 0);

  let name = 'Restaurant';
  let icon = '🍽️';
  let type = 'restaurant';

  if (segment.orderType === 'ride') {
    name = 'Bike Ride';
    icon = '🏍️';
    type = 'ride';
  } else if (isStore) {
    name = 'Jinkzo Store';
    icon = '🛒';
    type = 'store';
  } else if (segment.restaurant && segment.restaurant.name) {
    name = segment.restaurant.name;
    icon = '🍗';
    type = 'restaurant';
  } else if (segment.restaurantName) {
    name = segment.restaurantName;
    icon = '🍗';
    type = 'restaurant';
  }

  // Determine readiness for rider pickup
  // Food orders require restaurant to mark 'Ready_for_Pickup'
  // Store orders are ready immediately
  let isReadyForPickup = false;
  let isPickedUp = false;
  let statusText = 'Preparing';

  if (type === 'store') {
    isReadyForPickup = segment.status !== 'Cancelled';
    isPickedUp = ['Picked_Up', 'Out_for_Delivery', 'Out for Delivery', 'Rider_At_Customer', 'Delivered', 'Completed'].includes(segment.status);
    statusText = isPickedUp ? 'STORE PICKED UP' : 'STORE READY';
  } else if (type === 'restaurant') {
    // CRITICAL: Rider assignment/acceptance does NOT make restaurant food ready.
    // Food is only ready when restaurant owner marks Ready_for_Pickup or subsequent genuine pickup/delivery states.
    isReadyForPickup = ['Ready_for_Pickup', 'Picked_Up', 'Out_for_Delivery', 'Out for Delivery', 'Rider_At_Customer', 'Delivered', 'Completed'].includes(segment.status);
    isPickedUp = ['Picked_Up', 'Out_for_Delivery', 'Out for Delivery', 'Rider_At_Customer', 'Delivered', 'Completed'].includes(segment.status);
    statusText = isPickedUp ? 'FOOD PICKED UP' : (isReadyForPickup ? 'FOOD READY' : 'FOOD PREPARING');
  } else if (type === 'ride') {
    isReadyForPickup = true;
    isPickedUp = ['Picked_Up', 'Out_for_Delivery', 'Out for Delivery', 'Delivered', 'Completed'].includes(segment.status);
    statusText = segment.status;
  }

  return {
    segmentId: segment._id,
    orderId: segment._id,
    displayId: segment.displayId || `#${String(segment._id).slice(-6).toUpperCase()}`,
    type,
    name,
    icon,
    items,
    itemCount: items.reduce((sum, it) => sum + (it.quantity || 1), 0),
    subtotal,
    deliveryFee: segment.deliveryFee || 0,
    platformFee: segment.platformFee || 0,
    total: segment.total || subtotal,
    status: segment.status || 'Placed',
    riderStatus: segment.riderStatus || 'Pending',
    isReadyForPickup,
    isPickedUp,
    statusText,
    restaurantLocation: segment.restaurantLocation || null,
    pickupLocation: segment.pickupLocation || null,
    address: segment.address || null,
    rawSegment: segment
  };
};

/**
 * Computes the unified overall status from a set of segment statuses
 */
export const computeUnifiedStatus = (segments) => {
  if (!segments || segments.length === 0) return 'Placed';

  const statuses = segments.map(s => s.status || 'Placed');

  // If all are Delivered or Completed
  if (statuses.every(st => ['Delivered', 'Completed'].includes(st))) {
    return 'Delivered';
  }

  // If all are Cancelled or Rejected
  if (statuses.every(st => ['Cancelled', 'Rejected', 'Rider_Rejected'].includes(st))) {
    return 'Cancelled';
  }

  // If any segment is Out for Delivery or all are Picked Up
  if (statuses.some(st => ['Out_for_Delivery', 'Out for Delivery'].includes(st)) ||
      statuses.every(st => ['Picked_Up', 'Out_for_Delivery', 'Out for Delivery', 'Delivered', 'Completed'].includes(st))) {
    return 'Out_for_Delivery';
  }

  // If any segment is Picked Up or Ready for Pickup
  if (statuses.some(st => ['Picked_Up', 'Ready_for_Pickup', 'Rider_At_Restaurant', 'Rider_At_Pickup'].includes(st))) {
    return 'Preparing';
  }

  // If any segment is Preparing or Packing or Accepted
  if (statuses.some(st => ['Preparing', 'Packing', 'Accepted', 'Rider_Assigned', 'Rider_Accepted'].includes(st))) {
    return 'Preparing';
  }

  // If any segment is Confirmed
  if (statuses.some(st => st === 'Confirmed')) {
    return 'Confirmed';
  }

  return 'Placed';
};

/**
 * Groups an array of raw order documents for Customer Order History
 * Merges sibling order segments sharing parentOrderId into ONE unified order card.
 */
export const groupCustomerOrders = (orders = []) => {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const groups = new Map();

  orders.forEach(order => {
    // Determine canonical parent ID
    const parentId = order.parentOrderId && order.parentOrderId.trim() !== '' 
      ? String(order.parentOrderId) 
      : String(order._id);

    if (!groups.has(parentId)) {
      groups.set(parentId, []);
    }
    groups.get(parentId).push(order);
  });

  const unifiedOrders = [];

  groups.forEach((segments, parentId) => {
    // Sort so primary/parent order is first if present
    segments.sort((a, b) => {
      if (String(a._id) === parentId) return -1;
      if (String(b._id) === parentId) return 1;
      return 0;
    });

    const primaryOrder = segments[0];
    const isRide = primaryOrder.orderType === 'ride';
    const normalizedSources = segments.map(normalizeOrderSource);

    // Combine all items across all sources
    const allItems = [];
    normalizedSources.forEach(src => {
      allItems.push(...src.items);
    });

    const totalItemCount = allItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const combinedSubtotal = segments.reduce((sum, s) => sum + (s.subtotal || 0), 0);
    const combinedDeliveryFee = segments.reduce((sum, s) => sum + (s.deliveryFee || 0), 0);
    const combinedPlatformFee = segments.reduce((sum, s) => sum + (s.platformFee || 0), 0);
    const combinedPromoDiscount = segments.reduce((sum, s) => sum + (s.promoDiscount || 0), 0);
    const combinedTotal = segments.reduce((sum, s) => sum + (s.total || 0), 0);

    const unifiedStatus = isRide ? primaryOrder.status : computeUnifiedStatus(segments);

    // Extract active delivery agent if any segment has one
    const activeAgent = segments.find(s => s.deliveryAgent && s.deliveryAgent.name)?.deliveryAgent || primaryOrder.deliveryAgent || null;

    // Build unified display ID (prefer JZ- or JNK- from parent/primary, fallback to parentId)
    const primaryDisplayId = primaryOrder.displayId || `#ORD${String(primaryOrder._id).slice(-6).toUpperCase()}`;

    // Collect all distinct categories present in this unified order for filtering
    const categoriesSet = new Set();
    if (isRide) {
      categoriesSet.add('ride');
    } else {
      normalizedSources.forEach(src => {
        if (src.type === 'restaurant') categoriesSet.add('food');
        if (src.type === 'store') {
          src.items.forEach(it => {
            const cat = getCategoryLabel(it.serviceType).toLowerCase();
            categoriesSet.add(cat.replace(/\s+/g, '_').replace('&', 'and'));
            categoriesSet.add('store');
          });
        }
      });
    }

    unifiedOrders.push({
      _id: primaryOrder._id,
      parentOrderId: parentId,
      displayId: primaryDisplayId,
      orderType: isRide ? 'ride' : (normalizedSources.length > 1 || normalizedSources.some(s => s.type === 'store') ? 'unified' : primaryOrder.orderType),
      isRide,
      isUnified: segments.length > 1,
      sources: normalizedSources,
      sourceCount: normalizedSources.length,
      items: allItems,
      totalItemCount,
      subtotal: combinedSubtotal,
      deliveryFee: combinedDeliveryFee,
      platformFee: combinedPlatformFee,
      promoDiscount: combinedPromoDiscount,
      total: combinedTotal,
      status: unifiedStatus,
      deliveryAgent: activeAgent,
      customerLocation: primaryOrder.customerLocation || null,
      address: primaryOrder.address || null,
      pickupAddress: primaryOrder.pickupAddress || null,
      createdAt: primaryOrder.createdAt,
      review: primaryOrder.review || null,
      riderReview: primaryOrder.riderReview || null,
      instruction: primaryOrder.instruction || '',
      categories: Array.from(categoriesSet),
      rawSegments: segments
    });
  });

  // Sort by newest first
  unifiedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return unifiedOrders;
};

/**
 * Aggregates a single order with its fetched sibling orders for Customer Order Tracking
 */
export const getUnifiedTrackingOrder = (primaryOrder, siblingOrders = []) => {
  if (!primaryOrder) return null;

  const allSegments = [primaryOrder, ...siblingOrders.filter(Boolean)];
  const isRide = primaryOrder.orderType === 'ride';
  const sources = allSegments.map(normalizeOrderSource);

  const allItems = [];
  sources.forEach(src => {
    allItems.push(...src.items);
  });

  const combinedSubtotal = allSegments.reduce((sum, s) => sum + (parseFloat(s.subtotal) || 0), 0);
  const combinedDeliveryFee = allSegments.reduce((sum, s) => sum + (parseFloat(s.deliveryFee) || 0), 0);
  const combinedPlatformFee = allSegments.reduce((sum, s) => sum + (parseFloat(s.platformFee) || 0), 0);
  const combinedPromoDiscount = allSegments.reduce((sum, s) => sum + (parseFloat(s.promoDiscount) || 0), 0);
  const combinedTotal = allSegments.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);

  const unifiedStatus = isRide ? primaryOrder.status : computeUnifiedStatus(allSegments);
  const activeAgent = allSegments.find(s => s.deliveryAgent && s.deliveryAgent.name)?.deliveryAgent || primaryOrder.deliveryAgent || null;

  const displayId = primaryOrder.displayId || `#JZ-${String(primaryOrder._id).slice(-5).toUpperCase()}`;

  return {
    _id: primaryOrder._id,
    parentOrderId: primaryOrder.parentOrderId || primaryOrder._id,
    displayId,
    orderType: primaryOrder.orderType,
    isRide,
    isUnified: allSegments.length > 1,
    status: unifiedStatus,
    sources,
    items: allItems,
    totalItemCount: allItems.reduce((sum, it) => sum + (it.quantity || 1), 0),
    subtotal: combinedSubtotal,
    deliveryFee: combinedDeliveryFee,
    platformFee: combinedPlatformFee,
    promoDiscount: combinedPromoDiscount,
    total: combinedTotal,
    deliveryAgent: activeAgent,
    customerLocation: primaryOrder.customerLocation,
    restaurantLocation: primaryOrder.restaurantLocation,
    pickupLocation: primaryOrder.pickupLocation,
    dropLocation: primaryOrder.dropLocation,
    address: primaryOrder.address,
    pickupAddress: primaryOrder.pickupAddress,
    createdAt: primaryOrder.createdAt,
    instruction: primaryOrder.instruction,
    review: primaryOrder.review,
    riderReview: primaryOrder.riderReview,
    messages: primaryOrder.messages || [],
    rawSegments: allSegments
  };
};

/**
 * Groups orders for Rider Delivery Dashboard
 * Merges split orders into ONE single delivery job.
 */
export const groupRiderOrders = (orders = []) => {
  if (!Array.isArray(orders) || orders.length === 0) return [];

  const groups = new Map();

  orders.forEach(order => {
    const parentId = order.parentOrderId && order.parentOrderId.trim() !== ''
      ? String(order.parentOrderId)
      : String(order._id);

    if (!groups.has(parentId)) {
      groups.set(parentId, []);
    }
    groups.get(parentId).push(order);
  });

  const riderJobs = [];

  groups.forEach((segments, parentId) => {
    const primaryOrder = segments[0];
    const isRide = primaryOrder.orderType === 'ride';
    const sources = segments.map(normalizeOrderSource);

    const allItems = [];
    sources.forEach(src => {
      allItems.push(...src.items);
    });

    const totalItemCount = allItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const combinedDeliveryFee = segments.reduce((sum, s) => sum + (s.deliveryFee || 0), 0);
    const combinedTotal = segments.reduce((sum, s) => sum + (s.total || 0), 0);
    const unifiedStatus = isRide ? primaryOrder.status : computeUnifiedStatus(segments);

    // Calculate rider earning: base delivery fee + distance bonus
    const riderEarning = isRide ? (primaryOrder.total || 0) : (combinedDeliveryFee + 20);

    const displayId = primaryOrder.displayId || `#JZ-${String(primaryOrder._id).slice(-5).toUpperCase()}`;

    // Check pickup completeness
    const allPickedUp = sources.every(src => src.isPickedUp);
    const anyReadyForPickup = sources.some(src => src.isReadyForPickup && !src.isPickedUp);

    riderJobs.push({
      _id: primaryOrder._id,
      parentOrderId: parentId,
      displayId,
      orderType: primaryOrder.orderType,
      isRide,
      isUnified: segments.length > 1,
      status: unifiedStatus,
      sources,
      items: allItems,
      totalItemCount,
      total: combinedTotal,
      deliveryFee: combinedDeliveryFee,
      riderEarning,
      customerName: primaryOrder.customerName || primaryOrder.user?.name || primaryOrder.userId?.name || 'Customer',
      customerPhone: primaryOrder.customerPhone || primaryOrder.user?.phone || primaryOrder.userId?.phone || '',
      customerLocation: primaryOrder.customerLocation || null,
      address: primaryOrder.address || null,
      pickupLocation: primaryOrder.pickupLocation || null,
      dropLocation: primaryOrder.dropLocation || null,
      pickupAddress: primaryOrder.pickupAddress || null,
      distance: primaryOrder.distance || 2.5,
      deliveryAgent: primaryOrder.deliveryAgent || null,
      instruction: primaryOrder.instruction || '',
      allPickedUp,
      anyReadyForPickup,
      createdAt: primaryOrder.createdAt,
      review: primaryOrder.review,
      riderReview: primaryOrder.riderReview,
      messages: primaryOrder.messages || [],
      rawSegments: segments
    });
  });

  return riderJobs;
};
