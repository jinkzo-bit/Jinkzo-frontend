import React, { useRef, useState } from 'react';
import { MapPin, Navigation, Loader, Search, X } from 'lucide-react';

// Nominatim reverse geocode (free, no key)
const reverseGeocode = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: { 'User-Agent': 'QuickBite-App/1.0 (support@quickbite.com)' } });
    const data = await res.json();
    if (data && data.address) {
      const a = data.address;
      return {
        street: a.road || a.suburb || a.neighbourhood || a.quarter || 'Main Road',
        city: a.city || a.town || a.village || 'Nandikotkur',
        state: a.state || 'Andhra Pradesh',
        zip: a.postcode || '518401',
        lat,
        lng,
      };
    }
  } catch (_) {
    // Ignore reverse geocode failures
  }
  return { street: 'Current Location', city: 'Nandikotkur', state: 'Andhra Pradesh', zip: '518401', lat, lng };
};

// Nominatim forward search (free, no key)
const searchAddress = async (query) => {
  if (!query || query.length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'QuickBite-App/1.0 (support@quickbite.com)' } });
    return await res.json();
  } catch (_) {
    return [];
  }
};

export default function AddressAutocomplete({ onAddressSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef(null);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchAddress(val);
      setSuggestions(results);
      setLoading(false);
    }, 600);
  };

  const handleSelect = (place) => {
    const a = place.address || {};
    const result = {
      street: a.road || a.suburb || a.neighbourhood || place.display_name.split(',')[0],
      city: a.city || a.town || a.village || 'Nandikotkur',
      state: a.state || 'Andhra Pradesh',
      zip: a.postcode || '518401',
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
    };
    setQuery(place.display_name);
    setSuggestions([]);
    if (onAddressSelect) onAddressSelect(result);
  };

  const handleGetCurrentLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const result = await reverseGeocode(lat, lng);
        setQuery(`${result.street}, ${result.city}`);
        setSuggestions([]);
        setLocating(false);
        if (onAddressSelect) onAddressSelect(result);
      },
      (err) => {
        console.error('Geolocation failed:', err);
        setLocating(false);
        alert('Unable to retrieve location. Check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Search input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-muted pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search for your delivery area or building..."
          className="w-full bg-base border border-line-strong rounded-xl pl-10 pr-10 py-3 text-xs text-main placeholder:text-muted outline-none focus:border-primary transition-colors font-semibold"
          autoComplete="off"
        />
        {loading && <Loader className="absolute right-3.5 w-4 h-4 text-primary animate-spin" />}
        {query && !loading && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSuggestions([]); }}
            className="absolute right-3.5 text-muted hover:text-main"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <div className="bg-surface border border-line rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((place, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(place)}
              className="w-full text-left px-4 py-2.5 text-xs text-main hover:bg-primary/10 transition-colors flex items-start gap-2 border-b border-line last:border-b-0"
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
              <span className="line-clamp-2">{place.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Current location button */}
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={locating}
        className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 active:scale-98 transition-all text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer w-full"
      >
        {locating ? (
          <>
            <Loader className="w-4 h-4 animate-spin text-primary" />
            <span>Locating you...</span>
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4 text-primary fill-primary/10" />
            <span>Use my current location</span>
          </>
        )}
      </button>
    </div>
  );
}
