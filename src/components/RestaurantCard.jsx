import React from 'react';
import { Star, Clock, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RestaurantCard({ restaurant, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-line animate-pulse">
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
    rating = 4.0,
    deliveryTime = 25,
    priceRange = '$$',
    cuisineTags = [],
    isPureVeg = false,
    isClosed = false
  } = restaurant || {};

  const numRating = typeof rating === 'number' ? rating : parseFloat(rating || 4.0) || 4.0;
  const tagsList = Array.isArray(cuisineTags) ? cuisineTags : [];

  // Map dollar price range to readable rupee string
  const getRupeeCost = (range) => {
    if (range === '$') return '₹150 for one';
    if (range === '$$$') return '₹600 for two';
    return '₹300 for two'; // '$$' default
  };

  return (
    <Link 
      to={`/restaurant/${_id}`}
      className={`group bg-surface rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-line transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full ${isClosed ? 'opacity-80' : ''}`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        {isClosed && (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-3xs flex items-center justify-center z-10 transition-all">
            <span className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-full shadow-md">
              Hotel Temporarily Closed
            </span>
          </div>
        )}
        <img 
          src={image} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Pure Veg Indicator overlay */}
        {isPureVeg && (
          <span className="absolute top-3 left-3 bg-green-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
            Pure Veg
          </span>
        )}

        {/* Favorite Icon Overlay */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-3 right-3 p-2 bg-surface/80 hover:bg-surface text-muted hover:text-red-500 rounded-full shadow-sm transition-colors backdrop-blur-sm"
        >
          <Heart className="w-4 h-4 fill-transparent hover:fill-red-500 transition-colors" />
        </button>
      </div>

      {/* Info Details Section */}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="font-display font-semibold text-lg text-main group-hover:text-primary transition-colors line-clamp-1 mb-1">
          {name}
        </h3>

        {/* Rating and Delivery Row */}
        <div className="flex items-center gap-3 text-sm text-muted mb-2">
          {/* Rating Pill */}
          <div className="flex items-center gap-0.5 bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded-lg text-xs">
            <Star className="w-3.5 h-3.5 fill-green-700 stroke-green-700" />
            <span>{numRating.toFixed(1)}</span>
          </div>

          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-muted" />
            <span>{deliveryTime} mins</span>
          </div>

          <div className="w-1 h-1 bg-gray-300 rounded-full" />
          <span>{getRupeeCost(priceRange)}</span>
        </div>

        {/* Cuisines Tags */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {tagsList.slice(0, 3).map((tag, idx) => (
            <span 
              key={idx} 
              className="text-xs bg-base text-muted font-medium px-2 py-0.5 rounded-md border border-line"
            >
              {tag}
            </span>
          ))}
          {tagsList.length > 3 && (
            <span className="text-xs text-muted font-medium px-1 py-0.5">
              +{tagsList.length - 3} more
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
