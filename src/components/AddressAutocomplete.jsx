import React, { useState } from 'react';
import { Navigation, Loader, MapPin } from 'lucide-react';
import { parseAddressComponents } from '../utils/parseAddressComponents';
import PlacesAutocomplete from './maps/PlacesAutocomplete';
import { API_BASE } from '../config/api';

// ── Reverse geocode GPS coords to address via backend proxy ──────────────
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(`${API_BASE}/maps/geocode?lat=${lat}&lng=${lng}`);
    const data = await res.json();
    if (data.success && data.data) {
      const d = data.data;
      return {
        street: [d.addressComponents?.houseNo, d.addressComponents?.street].filter(Boolean).join(', ') || d.formattedAddress?.split(',')[0] || 'Current Location',
        city: d.addressComponents?.city || '',
        state: d.addressComponents?.state || '',
        zip: d.addressComponents?.zip || '',
        lat,
        lng,
        placeId: d.placeId || null,
        formattedAddress: d.formattedAddress || '',
        locationType: d.locationType,
        gpsAccuracy: null, // Will be set by caller
      };
    }
  } catch (_e) {
    // fall through to default
  }
  return { street: 'Current Location', city: '', state: '', zip: '', lat, lng, placeId: null, formattedAddress: '', locationType: null, gpsAccuracy: null };
};

/**
 * Google Places-powered address search component.
 *
 * Props:
 *   onAddressSelect  fn({ street, city, state, zip, lat, lng, placeId?, formattedAddress? })
 *
 * Uses Google Places API (via useJsApiLoader and Autocomplete component).
 */
export default function AddressAutocomplete({ onAddressSelect }) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locationType, setLocationType] = useState(null);

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
      locationSource: 'SEARCH',
    };

    if (onAddressSelect) onAddressSelect(result);
  };

  // ── Handle GPS / "Use current location" ──────────────────────────────────
  const handleGetCurrentLocation = (e) => {
    e.preventDefault();
    setLocationError(null);
    setGpsAccuracy(null);
    setLocationType(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const result = await reverseGeocode(lat, lng);
        result.locationSource = 'GPS';
        result.gpsAccuracy = accuracy;
        setGpsAccuracy(accuracy);
        setLocationType(result.locationType);
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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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

      {/* ── GPS Accuracy & Location Type Indicator ── */}
      {gpsAccuracy && (
        <div className="flex items-center gap-2 text-[11px] font-medium px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="text-blue-700">GPS Accuracy: ±{Math.round(gpsAccuracy)}m</span>
          {locationType && (
            <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${
              locationType === 'ROOFTOP' ? 'bg-green-100 text-green-700' :
              locationType === 'RANGE_INTERPOLATED' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {locationType === 'ROOFTOP' && '🎯 Exact Building'}
              {locationType === 'RANGE_INTERPOLATED' && '📍 Approximate'}
              {locationType === 'GEOMETRIC_CENTER' && '📍 Area Center'}
              {locationType === 'APPROXIMATE' && '📍 Rough'}
            </span>
          )}
        </div>
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
