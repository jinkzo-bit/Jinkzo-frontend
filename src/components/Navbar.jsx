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
import jinkzoLogo from '../assets/jinkzo-logo.jpg';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';
import { useLocationStore } from '../store/locationStore';
import LocationPickerModal from './LocationPickerModal';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);
  const { isDarkMode, toggleTheme } = useThemeStore();
  const { lat, lng, address: storeAddress, isDetecting, detectGpsLocation, setLocation: setStoreLocation } = useLocationStore();
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

  // Dynamic real GPS location with fallback to user saved address or prompt
  const deliveryAddress = isDetecting
    ? 'Detecting location...'
    : (storeAddress || (user?.addresses?.length > 0 ? (user.addresses.find(a => a.isDefault)?.street || user.addresses[0].street) : '') || 'Select location');

  // Trigger GPS detection on mount
  useEffect(() => {
    detectGpsLocation();
  }, [detectGpsLocation]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target) &&
        !event.target.closest('.profile-toggle-btn')
      ) {
        setShowProfileMenu(false);
      }
      if (
        notifMenuRef.current &&
        !notifMenuRef.current.contains(event.target) &&
        !event.target.closest('.notif-toggle-btn')
      ) {
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
      <header className="sticky top-2 sm:top-3 z-50 max-w-7xl mx-auto w-[96%] sm:w-[94%] lg:w-full px-1 sm:px-4 py-1 sm:py-2">
        <div className="relative bg-white/95 dark:bg-[#141926]/95 backdrop-blur-md rounded-2xl md:rounded-full px-3.5 sm:px-6 py-2.5 sm:py-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/10 transition-colors duration-300">

          {/* ═══════════════════════════════════════════════════════════
              1. MOBILE HEADER LAYOUT (Visible only on mobile: md:hidden)
              Row 1: [ JINKZO LOGO (Left) ] ... [ DELIVER TO (Right) ] + Actions
              Row 2: [ Full Width Search Bar with filter button ]
             ═══════════════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-2.5 md:hidden">

            {/* Row 1: Logo (Left) and Deliver to Location + Quick Actions (Right) */}
            <div className="flex items-center justify-between gap-2">

              {/* LEFT: Jinkzo Logo & Brand Wordmark */}
              <Link to="/" className="flex items-center gap-2 flex-shrink-0 group cursor-pointer">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden shadow-xs border border-gray-100 dark:border-white/10 flex items-center justify-center bg-white flex-shrink-0 group-hover:scale-105 transition-transform">
                  <img src={jinkzoLogo} alt="Jinkzo Logo" className="w-full h-full object-cover" />
                </div>
                <span className="font-display font-black text-lg sm:text-xl tracking-tight leading-none flex items-center select-none">
                  <span className="text-black dark:text-white">jink</span>
                  <span className="text-[#FF6600]">zo</span>
                </span>
              </Link>

              {/* RIGHT: Location Selector + Action Buttons */}
              <div className="flex items-center gap-1.5 flex-shrink min-w-0">
                {/* Deliver To Selector Pill */}
                <div
                  onClick={() => setShowLocationModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50/90 dark:bg-[#1C2233] hover:bg-gray-100 dark:hover:bg-[#232B40] border border-gray-200/80 dark:border-white/10 cursor-pointer transition-all min-w-0 group"
                  title="Click to change delivery location"
                >
                  <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <MapPin className={`w-3.5 h-3.5 fill-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] ${isDetecting ? 'animate-bounce' : ''}`} />
                  </div>
                  <div className="flex flex-col min-w-0 pr-0.5">
                    <span className="text-[9px] text-gray-500 dark:text-slate-400 font-semibold leading-none">Deliver to</span>
                    <span className={`text-[11px] sm:text-xs font-bold truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[180px] leading-tight mt-0.5 ${isDetecting ? 'text-gray-400 dark:text-slate-400 animate-pulse' : 'text-gray-900 dark:text-white'}`}>
                      {deliveryAddress}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-white transition-colors flex-shrink-0" />
                </div>

                {/* Quick Action Icons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                    title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                  >
                    {isDarkMode ? (
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-purple-600" />
                    )}
                  </button>

                  {/* Notifications */}
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="notif-toggle-btn w-7 h-7 rounded-full flex items-center justify-center text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all relative cursor-pointer"
                    title="Notifications"
                  >
                    <Bell className="w-3.5 h-3.5 text-gray-700 dark:text-slate-200" />
                    {unreadNotifications.length > 0 && (
                      <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500 text-white text-[7px] font-black rounded-full flex items-center justify-center ring-1 ring-white dark:ring-[#141926] animate-pulse">
                        {unreadNotifications.length}
                      </span>
                    )}
                  </button>

                  {/* Profile */}
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="profile-toggle-btn w-7 h-7 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center shadow-xs shadow-purple-500/20 active:scale-95 transition-all cursor-pointer"
                    title={user ? user.name : 'Account & Menu'}
                  >
                    <User className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>

            </div>

            {/* Row 2: Search Bar */}
            <form
              onSubmit={handleSearch}
              className="w-full relative flex items-center"
            >
              <div className="relative w-full flex items-center">
                <Search className="w-4 h-4 text-gray-400 dark:text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for food, grocery, items..."
                  className="w-full bg-gray-50 dark:bg-[#1C2233] hover:bg-gray-100/70 dark:hover:bg-[#232B40] focus:bg-white dark:focus:bg-[#1E2538] text-gray-800 dark:text-white text-xs font-medium pl-10 pr-10 py-2 rounded-full border border-gray-200/80 dark:border-white/10 focus:border-[#7C3AED] dark:focus:border-[#A78BFA] focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/30 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => navigate('/restaurants')}
                  className="absolute right-3 text-gray-400 dark:text-slate-400 hover:text-[#7C3AED] dark:hover:text-[#A78BFA] transition-colors"
                  title="Filters"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

          </div>

          {/* ═══════════════════════════════════════════════════════════
              2. DESKTOP HEADER LAYOUT (Visible on md and larger screens)
             ═══════════════════════════════════════════════════════════ */}
          <div className="hidden md:flex items-center justify-between gap-4 md:gap-6">

            {/* Brand Logo & Deliver To Location Pill */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <Link to="/" className="flex items-center gap-2 cursor-pointer group">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-xs border border-gray-100 dark:border-white/10 flex items-center justify-center bg-white flex-shrink-0 group-hover:scale-105 transition-transform">
                  <img src={jinkzoLogo} alt="Jinkzo Logo" className="w-full h-full object-cover" />
                </div>
                <span className="font-display font-black text-xl lg:text-2xl tracking-tight flex items-center select-none">
                  <span className="text-black dark:text-white">jink</span>
                  <span className="text-[#FF6600]">zo</span>
                </span>
              </Link>

              {/* Location Pill */}
              <div
                onClick={() => setShowLocationModal(true)}
                className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-gray-50/80 dark:bg-[#1C2233] hover:bg-gray-100/90 dark:hover:bg-[#232B40] border border-gray-200/80 dark:border-white/10 cursor-pointer transition-all flex-shrink-0 max-w-[230px] lg:max-w-[290px] group"
                title="Click to change delivery location"
              >
                <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <MapPin className={`w-3.5 h-3.5 fill-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] ${isDetecting ? 'animate-bounce' : ''}`} />
                </div>
                <div className="flex flex-col min-w-0 pr-1">
                  <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium leading-none">Deliver to</span>
                  <span className={`text-xs sm:text-sm font-bold truncate leading-tight mt-0.5 ${isDetecting ? 'text-gray-400 dark:text-slate-400 animate-pulse' : 'text-gray-900 dark:text-white'}`}>
                    {deliveryAddress}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-white transition-colors flex-shrink-0 ml-auto" />
              </div>
            </div>

            {/* Search Bar Pill */}
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

            {/* Desktop Right Action Icons */}
            <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">

              {/* Theme Toggle */}
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

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="notif-toggle-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition-all relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-gray-700 dark:text-slate-200" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#141926] animate-pulse">
                    {unreadNotifications.length}
                  </span>
                )}
              </button>

              {/* Profile Avatar */}
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="profile-toggle-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white flex items-center justify-center shadow-md shadow-purple-500/20 active:scale-95 transition-all cursor-pointer"
                title={user ? user.name : 'Account & Menu'}
              >
                <User className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
              </button>

            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════════
              3. SHARED DROPDOWN MENUS (Notifications & Profile)
             ═══════════════════════════════════════════════════════════ */}

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              ref={notifMenuRef}
              className="absolute right-2 sm:right-6 top-full mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#141926] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden z-50 animate-fade-in"
            >
              <div className="p-4 bg-gray-50/80 dark:bg-[#1C2233] border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                <span className="font-bold text-sm text-gray-900 dark:text-white">Notifications ({unreadNotifications.length})</span>
                <button
                  onClick={() => setUnreadNotifications([])}
                  className="text-xs text-[#7C3AED] dark:text-[#A78BFA] font-semibold hover:underline cursor-pointer"
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

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div
              ref={profileMenuRef}
              className="absolute right-2 sm:right-6 top-full mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-[#141926] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 py-2 z-50 animate-fade-in divide-y divide-gray-50 dark:divide-white/5"
            >
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
      </header>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        initialAddress={lat && lng ? { lat, lng, formattedAddress: deliveryAddress } : null}
        onConfirm={(addr) => {
          if (addr) {
            setStoreLocation(addr, 'MANUAL');
          }
          setShowLocationModal(false);
        }}
      />
    </>
  );
}
