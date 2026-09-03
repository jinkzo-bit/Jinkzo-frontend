import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, Tag, Percent, ArrowRight, ShieldCheck, AlertCircle, UtensilsCrossed, ChevronUp, FileText, Store } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/languageStore';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';
import VegBadge from '../components/VegBadge';

// ── Category Metadata & Normalization Helper ─────────────────────────────────
export const CATEGORY_META = {
  food: { label: 'FOOD', icon: '🍽️', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200' },
  grocery: { label: 'GROCERY', icon: '🛒', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  meat: { label: 'MEAT', icon: '🥩', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
  bakery_beverages: { label: 'BAKERY & BEVERAGES', icon: '🥐', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  veg_fruits: { label: 'VEG & FRUITS', icon: '🥦', badgeClass: 'bg-green-50 text-green-700 border-green-200' },
};

export const normalizeCategory = (cat, service) => {
  const val = String(cat || service || '').toLowerCase().trim().replace(/[\s\-_&]+/g, '_');
  if (val.includes('grocery') || val.includes('groceries') || val.includes('atta') || val.includes('oil') || val.includes('masala')) return 'grocery';
  if (val.includes('meat') || val.includes('chicken') || val.includes('mutton') || val.includes('fish') || val.includes('non_veg') || val.includes('nonveg') || val.includes('seafood')) return 'meat';
  if (val.includes('veg_fruits') || val.includes('veg_and_fruits') || val.includes('fruits_vegetables') || val.includes('fruits') || val.includes('vegetables') || val.includes('vegetable') || val.includes('fruit')) return 'veg_fruits';
  if (val.includes('bakery_beverages') || val.includes('bakery') || val.includes('beverage') || val.includes('cool_hot') || val.includes('hot_cool') || val.includes('cake') || val.includes('sweet') || val.includes('drink')) return 'bakery_beverages';
  return 'food';
};

// ── Reliable source classification helper ──────────────────────────────────────
export const getCartItemSource = (item, globalRestaurant = null) => {
  const normCat = normalizeCategory(item.category, item.service);
  const isCatalog =
    item.itemModel === 'CatalogItem' ||
    Boolean(item.supplierId) ||
    Boolean(item.supplier) ||
    (normCat !== 'food' && item.itemModel !== 'MenuItem');

  const catMeta = CATEGORY_META[normCat] || CATEGORY_META.food;

  if (isCatalog) {
    const sId = item.supplierId ? String(item.supplierId) : (item.supplier?._id ? String(item.supplier._id) : (item.category ? `supplier_${normCat}` : 'supplier_default'));
    const sName = item.supplierName || item.supplier?.name || (item.supplier && typeof item.supplier === 'string' ? item.supplier : null) || `${catMeta.label} STORE`;
    const sAddr = item.supplierAddress || item.supplier?.address || '';
    const sLat = item.supplierLatitude ?? item.supplier?.latitude ?? null;
    const sLng = item.supplierLongitude ?? item.supplier?.longitude ?? null;
    
    return {
      sourceType: 'supplier',
      sourceKey: `supplier:${sId}`,
      sourceId: sId,
      sourceName: sName,
      categoryKey: normCat,
      categoryLabel: catMeta.label,
      categoryIcon: catMeta.icon,
      categoryBadge: catMeta.badgeClass,
      address: sAddr,
      latitude: sLat,
      longitude: sLng,
      image: item.image || '',
      isClosed: false
    };
  }

  // Food / Restaurant
  const rId = item.restaurantId ? String(item.restaurantId) : (globalRestaurant?._id ? String(globalRestaurant._id) : 'restaurant_default');
  const rName = item.restaurantName || (item.restaurant && item.restaurant.name) || (globalRestaurant && globalRestaurant.name) || 'Restaurant';
  const rAddr = item.restaurantAddress || item.restaurant?.address || (globalRestaurant && globalRestaurant.address) || '';
  const rLat = item.restaurantLatitude ?? item.restaurant?.lat ?? (globalRestaurant && globalRestaurant.lat) ?? null;
  const rLng = item.restaurantLongitude ?? item.restaurant?.lng ?? (globalRestaurant && globalRestaurant.lng) ?? null;

  return {
    sourceType: 'restaurant',
    sourceKey: `restaurant:${rId}`,
    sourceId: rId,
    sourceName: rName,
    categoryKey: 'food',
    categoryLabel: CATEGORY_META.food.label,
    categoryIcon: CATEGORY_META.food.icon,
    categoryBadge: CATEGORY_META.food.badgeClass,
    address: rAddr,
    latitude: rLat,
    longitude: rLng,
    image: item.restaurantImage || (item.restaurant && (item.restaurant.image || item.restaurant.logo)) || (globalRestaurant && (globalRestaurant.image || globalRestaurant.logo)) || '',
    isClosed: item.restaurantIsClosed || (globalRestaurant && globalRestaurant.isClosed) || false
  };
};

export default function Cart() {
  const { items, restaurant, promoCode, promoDiscount, updateQuantity, removeItem, clearCart, applyPromo, removePromo, getCalculations, fetchPlatformSettings, platformSettings } = useCartStore();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlatformSettings();
  }, []);

  const {
    subtotal,
    baseFoodDeliveryFee,
    foodHotelChangeFee,
    foodHotelChangeFeeRate,
    foodExtraItemCharge,
    selectedHotelsCount,
    deliveryFee,
    platformFee,
    total,
    activeSurcharges
  } = getCalculations();

  // Group items by authoritative source: restaurant:${restaurantId} or supplier:${supplierId}
  const groupedItems = items.reduce((acc, item) => {
    const source = getCartItemSource(item, restaurant);
    const key = source.sourceKey;
    if (!acc[key]) {
      acc[key] = {
        sourceKey: key,
        sourceType: source.sourceType, // 'restaurant' | 'supplier'
        sourceId: source.sourceId,
        sourceName: source.sourceName,
        categoryKey: source.categoryKey,
        categoryLabel: source.categoryLabel,
        categoryIcon: source.categoryIcon,
        categoryBadge: source.categoryBadge,
        address: source.address,
        latitude: source.latitude,
        longitude: source.longitude,
        sourceImage: source.image,
        isClosed: source.isClosed,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const groupedList = Object.values(groupedItems).map(group => {
    const groupSubtotal = group.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const groupItemsCount = group.items.reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0);
    const isAllVeg = group.items.every(i => i.isVeg === true);
    return {
      ...group,
      subtotal: groupSubtotal,
      itemsCount: groupItemsCount,
      isAllVeg
    };
  });

  const closedRestaurants = groupedList.filter(g => g.sourceType === 'restaurant' && g.isClosed);
  const isAnyClosed = closedRestaurants.length > 0;

  const restaurantGroups = groupedList.filter(g => g.sourceType === 'restaurant');
  const supplierGroups = groupedList.filter(g => g.sourceType === 'supplier');

  const handlePromoApply = (e) => {
    e.preventDefault();
    setPromoError('');
    if (!promoInput.trim()) return;

    const result = applyPromo(promoInput);
    if (!result.success) {
      setPromoError(result.message);
    } else {
      setPromoInput('');
    }
  };

  const handleCheckout = () => {
    if (!user) {
      navigate('/login?redirect=checkout');
    } else {
      navigate('/checkout');
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center py-20 px-4 gap-4 animate-fade-in pb-24">
        <div className="w-18 h-18 rounded-full bg-violet-50 text-primary flex items-center justify-center mb-2 animate-bounce">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <h3 className="font-display font-extrabold text-xl text-main">{t('cart.emptyTitle', 'Your cart is empty')}</h3>
        <p className="text-xs text-muted max-w-xs leading-relaxed font-medium">
          {t('cart.emptyDesc', "Looks like you haven't added anything to your cart yet. Go ahead and explore our top cuisines!")}
        </p>
        <Link
          to="/restaurants"
          className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md transition-colors mt-2"
        >
          {t('cart.browseRestaurants', 'Browse Restaurants')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 pb-32 animate-fade-in flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-100/70 text-primary flex items-center justify-center flex-shrink-0">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-black text-xl md:text-2xl text-main tracking-tight">
              {t('cart.title', 'Order Cart')}
            </h1>
            <p className="text-xs text-muted font-medium mt-0.5">
              {items.length} {items.length === 1 ? 'item' : 'items'} from {groupedList.length} {groupedList.length === 1 ? 'pickup source' : 'pickup sources'}
            </p>
          </div>
        </div>

        <button
          onClick={clearCart}
          className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100/70 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>{t('cart.clearCart', 'Clear Cart')}</span>
        </button>
      </div>

      {/* Temporarily Closed Alert */}
      {isAnyClosed && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-3xl flex gap-3 text-xs animate-fade-in shadow-2xs">
          <AlertCircle className="w-5.5 h-5.5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-display font-extrabold uppercase tracking-wider text-red-800 text-sm">{t('restaurant.temporarilyClosed', 'Hotel Temporarily Closed')}</h5>
            <p className="mt-1 leading-relaxed font-semibold">
              The following restaurant(s) in your cart are currently closed and not accepting orders:
            </p>
            <ul className="list-disc list-inside mt-1 font-bold">
              {closedRestaurants.map(r => (
                <li key={r.sourceKey}>{r.sourceName}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-red-700 font-semibold">
              Please remove items from these kitchens or clear your cart to proceed to checkout.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Source-Wise Order Cards (Restaurants & Suppliers) */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {groupedList.map((group) => (
            <div key={group.sourceKey} className="bg-surface rounded-3xl border border-line shadow-2xs overflow-hidden p-5 flex flex-col gap-4 transition-all">
              {/* Card Header: 1. CATEGORY -> 2. RELATED RESTAURANT / SUPPLIER */}
              <div className="flex items-center justify-between border-b border-line pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl border border-line bg-base flex items-center justify-center font-black text-lg flex-shrink-0 shadow-2xs overflow-hidden">
                    {group.sourceType === 'restaurant' && group.sourceImage ? (
                      <img
                        src={getImageUrl(group.sourceImage, 'restaurant')}
                        alt={group.sourceName}
                        onError={(e) => handleImageError(e, 'restaurant')}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{group.categoryIcon || '🏪'}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {/* 1. CATEGORY */}
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted flex items-center gap-1">
                      <span>{group.categoryIcon || '🏪'}</span>
                      <span>{group.categoryLabel || 'CATEGORY'}</span>
                    </span>
                    {/* 2. RELATED RESTAURANT / SUPPLIER */}
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-black text-sm md:text-base tracking-tight uppercase truncate">
                        <span className="text-gray-600 dark:text-gray-300 font-bold">From: </span>
                        <span className="text-gray-900 dark:text-white font-extrabold">{group.sourceName}</span>
                      </h3>
                      {group.sourceType === 'restaurant' && (
                        group.isAllVeg ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Veg
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Non Veg
                          </span>
                        )
                      )}
                      {group.isClosed && (
                        <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded">
                          {t('restaurant.temporarilyClosed', 'Temporarily Closed')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-primary bg-violet-50 border border-violet-100 px-3 py-1 rounded-full flex-shrink-0">
                    {group.itemsCount} {group.itemsCount === 1 ? 'Item' : 'Items'}
                  </span>
                  <ChevronUp className="w-4 h-4 text-muted" />
                </div>
              </div>

              {/* Items List in Card */}
              <div className="flex flex-col divide-y divide-gray-100">
                {group.items.map((item) => (
                  <div key={item.cartKey || `${item.menuItemId}_${item.unit || ''}`} className="py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 max-w-[65%]">
                      <img
                        src={getImageUrl(item.image, 'food')}
                        alt={item.name}
                        onError={(e) => handleImageError(e, 'food')}
                        className="w-16 h-16 md:w-18 md:h-18 object-cover rounded-2xl bg-base flex-shrink-0 border border-line"
                      />
                      <div className="flex flex-col gap-0.5">
                        <h4 className="font-display font-bold text-sm md:text-base text-gray-900 dark:text-white line-clamp-1">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                            Qty: {item.quantity}
                          </span>
                          {item.unit ? (
                            <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                              {item.unit}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs md:text-sm font-bold text-gray-900 dark:text-white">
                        ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                      </span>
                      <div className="flex items-center bg-base border border-line-strong rounded-xl overflow-hidden h-8">
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity - 1, item.unit)}
                          className="px-2.5 hover:bg-gray-100 text-muted hover:text-main font-bold transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-gray-900 dark:text-white min-w-[20px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity + 1, item.unit)}
                          className="px-2.5 hover:bg-gray-100 text-muted hover:text-main font-bold transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Zero Contact Delivery Banner */}
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3.5 text-emerald-900 shadow-2xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-emerald-900">{t('cart.zeroContactDelivery', 'Zero Contact Delivery')}</h5>
              <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed font-medium">
                Our delivery partner will leave your order at your doorstep securely. Standard sanitation guidelines followed.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Promo & Bill Details */}
        <div className="flex flex-col gap-4 sticky top-24">
          {/* Promo Card */}
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-3">
            <h3 className="font-display font-bold text-sm text-main flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <span>{t('cart.applyPromo', 'Apply Promo Code')}</span>
            </h3>

            {promoCode ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-emerald-700" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800">{promoCode} Applied</p>
                    <p className="text-[10px] text-emerald-600 font-medium">₹{promoDiscount} discount saved on this order</p>
                  </div>
                </div>
                <button
                  onClick={removePromo}
                  className="text-xs text-red-500 font-bold hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handlePromoApply} className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder={t('cart.enterPromo', 'Enter coupon code (e.g. QUICK20)')}
                  className="flex-1 bg-base border border-line rounded-xl px-3 py-2 text-xs font-bold text-main uppercase focus:outline-none focus:border-primary tracking-wider"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  {t('cart.apply', 'Apply')}
                </button>
              </form>
            )}

            {promoError && (
              <p className="text-xs text-red-555 font-medium flex items-center gap-1 animate-shake">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span>{promoError}</span>
              </p>
            )}

            {!promoCode && (
              <div className="text-[10px] text-muted mt-0.5 leading-relaxed font-medium px-1">
                Use <strong className="text-main">WELCOME50</strong> (flat ₹50 off on orders &gt; ₹200) or <strong className="text-main">QUICK20</strong> (20% off on orders &gt; ₹400).
              </div>
            )}
          </div>

          {/* Bill Details Card */}
          <div className="bg-surface rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-4">
            <h3 className="font-display font-bold text-sm text-main border-b border-line pb-2.5 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>Bill Details</span>
            </h3>

            {/* Subsection 1: Items from Restaurants */}
            {restaurantGroups.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <h4 className="text-[11px] font-extrabold text-primary uppercase tracking-wider">
                  Items from Restaurants
                </h4>
                <div className="flex flex-col gap-2.5">
                  {restaurantGroups.map((g) => (
                    <div key={g.sourceKey} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        {g.sourceImage ? (
                          <img
                            src={getImageUrl(g.sourceImage, 'restaurant')}
                            alt={g.sourceName}
                            onError={(e) => handleImageError(e, 'restaurant')}
                            className="w-7 h-7 rounded-lg object-cover bg-base border border-line flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-violet-50 text-primary border border-line flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase">
                            {g.sourceName.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold text-main uppercase tracking-tight line-clamp-1">{g.sourceName}</span>
                          <span className="text-[10px] text-muted font-medium">{g.itemsCount} {g.itemsCount === 1 ? 'Item' : 'Items'}</span>
                        </div>
                      </div>
                      <span className="text-main font-bold">₹{g.subtotal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subsection 2: Items from Suppliers */}
            {supplierGroups.length > 0 && (
              <div className="flex flex-col gap-2.5 border-t border-line pt-2.5">
                <h4 className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider">
                  Items from Suppliers
                </h4>
                <div className="flex flex-col gap-2.5">
                  {supplierGroups.map((g) => (
                    <div key={g.sourceKey} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          🏪
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-main uppercase tracking-tight line-clamp-1">{g.sourceName}</span>
                          <span className="text-[10px] text-muted font-medium">{g.itemsCount} {g.itemsCount === 1 ? 'Item' : 'Items'}</span>
                        </div>
                      </div>
                      <span className="text-main font-bold">₹{g.subtotal}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-line pt-2.5 flex items-center justify-between text-xs font-bold text-main">
              <span>Subtotal (Items Total)</span>
              <span>₹{subtotal}</span>
            </div>

            {/* Subsection 3: Delivery & Other Charges */}
            <div className="flex flex-col gap-2.5 border-t border-line pt-3">
              <h4 className="text-[11px] font-extrabold text-primary uppercase tracking-wider">
                Delivery & Other Charges
              </h4>
              
              <div className="flex flex-col gap-2 text-xs text-muted font-medium">
                {selectedHotelsCount >= 1 && (
                  <div className="flex items-center justify-between">
                    <span>First Hotel / Store Delivery Fee</span>
                    <span className="text-main font-bold">+₹{baseFoodDeliveryFee}</span>
                  </div>
                )}
                {selectedHotelsCount >= 2 && (
                  <div className="flex items-center justify-between">
                    <span>Second Store / Hotel Delivery Fee</span>
                    <span className="text-main font-bold">+₹{foodHotelChangeFeeRate || 15}</span>
                  </div>
                )}
                {selectedHotelsCount >= 3 && (
                  <div className="flex items-center justify-between">
                    <span>Third Store / Hotel Delivery Fee</span>
                    <span className="text-main font-bold">+₹{foodHotelChangeFeeRate || 15}</span>
                  </div>
                )}
                {selectedHotelsCount > 3 && Array.from({ length: selectedHotelsCount - 3 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span>Store / Hotel {idx + 4} Delivery Fee</span>
                    <span className="text-main font-bold">+₹{foodHotelChangeFeeRate || 15}</span>
                  </div>
                ))}
                {foodExtraItemCharge > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Extra Item Charge</span>
                    <span className="text-main font-bold">+₹{foodExtraItemCharge}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between border-t border-b border-line py-1.5 font-semibold text-main">
                  <span>Total Delivery Fees</span>
                  <span className="font-bold">₹{deliveryFee}</span>
                </div>

                {activeSurcharges && activeSurcharges.map((sc, idx) => (
                  <div key={idx} className="flex items-center justify-between font-semibold">
                    <span>{sc.name}</span>
                    <span className="text-main font-bold">+₹{sc.fee}</span>
                  </div>
                ))}
                {platformFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span>{t('cart.platformFee', 'Platform Fee')}</span>
                    <span className="text-main font-bold">+₹{platformFee}</span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg">
                    <span>{t('cart.promoDiscount', 'Promo Discount')}</span>
                    <span>-₹{promoDiscount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Total Payable */}
            <div className="border-t border-line pt-3.5 flex items-center justify-between">
              <span className="font-display font-extrabold text-base text-main">Total Payable</span>
              <span className="font-display font-black text-xl text-primary">₹{total}</span>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={handleCheckout}
              disabled={isAnyClosed}
              className={`w-full py-4 rounded-2xl font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isAnyClosed
                  ? 'bg-gray-200 text-muted cursor-not-allowed shadow-none'
                  : 'bg-primary hover:bg-primary-hover text-white shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0'
              }`}
            >
              <span>{user ? t('cart.proceedToCheckout', 'Proceed to Checkout') : t('cart.loginToCheckout', 'Login to Checkout')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
