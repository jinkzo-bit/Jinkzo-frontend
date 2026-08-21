import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Heart,
  ShoppingBag,
  ClipboardList,
  User,
  Plus,
  Minus,
  ChevronRight,
  X,
  Store,
  List,
  Tag,
  Shield,
  Bike,
  DollarSign,
  Clock,
  ShieldCheck,
  Pencil,
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useTranslation } from '../store/languageStore';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [showCartPopup, setShowCartPopup] = useState(false);
  const popupRef = useRef(null);

  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const restaurant = useCartStore((state) => state.restaurant);

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const isCartEmpty = totalQuantity === 0;

  // Check if current page is the Restaurant Partner context
  const isRestaurantPartner =
    location.pathname.startsWith('/restaurant-dashboard') ||
    location.pathname.startsWith('/my-restaurant') ||
    location.pathname.startsWith('/restaurant-partner');

  // Check if current page is the Delivery Partner context
  const isDeliveryPartner =
    location.pathname.startsWith('/delivery-dashboard') ||
    location.pathname.startsWith('/my-deliveries') ||
    location.pathname.startsWith('/delivery-partner');

  // Active check for customer routes
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setShowCartPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close popup on route change
  useEffect(() => {
    setShowCartPopup(false);
  }, [location.pathname]);

  // Handle Cart Button Click
  const handleCartClick = (e) => {
    if (isCartEmpty) {
      setShowCartPopup(false);
      navigate('/cart');
    } else {
      e.preventDefault();
      setShowCartPopup((prev) => !prev);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  RESTAURANT PARTNER NAVIGATION (ONLY SHOWN INSIDE RESTAURANT PARTNER PAGE)
  // ══════════════════════════════════════════════════════════════════════════
  if (isRestaurantPartner) {
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'orders';

    const partnerTabs = [
      { id: 'orders', label: 'Order Pipeline', icon: ShoppingBag },
      { id: 'menu', label: 'Menu & Food Items', icon: List },
      { id: 'offers', label: 'Discounts & Offers', icon: Tag },
      { id: 'profile', label: 'Kitchen Profile', icon: Store },
      { id: 'kyc', label: 'KYC Document Verification', icon: Shield },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0E121C]/95 backdrop-blur-md border-t border-gray-200/80 dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.5)] px-2 sm:px-6 py-2 transition-colors duration-300">
        <div className="max-w-md mx-auto flex items-center justify-between relative">
          {partnerTabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={`/restaurant-dashboard?tab=${tab.id}`}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 ${
                  active
                    ? 'text-[#7C3AED] dark:text-[#A78BFA] font-bold'
                    : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                <span className="text-[9px] sm:text-[10px] font-medium leading-tight text-center truncate max-w-[65px] sm:max-w-none">
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DELIVERY PARTNER NAVIGATION (ONLY SHOWN INSIDE DELIVERY PARTNER PAGE)
  // ══════════════════════════════════════════════════════════════════════════
  if (isDeliveryPartner) {
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'pool';

    const deliveryTabs = [
      { id: 'pool', label: 'Order Pool', icon: ShoppingBag },
      { id: 'orders', label: 'Claimed Runs', icon: Bike },
      { id: 'wallet', label: 'Earnings', icon: DollarSign },
      { id: 'history', label: 'Runs Log', icon: Clock },
      { id: 'kyc', label: 'KYC Verify', icon: ShieldCheck },
      { id: 'profile', label: 'My Profile', icon: Pencil },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0E121C]/95 backdrop-blur-md border-t border-gray-200/80 dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.5)] px-1 sm:px-6 py-2 transition-colors duration-300">
        <div className="max-w-md mx-auto flex items-center justify-between relative">
          {deliveryTabs.map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <Link
                key={tab.id}
                to={`/delivery-dashboard?tab=${tab.id}`}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 ${
                  active
                    ? 'text-[#7C3AED] dark:text-[#A78BFA] font-bold'
                    : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                <span className="text-[8.5px] sm:text-[10px] font-medium leading-tight text-center truncate max-w-[55px] sm:max-w-none">
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* ── CART PREVIEW POPUP DIRECTLY ABOVE NAVIGATION BAR ── */}
      {showCartPopup && !isCartEmpty && (
        <div
          ref={popupRef}
          className="fixed bottom-[74px] left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm bg-white dark:bg-[#141926] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-4 animate-fade-in transition-all duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-sm text-gray-900 dark:text-white">
                Cart Preview
              </span>
              <span className="bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              onClick={() => setShowCartPopup(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              title="Close popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
            {cartItems.map((item) => (
              <div
                key={item.menuItemId}
                className="flex items-center justify-between gap-2.5 bg-gray-50 dark:bg-[#1C2233] p-2 rounded-xl border border-gray-100/60 dark:border-white/5"
              >
                {/* Item Thumbnail */}
                <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0">
                  <img
                    src={getImageUrl(item.image, 'food')}
                    alt={item.name}
                    onError={(e) => handleImageError(e, 'food')}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {item.name}
                  </h4>
                  <p className="text-[11px] font-extrabold text-[#7C3AED] dark:text-[#A78BFA] mt-0.5">
                    ₹{item.price * item.quantity}
                  </p>
                </div>

                {/* Quantity Controls (+ / -) */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#141926] px-2 py-1 rounded-lg border border-gray-200/80 dark:border-white/10 shadow-xs flex-shrink-0">
                  <button
                    onClick={() => removeItem(item.menuItemId)}
                    className="w-5 h-5 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 active:scale-90 transition-transform cursor-pointer"
                    title="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-gray-900 dark:text-white min-w-[14px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                    className="w-5 h-5 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-green-500 dark:hover:text-green-400 active:scale-90 transition-transform cursor-pointer"
                    title="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Subtotal & Action CTA */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-gray-400 dark:text-slate-400 font-medium block">{t('cart.itemTotal', 'Total Amount')}</span>
              <span className="font-display font-black text-sm text-gray-900 dark:text-white">
                ₹{subtotal}
              </span>
            </div>

            <button
              onClick={() => {
                setShowCartPopup(false);
                navigate('/cart');
              }}
              className="flex-1 bg-[#7C3AED] hover:bg-[#6D28D9] active:scale-95 text-white text-xs font-extrabold py-2.5 px-4 rounded-xl shadow-md shadow-purple-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>{t('restaurant.viewCart', 'View Cart')}</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          {/* Pointer / Triangle connecting to Cart Button */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-[#141926] rotate-45 border-r border-b border-gray-100 dark:border-white/10"></div>
        </div>
      )}

      {/* ── BOTTOM NAVIGATION BAR (FIXED AT SCREEN BOTTOM) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0E121C]/95 backdrop-blur-md border-t border-gray-200/80 dark:border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.5)] px-3 sm:px-6 py-2 transition-colors duration-300">
        <div className="max-w-md mx-auto flex items-center justify-between relative">

          {/* 1. HOME */}
          <Link
            to="/"
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 ${
              isActive('/')
                ? 'text-[#7C3AED] dark:text-[#A78BFA] font-bold'
                : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            <span className="text-[10px] sm:text-[11px] font-medium leading-none">{t('nav.home', 'Home')}</span>
          </Link>

          {/* 2. FAVOURITES */}
          <Link
            to="/favourites"
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 ${
              isActive('/favourites')
                ? 'text-red-500 font-bold'
                : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
            }`}
          >
            <Heart className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${isActive('/favourites') ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="text-[10px] sm:text-[11px] font-medium leading-none">{t('nav.favourites', 'Favourites')}</span>
          </Link>

          {/* 3. CART (DYNAMIC HIGHLIGHT & POPUP) */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            {!isCartEmpty ? (
              // ── HIGHLIGHTED ACTIVE CART STATE ──
              <button
                type="button"
                onClick={handleCartClick}
                className="relative -translate-y-3.5 flex flex-col items-center group cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 focus:outline-none"
                title="View cart preview"
              >
                {/* Red Circular Raised Background */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/35 ring-4 ring-white dark:ring-[#0E121C] transition-all">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>

                {/* Small RED Quantity Badge */}
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#0E121C] shadow-sm animate-pulse">
                  {totalQuantity}
                </span>

                {/* Label */}
                <span className="text-[10px] sm:text-[11px] font-bold text-red-600 dark:text-red-400 mt-0.5 leading-none">
                  {t('nav.cart', 'Cart')}
                </span>
              </button>
            ) : (
              // ── EMPTY DEFAULT CART STATE ──
              <Link
                to="/cart"
                className={`flex flex-col items-center justify-center gap-1 py-1 transition-all duration-200 ${
                  isActive('/cart')
                    ? 'text-[#7C3AED] dark:text-[#A78BFA] font-bold'
                    : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                <span className="text-[10px] sm:text-[11px] font-medium leading-none">{t('nav.cart', 'Cart')}</span>
              </Link>
            )}
          </div>

          {/* 4. ORDER HISTORY */}
          <Link
            to="/profile"
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 ${
              isActive('/orders') || isActive('/order-tracking')
                ? 'text-[#7C3AED] dark:text-[#A78BFA] font-bold'
                : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            <span className="text-[10px] sm:text-[11px] font-medium leading-none text-center">{t('profile.orderHistory', 'Order History')}</span>
          </Link>

          {/* 5. PROFILE */}
          <Link
            to="/profile"
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 ${
              isActive('/profile')
                ? 'text-[#7C3AED] dark:text-[#A78BFA] font-bold'
                : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
            <span className="text-[10px] sm:text-[11px] font-medium leading-none">{t('nav.profile', 'Profile')}</span>
          </Link>

        </div>
      </nav>
    </>
  );
}
