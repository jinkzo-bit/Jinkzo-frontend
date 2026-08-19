import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Bike,
  ShieldCheck,
  Tag,
  Headphones
} from 'lucide-react';
import { API_BASE } from '../config/api';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';

const DEFAULT_BANNER_SLIDES = [
  {
    id: 'default_1',
    title: 'Welcome to',
    highlight: 'Jinkzo',
    subtitle: 'Food, groceries, meat, fruits & more delivered fast at your doorstep!',
    buttonText: 'Order Now',
    link: '/restaurants',
    image: '/assets/hero_delivery_banner.jpg',
    bgGradient: 'bg-gradient-to-r from-[#6B11A9] via-[#85169E] to-[#F43F5E]'
  },
  {
    id: 'default_2',
    title: 'Fresh Groceries',
    highlight: 'Delivered Fast',
    subtitle: 'Daily essentials, snacks & kitchen staples delivered in minutes!',
    buttonText: 'Order Now',
    link: '/restaurants?category=grocery',
    image: '/assets/cat_grocery.jpg',
    bgGradient: 'bg-gradient-to-r from-[#065F46] via-[#047857] to-[#059669]'
  },
  {
    id: 'default_3',
    title: 'Hot Deals On',
    highlight: 'Your Favorite Food',
    subtitle: 'Enjoy great offers & delicious dishes from top restaurants near you',
    buttonText: 'Order Now',
    link: '/restaurants',
    image: '/assets/cat_food.jpg',
    bgGradient: 'bg-gradient-to-r from-[#991B1B] via-[#DC2626] to-[#EA580C]'
  },
  {
    id: 'default_4',
    title: 'Fast & Reliable',
    highlight: 'Ride & Courier',
    subtitle: 'Quick, safe rides & reliable package deliveries across the city',
    buttonText: 'Book Now',
    link: '/ride',
    image: '/assets/cat_ride.jpg',
    bgGradient: 'bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#E11D48]'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const [foodAvailable, setFoodAvailable] = useState(true);
  const [rideAvailable, setRideAvailable] = useState(true);

  // Dynamic Banners from Backend
  const [bannerSlides, setBannerSlides] = useState(DEFAULT_BANNER_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Mobile Touch Swipe Handling
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    const fetchAvailabilityAndBanners = async () => {
      try {
        const [availRes, bannersRes] = await Promise.allSettled([
          fetch(`${API_BASE}/auth/driver-availability`),
          fetch(`${API_BASE}/restaurants/banners`)
        ]);

        if (availRes.status === 'fulfilled' && availRes.value.ok) {
          const data = await availRes.value.json();
          setFoodAvailable(data.foodAvailable ?? true);
          setRideAvailable(data.rideAvailable ?? true);
        }

        if (bannersRes.status === 'fulfilled' && bannersRes.value.ok) {
          const bannersData = await bannersRes.value.json();
          if (Array.isArray(bannersData) && bannersData.length > 0) {
            const gradients = [
              'bg-gradient-to-r from-[#6B11A9] via-[#85169E] to-[#F43F5E]',
              'bg-gradient-to-r from-[#065F46] via-[#047857] to-[#059669]',
              'bg-gradient-to-r from-[#991B1B] via-[#DC2626] to-[#EA580C]',
              'bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#E11D48]'
            ];
            const mapped = bannersData.map((b, idx) => {
              const words = (b.title || 'Welcome to Jinkzo').split(' ');
              const titlePart = words.length > 1 ? words.slice(0, Math.ceil(words.length / 2)).join(' ') : 'Special';
              const highlightPart = words.length > 1 ? words.slice(Math.ceil(words.length / 2)).join(' ') : (words[0] || 'Offer');

              return {
                id: b._id || `banner_${idx}`,
                title: titlePart,
                highlight: highlightPart,
                subtitle: b.subtitle || 'Fresh, reliable deliveries straight to your doorstep!',
                buttonText: b.buttonText || 'Order Now',
                link: b.link || '/restaurants',
                image: b.imageUrl || '/assets/hero_delivery_banner.jpg',
                bgGradient: gradients[idx % gradients.length]
              };
            });
            setBannerSlides(mapped);
          }
        }
      } catch (err) {
        console.error('Error fetching driver availability or banners:', err);
      }
    };
    fetchAvailabilityAndBanners();
  }, []);

  // 10-Second Auto-Slide Loop with reset on interaction & pause on hover/touch
  useEffect(() => {
    if (isPaused || bannerSlides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 10000); // exactly 10 seconds auto-advance

    return () => clearInterval(timer);
  }, [currentSlide, isPaused, bannerSlides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);
  };

  const goToSlide = (idx) => {
    setCurrentSlide(idx);
  };

  const handleTouchStart = (e) => {
    setIsPaused(true);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 45;
    const isRightSwipe = distance < -45;
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  const categories = [
    {
      id: 'food',
      title: 'Food',
      subtitle: 'Tasty meals from top restaurants',
      textColor: 'text-[#7C3AED] dark:text-[#C084FC]',
      arrowColor: 'text-[#7C3AED] dark:text-[#C084FC]',
      btnBg: 'bg-white dark:bg-[#261E38] border-gray-100/80 dark:border-purple-800/40',
      bgColor: 'bg-[#FBF8FF] dark:bg-[#191526] hover:bg-[#F5EEFF] dark:hover:bg-[#201B30]',
      borderColor: 'border-purple-100/80 dark:border-purple-900/40',
      image: '/assets/cat_food.jpg',
      darkImage: '/assets/cat_food_dark.jpg',
      link: '/restaurants'
    },
    {
      id: 'ride',
      title: 'Ride & Courier',
      subtitle: 'Quick rides & courier service',
      textColor: 'text-[#EA580C] dark:text-[#FB923C]',
      arrowColor: 'text-[#EA580C] dark:text-[#FB923C]',
      btnBg: 'bg-white dark:bg-[#382417] border-gray-100/80 dark:border-orange-800/40',
      bgColor: 'bg-[#FFFBF5] dark:bg-[#241910] hover:bg-[#FFF4E8] dark:hover:bg-[#2D2015]',
      borderColor: 'border-orange-100/80 dark:border-orange-900/40',
      image: '/assets/cat_ride.jpg',
      darkImage: '/assets/cat_ride_dark.jpg',
      link: '/ride'
    },
    {
      id: 'grocery',
      title: 'Grocery',
      subtitle: 'Daily essentials delivered fast',
      textColor: 'text-[#16A34A] dark:text-[#4ADE80]',
      arrowColor: 'text-[#16A34A] dark:text-[#4ADE80]',
      btnBg: 'bg-white dark:bg-[#163826] border-gray-100/80 dark:border-green-800/40',
      bgColor: 'bg-[#F7FCF8] dark:bg-[#0F2218] hover:bg-[#EDF8EF] dark:hover:bg-[#142B1E]',
      borderColor: 'border-green-100/80 dark:border-green-900/40',
      image: '/assets/cat_grocery.jpg',
      darkImage: '/assets/cat_grocery_dark.jpg',
      link: '/restaurants?category=grocery'
    },
    {
      id: 'hot_cool',
      title: 'Hot & Cool',
      subtitle: 'Cool drinks, cakes & snacks',
      textColor: 'text-[#2563EB] dark:text-[#60A5FA]',
      arrowColor: 'text-[#2563EB] dark:text-[#60A5FA]',
      btnBg: 'bg-white dark:bg-[#182B4A] border-gray-100/80 dark:border-blue-800/40',
      bgColor: 'bg-[#F6FAFF] dark:bg-[#101B2E] hover:bg-[#EDF5FF] dark:hover:bg-[#16233B]',
      borderColor: 'border-blue-100/80 dark:border-blue-900/40',
      image: '/assets/cat_hot_cool.jpg',
      darkImage: '/assets/cat_hot_cool_dark.jpg',
      link: '/restaurants?category=beverages'
    },
    {
      id: 'veg_fruits',
      title: 'Veg & Fruits',
      subtitle: 'Fresh vegetables & fruits',
      textColor: 'text-[#15803D] dark:text-[#4ADE80]',
      arrowColor: 'text-[#15803D] dark:text-[#4ADE80]',
      btnBg: 'bg-white dark:bg-[#183B22] border-gray-100/80 dark:border-emerald-800/40',
      bgColor: 'bg-[#F8FCF8] dark:bg-[#102416] hover:bg-[#EEF9EE] dark:hover:bg-[#162E1D]',
      borderColor: 'border-emerald-100/80 dark:border-emerald-900/40',
      image: '/assets/cat_veg_fruits.jpg',
      darkImage: '/assets/cat_veg_fruits.jpg',
      link: '/restaurants?category=fruits-vegetables'
    },
    {
      id: 'meat',
      title: 'Meat',
      subtitle: 'Fresh meat, chicken & fish',
      textColor: 'text-[#DC2626] dark:text-[#F87171]',
      arrowColor: 'text-[#DC2626] dark:text-[#F87171]',
      btnBg: 'bg-white dark:bg-[#3D1A1E] border-gray-100/80 dark:border-red-800/40',
      bgColor: 'bg-[#FFF8F8] dark:bg-[#281316] hover:bg-[#FEEFEF] dark:hover:bg-[#33181C]',
      borderColor: 'border-red-100/80 dark:border-red-900/40',
      image: '/assets/cat_meat.jpg',
      darkImage: '/assets/cat_meat.jpg',
      link: '/restaurants?category=meat'
    }
  ];

  const activeBanner = bannerSlides[currentSlide] || bannerSlides[0];

  return (
    <div className="flex flex-col gap-3.5 sm:gap-5 md:gap-8 pb-24 md:pb-20 max-w-7xl mx-auto px-3 sm:px-4 md:px-8 w-full animate-fade-in transition-colors duration-300">

      {/* 1. HERO ADVERTISEMENT CAROUSEL (10-SECOND AUTO-SLIDE, SWIPE & DOT INDICATORS) */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative rounded-2xl sm:rounded-[28px] overflow-hidden ${activeBanner.bgGradient} text-white p-3.5 sm:p-6 md:p-10 lg:p-12 shadow-[0_8px_30px_rgba(107,17,169,0.2)] dark:shadow-[0_12px_45px_rgba(0,0,0,0.5)] flex flex-row items-center justify-between min-h-[155px] sm:min-h-[210px] md:min-h-[300px] transition-all duration-700 group select-none`}
      >

        {/* Subtle Confetti / Decorative Geometric Accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-4 left-1/4 w-2 sm:w-3 h-2 sm:h-3 bg-yellow-300 rounded-sm rotate-45"></div>
          <div className="absolute top-10 left-1/3 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-pink-300 rounded-full"></div>
          <div className="absolute bottom-4 left-1/5 w-2 sm:w-3 h-1 sm:h-1.5 bg-blue-300 rounded-full rotate-12"></div>
          <div className="absolute top-6 right-1/3 w-2 sm:w-3 h-2 sm:h-3 bg-cyan-300 rounded-sm rotate-12"></div>
          <div className="absolute bottom-8 right-1/4 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-yellow-200 rounded-full"></div>
          <div className="absolute top-1/2 left-6 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white rounded-full"></div>
        </div>

        {/* Left / Previous Slide Button (Desktop / Tablet) */}
        {bannerSlides.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-2 sm:left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black/20 hover:bg-black/45 backdrop-blur-xs text-white flex items-center justify-center transition-all cursor-pointer shadow-md opacity-0 group-hover:opacity-100 z-20 focus:opacity-100"
            title="Previous banner"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Right / Next Slide Button (Desktop / Tablet) */}
        {bannerSlides.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black/20 hover:bg-black/45 backdrop-blur-xs text-white flex items-center justify-center transition-all cursor-pointer shadow-md opacity-0 group-hover:opacity-100 z-20 focus:opacity-100"
            title="Next banner"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          </button>
        )}

        {/* Active Banner Slide Content (Animated Fade-In) */}
        <div key={activeBanner.id} className="w-full flex flex-row items-center justify-between animate-fade-in transition-all duration-500 z-10">

          {/* Left Text & CTA Content */}
          <div className="flex flex-col items-start gap-1 sm:gap-2.5 md:gap-3.5 z-10 w-[58%] sm:w-[56%] md:w-[55%] flex-1">
            <span className="text-xs sm:text-lg md:text-3xl font-extrabold text-white/90 tracking-tight leading-none">
              {activeBanner.title}
            </span>
            <h1 className="font-display font-black text-2xl sm:text-4xl md:text-6xl lg:text-7xl text-[#FFD700] tracking-tight leading-none drop-shadow-sm">
              {activeBanner.highlight}
            </h1>
            <p className="text-[10px] sm:text-xs md:text-base text-white/95 font-medium leading-tight sm:leading-relaxed max-w-xs md:max-w-md line-clamp-2 md:line-clamp-none mt-0.5 sm:mt-1">
              {activeBanner.subtitle}
            </p>

            <Link
              to={activeBanner.link}
              className="mt-1 sm:mt-3 md:mt-5 inline-flex items-center gap-1 sm:gap-2 bg-[#FFD700] hover:bg-[#FACC15] text-gray-900 font-black text-[11px] sm:text-sm md:text-base px-3.5 sm:px-5 md:px-7 py-1.5 sm:py-2.5 md:py-3 rounded-full shadow-md shadow-yellow-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>{activeBanner.buttonText}</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 stroke-[3]" />
            </Link>
          </div>

          {/* Right Banner Artwork Graphics */}
          <div className="w-[42%] sm:w-[44%] md:w-[45%] flex items-center justify-center md:justify-end z-10 pl-2 sm:pl-4">
            <div className="relative max-w-[150px] sm:max-w-[240px] md:max-w-[420px] lg:max-w-[480px] w-full flex items-center justify-center">
              <img
                src={getImageUrl(activeBanner.image, 'banner')}
                alt={activeBanner.highlight || activeBanner.title}
                onError={(e) => handleImageError(e, 'banner')}
                className="w-full h-auto max-h-[120px] sm:max-h-[180px] md:max-h-[260px] object-cover rounded-xl sm:rounded-2xl shadow-md sm:shadow-xl shadow-purple-950/20"
              />
            </div>
          </div>

        </div>

        {/* Slide Indicators / Dots at Bottom (No Text or Timer Numbers Shown) */}
        {bannerSlides.length > 1 && (
          <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
            {bannerSlides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToSlide(idx);
                }}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentSlide === idx
                    ? 'w-5 sm:w-7 bg-[#FFD700] shadow-sm'
                    : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/80'
                }`}
                title={`Banner ${idx + 1}`}
              />
            ))}
          </div>
        )}

      </section>

      {/* 2. SECTION HEADING */}
      <section className="mt-0.5 sm:mt-1 md:mt-2">
        <h2 className="font-display font-black text-base sm:text-xl md:text-2xl text-gray-900 dark:text-white tracking-tight transition-colors">
          What would you like to order?
        </h2>
      </section>

      {/* 3. CATEGORY CARDS (2-COLUMN GRID ON MOBILE, 3-COLUMN ON DESKTOP) */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={cat.link}
            className={`${cat.bgColor} ${cat.borderColor} border rounded-2xl sm:rounded-[26px] p-3 sm:p-4 md:p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group flex flex-col justify-between cursor-pointer relative overflow-hidden min-h-[145px] sm:min-h-[175px] md:min-h-[190px]`}
          >
            {/* Top Text Content */}
            <div className="z-10 w-full">
              <h3 className={`font-display font-black text-sm sm:text-lg md:text-2xl ${cat.textColor} leading-tight`}>
                {cat.title}
              </h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-slate-400 font-medium mt-0.5 sm:mt-1 leading-snug line-clamp-1 sm:line-clamp-2">
                {cat.subtitle}
              </p>
            </div>

            {/* Bottom Row: Action Arrow Button & Product Image */}
            <div className="flex items-end justify-between gap-1 mt-2 sm:mt-3 z-10 w-full">
              {/* Action Circle Button */}
              <div className={`w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full ${cat.btnBg} shadow-xs border flex items-center justify-center ${cat.arrowColor} group-hover:scale-110 transition-all duration-200 flex-shrink-0 mb-0.5 sm:mb-1`}>
                <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 stroke-[3]" />
              </div>

              {/* Product Image */}
              <div className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 flex-shrink-0 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300 rounded-xl sm:rounded-2xl overflow-hidden">
                {/* Light mode rendering */}
                <img
                  src={getImageUrl(cat.image, 'category')}
                  alt={cat.title}
                  onError={(e) => handleImageError(e, 'category')}
                  className="w-full h-full object-contain mix-blend-multiply dark:hidden"
                />
                {/* Dark mode rendering */}
                <img
                  src={getImageUrl(cat.darkImage || cat.image, 'category')}
                  alt={cat.title}
                  onError={(e) => handleImageError(e, 'category')}
                  className="w-full h-full object-contain hidden dark:block mix-blend-screen rounded-xl sm:rounded-2xl"
                />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* 4. TRUST / FEATURE BADGES BAR */}
      <section className="bg-white dark:bg-[#141926] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/10 mt-1 sm:mt-2 transition-colors duration-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-white/10">

          {/* Feature 1: Fast Delivery */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-3.5 px-1 sm:px-2 pt-1 sm:pt-2 md:pt-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl sm:rounded-2xl bg-purple-100 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C084FC] flex items-center justify-center flex-shrink-0">
              <Bike className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-[#7C3AED] dark:text-[#C084FC]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-extrabold text-[11px] sm:text-xs md:text-sm text-gray-900 dark:text-white leading-tight truncate">
                Fast Delivery
              </span>
              <span className="text-[9px] sm:text-[10px] md:text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5 leading-none sm:leading-tight truncate">
                On time, every time
              </span>
            </div>
          </div>

          {/* Feature 2: Safe & Secure */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-3.5 px-1 sm:px-2 pt-1 sm:pt-2 md:pt-0 sm:pl-4 md:pl-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl sm:rounded-2xl bg-rose-100 dark:bg-[#E11D48]/20 text-[#E11D48] dark:text-[#FB7185] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-[#E11D48] dark:text-[#FB7185]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-extrabold text-[11px] sm:text-xs md:text-sm text-gray-900 dark:text-white leading-tight truncate">
                Safe &amp; Secure
              </span>
              <span className="text-[9px] sm:text-[10px] md:text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5 leading-none sm:leading-tight truncate">
                100% secure payments
              </span>
            </div>
          </div>

          {/* Feature 3: Best Offers */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-3.5 px-1 sm:px-2 pt-1 sm:pt-2 md:pt-0 sm:pl-4 md:pl-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl sm:rounded-2xl bg-amber-100 dark:bg-[#D97706]/20 text-[#D97706] dark:text-[#FBBF24] flex items-center justify-center flex-shrink-0">
              <Tag className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-[#D97706] dark:text-[#FBBF24]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-extrabold text-[11px] sm:text-xs md:text-sm text-gray-900 dark:text-white leading-tight truncate">
                Best Offers
              </span>
              <span className="text-[9px] sm:text-[10px] md:text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5 leading-none sm:leading-tight truncate">
                Great deals &amp; discounts
              </span>
            </div>
          </div>

          {/* Feature 4: 24/7 Support */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-3.5 px-1 sm:px-2 pt-1 sm:pt-2 md:pt-0 sm:pl-4 md:pl-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl sm:rounded-2xl bg-emerald-100 dark:bg-[#059669]/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
              <Headphones className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-[#059669] dark:text-[#34D399]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-extrabold text-[11px] sm:text-xs md:text-sm text-gray-900 dark:text-white leading-tight truncate">
                24/7 Support
              </span>
              <span className="text-[9px] sm:text-[10px] md:text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5 leading-none sm:leading-tight truncate">
                We're here to help
              </span>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}