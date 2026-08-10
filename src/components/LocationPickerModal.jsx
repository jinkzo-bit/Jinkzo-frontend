import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader, X, Check, Copy } from 'lucide-react';
import { useJsApiLoader, GoogleMap } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../config/googleMapsLoader';
import { parseAddressComponents } from '../utils/parseAddressComponents';
import { isValidCoordinates } from '../utils/coordinates';
import { API_BASE } from '../config/api';
import PlacesAutocomplete from './maps/PlacesAutocomplete';

const INDIA_CENTER_LAT = 20.5937;
const INDIA_CENTER_LNG = 78.9629;
const HIGH_ZOOM    = 17;

const MAP_CONTAINER_STYLE = { height: '100%', width: '100%' };

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  gestureHandling: 'greedy',
  mapTypeId: 'roadmap',
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
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [locationType, setLocationType] = useState(null);

  // ── Map center state ─────────────────────────────────────────────────────
  const [mapCenter, setMapCenter] = useState({
    lat: initialAddress?.lat || INDIA_CENTER_LAT,
    lng: initialAddress?.lng || INDIA_CENTER_LNG,
  });
  const [mapZoom, setMapZoom] = useState(initialAddress?.lat ? HIGH_ZOOM : 4);
  const [hasValidLocation, setHasValidLocation] = useState(!!initialAddress?.lat);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [isLocating, setIsLocating]   = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [placeId, setPlaceId]         = useState(null);
  const [formattedAddress, setFormattedAddress] = useState('');
  const [locationSource, setLocationSource] = useState('MANUAL'); // 'GPS', 'SEARCH', 'MANUAL'

  const fillForm = useCallback((addr, sourceOverride = null) => {
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
    if (sourceOverride) setLocationSource(sourceOverride);
    // Store GPS accuracy and location type for display
    if (addr.gpsAccuracy) setGpsAccuracy(addr.gpsAccuracy);
    if (addr.locationType) setLocationType(addr.locationType);
  }, []);

  // ── When modal opens — initialise center & pre-fill form ─────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (initialAddress?.lat && initialAddress?.lng) {
      const initLat = initialAddress.lat;
      const initLng = initialAddress.lng;

      setMapCenter({ lat: initLat, lng: initLng });
      setMapZoom(HIGH_ZOOM);
      setCenterLat(initLat);
      setCenterLng(initLng);
      setHasValidLocation(true);
      setPlaceId(null);
      setFormattedAddress('');

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
      if (!initialAddress.formattedAddress && !initialAddress.street) {
        setIsGeocoding(true);
        fetch(`${API_BASE}/maps/geocode?lat=${initLat}&lng=${initLng}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) fillForm(data.data);
            setIsGeocoding(false);
          })
          .catch(() => setIsGeocoding(false));
      } else {
        skipNextGeocodeRef.current = true;
      }
    } else {
      // New address: no initial coords. Try GPS automatically.
      setMapCenter({ lat: INDIA_CENTER_LAT, lng: INDIA_CENTER_LNG });
      setMapZoom(4);
      setCenterLat(null);
      setCenterLng(null);
      setHasValidLocation(false);
      setPlaceId(null);
      setFormattedAddress('');
      
      if (navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            if (mapRef.current) {
              mapRef.current.panTo({ lat, lng });
              mapRef.current.setZoom(HIGH_ZOOM);
            } else {
              setMapCenter({ lat, lng });
              setMapZoom(HIGH_ZOOM);
            }
            setCenterLat(lat);
            setCenterLng(lng);
            setHasValidLocation(true);
            setLocationSource('GPS');
            setGpsAccuracy(accuracy);
            
            fetch(`${API_BASE}/maps/geocode?lat=${lat}&lng=${lng}`)
              .then(res => res.json())
              .then(data => {
                if (data.success && data.data) {
                  fillForm({ ...data.data, gpsAccuracy: accuracy }, 'GPS');
                }
                setIsLocating(false);
              })
              .catch(() => setIsLocating(false));
          },
          (err) => {
            console.warn('Auto-GPS failed on mount:', err.message);
            setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
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
      setHasValidLocation(true);
      console.log(`[LOCATION] MAP CENTER\nlat: ${lat}\nlng: ${lng}`);

      // Skip geocoding if a Places selection just happened
      if (skipNextGeocodeRef.current) {
        skipNextGeocodeRef.current = false;
        return;
      }

      clearTimeout(geocodeDebounceRef.current);
      geocodeDebounceRef.current = setTimeout(async () => {
        setIsGeocoding(true);
        try {
          const res = await fetch(`${API_BASE}/maps/geocode?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          if (data.success && data.data) {
            fillForm(data.data, 'MANUAL');
            console.log(`[LOCATION] GEOCODE SUCCESS\nformattedAddress: ${data.data.formattedAddress}\nlat: ${data.data.lat}\nlng: ${data.data.lng}`);
          }
        } catch (_) {
          // ignore
        }
        // A map drag clears the saved placeId since the pin moved away
        setPlaceId(null);
        setIsGeocoding(false);
      }, 700);
    });

    idleListenerRef.current = listener;
  }, [fillForm]);

  const onMapUnmount = useCallback(() => {
    if (idleListenerRef.current && window.google?.maps?.event) {
      window.google.maps.event.removeListener(idleListenerRef.current);
      idleListenerRef.current = null;
    }
    mapRef.current = null;
  }, []);

  // ── Google Places selection handler ──────────────────────────────────────
  const handlePlaceSelect = useCallback((placeResult) => {
    const { lat, lng, placeId: pid, formattedAddress: fa, addressComponents, locationType } = placeResult;

    // Parse components into form fields immediately
    const parsed = parseAddressComponents(addressComponents);
    fillForm({
      ...parsed,
      displayName: fa,
      formattedAddress: fa,
      lat,
      lng,
      locationType: locationType || 'SEARCH',
    }, 'SEARCH');

    setPlaceId(pid);
    setFormattedAddress(fa);
    setHasValidLocation(true);

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
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setPlaceId(null);
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(HIGH_ZOOM);
        } else {
          setMapCenter({ lat, lng });
          setMapZoom(HIGH_ZOOM);
        }
        setIsLocating(false);
            setCenterLat(lat);
            setCenterLng(lng);
            setHasValidLocation(true);
            setLocationSource('GPS');
        // Store accuracy for display
        setGpsAccuracy(accuracy);
        console.log(`[LOCATION] GPS SUCCESS\nlat: ${lat}\nlng: ${lng}`);
        // Force a quick reverse geocode via proxy for immediate feedback
        fetch(`${API_BASE}/maps/geocode?lat=${lat}&lng=${lng}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              fillForm({ ...data.data, gpsAccuracy: accuracy }, 'GPS');
              console.log(`[LOCATION] GEOCODE SUCCESS\nformattedAddress: ${data.data.formattedAddress}\nlat: ${data.data.lat}\nlng: ${data.data.lng}`);
            }
          })
          .catch(() => {});
      },
      (err) => {
        console.error('GPS error:', err.code, err.message);
        setIsLocating(false);
        setGpsAccuracy(null);
        if (err.code === 1) {
          alert('Location permission denied. Please enable it in your browser settings.');
        } else if (err.code === 2) {
          alert('Location unavailable. Please check your device GPS.');
        } else {
          alert('Could not retrieve location. Please try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (
      !hasValidLocation || 
      !isValidCoordinates(centerLat, centerLng) || 
      typeof centerLat !== 'number' || 
      typeof centerLng !== 'number' ||
      centerLat < -90 || centerLat > 90 ||
      centerLng < -180 || centerLng > 180 ||
      (centerLat === 19.0760 && centerLng === 72.8777)
    ) {
      alert('Please select your exact location on the map.');
      return;
    }
    const fullStreet = [houseNo, street].filter(Boolean).join(', ');
    
    console.log(`[LOCATION] SAVE\nlat: ${centerLat}\nlng: ${centerLng}\nformattedAddress: ${formattedAddress || displayName || ''}\nplaceId: ${placeId || ''}`);
    
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
      locationSource:   locationSource,
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

          {/* ── FIXED CENTER PIN — Swiggy/Zomato orange teardrop ── */}
          <div
            className="absolute inset-0 flex items-end justify-center pointer-events-none z-10"
            style={{ paddingBottom: '24px' }}
          >
            <div className="flex flex-col items-center" style={{ filter: 'drop-shadow(0 4px 14px rgba(252,128,25,0.65))' }}>
              {/* Orange teardrop pin body */}
              <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 1C9.163 1 2 8.163 2 17c0 10.5 16 28 16 28S34 27.5 34 17C34 8.163 26.837 1 18 1z" fill="#FC8019" stroke="white" strokeWidth="2.5"/>
                <circle cx="18" cy="17" r="6" fill="white"/>
                <circle cx="18" cy="17" r="3" fill="#FC8019"/>
              </svg>
              {/* Shadow dot */}
              <div style={{
                width: '14px',
                height: '5px',
                background: 'rgba(252,128,25,0.3)',
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

          {/* GPS Accuracy Circle & Location Type Badge */}
          {gpsAccuracy && centerLat && centerLng && (
            <>
              {/* Accuracy circle overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: 'translate(-50%, -50%)',
                  left: '50%',
                  top: '50%',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(gpsAccuracy * 2, 800)}px`,
                    height: `${Math.min(gpsAccuracy * 2, 800)}px`,
                    borderRadius: '50%',
                    border: '2px solid #7c3aed',
                    background: 'rgba(124, 58, 237, 0.08)',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              {/* Accuracy badge */}
              <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                <div className="bg-violet-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                  <MapPin className="w-3 h-3" />
                  ±{Math.round(gpsAccuracy)}m
                </div>
                {locationType && (
                  <div className={`bg-white/90 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg ${
                    locationType === 'ROOFTOP' ? 'text-green-700' :
                    locationType === 'RANGE_INTERPOLATED' ? 'text-amber-700' :
                    'text-gray-700'
                  }`}>
                    {locationType === 'ROOFTOP' && '🎯 Exact'}
                    {locationType === 'RANGE_INTERPOLATED' && '📍 Approx'}
                    {locationType === 'GEOMETRIC_CENTER' && '📍 Area Center'}
                    {locationType === 'APPROXIMATE' && '📍 Rough'}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Zoom controls (Swiggy/Zomato style) */}
          <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              onClick={() => mapRef.current && mapRef.current.setZoom((mapRef.current.getZoom() || HIGH_ZOOM) + 1)}
              style={{
                width: 30, height: 30,
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                boxShadow: '0 2px 6px rgba(0,0,0,0.13)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 17, color: '#374151', fontWeight: 700,
                userSelect: 'none',
              }}
              title="Zoom in"
            >+</button>
            <button
              type="button"
              onClick={() => mapRef.current && mapRef.current.setZoom((mapRef.current.getZoom() || HIGH_ZOOM) - 1)}
              style={{
                width: 30, height: 30,
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                boxShadow: '0 2px 6px rgba(0,0,0,0.13)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 17, color: '#374151', fontWeight: 700,
                userSelect: 'none',
              }}
              title="Zoom out"
            >−</button>
          </div>

          {/* "Drag map" hint */}
          <div className="absolute bottom-3 left-3 z-20">
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
            disabled={!hasValidLocation || !centerLat || !centerLng || isGeocoding}
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
