import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader, X, Check, Copy } from 'lucide-react';
import { useJsApiLoader, GoogleMap } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../config/googleMapsLoader';
import { parseAddressComponents } from '../utils/parseAddressComponents';
import PlacesAutocomplete from './maps/PlacesAutocomplete';

// ── Google Geocoding API — reverse geocode coords to address ──────────────────
const googleReverseGeocode = async (lat, lng, apiKey) => {
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
        displayName: result.formatted_address || '',
        formattedAddress: result.formatted_address || '',
        lat,
        lng,
      };
    }
  } catch (_e) {
    // Ignore — form fields will retain last known values
  }
  return {
    houseNo: '', street: '', area: '', city: '', state: '', zip: '',
    displayName: '', formattedAddress: '', lat, lng,
  };
};

// ── Default location & zoom ───────────────────────────────────────────────────
const DEFAULT_LAT  = 19.0760;
const DEFAULT_LNG  = 72.8777;
const HIGH_ZOOM    = 17;

const MAP_CONTAINER_STYLE = { height: '100%', width: '100%' };

const MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  gestureHandling: 'greedy',
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

// ── LocationPickerModal ───────────────────────────────────────────────────────
/**
 * Props:
 *   isOpen          boolean
 *   onClose         () => void
 *   onConfirm       (address) => void
 *   initialAddress  { street, city, state, zip, lat, lng } — optional
 *   title           string
 *
 * onConfirm receives:
 *   { houseNo, street, landmark, area, city, state, zip, lat, lng, placeId, formattedAddress }
 */
export default function LocationPickerModal({ isOpen, onClose, onConfirm, initialAddress, title = 'Set Delivery Location' }) {
  const mapRef = useRef(null);
  const idleListenerRef = useRef(null);
  const geocodeDebounceRef = useRef(null);
  // Prevents the idle listener from double-geocoding after a Places selection
  const skipNextGeocodeRef = useRef(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  // ── Form fields ──────────────────────────────────────────────────────────
  const [houseNo, setHouseNo]     = useState('');
  const [street, setStreet]       = useState('');
  const [landmark, setLandmark]   = useState('');
  const [area, setArea]           = useState('');
  const [city, setCity]           = useState('');
  const [formState, setFormState] = useState('');
  const [zip, setZip]             = useState('');
  const [centerLat, setCenterLat] = useState(null);
  const [centerLng, setCenterLng] = useState(null);

  // ── Map center state ─────────────────────────────────────────────────────
  const [mapCenter, setMapCenter] = useState({
    lat: initialAddress?.lat || DEFAULT_LAT,
    lng: initialAddress?.lng || DEFAULT_LNG,
  });
  const [mapZoom, setMapZoom] = useState(initialAddress?.lat ? HIGH_ZOOM : 13);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [isLocating, setIsLocating]   = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [placeId, setPlaceId]         = useState(null);
  const [formattedAddress, setFormattedAddress] = useState('');

  const fillForm = useCallback((addr) => {
    setHouseNo(addr.houseNo   || '');
    setStreet(addr.street     || '');
    setLandmark(addr.landmark || '');
    setArea(addr.area         || '');
    setCity(addr.city         || '');
    setFormState(addr.state   || '');
    setZip(addr.zip           || '');
    setCenterLat(addr.lat);
    setCenterLng(addr.lng);
    setDisplayName(addr.displayName || addr.formattedAddress || '');
    if (addr.formattedAddress) setFormattedAddress(addr.formattedAddress);
  }, []);

  // ── When modal opens — initialise center & pre-fill form ─────────────────
  useEffect(() => {
    if (!isOpen) return;

    const initLat = initialAddress?.lat || DEFAULT_LAT;
    const initLng = initialAddress?.lng || DEFAULT_LNG;
    const initZoom = initialAddress?.lat ? HIGH_ZOOM : 13;

    setMapCenter({ lat: initLat, lng: initLng });
    setMapZoom(initZoom);
    setCenterLat(initLat);
    setCenterLng(initLng);
    setPlaceId(null);
    setFormattedAddress('');

    if (initialAddress) {
      fillForm({
        houseNo: '',
        street: initialAddress.street || '',
        landmark: '',
        area: initialAddress.area || '',
        city: initialAddress.city || '',
        state: initialAddress.state || '',
        zip: initialAddress.zip || '',
        displayName: '',
        formattedAddress: '',
        lat: initLat,
        lng: initLng,
      });
      // Reverse geocode only if we lack a formatted address or street
      if (apiKey && !initialAddress.formattedAddress && !initialAddress.street) {
        setIsGeocoding(true);
        googleReverseGeocode(initLat, initLng, apiKey).then((addr) => {
          if (addr) fillForm(addr);
          setIsGeocoding(false);
        });
      } else {
        skipNextGeocodeRef.current = true;
      }
    }
  }, [isOpen]); // eslint-disable-line

  // ── Cleanup on close ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      if (idleListenerRef.current && window.google?.maps?.event) {
        window.google.maps.event.removeListener(idleListenerRef.current);
        idleListenerRef.current = null;
      }
      clearTimeout(geocodeDebounceRef.current);
    }
  }, [isOpen]);

  // ── Map load — attach idle listener for reverse geocoding ────────────────
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;

    const listener = map.addListener('idle', async () => {
      const center = map.getCenter();
      if (!center) return;
      const lat = center.lat();
      const lng = center.lng();
      setCenterLat(lat);
      setCenterLng(lng);

      // Skip geocoding if a Places selection just happened
      if (skipNextGeocodeRef.current) {
        skipNextGeocodeRef.current = false;
        return;
      }

      clearTimeout(geocodeDebounceRef.current);
      geocodeDebounceRef.current = setTimeout(async () => {
        if (!apiKey) return;
        setIsGeocoding(true);
        const addr = await googleReverseGeocode(lat, lng, apiKey);
        fillForm(addr);
        // A map drag clears the saved placeId since the pin moved away
        setPlaceId(null);
        setIsGeocoding(false);
      }, 700);
    });

    idleListenerRef.current = listener;
  }, [fillForm, apiKey]);

  const onMapUnmount = useCallback(() => {
    if (idleListenerRef.current && window.google?.maps?.event) {
      window.google.maps.event.removeListener(idleListenerRef.current);
      idleListenerRef.current = null;
    }
    mapRef.current = null;
  }, []);

  // ── Google Places selection handler ──────────────────────────────────────
  const handlePlaceSelect = useCallback((placeResult) => {
    const { lat, lng, placeId: pid, formattedAddress: fa, addressComponents } = placeResult;

    // Parse components into form fields immediately
    const parsed = parseAddressComponents(addressComponents);
    fillForm({
      ...parsed,
      displayName: fa,
      formattedAddress: fa,
      lat,
      lng,
    });

    setPlaceId(pid);
    setFormattedAddress(fa);

    // Prevent idle listener from running a second reverse geocode pass
    skipNextGeocodeRef.current = true;

    // Pan map to the selected place
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(HIGH_ZOOM);
    } else {
      setMapCenter({ lat, lng });
      setMapZoom(HIGH_ZOOM);
    }
  }, [fillForm]);

  // ── GPS — use current position ────────────────────────────────────────────
  const handleGps = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPlaceId(null); // GPS doesn't give a Place ID
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(HIGH_ZOOM);
        } else {
          setMapCenter({ lat, lng });
          setMapZoom(HIGH_ZOOM);
        }
        setIsLocating(false);
        // idle listener will fire and reverse geocode automatically
      },
      (err) => {
        console.error('GPS error:', err.code, err.message);
        setIsLocating(false);
        if (err.code === 1) {
          alert('Location permission denied. Please enable it in your browser settings.');
        } else if (err.code === 2) {
          alert('Location unavailable. Please check your device GPS.');
        } else {
          alert('Could not retrieve location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!centerLat || !centerLng) {
      alert('Please select a location on the map first.');
      return;
    }
    const fullStreet = [houseNo, street].filter(Boolean).join(', ');
    onConfirm({
      houseNo,
      street: fullStreet || street,
      landmark,
      area,
      city,
      state: formState,
      zip,
      lat: centerLat,
      lng: centerLng,
      placeId:          placeId || null,
      formattedAddress: formattedAddress || displayName || '',
    });
  };

  const handleCopyCoords = () => {
    if (centerLat && centerLng) {
      navigator.clipboard.writeText(`${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-2 sm:p-4">
      <div
        className="bg-[#141414] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: '96vh' }}
      >

        {/* ── TOP BAR ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h3 className="font-display font-black text-white text-sm tracking-wide">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── SEARCH BAR — Google Places ── */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex gap-2">
            {/* Places Autocomplete */}
            <PlacesAutocomplete
              onPlaceSelect={handlePlaceSelect}
              placeholder="Search area, street, city..."
              darkMode={true}
              className="flex-1"
            />

            {/* GPS button */}
            <button
              type="button"
              onClick={handleGps}
              disabled={isLocating}
              title="Use GPS location"
              className="flex-shrink-0 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-bold py-2.5 px-3.5 rounded-xl cursor-pointer transition-all disabled:opacity-60 shadow-md"
            >
              {isLocating
                ? <Loader className="w-4 h-4 animate-spin" />
                : <Navigation className="w-4 h-4" />
              }
              <span>{isLocating ? '...' : 'GPS'}</span>
            </button>
          </div>
        </div>

        {/* ── MAP WITH FIXED CENTER PIN ── */}
        <div
          className="relative flex-shrink-0 mx-5 rounded-2xl overflow-hidden border border-white/10"
          style={{ height: '260px' }}
        >
          {/* Map */}
          {!isLoaded || loadError ? (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: '#1a1a2e' }}
            >
              {loadError ? (
                <div className="text-red-400 text-xs font-bold text-center px-4">
                  <MapPin className="w-5 h-5 mx-auto mb-1" />
                  Failed to load map. Check API key.
                </div>
              ) : (
                <Loader className="w-6 h-6 text-violet-400 animate-spin" />
              )}
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={mapCenter}
              zoom={mapZoom}
              options={MAP_OPTIONS}
              onLoad={onMapLoad}
              onUnmount={onMapUnmount}
            />
          )}

          {/* ── FIXED CENTER PIN (map moves underneath) ── */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            style={{ paddingBottom: '24px' }}
          >
            <div className="flex flex-col items-center" style={{ filter: 'drop-shadow(0 4px 12px rgba(124,58,237,0.7))' }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: '#7c3aed',
                borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)',
                border: '3px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  background: 'white',
                  borderRadius: '50%',
                  transform: 'rotate(45deg)',
                }} />
              </div>
              <div style={{
                width: '14px',
                height: '5px',
                background: 'rgba(124,58,237,0.35)',
                borderRadius: '50%',
                marginTop: '2px',
                filter: 'blur(3px)',
              }} />
            </div>
          </div>

          {/* Geocoding spinner */}
          {isGeocoding && (
            <div className="absolute inset-0 flex items-end justify-center pb-4 z-20 pointer-events-none">
              <div className="bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                <Loader className="w-3 h-3 animate-spin text-violet-400" />
                Getting address...
              </div>
            </div>
          )}

          {/* Lat/Lng badge + copy */}
          {centerLat && centerLng && (
            <div className="absolute top-3 left-3 z-20">
              <button
                type="button"
                onClick={handleCopyCoords}
                title="Copy coordinates"
                className="bg-black/70 backdrop-blur-sm text-white/80 text-[10px] font-mono px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-black/90 transition-colors cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-violet-400" />
                {centerLat.toFixed(5)}°N {centerLng.toFixed(5)}°E
                <Copy className="w-2.5 h-2.5 text-white/40" />
              </button>
            </div>
          )}

          {/* "Drag map" hint */}
          <div className="absolute bottom-3 right-3 z-20">
            <div className="bg-black/70 backdrop-blur-sm text-white/60 text-[10px] px-2.5 py-1 rounded-lg font-medium">
              Drag map to adjust pin
            </div>
          </div>
        </div>

        {/* ── ADDRESS FIELDS (scrollable) ── */}
        <div className="overflow-y-auto flex-1 px-5 pt-4 pb-3" style={{ minHeight: 0 }}>

          {/* Detected address banner */}
          {displayName && (
            <div className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-white/60 font-medium leading-relaxed line-clamp-2">{displayName}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* House No + Street */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="House / Flat No." value={houseNo} onChange={setHouseNo} placeholder="e.g. 4A, B-302" />
              <Field label="Street" value={street} onChange={setStreet} placeholder="e.g. MG Road" />
            </div>

            {/* Landmark */}
            <Field label="Landmark" value={landmark} onChange={setLandmark} placeholder="e.g. Near Apollo Hospital" />

            {/* Area */}
            <Field label="Area / Locality" value={area} onChange={setArea} placeholder="e.g. Andheri West" />

            {/* City + State */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={city} onChange={setCity} placeholder="e.g. Mumbai" />
              <Field label="State" value={formState} onChange={setFormState} placeholder="e.g. Maharashtra" />
            </div>

            {/* Pincode */}
            <Field label="Pincode" value={zip} onChange={setZip} placeholder="e.g. 400053" type="tel" />
          </div>
        </div>

        {/* ── SAVE BUTTON ── */}
        <div className="px-5 pb-5 pt-3 flex-shrink-0 border-t border-white/8">
          <button
            type="button"
            onClick={handleSave}
            disabled={!centerLat || !centerLng || isGeocoding}
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-[13px] font-extrabold rounded-2xl cursor-pointer shadow-lg shadow-violet-900/40 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            SAVE ADDRESS
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Reusable dark-theme input field ──────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-extrabold uppercase tracking-widest text-white/40 px-0.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/20 outline-none focus:border-violet-500/70 focus:bg-white/8 transition-all font-medium"
      />
    </div>
  );
}
