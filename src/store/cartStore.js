import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

import { API_BASE } from '../config/api';
import { checkRestaurantOpenStatus, checkItemAvailability, normalizeMenuItem } from '../utils/timingUtils';

// NC16 FIX: Wrap store with persist middleware so cart survives page refreshes.
// Only cart data is persisted — toasts and platformSettings are always re-fetched fresh.
export const useCartStore = create(
  persist(
    (set, get) => ({
  items: [],
  restaurant: null, // Only one restaurant order at a time
  promoCode: null,
  promoDiscount: 0,
  cashbackAmount: 0,
  toasts: [],
  platformSettings: {
    commissionPercent: 15,
    deliveryBaseFee: 40,
    platformFee: 5,
    taxPercent: 0,
    isOpen: true,
    globalServiceRadiusKm: 5,
    allSectionsMaxItems: 10,
    sectionChangeFee: 15,
    foodBaseItemLimit: 4,
    foodExtraItemLimit: 3,
    foodExtraItemCharge: 15,
    foodMaxHotels: 3,
    foodHotelChangeFee: 15,
    groceryMaxItems: 10,
    vegetableFruitMaxItems: 5,
    vegetableFruitMaxWeightKg: 5,
    meatMaxItems: 5,
    meatMaxWeightKg: 5,
    hotCoolMaxItems: 5
  },

  showToast: (message, type = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    set(state => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    
    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      set(state => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    }, 3000);
  },

  addItem: (item, restaurant = null) => {
    const { items, platformSettings } = get();

    const isCatalog = (item.service && item.service !== 'food') || 
      (item.category && ['grocery', 'meat', 'veg_fruits', 'bakery_beverages', 'cool_hot', 'hot_cool'].includes(item.category.toLowerCase())) ||
      Boolean(item.supplierId) ||
      item.itemModel === 'CatalogItem';

    if (isCatalog) {
      if (item.isAvailable === false) {
        get().showToast('This item is currently out of stock.', 'error');
        return { success: false, message: 'This item is currently out of stock.' };
      }
    } else {
      // 0. Check food restaurant open status and item custom availability
      const timingStatus = checkRestaurantOpenStatus(restaurant?.openingHours, restaurant?.isClosed);
      if (!timingStatus.isOpen) {
        get().showToast('This restaurant is currently closed.', 'error');
        return { success: false, message: 'This restaurant is currently closed.' };
      }

      const normItem = normalizeMenuItem(item);
      const itemStatus = checkItemAvailability(normItem, timingStatus.isOpen);
      if (!itemStatus.isAvailable) {
        get().showToast(itemStatus.message || 'This item is currently unavailable.', 'error');
        return { success: false, message: itemStatus.message || 'This item is currently unavailable.' };
      }

      // 1. Check food item limit
      const currentTotalItems = items.reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0);
      const maxFoodItems = (platformSettings?.foodBaseItemLimit ?? 4) + (platformSettings?.foodExtraItemLimit ?? 3);
      if (currentTotalItems + 1 > maxFoodItems) {
        get().showToast(`Maximum ${maxFoodItems} food items are allowed per order.`, 'error');
        return { success: false, message: `Maximum ${maxFoodItems} food items are allowed per order.` };
      }

      // 2. Check unique hotel limit
      const currentHotelIds = new Set(items.filter(i => !i.supplierId && i.restaurantId).map(i => String(i.restaurantId)));
      const isNewHotel = restaurant?._id && !currentHotelIds.has(String(restaurant._id));
      if (isNewHotel) {
        const maxHotels = platformSettings?.foodMaxHotels ?? 3;
        if (currentHotelIds.size >= maxHotels) {
          get().showToast(`You can order from a maximum of ${maxHotels} hotels per food order.`, 'error');
          return { success: false, message: `You can order from a maximum of ${maxHotels} hotels per food order.` };
        }
      }
    }

    let updatedItems = [...items];
    const itemUnit = item.unit ? String(item.unit).trim() : '';
    const itemKey = itemUnit ? `${item._id || item.id}_${itemUnit}` : String(item._id || item.id);

    const existingIndex = items.findIndex(i => {
      const iUnit = i.unit ? String(i.unit).trim() : '';
      const iKey = iUnit ? `${i.menuItemId}_${iUnit}` : String(i.menuItemId);
      return iKey === itemKey;
    });

    if (existingIndex > -1) {
      updatedItems[existingIndex].quantity += 1;
    } else {
      const supLat = item.supplierLatitude ?? item.supplier?.latitude ?? null;
      const supLng = item.supplierLongitude ?? item.supplier?.longitude ?? null;
      const supAddr = item.supplierAddress ?? item.supplier?.address ?? '';
      const supPhone = item.supplierPhone ?? item.supplier?.phone ?? '';

      updatedItems.push({
        cartKey: itemKey,
        menuItemId: item._id || item.id,
        name: item.name,
        price: item.price,
        image: item.image || '',
        isVeg: item.isVeg,
        unit: itemUnit,
        service: isCatalog ? (item.service || item.category || 'catalog') : 'food',
        category: item.category || '',
        itemModel: isCatalog ? 'CatalogItem' : 'MenuItem',
        supplierId: item.supplierId || item.supplier?._id || item.supplier?.id || null,
        supplierName: item.supplierName || item.supplier?.name || null,
        supplierAddress: supAddr,
        supplierLatitude: supLat,
        supplierLongitude: supLng,
        supplierPhone: supPhone,
        supplier: item.supplier || null,
        quantity: 1,
        restaurantId: isCatalog ? null : (restaurant?._id || item.restaurantId || null),
        restaurantName: isCatalog ? null : (restaurant?.name || item.restaurantName || null),
        restaurantImage: isCatalog ? null : (restaurant?.image || restaurant?.logo || item.image || ''),
        restaurantDeliveryTime: isCatalog ? null : (restaurant?.deliveryTime || 30),
        restaurantOffers: isCatalog ? [] : (restaurant?.offers || []),
        restaurantIsClosed: isCatalog ? false : (restaurant?.isClosed || false)
      });
    }

    set({ 
      items: updatedItems, 
      restaurant: restaurant || get().restaurant
    });
    
    get().showToast(`Added "${item.name}${itemUnit ? ` (${itemUnit})` : ''}" to cart!`);
    return { success: true };
  },

  removeItem: (menuItemId, unit = null) => {
    const { items } = get();
    const existingIndex = items.findIndex(i => {
      if (unit != null && unit !== '') {
        return String(i.menuItemId) === String(menuItemId) && (i.unit || '') === String(unit);
      }
      return String(i.menuItemId) === String(menuItemId);
    });
    if (existingIndex === -1) return;

    let updatedItems = [...items];
    const item = updatedItems[existingIndex];

    if (item.quantity > 1) {
      item.quantity -= 1;
      get().showToast(`Updated quantity of "${item.name}"`);
    } else {
      updatedItems.splice(existingIndex, 1);
      get().showToast(`Removed "${item.name}" from cart`, 'info');
    }

    set({ 
      items: updatedItems,
      restaurant: updatedItems.length === 0 ? null : get().restaurant,
      promoCode: updatedItems.length === 0 ? null : get().promoCode,
      promoDiscount: updatedItems.length === 0 ? 0 : get().promoDiscount,
      cashbackAmount: updatedItems.length === 0 ? 0 : get().cashbackAmount
    });
  },

  updateQuantity: (menuItemId, quantity, unit = null) => {
    const { items, platformSettings } = get();
    let updatedItems = [...items];
    const index = updatedItems.findIndex(i => {
      if (unit != null && unit !== '') {
        return String(i.menuItemId) === String(menuItemId) && (i.unit || '') === String(unit);
      }
      return String(i.menuItemId) === String(menuItemId);
    });
    if (index === -1) return;

    if (quantity <= 0) {
      const name = updatedItems[index].name;
      updatedItems.splice(index, 1);
      get().showToast(`Removed "${name}" from cart`, 'info');
    } else {
      const currentQty = updatedItems[index].quantity;
      if (quantity > currentQty) {
        const diff = quantity - currentQty;
        const currentTotalItems = items.reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0);
        const maxFoodItems = (platformSettings?.foodBaseItemLimit ?? 4) + (platformSettings?.foodExtraItemLimit ?? 3);
        if (currentTotalItems + diff > maxFoodItems) {
          get().showToast(`Maximum ${maxFoodItems} food items are allowed per order.`, 'error');
          return;
        }
      }
      updatedItems[index].quantity = quantity;
    }

    set({
      items: updatedItems,
      restaurant: updatedItems.length === 0 ? null : get().restaurant,
      promoCode: updatedItems.length === 0 ? null : get().promoCode,
      promoDiscount: updatedItems.length === 0 ? 0 : get().promoDiscount,
      cashbackAmount: updatedItems.length === 0 ? 0 : get().cashbackAmount
    });
  },

  clearCart: () => {
    set({
      items: [],
      restaurant: null,
      promoCode: null,
      promoDiscount: 0,
      cashbackAmount: 0
    });
  },

  applyPromo: (code) => {
    const { items } = get();
    if (items.length === 0) return { success: false, message: 'Cart is empty' };

    const calcs = get().getCalculationsWithoutPromo();
    const subtotal = calcs.subtotal;

    const normalizedCode = code.trim().toUpperCase();

    // Check if the user has already used this promo code
    const currentUser = useAuthStore.getState().user;
    if (currentUser && currentUser.usedPromos && currentUser.usedPromos.includes(normalizedCode)) {
      return { success: false, message: 'You have already used this promo code' };
    }

    // 1. Check global promo codes
    if (normalizedCode === 'WELCOME50') {
      if (subtotal < 200) {
        return { success: false, message: 'Minimum order amount for WELCOME50 is ₹200' };
      }
      set({ promoCode: 'WELCOME50', promoDiscount: 50 });
      get().showToast('Flat ₹50 discount applied!', 'success');
      return { success: true };
    } else if (normalizedCode === 'QUICK20') {
      if (subtotal < 400) {
        return { success: false, message: 'Minimum order amount for QUICK20 is ₹400' };
      }
      const discount = Math.round(subtotal * 0.20);
      set({ promoCode: 'QUICK20', promoDiscount: discount, cashbackAmount: 0 });
      get().showToast('20% discount applied!', 'success');
      return { success: true };
    } else if (normalizedCode === 'CASHBACK50') {
      if (subtotal < 200) {
        return { success: false, message: 'Minimum order amount for CASHBACK50 is ₹200' };
      }
      set({ promoCode: 'CASHBACK50', promoDiscount: 0, cashbackAmount: 50 });
      get().showToast('Promo applied! ₹50 Cashback will be added to your wallet upon successful checkout.', 'success');
      return { success: true };
    }

    // 2. Check restaurant-specific custom promo codes (scan unique restaurants in cart)
    let matchedOffer = null;
    let matchedRestaurantId = null;
    for (const item of items) {
      if (item.restaurantOffers && item.restaurantOffers.length > 0) {
        const found = item.restaurantOffers.find(o => o.code.toUpperCase() === normalizedCode && o.active);
        if (found) {
          matchedOffer = found;
          matchedRestaurantId = item.restaurantId;
          break;
        }
      }
    }

    if (matchedOffer) {
      const restaurantItems = items.filter(i => String(i.restaurantId) === String(matchedRestaurantId));
      const restaurantSubtotal = restaurantItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

      if (restaurantSubtotal < matchedOffer.minAmount) {
        return { success: false, message: `Minimum order amount for ${matchedOffer.code} is ₹${matchedOffer.minAmount} from its restaurant` };
      }

      if (matchedOffer.applicableItemId) {
        const itemInCart = items.find(i => String(i.menuItemId) === String(matchedOffer.applicableItemId));
        if (!itemInCart) {
          return { 
            success: false, 
            message: `This coupon is only applicable for "${matchedOffer.applicableItemName}". Add it to your cart to apply.` 
          };
        }

        const itemSubtotal = itemInCart.price * itemInCart.quantity;
        const discountAmount = Math.min(matchedOffer.discount, itemSubtotal);

        set({ promoCode: matchedOffer.code, promoDiscount: discountAmount, cashbackAmount: 0 });
        get().showToast(`Applied ${matchedOffer.code}! Saved ₹${discountAmount}`, 'success');
        return { success: true };
      } else {
        const discountAmount = Math.min(matchedOffer.discount, restaurantSubtotal);
        set({ promoCode: matchedOffer.code, promoDiscount: discountAmount, cashbackAmount: 0 });
        get().showToast(`Applied ${matchedOffer.code}! Saved ₹${discountAmount}`, 'success');
        return { success: true };
      }
    }

    return { success: false, message: 'Invalid promo code' };
  },

  removePromo: () => {
    set({ promoCode: null, promoDiscount: 0, cashbackAmount: 0 });
    get().showToast('Promo code removed', 'info');
  },

  fetchPlatformSettings: async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/platform-settings`);

      if (res.ok) {
        const data = await res.json();
        set({ platformSettings: data });
      }
    } catch (err) {
      console.error('Error fetching platform settings:', err);
    }
  },

  getCalculationsWithoutPromo: (distanceKm = null) => {
    const { items, platformSettings } = get();
    
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Group unique pickup sources (Restaurants + Catalog Suppliers)
    const uniquePickupSources = {};
    items.forEach(item => {
      if (item.supplierId) {
        const supKey = `supplier_${item.supplierId}`;
        if (!uniquePickupSources[supKey]) {
          uniquePickupSources[supKey] = {
            type: 'supplier',
            id: item.supplierId,
            name: item.supplierName || 'Store Pickup'
          };
        }
      } else if (item.restaurantId) {
        const restKey = `restaurant_${item.restaurantId}`;
        if (!uniquePickupSources[restKey]) {
          uniquePickupSources[restKey] = {
            type: 'restaurant',
            id: item.restaurantId,
            name: item.restaurantName || 'Restaurant',
            deliveryTime: item.restaurantDeliveryTime || 30
          };
        }
      }
    });

    const pickupKeys = Object.keys(uniquePickupSources);
    const totalPickupPointsCount = Math.max(items.length > 0 ? 1 : 0, pickupKeys.length);
    const selectedHotelsCount = totalPickupPointsCount;
    const totalFoodItemsCount = items.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
    
    // Base food delivery pricing tiers
    const fdp = platformSettings?.foodDeliveryPricing || {
      tier1: { maxDistanceKm: 2, fee: 20 },
      tier2: { maxDistanceKm: 3.5, fee: 25 },
      tier3: { maxDistanceKm: 6, fee: 40 },
      tier4: { maxDistanceKm: 12, fee: 80 },
      tier5: { maxDistanceKm: 20, fee: 120 }
    };

    // 1. FIRST PICKUP / BASE DELIVERY FEE
    let baseFoodDeliveryFee = 0;
    if (totalPickupPointsCount > 0) {
      let fee = fdp.tier1.fee;
      if (distanceKm !== undefined && distanceKm !== null) {
        if (distanceKm <= fdp.tier1.maxDistanceKm) { fee = fdp.tier1.fee; }
        else if (distanceKm <= fdp.tier2.maxDistanceKm) { fee = fdp.tier2.fee; }
        else if (distanceKm <= fdp.tier3.maxDistanceKm) { fee = fdp.tier3.fee; }
        else if (distanceKm <= fdp.tier4.maxDistanceKm) { fee = fdp.tier4.fee; }
        else { fee = fdp.tier5.fee; }
      }
      baseFoodDeliveryFee = fee;
    }

    // 2. ADDITIONAL PICKUP FEE (foodHotelChangeFee per extra hotel/store)
    const foodHotelChangeFeeRate = platformSettings?.foodHotelChangeFee ?? 15;
    const additionalHotelsCount = Math.max(0, totalPickupPointsCount - 1);
    const foodHotelChangeFeeTotal = additionalHotelsCount * foodHotelChangeFeeRate;

    // 3. EXTRA FOOD ITEM BLOCK FEE (ONE foodExtraItemCharge when totalFoodItems > foodBaseItemLimit)
    const foodBaseItemLimit = platformSettings?.foodBaseItemLimit ?? 4;
    const foodExtraItemLimit = platformSettings?.foodExtraItemLimit ?? 3;
    const foodExtraItemChargeRate = platformSettings?.foodExtraItemCharge ?? 15;
    const foodExtraItemChargeTotal = totalFoodItemsCount > foodBaseItemLimit ? foodExtraItemChargeRate : 0;

    // AUTHORITATIVE DELIVERY FEE
    const deliveryFee = totalPickupPointsCount === 0 ? 0 : (baseFoodDeliveryFee + foodHotelChangeFeeTotal + foodExtraItemChargeTotal);

    // Split order / per-restaurant fees mapping
    const restaurantFees = {};
    if (pickupKeys.length > 0) {
      restaurantFees[pickupKeys[0]] = baseFoodDeliveryFee + foodExtraItemChargeTotal;
      for (let i = 1; i < pickupKeys.length; i++) {
        restaurantFees[pickupKeys[i]] = foodHotelChangeFeeRate;
      }
    }

    const platformFee = platformSettings ? (platformSettings.platformFee ?? 5) : 5;
    const taxes = 0;
    
    const activeSurcharges = [];
    let totalSurchargeFee = 0;
    if (platformSettings && platformSettings.surcharges) {
      const s = platformSettings.surcharges;
      if (s.rain?.enabled) { activeSurcharges.push({ name: 'Rain Charge', fee: s.rain.fee || 10 }); totalSurchargeFee += s.rain.fee || 10; }
      if (s.lateNight?.enabled) { activeSurcharges.push({ name: 'Late Night Charge', fee: s.lateNight.fee || 20 }); totalSurchargeFee += s.lateNight.fee || 20; }
      if (s.festival?.enabled) { activeSurcharges.push({ name: 'Festival Charge', fee: s.festival.fee || 15 }); totalSurchargeFee += s.festival.fee || 15; }
    }

    return {
      subtotal,
      baseFoodDeliveryFee,
      foodHotelChangeFee: foodHotelChangeFeeTotal,
      foodHotelChangeFeeRate,
      foodExtraItemCharge: foodExtraItemChargeTotal,
      deliveryFee,
      selectedHotelsCount,
      totalPickupPointsCount,
      totalFoodItemsCount,
      foodBaseItemLimit,
      foodExtraItemLimit,
      foodMaxHotels: platformSettings?.foodMaxHotels ?? 3,
      platformFee,
      taxes: 0,
      restaurantFees,
      uniquePickupSources,
      activeSurcharges,
      totalSurchargeFee,
      groupingApplied: false
    };
  },

  getCalculations: (distanceKm = null) => {
    const calcs = get().getCalculationsWithoutPromo(distanceKm);
    const { subtotal, deliveryFee, platformFee, totalSurchargeFee } = calcs;
    const { promoDiscount } = get();

    const total = Math.max(0, subtotal + deliveryFee + platformFee + totalSurchargeFee - promoDiscount);

    return {
      ...calcs,
      promoDiscount,
      total
    };
  }
}),
{
  name: 'corior-cart',          // localStorage key
  partialize: (state) => ({
    // Only persist cart data — exclude ephemeral UI state
    items:         state.items,
    restaurant:    state.restaurant,
    promoCode:     state.promoCode,
    promoDiscount: state.promoDiscount,
    cashbackAmount: state.cashbackAmount,
    // toasts and platformSettings intentionally excluded:
    // toasts   → should not outlive the session
    // platformSettings → always re-fetched from API on app boot
  })
}
  )
);
