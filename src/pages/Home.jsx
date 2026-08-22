import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Lock
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
    food: true,
    ride: true,
    grocery: true,
    bakery_beverages: true,
    veg_fruits: true,
    meat: true
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
                statusMap[c.id] = c.isEnabled !== false;
                // Support aliases
                if (c.id === 'bakery_beverages') statusMap['cool_hot'] = c.isEnabled !== false;
                if (c.id === 'ride') statusMap['ride_courier'] = c.isEnabled !== false;
                if (c.id === 'veg_fruits') statusMap['fruits-vegetables'] = c.isEnabled !== false;
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
        if (data && data.categoryId) {
          setCategoryStatus(prev => {
            const updated = { ...prev, [data.categoryId]: data.isEnabled !== false };
            if (data.categoryId === 'bakery_beverages') updated['cool_hot'] = data.isEnabled !== false;
            if (data.categoryId === 'ride') updated['ride_courier'] = data.isEnabled !== false;
            if (data.categoryId === 'veg_fruits') updated['fruits-vegetables'] = data.isEnabled !== false;
            return updated;
          });
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
      title: t('home.categoryFood', 'Food'),
      subtitle: t('home.foodSubtitle', 'Tasty meals from top restaurants'),
      textColor: 'text-[#D9381E]',
      btnBg: 'bg-[#D9381E] hover:bg-[#C62828]',
      bgGradient: 'bg-gradient-to-b from-[#FFF5D6] via-[#FFEBB0] to-[#FFE08A]',
      borderColor: 'border-amber-200/90',
      image: '/assets/cat_food.jpg',
      link: '/restaurants'
    },
    {
      id: 'ride',
      title: t('home.categoryRide', 'Ride & Courier'),
      subtitle: t('home.rideSubtitle', 'Quick rides & courier service'),
      textColor: 'text-[#1565C0]',
      btnBg: 'bg-[#1565C0] hover:bg-[#0D47A1]',
      bgGradient: 'bg-gradient-to-b from-[#E1F5FE] via-[#B3E5FC] to-[#81D4FA]',
      borderColor: 'border-sky-200/90',
      image: '/assets/cat_ride.jpg',
      link: '/ride'
    },
    {
      id: 'grocery',
      title: t('home.categoryGrocery', 'Grocery'),
      subtitle: t('home.grocerySubtitle', 'Daily essentials delivered fast'),
      textColor: 'text-[#2E7D32]',
      btnBg: 'bg-[#2E7D32] hover:bg-[#1B5E20]',
      bgGradient: 'bg-gradient-to-b from-[#E8F8E8] via-[#C8E6C9] to-[#A5D6A7]',
      borderColor: 'border-green-200/90',
      image: '/assets/cat_grocery.jpg',
      link: '/restaurants?category=grocery'
    },
    {
      id: 'bakery_beverages',
      title: t('home.categoryBakery', 'Bakery & Beverages'),
      subtitle: t('home.bakerySubtitle', 'Fresh cakes, puffs, snacks & cool drinks'),
      textColor: 'text-[#C2185B]',
      btnBg: 'bg-[#C2185B] hover:bg-[#AD1457]',
      bgGradient: 'bg-gradient-to-b from-[#FCE4EC] via-[#F8BBD0] to-[#F48FB1]',
      borderColor: 'border-pink-200/90',
      image: '/assets/cat_hot_cool.jpg',
      link: '/restaurants?category=beverages'
    },
    {
      id: 'veg_fruits',
      title: t('home.categoryVegFruits', 'Veg & Fruits'),
      subtitle: t('home.vegFruitsSubtitle', 'Fresh vegetables & fruits'),
      textColor: 'text-[#00796B]',
      btnBg: 'bg-[#00796B] hover:bg-[#004D40]',
      bgGradient: 'bg-gradient-to-b from-[#E0F2F1] via-[#B2DFDB] to-[#80CBC4]',
      borderColor: 'border-teal-200/90',
      image: '/assets/cat_veg_fruits.jpg',
      link: '/restaurants?category=fruits-vegetables'
    },
    {
      id: 'meat',
      title: t('home.categoryMeat', 'Meat'),
      subtitle: t('home.meatSubtitle', 'Fresh meat, chicken & fish'),
      textColor: 'text-[#D84315]',
      btnBg: 'bg-[#D84315] hover:bg-[#BF360C]',
      bgGradient: 'bg-gradient-to-b from-[#FFF3E0] via-[#FFE0B2] to-[#FFCC80]',
      borderColor: 'border-orange-200/90',
      image: '/assets/cat_meat.jpg',
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

      {/* 3. CATEGORY CARDS (EXACT 2-COLUMN GRID, 3 ROWS, CENTER ALIGNED) */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {categories.map((cat) => {
          const isEnabled = categoryStatus[cat.id] !== false;

          const cardContent = (
            <>
              {/* Background Decorative Pattern / Watermark Details */}
              <div className="absolute inset-0 pointer-events-none opacity-25 overflow-hidden">
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full border border-black/10"></div>
                <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full border border-black/10"></div>
              </div>

              {/* Large Category Product Image (Top ~60% Dominant Visual) */}
              <div className="w-full h-28 sm:h-36 md:h-44 flex items-center justify-center relative z-10 group-hover:scale-105 transition-transform duration-300">
                <img
                  src={getImageUrl(cat.image, 'category')}
                  alt={cat.title}
                  onError={(e) => handleImageError(e, 'category')}
                  className="max-h-full max-w-full object-contain rounded-2xl drop-shadow-xs"
                />
              </div>

              {/* Centered Content: Title, Tagline, Circular Arrow Button */}
              <div className="flex flex-col items-center justify-center gap-0.5 z-10 w-full mt-2">
                <h3 className={`font-display font-black text-sm sm:text-base md:text-xl ${cat.textColor} tracking-tight leading-tight`}>
                  {cat.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-800 dark:text-gray-900 font-semibold leading-snug line-clamp-2 max-w-[150px] sm:max-w-none">
                  {cat.subtitle}
                </p>

                {/* Centered Circular Arrow Button */}
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${cat.btnBg} text-white flex items-center justify-center shadow-md shadow-black/10 mt-2 group-hover:scale-110 active:scale-95 transition-all duration-200`}>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              {/* Disabled / Service Unavailable Overlay */}
              {!isEnabled && (
                <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] rounded-3xl sm:rounded-[32px] flex flex-col items-center justify-center p-3 sm:p-4 text-center z-20 select-none animate-fade-in transition-all">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-sm border border-white/30">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.5]" />
                  </div>
                  <p className="text-white font-bold text-xs sm:text-sm leading-tight drop-shadow-sm px-2">
                    {t('home.serviceUnavailable', 'We are not providing this service currently.')}
                  </p>
                </div>
              )}
            </>
          );

          if (isEnabled) {
            return (
              <Link
                key={cat.id}
                to={cat.link}
                className={`${cat.bgGradient} ${cat.borderColor} border rounded-3xl sm:rounded-[32px] p-3.5 sm:p-5 md:p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group flex flex-col items-center justify-between text-center cursor-pointer relative overflow-hidden shadow-2xs`}
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <div
              key={cat.id}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                showToast(t('home.serviceUnavailable', 'We are not providing this service currently.'), 'error');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  showToast(t('home.serviceUnavailable', 'We are not providing this service currently.'), 'error');
                }
              }}
              className={`${cat.bgGradient} ${cat.borderColor} border rounded-3xl sm:rounded-[32px] p-3.5 sm:p-5 md:p-6 transition-all duration-300 group flex flex-col items-center justify-between text-center cursor-not-allowed relative overflow-hidden shadow-2xs opacity-95`}
            >
              {cardContent}
            </div>
          );
        })}
      </section>

    </div>
  );
}