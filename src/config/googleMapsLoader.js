import { VITE_GOOGLE_MAPS_API_KEY } from './api';

export const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry'];

export const GOOGLE_MAPS_LOADER_OPTIONS = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  libraries: GOOGLE_MAPS_LIBRARIES,
  version: 'weekly',
  language: 'en',
  region: 'IN',
};
