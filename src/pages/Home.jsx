import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Lock,
  Clock
} from 'lucide-react';
import { API_BASE } from '../config/api';
import { useTranslation } from '../store/languageStore';
import { useCartStore } from '../store/cartStore';
import { getImageUrl, handleImageError } from '../utils/uploadUtil';
import io from 'socket.io-client';

const DEFAULT_BANNER_SLIDES = [
  {
    id: 'default_1',
    title: 'Special',
    highlight: 'Manam',
    subtitle: 'Order karo',
    buttonText: 'Order Now',
    link: '/restaurants',
    image: '/assets/hero_delivery_banner.jpg',
    bgGradient: 'bg-gradient-to-r from-[#7B1FA2] via-[#E91E63] to-[#FF5722]'
  },
  {
    id: 'default_2',
    title: 'Fresh Groceries',
    highlight: 'Delivered Fast',
    subtitle: 'Daily essentials, snacks & staples in minutes!',
    buttonText: 'Order Now',
    link: '/restaurants?category=grocery',
    image: '/assets/cat_grocery.jpg',
    bgGradient: 'bg-gradient-to-r from-[#065F46] via-[#047857] to-[#059669]'
  },
  {
    id: 'default_3',
    title: 'Hot Deals On',
    highlight: 'Your Favorite Food',
    subtitle: 'Delicious dishes from top restaurants near you',
    buttonText: 'Order Now',
    link: '/restaurants',
    image: '/assets/cat_food.jpg',
    bgGradient: 'bg-gradient-to-r from-[#991B1B] via-[#DC2626] to-[#EA580C]'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showToast } = useCartStore();
  const [foodAvailable, setFoodAvailable] = useState(true);
  const [rideAvailable, setRideAvailable] = useState(true);

  // Category Services Availability Status
  const [categoryStatus, setCategoryStatus] = useState({
    food: { status: 'OPEN', isEnabled: true, message: null },
    ride: { status: 'OPEN', isEnabled: true, message: null },
    grocery: { status: 'OPEN', isEnabled: true, message: null },
    bakery_beverages: { status: 'OPEN', isEnabled: true, message: null },
    veg_fruits: { status: 'OPEN', isEnabled: true, message: null },
    meat: { status: 'OPEN', isEnabled: true, message: null }
  });

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
        const [availRes, bannersRes, catServicesRes] = await Promise.allSettled([
          fetch(`${API_BASE}/auth/driver-availability`),
          fetch(`${API_BASE}/restaurants/banners`),
          fetch(`${API_BASE}/restaurants/category-services`)
        ]);

        if (availRes.status === 'fulfilled' && availRes.value.ok) {
          const data = await availRes.value.json();
          setFoodAvailable(data.foodAvailable ?? true);
          setRideAvailable(data.rideAvailable ?? true);
        }

        if (catServicesRes.status === 'fulfilled' && catServicesRes.value.ok) {
          const catList = await catServicesRes.value.json();
          if (Array.isArray(catList)) {
            const statusMap = {};
            catList.forEach(c => {
              if (c.id) {
                statusMap[c.id] = c;
                // Support aliases
                if (c.id === 'bakery_beverages') statusMap['cool_hot'] = c;
                if (c.id === 'ride') statusMap['ride_courier'] = c;
                if (c.id === 'veg_fruits') statusMap['fruits-vegetables'] = c;
              }
            });
            setCategoryStatus(prev => ({ ...prev, ...statusMap }));
          }
        }

        if (bannersRes.status === 'fulfilled' && bannersRes.value.ok) {
          const bannersData = await bannersRes.value.json();
          if (Array.isArray(bannersData) && bannersData.length > 0) {
            const gradients = [
              'bg-gradient-to-r from-[#7B1FA2] via-[#E91E63] to-[#FF5722]',
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
                subtitle: b.subtitle || 'Order karo',
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
        console.error('Error fetching driver availability, categories, or banners:', err);
      }
    };
    fetchAvailabilityAndBanners();

    // Listen to real-time socket category updates
    let socket;
    try {
      const socketUrl = API_BASE.replace('/api', '');
      socket = io(socketUrl);
      socket.on('categoryStatusChanged', (data) => {
        if (data) {
          const catId = data.categoryId || (data.category && data.category.id);
          const catData = data.category || data;
          if (catId) {
            setCategoryStatus(prev => {
              const updated = { ...prev, [catId]: catData };
              if (catId === 'bakery_beverages') updated['cool_hot'] = catData;
              if (catId === 'ride') updated['ride_courier'] = catData;
              if (catId === 'veg_fruits') updated['fruits-vegetables'] = catData;
              return updated;
            });
          }
        }
      });
    } catch (e) {
      // socket fallback
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // 10-Second Auto-Slide Loop with reset on interaction & pause on hover/touch
  useEffect(() => {
    if (isPaused || bannerSlides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 10000);

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
      name: 'Food',
      title: t('home.categoryFood', 'Food'),
      subtitle: t('home.foodSubtitle', 'Tasty meals from top restaurants'),
      background: '/assets/home/categories/backgrounds/food-bg.png',
      image: '/assets/home/categories/png/food.png',
      titleColor: 'text-[#FF5722]',
      subtitleColor: 'text-black',
      btnBg: 'bg-[#FF5722] hover:bg-[#E64A19]',
      imgOffset: '-mb-0.5 sm:-mb-14 md:-mb-20 lg:-mb-24',
      imgScale: 'scale-[2.25] sm:scale-110 md:scale-115',
      imgShift: 'translate-x-1.5 sm:translate-x-0',
      link: '/restaurants'
    },
    {
      id: 'ride',
      name: 'Ride & Courier',
      title: t('home.categoryRide', 'Ride & Courier'),
      subtitle: t('home.rideSubtitle', 'Quick rides & courier service'),
      background: '/assets/home/categories/backgrounds/ride-bg.png',
      image: '/assets/home/categories/png/ride.png',
      titleColor: 'text-[#0D47FF]',
      subtitleColor: 'text-black',
      btnBg: 'bg-[#0D47FF] hover:bg-[#0038E0]',
      imgOffset: '-mb-0.5 sm:-mb-14 md:-mb-20 lg:-mb-24',
      imgScale: 'scale-[2.45] sm:scale-110 md:scale-115',
      imgShift: '-translate-x-1.5 sm:translate-x-0',
      link: '/ride'
    },
    {
      id: 'grocery',
      name: 'Grocery',
      title: t('home.categoryGrocery', 'Grocery'),
      subtitle: t('home.grocerySubtitle', 'Daily essentials delivered fast'),
      background: '/assets/home/categories/backgrounds/grocery-bg.png',
      image: '/assets/home/categories/png/grocery.png',
      titleColor: 'text-[#00C853]',
      subtitleColor: 'text-black',
      btnBg: 'bg-[#00C853] hover:bg-[#00B248]',
      imgOffset: 'mb-0 sm:-mb-12 md:-mb-16 lg:-mb-20',
      imgScale: 'scale-[2.05] sm:scale-105 md:scale-110',
      imgShift: 'translate-x-0 sm:translate-x-0',
      link: '/restaurants?category=grocery'
    },
    {
      id: 'bakery_beverages',
      name: 'Bakery & Beverages',
      title: t('home.categoryBakery', 'Bakery & Beverages'),
      subtitle: t('home.bakerySubtitle', 'Fresh cakes, puffs, snacks & cool drinks'),
      background: '/assets/home/categories/backgrounds/bakery-bg.png',
      image: '/assets/home/categories/png/bakery.png',
      titleColor: 'text-[#E91E63]',
      subtitleColor: 'text-black',
      btnBg: 'bg-[#E91E63] hover:bg-[#D81B60]',
      imgOffset: 'mb-0 sm:-mb-10 md:-mb-14 lg:-mb-16',
      imgScale: 'scale-[1.70] sm:scale-100 md:scale-105',
      imgShift: 'translate-x-2 sm:translate-x-0',
      link: '/restaurants?category=beverages'
    },
    {
      id: 'veg_fruits',
      name: 'Veg & Fruits',
      title: t('home.categoryVegFruits', 'Veg & Fruits'),
      subtitle: t('home.vegFruitsSubtitle', 'Fresh vegetables & fruits'),
      background: '/assets/home/categories/backgrounds/veg-fruits-bg.png',
      image: '/assets/home/categories/png/veg-fruits.png',
      titleColor: 'text-[#009688]',
      subtitleColor: 'text-black',
      btnBg: 'bg-[#009688] hover:bg-[#00796B]',
      imgOffset: '-mb-0.5 sm:-mb-14 md:-mb-20 lg:-mb-24',
      imgScale: 'scale-[2.30] sm:scale-110 md:scale-115',
      imgShift: '-translate-x-1.5 sm:translate-x-0',
      link: '/restaurants?category=fruits-vegetables'
    },
    {
      id: 'meat',
      name: 'Meat',
      title: t('home.categoryMeat', 'Meat'),
      subtitle: t('home.meatSubtitle', 'Fresh meat, chicken & fish'),
      background: '/assets/home/categories/backgrounds/meat-bg.png',
      image: '/assets/home/categories/png/meat.png',
      titleColor: 'text-[#FF3D00]',
      subtitleColor: 'text-black',
      btnBg: 'bg-[#FF3D00] hover:bg-[#DD2C00]',
      imgOffset: '-mb-0.5 sm:-mb-16 md:-mb-24 lg:-mb-28',
      imgScale: 'scale-[1.90] sm:scale-110 md:scale-115',
      imgShift: 'translate-x-1 sm:translate-x-0',
      link: '/restaurants?category=meat'
    }
  ];

  const activeBanner = bannerSlides[currentSlide] || bannerSlides[0];

  return (
    <div className="flex flex-col gap-3.5 sm:gap-5 md:gap-8 pb-24 md:pb-20 max-w-7xl mx-auto px-3 sm:px-4 md:px-8 w-full animate-fade-in transition-colors duration-300">

      {/* 1. HERO ADVERTISEMENT CAROUSEL (PURPLE -> PINK -> ORANGE VIBRANT GRADIENT) */}
      <section
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative rounded-3xl sm:rounded-[32px] overflow-hidden ${activeBanner.bgGradient} text-white p-4 sm:p-6 md:p-10 lg:p-12 shadow-[0_8px_30px_rgba(123,31,162,0.25)] flex flex-row items-center justify-between min-h-[160px] sm:min-h-[220px] md:min-h-[300px] transition-all duration-700 group select-none`}
      >

        {/* Decorative Floating Shapes & Watermark Accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
          <div className="absolute top-3 left-1/4 w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 bg-yellow-300 rounded-sm rotate-45"></div>
          <div className="absolute top-8 left-1/3 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-pink-200 rounded-full"></div>
          <div className="absolute bottom-4 left-1/5 w-3 sm:w-4 h-1.5 sm:h-2 bg-yellow-200 rounded-full rotate-12"></div>
          <div className="absolute top-4 right-1/3 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-yellow-300 rounded-sm rotate-12"></div>
          <div className="absolute bottom-6 right-1/4 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-white rounded-full"></div>
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

        {/* Active Banner Slide Content */}
        <div key={activeBanner.id} className="w-full flex flex-row items-center justify-between animate-fade-in transition-all duration-500 z-10">

          {/* Left Text & CTA Content */}
          <div className="flex flex-col items-start gap-1 sm:gap-2.5 md:gap-3.5 z-10 w-[55%] sm:w-[55%] md:w-[52%] flex-1">
            <span className="text-xs sm:text-base md:text-2xl font-bold text-white/95 tracking-tight leading-none">
              {activeBanner.title}
            </span>
            <h1 className="font-display font-black text-2xl sm:text-4xl md:text-6xl lg:text-7xl text-[#FFEB3B] tracking-tight leading-none drop-shadow-sm">
              {activeBanner.highlight}
            </h1>
            <p className="text-[11px] sm:text-xs md:text-base text-white/95 font-medium leading-tight sm:leading-relaxed max-w-xs md:max-w-md line-clamp-2 md:line-clamp-none">
              {activeBanner.subtitle}
            </p>

            <Link
              to={activeBanner.link}
              className="mt-1.5 sm:mt-3 md:mt-5 inline-flex items-center gap-1 sm:gap-2 bg-[#FFEB3B] hover:bg-[#FDD835] text-gray-950 font-black text-xs sm:text-sm md:text-base px-4 sm:px-6 md:px-7 py-1.5 sm:py-2.5 md:py-3 rounded-full shadow-md shadow-yellow-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>{activeBanner.buttonText || t('common.orderNow', 'Order Now')}</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 stroke-[3]" />
            </Link>
          </div>

          {/* Right Banner Artwork Graphics (Rider & App Smartphone) */}
          <div className="w-[45%] sm:w-[45%] md:w-[48%] flex items-center justify-center md:justify-end z-10 pl-2 sm:pl-4">
            <div className="relative max-w-[170px] sm:max-w-[260px] md:max-w-[420px] lg:max-w-[480px] w-full flex items-center justify-center">
              <img
                src={getImageUrl(activeBanner.image, 'banner')}
                alt={activeBanner.highlight || activeBanner.title}
                onError={(e) => handleImageError(e, 'banner')}
                className="w-full h-auto max-h-[135px] sm:max-h-[190px] md:max-h-[260px] object-cover rounded-2xl sm:rounded-3xl shadow-lg shadow-purple-950/30"
              />
            </div>
          </div>

        </div>

        {/* Slide Indicators / Dots at Bottom (Elongated Yellow Pill for Active) */}
        {bannerSlides.length > 1 && (
          <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-20">
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
                    ? 'w-6 sm:w-7 bg-[#FFEB3B] shadow-sm'
                    : 'w-1.5 sm:w-2 bg-white/50 hover:bg-white/80'
                }`}
                title={`Banner ${idx + 1}`}
              />
            ))}
          </div>
        )}

      </section>

      {/* 2. SECTION HEADING WITH COLORFUL DECORATIVE ACCENT */}
      <section className="mt-1 sm:mt-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center text-[#FF5722] font-black text-lg sm:text-xl leading-none select-none">
            <span className="-mr-1">›</span>
            <span>›</span>
          </div>
          <h2 className="font-display font-black text-base sm:text-xl md:text-2xl text-gray-950 dark:text-white tracking-tight">
            {t('home.whatToOrder', 'What would you like to order?')}
          </h2>
        </div>
      </section>

      {/* 3. CATEGORY CARDS (3-COLUMN GRID ON DESKTOP, MATCHING TARGET DESIGN) */}
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5 md:gap-6 lg:gap-7">
        {categories.map((cat) => {
          const currentCat = categoryStatus[cat.id] || { status: 'OPEN', isEnabled: true, message: null };
          const isEnabled = typeof currentCat === 'boolean' ? currentCat : currentCat.isEnabled !== false;
          const status = currentCat.status || (isEnabled ? 'OPEN' : 'DISABLED');
          const isOpen = status === 'OPEN';
          const isClosed = status === 'CLOSED';
          const isDisabled = status === 'DISABLED' || !isEnabled;
          const closedMsg = currentCat.message || t('home.serviceClosed', 'Service Closed');

          const cardContent = (
            <>
              {/* Category Foreground Product Artwork (Enlarged and centered on mobile, preserved on desktop) */}
              <div className={`w-full flex-1 flex flex-col items-center justify-end min-h-0 sm:min-h-[220px] md:min-h-[280px] lg:min-h-[320px] pt-1 md:pt-4 ${cat.imgOffset} group-hover:scale-105 transition-transform duration-300 pointer-events-none z-0 overflow-visible`}>
                <img
                  src={cat.image}
                  alt={cat.title}
                  className={`w-full sm:w-[96%] md:w-[98%] max-w-full sm:max-w-[400px] md:max-w-[460px] lg:max-w-[500px] h-[80px] sm:h-auto max-h-[88px] sm:max-h-[250px] md:max-h-[310px] lg:max-h-[350px] ${cat.imgScale} ${cat.imgShift} object-contain mx-auto block drop-shadow-md`}
                />
              </div>

              {/* Centered Content: Large Title, Large Black Subtitle, Large Circular Arrow Button */}
              <div className="w-full flex flex-col items-center justify-end z-10 pt-0.5 pb-0.5 sm:pb-2">
                <h3 className={`font-display font-black text-sm sm:text-3xl md:text-4xl lg:text-[42px] xl:text-[44px] ${cat.titleColor} tracking-tight leading-tight line-clamp-1 sm:line-clamp-none`}>
                  {cat.title}
                </h3>
                <p style={{ color: '#000000' }} className="mt-0.5 sm:mt-2 text-[10px] sm:text-base md:text-lg lg:text-xl xl:text-2xl text-black dark:text-black font-semibold leading-tight line-clamp-1 sm:line-clamp-none max-w-[140px] sm:max-w-[260px] md:max-w-[300px] lg:max-w-[340px]">
                  {cat.subtitle}
                </p>

                {/* Centered Large Circular Arrow Button */}
                <div className={`mt-1.5 sm:mt-3.5 md:mt-4 lg:mt-5 w-6 h-6 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-13 lg:h-13 rounded-full ${cat.btnBg} text-white flex items-center justify-center shadow-xs sm:shadow-md group-hover:scale-110 active:scale-95 transition-all duration-200`}>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-5 sm:h-5 md:w-6 md:h-6 stroke-[2.5] sm:stroke-[3]" />
                </div>
              </div>

              {/* Closed Service Hours Overlay */}
              {isClosed && (
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[2.5px] rounded-3xl sm:rounded-[36px] md:rounded-[40px] flex flex-col items-center justify-center p-3 sm:p-4 text-center z-20 select-none animate-fade-in transition-all">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500/20 backdrop-blur-md flex items-center justify-center mb-1.5 shadow-sm border border-amber-400/40">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 mb-0.5 drop-shadow-xs">
                    {t('home.closedNow', 'CLOSED NOW')}
                  </span>
                  <p className="text-white font-bold text-xs sm:text-sm leading-tight drop-shadow-sm px-2">
                    {closedMsg}
                  </p>
                </div>
              )}

              {/* Disabled / Service Unavailable Overlay */}
              {isDisabled && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2.5px] rounded-3xl sm:rounded-[36px] md:rounded-[40px] flex flex-col items-center justify-center p-3 sm:p-4 text-center z-20 select-none animate-fade-in transition-all">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-1.5 shadow-sm border border-white/30">
                    <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-white stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-red-300 mb-0.5 drop-shadow-xs">
                    {t('home.serviceDisabled', 'SERVICE DISABLED')}
                  </span>
                  <p className="text-white font-bold text-xs sm:text-sm leading-tight drop-shadow-sm px-2">
                    {t('home.serviceUnavailable', 'We are not providing this service currently.')}
                  </p>
                </div>
              )}
            </>
          );

          if (isOpen) {
            return (
              <Link
                key={cat.id}
                to={cat.link}
                style={{
                  backgroundImage: `url(${cat.background})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
                className="relative rounded-3xl sm:rounded-[36px] md:rounded-[40px] p-2.5 sm:p-5 md:p-6 lg:p-7 pt-2.5 sm:pt-6 md:pt-8 pb-3 sm:pb-6 md:pb-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group flex flex-col items-center justify-between text-center cursor-pointer overflow-hidden shadow-xs select-none aspect-square sm:aspect-auto sm:min-h-[370px] md:min-h-[450px] lg:min-h-[490px]"
              >
                {cardContent}
              </Link>
            );
          }

          const clickMessage = isClosed
            ? `${cat.title}: ${closedMsg}`
            : t('home.serviceUnavailable', 'We are not providing this service currently.');

          return (
            <div
              key={cat.id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                showToast(clickMessage, 'error');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  showToast(clickMessage, 'error');
                }
              }}
              style={{
                backgroundImage: `url(${cat.background})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
              className="relative rounded-3xl sm:rounded-[36px] md:rounded-[40px] p-2.5 sm:p-5 md:p-6 lg:p-7 pt-2.5 sm:pt-6 md:pt-8 pb-3 sm:pb-6 md:pb-8 transition-all duration-300 group flex flex-col items-center justify-between text-center cursor-not-allowed overflow-hidden shadow-xs select-none opacity-95 aspect-square sm:aspect-auto sm:min-h-[370px] md:min-h-[450px] lg:min-h-[490px]"
            >
              {cardContent}
            </div>
          );
        })}
      </section>

    </div>
  );
}