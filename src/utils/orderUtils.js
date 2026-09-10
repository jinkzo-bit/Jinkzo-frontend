/**
 * Utility to extract actual food restaurants that contributed to an order.
 * Strictly excludes grocery/store suppliers and non-food services.
 */
export const getContributingFoodRestaurants = (order) => {
  if (!order || order.orderType === 'ride') return [];
  const map = new Map();

  // 1. Check food items in order
  if (Array.isArray(order.items)) {
    order.items.forEach(item => {
      const isCatalog = item.itemModel === 'CatalogItem' || Boolean(item.supplierId);
      const isFood = !isCatalog && (!item.service || item.service === 'food' || item.category === 'food' || item.itemModel === 'MenuItem');

      if (isFood && item.restaurantId) {
        const restId = String(item.restaurantId);
        if (!map.has(restId)) {
          map.set(restId, {
            id: restId,
            name: item.restaurantName || item.sourceName || order.restaurant?.name || 'Restaurant',
            image: item.image || order.restaurant?.image || ''
          });
        }
      }
    });
  }

  // 2. Check pickup stops with sourceType === 'restaurant'
  if (Array.isArray(order.pickupStops)) {
    order.pickupStops.forEach(stop => {
      if (stop.sourceType === 'restaurant' && stop.sourceId) {
        const restId = String(stop.sourceId);
        if (!map.has(restId)) {
          map.set(restId, {
            id: restId,
            name: stop.sourceName || order.restaurant?.name || 'Restaurant',
            image: order.restaurant?.image || ''
          });
        }
      }
    });
  }

  // 3. Fallback to order root restaurant if it's a food order and no item restaurantId was mapped
  if (map.size === 0 && order.restaurantId && order.orderType !== 'ride') {
    const isCatalogOrder = Array.isArray(order.items) && order.items.every(i => i.itemModel === 'CatalogItem' || Boolean(i.supplierId));
    if (!isCatalogOrder) {
      const restId = String(order.restaurantId);
      map.set(restId, {
        id: restId,
        name: order.restaurant?.name || 'Restaurant',
        image: order.restaurant?.image || ''
      });
    }
  }

  return Array.from(map.values());
};

const normalizeStoreService = (raw) => {
  if (!raw) return 'grocery';
  const clean = String(raw).trim().toLowerCase().replace(/[\s\-_&]+/g, '_');
  if (clean.includes('grocery')) return 'grocery';
  if (clean.includes('meat') || clean.includes('non_veg') || clean.includes('chicken') || clean.includes('mutton') || clean.includes('fish')) return 'meat';
  if (clean.includes('veg') || clean.includes('fruit')) return 'veg_fruits';
  if (clean.includes('bakery') || clean.includes('beverage') || clean.includes('cake') || clean.includes('sweet') || clean.includes('cool')) return 'bakery_beverages';
  return 'grocery';
};

const getStoreServiceLabel = (serviceType) => {
  switch (serviceType) {
    case 'grocery': return 'Grocery';
    case 'meat': return 'Meat';
    case 'veg_fruits': return 'Veg & Fruits';
    case 'bakery_beverages': return 'Bakery & Beverages';
    default: return 'Store';
  }
};

/**
 * Utility to extract actual store/supplier fulfillment sources that contributed to an order.
 * Groups by unique sourceId + serviceType.
 */
export const getContributingStoreSources = (order) => {
  if (!order || order.orderType === 'ride') return [];
  const map = new Map();

  // 1. Check catalog items in order
  if (Array.isArray(order.items)) {
    order.items.forEach(item => {
      const isCatalog = item.itemModel === 'CatalogItem' || Boolean(item.supplierId) || (item.service && item.service !== 'food');
      if (!isCatalog) return;

      const serviceType = normalizeStoreService(item.service || item.category);
      const serviceLabel = getStoreServiceLabel(serviceType);
      const isSupplier = Boolean(item.supplierId);
      const sourceId = isSupplier ? String(item.supplierId) : `jinkzo_${serviceType}`;
      const sourceType = isSupplier ? 'supplier' : 'jinkzo_store';
      const sourceName = item.supplierName || (isSupplier ? 'Partner Store' : `Jinkzo ${serviceLabel}`);

      const key = `${sourceId}_${serviceType}`;
      if (!map.has(key)) {
        map.set(key, {
          sourceId,
          sourceType,
          sourceName,
          serviceType,
          serviceLabel,
          items: [item]
        });
      } else {
        map.get(key).items.push(item);
      }
    });
  }

  // 2. Check supplier pickup stops
  if (Array.isArray(order.pickupStops)) {
    order.pickupStops.forEach(stop => {
      if (stop.sourceType === 'supplier' && stop.sourceId) {
        const serviceType = normalizeStoreService(stop.category);
        const serviceLabel = getStoreServiceLabel(serviceType);
        const sourceId = String(stop.sourceId);
        const key = `${sourceId}_${serviceType}`;
        if (!map.has(key)) {
          map.set(key, {
            sourceId,
            sourceType: 'supplier',
            sourceName: stop.sourceName || 'Partner Store',
            serviceType,
            serviceLabel,
            items: stop.items || []
          });
        }
      }
    });
  }

  // 3. Check supplier deliveries
  if (Array.isArray(order.supplierDeliveries)) {
    order.supplierDeliveries.forEach(sd => {
      if (sd.supplierId) {
        const serviceType = normalizeStoreService(sd.category);
        const serviceLabel = getStoreServiceLabel(serviceType);
        const sourceId = String(sd.supplierId);
        const key = `${sourceId}_${serviceType}`;
        if (!map.has(key)) {
          map.set(key, {
            sourceId,
            sourceType: 'supplier',
            sourceName: sd.supplierName || 'Partner Store',
            serviceType,
            serviceLabel,
            items: sd.items || []
          });
        }
      }
    });
  }

  return Array.from(map.values());
};

/**
 * Authoritative frontend Rider Claim check.
 * Strictly checks if an order has been claimed by a delivery rider or captain.
 */
export const isOrderRiderClaimed = (order) => {
  if (!order) return false;
  const hasAgent = Boolean(
    order.deliveryAgent &&
    (order.deliveryAgent.id || order.deliveryAgent._id || order.deliveryAgent.phone)
  );
  const hasClaimedRiderStatus = ['Accepted', 'Arrived_At_Restaurant', 'Picked_Up', 'Arrived_At_Customer', 'Delivered'].includes(order.riderStatus);
  const hasClaimedOrderStatus = ['Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant', 'Rider_At_Pickup', 'Picked_Up', 'Out_for_Delivery', 'Rider_At_Customer'].includes(order.status);

  return (hasAgent && hasClaimedRiderStatus) || hasClaimedOrderStatus;
};

/**
 * Authoritative frontend Customer Cancellation Eligibility Helper.
 * Evaluates whether any portion of an order is cancellable by the customer.
 * - Food: Cancellable until Restaurant accepts (pickupStop.status === 'Pending').
 * - Store Categories (Grocery, Bakery, Veg & Fruits, Meat): Cancellable until Rider claims delivery.
 *   (Store stops being 'Ready' immediately DOES NOT lock cancellation).
 * - Ride: Cancellable until Ride Captain accepts (order.status === 'Placed' & unclaimed).
 */
export const getCustomerCancellationEligibility = (order) => {
  if (!order) {
    return {
      canCancelAnything: false,
      isRide: false,
      isRiderClaimed: false,
      sources: []
    };
  }

  // Terminal states cannot be cancelled
  if (['Delivered', 'Completed', 'Cancelled', 'Rejected'].includes(order.status)) {
    return {
      canCancelAnything: false,
      isRide: order.orderType === 'ride',
      isRiderClaimed: false,
      sources: []
    };
  }

  const isRide = order.orderType === 'ride';
  const riderClaimed = isOrderRiderClaimed(order);

  // 1. RIDE SERVICE
  if (isRide) {
    const rideEligible = order.status === 'Placed' && !riderClaimed && !(order.deliveryAgent && (order.deliveryAgent.id || order.deliveryAgent.phone));
    return {
      canCancelAnything: rideEligible,
      isRide: true,
      isRiderClaimed: riderClaimed,
      sources: [{
        sourceId: 'ride',
        stopId: 'ride',
        sourceName: 'Bike Ride',
        serviceType: 'ride',
        status: order.status,
        eligible: rideEligible,
        reason: rideEligible ? '' : 'Captain has already accepted this ride.'
      }]
    };
  }

  // 2. FOOD & STORE CATEGORIES
  const sources = [];
  const stops = Array.isArray(order.pickupStops) ? order.pickupStops : [];

  if (stops.length > 0) {
    for (const stop of stops) {
      if (stop.status === 'Cancelled' || stop.status === 'Rejected') {
        continue;
      }
      const isRestaurant = stop.sourceType === 'restaurant';
      if (isRestaurant) {
        // Food: Cancellable while stop is Pending
        const isEligible = stop.status === 'Pending';
        sources.push({
          sourceId: String(stop.sourceId || stop._id),
          stopId: String(stop._id || stop.stopId || stop.sourceId),
          sourceName: stop.sourceName || 'Restaurant',
          serviceType: 'food',
          status: stop.status,
          eligible: isEligible,
          reason: isEligible ? '' : 'Restaurant has already accepted this food order.'
        });
      } else {
        // Store categories (grocery, bakery_beverages, veg_fruits, meat):
        // Cancellable until Rider claims delivery, REGARDLESS of stop.status === 'Ready'
        const isEligible = !riderClaimed;
        const normService = normalizeStoreService(stop.category);
        sources.push({
          sourceId: String(stop.sourceId || stop._id),
          stopId: String(stop._id || stop.stopId || stop.sourceId),
          sourceName: stop.sourceName || 'Partner Store',
          serviceType: normService,
          status: stop.status,
          eligible: isEligible,
          reason: isEligible ? '' : 'A delivery rider has already accepted this order.'
        });
      }
    }
  } else {
    // Fallback for orders without unified pickupStops
    const hasStoreItems = Array.isArray(order.items) && order.items.some(
      i => i.itemModel === 'CatalogItem' || Boolean(i.supplierId) || (i.service && i.service !== 'food')
    );
    const hasFoodItems = Array.isArray(order.items) && order.items.some(
      i => !i.supplierId && (i.service === 'food' || i.itemModel === 'MenuItem' || Boolean(i.restaurantId))
    );

    if (hasFoodItems || (!hasStoreItems && order.restaurantId)) {
      const isEligible = order.status === 'Placed';
      sources.push({
        sourceId: String(order.restaurantId || 'food'),
        stopId: String(order.restaurantId || 'food'),
        sourceName: order.restaurant?.name || 'Restaurant',
        serviceType: 'food',
        status: order.status,
        eligible: isEligible,
        reason: isEligible ? '' : 'Restaurant has already accepted this food order.'
      });
    }

    if (hasStoreItems) {
      const isEligible = !riderClaimed;
      sources.push({
        sourceId: 'store',
        stopId: 'store',
        sourceName: 'Partner Store',
        serviceType: 'grocery',
        status: order.status,
        eligible: isEligible,
        reason: isEligible ? '' : 'A delivery rider has already accepted this order.'
      });
    }
  }

  const canCancelAnything = sources.some(s => s.eligible);

  return {
    canCancelAnything,
    isRide: false,
    isRiderClaimed: riderClaimed,
    sources
  };
};

/**
export const getEffectiveRestaurantCommissionRate = (settings) => {
  if (!settings) return 15;
  const enabled = settings.restaurantCommissionEnabled !== undefined
    ? Boolean(settings.restaurantCommissionEnabled)
    : true;

  if (!enabled) return 0;

  const pct = settings.restaurantCommissionPercentage !== undefined
    ? Number(settings.restaurantCommissionPercentage)
    : (settings.commissionPercent !== undefined ? Number(settings.commissionPercent) : 15);

  if (!Number.isFinite(pct) || pct < 0) return 0;
  return Math.min(100, Math.max(0, pct));
};

/**
 * Single Financial Reconciliation Helper for Customer, Rider, Restaurant, and Admin views.
 * Ensures consistent delivery fee components, rider payout components, platform margin/subsidy, and restaurant financials.
 */
export const getOrderFinancialBreakdown = (order) => {
  if (!order || typeof order !== 'object') {
    return {
      customer: {
        itemsSubtotal: 0,
        baseDeliveryFee: 0,
        additionalStopFee: 0,
        extraItemFee: 0,
        distanceFee: 0,
        surgeFee: 0,
        rainFee: 0,
        totalCustomerDeliveryFee: 0,
        deliveryFee: 0,
        platformFee: 0,
        discount: 0,
        totalPayable: 0
      },
      rider: {
        basePayout: 0,
        additionalStopPayout: 0,
        incentive: 0,
        platformSubsidy: 0,
        deductions: 0,
        totalRiderPayout: 0
      },
      platform: {
        customerDeliveryFee: 0,
        riderPayout: 0,
        platformMargin: 0
      },
      restaurant: {
        foodSubtotal: 0,
        commissionPercentage: 0,
        commissionAmount: 0,
        restaurantPayable: 0,
        byRestaurant: []
      }
    };
  }

  // Extract restaurant financials from snapshot or compute fallback
  const ps = order.pricingSnapshot;
  let restFin = ps?.restaurantFinancials || order.restaurantFinancials;

  if (!restFin) {
    const foodSubtotal = Number(order.subtotal ?? 0);
    const legacyRate = 0;
    const commAmt = Math.round(((foodSubtotal * legacyRate) / 100) * 100) / 100;
    restFin = {
      foodSubtotal,
      commissionPercentage: legacyRate,
      commissionAmount: commAmt,
      restaurantPayable: Math.max(0, foodSubtotal - commAmt),
      byRestaurant: []
    };
  }

  const restaurantObj = {
    foodSubtotal: Number(restFin.foodSubtotal ?? 0),
    commissionPercentage: Number(restFin.commissionPercentage ?? 0),
    commissionAmount: Number(restFin.commissionAmount ?? 0),
    restaurantPayable: Number(restFin.restaurantPayable ?? 0),
    byRestaurant: Array.isArray(restFin.byRestaurant) ? restFin.byRestaurant : []
  };

  // 1. Authoritative Stored Pricing Snapshot (for new & updated orders)
  if (order.pricingSnapshot && order.pricingSnapshot.delivery && order.pricingSnapshot.rider) {
    const custDeliveryFee = Number(ps.delivery?.totalCustomerDeliveryFee ?? order.deliveryFee ?? 0);
    const riderTotalPayout = Number(ps.rider?.totalRiderPayout ?? 0);
    return {
      customer: {
        itemsSubtotal: Number(ps.itemsSubtotal ?? order.subtotal ?? 0),
        baseDeliveryFee: Number(ps.delivery?.baseFee ?? 0),
        additionalStopFee: Number(ps.delivery?.additionalStopFee ?? 0),
        extraItemFee: Number(ps.delivery?.extraItemFee ?? 0),
        distanceFee: Number(ps.delivery?.distanceFee ?? 0),
        surgeFee: Number(ps.delivery?.surgeFee ?? 0),
        rainFee: Number(ps.delivery?.rainFee ?? 0),
        totalCustomerDeliveryFee: custDeliveryFee,
        deliveryFee: custDeliveryFee,
        platformFee: Number(ps.platformFee ?? order.platformFee ?? 0),
        discount: Number(ps.discount ?? order.promoDiscount ?? 0),
        totalPayable: Number(ps.totalCustomerPayable ?? order.total ?? 0)
      },
      rider: {
        basePayout: Number(ps.rider?.basePayout ?? 0),
        additionalStopPayout: Number(ps.rider?.additionalStopPayout ?? 0),
        incentive: Number(ps.rider?.incentive ?? 0),
        platformSubsidy: Number(ps.rider?.platformSubsidy ?? 0),
        deductions: Number(ps.rider?.deductions ?? 0),
        totalRiderPayout: riderTotalPayout
      },
      platform: {
        customerDeliveryFee: custDeliveryFee,
        riderPayout: riderTotalPayout,
        platformMargin: custDeliveryFee - riderTotalPayout
      },
      restaurant: restaurantObj
    };
  }

  // 2. Historical Snapshot Fallback (reconstructing exact stored components for historical orders)
  const isRide = order.orderType === 'ride';
  const totalCustomerDeliveryFee = Number(order.deliveryFee ?? 0);
  const itemsSubtotal = Number(order.subtotal ?? 0);
  const platformFee = Number(order.platformFee ?? 0);
  const discount = Number(order.promoDiscount ?? 0);
  const totalPayable = Number(order.total ?? (itemsSubtotal + totalCustomerDeliveryFee + platformFee - discount));

  if (isRide) {
    return {
      customer: {
        itemsSubtotal: 0,
        baseDeliveryFee: totalPayable,
        additionalStopFee: 0,
        extraItemFee: 0,
        distanceFee: Number(order.distance ?? 0),
        surgeFee: Number(order.pricing?.otherSurcharges ?? 0),
        rainFee: Number(order.pricing?.rainSurcharge ?? 0),
        totalCustomerDeliveryFee: totalPayable,
        deliveryFee: totalPayable,
        platformFee,
        discount,
        totalPayable
      },
      rider: {
        basePayout: totalPayable,
        additionalStopPayout: 0,
        incentive: 0,
        platformSubsidy: 0,
        deductions: 0,
        totalRiderPayout: totalPayable
      },
      platform: {
        customerDeliveryFee: totalPayable,
        riderPayout: totalPayable,
        platformMargin: 0
      },
      restaurant: restaurantObj
    };
  }

  // Extract base delivery fee and extra stop fee from stored pricing fields
  let baseDeliveryFee = order.pricing?.baseFoodDeliveryFeeApplied ?? order.baseFoodDeliveryFeeApplied;
  let additionalStopFee = order.pricing?.foodHotelChangeFeeApplied ?? order.foodHotelChangeFeeApplied;
  let extraItemFee = order.pricing?.foodExtraItemChargeApplied ?? order.foodExtraItemChargeApplied ?? 0;

  if (baseDeliveryFee == null) {
    const activeStops = Array.isArray(order.pickupStops) ? order.pickupStops.filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled') : [];
    const extraStopsCount = Math.max(0, activeStops.length - 1);
    if (extraStopsCount > 0 && totalCustomerDeliveryFee > 20) {
      additionalStopFee = extraStopsCount * 10;
      baseDeliveryFee = Math.max(0, totalCustomerDeliveryFee - additionalStopFee);
    } else {
      baseDeliveryFee = totalCustomerDeliveryFee;
      additionalStopFee = 0;
    }
  } else {
    baseDeliveryFee = Number(baseDeliveryFee);
    additionalStopFee = Number(additionalStopFee);
  }

  const rainFee = Number(order.pricing?.rainSurcharge ?? (Array.isArray(order.surcharges) ? (order.surcharges.find(s => s.name === 'Rain')?.fee || 0) : 0));
  const surgeFee = Number(order.pricing?.otherSurcharges ?? (Array.isArray(order.surcharges) ? order.surcharges.filter(s => s.name !== 'Rain').reduce((sum, s) => sum + (s.fee || 0), 0) : 0));

  // Determine Rider Payout
  let totalRiderPayout = 0;
  let platformSubsidy = 0;

  if (order.riderPayout != null) {
    totalRiderPayout = Number(order.riderPayout);
    platformSubsidy = Math.max(0, totalRiderPayout - (baseDeliveryFee + additionalStopFee + extraItemFee));
  } else {
    platformSubsidy = 0;
    totalRiderPayout = baseDeliveryFee + additionalStopFee + extraItemFee;
  }

  return {
    customer: {
      itemsSubtotal,
      baseDeliveryFee,
      additionalStopFee,
      extraItemFee,
      distanceFee: 0,
      surgeFee,
      rainFee,
      totalCustomerDeliveryFee,
      deliveryFee: totalCustomerDeliveryFee,
      platformFee,
      discount,
      totalPayable
    },
    rider: {
      basePayout: baseDeliveryFee,
      additionalStopPayout: additionalStopFee,
      incentive: 0,
      platformSubsidy,
      deductions: 0,
      totalRiderPayout
    },
    platform: {
      customerDeliveryFee: totalCustomerDeliveryFee,
      riderPayout: totalRiderPayout,
      platformMargin: totalCustomerDeliveryFee - totalRiderPayout
    },
    restaurant: restaurantObj
  };
};

export const getOrdinalLabel = (index) => {
  const n = index + 1;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${(s[(v - 20) % 10] || s[v] || s[0])}`;
};

/**
 * Standardized Delivery Fee Breakdown Helper.
 * Formats individual per-stop fee rows for all Order History & Details panels.
 */
export const getDeliveryFeeBreakdown = (order) => {
  if (!order) {
    return {
      lines: [],
      totalDeliveryFees: 0,
      platformFee: 0,
      surgeFee: 0,
      rainFee: 0,
      extraItemFee: 0,
      discount: 0,
      totalPayable: 0
    };
  }

  // 1. Authoritative Stored deliveryFeeBreakdown on pricingSnapshot or Order
  const ps = order.pricingSnapshot;
  const storedBreakdown = ps?.deliveryFeeBreakdown || order.deliveryFeeBreakdown;

  if (Array.isArray(storedBreakdown) && storedBreakdown.length > 0) {
    const totalFromLines = storedBreakdown.reduce((sum, line) => sum + Number(line.amount || 0), 0);
    const totalDeliveryFees = Number(ps?.delivery?.totalCustomerDeliveryFee ?? order.deliveryFee ?? totalFromLines);

    return {
      lines: storedBreakdown.map((line, idx) => ({
        sequence: idx + 1,
        label: line.label || `${getOrdinalLabel(idx)} Pickup — ${line.sourceName || 'Fulfillment Source'}`,
        sourceName: line.sourceName || '',
        sourceType: line.sourceType || 'store',
        amount: Number(line.amount || 0)
      })),
      totalDeliveryFees,
      platformFee: Number(ps?.platformFee ?? order.platformFee ?? 0),
      surgeFee: Number(ps?.delivery?.surgeFee ?? (order.pricing?.otherSurcharges || 0)),
      rainFee: Number(ps?.delivery?.rainFee ?? (order.pricing?.rainSurcharge || 0)),
      extraItemFee: Number(ps?.delivery?.extraItemFee ?? (order.pricing?.foodExtraItemChargeApplied || 0)),
      discount: Number(ps?.discount ?? order.promoDiscount ?? 0),
      totalPayable: Number(ps?.totalCustomerPayable ?? order.total ?? 0)
    };
  }

  // 2. Dynamic Fallback Reconstruction for existing/historical orders
  const isRide = order.orderType === 'ride';
  const totalDeliveryFees = Number(order.deliveryFee ?? 0);
  const platformFee = Number(order.platformFee ?? 0);
  const discount = Number(order.promoDiscount ?? 0);
  const itemsSubtotal = Number(order.subtotal ?? 0);
  const totalPayable = Number(order.total ?? (itemsSubtotal + totalDeliveryFees + platformFee - discount));

  if (isRide) {
    return {
      lines: [{ sequence: 1, label: 'Ride Base Fare & Distance', sourceName: 'Ride Pickup', sourceType: 'ride', amount: totalPayable }],
      totalDeliveryFees: totalPayable,
      platformFee: 0,
      surgeFee: Number(order.pricing?.otherSurcharges || 0),
      rainFee: Number(order.pricing?.rainSurcharge || 0),
      extraItemFee: 0,
      discount,
      totalPayable
    };
  }

  // Get active pickup stops (excluding Cancelled & Rejected stops)
  const activeStops = Array.isArray(order.pickupStops)
    ? order.pickupStops.filter(s => s.status !== 'Rejected' && s.status !== 'Cancelled')
    : [];

  let baseFee = Number(order.pricing?.baseFoodDeliveryFeeApplied ?? order.baseFoodDeliveryFeeApplied ?? 0);
  let changeFeeRate = 10; // Default extra stop fee rate

  const totalStoreChangeFee = Number(order.pricing?.foodHotelChangeFeeApplied ?? order.foodHotelChangeFeeApplied ?? 0);
  const extraStopsCount = Math.max(0, activeStops.length - 1);

  if (totalStoreChangeFee > 0 && extraStopsCount > 0) {
    changeFeeRate = Math.round(totalStoreChangeFee / extraStopsCount);
  }

  if (baseFee <= 0) {
    if (extraStopsCount > 0 && totalDeliveryFees > 20) {
      const calculatedStoreFee = extraStopsCount * changeFeeRate;
      baseFee = Math.max(0, totalDeliveryFees - calculatedStoreFee);
    } else {
      baseFee = totalDeliveryFees;
    }
  }

  const lines = [];

  if (activeStops.length > 0) {
    activeStops.forEach((stop, idx) => {
      const ordinal = getOrdinalLabel(idx);
      const sourceName = stop.sourceName || (stop.sourceType === 'restaurant' ? (order.restaurant?.name || 'Restaurant') : 'Partner Store');
      const amount = idx === 0 ? baseFee : changeFeeRate;

      lines.push({
        sequence: idx + 1,
        label: `${ordinal} Pickup — ${sourceName}`,
        sourceName,
        sourceType: stop.sourceType || 'store',
        amount
      });
    });
  } else {
    const sourceName = order.restaurant?.name || 'Fulfillment Source';
    lines.push({
      sequence: 1,
      label: `1st Pickup — ${sourceName}`,
      sourceName,
      sourceType: 'restaurant',
      amount: totalDeliveryFees
    });
  }

  const rainFee = Number(order.pricing?.rainSurcharge ?? (Array.isArray(order.surcharges) ? (order.surcharges.find(s => s.name === 'Rain')?.fee || 0) : 0));
  const surgeFee = Number(order.pricing?.otherSurcharges ?? (Array.isArray(order.surcharges) ? order.surcharges.filter(s => s.name !== 'Rain').reduce((sum, s) => sum + (s.fee || 0), 0) : 0));
  const extraItemFee = Number(order.pricing?.foodExtraItemChargeApplied ?? order.foodExtraItemChargeApplied ?? 0);

  return {
    lines,
    totalDeliveryFees,
    platformFee,
    surgeFee,
    rainFee,
    extraItemFee,
    discount,
    totalPayable
  };
};

/**
 * Safe currency formatter for all Jinkzo display panels.
 * Accepts numbers, numeric strings, and handles null/undefined/NaN safely.
 *
 * @param {number|string|null|undefined} value
 * @param {object} options
 * @param {string} [options.symbol='₹'] - Currency symbol to prefix
 * @param {number} [options.decimals=2] - Number of decimal places
 * @param {string} [options.fallback='₹0.00'] - Fallback when value is missing/invalid
 * @param {boolean} [options.allowPlaceholder=false] - If true, missing returns '—'
 * @param {boolean} [options.showSymbol=true] - Whether to include the currency symbol
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, options = {}) => {
  const {
    symbol = '₹',
    decimals = 2,
    fallback = '₹0.00',
    allowPlaceholder = false,
    showSymbol = true
  } = options;

  if (value == null || value === '') {
    return allowPlaceholder ? '—' : fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    return allowPlaceholder ? '—' : fallback;
  }

  const formattedNum = num.toFixed(decimals);
  return showSymbol ? `${symbol}${formattedNum}` : formattedNum;
};

/**
 * Safe distance formatter for all Jinkzo routing & order panels.
 *
 * @param {number|string|null|undefined} value
 * @param {object} options
 * @param {string} [options.unit='km'] - Distance unit suffix
 * @param {number} [options.decimals=2] - Number of decimal places
 * @param {string} [options.fallback='Distance unavailable'] - Fallback message
 * @returns {string} Formatted distance string
 */
export const formatDistance = (value, options = {}) => {
  const {
    unit = 'km',
    decimals = 2,
    fallback = 'Distance unavailable'
  } = options;

  if (value == null || value === '') {
    return fallback;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return fallback;
  }

  return `${num.toFixed(decimals)} ${unit}`;
};

/**
 * Safe number/rating formatter.
 */
export const formatRating = (value, options = {}) => {
  const { decimals = 1, fallback = '—' } = options;
  if (value == null || value === '') return fallback;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return num.toFixed(decimals);
};

/**
 * Canonical timestamp helpers:
 * - Placed: prefer order.placedAt, fallback to order.createdAt
 * - Delivered: order.deliveredAt or order.completedAt. If unavailable, returns null (never fallback to createdAt/updatedAt).
 * - Cancelled: order.cancelledAt or null.
 */
export const getOrderPlacedAt = (order) => {
  if (!order || typeof order !== 'object') return null;
  return order.placedAt || order.createdAt || null;
};

export const getOrderDeliveredAt = (order) => {
  if (!order || typeof order !== 'object') return null;
  if (order.deliveredAt) return order.deliveredAt;
  if (order.orderType === 'ride' && order.completedAt) return order.completedAt;
  if (order.completedAt) return order.completedAt;
  if (Array.isArray(order.statusHistory)) {
    const entry = order.statusHistory.find(h => ['Delivered', 'Completed'].includes(h.status));
    if (entry?.timestamp) return entry.timestamp;
  }
  return null;
};

export const getOrderCancelledAt = (order) => {
  if (!order || typeof order !== 'object') return null;
  if (order.cancelledAt) return order.cancelledAt;
  if (Array.isArray(order.statusHistory)) {
    const entry = order.statusHistory.find(h => ['Cancelled', 'Rejected'].includes(h.status));
    if (entry?.timestamp) return entry.timestamp;
  }
  return null;
};

/**
 * Resolves pickup source names cleanly for Claimed Runs, Rider Cards, and Order Details.
 * Returns: { sources: string[], primarySource: string, summary: string, count: number }
 */
export const getOrderSourceDisplayNames = (order) => {
  if (!order || typeof order !== 'object') {
    return { sources: [], primarySource: 'Jinkzo Partner', summary: 'Jinkzo Partner', count: 0 };
  }

  if (order.orderType === 'ride') {
    const pickup = order.pickupLocation?.formattedAddress || order.pickupAddress?.street || order.pickupAddress?.city || 'Selected Pickup';
    return { sources: [pickup], primarySource: pickup, summary: pickup, count: 1 };
  }

  const fulfillmentSources = getOrderFulfillmentSources(order);
  const sources = fulfillmentSources.map(s => s.sourceName).filter(Boolean);

  if (sources.length === 0) {
    const fallback = order.restaurant?.name || 'Jinkzo Partner';
    return { sources: [fallback], primarySource: fallback, summary: fallback, count: 1 };
  }

  const primarySource = sources[0];
  const summary = sources.length === 1
    ? primarySource
    : `${primarySource} + ${sources.length - 1} more`;

  return {
    sources,
    primarySource,
    summary,
    count: sources.length
  };
};

/**
 * Builds a fast lookup map of fulfillment sources (Restaurants, Suppliers/Stores) from an order.
 * Pure helper function (no React hooks) - safe to call anywhere.
 */
export const buildSourceObjMap = (order) => {
  const map = {};
  if (!order || typeof order !== 'object') return map;

  if (order.restaurant?.name) {
    map[order.restaurant.name] = { isSupplier: false, name: order.restaurant.name, ...order.restaurant };
  }
  if (Array.isArray(order.pickupStops)) {
    order.pickupStops.forEach(s => {
      if (s.sourceName) {
        map[s.sourceName] = {
          isSupplier: s.sourceType === 'supplier',
          sourceId: s.sourceId,
          phone: s.sourcePhone,
          address: s.address
        };
      }
    });
  }
  if (Array.isArray(order.supplierDeliveries)) {
    order.supplierDeliveries.forEach(s => {
      if (s.supplierName) {
        map[s.supplierName] = {
          isSupplier: true,
          sourceId: s.supplierId,
          phone: s.supplierPhone,
          address: s.address
        };
      }
    });
  }
  if (Array.isArray(order.items)) {
    order.items.forEach(i => {
      const sName = i.sourceName || i.supplierName || i.restaurantName;
      if (sName && !map[sName]) {
        map[sName] = {
          isSupplier: Boolean(i.supplierId || i.itemModel === 'CatalogItem'),
          sourceId: i.sourceId || i.supplierId || i.restaurantId
        };
      }
    });
  }
  return map;
};

/**
 * Canonical normalizer for Rider Run Cards & Active Run Details.
 * Resilient to different service types (Food, Store, Mixed, Ride, Courier) and missing legacy fields.
 */
export const normalizeRiderRun = (order) => {
  if (!order || typeof order !== 'object') {
    return {
      id: '',
      shortId: '',
      orderType: 'food',
      isRide: false,
      status: 'Unknown',
      customerName: 'Customer',
      customerPhone: '',
      placedAt: null,
      deliveredAt: null,
      pickupLocationName: '',
      dropLocationName: '',
      customerAddress: '',
      distance: null,
      distanceFormatted: 'Distance unavailable',
      customerTotal: 0,
      customerTotalFormatted: '₹0.00',
      riderEarning: 0,
      riderEarningFormatted: '₹0.00',
      paymentMethod: 'Cash on Delivery',
      pickupStops: [],
      sourcesInfo: getOrderSourceDisplayNames(null),
      financials: getOrderFinancialBreakdown(null)
    };
  }

  const id = String(order._id || order.id || '');
  const shortId = id.length >= 8 ? id.substr(-8).toUpperCase() : id;
  const isRide = order.orderType === 'ride';
  const orderType = order.orderType || 'food';
  const status = order.status || 'Placed';

  const customerName = order.customerName || order.user?.name || order.userId?.name || order.address?.name || 'Customer';
  const customerPhone = order.customerPhone || order.user?.phone || order.userId?.phone || '';

  const customerAddress = order.customerLocation?.formattedAddress ||
    (order.address?.street
      ? `${order.address.street}${order.address.city ? `, ${order.address.city}` : ''}`
      : (order.address?.formattedAddress || 'Customer Location'));

  let pickupLocationName = '';
  if (isRide) {
    pickupLocationName = order.pickupLocation?.formattedAddress ||
      order.pickupAddress?.street ||
      order.pickupAddress?.city ||
      (order.pickupLocation?.lat != null && order.pickupLocation?.lng != null
        ? `${Number(order.pickupLocation.lat).toFixed(4)}, ${Number(order.pickupLocation.lng).toFixed(4)}`
        : 'Selected Pickup');
  } else {
    pickupLocationName = order.restaurant?.name || 'Restaurant';
  }

  let dropLocationName = '';
  if (isRide) {
    dropLocationName = order.dropLocation?.formattedAddress ||
      order.address?.street ||
      order.address?.city ||
      'Drop Location';
  } else {
    dropLocationName = customerAddress;
  }

  const distanceNum = order.distance != null && Number.isFinite(Number(order.distance))
    ? Number(order.distance)
    : null;

  const financials = getOrderFinancialBreakdown(order);

  const customerTotalNum = Number(order.total ?? order.fare ?? order.subtotal ?? 0);
  const riderEarningNum = isRide
    ? Number(order.pricingSnapshot?.rider?.totalRiderPayout ?? order.riderPayout ?? order.riderEarning ?? order.total ?? order.fare ?? 0)
    : Number(financials.rider.totalRiderPayout);

  const paymentMethod = order.paymentDetails?.method ||
    (order.paymentMethod === 'COD' || !order.paymentMethod ? 'Cash on Delivery' : order.paymentMethod);

  const sourcesInfo = getOrderSourceDisplayNames(order);

  return {
    id,
    shortId,
    orderType,
    isRide,
    status,
    customerName,
    customerPhone,
    placedAt: getOrderPlacedAt(order),
    deliveredAt: getOrderDeliveredAt(order),
    cancelledAt: getOrderCancelledAt(order),
    pickupLocationName,
    dropLocationName,
    customerAddress,
    distance: distanceNum,
    distanceFormatted: formatDistance(distanceNum),
    customerTotal: customerTotalNum,
    customerTotalFormatted: formatCurrency(customerTotalNum),
    riderEarning: riderEarningNum,
    riderEarningFormatted: formatCurrency(riderEarningNum),
    paymentMethod,
    pickupStops: Array.isArray(order.pickupStops) ? order.pickupStops : [],
    sourcesInfo,
    financials
  };
};

/**
 * Safely extract string ID from an object or value.
 */
export const getSafeId = (val) => {
  if (!val) return '';
  if (typeof val === 'object') return String(val._id || val.id || '');
  return String(val);
};

/**
 * Checks whether an item is explicitly linked to a restaurant.
 */
export const isRestaurantItem = (item, order) => {
  if (!item || typeof item !== 'object') return false;

  // If item is explicitly tied to a supplier, it cannot be a restaurant item
  const supId = getSafeId(item.supplierId || item.storeId);
  if (supId && supId !== 'null' && supId !== 'undefined' && supId !== 'store_jinkzo' && supId !== 'jinkzo_store') return false;
  if (item.itemModel === 'CatalogItem') return false;

  // Explicit restaurant indicators on the item
  const itemRestId = getSafeId(item.restaurantId);
  if (itemRestId && itemRestId !== 'null' && itemRestId !== 'undefined' && itemRestId !== 'store_jinkzo') return true;
  if (item.sourceType === 'restaurant' && getSafeId(item.sourceId) && getSafeId(item.sourceId) !== 'store_jinkzo') return true;
  if (item.itemModel === 'MenuItem') return true;

  const itemRestName = (item.restaurantName || '').trim().toLowerCase();
  if (itemRestName && !itemRestName.includes('store') && !itemRestName.includes('jinkzo')) return true;

  // Contextual check: if the order has an actual restaurant and the item does not belong to store categories
  const orderRestId = getSafeId(order?.restaurantId || (order?.restaurant?._id !== 'store_jinkzo' ? order?.restaurant?._id : ''));
  const hasRestStop = Array.isArray(order?.pickupStops) && order.pickupStops.some(s => s.sourceType === 'restaurant' && getSafeId(s.sourceId) !== 'store_jinkzo');

  if ((orderRestId || hasRestStop) && !item.supplierId && !item.storeId) {
    const srv = String(item.service || '').trim().toLowerCase();
    const cat = String(item.category || item.categoryName || '').trim().toLowerCase();
    const isStoreService = srv.includes('grocery') || srv.includes('meat') || srv.includes('chicken') || srv.includes('fish') || srv.includes('veg') || srv.includes('fruit') || srv.includes('bakery') || srv.includes('beverage') || srv.includes('catalog') || srv.includes('store');
    const isStoreCat = cat.includes('grocery') || cat.includes('meat') || cat.includes('chicken') || cat.includes('fish') || cat.includes('veg') || cat.includes('fruit') || cat.includes('bakery') || cat.includes('beverage');
    if (!isStoreService && !isStoreCat) {
      return true;
    }
  }

  return false;
};

/**
 * Checks whether an item is explicitly linked to a supplier/store.
 */
export const isSupplierItem = (item, order) => {
  if (!item || typeof item !== 'object') return false;
  if (isRestaurantItem(item, order)) return false;

  const supId = getSafeId(item.supplierId || item.storeId);
  if (supId && supId !== 'null' && supId !== 'undefined' && supId !== 'store_jinkzo' && supId !== 'jinkzo_store') return true;

  const supName = (item.supplierName || item.storeName || '').trim().toLowerCase();
  const isGenericStoreName = !supName || supName === 'jinkzo store' || supName === 'partner store' || supName === 'store partner' || supName === 'store' || supName === 'jinkzo';
  if (!isGenericStoreName) return true;

  if (item.sourceType === 'supplier' && getSafeId(item.sourceId) && getSafeId(item.sourceId) !== 'store_jinkzo') return true;

  // Check explicit assignment in order.supplierDeliveries
  if (Array.isArray(order?.supplierDeliveries)) {
    const itemId = getSafeId(item._id || item.itemId || item.menuItemId || item.productId);
    const itemName = (item.name || item.itemName || '').trim().toLowerCase();
    const foundInSup = order.supplierDeliveries.some(sd => {
      const sdId = getSafeId(sd.supplierId);
      const sdName = (sd.supplierName || sd.name || '').trim().toLowerCase();
      const isRealSup = Boolean((sdId && sdId !== 'store_jinkzo') || (sdName && sdName !== 'jinkzo store' && sdName !== 'store'));
      if (!isRealSup) return false;
      return Array.isArray(sd.items) && sd.items.some(sdi => {
        const sdiId = getSafeId(sdi._id || sdi.itemId || sdi.menuItemId || sdi.productId);
        if (itemId && sdiId && itemId === sdiId) return true;
        const sdiName = (sdi.itemName || sdi.name || '').trim().toLowerCase();
        if (itemName && sdiName && itemName === sdiName) return true;
        return false;
      });
    });
    if (foundInSup) return true;
  }

  // Check explicit assignment in order.pickupStops
  if (Array.isArray(order?.pickupStops)) {
    const itemId = getSafeId(item._id || item.itemId || item.menuItemId || item.productId);
    const itemName = (item.name || item.itemName || '').trim().toLowerCase();
    const foundInStop = order.pickupStops.some(stop => {
      if (stop.sourceType !== 'supplier') return false;
      const stopId = getSafeId(stop.sourceId);
      const stopName = (stop.sourceName || '').trim().toLowerCase();
      const isRealSup = Boolean((stopId && stopId !== 'store_jinkzo') || (stopName && stopName !== 'jinkzo store' && stopName !== 'store'));
      if (!isRealSup) return false;
      return Array.isArray(stop.items) && stop.items.some(si => {
        const siId = getSafeId(si._id || si.itemId || si.menuItemId || si.productId);
        if (itemId && siId && itemId === siId) return true;
        const siName = (si.itemName || si.name || '').trim().toLowerCase();
        if (itemName && siName && itemName === siName) return true;
        return false;
      });
    });
    if (foundInStop) return true;
  }

  return false;
};

/**
 * Returns normalized category name for a no-supplier item.
 */
export const getNoSupplierCategory = (item) => {
  if (!item) return 'UNASSIGNED ITEM';
  const raw = String(item.category || item.categoryName || item.service || '').trim();
  const lower = raw.toLowerCase();

  if (lower.includes('meat') || lower.includes('chicken') || lower.includes('mutton') || lower.includes('fish')) return 'MEAT';
  if (lower.includes('grocery') || lower.includes('groceries')) return 'GROCERY';
  if (lower.includes('veg') || lower.includes('fruit')) return 'VEG & FRUITS';
  if (lower.includes('bakery') || lower.includes('beverage') || lower.includes('cake')) return 'BAKERY';

  if (raw) {
    return raw.toUpperCase().replace(/[\-_]+/g, ' ').trim();
  }
  return 'UNASSIGNED ITEM';
};

/**
 * Human-friendly category display label and icon.
 */
export const getCategoryDisplayMeta = (categoryKey) => {
  const cat = String(categoryKey || '').toUpperCase();
  if (cat.includes('MEAT')) return { label: 'MEAT', badge: 'MEAT', icon: '🥩' };
  if (cat.includes('GROCERY')) return { label: 'GROCERY', badge: 'GROCERY', icon: '🛒' };
  if (cat.includes('VEG') || cat.includes('FRUIT')) return { label: 'VEG & FRUITS', badge: 'VEG & FRUITS', icon: '🥦' };
  if (cat.includes('BAKERY')) return { label: 'BAKERY', badge: 'BAKERY', icon: '🍞' };
  return { label: cat, badge: cat, icon: '📦' };
};

/**
 * Extract normalized items list for any pickup stop (restaurant, supplier, or category stop).
 * Strictly requires explicit supplier matching and never absorbs unrelated items.
 */
export const getStopItems = (stop, order) => {
  if (!stop) return [];

  const stopId = getSafeId(stop.sourceId);
  const stopName = (stop.sourceName || stop.name || '').trim().toLowerCase();
  const isSupplier = stop.sourceType === 'supplier' || stop.sourceType === 'store' || (stop.category && stop.category !== 'food');

  const mapItem = (it) => {
    const unitPrice = Number(it.price ?? it.customerUnitPrice ?? it.partnerSettlementPrice ?? 0);
    const qty = Number(it.quantity ?? 1);
    return {
      id: getSafeId(it._id || it.itemId || it.menuItemId || it.productId),
      name: it.itemName || it.name || 'Item',
      quantity: qty,
      unit: it.unit || '',
      price: unitPrice,
      lineTotal: unitPrice * qty,
      total: unitPrice * qty,
      isCancelled: Boolean(it.isCancelled),
      isVeg: it.isVeg,
      category: it.category
    };
  };

  // 1. Direct items on pickup stop (if explicitly provided)
  if (Array.isArray(stop.items) && stop.items.length > 0) {
    return stop.items.map(mapItem);
  }

  // 2. If supplier, check order.supplierDeliveries for that EXACT supplier
  if (isSupplier && Array.isArray(order?.supplierDeliveries) && order.supplierDeliveries.length > 0) {
    const matchingSup = order.supplierDeliveries.find(sd => {
      const sdId = getSafeId(sd.supplierId);
      if (stopId && sdId && stopId === sdId) return true;
      const sdName = (sd.supplierName || sd.name || '').trim().toLowerCase();
      if (stopName && sdName && stopName === sdName) return true;
      return false;
    });

    if (matchingSup && Array.isArray(matchingSup.items) && matchingSup.items.length > 0) {
      return matchingSup.items.map(mapItem);
    }
  }

  // 3. Match from order.items with strict item-to-supplier/restaurant relationship
  if (Array.isArray(order?.items) && order.items.length > 0) {
    const matched = order.items.filter(it => {
      if (isSupplier) {
        if (!isSupplierItem(it, order)) return false;
        const itemSupId = getSafeId(it.supplierId || it.storeId);
        const itemSupName = (it.supplierName || it.storeName || '').trim().toLowerCase();

        if (stopId && itemSupId && stopId === itemSupId) return true;
        if (stopName && itemSupName && stopName === itemSupName) return true;
        return false;
      } else {
        if (!isRestaurantItem(it, order)) return false;
        const itemRestId = getSafeId(it.restaurantId);
        const itemRestName = (it.restaurantName || '').trim().toLowerCase();

        if (stopId && itemRestId && stopId === itemRestId) return true;
        if (stopName && itemRestName && stopName === itemRestName) return true;

        const restStopsCount = (order.pickupStops || []).filter(s => s.sourceType === 'restaurant').length;
        if (restStopsCount <= 1) return true;
        return false;
      }
    });

    if (matched.length > 0) {
      return matched.map(mapItem);
    }
  }

  return [];
};

/**
 * Calculate the total subtotal of non-cancelled items for a pickup stop.
 */
export const getStopSubtotal = (stop, order) => {
  const items = getStopItems(stop, order);
  return items.reduce((sum, it) => it.isCancelled ? sum : sum + it.lineTotal, 0);
};

/**
 * Canonical helper to retrieve all distinct fulfillment sources (Restaurant, Supplier, or Category-based No-Supplier).
 * Guarantees that items without an assigned supplier are NEVER grouped under an arbitrary or single supplier.
 * Guarantees that every item belongs to EXACTLY ONE source group.
 */
export const getOrderFulfillmentSources = (order) => {
  if (!order || typeof order !== 'object') return [];

  const restSources = new Map();
  const supplierSources = new Map();
  const categorySources = new Map();

  const normalizeItem = (it, fallbackCat) => {
    const unitPrice = Number(it.price ?? it.customerUnitPrice ?? it.partnerSettlementPrice ?? 0);
    const qty = Number(it.quantity ?? 1);
    return {
      id: getSafeId(it._id || it.itemId || it.menuItemId || it.productId),
      name: it.itemName || it.name || 'Item',
      quantity: qty,
      unit: it.unit || '',
      price: unitPrice,
      lineTotal: unitPrice * qty,
      total: unitPrice * qty,
      isCancelled: Boolean(it.isCancelled),
      isVeg: it.isVeg,
      category: it.category || fallbackCat || ''
    };
  };

  const isSameItem = (a, b) => {
    if (!a || !b) return false;
    const aId = getSafeId(a._id || a.itemId || a.menuItemId || a.productId);
    const bId = getSafeId(b._id || b.itemId || b.menuItemId || b.productId);
    if (aId && bId && aId === bId) return true;
    const aName = (a.itemName || a.name || '').trim().toLowerCase();
    const bName = (b.itemName || b.name || '').trim().toLowerCase();
    if (aName && bName && aName === bName) return true;
    return false;
  };

  // 1. Gather all items to partition
  let itemsToPartition = Array.isArray(order.items) && order.items.length > 0 ? order.items : [];

  // Fallback if order.items is missing: gather items from pickupStops or supplierDeliveries
  if (itemsToPartition.length === 0) {
    if (Array.isArray(order.pickupStops) && order.pickupStops.length > 0) {
      order.pickupStops.forEach(stop => {
        if (Array.isArray(stop.items)) {
          stop.items.forEach(si => {
            itemsToPartition.push({
              ...si,
              restaurantId: stop.sourceType === 'restaurant' ? stop.sourceId : null,
              restaurantName: stop.sourceType === 'restaurant' ? stop.sourceName : '',
              supplierId: stop.sourceType === 'supplier' ? stop.sourceId : null,
              supplierName: stop.sourceType === 'supplier' ? stop.sourceName : '',
              category: stop.category || si.category || ''
            });
          });
        }
      });
    }
  }

  // 2. Partition every item into EXACTLY ONE source group
  itemsToPartition.forEach(item => {
    // ----------------------------------------------------
    // SITUATION 1: RESTAURANT FOOD ITEM
    // ----------------------------------------------------
    if (isRestaurantItem(item, order)) {
      const restId = getSafeId(item.restaurantId) || getSafeId(order.restaurantId) || (order.restaurant?._id !== 'store_jinkzo' ? getSafeId(order.restaurant?._id) : '') || 'restaurant_main';
      const restName = (item.restaurantName || (order.restaurant?.name !== 'Jinkzo Store' ? order.restaurant?.name : '') || 'Restaurant').trim();
      const key = `restaurant_${restId || restName.toLowerCase()}`;

      if (!restSources.has(key)) {
        const matchingStop = Array.isArray(order.pickupStops)
          ? order.pickupStops.find(s => s.sourceType === 'restaurant' && (
              (restId && getSafeId(s.sourceId) === restId) ||
              (restName && s.sourceName?.trim().toLowerCase() === restName.toLowerCase())
            )) || order.pickupStops.find(s => s.sourceType === 'restaurant')
          : null;

        restSources.set(key, {
          id: key,
          stopId: String(matchingStop?._id || matchingStop?.stopId || restId),
          sourceType: 'restaurant',
          sourceId: restId,
          sourceName: matchingStop?.sourceName || restName,
          category: 'food',
          sourcePhone: matchingStop?.sourcePhone || order.restaurantPhone || order.restaurant?.phone || '',
          address: matchingStop?.address || order.restaurantAddress || order.restaurant?.address || '',
          latitude: matchingStop?.latitude ?? order.restaurantLocation?.lat ?? order.restaurant?.lat ?? order.restaurant?.latitude,
          longitude: matchingStop?.longitude ?? order.restaurantLocation?.lng ?? order.restaurant?.lng ?? order.restaurant?.longitude,
          distanceKm: matchingStop?.distanceKm ?? null,
          durationMinutes: matchingStop?.durationMinutes ?? null,
          status: matchingStop?.status || (['Placed', 'Accepted', 'Confirmed', 'Preparing'].includes(order.status) ? 'Preparing' : 'Ready'),
          isRejected: matchingStop ? (matchingStop.status === 'Rejected' || matchingStop.status === 'Cancelled') : false,
          isNoSupplier: false,
          items: []
        });
      }
      restSources.get(key).items.push(normalizeItem(item, 'food'));
      return;
    }

    // ----------------------------------------------------
    // SITUATION 2: SUPPLIER-LINKED ITEM
    // ----------------------------------------------------
    if (isSupplierItem(item, order)) {
      const supId = getSafeId(item.supplierId || item.storeId);
      let supName = (item.supplierName || item.storeName || '').trim();

      const matchingStop = Array.isArray(order.pickupStops)
        ? order.pickupStops.find(s => s.sourceType === 'supplier' && (
            (supId && getSafeId(s.sourceId) === supId) ||
            (supName && s.sourceName?.trim().toLowerCase() === supName.toLowerCase()) ||
            (Array.isArray(s.items) && s.items.some(si => isSameItem(si, item)))
          ))
        : null;

      const matchingSd = Array.isArray(order.supplierDeliveries)
        ? order.supplierDeliveries.find(sd => (
            (supId && getSafeId(sd.supplierId) === supId) ||
            (supName && sd.supplierName?.trim().toLowerCase() === supName.toLowerCase()) ||
            (Array.isArray(sd.items) && sd.items.some(sdi => isSameItem(sdi, item)))
          ))
        : null;

      const finalSupId = supId || getSafeId(matchingStop?.sourceId) || getSafeId(matchingSd?.supplierId) || '';
      if (!supName || supName.toLowerCase() === 'partner store' || supName.toLowerCase() === 'store partner') {
        supName = matchingStop?.sourceName || matchingSd?.supplierName || supName || 'Store';
      }

      const key = `supplier_${finalSupId || supName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

      if (!supplierSources.has(key)) {
        supplierSources.set(key, {
          id: key,
          stopId: String(matchingStop?._id || matchingStop?.stopId || matchingSd?._id || finalSupId || key),
          sourceType: 'supplier',
          sourceId: finalSupId,
          sourceName: supName,
          category: matchingStop?.category || matchingSd?.category || item.category || 'store',
          sourcePhone: matchingStop?.sourcePhone || matchingSd?.supplierPhone || '',
          address: matchingStop?.address || matchingSd?.address || '',
          latitude: matchingStop?.latitude ?? matchingSd?.latitude ?? null,
          longitude: matchingStop?.longitude ?? matchingSd?.longitude ?? null,
          distanceKm: matchingStop?.distanceKm ?? matchingSd?.distanceKm ?? null,
          durationMinutes: matchingStop?.durationMinutes ?? matchingSd?.durationMinutes ?? null,
          status: matchingStop?.status || 'Ready',
          isRejected: matchingStop ? (matchingStop.status === 'Rejected' || matchingStop.status === 'Cancelled') : false,
          isNoSupplier: false,
          items: []
        });
      }
      supplierSources.get(key).items.push(normalizeItem(item, 'store'));
      return;
    }

    // ----------------------------------------------------
    // SITUATION 3: NO SUPPLIER / STORE (INFORMATIONAL CATEGORY ONLY)
    // ----------------------------------------------------
    const catKey = getNoSupplierCategory(item);
    const meta = getCategoryDisplayMeta(catKey);
    const key = `category_${catKey.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

    if (!categorySources.has(key)) {
      categorySources.set(key, {
        id: key,
        stopId: key,
        sourceType: 'category',
        category: catKey,
        sourceName: meta.label,
        badge: meta.badge,
        icon: meta.icon,
        isNoSupplier: true,
        status: 'Ready',
        address: '',
        sourcePhone: '',
        latitude: null,
        longitude: null,
        distanceKm: null,
        durationMinutes: null,
        isRejected: false,
        items: []
      });
    }
    categorySources.get(key).items.push(normalizeItem(item, catKey));
  });

  // Calculate subtotals
  const allSources = [
    ...Array.from(restSources.values()),
    ...Array.from(supplierSources.values()),
    ...Array.from(categorySources.values())
  ];

  allSources.forEach(src => {
    src.subtotal = src.items.reduce((sum, it) => it.isCancelled ? sum : sum + (Number(it.lineTotal) || 0), 0);
  });

  return allSources;
};

/**
 * Authoritative Order Billing Breakdown Helper.
 * Single source of truth for Rider View Details Modal and Claimed Runs View.
 */
export const getOrderBillingBreakdown = (order) => {
  if (!order || typeof order !== 'object') {
    return {
      sources: [],
      itemsSubtotal: 0,
      deliveryFeeLines: [],
      totalDeliveryFees: 0,
      platformFee: 0,
      surgeFee: 0,
      rainFee: 0,
      extraItemFee: 0,
      discount: 0,
      totalPayable: 0,
      isCOD: true,
      paymentMethod: 'Cash on Delivery',
      rider: {
        basePayout: 0,
        additionalStopPayout: 0,
        tipAmount: 0,
        totalRiderPayout: 0
      }
    };
  }

  const isRide = order.orderType === 'ride';
  const fin = getOrderFinancialBreakdown(order);
  const deliv = getDeliveryFeeBreakdown(order);

  // Authoritative Customer Totals
  const itemsSubtotal = Number(fin.customer.itemsSubtotal || 0);
  const totalDeliveryFees = Number(deliv.totalDeliveryFees || fin.customer.totalCustomerDeliveryFee || 0);
  const platformFee = Number(deliv.platformFee || fin.customer.platformFee || 0);
  const surgeFee = Number(deliv.surgeFee || fin.customer.surgeFee || 0);
  const rainFee = Number(deliv.rainFee || fin.customer.rainFee || 0);
  const extraItemFee = Number(deliv.extraItemFee || fin.customer.extraItemFee || 0);
  const discount = Number(deliv.discount || fin.customer.discount || 0);
  const totalPayable = Number(order.total ?? deliv.totalPayable ?? fin.customer.totalPayable ?? 0);

  // Collect All Contributing Sources
  const sources = [];

  if (isRide) {
    const pickupName = order.pickupLocation?.formattedAddress || order.pickupAddress?.street || 'Ride Pickup';
    sources.push({
      id: 'ride_pickup',
      name: pickupName,
      type: 'ride',
      subtotal: totalPayable,
      status: order.status,
      isRejected: false,
      isNoSupplier: false,
      itemsCount: 0
    });
  } else {
    const fulfillmentSources = getOrderFulfillmentSources(order);
    fulfillmentSources.forEach(fSrc => {
      sources.push({
        id: fSrc.id,
        name: fSrc.sourceName,
        sourceName: fSrc.sourceName,
        type: fSrc.sourceType,
        sourceType: fSrc.sourceType,
        category: fSrc.category,
        subtotal: fSrc.subtotal,
        status: fSrc.status,
        isRejected: Boolean(fSrc.isRejected),
        isNoSupplier: Boolean(fSrc.isNoSupplier),
        itemsCount: (fSrc.items || []).filter(i => !i.isCancelled).length
      });
    });
  }

  // Payment method
  const paymentMethod = order.paymentDetails?.method || (order.paymentMethod === 'COD' || !order.paymentMethod ? 'COD' : order.paymentMethod);
  const isCOD = paymentMethod === 'COD';

  // Rider Earnings
  const tipAmount = Number(order.riderReview?.tipAmount ?? order.tipAmount ?? 0);
  const basePayout = isRide
    ? Number(order.pricingSnapshot?.rider?.totalRiderPayout ?? order.riderPayout ?? order.riderEarning ?? order.total ?? order.fare ?? 0)
    : Number(fin.rider.basePayout || 0);
  const additionalStopPayout = isRide ? 0 : Number(fin.rider.additionalStopPayout || 0);
  const totalRiderPayout = (isRide ? basePayout : Number(fin.rider.totalRiderPayout || 0)) + tipAmount;

  return {
    sources,
    itemsSubtotal,
    deliveryFeeLines: deliv.lines || [],
    totalDeliveryFees,
    platformFee,
    surgeFee,
    rainFee,
    extraItemFee,
    discount,
    totalPayable,
    isCOD,
    paymentMethod,
    rider: {
      basePayout,
      additionalStopPayout,
      tipAmount,
      totalRiderPayout
    }
  };
};
