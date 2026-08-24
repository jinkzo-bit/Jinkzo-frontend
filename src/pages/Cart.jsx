import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, Tag, Percent, ArrowRight, ShieldCheck, AlertCircle, UtensilsCrossed, ChevronUp, FileText } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../store/languageStore';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';
import VegBadge from '../components/VegBadge';

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

  // Group items by restaurant with calculated subtotal and counts
  const groupedItems = items.reduce((acc, item) => {
    const rId = item.restaurantId || 'unknown';
    if (!acc[rId]) {
      acc[rId] = {
        restaurantId: rId,
        restaurantName: item.restaurantName || 'Unknown Restaurant',
        restaurantImage: item.restaurantImage || '',
        isClosed: item.restaurantIsClosed || false,
        items: []
      };
    }
    acc[rId].items.push(item);
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

  const closedRestaurants = groupedList.filter(g => g.isClosed);
  const isAnyClosed = closedRestaurants.length > 0;

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
            <h1 className="font-display font-extrabold text-2xl text-main leading-tight">
              Your Order
            </h1>
            <p className="text-xs text-muted font-medium mt-0.5">
              Review your items and order summary
            </p>
          </div>
        </div>
        <button
          onClick={clearCart}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-red-500 font-semibold cursor-pointer transition-colors px-3 py-1.5 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t('cart.clearCart', 'Clear Cart')}</span>
        </button>
      </div>

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
                <li key={r.restaurantId}>{r.restaurantName}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-red-700 font-medium font-semibold">
              Please remove items from these kitchens or clear your cart to proceed to checkout.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Restaurant-Wise Order Cards */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {groupedList.map((group) => (
            <div key={group.restaurantId} className="bg-surface rounded-3xl border border-line shadow-2xs overflow-hidden p-5 flex flex-col gap-4 transition-all">
              {/* Restaurant Header */}
              <div className="flex items-center justify-between border-b border-line pb-3.5">
                <div className="flex items-center gap-3">
                  {group.restaurantImage ? (
                    <img
                      src={getImageUrl(group.restaurantImage, 'restaurant')}
                      alt={group.restaurantName}
                      onError={(e) => handleImageError(e, 'restaurant')}
                      className="w-11 h-11 object-cover rounded-xl border border-line bg-base flex-shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl border border-line bg-violet-50 text-primary flex items-center justify-center font-black text-sm flex-shrink-0 uppercase">
                      {group.restaurantName.charAt(0)}
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display font-black text-sm md:text-base text-main tracking-tight uppercase">
                      {group.restaurantName}
                    </h3>
                    <div className="flex items-center gap-2">
                      {!group.items.some(i => i.service && i.service !== 'food') && (
                        group.isAllVeg ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Veg
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Non Veg
                          </span>
                        )
                      )}
                      {group.isClosed && (
                        <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                          {t('restaurant.temporarilyClosed', 'Temporarily Closed')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-primary bg-violet-50 border border-violet-100 px-3 py-1 rounded-full">
                    {group.itemsCount} {group.itemsCount === 1 ? 'Item' : 'Items'}
                  </span>
                  <ChevronUp className="w-4 h-4 text-muted" />
                </div>
              </div>

              {/* Items List in Restaurant Card */}
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
                        <h4 className="font-display font-bold text-sm md:text-base text-main line-clamp-1">
                          {item.name}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.unit ? (
                            <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                              {item.unit}
                            </span>
                          ) : (
                            <p className="text-[11px] text-muted font-medium">Serves 1</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className="text-xs md:text-sm font-bold text-main">
                        ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                      </span>
                      <div className="flex items-center bg-base border border-line-strong rounded-xl overflow-hidden h-8">
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity - 1, item.unit)}
                          className="px-2.5 hover:bg-gray-100 text-muted hover:text-main font-bold transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-main min-w-[20px] text-center">{item.quantity}</span>
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

              {/* Restaurant Card Footer: Item Total */}
              <div className="border-t border-dashed border-line pt-3 flex items-center justify-between">
                <span className="text-xs md:text-sm text-muted font-medium">
                  Item Total ({group.restaurantName})
                </span>
                <span className="text-sm md:text-base font-bold text-primary">
                  ₹{group.subtotal}
                </span>
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
                    <p className="text-[10px] text-emerald-700">Saved ₹{promoDiscount} on this order</p>
                  </div>
                </div>
                <button
                  onClick={removePromo}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer uppercase transition-colors"
                >
                  {t('cart.remove', 'Remove')}
                </button>
              </div>
            ) : (
              <form onSubmit={handlePromoApply} className="flex gap-2">
                <input
                  type="text"
                  placeholder="WELCOME50 OR QUICK20"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs font-semibold text-main outline-none flex-grow placeholder:text-muted uppercase"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {t('cart.apply', 'Apply')}
                </button>
              </form>
            )}

            {promoError && <p className="text-[10px] font-bold text-red-500 px-1">{promoError}</p>}
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
            <div className="flex flex-col gap-2.5">
              <h4 className="text-[11px] font-extrabold text-primary uppercase tracking-wider">
                Items from Restaurants
              </h4>
              <div className="flex flex-col gap-2.5">
                {groupedList.map((g) => (
                  <div key={g.restaurantId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      {g.restaurantImage ? (
                        <img
                          src={getImageUrl(g.restaurantImage, 'restaurant')}
                          alt={g.restaurantName}
                          onError={(e) => handleImageError(e, 'restaurant')}
                          className="w-7 h-7 rounded-lg object-cover bg-base border border-line flex-shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-violet-50 text-primary border border-line flex items-center justify-center font-bold text-xs flex-shrink-0 uppercase">
                          {g.restaurantName.charAt(0)}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-bold text-main uppercase tracking-tight line-clamp-1">{g.restaurantName}</span>
                        <span className="text-[10px] text-muted font-medium">{g.itemsCount} {g.itemsCount === 1 ? 'Item' : 'Items'}</span>
                      </div>
                    </div>
                    <span className="text-main font-bold">₹{g.subtotal}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-line pt-2.5 flex items-center justify-between text-xs font-bold text-main">
                <span>Subtotal (Items Total)</span>
                <span>₹{subtotal}</span>
              </div>
            </div>

            {/* Subsection 2: Delivery & Other Charges */}
            <div className="flex flex-col gap-2.5 border-t border-line pt-3">
              <h4 className="text-[11px] font-extrabold text-primary uppercase tracking-wider">
                Delivery & Other Charges
              </h4>
              
              <div className="flex flex-col gap-2 text-xs text-muted font-medium">
                {selectedHotelsCount >= 1 && (
                  <div className="flex items-center justify-between">
                    <span>First Hotel Delivery Fee</span>
                    <span className="text-main font-bold">+₹{baseFoodDeliveryFee}</span>
                  </div>
                )}
                {selectedHotelsCount >= 2 && (
                  <div className="flex items-center justify-between">
                    <span>Second Hotel Delivery Fee</span>
                    <span className="text-main font-bold">+₹{foodHotelChangeFeeRate || 15}</span>
                  </div>
                )}
                {selectedHotelsCount >= 3 && (
                  <div className="flex items-center justify-between">
                    <span>Third Hotel Delivery Fee</span>
                    <span className="text-main font-bold">+₹{foodHotelChangeFeeRate || 15}</span>
                  </div>
                )}
                {selectedHotelsCount > 3 && Array.from({ length: selectedHotelsCount - 3 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span>Hotel {idx + 4} Delivery Fee</span>
                    <span className="text-main font-bold">+₹{foodHotelChangeFeeRate || 15}</span>
                  </div>
                ))}
                {foodExtraItemCharge > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Food Extra Item Charge</span>
                    <span className="text-main font-bold">+₹{foodExtraItemCharge}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between border-t border-b border-line py-1.5 font-semibold text-main">
                  <span>Total Food Delivery Fees</span>
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

            {/* Proceed to Checkout CTA Button */}
            <button
              onClick={handleCheckout}
              disabled={isAnyClosed}
              className="w-full bg-primary hover:bg-primary-hover text-white text-xs md:text-sm font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-violet-500/10 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 disabled:bg-gray-100 disabled:text-muted disabled:shadow-none disabled:cursor-not-allowed"
            >
              <span>{isAnyClosed ? t('restaurant.closed', 'Restaurant Closed') : t('cart.proceedToCheckout', 'Proceed to Checkout')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
