import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader, Check, Copy } from 'lucide-react';
import { useJsApiLoader, GoogleMap } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../../config/googleMapsLoader';
import { parseAddressComponents } from '../../utils/parseAddressComponents';
import { isValidCoordinates } from '../../utils/coordinates';
import { API_BASE } from '../../config/api';
import PlacesAutocomplete from './PlacesAutocomplete';

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

export default function LocationPicker({ 
  onConfirm, 
  initialAddress, 
  buttonText = 'SAVE ADDRESS'
}) {
  const mapRef = useRef(null);
  const idleListenerRef = useRef(null);
  const geocodeDebounceRef = useRef(null);
  const skipNextGeocodeRef = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  // Form fields
  const [houseNo, setHouseNo]     = useState('');
  const [street, setStreet]       = useState('');
  const [landmark, setLandmark]   = useState('');
  const [area, setArea]           = useState('');
  const [city, setCity]           = useState('');
  const [formState, setFormState] = useState('');
  const [zip, setZip]             = useState('');
  const [selectedLocation, setSelectedLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    formattedAddress: '',
    placeId: null,
    locationType: null,
    displayName: ''
  });

  const [mapCenter, setMapCenter] = useState({
    lat: (initialAddress?.lat != null && initialAddress?.lat !== '') ? Number(initialAddress.lat) : INDIA_CENTER_LAT,
    lng: (initialAddress?.lng != null && initialAddress?.lng !== '') ? Number(initialAddress.lng) : INDIA_CENTER_LNG,
  });
  const [mapZoom, setMapZoom] = useState((initialAddress?.lat != null && initialAddress?.lat !== '') ? HIGH_ZOOM : 4);
  const [hasValidLocation, setHasValidLocation] = useState((initialAddress?.lat != null && initialAddress?.lat !== ''));

  const [isLocating, setIsLocating]   = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationSource, setLocationSource] = useState('MANUAL');

  const fillForm = useCallback((addr, sourceOverride = null) => {
    // Check if we got addressComponents (from backend) or direct properties
    const components = addr.addressComponents || {};
    
    setHouseNo(components.houseNo || addr.houseNo || houseNo);
    setStreet(components.street || addr.street || street);
    setLandmark(addr.landmark || landmark);
    setArea(components.area || addr.area || area);
    setCity(components.city || addr.city || city);
    setFormState(components.state || addr.state || formState);
    setZip(components.zip || addr.zip || zip);
    
    setSelectedLocation(prev => ({
      ...prev,
      lat: addr.lat !== undefined ? addr.lat : prev.lat,
      lng: addr.lng !== undefined ? addr.lng : prev.lng,
      displayName: addr.displayName || addr.selectedLocation?.formattedAddress || addr.formattedAddress || prev.displayName,
      formattedAddress: addr.selectedLocation?.formattedAddress || addr.formattedAddress || prev.formattedAddress,
      accuracy: addr.gpsAccuracy !== undefined ? addr.gpsAccuracy : prev.accuracy,
      locationType: addr.locationType !== undefined ? addr.locationType : prev.locationType
    }));
    if (sourceOverride) setLocationSource(sourceOverride);
  }, [houseNo, street, landmark, area, city, formState, zip]);

  // Initial load
  useEffect(() => {
    const initLat = initialAddress?.lat != null && initialAddress?.lat !== '' ? Number(initialAddress.lat) : null;
    const initLng = initialAddress?.lng != null && initialAddress?.lng !== '' ? Number(initialAddress.lng) : null;
    const isValidInitCoord = initLat !== null && initLng !== null && Number.isFinite(initLat) && Number.isFinite(initLng) && initLat >= -90 && initLat <= 90 && initLng >= -180 && initLng <= 180;

    if (isValidInitCoord) {
      setMapCenter({ lat: initLat, lng: initLng });
      setMapZoom(HIGH_ZOOM);
      setSelectedLocation(prev => ({ ...prev, lat: initLat, lng: initLng, placeId: initialAddress?.placeId || null, formattedAddress: initialAddress?.formattedAddress || '' }));
      setHasValidLocation(true);

      fillForm({
        houseNo: initialAddress.houseNo || '',
        street: initialAddress.street || '',
        landmark: initialAddress.landmark || '',
        area: initialAddress.area || '',
        city: initialAddress.city || '',
        state: initialAddress.state || '',
        zip: initialAddress.zip || '',
        displayName: initialAddress.formattedAddress || '',
        formattedAddress: initialAddress.formattedAddress || '',
        lat: initLat,
        lng: initLng,
      });

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
      setMapCenter({ lat: INDIA_CENTER_LAT, lng: INDIA_CENTER_LNG });
      setMapZoom(4);
      setSelectedLocation(prev => ({ ...prev, lat: null, lng: null, placeId: null, formattedAddress: '' }));
      setHasValidLocation(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (idleListenerRef.current && window.google?.maps?.event) {
        window.google.maps.event.removeListener(idleListenerRef.current);
      }
      clearTimeout(geocodeDebounceRef.current);
    };
  }, []);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;

    const listener = map.addListener('idle', async () => {
      const center = map.getCenter();
      if (!center) return;
      const lat = center.lat();
      const lng = center.lng();
      setSelectedLocation(prev => ({ ...prev, lat, lng }));
      setHasValidLocation(true);

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
          }
        } catch (_) {}
        setSelectedLocation(prev => ({ ...prev, placeId: null }));
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

  const handlePlaceSelect = useCallback((placeResult) => {
    const { lat, lng, placeId: pid, formattedAddress: fa, addressComponents, locationType } = placeResult;

    const parsed = parseAddressComponents(addressComponents);
    fillForm({
      ...parsed,
      displayName: fa,
      formattedAddress: fa,
      lat,
      lng,
      locationType: locationType || 'SEARCH',
    }, 'SEARCH');

    setSelectedLocation(prev => ({ ...prev, placeId: pid, formattedAddress: fa }));
    setHasValidLocation(true);
    skipNextGeocodeRef.current = true;

    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(HIGH_ZOOM);
    } else {
      setMapCenter({ lat, lng });
      setMapZoom(HIGH_ZOOM);
    }
  }, [fillForm]);

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
        setSelectedLocation(prev => ({ ...prev, placeId: null }));
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(HIGH_ZOOM);
        } else {
          setMapCenter({ lat, lng });
          setMapZoom(HIGH_ZOOM);
        }
        setIsLocating(false);
        setSelectedLocation(prev => ({ ...prev, lat, lng, accuracy, placeId: null }));
        setHasValidLocation(true);
        setLocationSource('GPS');
        
        fetch(`${API_BASE}/maps/geocode?lat=${lat}&lng=${lng}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              fillForm({ ...data.data, gpsAccuracy: accuracy }, 'GPS');
            }
          })
          .catch(() => {});
      },
      (err) => {
        console.error('GPS error:', err.code, err.message);
        setIsLocating(false);
        if (err.code === 1) {
          alert('Location permission denied. Please enable it in your browser settings.');
        } else {
          alert('Unable to get your current location. Search for your area or move the map manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSave = () => {
    if (
      !hasValidLocation || 
      !isValidCoordinates(selectedLocation.lat, selectedLocation.lng) || 
      typeof selectedLocation.lat !== 'number' || 
      typeof selectedLocation.lng !== 'number' ||
      selectedLocation.lat < -90 || selectedLocation.lat > 90 ||
      selectedLocation.lng < -180 || selectedLocation.lng > 180 ||
      (selectedLocation.lat === 19.0760 && selectedLocation.lng === 72.8777)
    ) {
      alert('Please select your exact location on the map.');
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
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      placeId: selectedLocation.placeId || null,
      formattedAddress: selectedLocation.formattedAddress || selectedLocation.displayName || '',
      locationSource:   locationSource,
    });
  };

  const handleCopyCoords = () => {
    if (selectedLocation.lat && selectedLocation.lng) {
      navigator.clipboard.writeText(`${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Search Bar & GPS */}
      <div className="px-4 pb-3 pt-2 flex-shrink-0">
        <div className="flex gap-2">
          <PlacesAutocomplete
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search area, street, city..."
            darkMode={true}
            className="flex-1"
          />
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

      {/* Map Section */}
      <div
        className="relative flex-shrink-0 mx-4 rounded-2xl overflow-hidden border border-white/10"
        style={{ height: '260px' }}
      >
        {!isLoaded || loadError ? (
          <div className="w-full h-full flex items-center justify-center bg-[#1a1a2e]">
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

        {/* Fixed Center Pin */}
        <div
          className="absolute inset-0 flex items-end justify-center pointer-events-none z-10"
          style={{ paddingBottom: '24px' }}
        >
          <div className="flex flex-col items-center" style={{ filter: 'drop-shadow(0 4px 14px rgba(252,128,25,0.65))' }}>
            <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 1C9.163 1 2 8.163 2 17c0 10.5 16 28 16 28S34 27.5 34 17C34 8.163 26.837 1 18 1z" fill="#FC8019" stroke="white" strokeWidth="2.5"/>
              <circle cx="18" cy="17" r="6" fill="white"/>
              <circle cx="18" cy="17" r="3" fill="#FC8019"/>
            </svg>
            <div style={{
              width: '14px', height: '5px', background: 'rgba(252,128,25,0.3)',
              borderRadius: '50%', marginTop: '2px', filter: 'blur(3px)',
            }} />
          </div>
        </div>

        {/* Geocoding Overlay */}
        {isGeocoding && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 z-20 pointer-events-none">
            <div className="bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
              <Loader className="w-3 h-3 animate-spin text-violet-400" />
              Getting address...
            </div>
          </div>
        )}

        {/* Coordinates Badge */}
        {selectedLocation.lat && selectedLocation.lng && (
          <div className="absolute top-3 left-3 z-20">
            <button
              type="button"
              onClick={handleCopyCoords}
              title="Copy coordinates"
              className="bg-black/70 backdrop-blur-sm text-white/80 text-[10px] font-mono px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-black/90 transition-colors cursor-pointer"
            >
              <MapPin className="w-3 h-3 text-violet-400" />
              {selectedLocation.lat.toFixed(5)}°N {selectedLocation.lng.toFixed(5)}°E
              <Copy className="w-2.5 h-2.5 text-white/40" />
            </button>
          </div>
        )}

        {/* Accuracy Circle */}
        {selectedLocation.accuracy && selectedLocation.lat && selectedLocation.lng && (
          <>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ transform: 'translate(-50%, -50%)', left: '50%', top: '50%' }}
            >
              <div
                style={{
                  width: `${Math.min(selectedLocation.accuracy * 2, 800)}px`,
                  height: `${Math.min(selectedLocation.accuracy * 2, 800)}px`,
                  borderRadius: '50%', border: '2px solid #7c3aed',
                  background: 'rgba(124, 58, 237, 0.08)',
                  transform: 'translate(-50%, -50%)', pointerEvents: 'none',
                }}
              />
            </div>
            <div className="absolute top-3 right-3 z-20 flex gap-1.5">
              <div className="bg-violet-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                <MapPin className="w-3 h-3" />
                ±{Math.round(selectedLocation.accuracy)}m
              </div>
            </div>
          </>
        )}

        {/* Zoom Controls */}
        <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            type="button"
            onClick={() => mapRef.current && mapRef.current.setZoom((mapRef.current.getZoom() || HIGH_ZOOM) + 1)}
            style={{
              width: 30, height: 30, background: 'white', border: '1px solid #e5e7eb', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17, color: '#374151', fontWeight: 700
            }}
          >+</button>
          <button
            type="button"
            onClick={() => mapRef.current && mapRef.current.setZoom((mapRef.current.getZoom() || HIGH_ZOOM) - 1)}
            style={{
              width: 30, height: 30, background: 'white', border: '1px solid #e5e7eb', borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17, color: '#374151', fontWeight: 700
            }}
          >−</button>
        </div>

        {/* Hint */}
        <div className="absolute bottom-3 left-3 z-20">
          <div className="bg-black/70 backdrop-blur-sm text-white/60 text-[10px] px-2.5 py-1 rounded-lg font-medium">
            Drag map to adjust pin
          </div>
        </div>
      </div>

      {/* Simplified Address Form */}
      <div className="overflow-y-auto flex-1 px-4 pt-4 pb-2" style={{ minHeight: 0 }}>
        {selectedLocation.displayName && (
          <div className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] text-violet-400/80 font-bold uppercase tracking-wider block mb-0.5">Detected Location</span>
              <p className="text-[12px] text-white/80 font-medium leading-relaxed">{selectedLocation.displayName}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Field label="House / Flat / Door No." value={houseNo} onChange={setHouseNo} placeholder="e.g. 4A, B-302 (Optional)" />
          <Field label="Landmark & Instructions" value={landmark} onChange={setLandmark} placeholder="e.g. Near Apollo Hospital (Optional)" />
        </div>
      </div>

      {/* Save Button */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasValidLocation || !selectedLocation.lat || !selectedLocation.lng || isGeocoding}
          className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-[13px] font-extrabold rounded-2xl cursor-pointer shadow-lg shadow-violet-900/40 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          {buttonText}
        </button>
      </div>
    </div>
  );
}

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
