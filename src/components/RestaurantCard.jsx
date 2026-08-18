import React from 'react';
import { Star, Clock, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFavoritesStore } from '../store/favoritesStore';

export default function RestaurantCard({ restaurant, isLoading }) {
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  if (isLoading) {
    return (
      <div className="bg-white/95 rounded-2xl overflow-hidden shadow-xs border border-white/80 animate-pulse">
        <div className="relative aspect-video skeleton" />
        <div className="p-4 flex flex-col gap-2">
          <div className="h-6 skeleton w-3/4" />
          <div className="flex gap-2">
            <div className="h-4 skeleton w-12" />
            <div className="h-4 skeleton w-16" />
          </div>
          <div className="h-4 skeleton w-1/2 mt-1" />
          <div className="flex gap-1.5 flex-wrap mt-2">
            <div className="h-5 skeleton rounded-full w-12" />
            <div className="h-5 skeleton rounded-full w-16" />
            <div className="h-5 skeleton rounded-full w-14" />
          </div>
        </div>
      </div>
    );
  }

  const {
    _id = '',
    name = 'Restaurant',
    image = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&h=400&q=80',
    cuisine = ['Multi-Cuisine'],
    rating = 4.2,
    deliveryTime = 30,
    priceRange = '$$',
    isPureVeg = false,
    isClosed = false,
    offers = []
  } = restaurant || {};

  const numRating = typeof rating === 'number' ? rating : 4.0;
  const isFav = isFavorite(_id);
  const tagsList = Array.isArray(cuisine) ? cuisine : Array.isArray(restaurant?.cuisineTags) ? restaurant.cuisineTags : ['Multi-Cuisine'];

  // Helper for price display
  const getRupeeCost = (range) => {
    switch (range) {
      case '$': return '₹150 for one';
      case '$$$': return '₹500 for one';
      case '$$$$': return '₹800 for one';
      case '$$':
      default: return '₹250 for one';
    }
  };

  return (
    <Link 
      to={`/restaurant/${_id}`}
      className={`bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-white/80 transition-all duration-300 flex flex-col group relative ${isClosed ? 'opacity-75 grayscale' : ''}`}
    >
      {/* Closed Tag Overlay */}
      {isClosed && (
        <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center pointer-events-none">
          <span className="bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-md">
            Closed Now
          </span>
        </div>
      )}

      {/* Image Container with Badges */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        <img 
          src={image} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Pure Veg Indicator overlay */}
        {isPureVeg && (
          <span className="absolute top-3 left-3 bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm z-20">
            Pure Veg
          </span>
        )}

        {/* Favorite Icon Overlay */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(restaurant);
          }}
          className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-slate-400 hover:text-red-500 rounded-full shadow-xs transition-colors backdrop-blur-sm cursor-pointer z-20"
          title={isFav ? "Remove from favourites" : "Save to favourites"}
        >
          <Heart className={`w-4 h-4 transition-colors ${isFav ? 'fill-red-500 text-red-500' : 'fill-transparent hover:fill-red-500'}`} />
        </button>
      </div>

      {/* Info Details Section */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-display font-black text-base text-[#1E1B4B] group-hover:text-primary transition-colors line-clamp-1 mb-1">
          {name}
        </h3>

        {/* Rating and Delivery Row */}
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2 font-medium">
          {/* Rating Pill */}
          <div className="flex items-center gap-0.5 bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded-lg text-xs">
            <Star className="w-3.5 h-3.5 fill-green-700 stroke-green-700" />
            <span>{numRating.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-1 font-semibold text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{deliveryTime} mins</span>
          </div>

          <div className="w-1 h-1 bg-gray-300 rounded-full" />
          <span className="font-semibold text-slate-600">{getRupeeCost(priceRange)}</span>
        </div>

        {/* Cuisines Tags */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {tagsList.slice(0, 3).map((tag, idx) => (
            <span 
              key={idx} 
              className="text-[11px] bg-purple-50/70 text-purple-700 font-bold px-2 py-0.5 rounded-md border border-purple-100/60"
            >
              {tag}
            </span>
          ))}
          {tagsList.length > 3 && (
            <span className="text-[11px] text-slate-500 font-semibold px-1 py-0.5">
              +{tagsList.length - 3} more
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
