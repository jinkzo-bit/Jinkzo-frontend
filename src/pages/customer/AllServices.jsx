import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShoppingCart, Search } from 'lucide-react';
import ServiceCard from '../../components/ServiceCard';

export default function AllServices() {
  const navigate = useNavigate();

  const services = [
    {
      title: 'Food',
      description: 'Delicious meals from top restaurants',
      image: '/services/food.jpg',
      icon: '🍔',
      to: '/restaurants',
      arrowBgClass: 'bg-purple-100 dark:bg-purple-900/40',
      arrowColorClass: 'text-purple-600 dark:text-purple-400',
      isAvailable: true
    },
    {
      title: 'Ride & Courier',
      description: 'Quick rides and courier service',
      image: '/services/ride.jpg',
      icon: '🏍️',
      to: '/ride',
      arrowBgClass: 'bg-orange-100 dark:bg-orange-900/40',
      arrowColorClass: 'text-orange-600 dark:text-orange-400',
      isAvailable: true
    },
    {
      title: 'Grocery',
      description: 'Daily essentials delivered fast',
      image: '/services/grocery.jpg',
      icon: '🛒',
      to: '/customer/grocery',
      arrowBgClass: 'bg-green-100 dark:bg-green-900/40',
      arrowColorClass: 'text-green-600 dark:text-green-400',
      isAvailable: true
    },
    {
      title: 'Hot & Cool',
      description: 'Refreshing drinks, ice creams & more',
      image: '/services/hot-cool.jpg',
      icon: '🥤',
      to: '/customer/hot-cool',
      arrowBgClass: 'bg-blue-100 dark:bg-blue-900/40',
      arrowColorClass: 'text-blue-600 dark:text-blue-400',
      isAvailable: true
    },
    {
      title: 'Veg & Fruits',
      description: 'Fresh vegetables and fruits',
      image: '/services/veg-fruits.jpg',
      icon: '🥬',
      to: '/customer/veg-fruits',
      arrowBgClass: 'bg-emerald-100 dark:bg-emerald-900/40',
      arrowColorClass: 'text-emerald-600 dark:text-emerald-400',
      isAvailable: true
    },
    {
      title: 'Meat',
      description: 'Fresh meat, chicken, fish & eggs',
      image: '/services/meat.jpg',
      icon: '🥩',
      to: '/customer/meat',
      arrowBgClass: 'bg-rose-100 dark:bg-rose-900/40',
      arrowColorClass: 'text-rose-600 dark:text-rose-400',
      isAvailable: true
    }
  ];

  return (
    <div className="flex flex-col pb-24 max-w-7xl mx-auto w-full animate-fade-in bg-gradient-to-b from-[#E7E2FE] via-[#FCEBF9] to-[#FFF3EB] dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-xs border-b border-line px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-main hover:bg-base rounded-full transition-colors cursor-pointer" aria-label="Go back">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="font-display font-black text-lg text-main">All Categories</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/restaurants')} className="p-2 text-main hover:bg-base rounded-full transition-colors cursor-pointer" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/cart')} className="p-2 text-main hover:bg-base rounded-full transition-colors relative cursor-pointer" aria-label="Cart">
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6">
        <h2 className="font-display font-black text-xl text-main mb-4">Our Services</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
      </div>
    </div>
  );
}
