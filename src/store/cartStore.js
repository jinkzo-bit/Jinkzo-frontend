import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

import { API_BASE } from '../config/api';

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
    isOpen: true
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

  addItem: (item, restaurant) => {
    const { items } = get();

    let updatedItems = [...items];
    const existingIndex = items.findIndex(i => String(i.menuItemId) === String(item._id));

    if (existingIndex > -1) {
      updatedItems[existingIndex].quantity += 1;
    } else {
      updatedItems.push({
        menuItemId: item._id,
        name: item.name,
        price: item.price,
        image: item.image,
        isVeg: item.isVeg,
        quantity: 1,
        restaurantId: restaurant._id,
        restaurantName: restaurant.name,
        restaurantDeliveryTime: restaurant.deliveryTime || 30,
        restaurantOffers: restaurant.offers || [],
        restaurantIsClosed: restaurant.isClosed || false
      });
    }

    set({ 
      items: updatedItems, 
      restaurant: restaurant 
    });
    
    get().showToast(`Added "${item.name}" to cart!`);
    return { success: true };
  },

  removeItem: (menuItemId) => {
    const { items } = get();
    const existingIndex = items.findIndex(i => String(i.menuItemId) === String(menuItemId));
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

  updateQuantity: (menuItemId, quantity) => {
    const { items } = get();
    let updatedItems = [...items];
    const index = updatedItems.findIndex(i => String(i.menuItemId) === String(menuItemId));
    if (index === -1) return;

    if (quantity <= 0) {
      const name = updatedItems[index].name;
      updatedItems.splice(index, 1);
      get().showToast(`Removed "${name}" from cart`, 'info');
    } else {
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
    
    // Group unique restaurants
    const uniqueRestaurants = {};
    items.forEach(item => {
      if (item.restaurantId && !uniqueRestaurants[item.restaurantId]) {
        uniqueRestaurants[item.restaurantId] = {
          name: item.restaurantName,
          deliveryTime: item.restaurantDeliveryTime || 30
        };
      }
    });

    // Calculate sum of delivery fees for each unique restaurant
    let deliveryFee = 0;
    const restaurantFees = {};
    
    // Use configured tiers, or default if distance unknown
    const fdp = platformSettings?.foodDeliveryPricing || {
      tier1: { maxDistanceKm: 2, fee: 20 },
      tier2: { maxDistanceKm: 3.5, fee: 25 },
      tier3: { maxDistanceKm: 6, fee: 40 },
      tier4: { maxDistanceKm: 12, fee: 80 },
      tier5: { maxDistanceKm: 20, fee: 120 }
    };

    Object.keys(uniqueRestaurants).forEach(rId => {
      let fee = fdp.tier1.fee; // Default preview
      if (distanceKm !== undefined && distanceKm !== null) {
        if (distanceKm <= fdp.tier1.maxDistanceKm) {
          fee = fdp.tier1.fee;
        } else if (distanceKm <= fdp.tier2.maxDistanceKm) {
          fee = fdp.tier2.fee;
        } else if (distanceKm <= fdp.tier3.maxDistanceKm) {
          fee = fdp.tier3.fee;
        } else if (distanceKm <= fdp.tier4.maxDistanceKm) {
          fee = fdp.tier4.fee;
        } else {
          fee = fdp.tier5.fee;
        }
      }
      restaurantFees[rId] = fee;
      deliveryFee += fee;
    });

    const platformFee = platformSettings ? (platformSettings.platformFee ?? 5) : 5;
    const taxes = 0; // Taxes (5% GST) removed as requested
    
    const activeSurcharges = [];
    let totalSurchargeFee = 0;
    if (platformSettings && platformSettings.surcharges) {
      const s = platformSettings.surcharges;
      if (s.rain?.enabled) { activeSurcharges.push({ name: 'Rain Charge', fee: s.rain.fee || 10 }); totalSurchargeFee += s.rain.fee || 10; }
      if (s.lateNight?.enabled) { activeSurcharges.push({ name: 'Late Night Charge', fee: s.lateNight.fee || 20 }); totalSurchargeFee += s.lateNight.fee || 20; }
      if (s.festival?.enabled) { activeSurcharges.push({ name: 'Festival Charge', fee: s.festival.fee || 15 }); totalSurchargeFee += s.festival.fee || 15; }
    }

    return { subtotal, deliveryFee, platformFee, taxes: 0, restaurantFees, activeSurcharges, totalSurchargeFee };
  },

  getCalculations: (distanceKm = null) => {
    const { subtotal, deliveryFee, platformFee, restaurantFees, activeSurcharges, totalSurchargeFee } = get().getCalculationsWithoutPromo(distanceKm);
    const { promoDiscount } = get();

    const total = Math.max(0, subtotal + deliveryFee + platformFee + totalSurchargeFee - promoDiscount);

    return {
      subtotal,
      deliveryFee,
      platformFee,
      taxes: 0,
      promoDiscount,
      total,
      restaurantFees,
      activeSurcharges,
      totalSurchargeFee
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
