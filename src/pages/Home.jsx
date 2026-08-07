import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config/api';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, MapPin, Heart, Star } from 'lucide-react';

// Hardcoded categories to match the mockup perfectly
const categories = [
  { id: 'grocery', name: 'GROCERY', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80', className: 'col-span-1 row-span-2' },
  { id: 'food', name: 'FOOD', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80', className: 'col-span-1 row-span-1' },
  { id: 'hot_cool', name: 'HOT & COOL', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=150&q=80', className: 'col-span-1 row-span-1' },
  { id: 'veg_fruits', name: 'VEG & FRUITS', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=150&q=80', className: 'col-span-1 row-span-1' },
  { id: 'meat', name: 'MEAT', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bd682f?auto=format&fit=crop&w=150&q=80', className: 'col-span-1 row-span-1' }
];

export default function Home() {
  const [featuredStores, setFeaturedStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch(`${API_BASE}/restaurants`);
        if (res.ok) {
          const data = await res.json();
          setFeaturedStores(data.slice(0, 5)); // Show top 5 as featured
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  return (
    <div className="min-h-screen bg-white pb-28 font-sans">
      
      {/* Top Banner Area with Gradient and Floating Items */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-[#ffdb99] via-[#ffe8b3] to-white pt-6 pb-8 px-4 rounded-b-[40px]">
        {/* Festive background pattern simulation */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#f00 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        
        {/* Header Bar */}
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-none mb-1">20 minutes</h1>
            <div className="flex items-center text-sm font-medium text-gray-700">
              <p className="truncate max-w-[250px]">QF9H+3MC, Plot No-1126, Quible Colony...</p>
              <ChevronDown className="w-4 h-4 ml-1 flex-shrink-0" />
            </div>
          </div>
          <button className="relative">
            <Bell className="w-6 h-6 text-gray-900" />
            <span className="absolute 1 top-0 right-0 w-2 h-2 bg-primary rounded-full border border-[#ffdb99]"></span>
          </button>
        </div>

        {/* Floating Food Banner (Mockup Style) */}
        <div className="relative z-10 flex justify-center items-center h-40 mb-4">
           {/* Center Biryani */}
           <div className="absolute z-20 top-4">
             <img src="https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=180&q=80" alt="Biryani" className="w-40 h-40 object-cover rounded-full shadow-2xl border-4 border-[#ffdb99]/50" />
           </div>
           {/* Left Burger */}
           <div className="absolute z-10 left-0 top-10">
             <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=120&q=80" alt="Burger" className="w-24 h-24 object-cover rounded-full shadow-xl rotate-[-15deg]" />
           </div>
           {/* Right Pizza */}
           <div className="absolute z-10 right-0 top-10">
             <img src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=120&q=80" alt="Pizza" className="w-24 h-24 object-cover rounded-full shadow-xl rotate-[15deg]" />
           </div>
        </div>

        <div className="relative z-10 text-center mt-8">
          <h2 className="text-2xl font-extrabold text-primary mb-1">Welcome</h2>
          <p className="text-primary font-medium text-sm">Start exploring the best food below</p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="px-4 -mt-4 relative z-20">
        <div className="grid grid-cols-2 gap-4 auto-rows-[120px]">
          {/* Grocery Card (Tall) */}
          <Link to="/restaurants?category=grocery" className="col-span-1 row-span-2 bg-gradient-to-br from-[#ffd580] to-[#ffb347] rounded-3xl p-4 flex flex-col justify-end items-center relative overflow-hidden shadow-sm transition-transform active:scale-95">
            <img src={categories[0].image} alt="Grocery" className="absolute top-4 w-28 h-28 object-contain drop-shadow-md" />
            <span className="font-extrabold text-gray-900 z-10 mt-auto">{categories[0].name}</span>
          </Link>
          
          {/* Food Card */}
          <Link to="/restaurants?category=food" className="col-span-1 row-span-1 bg-gradient-to-br from-[#ffe5a3] to-[#ffc873] rounded-3xl p-4 flex flex-col justify-end items-center relative overflow-hidden shadow-sm transition-transform active:scale-95">
            <img src={categories[1].image} alt="Food" className="absolute top-2 w-16 h-16 object-contain drop-shadow-md" />
            <span className="font-extrabold text-gray-900 z-10 text-sm">{categories[1].name}</span>
          </Link>
          
          {/* Hot & Cool Card */}
          <Link to="/restaurants?category=desserts" className="col-span-1 row-span-1 bg-gradient-to-br from-[#ffe5a3] to-[#ffc873] rounded-3xl p-4 flex flex-col justify-end items-center relative overflow-hidden shadow-sm transition-transform active:scale-95">
            <img src={categories[2].image} alt="Hot & Cool" className="absolute top-2 w-16 h-16 object-cover rounded-full drop-shadow-md" />
            <span className="font-extrabold text-gray-900 z-10 text-sm">{categories[2].name}</span>
          </Link>

          {/* Veg & Fruits Card */}
          <Link to="/restaurants?category=healthy" className="col-span-1 row-span-1 bg-gradient-to-br from-[#ffe5a3] to-[#ffc873] rounded-3xl p-4 flex flex-col justify-end items-center relative overflow-hidden shadow-sm transition-transform active:scale-95">
            <img src={categories[3].image} alt="Veg & Fruits" className="absolute top-2 w-16 h-16 object-cover rounded-full drop-shadow-md" />
            <span className="font-extrabold text-gray-900 z-10 text-sm">{categories[3].name}</span>
          </Link>

          {/* Meat Card */}
          <Link to="/restaurants?category=meat" className="col-span-1 row-span-1 bg-gradient-to-br from-[#ffe5a3] to-[#ffc873] rounded-3xl p-4 flex flex-col justify-end items-center relative overflow-hidden shadow-sm transition-transform active:scale-95">
            <img src={categories[4].image} alt="Meat" className="absolute top-2 w-16 h-16 object-cover rounded-full drop-shadow-md" />
            <span className="font-extrabold text-gray-900 z-10 text-sm">{categories[4].name}</span>
          </Link>
        </div>
      </div>

      {/* Featured Stores */}
      <div className="mt-8 px-4">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-lg font-bold text-gray-900">Featured Stores</h3>
          <Link to="/restaurants" className="text-primary font-bold text-sm">See All</Link>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="flex overflow-x-auto pb-6 -mx-4 px-4 gap-4 snap-x hide-scrollbar">
          {isLoading ? (
             [1, 2, 3].map(i => (
               <div key={i} className="min-w-[280px] h-48 bg-gray-100 rounded-3xl animate-pulse flex-shrink-0 snap-center" />
             ))
          ) : (
            featuredStores.map((store) => (
              <Link 
                key={store._id} 
                to={`/restaurant/${store._id}`}
                className="relative min-w-[280px] h-48 rounded-3xl overflow-hidden flex-shrink-0 snap-center shadow-md block group"
              >
                {/* Background Image */}
                <img 
                  src={store.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80'} 
                  alt={store.name} 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Dark Gradient Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10"></div>
                
                {/* Heart Button */}
                <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center z-10 shadow-sm">
                  <Heart className="w-4 h-4 text-gray-400" />
                </button>

                {/* Mockup Discount Badge */}
                <div className="absolute top-4 left-0 bg-[#e33629] text-white text-xs font-bold px-3 py-1 rounded-r-full z-10">
                  FLAT 50% OFF
                </div>

                {/* Store Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className="text-white font-extrabold text-lg mb-1 truncate">{store.name}</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-green-600/90 text-white px-2 py-0.5 rounded text-xs font-bold">
                      <Star className="w-3 h-3 fill-white mr-1" />
                      <span>{store.rating || '4.5'}</span>
                    </div>
                    <p className="text-white/80 text-xs truncate max-w-[150px]">{store.address}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
      
    </div>
  );
}