import { API_BASE } from '../config/api';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Clock, AlertTriangle, ChevronRight, ShoppingBag, Search, X, Heart } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useFavoriteStore } from '../store/favoriteStore';

const menuCategories = ['Starters', 'Burgers', 'Pizza', 'Biryani', 'Main Course', 'Desserts', 'Drinks'];

export default function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);

  const isHotelFavourite = useFavoriteStore((state) => state.isHotelFavourite);
  const toggleHotel = useFavoriteStore((state) => state.toggleHotel);
  const isItemFavourite = useFavoriteStore((state) => state.isItemFavourite);
  const toggleItem = useFavoriteStore((state) => state.toggleItem);

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Starters');
  const [searchQuery, setSearchQuery] = useState('');

  // Zustand Cart Integration
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const getCalculations = useCartStore((state) => state.getCalculations);
  const cartRestaurant = useCartStore((state) => state.restaurant);

  // Cart conflict modal state
  const [conflictModal, setConflictModal] = useState({ isOpen: false, message: '', pendingItem: null });

  useEffect(() => {
    const fetchRestaurantDetail = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/restaurants/${id}`);
        if (res.ok) {
          const data = await res.json();
          // Split expanded menu fields
          const { menu, ...rest } = data;
          setRestaurant(rest);
          setMenuItems(menu || []);
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Fetch detail error:', err);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurantDetail();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="h-[220px] skeleton-3xl" />
        <div className="h-8 skeleton w-1/3" />
        <div className="h-4 skeleton w-2/3" />
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="h-[120px] skeleton-2xl" />
          <div className="h-[120px] skeleton-2xl" />
          <div className="h-[120px] skeleton-2xl" />
          <div className="h-[120px] skeleton-2xl" />
        </div>
      </div>
    );
  }

  // Filter menu items by search query
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Group menu by category
  const groupedMenu = filteredMenuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Add Item to cart with same-restaurant check
  const handleAddToCart = (item) => {
    const result = addItem(item, restaurant);
    if (result.conflict) {
      setConflictModal({
        isOpen: true,
        message: result.message,
        pendingItem: item
      });
    }
  };

  const confirmConflictReset = () => {
    clearCart();
    addItem(conflictModal.pendingItem, restaurant);
    setConflictModal({ isOpen: false, message: '', pendingItem: null });
  };

  // Check if item is in cart and return its quantity
  const getItemQuantity = (itemId) => {
    const matched = cartItems.find((i) => String(i.menuItemId) === String(itemId));
    return matched ? matched.quantity : 0;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 pb-32 animate-fade-in relative flex flex-col gap-8">

      {/* cover Image Banner */}
      <section className="relative rounded-3xl overflow-hidden h-[240px] md:h-[300px] shadow-md">
        <img
          src={restaurant.image}
          alt={restaurant.name}
          className="w-full h-full object-cover"
        />

        {/* Restaurant Heart Button */}
        <button
          onClick={() => toggleHotel(restaurant)}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 dark:bg-[#141926]/90 shadow-lg border border-gray-100 dark:border-white/10 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10 backdrop-blur-xs"
          title={isHotelFavourite(restaurant._id) ? 'Remove from Favourites' : 'Add to Favourites'}
        >
          <Heart className={`w-5 h-5 transition-colors ${
            isHotelFavourite(restaurant._id)
              ? 'text-[#7C3AED] fill-[#7C3AED]'
              : 'text-gray-400 hover:text-[#7C3AED]'
          }`} />
        </button>

        <div className="absolute inset-0 bg-black/45 flex flex-col justify-end p-6 md:p-8 text-white backdrop-blur-3xs">
          <div className="flex flex-col gap-2">
            <h1 className="font-display font-extrabold text-2xl md:text-4xl leading-tight">
              {restaurant.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-gray-200">
              <div className="flex items-center gap-0.5 bg-green-600 font-extrabold px-1.5 py-0.5 rounded text-white text-xs">
                <Star className="w-3.5 h-3.5 fill-white stroke-white" />
                <span>{restaurant.rating.toFixed(1)}</span>
              </div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              <div className="flex items-center gap-1 font-semibold">
                <Clock className="w-4 h-4 text-violet-400" />
                <span>{restaurant.deliveryTime} mins</span>
              </div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              <span className="font-semibold">{restaurant.cuisineTags.join(', ')}</span>
            </div>
            <p className="text-xs text-gray-300 mt-1.5 truncate max-w-lg">{restaurant.address}</p>
          </div>
        </div>
      </section>

      {restaurant.isClosed && (
        <div className="bg-red-50/70 border border-red-200 rounded-3xl p-5 text-red-800 flex items-center gap-3 animate-fade-in shadow-2xs">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h4 className="font-display font-extrabold text-sm uppercase tracking-wider">Hotel Temporarily Closed</h4>
            <p className="text-xs mt-0.5 leading-relaxed font-semibold">We are not accepting orders at this time. You can explore the menu but adding items to the cart is disabled.</p>
          </div>
        </div>
      )}

      {/* Active Coupons / Offers Section */}
      {(() => {
        const activeOffers = restaurant.offers
          ? restaurant.offers.filter(o => o.active && !(user && user.usedPromos && user.usedPromos.includes(o.code.toUpperCase())))
          : [];

        if (activeOffers.length === 0) return null;

        return (
          <section className="flex flex-col gap-3 animate-fade-in">
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-[9px] uppercase font-extrabold tracking-widest text-primary bg-primary-light px-2.5 py-1 rounded-md">
                Offers for You
              </span>
              <span className="text-[10px] text-muted font-semibold">• Tap a code to copy & apply at checkout</span>
            </div>
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1 px-1">
              {activeOffers.map((offer, idx) => (
                <div
                  key={idx}
                  className="bg-surface border border-gray-150 rounded-2xl p-4 shadow-3xs flex flex-col justify-between min-w-[210px] max-w-[230px] flex-shrink-0 relative overflow-hidden group hover:border-primary/30 transition-all cursor-pointer select-none"
                  onClick={() => {
                    navigator.clipboard.writeText(offer.code);
                    alert(`Promo code "${offer.code}" copied! Paste it in your checkout cart.`);
                  }}
                >
                  {/* Decorative circle */}
                  <div className="absolute -right-4 -top-4 w-12 h-12 bg-primary/5 rounded-full group-hover:scale-125 transition-transform" />

                  <div className="flex flex-col gap-1">
                    <span className="font-mono font-black text-xs text-main tracking-wider bg-base border border-gray-150 px-2 py-0.5 rounded-lg w-max">
                      {offer.code}
                    </span>
                    <p className="text-xs font-black text-main mt-1">₹{offer.discount} Flat Discount</p>
                    <p className="text-[10px] text-muted font-medium">On orders above ₹{offer.minAmount}</p>
                  </div>

                  {offer.applicableItemName ? (
                    <div className="mt-2.5 text-[8px] font-bold text-primary flex items-center gap-1 bg-violet-50/70 border border-violet-100 px-2 py-0.5 rounded-md w-max">
                      🎯 Only on {offer.applicableItemName}
                    </div>
                  ) : (
                    <div className="mt-2.5 text-[8px] font-bold text-muted flex items-center gap-1 bg-base border border-gray-150 px-2 py-0.5 rounded-md w-max">
                      🍽️ Valid on all dishes
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Search Input Filter */}
      <section className="bg-surface border border-line p-3.5 rounded-3xl shadow-2xs flex items-center gap-3 w-full max-w-md animate-fade-in">
        <Search className="w-5 h-5 text-muted flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search menu items..."
          className="bg-transparent text-xs font-semibold text-main outline-none flex-grow placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 hover:bg-base rounded-lg text-muted hover:text-gray-650 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </section>

      {/* Main menu content */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sticky Sidebar Navigation (Desktop) */}
        <aside className="hidden md:block w-[200px] sticky top-24 bg-surface rounded-2xl p-3 border border-line shadow-xs flex-shrink-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted px-3 mb-2">Categories</p>
          <div className="flex flex-col gap-1">
            {menuCategories.map((category) => {
              const hasItems = groupedMenu[category]?.length > 0;
              return (
                <button
                  key={category}
                  disabled={!hasItems}
                  onClick={() => {
                    setActiveCategory(category);
                    document.getElementById(category)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                    activeCategory === category
                      ? 'bg-primary-light text-primary'
                      : 'text-muted hover:bg-base disabled:opacity-40 disabled:hover:bg-transparent'
                  }`}
                >
                  <span>{category}</span>
                  {hasItems && <span className="text-[10px] bg-gray-100 text-muted font-semibold px-1.5 py-0.5 rounded-md">{groupedMenu[category].length}</span>}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Sticky Mobile Categories Bar */}
        <div className="md:hidden sticky top-18 z-20 bg-surface/95 w-full border-b border-line py-2 flex gap-2 overflow-x-auto no-scrollbar glass px-1">
          {menuCategories.map((category) => {
            const hasItems = groupedMenu[category]?.length > 0;
            if (!hasItems) return null;
            return (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  document.getElementById(category)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-full transition-all flex-shrink-0 border cursor-pointer ${
                  activeCategory === category
                    ? 'bg-primary-light text-primary border-primary-light'
                    : 'bg-surface text-muted border-line'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Menu Items List */}
        <div className="flex-grow flex flex-col gap-8 w-full">
          {filteredMenuItems.length === 0 ? (
            <div className="bg-surface rounded-3xl p-16 text-center flex flex-col items-center justify-center border border-line shadow-2xs gap-3">
              <Search className="w-12 h-12 text-gray-300" />
              <h4 className="font-display font-extrabold text-sm text-main">No matching dishes found</h4>
              <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold">Try searching for other dish names or keywords!</p>
            </div>
          ) : (
            menuCategories.map((category) => {
            const categoryItems = groupedMenu[category] || [];
            if (categoryItems.length === 0) return null;

            return (
              <section
                id={category}
                key={category}
                className="flex flex-col gap-4 scroll-mt-28"
              >
                <div className="border-b border-line pb-2 flex items-center justify-between">
                  <h2 className="font-display font-extrabold text-xl text-main">
                    {category}
                  </h2>
                  <span className="text-xs text-muted font-medium">{categoryItems.length} items</span>
                </div>

                <div className="flex flex-col gap-6">
                  {categoryItems.map((item) => {
                    const quantity = getItemQuantity(item._id);
                    const isRestClosed = restaurant.isClosed;
                    const isItemUnavailable = item.isAvailable === false;
                    const isDisabled = isRestClosed || isItemUnavailable;

                    return (
                      <div
                        key={item._id}
                        className={`bg-surface rounded-2xl p-4 shadow-2xs border border-line flex items-center justify-between gap-4 transition-all hover:shadow-sm ${isDisabled ? 'opacity-75' : ''}`}
                      >
                        {/* Food description info */}
                        <div className="flex-grow flex flex-col gap-1.5 max-w-[70%]">
                          {/* Veg/Non-Veg Badge */}
                          <div className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center p-0.5 flex-shrink-0 ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                          </div>

                          <h3 className="font-display font-semibold text-base text-main">
                            {item.name}
                          </h3>
                          <p className="text-sm font-bold text-main">₹{item.price}</p>
                          <p className="text-xs text-muted leading-relaxed font-medium line-clamp-2 md:line-clamp-none">
                            {item.description}
                          </p>
                        </div>

                        {/* Dish photo with Add logic */}
                        <div className="relative flex flex-col items-center flex-shrink-0 w-24 h-24 md:w-28 md:h-28">
                          {isItemUnavailable && (
                            <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs rounded-2xl flex items-center justify-center z-10">
                              <span className="bg-gray-700 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-1 rounded-md shadow-xs">
                                Out of Stock
                              </span>
                            </div>
                          )}
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover rounded-2xl bg-base border border-line shadow-2xs"
                            loading="lazy"
                          />

                          {/* Item Heart Button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleItem({
                                ...item,
                                restaurant: { name: restaurant.name, _id: restaurant._id }
                              });
                            }}
                            className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/90 dark:bg-[#141926]/90 shadow-sm border border-gray-100 dark:border-white/10 hover:scale-110 active:scale-95 transition-all cursor-pointer z-10"
                            title={isItemFavourite(item._id) ? 'Remove from Favourites' : 'Add to Favourites'}
                          >
                            <Heart className={`w-3.5 h-3.5 transition-colors ${
                              isItemFavourite(item._id)
                                ? 'text-[#7C3AED] fill-[#7C3AED]'
                                : 'text-gray-400 hover:text-[#7C3AED]'
                            }`} />
                          </button>

                          {/* Quantity control overlays */}
                          {isDisabled ? (
                            <div className="absolute -bottom-3.5 bg-gray-100 border border-line-strong rounded-xl flex items-center justify-center w-[85%] h-9 shadow-md">
                              <span className="text-[9px] font-black text-muted uppercase tracking-wider">
                                {isRestClosed ? 'Closed' : 'Unavailable'}
                              </span>
                            </div>
                          ) : (
                            <div className="absolute -bottom-3.5 bg-surface shadow-md border border-line rounded-xl flex items-center justify-between w-[80%] overflow-hidden h-9">
                              {quantity > 0 ? (
                                <>
                                  <button
                                    onClick={() => removeItem(item._id)}
                                    className="w-8 h-full flex items-center justify-center hover:bg-base text-primary font-black text-sm cursor-pointer transition-colors"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-extrabold text-main">{quantity}</span>
                                  <button
                                    onClick={() => handleAddToCart(item)}
                                    className="w-8 h-full flex items-center justify-center hover:bg-base text-primary font-black text-sm cursor-pointer transition-colors"
                                  >
                                    +
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleAddToCart(item)}
                                  className="w-full h-full text-center text-xs font-black text-primary hover:bg-violet-50/50 cursor-pointer uppercase transition-colors"
                                >
                                  Add
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          }))}
        </div>
      </div>

      {/* Same restaurant conflict modal popup */}
      {conflictModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in backdrop-blur-xs">
          <div className="bg-surface rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-line flex flex-col items-center text-center gap-4 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-violet-50 text-primary flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-lg text-main">Clear Cart?</h3>
              <p className="text-xs text-muted mt-1 px-2 leading-relaxed">
                {conflictModal.message}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full mt-2">
              <button
                onClick={() => setConflictModal({ isOpen: false, message: '', pendingItem: null })}
                className="flex-grow bg-gray-100 hover:skeleton text-main font-bold text-xs py-3 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmConflictReset}
                className="flex-grow bg-primary hover:bg-primary-hover text-white font-bold text-xs py-3 rounded-xl cursor-pointer shadow-md transition-colors"
              >
                Clear & Add
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
