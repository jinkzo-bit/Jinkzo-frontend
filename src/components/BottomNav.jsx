import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, ShoppingBag, Heart, User } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function BottomNav() {
  const location = useLocation();
  const cartItems = useCartStore((state) => state.items);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 border-t border-line/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-4 py-2 flex items-center justify-around backdrop-blur-lg">
      
      {/* Home link */}
      <Link 
        to="/" 
        className={`flex flex-col items-center gap-1 transition-all ${isActive('/') ? 'text-primary font-bold' : 'text-muted hover:text-main font-medium'}`}
      >
        <Home className={`w-5 h-5 ${isActive('/') ? 'fill-primary stroke-primary' : 'stroke-current'}`} />
        <span className="text-[10px] tracking-tight">Home</span>
      </Link>

      {/* Orders link */}
      <Link 
        to="/orders" 
        className={`flex flex-col items-center gap-1 transition-all ${isActive('/orders') ? 'text-primary font-bold' : 'text-muted hover:text-main font-medium'}`}
      >
        <ClipboardList className={`w-5 h-5 ${isActive('/orders') ? 'stroke-primary stroke-[2.5]' : 'stroke-current'}`} />
        <span className="text-[10px] tracking-tight">Orders</span>
      </Link>

      {/* Cart link with badge */}
      <Link 
        to="/cart" 
        className={`relative flex flex-col items-center gap-1 transition-all ${isActive('/cart') ? 'text-primary font-bold' : 'text-muted hover:text-main font-medium'}`}
      >
        <div className="relative">
          <ShoppingBag className={`w-5 h-5 ${isActive('/cart') ? 'stroke-primary stroke-[2.5]' : 'stroke-current'}`} />
          {totalQuantity > 0 && (
            <span className="absolute -top-1 -right-2 bg-primary text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse shadow-xs">
              {totalQuantity}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Cart</span>
      </Link>

      {/* Favourites link (Replaced Wallet) */}
      <Link 
        to="/favourites" 
        className={`flex flex-col items-center gap-1 transition-all ${isActive('/favourites') ? 'text-primary font-bold' : 'text-muted hover:text-main font-medium'}`}
      >
        <Heart className={`w-5 h-5 ${isActive('/favourites') ? 'fill-primary stroke-primary' : 'stroke-current'}`} />
        <span className="text-[10px] tracking-tight">Favourites</span>
      </Link>

      {/* Profile link */}
      <Link 
        to="/profile" 
        className={`flex flex-col items-center gap-1 transition-all ${isActive('/profile') ? 'text-primary font-bold' : 'text-muted hover:text-main font-medium'}`}
      >
        <User className={`w-5 h-5 ${isActive('/profile') ? 'stroke-primary stroke-[2.5]' : 'stroke-current'}`} />
        <span className="text-[10px] tracking-tight">Profile</span>
      </Link>

    </nav>
  );
}
