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

  const set = new Set();
  if (Array.isArray(order.pickupStops) && order.pickupStops.length > 0) {
    order.pickupStops.forEach(s => {
      if (s.sourceName && s.status !== 'Cancelled' && s.status !== 'Rejected') {
        set.add(s.sourceName.trim());
      }
    });
  }
  if (set.size === 0 && Array.isArray(order.supplierDeliveries) && order.supplierDeliveries.length > 0) {
    order.supplierDeliveries.forEach(sd => {
      if (sd.supplierName) set.add(sd.supplierName.trim());
    });
  }
  if (set.size === 0 && Array.isArray(order.items) && order.items.length > 0) {
    order.items.forEach(i => {
      const name = i.sourceName || i.supplierName || i.restaurantName;
      if (name) set.add(name.trim());
    });
  }
  if (set.size === 0 && order.restaurant?.name) {
    set.add(order.restaurant.name.trim());
  }

  const sources = Array.from(set);
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
