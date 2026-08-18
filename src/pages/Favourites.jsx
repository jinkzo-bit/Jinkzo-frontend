import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Heart, UtensilsCrossed } from 'lucide-react';
import { useFavoritesStore } from '../store/favoritesStore';
import RestaurantCard from '../components/RestaurantCard';

export default function Favourites() {
  const navigate = useNavigate();
  const { favoriteRestaurants } = useFavoritesStore();

  return (
    <div className="flex flex-col pb-24 max-w-7xl mx-auto px-4 md:px-8 w-full animate-fade-in min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md shadow-xs border-b border-line px-2 py-3.5 flex items-center justify-between rounded-2xl my-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-main hover:bg-base rounded-full transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display font-black text-lg text-main leading-tight flex items-center gap-1.5">
              Favourites
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            </h1>
            <p className="text-[10px] font-semibold text-muted">
              {favoriteRestaurants.length} {favoriteRestaurants.length === 1 ? 'place saved' : 'places saved'}
            </p>
          </div>
        </div>

        <Link
          to="/restaurants"
          className="text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-lg bg-primary/10 transition-colors"
        >
          Explore More
        </Link>
      </div>

      {/* Content */}
      <div className="mt-4 flex flex-col gap-6">
        {favoriteRestaurants.length === 0 ? (
          <div className="bg-surface rounded-3xl p-10 text-center border border-line shadow-xs flex flex-col items-center justify-center my-8">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4 shadow-sm">
              <Heart className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h3 className="font-display font-black text-lg text-main mb-1">No favourites saved yet</h3>
            <p className="text-xs text-muted max-w-xs leading-relaxed font-semibold mb-6">
              Tap the heart on any restaurant or store card to save your favorite spots right here for quick reordering.
            </p>
            <Link
              to="/restaurants"
              className="bg-primary hover:bg-primary-hover text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-md transition-transform active:scale-95 flex items-center gap-2"
            >
              <UtensilsCrossed className="w-4 h-4" />
              Explore Restaurants
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {favoriteRestaurants.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} isLoading={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
