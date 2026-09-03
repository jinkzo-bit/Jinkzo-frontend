/**
 * Canonical Settlement Pricing Helper for Jinkzo Frontend
 * Handles Item Commission, Partner Settlement Prices, Multi-Partner Splits, and Date Filters.
 */

/**
 * Returns the authoritative effective partner settlement unit price for an item.
 * @param {Object} item - MenuItem or CatalogItem object (or order item)
 * @param {Object} partner - Restaurant or Supplier partner object
 * @param {Object} globalSettings - Platform settings object containing itemCommissionEnabled
 * @returns {number} Effective settlement price per unit
 */
export function getEffectiveSettlementPrice(item, partner, globalSettings) {
  const customerSellingPrice = Number(item?.price ?? 0);
  const isMasterOn = globalSettings ? Boolean(globalSettings.itemCommissionEnabled) : false;

  // Master Switch OFF -> Settlement Price = Customer Selling Price (Commission = 0)
  if (!isMasterOn) {
    return customerSellingPrice;
  }

  const mode = item?.pricingConcessionMode || 'inherit';

  // Item Override DISABLED -> Settlement Price = Customer Selling Price
  if (mode === 'disabled') {
    return customerSellingPrice;
  }

  const configuredSettlementPrice = (item?.partnerSettlementPrice != null && Number.isFinite(Number(item.partnerSettlementPrice)))
    ? Number(item.partnerSettlementPrice)
    : customerSellingPrice;

  // Item Override ENABLED -> Use configured settlement price
  if (mode === 'enabled') {
    return configuredSettlementPrice;
  }

  // mode === 'inherit': Follow partner agreement
  const partnerConcessionOn = partner ? Boolean(partner.priceConcessionEnabled) : false;
  if (partnerConcessionOn) {
    return configuredSettlementPrice;
  }

  return customerSellingPrice;
}

/**
 * Calculates complete order financial breakdown with multi-partner splits.
 */
export function getComprehensiveOrderFinancials(order, globalSettings = null) {
  if (!order) return null;
  const items = Array.isArray(order.items) ? order.items : [];
  const ps = order.pricingSnapshot || {};
  const storedFin = ps.financials;

  // 1. Authoritative Stored Pricing Snapshot
  if (storedFin && Array.isArray(storedFin.byPartner)) {
    return {
      customerItemsSubtotal: Number(storedFin.customerItemsSubtotal ?? order.subtotal ?? 0),
      partnerSettlementTotal: Number(storedFin.partnerSettlementTotal ?? 0),
      jinkzoItemCommissionTotal: Number(storedFin.jinkzoItemCommissionTotal ?? 0),
      deliveryFeeTotal: Number(storedFin.deliveryFeeTotal ?? order.deliveryFee ?? 0),
      platformFee: Number(storedFin.platformFee ?? order.platformFee ?? 0),
      discount: Number(storedFin.discount ?? order.promoDiscount ?? 0),
      customerTotal: Number(storedFin.customerTotal ?? order.total ?? 0),
      riderDeliveryEarning: Number(storedFin.riderDeliveryEarning ?? order.riderPayout ?? 0),
      customerCodAmount: Number(storedFin.customerCodAmount ?? order.total ?? 0),
      byPartner: storedFin.byPartner.map(p => ({
        partnerId: String(p.partnerId || ''),
        partnerName: p.partnerName || 'Partner',
        partnerType: p.partnerType || 'restaurant',
        customerSubtotal: Number(p.customerSubtotal || 0),
        partnerPayable: Number(p.partnerPayable || 0),
        itemCommission: Number(p.itemCommission || 0),
        status: p.status || 'Pending',
        amountPaid: Number(p.amountPaid || 0),
        amountPending: Number(p.amountPending != null ? p.amountPending : (p.partnerPayable - (p.amountPaid || 0)))
      }))
    };
  }

  // 2. Compute from order items or fallback
  const partnerMap = {};
  let customerItemsSubtotal = 0;
  let partnerSettlementTotal = 0;
  let jinkzoItemCommissionTotal = 0;

  items.forEach(item => {
    if (item.isCancelled) return;

    const unitPrice = Number(item.customerUnitPrice ?? item.price ?? 0);
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const lineTotal = Number(item.customerLineTotal ?? (unitPrice * qty));
    
    const settlementUnitPrice = item.partnerSettlementUnitPrice != null
      ? Number(item.partnerSettlementUnitPrice)
      : (item.partnerPayable != null ? (Number(item.partnerPayable) / qty) : unitPrice);

    const linePayable = Number(item.partnerLinePayable ?? (settlementUnitPrice * qty));
    const lineCommission = Number(item.jinkzoItemCommission ?? Math.max(0, lineTotal - linePayable));

    customerItemsSubtotal += lineTotal;
    partnerSettlementTotal += linePayable;
    jinkzoItemCommissionTotal += lineCommission;

    const pId = String(item.sourceId || item.supplierId || item.restaurantId || order.restaurantId || 'general');
    const pName = item.sourceName || item.supplierName || item.restaurantName || order.restaurant?.name || 'Partner';
    const pType = item.sourceType || (item.service && item.service !== 'food' ? item.service : 'restaurant');

    if (!partnerMap[pId]) {
      partnerMap[pId] = {
        partnerId: pId,
        partnerName: pName,
        partnerType: pType,
        customerSubtotal: 0,
        partnerPayable: 0,
        itemCommission: 0,
        status: 'Pending',
        amountPaid: 0,
        amountPending: 0
      };
    }

    partnerMap[pId].customerSubtotal += lineTotal;
    partnerMap[pId].partnerPayable += linePayable;
    partnerMap[pId].itemCommission += lineCommission;
  });

  const byPartner = Object.values(partnerMap).map(p => {
    p.amountPending = p.partnerPayable - p.amountPaid;
    return p;
  });

  const deliveryFeeTotal = Number(order.deliveryFee ?? (order.pricingSnapshot?.delivery?.totalCustomerDeliveryFee ?? 0));
  const platformFee = Number(order.platformFee ?? (order.pricingSnapshot?.platformFee ?? 5));
  const discount = Number(order.promoDiscount ?? (order.pricingSnapshot?.discount ?? 0));
  const customerTotal = Number(order.total ?? (customerItemsSubtotal + deliveryFeeTotal + platformFee - discount));
  const riderDeliveryEarning = Number(order.riderPayout ?? (order.pricingSnapshot?.rider?.totalRiderPayout ?? deliveryFeeTotal));

  return {
    customerItemsSubtotal: Math.round(customerItemsSubtotal * 100) / 100,
    partnerSettlementTotal: Math.round(partnerSettlementTotal * 100) / 100,
    jinkzoItemCommissionTotal: Math.round(jinkzoItemCommissionTotal * 100) / 100,
    deliveryFeeTotal: Math.round(deliveryFeeTotal * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    customerTotal: Math.round(customerTotal * 100) / 100,
    riderDeliveryEarning: Math.round(riderDeliveryEarning * 100) / 100,
    customerCodAmount: Math.round(customerTotal * 100) / 100,
    byPartner
  };
}

/**
 * Common Date Filter Options for Financial Dashboards
 */
export const FINANCIAL_DATE_FILTER_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom Range' },
  { id: 'all', label: 'All Time' }
];
