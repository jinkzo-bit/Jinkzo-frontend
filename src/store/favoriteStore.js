import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// In-memory throttle tracker to prevent double-tap race conditions
const lastToggleTimes = new Map();

export const useFavoriteStore = create(
  persist(
    (set, get) => ({
      favouriteHotels: [],
      favouriteItems: [],

      // Check if hotel is favourited (reads from current state)
      isHotelFavourite: (hotelId) => {
        if (!hotelId) return false;
        return get().favouriteHotels.some((h) => String(h._id) === String(hotelId));
      },

      // Check if item is favourited (reads from current state)
      isItemFavourite: (itemId) => {
        if (!itemId) return false;
        return get().favouriteItems.some((i) => String(i._id) === String(itemId));
      },

      // Toggle Hotel Favourite (Instant Optimistic UI update)
      toggleHotel: (hotel) => {
        if (!hotel || (!hotel._id && !hotel.id)) return;
        const targetId = String(hotel._id || hotel.id);

        // Anti-spam debounce (150ms)
        const now = Date.now();
        const lastTime = lastToggleTimes.get(targetId) || 0;
        if (now - lastTime < 150) return;
        lastToggleTimes.set(targetId, now);

        const currentHotels = get().favouriteHotels;
        const exists = currentHotels.some((h) => String(h._id || h.id) === targetId);

        let updatedHotels;
        if (exists) {
          updatedHotels = currentHotels.filter((h) => String(h._id || h.id) !== targetId);
        } else {
          const hotelData = {
            _id: targetId,
            name: hotel.name || 'Restaurant',
            image: hotel.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&h=400&q=80',
            rating: typeof hotel.rating === 'number' ? hotel.rating : parseFloat(hotel.rating || 4.0),
            deliveryTime: hotel.deliveryTime || 25,
            priceRange: hotel.priceRange || '$$',
            cuisineTags: Array.isArray(hotel.cuisineTags) ? hotel.cuisineTags : [],
            isPureVeg: !!hotel.isPureVeg,
            isClosed: !!hotel.isClosed
          };
          updatedHotels = [...currentHotels, hotelData];
        }

        set({ favouriteHotels: updatedHotels });
      },

      // Toggle Item/Product Favourite (Instant Optimistic UI update)
      toggleItem: (item) => {
        if (!item || (!item._id && !item.id)) return;
        const targetId = String(item._id || item.id);

        // Anti-spam debounce (150ms)
        const now = Date.now();
        const lastTime = lastToggleTimes.get(targetId) || 0;
        if (now - lastTime < 150) return;
        lastToggleTimes.set(targetId, now);

        const currentItems = get().favouriteItems;
        const exists = currentItems.some((i) => String(i._id || i.id) === targetId);

        let updatedItems;
        if (exists) {
          updatedItems = currentItems.filter((i) => String(i._id || i.id) !== targetId);
        } else {
          const itemData = {
            _id: targetId,
            name: item.name || 'Delicious Item',
            image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&h=200&q=80',
            price: Number(item.price) || 0,
            isVeg: !!item.isVeg,
            category: item.category || 'Special',
            description: item.description || '',
            restaurant: item.restaurant || { name: 'Jinkzo Store', _id: 'rest_default' }
          };
          updatedItems = [...currentItems, itemData];
        }

        set({ favouriteItems: updatedItems });
      },

      // Fetch User Favourites (safe no-op if local storage is used)
      fetchUserFavourites: () => {
        // Local persistence via zustand persist middleware handles storage
      },

      clearFavourites: () => set({ favouriteHotels: [], favouriteItems: [] })
    }),
    {
      name: 'jinkzo-favourites',
    }
  )
);
