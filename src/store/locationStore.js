import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_BASE } from '../config/api';

export const useLocationStore = create(
  persist(
    (set, get) => ({
      lat: null,
      lng: null,
      placeName: '',
      address: '',
      formattedAddress: '',
      area: '',
      villageTownCity: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      source: null, // 'GPS' | 'MANUAL' | 'SAVED'
      isDetecting: false,
      permissionStatus: 'prompt', // 'prompt' | 'granted' | 'denied' | 'unavailable'
      errorMessage: null,

      // Set explicit location from picker or saved address
      setLocation: (locationData, source = 'MANUAL') => {
        const placeName = locationData.placeName || '';
        const street = locationData.street || locationData.houseNo || '';
        const area = locationData.area || '';
        const villageTownCity = locationData.villageTownCity || locationData.city || '';
        const city = locationData.city || villageTownCity || '';
        const district = locationData.district || '';
        const state = locationData.state || '';
        const pincode = locationData.pincode || locationData.zip || '';

        const primaryName = placeName || street || area || city || '';
        const subtitle = [area && area !== primaryName ? area : '', city && city !== primaryName ? city : ''].filter(Boolean).join(', ');
        const shortName = [primaryName, subtitle].filter(Boolean).join(', ') || locationData.formattedAddress || 'Selected Location';

        set({
          lat: locationData.lat ?? locationData.latitude,
          lng: locationData.lng ?? locationData.longitude,
          placeName,
          address: shortName,
          formattedAddress: locationData.formattedAddress || shortName,
          area,
          villageTownCity,
          city,
          district,
          state,
          pincode,
          source,
          isDetecting: false,
          errorMessage: null,
        });
      },

      // Detect current GPS position via browser geolocation
      detectGpsLocation: async (force = false) => {
        if (get().isDetecting) return;

        if (typeof window === 'undefined' || !navigator.geolocation) {
          set({
            isDetecting: false,
            permissionStatus: 'unavailable',
            errorMessage: 'Geolocation is not supported by your browser.',
          });
          return;
        }

        set({ isDetecting: true, errorMessage: null });

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            try {
              const res = await fetch(`${API_BASE}/maps/geocode?lat=${lat}&lng=${lng}`);
              const data = await res.json();
              if (data.success && data.data) {
                const { placeName, formattedAddress, addressComponents } = data.data;
                const street = addressComponents?.street || '';
                const area = addressComponents?.area || '';
                const villageTownCity = addressComponents?.villageTownCity || addressComponents?.city || '';
                const city = addressComponents?.city || villageTownCity || '';
                const district = addressComponents?.district || '';
                const state = addressComponents?.state || '';
                const pincode = addressComponents?.pincode || addressComponents?.zip || '';

                const primaryName = placeName || street || area || city || '';
                const subtitle = [area && area !== primaryName ? area : '', city && city !== primaryName ? city : ''].filter(Boolean).join(', ');
                const shortName = [primaryName, subtitle].filter(Boolean).join(', ') || formattedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

                set({
                  lat,
                  lng,
                  placeName: placeName || '',
                  address: shortName,
                  formattedAddress: formattedAddress || shortName,
                  area,
                  villageTownCity,
                  city,
                  district,
                  state,
                  pincode,
                  source: 'GPS',
                  isDetecting: false,
                  permissionStatus: 'granted',
                  errorMessage: null,
                });
              } else {
                set({
                  lat,
                  lng,
                  placeName: '',
                  address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                  formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                  source: 'GPS',
                  isDetecting: false,
                  permissionStatus: 'granted',
                  errorMessage: null,
                });
              }
            } catch (err) {
              console.warn('[LocationStore] Geocode error:', err);
              set({
                lat,
                lng,
                placeName: '',
                address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                source: 'GPS',
                isDetecting: false,
                permissionStatus: 'granted',
              });
            }
          },
          (err) => {
            console.warn('[LocationStore] Geolocation error:', err.code, err.message);
            let permStatus = 'unavailable';
            let errorMsg = 'Unable to determine your location.';
            if (err.code === 1) {
              permStatus = 'denied';
              errorMsg = 'Location permission denied. Click to select manually.';
            }
            set({
              isDetecting: false,
              permissionStatus: permStatus,
              errorMessage: errorMsg,
            });
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      },
    }),
    {
      name: 'jinkzo-customer-location',
      partialize: (state) => ({
        lat: state.lat,
        lng: state.lng,
        placeName: state.placeName,
        address: state.address,
        formattedAddress: state.formattedAddress,
        area: state.area,
        villageTownCity: state.villageTownCity,
        city: state.city,
        district: state.district,
        state: state.state,
        pincode: state.pincode,
        source: state.source,
      }),
    }
  )
);
