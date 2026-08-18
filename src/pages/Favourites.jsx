import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Building2, UtensilsCrossed, ArrowRight, ShoppingBag, Plus, Minus } from 'lucide-react';
import RestaurantCard from '../components/RestaurantCard';
import { useFavoriteStore } from '../store/favoriteStore';
import { useCartStore } from '../store/cartStore';

export default function Favourites() {
  const [activeTab, setActiveTab] = useState('hotels'); // 'hotels' | 'items'

  const favouriteHotels = useFavoriteStore((state) => state.favouriteHotels);
  const favouriteItems = useFavoriteStore((state) => state.favouriteItems);
  const toggleItem = useFavoriteStore((state) => state.toggleItem);
  const isItemFavourite = useFavoriteStore((state) => state.isItemFavourite);

  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const [conflictModal, setConflictModal] = useState({
    isOpen: false,
    message: '',
    pendingItem: null,
    pendingRestaurant: null
  });

  const getItemQuantity = (itemId) => {
    const matched = cartItems.find((i) => String(i.menuItemId) === String(itemId));
    return matched ? matched.quantity : 0;
  };

  const handleAddToCart = (dish) => {
    const result = addItem(dish, dish.restaurant || { name: 'Jinkzo Store', _id: 'rest_default' });
    if (result && result.conflict) {
      setConflictModal({
        isOpen: true,
        message: result.message,
        pendingItem: dish,
        pendingRestaurant: dish.restaurant
      });
    }
  };

  const confirmConflictReset = () => {
    clearCart();
    addItem(conflictModal.pendingItem, conflictModal.pendingRestaurant);
    setConflictModal({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32 pt-2 animate-fade-in flex flex-col gap-6">

      {/* ── HEADER & TAB SWITCHER ── */}
      <div className="bg-surface rounded-3xl p-5 sm:p-6 border border-line shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-main tracking-tight flex items-center gap-2.5">
            <Heart className="w-7 h-7 text-[#7C3AED] fill-[#7C3AED]" />
            Favourites
          </h1>
          <p className="text-xs text-muted font-medium mt-1">
            Your saved restaurants, hotels, and delicious dishes in one place.
          </p>
        </div>

        {/* Two Tabs: [ Hotels ] [ Items ] */}
        <div className="flex items-center bg-base dark:bg-[#141926] p-1 rounded-2xl border border-line self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('hotels')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'hotels'
                ? 'bg-[#7C3AED] text-white shadow-sm shadow-purple-500/25'
                : 'text-muted hover:text-main'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Hotels</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeTab === 'hotels' ? 'bg-white/20 text-white' : 'bg-surface text-muted'
            }`}>
              {favouriteHotels.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'items'
                ? 'bg-[#7C3AED] text-white shadow-sm shadow-purple-500/25'
                : 'text-muted hover:text-main'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Items</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeTab === 'items' ? 'bg-white/20 text-white' : 'bg-surface text-muted'
            }`}>
              {favouriteItems.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: HOTELS TAB ── */}
      {activeTab === 'hotels' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {favouriteHotels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favouriteHotels.map((restaurant) => (
                <RestaurantCard
                  key={restaurant._id}
                  restaurant={restaurant}
                  isLoading={false}
                />
              ))}
            </div>
          ) : (
            /* Empty State for Hotels */
            <div className="bg-surface rounded-3xl p-12 text-center border border-line shadow-2xs flex flex-col items-center justify-center gap-3 my-4">
              <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/30 text-[#7C3AED] flex items-center justify-center mb-1">
                <Heart className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-display font-extrabold text-lg text-main">
                No favourite hotels yet
              </h3>
              <p className="text-xs text-muted max-w-xs leading-relaxed font-medium">
                Add hotels and restaurants to see them here for fast ordering.
              </p>
              <Link
                to="/restaurants"
                className="mt-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-purple-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Explore Restaurants</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: ITEMS TAB ── */}
      {activeTab === 'items' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {favouriteItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favouriteItems.map((dish) => {
                const quantity = getItemQuantity(dish._id);
                const isFav = isItemFavourite(dish._id);

                return (
                  <div
                    key={dish._id}
                    className="bg-surface rounded-3xl p-4 shadow-2xs border border-line flex flex-col justify-between gap-4 transition-all hover:shadow-md hover:scale-[1.01] duration-300 relative group"
                  >
                    <div className="flex gap-4">
                      {/* Image + Veg badge */}
                      <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className="w-full h-full object-cover rounded-2xl bg-base border border-line shadow-2xs"
                          loading="lazy"
                        />
                        {/* Veg / Non-Veg Badge */}
                        <span className={`absolute top-2 left-2 w-4 h-4 rounded-xs border-2 bg-surface flex items-center justify-center p-0.5 shadow-sm ${
                          dish.isVeg ? 'border-green-600' : 'border-red-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dish.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                        </span>

                        {/* Heart Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleItem(dish);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-[#141926]/90 shadow-sm border border-gray-100 dark:border-white/10 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                          title="Remove from Favourites"
                        >
                          <Heart className={`w-4 h-4 transition-colors ${
                            isFav
                              ? 'text-[#7C3AED] fill-[#7C3AED]'
                              : 'text-gray-400 hover:text-[#7C3AED]'
                          }`} />
                        </button>
                      </div>

                      {/* Info Details */}
                      <div className="flex flex-col gap-1 flex-grow justify-between py-1">
                        <div>
                          <h3 className="font-display font-extrabold text-sm text-main line-clamp-1">
                            {dish.name}
                          </h3>
                          <p className="text-xs text-muted font-medium line-clamp-2 mt-0.5">
                            {dish.description || 'Fresh, delicious item prepared with quality ingredients.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-black text-main">₹{dish.price}</span>
                          {dish.category && (
                            <span className="text-[10px] font-bold text-muted bg-base px-2 py-0.5 rounded-lg border border-line">
                              {dish.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sold by & Add to Cart */}
                    <div className="border-t border-line pt-3 mt-1 flex justify-between items-center">
                      <div className="flex flex-col gap-0.5 max-w-[60%]">
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Sold by</span>
                        <span className="text-xs font-bold text-main truncate">
                          {dish.restaurant?.name || 'Jinkzo Store'}
                        </span>
                      </div>

                      {/* Cart Quantity Control */}
                      <div className="bg-surface border border-gray-150 dark:border-white/10 shadow-xs rounded-xl flex items-center justify-between w-24 overflow-hidden h-9 flex-shrink-0">
                        {quantity > 0 ? (
                          <>
                            <button
                              onClick={() => removeItem(dish._id)}
                              className="w-8 h-full flex items-center justify-center hover:bg-base text-[#7C3AED] font-black text-sm cursor-pointer transition-colors"
                            >
                              -
                            </button>
                            <span className="text-xs font-extrabold text-main">{quantity}</span>
                            <button
                              onClick={() => handleAddToCart(dish)}
                              className="w-8 h-full flex items-center justify-center hover:bg-base text-[#7C3AED] font-black text-sm cursor-pointer transition-colors"
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(dish)}
                            className="w-full h-full flex items-center justify-center gap-1 text-xs font-black text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white transition-all cursor-pointer"
                          >
                            <span>ADD</span>
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State for Items */
            <div className="bg-surface rounded-3xl p-12 text-center border border-line shadow-2xs flex flex-col items-center justify-center gap-3 my-4">
              <div className="w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/30 text-[#7C3AED] flex items-center justify-center mb-1">
                <UtensilsCrossed className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-display font-extrabold text-lg text-main">
                No favourite items yet
              </h3>
              <p className="text-xs text-muted max-w-xs leading-relaxed font-medium">
                Tap the heart on any food, beverage, or grocery item to save it here.
              </p>
              <Link
                to="/restaurants"
                className="mt-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-purple-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Explore Items</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── CONFLICT RESET MODAL (MULTI-RESTAURANT SAFETY) ── */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center">
            <h3 className="font-display font-black text-lg text-main">Replace cart items?</h3>
            <p className="text-xs text-muted leading-relaxed font-medium">{conflictModal.message}</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setConflictModal({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null })}
                className="flex-1 py-2.5 px-4 rounded-xl border border-line text-xs font-bold text-muted hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmConflictReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
