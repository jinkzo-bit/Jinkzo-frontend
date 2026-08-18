import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, ShoppingCart } from 'lucide-react';

export default function Meat() {
  const navigate = useNavigate();

  const categories = [
    'Chicken', 'Mutton', 'Fish', 'Eggs', 'Ready-to-Cook', 'Combos'
  ];

  return (
    <div className="flex flex-col pb-24 max-w-7xl mx-auto w-full animate-fade-in bg-gray-50 min-h-screen">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-sm border-b border-line px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-main hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="font-display font-extrabold text-lg text-main">Meat</h1>
        <div className="flex items-center gap-2">
          <button className="p-2 text-main hover:bg-gray-100 rounded-full transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 text-main hover:bg-gray-100 rounded-full transition-colors relative">
            <ShoppingCart className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="bg-gradient-to-r from-rose-500 to-red-600 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-[200px]">
            <h2 className="font-display font-black text-2xl leading-tight mb-2">Premium quality fresh cuts</h2>
            <button className="bg-white text-rose-700 font-bold text-xs px-4 py-2 rounded-xl mt-2">Shop Now</button>
          </div>
          <div className="absolute right-[-10%] top-0 text-[100px] opacity-20">🥩</div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <h3 className="font-display font-bold text-lg text-main mb-4">Categories</h3>
        <div className="grid grid-cols-3 gap-3">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 cursor-pointer group">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-line flex items-center justify-center group-hover:border-rose-500 transition-colors">
                <span className="text-2xl">🍗</span>
              </div>
              <span className="text-[10px] font-bold text-center text-main leading-tight">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4">
        <h3 className="font-display font-bold text-lg text-main mb-4">Fresh Arrivals</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-3 shadow-sm border border-line flex flex-col gap-2">
              <div className="w-full h-24 bg-gray-100 rounded-xl flex items-center justify-center text-3xl">🐟</div>
              <h4 className="font-bold text-sm text-main line-clamp-1">Sample Meat Cut {i}</h4>
              <p className="text-[10px] text-muted font-bold">500 g</p>
              <div className="flex items-center justify-between mt-auto pt-1">
                <span className="font-black text-sm text-main">₹250</span>
                <button className="bg-rose-50 text-rose-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-rose-200">Add</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
