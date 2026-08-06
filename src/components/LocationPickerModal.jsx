import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, Loader, Search, X, Check, ChevronDown } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom animated pin icon ────────────────────────────────────────────────
const pinIcon = L.divIcon({
  html: `<div style="
    position: relative;
    width: 36px;
    height: 44px;
  ">
    <div style="
      position: absolute;
      inset: 0;
      background: #7c3aed;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 20px rgba(124,58,237,0.5);
      border: 3px solid white;
    "></div>
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -62%) rotate(0deg);
      width: 14px;
      height: 14px;
      background: white;
      border-radius: 50%;
    "></div>
    <div style="
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 12px;
      height: 6px;
      background: rgba(124,58,237,0.25);
      border-radius: 50%;
      filter: blur(2px);
    "></div>
  </div>`,
  className: '',
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -44],
});

// ── Nominatim helpers (free, no API key) ────────────────────────────────────
const reverseGeocode = async (lat, lng) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Corior-App/1.0 (support@corior.in)' },
    });
    const data = await res.json();
    if (data?.address) {
      const a = data.address;
      return {
        street: [a.road, a.suburb, a.neighbourhood, a.quarter].filter(Boolean)[0] || 'Main Road',
        city: a.city || a.town || a.village || a.county || 'City',
        state: a.state || 'State',
        zip: a.postcode || '',
        lat,
        lng,
        displayName: data.display_name || '',
      };
    }
  } catch (_) {}
  return { street: 'Selected Location', city: 'City', state: 'State', zip: '', lat, lng, displayName: '' };
};

const searchAddress = async (query) => {
  if (!query || query.length < 3) return [];
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=in&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Corior-App/1.0 (support@corior.in)' },
    });
    return await res.json();
  } catch (_) {
    return [];
  }
};

// ── LocationPickerModal ─────────────────────────────────────────────────────
/**
 * Props:
 *   isOpen          boolean
 *   onClose         () => void
 *   onConfirm       (address: {street, city, state, zip, lat, lng}) => void
 *   initialAddress  { street, city, state, zip, lat, lng } — optional, pre-fills modal
 *   title           string — optional modal title
 */
export default function LocationPickerModal({ isOpen, onClose, onConfirm, initialAddress, title = 'Pick a Location' }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const debounceRef = useRef(null);

  // Address form state
  const [formStreet, setFormStreet] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formLat, setFormLat] = useState(null);
  const [formLng, setFormLng] = useState(null);

  // Search state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Default center: Mumbai if no initial address
  const DEFAULT_LAT = 19.0760;
  const DEFAULT_LNG = 72.8777;
  const DEFAULT_ZOOM = 13;

  const fillForm = useCallback((addr) => {
    setFormStreet(addr.street || '');
    setFormCity(addr.city || '');
    setFormState(addr.state || '');
    setFormZip(addr.zip || '');
    setFormLat(addr.lat);
    setFormLng(addr.lng);
  }, []);

  // Move map & marker to given coordinates
  const moveMapTo = useCallback((lat, lng, zoom) => {
    if (!mapRef.current || !markerRef.current) return;
    mapRef.current.setView([lat, lng], zoom || DEFAULT_ZOOM);
    markerRef.current.setLatLng([lat, lng]);
  }, []);

  // Initialise Leaflet map once modal is open
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure DOM is rendered
    const timer = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const initLat = initialAddress?.lat || DEFAULT_LAT;
      const initLng = initialAddress?.lng || DEFAULT_LNG;

      const map = L.map(mapContainerRef.current, {
        center: [initLat, initLng],
        zoom: initialAddress?.lat ? 15 : DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initLat, initLng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      // On drag end — reverse geocode new position
      marker.on('dragend', async (e) => {
        const { lat, lng } = e.target.getLatLng();
        setIsReverseGeocoding(true);
        setFormLat(lat);
        setFormLng(lng);
        const addr = await reverseGeocode(lat, lng);
        fillForm(addr);
        setQuery(addr.displayName || `${addr.street}, ${addr.city}`);
        setIsReverseGeocoding(false);
      });

      // On map click — move marker and reverse geocode
      map.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setIsReverseGeocoding(true);
        setFormLat(lat);
        setFormLng(lng);
        const addr = await reverseGeocode(lat, lng);
        fillForm(addr);
        setQuery(addr.displayName || `${addr.street}, ${addr.city}`);
        setIsReverseGeocoding(false);
      });

      mapRef.current = map;
      markerRef.current = marker;

      // Pre-fill form with initial address
      if (initialAddress) {
        fillForm(initialAddress);
        setQuery(
          initialAddress.displayName ||
          `${initialAddress.street || ''}, ${initialAddress.city || ''}`.trim().replace(/^,|,$/g, '')
        );
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup map on close
  useEffect(() => {
    if (!isOpen && mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
      setSuggestions([]);
      setQuery('');
    }
  }, [isOpen]);

  // Search autocomplete with debounce
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSuggestions([]);
    clearTimeout(debounceRef.current);
    if (val.length < 3) return;
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchAddress(val);
      setSuggestions(results);
      setIsSearching(false);
    }, 600);
  };

  const handleSelectSuggestion = async (place) => {
    setSuggestions([]);
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    const a = place.address || {};
    const addr = {
      street: a.road || a.suburb || a.neighbourhood || place.display_name.split(',')[0],
      city: a.city || a.town || a.village || a.county || 'City',
      state: a.state || 'State',
      zip: a.postcode || '',
      lat,
      lng,
      displayName: place.display_name,
    };
    setQuery(place.display_name);
    fillForm(addr);
    moveMapTo(lat, lng, 16);
  };

  const handleGps = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) { alert('Geolocation not supported by your browser.'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setIsReverseGeocoding(true);
        const addr = await reverseGeocode(lat, lng);
        fillForm(addr);
        setQuery(addr.displayName || `${addr.street}, ${addr.city}`);
        moveMapTo(lat, lng, 16);
        setIsReverseGeocoding(false);
        setIsLocating(false);
      },
      (err) => {
        console.error('GPS error:', err);
        setIsLocating(false);
        alert('Unable to retrieve location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = () => {
    if (!formLat || !formLng) {
      alert('Please pick a location on the map first.');
      return;
    }
    onConfirm({
      street: formStreet,
      city: formCity,
      state: formState,
      zip: formZip,
      lat: formLat,
      lng: formLng,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[95vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-sm text-main">{title}</h3>
              <p className="text-[10px] text-muted font-semibold">Drag the pin or click on map to set exact location</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-base text-muted hover:text-main transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* ── Search Bar ── */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search for area, street, city..."
                className="w-full bg-base border border-line-strong rounded-xl pl-10 pr-10 py-2.5 text-xs text-main placeholder:text-muted outline-none focus:border-primary transition-colors font-semibold"
                autoComplete="off"
              />
              {isSearching
                ? <Loader className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                : query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); setSuggestions([]); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-main"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
            </div>
            <button
              type="button"
              onClick={handleGps}
              disabled={isLocating}
              title="Use my current GPS location"
              className="flex-shrink-0 flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-bold py-2.5 px-3.5 rounded-xl cursor-pointer transition-all disabled:opacity-60"
            >
              {isLocating ? <Loader className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 fill-primary/20" />}
              <span className="hidden sm:inline">{isLocating ? 'Locating...' : 'GPS'}</span>
            </button>
          </div>

          {/* Suggestion Dropdown */}
          {suggestions.length > 0 && (
            <div className="mt-1 bg-surface border border-line rounded-2xl shadow-xl overflow-hidden max-h-48 overflow-y-auto z-10 relative">
              {suggestions.map((place, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSuggestion(place)}
                  className="w-full text-left px-4 py-2.5 text-xs text-main hover:bg-primary/8 transition-colors flex items-start gap-2.5 border-b border-line last:border-b-0"
                >
                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
                  <span className="line-clamp-2 font-semibold">{place.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Map ── */}
        <div className="relative flex-shrink-0 mx-5 rounded-2xl overflow-hidden border border-line" style={{ height: '300px' }}>
          <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
          {isReverseGeocoding && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10 rounded-2xl">
              <div className="bg-surface border border-line rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
                <Loader className="w-4 h-4 text-primary animate-spin" />
                <span className="text-xs font-bold text-main">Getting address...</span>
              </div>
            </div>
          )}
          {/* Lat/Lng badge */}
          {formLat && formLng && (
            <div className="absolute bottom-3 left-3 z-10 bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md">
              <MapPin className="w-3 h-3 text-violet-400" />
              {formLat.toFixed(6)}°N, {formLng.toFixed(6)}°E
            </div>
          )}
        </div>

        {/* ── Address Fields ── */}
        <div className="px-5 py-4 flex-shrink-0 border-t border-line/60 mt-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
            <ChevronDown className="w-3.5 h-3.5" /> Confirm Address Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted px-0.5">Street / Area</label>
              <input
                type="text"
                value={formStreet}
                onChange={(e) => setFormStreet(e.target.value)}
                placeholder="Street, landmark, area..."
                className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted px-0.5">City</label>
              <input
                type="text"
                value={formCity}
                onChange={(e) => setFormCity(e.target.value)}
                placeholder="City"
                className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted px-0.5">State</label>
              <input
                type="text"
                value={formState}
                onChange={(e) => setFormState(e.target.value)}
                placeholder="State"
                className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted px-0.5">ZIP / Pincode</label>
              <input
                type="text"
                value={formZip}
                onChange={(e) => setFormZip(e.target.value)}
                placeholder="000000"
                className="bg-base border border-line-strong rounded-xl px-3.5 py-2.5 text-xs text-main font-semibold outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ── Footer Buttons ── */}
        <div className="px-5 pb-5 flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-line-strong text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!formLat || !formLng || isReverseGeocoding}
            className="flex-[2] py-3 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
}
