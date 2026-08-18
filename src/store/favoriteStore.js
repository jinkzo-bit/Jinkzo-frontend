import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useFavoriteStore = create(
  persist(
    (set, get) => ({
      favouriteHotels: [],
      favouriteItems: [],

      // Check if hotel is favourited
      isHotelFavourite: (hotelId) => {
        if (!hotelId) return false;
        return get().favouriteHotels.some((h) => String(h._id) === String(hotelId));
      },

      // Check if item is favourited
      isItemFavourite: (itemId) => {
        if (!itemId) return false;
        return get().favouriteItems.some((i) => String(i._id) === String(itemId));
      },

      // Toggle Hotel Favourite
      toggleHotel: (hotel) => {
        if (!hotel || !hotel._id) return;
        const currentHotels = get().favouriteHotels;
        const exists = currentHotels.some((h) => String(h._id) === String(hotel._id));

        let updatedHotels;
        if (exists) {
          updatedHotels = currentHotels.filter((h) => String(h._id) !== String(hotel._id));
        } else {
          const hotelData = {
            _id: hotel._id,
            name: hotel.name,
            image: hotel.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&h=400&q=80',
            rating: typeof hotel.rating === 'number' ? hotel.rating : parseFloat(hotel.rating || 4.0),
            deliveryTime: hotel.deliveryTime || 25,
            priceRange: hotel.priceRange || '$$',
            cuisineTags: hotel.cuisineTags || [],
            isPureVeg: !!hotel.isPureVeg,
            isClosed: !!hotel.isClosed
          };
          updatedHotels = [...currentHotels, hotelData];
        }

        set({ favouriteHotels: updatedHotels });
      },

      // Toggle Item/Product Favourite
      toggleItem: (item) => {
        if (!item || !item._id) return;
        const currentItems = get().favouriteItems;
        const exists = currentItems.some((i) => String(i._id) === String(item._id));

        let updatedItems;
        if (exists) {
          updatedItems = currentItems.filter((i) => String(i._id) !== String(item._id));
        } else {
          const itemData = {
            _id: item._id,
            name: item.name,
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
      getStorage: () => localStorage
    }
  )
);
