import { API_BASE } from '../config/api';
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, MapPin, ChevronDown } from 'lucide-react';
import RestaurantCard from '../components/RestaurantCard';
import GlobalSearchBar from '../components/GlobalSearchBar';
import ServiceCard from '../components/ServiceCard';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const { user } = useAuthStore();
  const [restaurants, setRestaurants] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [foodAvailable, setFoodAvailable] = useState(true);
  const [rideAvailable, setRideAvailable] = useState(true);
  const [banners, setBanners] = useState([]);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

  const navigate = useNavigate();

  // Dynamic user address selection (reused from auth store)
  const getDeliveryLocation = () => {
    if (user && Array.isArray(user.addresses) && user.addresses.length > 0) {
      const def = user.addresses.find(a => a.isDefault);
      if (def) return `${def.street || ''}, ${def.city || ''}`.replace(/^, /, '').trim() || def.city || "Nandikotkur, AP";
      const first = user.addresses[0];
      return `${first.street || ''}, ${first.city || ''}`.replace(/^, /, '').trim() || first.city || "Nandikotkur, AP";
    }
    return "Nandikotkur, AP";
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

  const services = [
    {
      title: 'Food',
      description: 'Delicious meals from top restaurants',
      image: '/services/food.jpg',
      icon: '🍔',
      to: '/restaurants',
      arrowBgClass: 'bg-purple-100',
      arrowColorClass: 'text-purple-600',
      isAvailable: foodAvailable
    },
    {
      title: 'Ride & Courier',
      description: 'Quick rides and courier service',
      image: '/services/ride.jpg',
      icon: '🏍️',
      to: '/ride',
      arrowBgClass: 'bg-orange-100',
      arrowColorClass: 'text-orange-600',
      isAvailable: rideAvailable
    },
    {
      title: 'Grocery',
      description: 'Daily essentials delivered fast',
      image: '/services/grocery.jpg',
      icon: '🛒',
      to: '/customer/grocery',
      arrowBgClass: 'bg-green-100',
      arrowColorClass: 'text-green-600',
      isAvailable: true
    },
    {
      title: 'Hot & Cool',
      description: 'Refreshing drinks, ice creams & more',
      image: '/services/hot-cool.jpg',
      icon: '🥤',
      to: '/customer/hot-cool',
      arrowBgClass: 'bg-blue-100',
      arrowColorClass: 'text-blue-600',
      isAvailable: true
    },
    {
      title: 'Veg & Fruits',
      description: 'Fresh vegetables and fruits',
      image: '/services/veg-fruits.jpg',
      icon: '🥬',
      to: '/customer/veg-fruits',
      arrowBgClass: 'bg-emerald-100',
      arrowColorClass: 'text-emerald-600',
      isAvailable: true
    },
    {
      title: 'Meat',
      description: 'Fresh meat, chicken, fish & eggs',
      image: '/services/meat.jpg',
      icon: '🥩',
      to: '/customer/meat',
      arrowBgClass: 'bg-rose-100',
      arrowColorClass: 'text-rose-600',
      isAvailable: true
    }
  ];

  return (
    <div 
      className="customer-home-canvas min-h-screen w-full relative pb-24 px-3.5 sm:px-6 md:px-8 overflow-x-hidden"
      style={{
        background: 'linear-gradient(180deg, #FCE8F3 0%, #F3E8FF 16%, #EBE5FE 32%, #FFE8D6 52%, #FDE4F2 72%, #E3F2FE 88%, #F7E8FF 100%)'
      }}
    >
      {/* ── AMBIENT PASTEL GLOW ORBS ────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-12 -left-12 w-80 h-80 rounded-full bg-[#E9C6FF]/40 blur-[90px]" />
        <div className="absolute top-16 -right-12 w-80 h-80 rounded-full bg-[#F7C8E0]/40 blur-[90px]" />
        <div className="absolute top-[380px] -left-16 w-80 h-80 rounded-full bg-[#FFE0C2]/45 blur-[90px]" />
        <div className="absolute top-[580px] -right-16 w-80 h-80 rounded-full bg-[#FFD6E8]/40 blur-[90px]" />
        <div className="absolute top-[850px] left-8 w-80 h-80 rounded-full bg-[#DDF4FF]/45 blur-[90px]" />
        <div className="absolute bottom-10 right-8 w-96 h-96 rounded-full bg-[#DCCBFF]/40 blur-[100px]" />
      </div>

      {/* ── MAIN CONTENT CONTAINER (FLOATING OVER COLORFUL CANVAS) ──────────── */}
      <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5 w-full relative z-10 pt-1">

        {/* ── DELIVER TO LOCATION COMPACT BADGE ─────────────────────────── */}
        <div className="flex items-center justify-between px-1">
          <Link 
            to={user ? "/profile" : "/login"}
            className="flex items-center gap-1.5 text-xs sm:text-sm group cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-primary flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-primary stroke-[2.5]" />
            </div>
            <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">Deliver to</span>
            <span className="font-display font-black text-[#1E1B4B] group-hover:text-primary transition-colors truncate max-w-[210px] sm:max-w-sm">
              {getDeliveryLocation()}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-primary stroke-[2.5] flex-shrink-0 transition-transform group-hover:translate-y-0.5" />
          </Link>
        </div>

        {/* ── SEARCH BAR ─────────────────────────────────────────────────── */}
        <GlobalSearchBar placeholder="Search for food, groceries, items..." />

        {/* ── HERO BANNER SECTION ────────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5">
          <section className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white p-5 sm:p-7 md:p-8 flex flex-col justify-between shadow-[0_10px_30px_rgba(124,58,237,0.25)] min-h-[190px] sm:min-h-[220px]">
            
            {/* Background Glows */}
            <div className="absolute -right-8 -top-8 w-44 h-44 bg-white/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-44 h-44 bg-fuchsia-400/25 rounded-full blur-2xl pointer-events-none" />
            
            {/* Floating food badges */}
            <div className="absolute top-4 right-[42%] sm:right-[38%] w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-sm animate-float hidden xs:flex">
              🍔
            </div>
            <div className="absolute top-6 right-8 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-sm animate-float-delayed hidden xs:flex">
              🥤
            </div>
            <div className="absolute bottom-6 right-4 w-7 h-7 rounded-full bg-white/90 shadow-md flex items-center justify-center text-xs animate-float hidden xs:flex">
              🥩
            </div>

            {/* Left Content */}
            <div className="flex flex-col justify-center gap-1.5 z-10 w-full max-w-[210px] sm:max-w-xs md:max-w-sm">
              <h1 className="font-display font-black text-2xl sm:text-3xl md:text-4xl tracking-tight leading-tight drop-shadow-xs">
                Fast Delivery,<br />
                <span className="text-yellow-300 drop-shadow-sm">Happy You!</span>
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-white/95 font-semibold leading-snug mt-1">
                Food, groceries, meat, fruits &amp; more delivered fast!
              </p>
              <Link 
                to="/restaurants" 
                className="bg-white text-primary hover:bg-gray-50 active:scale-95 font-black text-xs px-4.5 py-2 sm:px-5 sm:py-2.5 rounded-full w-max shadow-md mt-2.5 transition-all flex items-center gap-1 cursor-pointer"
              >
                Order Now <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
              </Link>
            </div>

            {/* 3D Scooter Artwork Image */}
            <div className="absolute right-[-10px] sm:right-2 bottom-0 top-0 flex items-center justify-end pointer-events-none z-0 w-[55%] sm:w-[50%] max-w-[280px]">
              <img 
                src="/services/hero-scooter.jpg" 
                alt="Jinkzo Delivery" 
                className="w-full h-full object-contain object-right-bottom drop-shadow-2xl opacity-95 transition-transform duration-500 hover:scale-105"
              />
            </div>
          </section>

          {/* Carousel Pagination Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-xs transition-all" />
            <span className="w-2 h-2 rounded-full bg-purple-200 transition-all" />
            <span className="w-2 h-2 rounded-full bg-purple-200 transition-all" />
          </div>
        </div>

        {/* ── OUR SERVICES SECTION (2-COLUMN GRID) ────────────────────────── */}
        <section className="flex flex-col gap-3 mt-1 bg-transparent">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display font-black text-lg sm:text-xl text-[#1E1B4B] leading-tight tracking-tight">
              Our Services
            </h2>
            <Link 
              to="/customer/services" 
              className="flex items-center text-xs font-black text-primary hover:underline gap-0.5"
            >
              See All <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:gap-4 bg-transparent">
            {services.map((svc, idx) => (
              <ServiceCard 
                key={idx} 
                title={svc.title}
                description={svc.description}
                image={svc.image}
                icon={svc.icon}
                to={svc.to}
                arrowBgClass={svc.arrowBgClass}
                arrowColorClass={svc.arrowColorClass}
                isAvailable={svc.isAvailable}
              />
            ))}
          </div>
        </section>

        {/* ── POPULAR NEAR YOU SECTION ───────────────────────────────────── */}
        <section className="flex flex-col gap-3 mt-2 bg-transparent">
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <h2 className="font-display font-black text-lg sm:text-xl text-[#1E1B4B] leading-tight tracking-tight flex items-center gap-2">
                Popular Near You
                {!isLoading && totalCount > 0 && (
                  <span className="text-[9px] bg-purple-100 text-purple-700 font-extrabold px-2 py-0.5 rounded-full">
                    {totalCount} Places
                  </span> 
                )}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold mt-0.5">
                Top-rated restaurants and stores
              </p>
            </div>
            <Link 
              to="/restaurants" 
              className="flex items-center text-xs font-black text-primary hover:underline gap-0.5"
            >
              See all <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 bg-transparent">
            {isLoading ? (
              Array(4).fill(null).map((_, i) => (
                <RestaurantCard key={i} isLoading={true} />
              ))
            ) : restaurants.length > 0 ? (
              restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant._id} restaurant={restaurant} isLoading={false} />
              ))
            ) : (
              <div className="col-span-full bg-white/90 rounded-3xl p-8 text-center border border-white/80 shadow-xs">
                <p className="text-xs font-bold text-slate-500">No restaurants currently available in this area.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}