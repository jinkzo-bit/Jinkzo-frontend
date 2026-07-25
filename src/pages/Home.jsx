import { API_BASE } from '../config/api';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Sparkles, ChevronRight, Bike } from 'lucide-react';
import RestaurantCard from '../components/RestaurantCard';

// Cuisine lists with premium Unsplash images
const cuisines = [
  { name: 'Biryani', image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=120&h=120&q=80', tag: 'Biryani' },
  { name: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=120&h=120&q=80', tag: 'Burgers' },
  { name: 'Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=120&h=120&q=80', tag: 'Pizza' },
  { name: 'Sushi', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=120&h=120&q=80', tag: 'Sushi' },
  { name: 'Salads', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=120&h=120&q=80', tag: 'Healthy' },
  { name: 'Dosa', image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=120&h=120&q=80', tag: 'South Indian' },
  { name: 'Desserts', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=120&h=120&q=80', tag: 'Desserts' },
  { name: 'Noodles', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=120&h=120&q=80', tag: 'Noodles' }
];

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [foodAvailable, setFoodAvailable] = useState(true);
  const [rideAvailable, setRideAvailable] = useState(true);
  const [banners, setBanners] = useState([]);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);
  // NEW STATE FOR SEARCH SUGGESTIONS
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const debounceTimeout = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const navigate = useNavigate();

  // SEARCH SUGGESTIONS LOGIC
  const fetchSuggestions = async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsFocused(true);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion) => {
    const text = typeof suggestion === 'object' && suggestion !== null ? (suggestion.text || suggestion.name || '') : String(suggestion || '');
    setSearchQuery(text);
    setSuggestions([]);
    setIsFocused(false);
    setActiveIndex(-1);
    if (text.trim()) {
      navigate(`/restaurants?search=${encodeURIComponent(text.trim())}`);
    }
  };

  const handleBlur = () => {
    // Hide suggestions on blur after a delay to allow click events
    setTimeout(() => {
      setIsFocused(false);
      setSuggestions([]);
    }, 200);
  };

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await fetch(`${API_BASE}/restaurants/banners`);
        if (res.ok) setBanners(await res.json());
      } catch (err) {
        console.error('Error fetching banners:', err);
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIdx(prev => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/driver-availability`);
        if (res.ok) {
          const data = await res.json();
          setFoodAvailable(data.foodAvailable);
          setRideAvailable(data.rideAvailable);
        }
      } catch (err) {
        console.error('Error fetching driver availability:', err);
      }
    };
    fetchAvailability();
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch(`${API_BASE}/restaurants`);
        if (res.ok) {
          const data = await res.json();
          setTotalCount(data.length);
          // Show top 6 on Home page
          setRestaurants(data.slice(0, 6));
        }
      } catch (err) {
        console.error('Fetch error on home page:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const submitSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/restaurants?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/restaurants');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    submitSearch();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isFocused) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => {
          if (prev >= suggestions.length - 1) return 0;
          return prev + 1;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => {
          if (prev <= 0) return suggestions.length - 1;
          return prev - 1;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[activeIndex]);
          setActiveIndex(-1);
        } else {
          // Submit the form
          submitSearch();
        }
      } else if (e.key === 'Escape') {
        setSuggestions([]);
        setActiveIndex(-1);
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocused, suggestions, activeIndex, submitSearch]);

  useEffect(() => {
    if (activeIndex >= suggestions.length) {
      setActiveIndex(-1);
    }
  }, [suggestions.length, activeIndex]);
  return (
    <div className="flex flex-col gap-8 pb-24 max-w-7xl mx-auto px-4 md:px-8 w-full animate-fade-in">
      
      {/* Mobile Location detection bar */}
      <div className="flex lg:hidden items-center gap-1.5 p-3 mt-2 bg-surface rounded-xl shadow-xs border border-line">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-main truncate">
          
Nandikotkur, AP
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link 
          to="/restaurants"
          className="bg-surface hover:bg-violet-50/5 p-5 rounded-3xl border border-line shadow-2xs transition-all hover:shadow-md hover:scale-[1.01] duration-300 flex items-center justify-between gap-4 cursor-pointer"
        >
          <div className="flex flex-col gap-1 w-full">
            <span className="text-[10px] text-primary font-black uppercase tracking-wider">Food</span>
            <h3 className="font-display font-black text-sm md:text-base text-main leading-tight">Order Food</h3>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className={`w-1.5 h-1.5 rounded-full ${foodAvailable ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
              <span className={`text-[9px] font-bold ${foodAvailable ? 'text-green-600' : 'text-red-500'}`}>
                {foodAvailable ? 'Food delivery partners are available' : 'Food delivery partners not available'}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center text-primary flex-shrink-0">
            <Sparkles className="w-5.5 h-5.5 fill-primary" />
          </div>
        </Link>

        <Link 
          to="/ride"
          className="bg-surface hover:bg-yellow-50/5 p-5 rounded-3xl border border-line shadow-2xs transition-all hover:shadow-md hover:scale-[1.01] duration-300 flex items-center justify-between gap-4 cursor-pointer"
        >
          <div className="flex flex-col gap-1 w-full">
            <span className="text-[10px] text-yellow-600 font-black uppercase tracking-wider font-extrabold">Ride & Courier</span>
            <h3 className="font-display font-black text-sm md:text-base text-main leading-tight">Book Ride</h3>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <span className={`w-1.5 h-1.5 rounded-full ${rideAvailable ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
              <span className={`text-[9px] font-bold ${rideAvailable ? 'text-yellow-600' : 'text-red-500'}`}>
                {rideAvailable ? 'Riders are available' : 'Riders not available'}
              </span>
            </div>
          </div>
          <div className="w-11 h-11 bg-yellow-400/20 rounded-2xl flex items-center justify-center text-yellow-600 flex-shrink-0">
            <Bike className="w-5.5 h-5.5 fill-yellow-600" />
          </div>
        </Link>
      </div>

      {/* Hero Banner Section */}
      {banners.length > 0 ? (
        <section className="relative rounded-3xl overflow-hidden h-[300px] md:h-[400px] shadow-xl group">
          {banners.map((banner, idx) => (
            <div 
              key={banner._id}
              className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentBannerIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`} 
            >
              <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40" />
            </div>
          ))}

          {/* Controls */} 
          {banners.length > 1 && (
            <>
              <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBannerIdx(idx)}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${idx === currentBannerIdx ? 'bg-surface w-6' : 'bg-surface/50 hover:bg-surface/80'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Hero Content Overlaid */}
          <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 md:px-12 pointer-events-none">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="inline-flex items-center gap-1 bg-surface/20 backdrop-blur-md text-white font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full w-max shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-white" />
                {banners[currentBannerIdx]?.title || 'QuickBite Delivery'}
              </div>
              <h1 className="font-display font-extrabold text-3xl md:text-5xl tracking-tight leading-tight my-2 text-white drop-shadow-md">
                Hungry? Grab your <span className="underline decoration-wavy decoration-violet-300">QuickBite</span> now!
              </h1>
              <p className="text-sm md:text-base text-gray-100 leading-relaxed font-medium drop-shadow-md max-w-lg">
                Explore 100+ top restaurants near you delivering piping hot, fresh meals within 25 minutes. Free delivery on orders over â‚¹200.
              </p>
            </div>

            {/* Hero Search Bar with Suggestions */}
            <div className="relative mt-6 md:mt-8 w-full max-w-lg pointer-events-auto">
              <form onSubmit={handleSearchSubmit} className="w-full">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for pizza, biryani, burgers or restaurants..."
                    value={searchQuery}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    onFocus={() => setIsFocused(true)}
                    ref={inputRef}
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-line rounded-2xl text-main text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                    <Search className="w-5 h-5 text-muted" />
                  </div>
                  <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    Search
                  </button>
                </div>
                
                {/* Suggestions Dropdown */}
                {isFocused && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-2 w-full bg-surface border border-line rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => {
                      const text = typeof suggestion === 'object' && suggestion !== null ? (suggestion.text || suggestion.name || '') : String(suggestion || '');
                      const subtitle = typeof suggestion === 'object' && suggestion !== null ? suggestion.subtitle : '';
                      return (
                        <div
                          key={index}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(suggestion);
                          }}
                          onMouseEnter={() => setActiveIndex(index)}
                          className={`px-4 py-2.5 text-sm text-main cursor-pointer hover:bg-base transition-colors flex items-center justify-between ${activeIndex === index ? 'bg-primary/10' : ''}`}
                        >
                          <span className="font-semibold text-main truncate">{text}</span>
                          {subtitle && (
                            <span className="text-xs text-muted font-medium ml-2 flex-shrink-0">{subtitle}</span>
                          )}
                        </div>
                      );
                    })}
                    {!suggestionsLoading && (
                      <div className="px-4 py-2 text-xs text-muted text-center">
                        <span className="mr-2">Press Enter to search for "</span>
                        <span className="font-medium">{searchQuery}</span>
                        <span className="mr-2">"</span>
                      </div>
                    )}
                    {suggestionsLoading && (
                      <div className="px-4 py-2 text-center text-xs text-muted animate-spin">
                        Loading...
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-900 text-white py-12 md:py-16 px-6 md:px-12 flex flex-col gap-6 md:gap-8 shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="inline-flex items-center gap-1 bg-surface/10 text-white font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full w-max">
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              QuickBite Delivery
            </div>
            <h1 className="font-display font-extrabold text-3xl md:text-5xl tracking-tight leading-tight my-2">
              Hungry? Grab your <span className="underline decoration-wavy decoration-violet-300">QuickBite</span> now!
            </h1>
            <p className="text-sm md:text-base text-violet-50/80 leading-relaxed font-medium">
              Explore 100+ top restaurants near you delivering piping hot, fresh meals within 25 minutes. Free delivery on orders over â‚¹200.
            </p>
          </div>

          {/* Hero Search Bar with Suggestions (fallback banner) */}
          <div className="relative mt-6 md:mt-8 w-full max-w-lg pointer-events-auto">
            <form onSubmit={handleSearchSubmit} className="w-full border border-violet-500/10">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for pizza, biryani, burgers or restaurants..."
                  value={searchQuery}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  onFocus={() => setIsFocused(true)}
                  ref={inputRef}
                  className="w-full pl-10 pr-4 py-3 bg-base border border-line-strong rounded-2xl text-main text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center">
                  <Search className="w-5 h-5 text-muted" />
                </div>
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  Search
                </button>
              </div>
              
              {/* Suggestions Dropdown */}
              {isFocused && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 w-full bg-base border border-line rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`px-4 py-2 text-sm text-main cursor-pointer hover:bg-base/50 transition-colors ${activeIndex === index ? 'bg-primary/10' : ''}`}
                    >
                      {suggestion}
                    </div>
                  ))}
                  {!suggestionsLoading && (
                    <div className="px-4 py-2 text-xs text-muted text-center">
                      <span className="mr-2">Press Enter to search for "</span>
                      <span className="font-medium">{searchQuery}</span>
                      <span className="mr-2">"</span>
                    </div>
                  )}
                  {suggestionsLoading && (
                    <div className="px-4 py-2 text-center text-xs text-muted animate-spin">
                      Loading...
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        </section>
      )}

      {/* Cuisine Categories Scroll */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-extrabold text-xl text-main">
            What's on your mind?
          </h2>
        </div>
        <div className="flex items-center gap-4 md:gap-7 overflow-x-auto no-scrollbar py-2 px-1">
          {cuisines.map((cuisine, idx) => (
            <Link 
              key={idx}
              to={`/restaurants?cuisine=${encodeURIComponent(cuisine.tag)}`}
              className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
            >
              <div className="w-18 h-18 md:w-20 md:h-20 rounded-full overflow-hidden border border-line shadow-sm bg-surface p-1 transition-transform group-hover:scale-105 duration-300">
                <img 
                  src={cuisine.image} 
                  alt={cuisine.name} 
                  className="w-full h-full object-cover rounded-full"
                  loading="lazy"
                />
              </div>
              <span className="text-xs font-bold text-main group-hover:text-primary transition-colors">
                {cuisine.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Restaurants Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="font-display font-extrabold text-xl text-main leading-tight flex items-center gap-2">
              Top Restaurants Near You
              {!isLoading && (
                <span className="text-xs bg-violet-100 text-primary font-bold px-2 py-0.5 rounded-full animate-fade-in">
                  {totalCount} Available
                </span> 
              )}
            </h2>
            <p className="text-xs text-muted font-medium">Handpicked premium dining places with fastest delivery times</p>
          </div>
          <Link 
            to="/restaurants" 
            className="flex items-center text-xs font-bold text-primary hover:underline gap-0.5 cursor-pointer"
          >
            <span>See all</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Grid Feed */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            // Skeletons
            Array(6).fill(null).map((_, i) => (
              <RestaurantCard key={i} isLoading={true} />
            ))
          ) : (
            restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} isLoading={false} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}