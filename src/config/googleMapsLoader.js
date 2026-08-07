/**
 * Shared Google Maps loader options.
 *
 * IMPORTANT: This must be the single source of truth for useJsApiLoader options
 * across the entire app. All components that call useJsApiLoader must import
 * from here to guarantee the same `libraries` array reference — otherwise
 * @react-google-maps/api will emit a "Libraries changed" warning at runtime.
 *
 * libraries: ['places'] enables:
 *   - google.maps.places.AutocompleteService  (address search predictions)
 *   - google.maps.places.PlacesService        (place details + geometry)
 */

// Module-level constant — stable reference across all renders
const GOOGLE_MAPS_LIBRARIES = ['places'];

export const GOOGLE_MAPS_LOADER_OPTIONS = {
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  id: 'google-map-script',
  libraries: GOOGLE_MAPS_LIBRARIES,
};
