import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Search,
  Bell,
  User,
  ChevronDown,
  LogOut,
  ShoppingBag,
  Bike,
  Store,
  ShieldAlert,
  Moon,
  Sun,
  SlidersHorizontal
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';
import LocationPickerModal from './LocationPickerModal';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);
  const { isDarkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState([
    { id: 1, title: 'Order Delivered', desc: 'Your Biryani order was successfully delivered.', time: '10m ago' },
    { id: 2, title: '50% OFF Flash Sale', desc: 'Get 50% discount on orders above ₹249 today!', time: '1h ago' },
    { id: 3, title: 'Free Delivery Active', desc: 'Enjoy zero delivery fees on all restaurant orders.', time: '2h ago' }
  ]);

  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Default address fallback
  const deliveryAddress = (user && user.addresses && user.addresses.length > 0)
    ? (user.addresses.find(a => a.isDefault)?.street || user.addresses[0].street || 'Allagadda Vari Vindhu, Nandikotkur')
    : 'Allagadda Vari Vindhu, Nandikotkur';

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/restaurants?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/restaurants');
    }
  };

  return (
    <>
      <header className="sticky top-3 z-50 max-w-7xl mx-auto w-[94%] lg:w-full px-2 sm:px-4 py-2">
        <div className="flex items-center justify-between gap-3 sm:gap-4 md:gap-6 bg-white/95 dark:bg-[#141926]/95 backdrop-blur-md rounded-2xl md:rounded-full px-4 sm:px-6 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/10 transition-colors duration-300">

          {/* 1. DELIVER TO LOCATION PILL */}
          <div
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-gray-50/80 dark:bg-[#1C2233] hover:bg-gray-100/90 dark:hover:bg-[#232B40] border border-gray-200/80 dark:border-white/10 cursor-pointer transition-all flex-shrink-0 max-w-[210px] sm:max-w-[290px] group"
            title="Click to change delivery location"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <MapPin className="w-4 h-4 fill-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA]" />
            </div>
            <div className="flex flex-col min-w-0 pr-1">
              <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium leading-none">Deliver to</span>
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate leading-tight mt-0.5">
                {deliveryAddress}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-white transition-colors flex-shrink-0 ml-auto" />
          </div>

          {/* 2. SEARCH BAR PILL */}
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-2xl relative flex items-center"
          >
            <div className="relative w-full flex items-center">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-slate-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for food, grocery, items..."
                className="w-full bg-gray-50 dark:bg-[#1C2233] hover:bg-gray-100/70 dark:hover:bg-[#232B40] focus:bg-white dark:focus:bg-[#1E2538] text-gray-800 dark:text-white text-xs sm:text-sm font-medium pl-11 pr-11 py-2.5 sm:py-3 rounded-full border border-gray-200/80 dark:border-white/10 focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 shadow-inner"
              />
              <button
                type="button"
                onClick={() => navigate('/restaurants')}
                className="absolute right-3.5 text-gray-400 dark:text-slate-400 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors"
                title="Filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* 3. RIGHT ICONS (THEME TOGGLE, NOTIFICATIONS & PROFILE) */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">

            {/* Quick Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDarkMode ? (
                <Sun className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-400" />
              ) : (
                <Moon className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-purple-600" />
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifMenuRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-gray-700 dark:text-slate-200" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#141926] animate-pulse">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#141926] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50 animate-fade-in">
                  <div className="p-4 bg-gray-50/80 dark:bg-[#1C2233] border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <span className="font-bold text-sm text-gray-900 dark:text-white">Notifications ({unreadNotifications.length})</span>
                    <button
                      onClick={() => setUnreadNotifications([])}
                      className="text-xs text-[#7C3AED] dark:text-[#A78BFA] font-semibold hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-white/5">
                    {unreadNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400 dark:text-slate-400 font-medium">No new notifications</div>
                    ) : (
                      unreadNotifications.map(n => (
                        <div key={n.id} className="p-3.5 hover:bg-purple-50/40 dark:hover:bg-white/5 transition-colors">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">{n.title}</h4>
                          <p className="text-[11px] text-gray-600 dark:text-slate-300 mt-0.5">{n.desc}</p>
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 font-semibold mt-1 block">{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar / Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center shadow-md shadow-purple-500/20 active:scale-95 transition-all cursor-pointer"
                title={user ? user.name : 'Account & Menu'}
              >
                <User className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-[#141926] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 py-2 z-50 animate-fade-in divide-y divide-gray-50 dark:divide-white/5">
                  {user ? (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 dark:text-slate-400 font-medium">Signed in as</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || user.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {user.role || 'Customer'}
                      </span>
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-center">
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">Sign in to access your account & orders</p>
                      <Link
                        to="/login"
                        onClick={() => setShowProfileMenu(false)}
                        className="block w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold text-xs py-2 rounded-xl transition-colors"
                      >
                        Sign In / Register
                      </Link>
                    </div>
                  )}

                  <div className="py-1">
                    <Link
                      to="/"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-white/5 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors"
                    >
                      Home
                    </Link>
                    <Link
                      to="/restaurants"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-white/5 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors"
                    >
                      Order Food
                    </Link>
                    <Link
                      to="/ride"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-white/5 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors"
                    >
                      <Bike className="w-3.5 h-3.5" />
                      Book Ride & Courier
                    </Link>
                    <Link
                      to="/cart"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-white/5 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Cart</span>
                      </div>
                      {totalQuantity > 0 && (
                        <span className="bg-[#7C3AED] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {totalQuantity}
                        </span>
                      )}
                    </Link>
                  </div>

                  {user && (
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-white/5 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors"
                      >
                        <User className="w-3.5 h-3.5" />
                        My Profile & Addresses
                      </Link>

                      {user.role === 'admin' && (
                        <Link
                          to="/admin-dashboard"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Admin Portal
                        </Link>
                      )}

                      {user.role === 'restaurant' && (
                        <Link
                          to="/restaurant-dashboard"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#7C3AED] dark:text-[#A78BFA] hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                        >
                          <Store className="w-3.5 h-3.5" />
                          Restaurant Portal
                        </Link>
                      )}

                      {user.role === 'delivery' && (
                        <Link
                          to="/delivery-dashboard"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                        >
                          <Bike className="w-3.5 h-3.5" />
                          Rider Portal
                        </Link>
                      )}
                    </div>
                  )}

                  <div className="py-1">
                    {user && (
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          logout();
                          navigate('/');
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        initialAddress={deliveryAddress}
        onConfirm={(addr) => {
          console.log('Selected address:', addr);
          setShowLocationModal(false);
        }}
      />
    </>
  );
}
