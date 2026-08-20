import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Loader, Search, X, AlertCircle } from 'lucide-react';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../../config/googleMapsLoader';
import { API_BASE } from '../../config/api';

/**
 * Reusable Google Places Autocomplete input using server proxy.
 * Includes session tokens for cost optimization (billed per session, not per keystroke).
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

  // ── Handle text input change — calls backend proxy ────────────────────────────
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
          } else {
            setPredictions([]);
            setNoResults(true);
          }
        } else if (data.message === 'OVER_QUERY_LIMIT') {
          setPredictions([]);
          setError('Search quota exceeded. Please try again shortly.');
        } else if (data.message === 'REQUEST_DENIED') {
          setPredictions([]);
          setError('Places API not enabled. Check your Google Cloud Console.');
        } else {
          setPredictions([]);
          setNoResults(true);
        }
      } catch (err) {
        setIsSearching(false);
        setError('Search failed. Please check your connection.');
      }
    }, 300);
  };

  // ── Handle suggestion click — fetch full place details via proxy ────────────
  const handleSelect = useCallback(
    async (prediction) => {
      setPredictions([]);
      setNoResults(false);
      setQuery(prediction.description);

      const mainText = prediction.structured_formatting?.main_text || '';
      const secondaryText = prediction.structured_formatting?.secondary_text || '';

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
        } else {
          setError('Could not load place details. Please try another result.');
        }
      } catch (err) {
        setError('Failed to load place details.');
      }
    },
    [onPlaceSelect]
  );

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
            placeholder="Loading search..."
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
    ? 'px-4 py-3 text-[12px] text-white/40 flex items-center gap-2'
    : 'px-4 py-2.5 text-xs text-muted flex items-center gap-2';

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
                  key={pred.place_id}
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
                  <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${darkMode ? 'text-white/30' : 'text-muted'}`} />
                  <span>No results for &ldquo;{query}&rdquo;</span>
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