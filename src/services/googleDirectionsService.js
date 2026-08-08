// Polyline decoder helper
export function decodePolyline(encoded) {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

const CACHE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const routeCache = new Map();

export async function getGoogleRoute(origin, destination, apiKey, abortSignal) {
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return null;
  }

  const cacheKey = `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`;
  const cached = routeCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_EXPIRATION_MS)) {
    return cached.data;
  }

  try {
    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const body = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    };

    const headers = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: abortSignal,
      credentials: 'omit'
    });

    if (!response.ok) {
       console.warn(`[Google Routes] HTTP Error: ${response.status}`);
       return null;
    }

    const data = await response.json();
    
    if (!data.routes || data.routes.length === 0) {
      console.warn('[Google Routes] ZERO_RESULTS');
      return null;
    }

    const route = data.routes[0];
    const distanceMeters = route.distanceMeters || 0;
    const distanceKm = Number((distanceMeters / 1000).toFixed(2));
    const durationSeconds = parseInt(route.duration?.replace('s', '') || 0, 10);
    const durationMinutes = Math.ceil(durationSeconds / 60);
    const polylineEncoded = route.polyline?.encodedPolyline || '';
    const polyline = decodePolyline(polylineEncoded);

    const result = {
      distanceMeters,
      distanceKm,
      durationSeconds,
      durationMinutes,
      polyline,
      origin,
      destination
    };

    routeCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[Google Routes] Request aborted');
    } else {
      console.error('[Google Routes] Request failed:', error);
    }
    return null;
  }
}
