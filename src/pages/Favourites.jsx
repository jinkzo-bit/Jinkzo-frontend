import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Building2, UtensilsCrossed, ArrowRight, ShoppingBag, Plus, Minus } from 'lucide-react';
import RestaurantCard from '../components/RestaurantCard';
import { useFavoriteStore } from '../store/favoriteStore';
import { useCartStore } from '../store/cartStore';
import { useTranslation } from '../store/languageStore';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';
import VegBadge from '../components/VegBadge';

export default function Favourites() {
  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'hotels'
  const [itemCategoryFilter, setItemCategoryFilter] = useState('ALL'); // 'ALL' | 'FOOD' | 'GROCERY' | 'BAKERY' | 'VEG_FRUITS' | 'MEAT'
  const { t } = useTranslation();

  const favouriteHotels = useFavoriteStore((state) => state.favouriteHotels);
  const favouriteItems = useFavoriteStore((state) => state.favouriteItems);
  const toggleItem = useFavoriteStore((state) => state.toggleItem);

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
    const matched = cartItems.find((i) => String(i.menuItemId || i._id) === String(itemId));
    return matched ? matched.quantity : 0;
  };

  const handleAddToCart = (dish) => {
    const sType = (dish.serviceType || 'FOOD').toUpperCase();
    const fallbackRest = {
      name: sType !== 'FOOD' ? `Jinkzo Store (${sType})` : 'Jinkzo Store',
      _id: sType !== 'FOOD' ? `store_${sType.toLowerCase()}` : 'rest_default'
    };
    const result = addItem(dish, dish.restaurant || fallbackRest);
    if (result && result.conflict) {
      setConflictModal({
        isOpen: true,
        message: result.message,
        pendingItem: dish,
        pendingRestaurant: dish.restaurant || fallbackRest
      });
    }
  };

  const confirmConflictReset = () => {
    clearCart();
    addItem(conflictModal.pendingItem, conflictModal.pendingRestaurant);
    setConflictModal({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null });
  };

  const categoryTabs = [
    { id: 'ALL', label: 'All' },
    { id: 'FOOD', label: 'Food' },
    { id: 'GROCERY', label: 'Grocery' },
    { id: 'BAKERY', label: 'Bakery' },
    { id: 'VEG_FRUITS', label: 'Veg & Fruits' },
    { id: 'MEAT', label: 'Meat' }
  ];

  const getServiceType = (dish) => {
    if (dish.serviceType) return String(dish.serviceType).toUpperCase();
    const cat = String(dish.category || '').toUpperCase();
    if (['GROCERY', 'BAKERY', 'VEG_FRUITS', 'MEAT'].includes(cat)) return cat;
    return 'FOOD';
  };

  const filteredItems = favouriteItems.filter((item) => {
    if (itemCategoryFilter === 'ALL') return true;
    return getServiceType(item) === itemCategoryFilter;
  });

  const getCategoryBadgeStyle = (sType) => {
    switch (sType) {
      case 'GROCERY':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'BAKERY':
        return 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300 border-pink-200 dark:border-pink-800';
      case 'VEG_FRUITS':
        return 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'MEAT':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'FOOD':
      default:
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
  };

  const getCategoryLabel = (sType) => {
    switch (sType) {
      case 'GROCERY': return 'Grocery';
      case 'BAKERY': return 'Bakery';
      case 'VEG_FRUITS': return 'Veg & Fruits';
      case 'MEAT': return 'Meat';
      case 'FOOD': default: return 'Food';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32 pt-2 animate-fade-in flex flex-col gap-6">

      {/* ── HEADER & MAIN TAB SWITCHER (Items vs Hotels) ── */}
      <div className="bg-surface rounded-3xl p-5 sm:p-6 border border-line shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <h1 className="font-display font-black text-2xl md:text-3xl text-main tracking-tight flex items-center gap-2.5">
            <Heart className="w-7 h-7 text-red-500 fill-red-500" />
            {t('favourites.title', 'Favourites')}
          </h1>
          <p className="text-xs text-muted font-medium mt-1">
            {t('favourites.subtitle', 'Your saved food, groceries, bakery, fresh produce, meat & restaurants.')}
          </p>
        </div>

        {/* Two Tabs: [ Items ] [ Hotels ] */}
        <div className="flex items-center bg-base dark:bg-[#141926] p-1 rounded-2xl border border-line self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'items'
                ? 'bg-red-500 text-white shadow-sm shadow-red-500/25'
                : 'text-muted hover:text-main'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>{t('favourites.dishes', 'Items')}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeTab === 'items' ? 'bg-white/20 text-white' : 'bg-surface text-muted'
            }`}>
              {favouriteItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hotels')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'hotels'
                ? 'bg-red-500 text-white shadow-sm shadow-red-500/25'
                : 'text-muted hover:text-main'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('favourites.restaurants', 'Hotels')}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              activeTab === 'hotels' ? 'bg-white/20 text-white' : 'bg-surface text-muted'
            }`}>
              {favouriteHotels.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: ITEMS TAB (ALL CATEGORIES) ── */}
      {activeTab === 'items' && (
        <div className="flex flex-col gap-5 animate-fade-in">
          {/* Category Filter Pills: [All] [Food] [Grocery] [Bakery] [Veg & Fruits] [Meat] */}
          {favouriteItems.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {categoryTabs.map((tab) => {
                const count = tab.id === 'ALL'
                  ? favouriteItems.length
                  : favouriteItems.filter(i => getServiceType(i) === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setItemCategoryFilter(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-extrabold border transition-all cursor-pointer whitespace-nowrap shadow-3xs ${
                      itemCategoryFilter === tab.id
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface border-line text-muted hover:text-main hover:border-primary/40'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      itemCategoryFilter === tab.id ? 'bg-white/20 text-white' : 'bg-base text-muted'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredItems.map((dish) => {
                const quantity = getItemQuantity(dish._id);
                const isFav = favouriteItems.some((i) => String(i._id) === String(dish._id));
                const sType = getServiceType(dish);
                const sBadgeStyle = getCategoryBadgeStyle(sType);
                const sLabel = getCategoryLabel(sType);

                return (
                  <div
                    key={dish._id}
                    className="bg-surface rounded-3xl p-4 shadow-2xs border border-line flex flex-col justify-between gap-4 transition-all hover:shadow-md hover:scale-[1.01] duration-300 relative group"
                  >
                    <div className="flex gap-4">
                      {/* Image + Veg badge + Category Pill */}
                      <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
                        <img
                          src={getImageUrl(dish.image, sType === 'FOOD' ? 'food' : 'product')}
                          alt={dish.name}
                          onError={(e) => handleImageError(e, sType === 'FOOD' ? 'food' : 'product')}
                          className="w-full h-full object-cover rounded-2xl bg-base border border-line shadow-2xs"
                          loading="lazy"
                        />
                        {/* Veg / Non-Veg Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <VegBadge isVeg={dish.isVeg} size="xs" className="shadow-xs backdrop-blur-xs bg-white/95 dark:bg-[#141926]/95" />
                        </div>

                        {/* Heart Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleItem(dish);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-[#141926]/90 shadow-sm border border-gray-100 dark:border-white/10 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                          title={t('favourites.removeFromFavourites', 'Remove from Favourites')}
                        >
                          <Heart className={`w-4 h-4 transition-colors ${
                            isFav
                              ? 'text-red-500 fill-red-500'
                              : 'text-gray-400 hover:text-red-500'
                          }`} />
                        </button>
                      </div>

                      {/* Info Details */}
                      <div className="flex flex-col gap-1 flex-grow justify-between py-0.5 min-w-0">
                        <div>
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${sBadgeStyle}`}>
                              {sLabel}
                            </span>
                            {dish.category && dish.category !== sLabel && (
                              <span className="text-[10px] font-bold text-muted bg-base px-1.5 py-0.5 rounded-md border border-line truncate max-w-[120px]">
                                {dish.category}
                              </span>
                            )}
                          </div>

                          <h3 className="font-display font-extrabold text-sm text-main line-clamp-1">
                            {dish.name}
                          </h3>
                          {dish.nameTelugu && (
                            <p className="text-[11px] text-muted line-clamp-1">
                              {dish.nameTelugu}
                            </p>
                          )}
                          <p className="text-[11px] text-muted font-medium line-clamp-1 mt-0.5">
                            {dish.weight || dish.packSize || dish.unit || dish.description || 'Fresh & quality guaranteed'}
                          </p>
                        </div>

                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-sm sm:text-base font-black text-main">₹{dish.price}</span>
                          {dish.mrp > dish.price && (
                            <>
                              <span className="text-[10px] text-muted line-through">₹{dish.mrp}</span>
                              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                                {Math.round(((dish.mrp - dish.price) / dish.mrp) * 100)}% OFF
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Sold by & Add to Cart */}
                    <div className="border-t border-line pt-3 mt-1 flex justify-between items-center">
                      <div className="flex flex-col gap-0.5 max-w-[55%]">
                        <span className="text-[9px] text-muted font-bold uppercase tracking-wider">{t('restaurant.soldBy', 'Sold by')}</span>
                        <span className="text-xs font-bold text-main truncate">
                          {dish.restaurant?.name || (sType !== 'FOOD' ? `Jinkzo Store (${sLabel})` : 'Jinkzo Store')}
                        </span>
                      </div>

                      {/* Cart Quantity Control */}
                      <div className="bg-surface border border-line shadow-xs rounded-xl flex items-center justify-between w-24 overflow-hidden h-9 flex-shrink-0">
                        {quantity > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => removeItem(dish._id)}
                              className="w-8 h-full flex items-center justify-center hover:bg-base text-red-500 font-black text-sm cursor-pointer transition-colors"
                            >
                              -
                            </button>
                            <span className="text-xs font-extrabold text-main">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(dish)}
                              className="w-8 h-full flex items-center justify-center hover:bg-base text-red-500 font-black text-sm cursor-pointer transition-colors"
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(dish)}
                            className="w-full h-full flex items-center justify-center gap-1 text-xs font-black text-red-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                          >
                            <span>{t('restaurant.add', 'ADD')}</span>
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
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 flex items-center justify-center mb-1">
                <UtensilsCrossed className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-display font-extrabold text-lg text-main">
                {itemCategoryFilter === 'ALL'
                  ? t('favourites.noFavouriteDishes', 'No favourite items yet')
                  : `No favourite ${getCategoryLabel(itemCategoryFilter)} items yet`}
              </h3>
              <p className="text-xs text-muted max-w-xs leading-relaxed font-medium">
                {itemCategoryFilter === 'ALL'
                  ? t('favourites.noFavouriteDishesDesc', 'Tap the heart on any food, grocery, bakery, veg & fruits, or meat item to save it here.')
                  : `Tap the heart on any ${getCategoryLabel(itemCategoryFilter).toLowerCase()} item to save it to your favourites.`}
              </p>
              <Link
                to="/restaurants"
                className="mt-3 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-red-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>{t('favourites.exploreDishes', 'Explore Items')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: HOTELS TAB ── */}
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
              <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 flex items-center justify-center mb-1">
                <Heart className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-display font-extrabold text-lg text-main">
                {t('favourites.noFavouriteRestaurants', 'No favourite hotels yet')}
              </h3>
              <p className="text-xs text-muted max-w-xs leading-relaxed font-medium">
                {t('favourites.noFavouriteRestaurantsDesc', 'Add hotels and restaurants to see them here for fast ordering.')}
              </p>
              <Link
                to="/restaurants"
                className="mt-3 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-red-500/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>{t('favourites.exploreRestaurants', 'Explore Restaurants')}</span>
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
