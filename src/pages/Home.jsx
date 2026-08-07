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

      <div className="grid grid-cols-2 gap-4 mt-6 md:mt-8">
        <Link 
          to="/restaurants"
          className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-white/50 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-300 flex items-center justify-between gap-4 cursor-pointer"
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
          className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-white/50 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-300 flex items-center justify-between gap-4 cursor-pointer"
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
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#6b21a8] via-[#db2777] to-[#ea580c] text-white py-10 md:py-14 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center shadow-[0_10px_40px_rgba(219,39,119,0.3)] min-h-[340px]">
        
        {/* Left Content */}
        <div className="flex flex-col gap-4 max-w-lg z-20">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full w-max">
            <Sparkles className="w-3.5 h-3.5 fill-white" />
            WEEKEND BONANZA - FREE DELIVERY!
          </div>
          
          <h1 className="font-display font-extrabold text-3xl md:text-5xl tracking-tight leading-tight mt-2">
            Hungry? Grab your <span className="text-[#fde047]">Jinkzo</span> now!
          </h1>
          
          <p className="text-sm md:text-base text-white/90 leading-relaxed font-medium mb-2">
            Explore 100+ top restaurants near you delivering piping hot, fresh meals within 25 minutes. Free delivery on orders over ₹200.
          </p>

          <Link to="/restaurants" className="bg-[#fde047] hover:bg-[#facc15] text-gray-900 font-extrabold px-6 py-3 rounded-xl w-max flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer">
            Order Food Now
            <ChevronRight className="w-4 h-4 font-bold" />
          </Link>
        </div>

        {/* Right Image (Biryani Plate) */}
        <div className="absolute right-[-10%] md:right-0 top-1/2 -translate-y-1/2 w-[350px] md:w-[450px] z-10 pointer-events-none opacity-40 md:opacity-100">
          <img src="https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80" alt="Biryani Plate" className="w-full h-full object-contain rounded-full drop-shadow-2xl" />
        </div>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          <div className="w-6 h-1.5 bg-white rounded-full"></div>
          <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
          <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
          <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
        </div>
      </section>



      {/* Top Restaurants Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="font-display font-extrabold text-2xl text-[#1e1b4b] leading-tight flex items-center gap-3">
              Top Restaurants Near You
              {!isLoading && (
                <span className="text-[10px] bg-purple-100/80 text-purple-700 font-extrabold px-3 py-1 rounded-md tracking-wider">
                  {totalCount} Available
                </span> 
              )}
            </h2>
            <p className="text-xs text-gray-500 font-semibold mt-1">Handpicked premium dining places with fastest delivery times</p>
          </div>
          <Link 
            to="/restaurants" 
            className="flex items-center text-sm font-bold text-primary hover:underline gap-0.5 cursor-pointer"
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