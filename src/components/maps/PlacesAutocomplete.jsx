import React, { useCallback, useRef, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Loader, Search, X, AlertCircle } from 'lucide-react';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../../config/googleMapsLoader';


/**
 * Reusable Google Places Autocomplete input.
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
  const autocompleteServiceRef = useRef(null);
  const detailsDivRef = useRef(null);

  // ── Lazy-init AutocompleteService ──────────────────────────────────────────
  const getAutocompleteService = () => {
    if (!autocompleteServiceRef.current && window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }
    return autocompleteServiceRef.current;
  };

  // ── Handle text input change ───────────────────────────────────────────────
  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setError(null);
    setNoResults(false);
    clearTimeout(debounceRef.current);

    if (val.length < 3) {
      setPredictions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const svc = getAutocompleteService();
      if (!svc) {
        setError('Maps not loaded yet. Please wait a moment.');
        return;
      }

      setIsSearching(true);

      svc.getPlacePredictions(
        { input: val, componentRestrictions: { country } },
        (results, status) => {
          setIsSearching(false);
          const S = window.google.maps.places.PlacesServiceStatus;

          if (status === S.OK && results?.length) {
            setPredictions(results);
            setNoResults(false);
          } else if (status === S.ZERO_RESULTS) {
            setPredictions([]);
            setNoResults(true);
          } else if (status === S.OVER_QUERY_LIMIT) {
            setPredictions([]);
            setError('Search quota exceeded. Please try again shortly.');
          } else if (status === S.REQUEST_DENIED) {
            setPredictions([]);
            setError('Places API not enabled. Check your Google Cloud Console.');
          } else if (status === S.NOT_FOUND) {
            setPredictions([]);
            setNoResults(true);
          } else {
            setPredictions([]);
          }
        }
      );
    }, 400);
  };

  // ── Handle suggestion click — fetch full place details ────────────────────
  const handleSelect = useCallback(
    (prediction) => {
      setPredictions([]);
      setNoResults(false);
      setQuery(prediction.description);

      if (!detailsDivRef.current) {
        detailsDivRef.current = document.createElement('div');
      }

      const placesService = new window.google.maps.places.PlacesService(detailsDivRef.current);

      placesService.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['geometry', 'address_components', 'formatted_address', 'place_id'],
        },
        (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place?.geometry?.location
          ) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            if (onPlaceSelect) {
              onPlaceSelect({
                formattedAddress: place.formatted_address || prediction.description,
                lat,
                lng,
                placeId: place.place_id,
                addressComponents: place.address_components || [],
              });
            }
          } else {
            setError('Could not load place details. Please try another result.');
          }
        }
      );
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

  const showDropdown = predictions.length > 0 || (noResults && query.length >= 3 && !isSearching);

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
