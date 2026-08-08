import { getGoogleRoute } from './googleDirectionsService';

let activeController = null;


export async function getRoute(origin, destination) {
  if (activeController) {
    activeController.abort();
  }
  activeController = new AbortController();
  
  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  let routeData = await getGoogleRoute(origin, destination, googleApiKey, activeController.signal);
  
  if (routeData) {
    console.log('[RoutingService] Using Google Routes API');
    return {
      provider: 'google',
      success: true,
      ...routeData
    };
  }
  
  console.warn('[RoutingService] Google Routes failed, using straight line fallback');
  // Final fallback: straight line/L-shape
  return {
    provider: 'fallback',
    success: false,
    distanceMeters: 0,
    distanceKm: 0,
    durationSeconds: 0,
    durationMinutes: 0,
    polyline: [
      origin,
      { lat: origin.lat, lng: (origin.lng + destination.lng) / 2 },
      { lat: destination.lat, lng: (origin.lng + destination.lng) / 2 },
      destination,
    ],
    origin,
    destination
  };
}
