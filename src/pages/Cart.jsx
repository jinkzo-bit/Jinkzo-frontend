import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, Tag, Percent, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
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
    foodExtraItemCharge,
    deliveryFee,
    platformFee,
    total,
    activeSurcharges
  } = getCalculations();

  // Group items by restaurant
  const groupedItems = items.reduce((acc, item) => {
    const rId = item.restaurantId || 'unknown';
    if (!acc[rId]) {
      acc[rId] = {
        restaurantId: rId,
        restaurantName: item.restaurantName || 'Unknown Restaurant',
        isClosed: item.restaurantIsClosed || false,
        items: []
      };
    }
    acc[rId].items.push(item);
    return acc;
  }, {});

  const groupedList = Object.values(groupedItems);
  const uniqueRestaurantNames = Array.from(new Set(items.map(item => item.restaurantName).filter(Boolean)));
  const restaurantNameText = uniqueRestaurantNames.length > 0 ? uniqueRestaurantNames.join(' & ') : (restaurant?.name || '');

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
      // Redirect to login with redirect flag
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
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-main leading-tight">
            {t('cart.title', 'Checkout Cart')}
          </h1>
          <p className="text-xs text-muted font-medium">
            {t('cart.orderingFrom', 'Ordering from')} <span className="text-primary font-bold">{restaurantNameText}</span>
          </p>
        </div>
        <button
          onClick={clearCart}
          className="flex items-center gap-1 text-xs text-muted hover:text-red-500 font-semibold cursor-pointer transition-colors"
        >
          <Trash2 className="w-4 h-4" />
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
        {/* Cart items list */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {groupedList.map((group) => (
            <div key={group.restaurantId} className="bg-surface rounded-2xl border border-line shadow-2xs overflow-hidden">
              <div className="bg-base/50 px-4 py-3 border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold text-xs tracking-wide uppercase text-muted">{group.restaurantName}</span>
                  {group.isClosed && (
                    <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100">
                      {t('restaurant.temporarilyClosed', 'Temporarily Closed')}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted font-semibold bg-surface border border-gray-150 px-2 py-0.5 rounded-md">
                  {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <div key={item.menuItemId} className="p-4 flex items-center justify-between gap-4 hover:bg-base/20 transition-colors">
                    <div className="flex items-center gap-3.5 max-w-[65%]">
                      <img
                        src={getImageUrl(item.image, 'food')}
                        alt={item.name}
                        onError={(e) => handleImageError(e, 'food')}
                        className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-xl bg-base flex-shrink-0"
                      />
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <VegBadge isVeg={item.isVeg} size="xs" />
                          <h3 className="font-display font-semibold text-sm md:text-base text-main line-clamp-1">
                            {item.name}
                          </h3>
                        </div>
                        <p className="text-xs font-bold text-main">₹{item.price}</p>
                      </div>
                    </div>

                    {/* Quantity Control block */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center bg-base border border-line-strong rounded-lg overflow-hidden h-8.5">
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                          className="px-2 hover:bg-gray-100 text-muted font-bold transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-main">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                          className="px-2 hover:bg-gray-100 text-muted font-bold transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <p className="text-xs md:text-sm font-bold text-main min-w-[50px] text-right">
                        ₹{item.price * item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Tips / Safety Badge */}
          <div className="bg-green-50/50 border border-green-100 rounded-2xl p-4 flex gap-3 text-green-800">
            <ShieldCheck className="w-5 h-5 text-green-700 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-xs text-green-800">{t('cart.zeroContactDelivery', 'Zero Contact Delivery')}</h5>
              <p className="text-[10px] text-green-700 mt-0.5 leading-relaxed font-medium">
                Our delivery partner will leave your order at your doorstep securely. Standard sanitation guidelines followed.
              </p>
            </div>
          </div>
        </div>

        {/* Invoice pricing panel */}
        <div className="flex flex-col gap-4 sticky top-24">
          {/* Promo panel */}
          <div className="bg-surface rounded-2xl p-4 border border-line shadow-2xs flex flex-col gap-3">
            <h3 className="font-display font-semibold text-sm text-main flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-primary" />
              <span>{t('cart.applyPromo', 'Apply Promo Code')}</span>
            </h3>

            {promoCode ? (
              <div className="bg-green-50 border border-green-100 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-green-700" />
                  <div>
                    <p className="text-xs font-bold text-green-800">{promoCode} Applied</p>
                    <p className="text-[9px] text-green-700">Saved ₹{promoDiscount} on this order</p>
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
                  placeholder="WELCOME50 or QUICK20"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-semibold text-main outline-none flex-grow placeholder:text-muted uppercase"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {t('cart.apply', 'Apply')}
                </button>
              </form>
            )}

            {promoError && <p className="text-[10px] font-bold text-red-500 px-1">{promoError}</p>}
            {!promoCode && (
              <div className="text-[9px] text-muted mt-0.5 leading-relaxed font-medium px-1">
                Use <strong className="text-muted">WELCOME50</strong> (flat ₹50 off on orders &gt; ₹200) or <strong className="text-muted">QUICK20</strong> (20% off on orders &gt; ₹400).
              </div>
            )}
          </div>

          {/* Pricing Invoice card */}
          <div className="bg-surface rounded-2xl p-4 border border-line shadow-2xs flex flex-col gap-3.5">
            <h3 className="font-display font-semibold text-sm text-main border-b border-line pb-2">
              {t('cart.billSummary', 'Bill Summary')}
            </h3>

            <div className="flex flex-col gap-2.5 text-xs text-muted font-medium">
              <div className="flex items-center justify-between">
                <span>{t('cart.itemSubtotal', 'Food Items Subtotal')}</span>
                <span className="text-main font-bold">₹{subtotal}</span>
              </div>
              {foodHotelChangeFee > 0 && (
                <div className="flex items-center justify-between">
                  <span>Food Hotel Change Fee</span>
                  <span className="text-main font-bold">+₹{foodHotelChangeFee}</span>
                </div>
              )}
              {foodExtraItemCharge > 0 && (
                <div className="flex items-center justify-between">
                  <span>Food Extra Item Charge</span>
                  <span className="text-main font-bold">+₹{foodExtraItemCharge}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-b border-line py-1.5 font-semibold">
                <span>{t('cart.deliveryFee', 'Total Food Delivery Fee')}</span>
                <span className="text-main font-bold">₹{deliveryFee}</span>
              </div>
              {activeSurcharges && activeSurcharges.map((sc, idx) => (
                <div key={idx} className="flex items-center justify-between font-semibold">
                  <span>{sc.name}</span>
                  <span className="text-main font-bold">₹{sc.fee}</span>
                </div>
              ))}
              {platformFee > 0 && (
                <div className="flex items-center justify-between font-medium">
                  <span>{t('cart.platformFee', 'Platform Fee')}</span>
                  <span className="text-main font-bold">₹{platformFee}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex items-center justify-between text-green-700 font-bold bg-green-50 p-1.5 rounded-lg">
                  <span>{t('cart.promoDiscount', 'Promo Discount')}</span>
                  <span>-₹{promoDiscount}</span>
                </div>
              )}
            </div>

            <div className="border-t border-line pt-3 flex items-center justify-between text-sm font-bold text-main">
              <span>{t('cart.grandTotal', 'Grand Total')}</span>
              <span className="text-primary text-base">₹{total.toFixed(2)}</span>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={handleCheckout}
              disabled={isAnyClosed}
              className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-violet-500/10 hover:shadow-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2 disabled:bg-gray-100 disabled:text-muted disabled:shadow-none disabled:cursor-not-allowed"
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
