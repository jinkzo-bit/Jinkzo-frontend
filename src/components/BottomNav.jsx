import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Heart, ShoppingCart, FileText, Menu } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function BottomNav() {
  const location = useLocation();
  const cartItems = useCartStore((state) => state.items);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const isActive = (path) => location.pathname === path;

  // Reusable Nav Item Component
  const NavItem = ({ to, icon: Icon, label, active }) => (
    <Link 
      to={to} 
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-primary' : 'text-gray-900 hover:text-gray-600'}`}
    >
      <Icon className={`w-6 h-6 ${active ? 'text-primary fill-primary/10' : ''}`} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-bold mt-1">{label}</span>
    </Link>
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] px-4 pb-2 pt-3 flex items-center justify-between rounded-t-2xl">
      
      {/* Left side */}
      <div className="flex justify-around flex-1 pr-6">
        <NavItem to="/" icon={Home} label="Home" active={isActive('/')} />
        <NavItem to="/favourites" icon={Heart} label="Favourite" active={isActive('/favourites')} />
      </div>

      {/* Floating Center Cart Button */}
      <div className="absolute left-1/2 -top-6 -translate-x-1/2 flex flex-col items-center">
        <Link 
          to="/cart" 
          className="relative flex items-center justify-center w-14 h-14 bg-primary rounded-full shadow-lg border-4 border-white active:scale-95 transition-transform"
        >
          <ShoppingCart className="w-6 h-6 text-white" strokeWidth={2.5} />
          {totalQuantity > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-primary text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-sm border border-primary/20">
              {totalQuantity}
            </span>
          )}
        </Link>
      </div>

      {/* Right side */}
      <div className="flex justify-around flex-1 pl-6">
        <NavItem to="/orders" icon={FileText} label="Orders" active={isActive('/orders')} />
        <NavItem to="/profile" icon={Menu} label="Menu" active={isActive('/profile')} />
      </div>

    </nav>
  );
}
