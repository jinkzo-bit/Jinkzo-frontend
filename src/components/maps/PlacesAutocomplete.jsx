import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Loader, Search, X, AlertCircle } from 'lucide-react';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../../config/googleMapsLoader';
import { API_BASE } from '../../config/api';

/**
 * Reusable Google Places Autocomplete input using server proxy with client-side fallback.
 * Includes session tokens for cost optimization and direct Geocoding on Enter.
 * 
 * Props:
 *   onPlaceSelect   fn({ formattedAddress, lat, lng, placeId, addressComponents })
 *   placeholder     string
 *   darkMode        boolean  — dark glassmorphism styles (for LocationPickerModal)
 *   className       string
 *   country         string   — ISO 3166-1 alpha-2 country code for restricting results (default: 'in')
 */
export default function PlacesAutocomplete({
  onPlaceSelect,
  placeholder = 'Search for a location...',
  darkMode = false,
  className = '',
  country = 'in',
}) {
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [error, setError] = useState(null);

  const debounceRef = useRef(null);
  const sessionTokenRef = useRef(null);

  // Initialize session token for cost optimization
  const createSessionToken = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'token-' + Math.random().toString(36).substring(2) + '-' + Date.now();
  };

  useEffect(() => {
    sessionTokenRef.current = createSessionToken();
  }, []);

  // Reset session token when query clears
  const resetSessionToken = useCallback(() => {
    sessionTokenRef.current = createSessionToken();
  }, []);

  // ── Direct Geocode Search (e.g. on Enter key press or direct query) ──────────
  const handleDirectSearch = useCallback(async (searchText) => {
    const textToSearch = (searchText || query).trim();
    if (!textToSearch) return;

    setIsSearching(true);
    setError(null);
    setPredictions([]);
    setNoResults(false);

    // 1. Try Google Maps Geocoder if loaded in browser
    if (window.google?.maps?.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ address: textToSearch, componentRestrictions: { country } });
        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          const lat = result.geometry.location.lat();
          const lng = result.geometry.location.lng();
          const formattedAddress = result.formatted_address;
          const placeId = result.place_id;

          if (onPlaceSelect) {
            onPlaceSelect({
              placeName: textToSearch,
              formattedAddress,
              lat,
              lng,
              placeId,
              addressComponents: result.address_components,
            });
          }
          setIsSearching(false);
          return;
        }
      } catch (geocoderErr) {
        console.warn('[PlacesAutocomplete] Client geocode attempt:', geocoderErr);
      }
    }

    // 2. Try backend geocode endpoint
    try {
      const res = await fetch(`${API_BASE}/maps/geocode?address=${encodeURIComponent(textToSearch)}`);
      const data = await res.json();
      setIsSearching(false);
      if (data.success && data.data) {
        if (onPlaceSelect) {
          onPlaceSelect({
            placeName: data.data.placeName || textToSearch,
            formattedAddress: data.data.formattedAddress || textToSearch,
            lat: data.data.lat,
            lng: data.data.lng,
            placeId: data.data.placeId,
            addressComponents: data.data.addressComponents,
            rawComponents: data.data.addressComponents,
          });
        }
      } else {
        setError(`No location found for "${textToSearch}". Try dragging the map pin.`);
      }
    } catch (err) {
      setIsSearching(false);
      setError('Search failed. Please try again or select location on map.');
    }
  }, [query, country, onPlaceSelect]);

  // ── Handle text input change — calls backend proxy with fallback ─────────────
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setError(null);
    setNoResults(false);
    clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setPredictions([]);
      resetSessionToken();
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams({
          input: val,
          country,
        });
        if (sessionTokenRef.current) {
          params.set('sessionToken', sessionTokenRef.current.toString());
        }

        const res = await fetch(`${API_BASE}/maps/autocomplete?${params.toString()}`);
        const data = await res.json();
        setIsSearching(false);

        if (data.success) {
          const results = data.data.predictions || [];
          if (results.length > 0) {
            setPredictions(results);
            setNoResults(false);
            return;
          }
        }
      } catch (err) {
        setIsSearching(false);
      }

      // Fallback: Check client-side Google Places AutocompleteService if available
      if (window.google?.maps?.places?.AutocompleteService) {
        try {
          const service = new window.google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            { input: val, componentRestrictions: { country } },
            (clientResults, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && clientResults && clientResults.length > 0) {
                setPredictions(clientResults);
                setNoResults(false);
                setError(null);
              } else {
                setPredictions([]);
                setNoResults(true);
              }
            }
          );
          return;
        } catch (_) {}
      }

      setPredictions([]);
      setNoResults(true);
    }, 300);
  };

  // ── Handle suggestion click — fetch full place details via proxy / client ─────
  const handleSelect = useCallback(
    async (prediction) => {
      setPredictions([]);
      setNoResults(false);
      setQuery(prediction.description);

      const mainText = prediction.structured_formatting?.main_text || '';
      const secondaryText = prediction.structured_formatting?.secondary_text || '';

      // 1. Try backend place-details proxy
      try {
        const params = new URLSearchParams({ placeId: prediction.place_id });
        if (sessionTokenRef.current) {
          params.set('sessionToken', sessionTokenRef.current.toString());
        }

        const res = await fetch(`${API_BASE}/maps/place-details?${params.toString()}`);
        const data = await res.json();

        if (data.success && data.data) {
          const place = data.data;
          if (onPlaceSelect) {
            const placeComp = place.addressComponents || {};
            onPlaceSelect({
              placeName: place.placeName || mainText || '',
              formattedAddress: place.formattedAddress || prediction.description,
              secondaryText,
              lat: place.lat,
              lng: place.lng,
              placeId: place.placeId,
              addressComponents: [
                ...(placeComp.houseNo ? [{ types: ['street_number'], long_name: placeComp.houseNo }] : []),
                ...(placeComp.street ? [{ types: ['route'], long_name: placeComp.street }] : []),
                ...(placeComp.area ? [{ types: ['sublocality_level_1'], long_name: placeComp.area }] : []),
                ...(placeComp.villageTownCity ? [{ types: ['locality'], long_name: placeComp.villageTownCity }] : placeComp.city ? [{ types: ['locality'], long_name: placeComp.city }] : []),
                ...(placeComp.district ? [{ types: ['administrative_area_level_2'], long_name: placeComp.district }] : []),
                ...(placeComp.state ? [{ types: ['administrative_area_level_1'], long_name: placeComp.state }] : []),
                ...(placeComp.zip ? [{ types: ['postal_code'], long_name: placeComp.zip }] : []),
              ],
              rawComponents: placeComp
            });
          }
          resetSessionToken();
          return;
        }
      } catch (err) {
        console.warn('[PlacesAutocomplete] Backend place-details error, trying client geocoder');
      }

      // 2. Fallback: Client Geocoder with place_id or description
      if (window.google?.maps?.Geocoder) {
        try {
          const geocoder = new window.google.maps.Geocoder();
          const req = prediction.place_id ? { placeId: prediction.place_id } : { address: prediction.description };
          const result = await geocoder.geocode(req);
          if (result.results && result.results.length > 0) {
            const r = result.results[0];
            if (onPlaceSelect) {
              onPlaceSelect({
                placeName: mainText || r.formatted_address,
                formattedAddress: r.formatted_address || prediction.description,
                secondaryText,
                lat: r.geometry.location.lat(),
                lng: r.geometry.location.lng(),
                placeId: r.place_id || prediction.place_id,
                addressComponents: r.address_components,
              });
            }
            resetSessionToken();
            return;
          }
        } catch (_) {}
      }

      // 3. Fallback: Direct search by description
      handleDirectSearch(prediction.description);
    },
    [onPlaceSelect, handleDirectSearch]
  );

  // ── Handle Key Down (Enter key to search directly) ───────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (predictions.length > 0) {
        handleSelect(predictions[0]);
      } else if (query.trim().length >= 2) {
        handleDirectSearch(query);
      }
    }
  };

  // ── Clear input ────────────────────────────────────────────────────────────
  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setNoResults(false);
    setError(null);
    clearTimeout(debounceRef.current);
    resetSessionToken();
  };

  // ── Not loaded yet ─────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className={`relative w-full ${className}`}>
        <div className="relative">
          <Search
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
              darkMode ? 'text-white/30' : 'text-muted'
            }`}
          />
          <input
            type="text"
            disabled
            value=""
            readOnly
            placeholder="Search area, street, school, hospital, city..."
            className={
              darkMode
                ? 'w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-[13px] text-white/30 placeholder:text-white/20 outline-none font-medium cursor-not-allowed'
                : 'w-full bg-base border border-line rounded-xl pl-10 pr-10 py-3 text-xs text-muted placeholder:text-muted outline-none font-semibold cursor-not-allowed'
            }
          />
          <Loader
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${
              darkMode ? 'text-violet-400' : 'text-primary'
            }`}
          />
        </div>
      </div>
    );
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputCls = darkMode
    ? 'w-full bg-white/8 border border-white/12 rounded-xl pl-10 pr-10 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-violet-500/60 transition-colors font-medium'
    : 'w-full bg-base border border-line-strong rounded-xl pl-10 pr-10 py-3 text-xs text-main placeholder:text-muted outline-none focus:border-primary transition-colors font-semibold';

  const dropdownCls = darkMode
    ? 'absolute left-0 right-0 top-[calc(100%+4px)] bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60] max-h-56 overflow-y-auto'
    : 'absolute left-0 right-0 top-[calc(100%+4px)] bg-surface border border-line rounded-xl shadow-lg overflow-hidden z-[60] max-h-56 overflow-y-auto';

  const itemCls = darkMode
    ? 'w-full text-left px-4 py-3 text-[12px] text-white/80 hover:bg-violet-600/20 active:bg-violet-600/30 transition-colors flex items-start gap-3 border-b border-white/5 last:border-b-0 cursor-pointer'
    : 'w-full text-left px-4 py-2.5 text-xs text-main hover:bg-primary/10 active:bg-primary/15 transition-colors flex items-start gap-2 border-b border-line last:border-b-0 cursor-pointer';

  const pinCls = darkMode
    ? 'w-3.5 h-3.5 mt-0.5 text-violet-400 flex-shrink-0'
    : 'w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0';

  const secondaryCls = darkMode ? 'text-white/40' : 'text-muted';

  const emptyMsgCls = darkMode
    ? 'px-4 py-3 text-[12px] text-white/40 flex items-center justify-between'
    : 'px-4 py-2.5 text-xs text-muted flex items-center justify-between';

  const errorCls = darkMode ? 'text-red-400' : 'text-red-500';

  const showDropdown = predictions.length > 0 || (noResults && query.length >= 2 && !isSearching);

  return (
    <div className={`relative w-full ${className}`}>
      {/* ── Input ── */}
      <div className="relative">
        <Search
          className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
            darkMode ? 'text-white/40' : 'text-muted'
          }`}
        />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={inputCls}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        {isSearching ? (
          <Loader
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin ${
              darkMode ? 'text-violet-400' : 'text-primary'
            }`}
          />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${
              darkMode ? 'text-white/40 hover:text-white' : 'text-muted hover:text-main'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div className={dropdownCls}>
          {predictions.length > 0
            ? predictions.map((pred) => (
                <button
                  key={pred.place_id || pred.description}
                  type="button"
                  onClick={() => handleSelect(pred)}
                  className={itemCls}
                >
                  <MapPin className={pinCls} />
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="font-semibold truncate w-full leading-snug">
                      {pred.structured_formatting?.main_text || pred.description}
                    </span>
                    {pred.structured_formatting?.secondary_text && (
                      <span className={`text-[10px] ${secondaryCls} truncate w-full leading-tight mt-0.5`}>
                        {pred.structured_formatting.secondary_text}
                      </span>
                    )}
                  </div>
                </button>
              ))
            : noResults && (
                <div className={emptyMsgCls}>
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${darkMode ? 'text-white/30' : 'text-muted'}`} />
                    <span>Search for &ldquo;{query}&rdquo;</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDirectSearch(query)}
                    className="text-[11px] font-bold text-violet-400 hover:text-violet-300 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Find Location ↵
                  </button>
                </div>
              )}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className={`flex items-center gap-1.5 mt-1.5 px-0.5`}>
          <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 ${errorCls}`} />
          <span className={`text-[11px] font-medium ${errorCls}`}>{error}</span>
        </div>
      )}
    </div>
  );
}