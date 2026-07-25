import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBag, User } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function BottomNav() {
  const location = useLocation();
  const cartItems = useCartStore((state) => state.items);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 border-t border-line shadow-lg px-6 py-2.5 flex items-center justify-between glass">
      
      {/* Home link */}
      <Link 
        to="/" 
        className={`flex flex-col items-center gap-1.5 transition-colors ${isActive('/') ? 'text-primary' : 'text-muted hover:text-muted'}`}
      >
        <Home className="w-5.5 h-5.5" />
        <span className="text-[10px] font-semibold">Home</span>
      </Link>

      {/* Search link */}
      <Link 
        to="/restaurants" 
        className={`flex flex-col items-center gap-1.5 transition-colors ${isActive('/restaurants') ? 'text-primary' : 'text-muted hover:text-muted'}`}
      >
        <Search className="w-5.5 h-5.5" />
        <span className="text-[10px] font-semibold">Search</span>
      </Link>

      {/* Cart link with badge */}
      <Link 
        to="/cart" 
        className={`relative flex flex-col items-center gap-1.5 transition-colors ${isActive('/cart') ? 'text-primary' : 'text-muted hover:text-muted'}`}
      >
        <div className="relative">
          <ShoppingBag className="w-5.5 h-5.5" />
          {totalQuantity > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
              {totalQuantity}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold">Cart</span>
      </Link>

      {/* Profile link */}
      <Link 
        to="/profile" 
        className={`flex flex-col items-center gap-1.5 transition-colors ${isActive('/profile') ? 'text-primary' : 'text-muted hover:text-muted'}`}
      >
        <User className="w-5.5 h-5.5" />
        <span className="text-[10px] font-semibold">Profile</span>
      </Link>

    </nav>
  );
}
