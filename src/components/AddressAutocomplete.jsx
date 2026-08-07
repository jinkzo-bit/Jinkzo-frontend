import React, { useState } from 'react';
import { Navigation, Loader } from 'lucide-react';
import { parseAddressComponents } from '../utils/parseAddressComponents';
import PlacesAutocomplete from './maps/PlacesAutocomplete';

// ── Google Geocoding API — reverse geocode GPS coords to address ──────────────
const googleReverseGeocode = async (lat, lng) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { street: 'Current Location', city: '', state: '', zip: '', lat, lng };
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]) {
      const result = data.results[0];
      const parsed = parseAddressComponents(result.address_components || []);
      return {
        street: [parsed.houseNo, parsed.street].filter(Boolean).join(', ') || result.formatted_address?.split(',')[0] || 'Current Location',
        city: parsed.city || '',
        state: parsed.state || '',
        zip: parsed.zip || '',
        lat,
        lng,
        placeId: null,
        formattedAddress: result.formatted_address || '',
      };
    }
  } catch (_e) {
    // fall through to default
  }
  return { street: 'Current Location', city: '', state: '', zip: '', lat, lng, placeId: null, formattedAddress: '' };
};

/**
 * Google Places-powered address search component.
 *
 * Props:
 *   onAddressSelect  fn({ street, city, state, zip, lat, lng, placeId?, formattedAddress? })
 *
 * Drop-in replacement for the previous Nominatim-based component.
 * Keeps the exact same props interface — Checkout.jsx needs no changes.
 */
export default function AddressAutocomplete({ onAddressSelect }) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // ── Handle Places autocomplete selection ──────────────────────────────────
  const handlePlaceSelect = (placeResult) => {
    const { lat, lng, placeId, formattedAddress, addressComponents } = placeResult;
    const parsed = parseAddressComponents(addressComponents);

    const result = {
      street: [parsed.houseNo, parsed.street].filter(Boolean).join(', ') || formattedAddress.split(',')[0] || 'Main Road',
      city: parsed.city || '',
      state: parsed.state || '',
      zip: parsed.zip || '',
      lat,
      lng,
      // Non-breaking additions
      placeId: placeId || null,
      formattedAddress: formattedAddress || '',
    };

    if (onAddressSelect) onAddressSelect(result);
  };

  // ── Handle GPS / "Use current location" ──────────────────────────────────
  const handleGetCurrentLocation = (e) => {
    e.preventDefault();
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const result = await googleReverseGeocode(lat, lng);
        setLocating(false);
        if (onAddressSelect) onAddressSelect(result);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError('Location access denied. Please enable it in browser settings.');
        } else if (err.code === 2) {
          setLocationError('Location unavailable. Check your device GPS.');
        } else {
          setLocationError('Could not get location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* ── Google Places search input ── */}
      <PlacesAutocomplete
        onPlaceSelect={handlePlaceSelect}
        placeholder="Search for your delivery area or building..."
        darkMode={false}
      />

      {/* ── Location error ── */}
      {locationError && (
        <p className="text-[11px] font-medium text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {locationError}
        </p>
      )}

      {/* ── Current location button ── */}
      <button
        type="button"
        onClick={handleGetCurrentLocation}
        disabled={locating}
        className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 active:scale-98 transition-all text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer w-full disabled:opacity-60 disabled:cursor-not-allowed"
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
