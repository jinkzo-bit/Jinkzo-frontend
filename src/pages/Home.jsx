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
import CategoryCardRenderer from '../components/common/CategoryCardRenderer';
import PromoBannerRenderer from '../components/common/PromoBannerRenderer';
import HomeHeroCarousel from '../components/common/HomeHeroCarousel';
import HomeBackgroundRenderer from '../components/common/HomeBackgroundRenderer';
import { DEFAULT_CATEGORY_DESIGNS } from '../utils/categoryDesignDefaults';

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

const HOME_DESIGN_CACHE_KEY = 'jinkzo_home_design_cache_v1';

const getCachedHomeDesign = () => {
  try {
    const raw = localStorage.getItem(HOME_DESIGN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 1 && typeof parsed.categoryDesigns === 'object') {
      return parsed;
    }
  } catch (e) {
    // ignore invalid cache
  }
  return null;
};

const setCachedHomeDesign = (data) => {
  try {
    if (!data) return;
    const payload = {
      v: 1,
      timestamp: Date.now(),
      homeHeroBanners: data.homeHeroBanners || [],
      homeBackgroundConfig: data.homeBackgroundConfig || { type: 'default' },
      categoryDesigns: data.categoryDesigns || DEFAULT_CATEGORY_DESIGNS
    };
    localStorage.setItem(HOME_DESIGN_CACHE_KEY, JSON.stringify(payload));
  } catch (e) {
    // ignore storage errors
  }
};

const preloadVisualAssets = (bgConfig, heroBanners) => {
  try {
    const urls = [];
    if (bgConfig?.type === 'image') {
      const bgImg = bgConfig.image?.mobileImageUrl || bgConfig.image?.desktopImageUrl || bgConfig.image?.imageUrl;
      if (bgImg) urls.push(getImageUrl(bgImg, 'banner'));
    }
    if (Array.isArray(heroBanners) && heroBanners.length > 0) {
      const firstHero = heroBanners[0]?.publishedConfig || heroBanners[0]?.draftConfig;
      if (firstHero) {
        const heroBg = firstHero.layered?.background?.mobileImageUrl || firstHero.layered?.background?.desktopImageUrl || firstHero.layered?.background?.imageUrl;
        if (heroBg) urls.push(getImageUrl(heroBg, 'banner'));
        const singleImg = firstHero.single?.desktop?.en?.imageUrl || firstHero.single?.defaultImage?.imageUrl;
        if (singleImg) urls.push(getImageUrl(singleImg, 'banner'));
      }
    }
    urls.forEach(url => {
      if (url && typeof url === 'string' && !url.startsWith('data:')) {
        const img = new Image();
        img.src = url;
      }
    });
  } catch (e) {
    // ignore preloading errors
  }
};

export default function Home() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { showToast } = useCartStore();
  const [foodAvailable, setFoodAvailable] = useState(true);
  const [rideAvailable, setRideAvailable] = useState(true);

  // Load synchronous cache for immediate zero-flash first paint
  const cachedDesign = getCachedHomeDesign();

  // Category Designs (Visual Presentation)
  const [categoryDesigns, setCategoryDesigns] = useState(
    cachedDesign?.categoryDesigns || DEFAULT_CATEGORY_DESIGNS
  );

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
  const [homeHeroBanners, setHomeHeroBanners] = useState(
    cachedDesign?.homeHeroBanners || []
  );
  const [bannerSlides, setBannerSlides] = useState(DEFAULT_BANNER_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Home Background Configuration
  const [homeBackgroundConfig, setHomeBackgroundConfig] = useState(
    cachedDesign?.homeBackgroundConfig || { type: 'default' }
  );

  // Design Loading & Readiness State (prevents default-design swap flash if no cache exists)
  const [isHomeDesignLoading, setIsHomeDesignLoading] = useState(!cachedDesign);

  // Mobile Touch Swipe Handling
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    const fetchAvailabilityAndBanners = async () => {
      try {
        const [availRes, bannersRes, catServicesRes, catDesignsRes, heroBannersRes, bgRes] = await Promise.allSettled([
          fetch(`${API_BASE}/auth/driver-availability`),
          fetch(`${API_BASE}/restaurants/banners`),
          fetch(`${API_BASE}/restaurants/category-services`),
          fetch(`${API_BASE}/category-designs/published`),
          fetch(`${API_BASE}/home-hero-banners/active`),
          fetch(`${API_BASE}/home-background`)
        ]);

        let updatedHeroBanners = homeHeroBanners;
        let updatedBgConfig = homeBackgroundConfig;
        let updatedCategoryDesigns = categoryDesigns;

        if (heroBannersRes.status === 'fulfilled' && heroBannersRes.value.ok) {
          const heroData = await heroBannersRes.value.json();
          if (Array.isArray(heroData)) {
            updatedHeroBanners = heroData;
            setHomeHeroBanners(heroData);
          }
        }

        if (bgRes.status === 'fulfilled' && bgRes.value.ok) {
          const bgData = await bgRes.value.json();
          if (bgData && bgData.success && bgData.config) {
            updatedBgConfig = bgData.config;
            setHomeBackgroundConfig(bgData.config);
          }
        }

        if (catDesignsRes.status === 'fulfilled' && catDesignsRes.value.ok) {
          const designsData = await catDesignsRes.value.json();
          if (designsData && typeof designsData === 'object') {
            updatedCategoryDesigns = { ...DEFAULT_CATEGORY_DESIGNS, ...designsData };
            setCategoryDesigns(updatedCategoryDesigns);
          }
        }

        // Sync local cache for next load
        setCachedHomeDesign({
          homeHeroBanners: updatedHeroBanners,
          homeBackgroundConfig: updatedBgConfig,
          categoryDesigns: updatedCategoryDesigns
        });

        // Preload visual assets for instant frame paint
        preloadVisualAssets(updatedBgConfig, updatedHeroBanners);

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
                bgGradient: gradients[idx % gradients.length],
                design: b.design || null
              };
            });
            setBannerSlides(mapped);
          }
        }
      } catch (err) {
        console.error('Error fetching driver availability, categories, or banners:', err);
      } finally {
        setIsHomeDesignLoading(false);
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

      socket.on('categoryDesignPublished', (data) => {
        if (data && data.categoryKey && data.publishedConfig) {
          setCategoryDesigns(prev => {
            const updated = { ...prev, [data.categoryKey]: data.publishedConfig };
            setCachedHomeDesign({ homeHeroBanners, homeBackgroundConfig, categoryDesigns: updated });
            return updated;
          });
        }
      });

      socket.on('bannerDesignPublished', (data) => {
        if (data && data.bannerId && data.publishedConfig) {
          setBannerSlides(prev => prev.map(slide => {
            if (String(slide.id) === String(data.bannerId)) {
              return { ...slide, design: data.publishedConfig };
            }
            return slide;
          }));
        }
      });

      const reloadHeroBanners = () => {
        fetch(`${API_BASE}/home-hero-banners/active`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setHomeHeroBanners(data);
              setCachedHomeDesign({ homeHeroBanners: data, homeBackgroundConfig, categoryDesigns });
            }
          })
          .catch(() => {});
      };

      const reloadHomeBackground = () => {
        fetch(`${API_BASE}/home-background`)
          .then(res => res.json())
          .then(data => {
            if (data && data.success && data.config) {
              setHomeBackgroundConfig(data.config);
              setCachedHomeDesign({ homeHeroBanners, homeBackgroundConfig: data.config, categoryDesigns });
            }
          })
          .catch(() => {});
      };

      socket.on('homeHeroBannerPublished', reloadHeroBanners);
      socket.on('homeHeroBannerUpdated', reloadHeroBanners);
      socket.on('homeHeroBannerDeleted', reloadHeroBanners);
      socket.on('homeBackgroundPublished', (data) => {
        if (data && data.publishedConfig) {
          setHomeBackgroundConfig(data.publishedConfig);
          setCachedHomeDesign({ homeHeroBanners, homeBackgroundConfig: data.publishedConfig, categoryDesigns });
        } else {
          reloadHomeBackground();
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
      cardImage: '/assets/home/categories/cards/food-card.webp',
      titleColor: 'text-[#FF4B16]',
      btnBg: 'bg-[#FF4B16] hover:bg-[#E63E00]',
      link: '/restaurants'
    },
    {
      id: 'ride',
      name: 'Ride & Courier',
      title: t('home.categoryRide', 'Ride & Courier'),
      subtitle: t('home.rideSubtitle', 'Quick rides & courier service'),
      cardImage: '/assets/home/categories/cards/ride-card.webp',
      titleColor: 'text-[#1557FF]',
      btnBg: 'bg-[#1557FF] hover:bg-[#0D47FF]',
      link: '/ride'
    },
    {
      id: 'grocery',
      name: 'Grocery',
      title: t('home.categoryGrocery', 'Grocery'),
      subtitle: t('home.grocerySubtitle', 'Daily essentials delivered fast'),
      cardImage: '/assets/home/categories/cards/grocery-card.webp',
      titleColor: 'text-[#00B83E]',
      btnBg: 'bg-[#00B83E] hover:bg-[#009E35]',
      link: '/restaurants?category=grocery'
    },
    {
      id: 'bakery_beverages',
      name: 'Bakery & Beverages',
      title: t('home.categoryBakery', 'Bakery & Beverages'),
      subtitle: t('home.bakerySubtitle', 'Fresh cakes, puffs, snacks & cool drinks'),
      cardImage: '/assets/home/categories/cards/bakery-card.webp',
      titleColor: 'text-[#ED1761]',
      btnBg: 'bg-[#ED1761] hover:bg-[#D60F53]',
      link: '/restaurants?category=beverages'
    },
    {
      id: 'veg_fruits',
      name: 'Veg & Fruits',
      title: t('home.categoryVegFruits', 'Veg & Fruits'),
      subtitle: t('home.vegFruitsSubtitle', 'Fresh vegetables & fruits'),
      cardImage: '/assets/home/categories/cards/veg-fruits-card.webp',
      titleColor: 'text-[#008F83]',
      btnBg: 'bg-[#008F83] hover:bg-[#007A70]',
      link: '/restaurants?category=fruits-vegetables'
    },
    {
      id: 'meat',
      name: 'Meat',
      title: t('home.categoryMeat', 'Meat'),
      subtitle: t('home.meatSubtitle', 'Fresh meat, chicken & fish'),
      cardImage: '/assets/home/categories/cards/meat-card.webp',
      titleColor: 'text-[#FF4B0A]',
      btnBg: 'bg-[#FF4B0A] hover:bg-[#E63E00]',
      link: '/restaurants?category=meat'
    }
  ];

  const activeBanner = bannerSlides[currentSlide] || bannerSlides[0];

  if (isHomeDesignLoading) {
    return (
      <HomeBackgroundRenderer config={{ type: 'default' }}>
        <div
          style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
          className="flex flex-col gap-3.5 sm:gap-5 md:gap-8 max-w-7xl mx-auto px-3 sm:px-4 md:px-8 w-full box-border animate-fade-in"
        >
          {/* Hero Banner Skeleton */}
          <div className="w-full aspect-[16/6] sm:aspect-[16/5] rounded-3xl sm:rounded-[32px] bg-surface/80 border border-line animate-pulse flex flex-col justify-end p-6 gap-3 shadow-xs">
            <div className="w-1/3 h-5 sm:h-7 rounded-xl bg-base" />
            <div className="w-2/3 h-7 sm:h-10 rounded-xl bg-base" />
            <div className="w-28 sm:w-36 h-8 sm:h-10 rounded-2xl bg-primary/20 mt-2" />
          </div>

          {/* Section Heading Skeleton */}
          <div className="flex items-center gap-2 mt-1 sm:mt-2">
            <div className="w-6 h-6 rounded-lg bg-surface animate-pulse" />
            <div className="w-48 sm:w-64 h-6 sm:h-8 rounded-xl bg-surface animate-pulse" />
          </div>

          {/* 6 Category Cards Skeleton Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6 lg:gap-7 w-full box-border">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="aspect-square w-full rounded-2xl sm:rounded-[24px] md:rounded-[28px] bg-surface/80 border border-line p-4 sm:p-6 flex flex-col justify-between animate-pulse shadow-xs"
              >
                <div className="w-1/2 h-5 sm:h-7 rounded-xl bg-base" />
                <div className="w-full h-1/2 rounded-2xl bg-base/50" />
              </div>
            ))}
          </div>
        </div>
      </HomeBackgroundRenderer>
    );
  }

  return (
    <HomeBackgroundRenderer config={homeBackgroundConfig}>
      <div
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
        className="flex flex-col gap-3.5 sm:gap-5 md:gap-8 max-w-7xl mx-auto px-3 sm:px-4 md:px-8 w-full box-border animate-fade-in transition-colors duration-300"
      >

        {/* 1. HERO ADVERTISEMENT CAROUSEL (NEW HOME HERO CAROUSEL WITH FALLBACK TO OLD CAROUSEL) */}
        {homeHeroBanners && homeHeroBanners.length > 0 ? (
          <HomeHeroCarousel banners={homeHeroBanners} />
        ) : (
          <section
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative rounded-3xl sm:rounded-[32px] overflow-hidden ${activeBanner.bgGradient} text-white p-4 sm:p-6 md:p-10 lg:p-12 shadow-[0_8px_30px_rgba(123,31,162,0.25)] flex flex-row items-center justify-between min-h-[160px] sm:min-h-[220px] md:min-h-[300px] transition-all duration-700 group select-none w-full box-border`}
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
              <PromoBannerRenderer
                slide={activeBanner}
                design={activeBanner.design}
                language={language}
              />
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
        )}

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

        {/* 3. CATEGORY CARDS (2-COLUMN LARGE SQUARE CARDS ON MOBILE, 3-COLUMN ON DESKTOP) */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6 lg:gap-7 w-full box-border">
          {categories.map((cat) => {
            const currentCat = categoryStatus[cat.id] || { status: 'OPEN', isEnabled: true, message: null };
            const isEnabled = currentCat.isEnabled !== false;
            const status = currentCat.status || (isEnabled ? 'OPEN' : 'DISABLED');
            const isOpen = status === 'OPEN' && isEnabled;
            const isClosed = status === 'CLOSED';
            const closedMsg = currentCat.message || t('home.categoryClosedMsg', 'Currently closed. Reopens as per daily schedule.');
            const customDesign = categoryDesigns[cat.id] || DEFAULT_CATEGORY_DESIGNS[cat.id];

            const cardContent = (
              <CategoryCardRenderer
                category={cat}
                design={customDesign}
                isOpen={isOpen}
                isClosed={isClosed}
                closedMsg={closedMsg}
              />
            );

            if (isOpen) {
              return (
                <Link
                  key={cat.id}
                  to={cat.link}
                  className="relative aspect-square w-full rounded-2xl sm:rounded-[24px] md:rounded-[28px] overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 group cursor-pointer block select-none bg-surface"
                  aria-label={cat.title}
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
                className="relative aspect-square w-full rounded-2xl sm:rounded-[24px] md:rounded-[28px] overflow-hidden shadow-xs group cursor-not-allowed select-none opacity-95 block bg-surface"
                aria-label={cat.title}
              >
                {cardContent}
              </div>
            );
          })}
        </section>

      </div>
    </HomeBackgroundRenderer>
  );
}