import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Bike,
  ShieldCheck,
  Tag,
  Headphones
} from 'lucide-react';
import { API_BASE } from '../config/api';

export default function Home() {
  const navigate = useNavigate();
  const [foodAvailable, setFoodAvailable] = useState(true);
  const [rideAvailable, setRideAvailable] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/driver-availability`);
        if (res.ok) {
          const data = await res.json();
          setFoodAvailable(data.foodAvailable ?? true);
          setRideAvailable(data.rideAvailable ?? true);
        }
      } catch (err) {
        console.error('Error fetching driver availability:', err);
      }
    };
    fetchAvailability();
  }, []);

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
      subtitle: 'Quick rides and fast courier service',
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
      subtitle: 'Refreshing drinks, ice creams & more',
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
      subtitle: 'Fresh vegetables and fruits',
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
      subtitle: 'Fresh meat, chicken, fish & eggs',
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

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto px-4 md:px-8 w-full animate-fade-in transition-colors duration-300">

      {/* 1. HERO BANNER SECTION */}
      <section className="relative rounded-[28px] overflow-hidden bg-gradient-to-r from-[#6B11A9] via-[#85169E] to-[#F43F5E] text-white p-6 sm:p-8 md:p-12 shadow-[0_12px_40px_rgba(107,17,169,0.25)] dark:shadow-[0_12px_45px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between min-h-[300px] md:min-h-[320px]">

        {/* Subtle Confetti / Decorative Geometric Accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
          <div className="absolute top-6 left-1/4 w-3 h-3 bg-yellow-300 rounded-sm rotate-45"></div>
          <div className="absolute top-16 left-1/3 w-2 h-2 bg-pink-300 rounded-full"></div>
          <div className="absolute bottom-8 left-1/5 w-3 h-1.5 bg-blue-300 rounded-full rotate-12"></div>
          <div className="absolute top-8 right-1/3 w-3 h-3 bg-cyan-300 rounded-sm rotate-12"></div>
          <div className="absolute bottom-12 right-1/4 w-2.5 h-2.5 bg-yellow-200 rounded-full"></div>
          <div className="absolute top-1/2 left-10 w-2 h-2 bg-white rounded-full"></div>
        </div>

        {/* Left Text Content */}
        <div className="flex flex-col items-start gap-2.5 sm:gap-3.5 max-w-lg z-10 w-full md:w-[55%]">
          <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Welcome to
          </span>
          <h1 className="font-display font-black text-5xl sm:text-6xl md:text-7xl text-[#FFD700] tracking-tight leading-none drop-shadow-sm">
            Jinkzo
          </h1>
          <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed mt-1 max-w-md">
            Food, groceries, meat, fruits &amp; more delivered fast at your doorstep!
          </p>

          <Link
            to="/restaurants"
            className="mt-3 sm:mt-5 inline-flex items-center gap-2 bg-[#FFD700] hover:bg-[#FACC15] text-gray-900 font-black text-sm sm:text-base px-7 py-3 rounded-full shadow-lg shadow-yellow-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Order Now</span>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
          </Link>
        </div>

        {/* Right 3D Illustration Graphics */}
        <div className="w-full md:w-[45%] flex items-center justify-center md:justify-end mt-6 md:mt-0 z-10">
          <div className="relative max-w-[380px] sm:max-w-[450px] md:max-w-[500px] w-full flex items-center justify-center">
            <img
              src="/assets/hero_delivery_banner.jpg"
              alt="Jinkzo Delivery Rider & App"
              className="w-full h-auto object-cover rounded-2xl shadow-xl shadow-purple-950/20"
            />
          </div>
        </div>
      </section>

      {/* 2. SECTION HEADING */}
      <section className="mt-2">
        <h2 className="font-display font-black text-xl sm:text-2xl text-gray-900 dark:text-white tracking-tight transition-colors">
          What would you like to order?
        </h2>
      </section>

      {/* 3. CATEGORY CARDS (2 ROWS OF 3) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={cat.link}
            className={`${cat.bgColor} ${cat.borderColor} border rounded-[26px] p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group flex items-center justify-between gap-3 cursor-pointer relative overflow-hidden`}
          >
            {/* Left Content */}
            <div className="flex flex-col justify-between h-full min-h-[120px] z-10 flex-1">
              <div>
                <h3 className={`font-display font-black text-xl sm:text-2xl ${cat.textColor} leading-tight`}>
                  {cat.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 font-medium mt-1.5 leading-snug max-w-[150px] sm:max-w-[170px]">
                  {cat.subtitle}
                </p>
              </div>

              {/* Action Circle Button */}
              <div className="mt-4">
                <div className={`w-9 h-9 rounded-full ${cat.btnBg} shadow-sm border flex items-center justify-center ${cat.arrowColor} group-hover:scale-110 transition-all duration-200`}>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </div>
              </div>
            </div>

            {/* Right Product Image with seamless blending */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0 flex items-center justify-center relative z-10 group-hover:scale-105 transition-transform duration-300 rounded-2xl overflow-hidden">
              {/* Light mode rendering */}
              <img
                src={cat.image}
                alt={cat.title}
                className="w-full h-full object-contain mix-blend-multiply dark:hidden"
              />
              {/* Dark mode rendering */}
              <img
                src={cat.darkImage || cat.image}
                alt={cat.title}
                className="w-full h-full object-contain hidden dark:block mix-blend-screen rounded-2xl"
              />
            </div>
          </Link>
        ))}
      </section>

      {/* 4. TRUST / FEATURE BADGES BAR */}
      <section className="bg-white dark:bg-[#141926] rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/10 mt-2 transition-colors duration-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-white/10">

          {/* Feature 1: Fast Delivery */}
          <div className="flex items-center gap-3 sm:gap-3.5 px-2 pt-2 sm:pt-0">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#C084FC] flex items-center justify-center flex-shrink-0">
              <Bike className="w-5 h-5 text-[#7C3AED] dark:text-[#C084FC]" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white leading-tight">
                Fast Delivery
              </span>
              <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5">
                On time, every time
              </span>
            </div>
          </div>

          {/* Feature 2: Safe & Secure */}
          <div className="flex items-center gap-3 sm:gap-3.5 px-2 pt-2 sm:pt-0 sm:pl-6">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-[#E11D48]/20 text-[#E11D48] dark:text-[#FB7185] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#E11D48] dark:text-[#FB7185]" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white leading-tight">
                Safe &amp; Secure
              </span>
              <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5">
                100% secure payments
              </span>
            </div>
          </div>

          {/* Feature 3: Best Offers */}
          <div className="flex items-center gap-3 sm:gap-3.5 px-2 pt-2 sm:pt-0 sm:pl-6">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-[#D97706]/20 text-[#D97706] dark:text-[#FBBF24] flex items-center justify-center flex-shrink-0">
              <Tag className="w-5 h-5 text-[#D97706] dark:text-[#FBBF24]" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white leading-tight">
                Best Offers
              </span>
              <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5">
                Great deals &amp; discounts
              </span>
            </div>
          </div>

          {/* Feature 4: 24/7 Support */}
          <div className="flex items-center gap-3 sm:gap-3.5 px-2 pt-2 sm:pt-0 sm:pl-6">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-[#059669]/20 text-[#059669] dark:text-[#34D399] flex items-center justify-center flex-shrink-0">
              <Headphones className="w-5 h-5 text-[#059669] dark:text-[#34D399]" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white leading-tight">
                24/7 Support
              </span>
              <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5">
                We're here to help
              </span>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}