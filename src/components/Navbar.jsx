import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, MapPin, LogOut, Bike, ShieldAlert, Store, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useThemeStore } from '../store/themeStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);
  const { isDarkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Find active shipping address or fallback to default Swiggy mockup
  const getActiveAddress = () => {
    if (user && user.addresses && user.addresses.length > 0) {
      const def = user.addresses.find(a => a.isDefault);
      if (def) return `${def.street}, ${def.city}`;
      return `${user.addresses[0].street}, ${user.addresses[0].city}`;
    }
    return "Deliver to Nandikotkur, AP";
  };

  return (
    <header className="sticky top-4 z-50 bg-white/90 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-16 flex items-center justify-between px-6 md:px-8 max-w-7xl mx-auto w-[92%] lg:w-[96%] rounded-full border border-white/50">
      {/* Brand Logo & Location */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-1.5 cursor-pointer">
          <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-extrabold text-lg shadow-sm shadow-violet-500/30">
            Q
          </span>
          <span className="font-display font-black text-xl text-primary tracking-tight">
            Jinkzo
          </span>
        </Link>


      </div>

      {/* Navigation Options */}
      <div className="flex items-center gap-4 md:gap-7">
        {user && user.role === 'admin' && (
          <Link 
            to="/admin-dashboard" 
            className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 border border-red-200 bg-red-50/30 px-3.5 py-1.8 rounded-xl transition-all cursor-pointer"
          >
            <ShieldAlert className="w-4.5 h-4.5 text-red-600" />
            <span className="hidden md:inline">Admin Portal</span>
          </Link>
        )}

        {user && user.role === 'restaurant' && (
          <Link 
            to="/restaurant-dashboard" 
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover border border-primary/20 bg-violet-50/30 px-3.5 py-1.8 rounded-xl transition-all cursor-pointer"
          >
            <Store className="w-4.5 h-4.5 text-primary" />
            <span className="hidden md:inline">Restaurant Panel</span>
          </Link>
        )}

        {user && user.role === 'delivery' && (
          <Link 
            to="/delivery-dashboard" 
            className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 border border-emerald-200 bg-emerald-50/30 px-3.5 py-1.8 rounded-xl transition-all cursor-pointer"
          >
            <Bike className="w-4.5 h-4.5 text-emerald-600" />
            <span className="hidden md:inline">Rider Panel</span>
          </Link>
        )}





        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-line shadow-sm hover:shadow-md transition-all text-muted hover:text-primary"
          title="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Cart Bag Icon with count badge */}


        {/* Auth / Profile Link */}
        {user ? (
          <div className="flex items-center gap-4">
            <Link 
              to="/profile" 
              className="flex items-center gap-1.5 text-sm font-semibold text-main hover:text-primary transition-colors cursor-pointer"
            >
              <User className="w-4.5 h-4.5 text-primary" />
              <span className="max-w-[80px] truncate">{user && user.name ? user.name.split(' ')[0] : 'Profile'}</span>
            </Link>
            <button 
              onClick={() => {
                logout();
                navigate('/');
              }}
              title="Logout"
              className="text-muted hover:text-red-500 transition-colors p-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link 
            to="/login" 
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4.5 py-2.5 rounded-xl shadow-md shadow-violet-500/10 hover:shadow-lg transition-all"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
