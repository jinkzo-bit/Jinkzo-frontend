import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Star,
  Clock,
  Bike,
  Plus,
  Minus,
  Check,
  ArrowUpDown,
  Flame,
  Heart,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Tag
} from 'lucide-react';
import RestaurantCard from '../components/RestaurantCard';
import { useCartStore } from '../store/cartStore';
import { useFavoriteStore } from '../store/favoriteStore';
import { useTranslation } from '../store/languageStore';
import { API_BASE } from '../config/api';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';

// Fallback Food Categories (Food only)
const foodCategories = [
  { name: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Starters', image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Desserts', image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=200&h=200&q=80' },
  { name: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=200&h=200&q=80' }
];

// Default fallback banners for store dashboards
const DEFAULT_STORE_BANNERS = {
  GROCERY: [
    {
      _id: 'def_gro_1',
      title: 'Daily Essentials & Fresh Groceries',
      description: 'Up to 30% OFF on Atta, Dal, Oils & Household Needs',
      imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&h=450&q=80'
    },
    {
      _id: 'def_gro_2',
      title: 'Super Saver Staples Mega Fest',
      description: 'Lowest prices on branded staples & snacks delivered fast',
      imageUrl: 'https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?auto=format&fit=crop&w=1200&h=450&q=80'
    }
  ],
  BAKERY: [
    {
      _id: 'def_bak_1',
      title: 'Oven-Fresh Delights & Cool Cakes',
      description: 'Freshly baked pastries, puffs, goli soda & artisan bread',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&h=450&q=80'
    },
    {
      _id: 'def_bak_2',
      title: 'Celebration Cool Cakes & Sweets',
      description: 'Special customized birthday cakes & creamy milkshakes',
      imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&h=450&q=80'
    }
  ],
  VEG_FRUITS: [
    {
      _id: 'def_veg_1',
      title: 'Farm Fresh Vegetables & Sweet Fruits',
      description: 'Direct from local farms, RO washed and 100% graded',
      imageUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1200&h=450&q=80'
    },
    {
      _id: 'def_veg_2',
      title: 'Daily Harvest Organic Green Palak & Apples',
      description: 'Crisp apples, seasonal fruits & nutrient packed greens',
      imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&h=450&q=80'
    }
  ],
  MEAT: [
    {
      _id: 'def_mea_1',
      title: '100% Hygienic Fresh Meat & Tender Cuts',
      description: 'Farm-fresh chicken, tender mutton, sea fish & fresh eggs',
      imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1200&h=450&q=80'
    },
    {
      _id: 'def_mea_2',
      title: 'Tender Curry Cuts & Boneless Fillets',
      description: 'RO washed, vacuum packed and delivered fresh to your door',
      imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&h=450&q=80'
    }
  ]
};

export default function RestaurantListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeBanners, setStoreBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Identify Active Dashboard
  const categoryParam = searchParams.get('category') || '';
  let activeDashboard = 'food';
  let storeServiceEnum = null;

  if (categoryParam === 'beverages' || categoryParam === 'hot_cool' || categoryParam === 'cool_hot') {
    activeDashboard = 'cool_hot';
    storeServiceEnum = 'BAKERY';
  } else if (categoryParam === 'grocery') {
    activeDashboard = 'grocery';
    storeServiceEnum = 'GROCERY';
  } else if (categoryParam === 'meat') {
    activeDashboard = 'meat';
    storeServiceEnum = 'MEAT';
  } else if (categoryParam === 'fruits-vegetables' || categoryParam === 'veg_fruits') {
    activeDashboard = 'veg_fruits';
    storeServiceEnum = 'VEG_FRUITS';
  }

  const isStoreSection = activeDashboard !== 'food';

  const [dynamicCategories, setDynamicCategories] = useState([]);

  // Fetch Categories
  useEffect(() => {
    let isMounted = true;
    const srvQuery = isStoreSection ? storeServiceEnum : 'food';
    fetch(`${API_BASE}/categories?service=${srvQuery}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setDynamicCategories(data);
        } else if (isMounted) {
          setDynamicCategories([]);
        }
      })
      .catch(err => {
        console.error('Categories fetch error:', err);
        if (isMounted) setDynamicCategories([]);
      });
    return () => { isMounted = false; };
  }, [activeDashboard, storeServiceEnum]);

  // Fetch Store Advertisements (Banners)
  useEffect(() => {
    if (!isStoreSection) return;
    let isMounted = true;
    fetch(`${API_BASE}/advertisements?serviceType=${storeServiceEnum}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setStoreBanners(data);
          } else {
            setStoreBanners(DEFAULT_STORE_BANNERS[storeServiceEnum] || []);
          }
          setCurrentBannerIndex(0);
        }
      })
      .catch(() => {
        if (isMounted) setStoreBanners(DEFAULT_STORE_BANNERS[storeServiceEnum] || []);
      });
    return () => { isMounted = false; };
  }, [storeServiceEnum, isStoreSection]);

  // Auto rotate banner carousel
  useEffect(() => {
    if (!isStoreSection || storeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % storeBanners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [storeBanners.length, isStoreSection]);

  const activeCategories = (dynamicCategories && dynamicCategories.length > 0) ? dynamicCategories : (isStoreSection ? [] : foodCategories);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCuisine, setSelectedCuisine] = useState(searchParams.get('cuisine') || 'All');
  const [isPureVeg, setIsPureVeg] = useState(searchParams.get('veg') === 'true');
  const [activeSort, setActiveSort] = useState(searchParams.get('sort') || 'rating');

  // Zustand Cart Integration
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Favourites Zustand Integration
  const favouriteItems = useFavoriteStore((state) => state.favouriteItems);
  const toggleItem = useFavoriteStore((state) => state.toggleItem);

  const [conflictModal, setConflictModal] = useState({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null });

  useEffect(() => {
    const paramSearch = searchParams.get('search') || '';
    setSearchQuery(paramSearch);
    setSelectedCuisine(searchParams.get('cuisine') || 'All');
    setIsPureVeg(searchParams.get('veg') === 'true');
    setActiveSort(searchParams.get('sort') || 'rating');
  }, [searchParams]);

  // Main Data Fetching (Strict Isolation)
  useEffect(() => {
    const fetchFilteredData = async () => {
      setIsLoading(true);
      try {
        if (!isStoreSection) {
          // ─── FOOD FLOW (100% UNTOUCHED) ───
          const queryParams = new URLSearchParams();
          if (searchQuery) queryParams.set('search', searchQuery);
          if (selectedCuisine && selectedCuisine !== 'All') queryParams.set('cuisine', selectedCuisine);
          if (isPureVeg) queryParams.set('veg', 'true');

          if (selectedCuisine !== 'All') {
            const url = `${API_BASE}/restaurants/dishes/search?${queryParams.toString()}`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              setDishes(Array.isArray(data) ? data : (data.dishes || data.data || []));
            } else {
              setDishes([]);
            }
            setRestaurants([]);
          } else {
            if (activeSort) queryParams.set('sort', activeSort);
            const url = `${API_BASE}/restaurants?${queryParams.toString()}`;
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              setRestaurants(Array.isArray(data) ? data : (data.restaurants || data.data || []));
            } else {
              setRestaurants([]);
            }

            if (searchQuery) {
              const dishParams = new URLSearchParams();
              dishParams.set('search', searchQuery);
              if (isPureVeg) dishParams.set('veg', 'true');
              const dishesUrl = `${API_BASE}/restaurants/dishes/search?${dishParams.toString()}`;
              const dishesRes = await fetch(dishesUrl);
              if (dishesRes.ok) {
                const dishesData = await dishesRes.json();
                setDishes(Array.isArray(dishesData) ? dishesData : (dishesData.dishes || dishesData.data || []));
              } else {
                setDishes([]);
              }
            } else {
              setDishes([]);
            }
          }
        } else {
          // ─── STORE FLOW: GROCERY, BAKERY, VEG & FRUITS, MEAT ───
          setRestaurants([]); // Strictly NO restaurant cards
          setDishes([]);

          const params = new URLSearchParams();
          params.set('serviceType', storeServiceEnum);
          if (selectedCuisine && selectedCuisine !== 'All') params.set('category', selectedCuisine);
          if (searchQuery) params.set('search', searchQuery);

          const res = await fetch(`${API_BASE}/products?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            let prods = Array.isArray(data) ? data : [];

            // Sort products
            if (activeSort === 'costAsc') prods.sort((a, b) => a.price - b.price);
            else if (activeSort === 'costDesc') prods.sort((a, b) => b.price - a.price);

            setProducts(prods);
          } else {
            setProducts([]);
          }
        }
      } catch (err) {
        console.error('Fetch filtering data error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredData();
  }, [activeDashboard, storeServiceEnum, isStoreSection, searchQuery, selectedCuisine, isPureVeg, activeSort]);

  const updateUrlParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'All' && value !== false) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleCuisineClick = (cuisine) => {
    const nextVal = selectedCuisine.toLowerCase() === cuisine.toLowerCase() ? 'All' : cuisine;
    setSelectedCuisine(nextVal);
    updateUrlParam('cuisine', nextVal);
  };

  const handleVegToggle = () => {
    const nextVal = !isPureVeg;
    setIsPureVeg(nextVal);
    updateUrlParam('veg', nextVal ? 'true' : null);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setActiveSort(val);
    updateUrlParam('sort', val);
  };

  const handleAddToCart = (dish) => {
    const isStore = dish.serviceType && ['GROCERY', 'BAKERY', 'VEG_FRUITS', 'MEAT'].includes(dish.serviceType);
    const storeRest = {
      _id: 'store_jinkzo',
      name: `Jinkzo Store (${dish.serviceType || 'STORE'})`,
      deliveryTime: 25,
      isClosed: false
    };

    const result = addItem(dish, isStore ? storeRest : (dish.restaurant || { name: 'Jinkzo Store', _id: 'rest_default' }));
    if (result && result.conflict) {
      setConflictModal({
        isOpen: true,
        message: result.message,
        pendingItem: dish,
        pendingRestaurant: dish.restaurant
      });
    }
  };

  const getItemQuantity = (itemId) => {
    const matched = cartItems.find((i) => String(i.menuItemId || i.productId) === String(itemId));
    return matched ? matched.quantity : 0;
  };

  const activeBanner = storeBanners[currentBannerIndex] || storeBanners[0];

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-7xl mx-auto px-4 md:px-8 w-full animate-fade-in transition-colors duration-300">

      {/* ═══════════════════════════════════════════════════════════
          SECTION TOP: CONDITIONAL BY DASHBOARD TYPE
          - FOOD: "What's on your mind?" + Pure Veg + Sort (UNTOUCHED)
          - STORE (Grocery, Bakery, Veg, Meat): Admin Advertisement Carousel + Category Pills
         ═══════════════════════════════════════════════════════════ */}

      {!isStoreSection ? (
        /* ─── FOOD DASHBOARD TOP BLOCK (100% UNTOUCHED) ─── */
        <section className="bg-surface rounded-3xl p-5 sm:p-6 shadow-2xs border border-line flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-black text-lg sm:text-xl text-main tracking-tight">
                {t('restaurant.whatsOnYourMind', "What's on your mind?")}
              </h2>
              {selectedCuisine !== 'All' && (
                <button
                  onClick={() => handleCuisineClick('All')}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  {t('restaurant.resetFilter', 'Reset Filter')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar py-1">
              {activeCategories.map((cat) => {
                const isSelected = selectedCuisine.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleCuisineClick(cat.name)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 group cursor-pointer"
                  >
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 p-0.5 transition-all duration-200 group-hover:scale-105 shadow-sm ${
                      isSelected
                        ? 'border-[#7C3AED] ring-3 ring-[#7C3AED]/25 scale-105 shadow-md'
                        : 'border-transparent hover:border-gray-200 dark:hover:border-white/20'
                    }`}>
                      <img
                        src={getImageUrl(cat.image, 'category')}
                        alt={cat.name}
                        onError={(e) => handleImageError(e, 'category')}
                        className="w-full h-full object-cover rounded-full"
                        loading="lazy"
                      />
                    </div>
                    <span className={`text-[11px] sm:text-xs font-bold text-center max-w-[76px] sm:max-w-[88px] leading-tight transition-colors ${
                      isSelected
                        ? 'text-[#7C3AED] dark:text-[#A78BFA] font-black'
                        : 'text-muted group-hover:text-main'
                    }`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-row lg:flex-col items-stretch justify-end gap-3 flex-shrink-0 pt-3 lg:pt-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-line">
            <button
              onClick={handleVegToggle}
              className={`flex items-center justify-center lg:justify-start gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                isPureVeg
                  ? 'bg-green-50 dark:bg-green-950/40 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 font-extrabold'
                  : 'bg-base dark:bg-[#1C2233] border-line text-muted hover:border-line-strong'
              }`}
            >
              <span className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${isPureVeg ? 'border-green-600 dark:border-green-400' : 'border-gray-400'}`}>
                {isPureVeg && <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-xs" />}
              </span>
              <span>{t('restaurant.pureVeg', 'Pure Veg')}</span>
            </button>

            <div className="flex items-center gap-2 text-muted border border-line bg-base dark:bg-[#1C2233] rounded-2xl px-3.5 py-2.5 text-xs font-bold shadow-2xs">
              <ArrowUpDown className="w-4 h-4 text-muted flex-shrink-0" />
              <select
                value={activeSort}
                onChange={handleSortChange}
                className="bg-transparent outline-none border-none text-main dark:text-white cursor-pointer text-xs font-bold pr-1 w-full"
              >
                <option value="rating" className="bg-surface text-main dark:bg-[#141926] dark:text-white">{t('restaurant.sortRating', 'Sort by: Rating (High to Low)')}</option>
                <option value="deliveryTime" className="bg-surface text-main dark:bg-[#141926] dark:text-white">{t('restaurant.sortDeliveryTime', 'Sort by: Delivery Time')}</option>
                <option value="costAsc" className="bg-surface text-main dark:bg-[#141926] dark:text-white">{t('restaurant.sortPriceLowHigh', 'Sort by: Price (Low to High)')}</option>
                <option value="costDesc" className="bg-surface text-main dark:bg-[#141926] dark:text-white">{t('restaurant.sortPriceHighLow', 'Sort by: Price (High to Low)')}</option>
              </select>
            </div>
          </div>
        </section>
      ) : (
        /* ─── STORE DASHBOARD TOP BLOCK: ADMIN-MANAGED ADVERTISEMENT CAROUSEL ─── */
        <section className="flex flex-col gap-4">
          
          {/* Responsive Advertisement Banner Carousel */}
          {activeBanner && (
            <div className="relative w-full h-44 sm:h-56 md:h-64 rounded-3xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-slate-800 bg-slate-900 group">
              <img
                src={getImageUrl(activeBanner.imageUrl || activeBanner.image, 'banner')}
                alt={activeBanner.title || 'Store Offer'}
                onError={(e) => handleImageError(e, 'banner')}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102 opacity-85"
              />
              
              {/* Gradient Scrim Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-5 sm:p-7 text-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-2.5 h-2.5" /> Featured Offer
                  </span>
                </div>
                <h2 className="font-display font-black text-lg sm:text-2xl md:text-3xl leading-tight drop-shadow-md">
                  {activeBanner.title}
                </h2>
                {activeBanner.description && (
                  <p className="text-xs sm:text-sm text-slate-200 max-w-xl line-clamp-1 mt-1 font-medium drop-shadow-xs">
                    {activeBanner.description}
                  </p>
                )}
              </div>

              {/* Prev / Next Arrows */}
              {storeBanners.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + storeBanners.length) % storeBanners.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % storeBanners.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Carousel Pagination Dots */}
                  <div className="absolute bottom-3 right-5 flex items-center gap-1.5">
                    {storeBanners.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentBannerIndex(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === currentBannerIndex ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/50 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Clean Category Selection Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => handleCuisineClick('All')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex-shrink-0 ${
                selectedCuisine === 'All'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/50'
              }`}
            >
              All Items
            </button>
            {activeCategories.map((cat) => {
              const isSelected = selectedCuisine.toLowerCase() === cat.name.toLowerCase();
              return (
                <button
                  key={cat._id || cat.name}
                  onClick={() => handleCuisineClick(cat.name)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                    isSelected
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white dark:bg-[#141926] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/50'
                  }`}
                >
                  <img
                    src={getImageUrl(cat.image, 'category')}
                    alt={cat.name}
                    onError={(e) => handleImageError(e, 'category')}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                  <span>{cat.name}</span>
                  {cat.nameTelugu && (
                    <span className="text-[10px] opacity-75 font-normal">({cat.nameTelugu})</span>
                  )}
                </button>
              );
            })}
          </div>

        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          SECTION BOTTOM: LISTING GRID
          - FOOD: Restaurant Cards or Dish Cards
          - STORE: Clean Product Cards with Stock & Quantity Controls
         ═══════════════════════════════════════════════════════════ */}

      <section>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array(8).fill(null).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#141926] rounded-3xl p-4 border border-slate-200 dark:border-slate-800 animate-pulse h-64" />
            ))}
          </div>
        ) : !isStoreSection ? (
          /* FOOD LISTING (100% UNTOUCHED) */
          selectedCuisine === 'All' && !searchQuery ? (
            restaurants.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant._id} restaurant={restaurant} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-surface rounded-3xl border border-line">
                <p className="text-muted text-sm font-semibold">{t('restaurant.noRestaurants', 'No restaurants found matching your criteria.')}</p>
              </div>
            )
          ) : (
            dishes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dishes.map((dish) => {
                  const qty = getItemQuantity(dish._id);
                  return (
                    <div key={dish._id} className="bg-surface rounded-2xl p-4 border border-line flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img src={getImageUrl(dish.image, 'product')} alt={dish.name} onError={(e) => handleImageError(e, 'product')} className="w-16 h-16 rounded-xl object-cover" />
                        <div>
                          <h4 className="font-bold text-xs">{dish.name}</h4>
                          <span className="font-black text-sm">₹{dish.price}</span>
                        </div>
                      </div>
                      {qty > 0 ? (
                        <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-2 py-1">
                          <button onClick={() => removeItem(dish._id)}><Minus className="w-3.5 h-3.5 text-primary" /></button>
                          <span className="font-bold text-xs">{qty}</span>
                          <button onClick={() => handleAddToCart(dish)}><Plus className="w-3.5 h-3.5 text-primary" /></button>
                        </div>
                      ) : (
                        <button onClick={() => handleAddToCart(dish)} className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl">ADD</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-surface rounded-3xl border border-line">
                <p className="text-muted text-sm font-semibold">{t('restaurant.noDishes', 'No dishes found matching your criteria.')}</p>
              </div>
            )
          )
        ) : (
          /* STORE PRODUCTS LISTING (GROCERY, BAKERY, VEG & FRUITS, MEAT) */
          products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {products.map((item) => {
                const qty = getItemQuantity(item._id);
                const isOutOfStock = item.stock <= 0;
                return (
                  <div
                    key={item._id}
                    className="bg-white dark:bg-[#141926] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-amber-500/40 hover:shadow-md transition-all group relative"
                  >
                    {/* Item Image & Badges */}
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-850">
                      <img
                        src={getImageUrl(item.image, 'product')}
                        alt={item.name}
                        onError={(e) => handleImageError(e, 'product')}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {item.isBestSeller && (
                        <span className="absolute top-2 left-2 bg-amber-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs">
                          Bestseller
                        </span>
                      )}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-2xs flex items-center justify-center">
                          <span className="text-white text-[10px] font-black uppercase tracking-wider bg-rose-600 px-2.5 py-1 rounded-full shadow-md">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Names & Weight */}
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider line-clamp-1">
                        {item.category}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {item.name}
                      </h4>
                      {item.nameTelugu && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-400 line-clamp-1">
                          {item.nameTelugu}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {item.weight || item.packSize || item.unit}
                      </span>
                    </div>

                    {/* Pricing & Add Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-display font-black text-sm sm:text-base text-slate-900 dark:text-white">
                            ₹{item.price}
                          </span>
                          {item.mrp > item.price && (
                            <span className="text-[10px] text-slate-400 line-through">
                              ₹{item.mrp}
                            </span>
                          )}
                        </div>
                        {item.mrp > item.price && (
                          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                            {Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF
                          </span>
                        )}
                      </div>

                      {/* Quantity Selector or Add Button */}
                      {qty > 0 ? (
                        <div className="flex items-center gap-2 bg-amber-500 text-white rounded-xl px-2.5 py-1.5 shadow-xs font-black text-xs">
                          <button
                            onClick={() => removeItem(item._id)}
                            className="hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          >
                            <Minus className="w-3 h-3 stroke-[3]" />
                          </button>
                          <span className="min-w-4 text-center">{qty}</span>
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(item)}
                          className="bg-slate-900 dark:bg-white hover:bg-amber-500 dark:hover:bg-amber-500 text-white dark:text-slate-950 hover:text-white dark:hover:text-white font-black text-xs px-4 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                        >
                          ADD
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-[#141926] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center gap-3 shadow-xs">
              <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-700" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Products Available</h4>
              <p className="text-xs text-slate-500 max-w-sm">No items found matching the selected category or search filter.</p>
            </div>
          )
        )}
      </section>

    </div>
  );
}
