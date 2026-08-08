import { parseAddressComponents } from '../utils/parseAddressComponents';

// ── Google Geocode helper ──────────────────────────────────────────────────────
export const googleGeocode = async (address, apiKey) => {
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url, { credentials: 'omit' });
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch (_) {
    // ignore
  }
  return null;
};

// ── Google Reverse Geocode ─────────────────────────────────────────────────────
export const googleReverseGeocode = async (lat, lng, apiKey) => {
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return { street: 'Selected Location', city: '', state: '', zip: '', lat, lng };
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]) {
      const result = data.results[0];
      const parsed = parseAddressComponents(result.address_components || []);
      
      return {
        ...parsed,
        street: parsed.street || parsed.area || 'Main Road',
        city: parsed.city || 'Unknown City',
        state: parsed.state || 'Unknown State',
        zip: parsed.zip || '000000',
        displayName: result.formatted_address || '',
        formattedAddress: result.formatted_address || '',
        lat,
        lng,
        placeId: result.place_id,
      };
    }
  } catch (_) {
    // ignore
  }
  return { street: 'Selected Location', city: 'Unknown City', state: 'Unknown State', zip: '000000', lat, lng };
};
