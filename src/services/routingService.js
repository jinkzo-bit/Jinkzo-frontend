import { API_BASE } from '../config/api';

let activeController = null;


export async function getRoute(origin, destination) {
  if (activeController) {
    activeController.abort();
  }
  activeController = new AbortController();
  
  try {
    const res = await fetch(`${API_BASE}/maps/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        destination,
        travelMode: 'DRIVE',
      }),
      signal: activeController.signal,
    });
    const data = await res.json();
    
    if (data.success && data.data) {
      console.log('[RoutingService] Using backend proxy for Google Routes API');
      return {
        provider: 'google',
        success: true,
        ...data.data,
      };
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('[RoutingService] Request aborted');
    } else {
      console.warn('[RoutingService] Backend proxy failed:', err.message);
    }
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