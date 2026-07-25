import { API_BASE } from '../config/api';
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, Clock, CircleDot, ArrowUpDown, AlertTriangle } from 'lucide-react';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantsMapView from '../components/RestaurantsMapView';
import { useCartStore } from '../store/cartStore';

const cuisineList = ['All', 'Biryani', 'Burgers', 'Pizza', 'Healthy', 'Chinese', 'Sushi', 'Desserts', 'Mexican', 'Indian', 'South Indian', 'Noodles'];

export default function RestaurantListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        }
      );
    }
  }, []);

  // States tied to filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [searchVal, setSearchVal] = useState(searchParams.get('search') || '');
  const [selectedCuisine, setSelectedCuisine] = useState(searchParams.get('cuisine') || 'All');
  const [isPureVeg, setIsPureVeg] = useState(searchParams.get('veg') === 'true');
  const [activeSort, setActiveSort] = useState(searchParams.get('sort') || 'rating');

  // Zustand Cart Integration
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);

  // Cart conflict modal state
  const [conflictModal, setConflictModal] = useState({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null });

  useEffect(() => {
    // Sync UI states with URL params if modified externally
    const paramSearch = searchParams.get('search') || '';
    setSearchQuery(paramSearch);
    setSearchVal(paramSearch);
    setSelectedCuisine(searchParams.get('cuisine') || 'All');
    setIsPureVeg(searchParams.get('veg') === 'true');
    setActiveSort(searchParams.get('sort') || 'rating');
  }, [searchParams]);

  // Debounce search query input to URL params and active filter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchVal !== searchQuery) {
        setSearchQuery(searchVal);
        updateUrlParam('search', searchVal);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchVal, searchQuery]);

  useEffect(() => {
    const fetchFilteredRestaurantsOrDishes = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.set('search', searchQuery);
        if (selectedCuisine && selectedCuisine !== 'All') queryParams.set('cuisine', selectedCuisine);
        if (isPureVeg) queryParams.set('veg', 'true');

        if (selectedCuisine !== 'All') {
          // Fetch dishes directly
          const url = `${API_BASE}/restaurants/dishes/search?${queryParams.toString()}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setDishes(Array.isArray(data) ? data : (data.dishes || data.data || []));
          } else {
            setDishes([]);
          }
        } else {
          // Fetch restaurants (hotels)
          if (activeSort) queryParams.set('sort', activeSort);
          const url = `${API_BASE}/restaurants?${queryParams.toString()}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            setRestaurants(Array.isArray(data) ? data : (data.restaurants || data.data || []));
          } else {
            setRestaurants([]);
          }

          // Fetch dishes too if searching globally
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
      } catch (err) {
        console.error('Fetch filtering data error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredRestaurantsOrDishes();
  }, [searchQuery, selectedCuisine, isPureVeg, activeSort]);

  // Sync state and search params
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
    setSelectedCuisine(cuisine);
    updateUrlParam('cuisine', cuisine);
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

  // Add Item to cart with same-restaurant check
  const handleAddToCart = (dish) => {
    const result = addItem(dish, dish.restaurant);
    if (result.conflict) {
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

  const getItemQuantity = (itemId) => {
    const matched = cartItems.find((i) => String(i.menuItemId) === String(itemId));
    return matched ? matched.quantity : 0;
  };

  const getSortedDishes = () => {
    if (!Array.isArray(dishes)) return [];
    const sorted = [...dishes];
    if (activeSort === 'costAsc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (activeSort === 'costDesc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (activeSort === 'rating') {
      sorted.sort((a, b) => (b.restaurant?.rating || 0) - (a.restaurant?.rating || 0));
    } else if (activeSort === 'deliveryTime') {
      sorted.sort((a, b) => (a.restaurant?.deliveryTime || 0) - (b.restaurant?.deliveryTime || 0));
    }
    return sorted;
  };

  return (
    <div className="flex flex-col gap-6 pb-24 max-w-7xl mx-auto px-4 md:px-8 w-full animate-fade-in">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-main leading-tight">
            {selectedCuisine === 'All' ? 'Explore Restaurants' : `${selectedCuisine} Recipes`}
          </h1>
          <p className="text-xs text-muted font-medium mt-0.5">
            {selectedCuisine === 'All'
              ? `Showing ${restaurants.length} premium eateries curated for your active location`
              : `Showing ${dishes.length} matching recipes available for delivery`
            }
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
          {/* List/Map Toggle */}
          <div className="flex items-center bg-base border border-line rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted hover:text-main'
              }`}
            >
              📋 List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted hover:text-main'
              }`}
            >
              🗺️ Map
            </button>
          </div>

          {/* Search within results */}
          <div className="flex items-center gap-2 bg-surface border border-line-strong rounded-xl px-3.5 py-2 shadow-2xs max-w-sm w-full">
            <Search className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search for restaurants or dishes..."
              value={searchVal}
              onChange={(e) => {
                setSearchVal(e.target.value);
              }}
              className="text-sm text-main placeholder:text-muted outline-none w-full border-none"
            />
          </div>
        </div>
      </div>

      {/* Filter Bar Panel */}
      <div className="bg-surface rounded-2xl p-4 shadow-2xs border border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Toggle veg + Sort menu */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Veg toggle */}
          <button
            onClick={handleVegToggle}
            className={`flex items-center gap-1.5 px-3.5 py-1.8 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isPureVeg 
                ? 'bg-green-50 border-green-200 text-green-700 font-extrabold shadow-2xs' 
                : 'bg-surface border-line-strong text-muted hover:border-line-strong'
            }`}
          >
            <span className={`w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center ${isPureVeg ? 'border-green-600' : 'border-gray-400'}`}>
              {isPureVeg && <span className="w-1.5 h-1.5 bg-green-600 rounded-xs" />}
            </span>
            <span>Pure Veg</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-muted border border-line-strong bg-surface rounded-xl px-3 py-1.8 text-xs font-bold">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted" />
            <select
              value={activeSort}
              onChange={handleSortChange}
              className="bg-transparent outline-none border-none text-main cursor-pointer pr-1"
            >
              <option value="rating">Sort by: Rating (High to Low)</option>
              <option value="deliveryTime">Sort by: Delivery Time</option>
              <option value="costAsc">Sort by: Price (Low to High)</option>
              <option value="costDesc">Sort by: Price (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Cuisine Filters Container */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-1 md:pb-0">
          {cuisineList.map((cuisine, idx) => (
            <button
              key={idx}
              onClick={() => handleCuisineClick(cuisine)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex-shrink-0 cursor-pointer ${
                (cuisine === 'All' && selectedCuisine === 'All') || (selectedCuisine === cuisine)
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-base border border-line text-muted hover:bg-gray-100'
              }`}
            >
              {cuisine}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(null).map((_, i) => (
              <RestaurantCard key={i} isLoading={true} />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <RestaurantsMapView restaurants={restaurants} userLocation={userLocation} />
        ) : selectedCuisine === 'All' ? (
          searchQuery ? (
            /* Search Query Mode: Display both matching restaurants and matching dishes */
            (restaurants.length > 0 || getSortedDishes().length > 0) ? (
              <div className="flex flex-col gap-10">
                {restaurants.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <h2 className="font-display font-extrabold text-lg text-gray-805 border-b border-line pb-2">
                      Matching Restaurants ({restaurants.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {restaurants.map((restaurant) => (
                        <RestaurantCard key={restaurant._id} restaurant={restaurant} isLoading={false} />
                      ))}
                    </div>
                  </div>
                )}

                {getSortedDishes().length > 0 && (
                  <div className="flex flex-col gap-4 animate-fade-in">
                    <h2 className="font-display font-extrabold text-lg text-gray-805 border-b border-line pb-2">
                      Matching Recipes & Dishes ({getSortedDishes().length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getSortedDishes().map((dish) => {
                        const quantity = getItemQuantity(dish._id);
                        const isRestClosed = dish.restaurant?.isClosed;
                        const isItemUnavailable = dish.isAvailable === false;
                        const isDisabled = isRestClosed || isItemUnavailable;
                        return (
                          <div 
                            key={dish._id} 
                            className={`bg-surface rounded-3xl p-4 shadow-2xs border border-line flex flex-col justify-between gap-4 transition-all hover:shadow-md hover:scale-[1.01] duration-300 ${isDisabled ? 'opacity-75' : ''}`}
                          >
                            <div className="flex gap-4">
                              {/* Image */}
                              <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
                                {isRestClosed && (
                                  <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs rounded-2xl flex items-center justify-center z-10">
                                    <span className="bg-red-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-xs">
                                      Temporarily Closed
                                    </span>
                                  </div>
                                )}
                                {!isRestClosed && isItemUnavailable && (
                                  <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs rounded-2xl flex items-center justify-center z-10">
                                    <span className="bg-gray-700 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-1 rounded-md shadow-xs">
                                      Out of Stock
                                    </span>
                                  </div>
                                )}
                                <img 
                                  src={dish.image} 
                                  alt={dish.name} 
                                  className="w-full h-full object-cover rounded-2xl bg-base border border-line shadow-2xs"
                                  loading="lazy"
                                />
                                {/* Veg Badge */}
                                <span className={`absolute top-2 left-2 w-4 h-4 rounded-xs border-2 bg-surface flex items-center justify-center p-0.5 shadow-sm ${dish.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${dish.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                                </span>
                              </div>
          
                              {/* Dish Info */}
                              <div className="flex flex-col gap-1 flex-grow justify-between py-1">
                                <div>
                                  <h3 className="font-display font-extrabold text-sm text-main line-clamp-1">
                                    {dish.name}
                                  </h3>
                                  <p className="text-xs text-muted font-medium line-clamp-2 mt-0.5">
                                    {dish.description || 'No description provided.'}
                                  </p>
                                </div>
                                
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-sm font-black text-main">₹{dish.price}</span>
                                </div>
                              </div>
                            </div>
          
                            {/* Sold by Restaurant banner & Add to Cart button */}
                            <div className="border-t border-line pt-3 mt-1 flex justify-between items-center">
                              <Link 
                                to={`/restaurant/${dish.restaurant?._id}`}
                                className="flex flex-col gap-0.5 max-w-[60%] cursor-pointer group"
                              >
                                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Sold by</span>
                                <span className="text-xs font-bold text-main truncate group-hover:text-primary transition-colors">
                                  {dish.restaurant?.name || 'Local Kitchen'}
                                </span>
                              </Link>
          
                              {isDisabled ? (
                                <div className="bg-gray-100 border border-line-strong rounded-xl flex items-center justify-center px-3 h-9 flex-shrink-0">
                                  <span className="text-[9px] font-black text-muted uppercase tracking-wider">
                                    {isRestClosed ? 'Closed' : 'Unavailable'}
                                  </span>
                                </div>
                              ) : (
                                <div className="bg-surface border border-gray-150 shadow-xs rounded-xl flex items-center justify-between w-24 overflow-hidden h-9 flex-shrink-0">
                                  {quantity > 0 ? (
                                    <>
                                      <button
                                        onClick={() => removeItem(dish._id)}
                                        className="w-8 h-full flex items-center justify-center hover:bg-base text-primary font-black text-sm cursor-pointer transition-colors"
                                      >
                                        -
                                      </button>
                                      <span className="text-xs font-extrabold text-main">{quantity}</span>
                                      <button
                                        onClick={() => handleAddToCart(dish)}
                                        className="w-8 h-full flex items-center justify-center hover:bg-base text-primary font-black text-sm cursor-pointer transition-colors"
                                      >
                                        +
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleAddToCart(dish)}
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
                  </div>
                )}
              </div>
            ) : (
              /* Empty Search Results View */
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-violet-50 text-primary flex items-center justify-center mb-2">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="font-display font-extrabold text-xl text-main">No results match "{searchQuery}"</h3>
                <p className="text-sm text-muted max-w-xs">We couldn't find any restaurants or recipe items matching your search query.</p>
                <button
                  onClick={() => {
                    setSearchVal('');
                    setSearchQuery('');
                    updateUrlParam('search', null);
                  }}
                  className="bg-primary text-white font-bold text-xs px-5 py-2.5 rounded-xl mt-3 shadow-md cursor-pointer hover:bg-primary-hover"
                >
                  Clear Search Query
                </button>
              </div>
            )
          ) : (
            /* Regular non-search Mode: just show all restaurants */
            restaurants.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant._id} restaurant={restaurant} isLoading={false} />
                ))}
              </div>
            ) : (
              /* Empty Restaurants View */
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-violet-50 text-primary flex items-center justify-center mb-2">
                  <SlidersHorizontal className="w-8 h-8" />
                </div>
                <h3 className="font-display font-extrabold text-xl text-main">No restaurants match your filters</h3>
                <p className="text-sm text-muted max-w-xs">Try clearing some sorting settings, vegetarian checks, or search terms to load results.</p>
                <button
                  onClick={() => {
                    setSearchVal('');
                    setSearchQuery('');
                    setSelectedCuisine('All');
                    setIsPureVeg(false);
                    setActiveSort('rating');
                    setSearchParams({});
                  }}
                  className="bg-primary text-white font-bold text-xs px-5 py-2.5 rounded-xl mt-3 shadow-md cursor-pointer hover:bg-primary-hover"
                >
                  Clear All Filters
                </button>
              </div>
            )
          )
        ) : (
          /* Dishes Grid View */
          getSortedDishes().length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {getSortedDishes().map((dish) => {
                const quantity = getItemQuantity(dish._id);
                const isRestClosed = dish.restaurant?.isClosed;
                const isItemUnavailable = dish.isAvailable === false;
                const isDisabled = isRestClosed || isItemUnavailable;
                return (
                  <div 
                    key={dish._id} 
                    className={`bg-surface rounded-3xl p-4 shadow-2xs border border-line flex flex-col justify-between gap-4 transition-all hover:shadow-md hover:scale-[1.01] duration-300 animate-fade-in ${isDisabled ? 'opacity-75' : ''}`}
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0">
                        {isRestClosed && (
                          <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs rounded-2xl flex items-center justify-center z-10">
                            <span className="bg-red-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow-xs">
                              Temporarily Closed
                            </span>
                          </div>
                        )}
                        {!isRestClosed && isItemUnavailable && (
                          <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs rounded-2xl flex items-center justify-center z-10">
                            <span className="bg-gray-700 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-1 rounded-md shadow-xs">
                              Out of Stock
                            </span>
                          </div>
                        )}
                        <img 
                          src={dish.image} 
                          alt={dish.name} 
                          className="w-full h-full object-cover rounded-2xl bg-base border border-line shadow-2xs"
                          loading="lazy"
                        />
                        {/* Veg Badge */}
                        <span className={`absolute top-2 left-2 w-4 h-4 rounded-xs border-2 bg-surface flex items-center justify-center p-0.5 shadow-sm ${dish.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dish.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                        </span>
                      </div>
 
                      {/* Dish Info */}
                      <div className="flex flex-col gap-1 flex-grow justify-between py-1">
                        <div>
                          <h3 className="font-display font-extrabold text-sm text-main line-clamp-1">
                            {dish.name}
                          </h3>
                          <p className="text-xs text-muted font-medium line-clamp-2 mt-0.5">
                            {dish.description || 'No description provided.'}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-black text-main">₹{dish.price}</span>
                        </div>
                      </div>
                    </div>
 
                    {/* Sold by Restaurant banner & Add to Cart button */}
                    <div className="border-t border-line pt-3 mt-1 flex justify-between items-center">
                      {/* Restaurant link */}
                      <Link 
                        to={`/restaurant/${dish.restaurant?._id}`}
                        className="flex flex-col gap-0.5 max-w-[60%] cursor-pointer group"
                      >
                        <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Sold by</span>
                        <span className="text-xs font-bold text-main truncate group-hover:text-primary transition-colors">
                          {dish.restaurant?.name || 'Local Kitchen'}
                        </span>
                      </Link>
 
                      {/* Quantity controls */}
                      {isDisabled ? (
                        <div className="bg-gray-100 border border-line-strong rounded-xl flex items-center justify-center px-3 h-9 flex-shrink-0">
                          <span className="text-[9px] font-black text-muted uppercase tracking-wider">
                            {isRestClosed ? 'Closed' : 'Unavailable'}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-surface border border-gray-150 shadow-xs rounded-xl flex items-center justify-between w-24 overflow-hidden h-9 flex-shrink-0">
                          {quantity > 0 ? (
                            <>
                              <button
                                onClick={() => removeItem(dish._id)}
                                className="w-8 h-full flex items-center justify-center hover:bg-base text-primary font-black text-sm cursor-pointer transition-colors"
                              >
                                -
                              </button>
                              <span className="text-xs font-extrabold text-main">{quantity}</span>
                              <button
                                onClick={() => handleAddToCart(dish)}
                                className="w-8 h-full flex items-center justify-center hover:bg-base text-primary font-black text-sm cursor-pointer transition-colors"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(dish)}
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
          ) : (
            /* Empty Dishes View */
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-violet-50 text-primary flex items-center justify-center mb-2">
                <SlidersHorizontal className="w-8 h-8" />
              </div>
              <h3 className="font-display font-extrabold text-xl text-main">No recipes match your filters</h3>
              <p className="text-sm text-muted max-w-xs">Try searching for something else or clearing the filters.</p>
              <button
                onClick={() => {
                  setSearchVal('');
                  setSearchQuery('');
                  setSelectedCuisine('All');
                  setIsPureVeg(false);
                  setActiveSort('rating');
                  setSearchParams({});
                }}
                className="bg-primary text-white font-bold text-xs px-5 py-2.5 rounded-xl mt-3 shadow-md cursor-pointer hover:bg-primary-hover"
              >
                Clear All Filters
              </button>
            </div>
          )
        )}
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
                onClick={() => setConflictModal({ isOpen: false, message: '', pendingItem: null, pendingRestaurant: null })}
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
