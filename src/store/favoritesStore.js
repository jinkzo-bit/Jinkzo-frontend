import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      favoriteRestaurants: [],

      toggleFavorite: (restaurant) => {
        if (!restaurant || !restaurant._id) return;
        const { favoriteRestaurants } = get();
        const exists = favoriteRestaurants.some((r) => r._id === restaurant._id);

        if (exists) {
          set({
            favoriteRestaurants: favoriteRestaurants.filter((r) => r._id !== restaurant._id),
          });
        } else {
          set({
            favoriteRestaurants: [
              ...favoriteRestaurants,
              {
                _id: restaurant._id,
                name: restaurant.name,
                image: restaurant.image,
                cuisine: restaurant.cuisine,
                rating: restaurant.rating,
                deliveryTime: restaurant.deliveryTime,
                priceRange: restaurant.priceRange,
                isPureVeg: restaurant.isPureVeg,
                address: restaurant.address,
              },
            ],
          });
        }
      },

      isFavorite: (restaurantId) => {
        if (!restaurantId) return false;
        return get().favoriteRestaurants.some((r) => r._id === restaurantId);
      },

      removeFavorite: (restaurantId) => {
        set((state) => ({
          favoriteRestaurants: state.favoriteRestaurants.filter((r) => r._id !== restaurantId),
        }));
      },

      clearFavorites: () => {
        set({ favoriteRestaurants: [] });
      },
    }),
    {
      name: 'corior-customer-favorites',
    }
  )
);
