import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Compass, Loader, Check, Copy } from 'lucide-react';
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
  rotateControl: false,
  heading: 0,
  tilt: 0,
  isFractionalZoomEnabled: true,
  mapTypeId: 'roadmap',
};

export default function LocationPicker({ 
  onConfirm, 
  initialAddress, 
  buttonText = 'SAVE ADDRESS'
}) {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const idleListenerRef = useRef(null);
  const geocodeDebounceRef = useRef(null);
  const skipNextGeocodeRef = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  // Compass / Phone Direction State (Indicator Overlay ONLY - Map stays 2D North-Up)
  const [isDirectionActive, setIsDirectionActive] = useState(false);
  const [displayedHeading, setDisplayedHeading] = useState(0);
  const targetHeadingRef = useRef(0);
  const currentHeadingRef = useRef(0);
  const animFrameRef = useRef(null);

  // Form fields
  const [placeName, setPlaceName]             = useState('');
  const [houseNo, setHouseNo]                 = useState('');
  const [street, setStreet]                   = useState('');
  const [landmark, setLandmark]               = useState('');
  const [area, setArea]                       = useState('');
  const [villageTownCity, setVillageTownCity] = useState('');
  const [city, setCity]                       = useState('');
  const [district, setDistrict]               = useState('');
  const [formState, setFormState]             = useState('');
  const [zip, setZip]                         = useState('');
  const [selectedLocation, setSelectedLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    formattedAddress: '',
    placeName: '',
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

  const fillForm = useCallback((addr, sourceOverride = null, authoritativeCoords = null) => {
    const components = addr.addressComponents || {};
    
    const pName = addr.placeName || components.placeName || components.pointOfInterest || addr.name || '';
    const hNo = components.houseNo || addr.houseNo || '';
    const st = components.street || addr.street || '';
    const ar = components.area || addr.area || '';
    const vtc = components.villageTownCity || components.city || addr.villageTownCity || addr.city || '';
    const ct = components.city || vtc || addr.city || '';
    const dist = components.district || addr.district || '';
    const stt = components.state || addr.state || '';
    const zp = components.zip || components.pincode || addr.zip || addr.pincode || '';
    const lm = addr.landmark || landmark;
    const rawFormatted = addr.formattedAddress || addr.displayName || '';

    if (pName) setPlaceName(pName);
    else if (sourceOverride !== 'KEEP_PLACE' && sourceOverride !== 'GPS' && sourceOverride !== 'MANUAL') setPlaceName('');

    if (hNo) setHouseNo(hNo);
    if (st) setStreet(st);
    if (lm) setLandmark(lm);
    if (ar) setArea(ar);
    if (vtc) setVillageTownCity(vtc);
    if (ct) setCity(ct);
    if (dist) setDistrict(dist);
    if (stt) setFormState(stt);
    if (zp) setZip(zp);

    setSelectedLocation(prev => {
      // Source of truth: authoritativeCoords > addr.lat/lng (initial) > prev.lat/lng
      let targetLat = prev.lat;
      let targetLng = prev.lng;

      if (authoritativeCoords && authoritativeCoords.lat != null && authoritativeCoords.lng != null) {
        targetLat = authoritativeCoords.lat;
        targetLng = authoritativeCoords.lng;
      } else if (addr.lat !== undefined && addr.lat !== null && !authoritativeCoords) {
        targetLat = addr.lat;
        targetLng = addr.lng;
      }

      return {
        ...prev,
        lat: targetLat,
        lng: targetLng,
        placeName: pName || prev.placeName,
        displayName: rawFormatted || prev.displayName,
        formattedAddress: rawFormatted || prev.formattedAddress,
        accuracy: addr.gpsAccuracy !== undefined ? addr.gpsAccuracy : prev.accuracy,
        locationType: addr.locationType !== undefined ? addr.locationType : prev.locationType,
        placeId: addr.placeId !== undefined ? addr.placeId : prev.placeId
      };
    });

    if (sourceOverride) setLocationSource(sourceOverride);
  }, [landmark]);

  // Initial load
  useEffect(() => {
    const initLat = initialAddress?.lat != null && initialAddress?.lat !== '' ? Number(initialAddress.lat) : null;
    const initLng = initialAddress?.lng != null && initialAddress?.lng !== '' ? Number(initialAddress.lng) : null;
    const isValidInitCoord = initLat !== null && initLng !== null && Number.isFinite(initLat) && Number.isFinite(initLng) && initLat >= -90 && initLat <= 90 && initLng >= -180 && initLng <= 180;

    if (isValidInitCoord) {
      setMapCenter({ lat: initLat, lng: initLng });
      setMapZoom(HIGH_ZOOM);
      setSelectedLocation(prev => ({
        ...prev,
        lat: initLat,
        lng: initLng,
        placeName: initialAddress?.placeName || '',
        placeId: initialAddress?.placeId || null,
        formattedAddress: initialAddress?.formattedAddress || ''
      }));
      setHasValidLocation(true);

      fillForm({
        placeName: initialAddress.placeName || '',
        houseNo: initialAddress.houseNo || initialAddress.houseFlatDoor || '',
        street: initialAddress.street || '',
        landmark: initialAddress.landmark || '',
        area: initialAddress.area || '',
        villageTownCity: initialAddress.villageTownCity || initialAddress.city || '',
        city: initialAddress.city || initialAddress.villageTownCity || '',
        district: initialAddress.district || '',
        state: initialAddress.state || '',
        zip: initialAddress.zip || initialAddress.pincode || '',
        displayName: initialAddress.formattedAddress || '',
        formattedAddress: initialAddress.formattedAddress || '',
        lat: initLat,
        lng: initLng,
      }, null, { lat: initLat, lng: initLng });

      if (!initialAddress.formattedAddress && !initialAddress.street) {
        setIsGeocoding(true);
        fetch(`${API_BASE}/maps/geocode?lat=${initLat}&lng=${initLng}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) fillForm(data.data, null, { lat: initLat, lng: initLng });
            setIsGeocoding(false);
          })
          .catch(() => setIsGeocoding(false));
      } else {
        skipNextGeocodeRef.current = true;
      }
    } else {
      setMapCenter({ lat: INDIA_CENTER_LAT, lng: INDIA_CENTER_LNG });
      setMapZoom(4);
      setSelectedLocation(prev => ({ ...prev, lat: null, lng: null, placeId: null, placeName: '', formattedAddress: '' }));
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

  // Helper for shortest angle difference (-180 to +180)
  const getAngleDiff = (target, current) => {
    let diff = (target - current) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
  };

  // Compass animation loop using requestAnimationFrame for smooth movement
  useEffect(() => {
    if (!isDirectionActive) return;

    let isRunning = true;
    const animate = () => {
      if (!isRunning) return;
      const diff = getAngleDiff(targetHeadingRef.current, currentHeadingRef.current);
      if (Math.abs(diff) > 0.05) {
        currentHeadingRef.current = (currentHeadingRef.current + diff * 0.18 + 360) % 360;
        setDisplayedHeading(Math.round(currentHeadingRef.current * 10) / 10);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isDirectionActive]);

  // Device orientation event listener (Android absolute + fallback, iOS webkitCompassHeading, screen orientation)
  useEffect(() => {
    if (!isDirectionActive) return;

    const handleOrientation = (event) => {
      let heading = null;

      // 1. iOS Safari webkitCompassHeading (0 = North, 90 = East, 180 = South, 270 = West)
      if (typeof event.webkitCompassHeading === 'number') {
        heading = event.webkitCompassHeading;
      }
      // 2. Android / Standard W3C Device Orientation
      else if (event.alpha !== null && event.alpha !== undefined) {
        if (event.beta !== null && event.gamma !== null) {
          const degToRad = Math.PI / 180;
          const alphaRad = (event.alpha || 0) * degToRad;
          const betaRad = (event.beta || 0) * degToRad;
          const gammaRad = (event.gamma || 0) * degToRad;

          const cA = Math.cos(alphaRad);
          const sA = Math.sin(alphaRad);
          const cB = Math.cos(betaRad);
          const sB = Math.sin(betaRad);
          const cG = Math.cos(gammaRad);
          const sG = Math.sin(gammaRad);

          const rA = -cA * sG - sA * sB * cG;
          const rB = -sA * sG + cA * sB * cG;

          let compassHeading = Math.atan2(rA, rB) * (180 / Math.PI);
          if (compassHeading < 0) compassHeading += 360;
          heading = compassHeading;
        } else {
          heading = (360 - event.alpha) % 360;
        }
      }

      if (heading !== null && !isNaN(heading)) {
        // Adjust for device screen orientation angle
        const screenAngle = (window.screen?.orientation?.angle !== undefined)
          ? window.screen.orientation.angle
          : (typeof window.orientation === 'number' ? window.orientation : 0);

        let finalHeading = (heading + screenAngle) % 360;
        if (finalHeading < 0) finalHeading += 360;

        // Small deadzone (0.5°) to suppress sensor jitter
        const diff = Math.abs(getAngleDiff(finalHeading, targetHeadingRef.current));
        if (diff > 0.5) {
          targetHeadingRef.current = finalHeading;
        }
      }
    };

    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else if ('ondeviceorientation' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      }
      if ('ondeviceorientation' in window) {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, [isDirectionActive]);

  // Toggle Direction with permission request on iOS
  const toggleDirection = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (isDirectionActive) {
      setIsDirectionActive(false);
      return;
    }

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          setIsDirectionActive(true);
        } else {
          alert('Compass permission is required to follow your direction.');
        }
      } catch (err) {
        console.warn('Orientation permission error:', err);
        alert('Compass permission is required to follow your direction.');
      }
    } else {
      setIsDirectionActive(true);
    }
  };

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapInstance(map);

    const listener = map.addListener('idle', async () => {
      const center = map.getCenter();
      if (!center) return;
      const lat = center.lat();
      const lng = center.lng();

      if (skipNextGeocodeRef.current) {
        skipNextGeocodeRef.current = false;
        return;
      }

      // Dragged pin coordinates are the authoritative coordinates
      setSelectedLocation(prev => ({ ...prev, lat, lng, placeId: null, locationType: 'MANUAL' }));
      setHasValidLocation(true);
      setLocationSource('MANUAL');

      clearTimeout(geocodeDebounceRef.current);
      geocodeDebounceRef.current = setTimeout(async () => {
        setIsGeocoding(true);
        try {
          const res = await fetch(`${API_BASE}/maps/geocode?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          if (data.success && data.data) {
            // Reverse geocoding provides address fields, exact dragged coordinates are locked
            fillForm(data.data, 'MANUAL', { lat, lng });
          }
        } catch (_) {}
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
    setMapInstance(null);
  }, []);

  const handlePlaceSelect = useCallback((placeResult) => {
    const { lat, lng, placeId: pid, formattedAddress: fa, placeName: pName, addressComponents, rawComponents } = placeResult;

    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const parsed = rawComponents || parseAddressComponents(addressComponents);
    const resolvedPlaceName = pName || parsed.placeName || parsed.pointOfInterest || '';

    setPlaceName(resolvedPlaceName);
    
    // Authoritative coordinates directly from Google Places API (New) Place Details
    setSelectedLocation({
      lat,
      lng,
      placeId: pid,
      placeName: resolvedPlaceName,
      formattedAddress: fa,
      displayName: fa,
      accuracy: null,
      locationType: 'SEARCH'
    });

    fillForm({
      ...parsed,
      placeName: resolvedPlaceName,
      displayName: fa,
      formattedAddress: fa,
      placeId: pid,
      locationType: 'SEARCH',
    }, 'SEARCH', { lat, lng });

    setHasValidLocation(true);
    setMapCenter({ lat, lng });
    setMapZoom(HIGH_ZOOM);
    skipNextGeocodeRef.current = true;

    if (mapRef.current) {
      mapRef.current.setCenter({ lat, lng });
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(HIGH_ZOOM);
    }
  }, [fillForm]);

  const handleGps = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        
        // Authoritative device GPS coordinates
        setSelectedLocation(prev => ({
          ...prev,
          lat,
          lng,
          accuracy,
          placeId: null,
          locationType: 'GPS'
        }));
        setHasValidLocation(true);
        setLocationSource('GPS');
        setMapCenter({ lat, lng });
        setMapZoom(HIGH_ZOOM);
        skipNextGeocodeRef.current = true;

        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(HIGH_ZOOM);
        }
        setIsLocating(false);
        
        // Reverse geocoding provides address fields, coordinates locked to device GPS { lat, lng }
        setIsGeocoding(true);
        fetch(`${API_BASE}/maps/geocode?lat=${lat}&lng=${lng}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              fillForm({ ...data.data, gpsAccuracy: accuracy }, 'GPS', { lat, lng });
            }
          })
          .catch(() => {})
          .finally(() => setIsGeocoding(false));
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
    const bestPlaceName = placeName || selectedLocation.placeName || street || area || city || '';
    const bestFormattedAddress = selectedLocation.formattedAddress || [bestPlaceName, street, area, villageTownCity || city, district, formState, zip].filter(Boolean).join(', ');

    onConfirm({
      placeId: selectedLocation.placeId || null,
      placeName: bestPlaceName,
      formattedAddress: bestFormattedAddress,
      houseFlatDoor: houseNo,
      houseNo,
      street: fullStreet || street,
      landmark,
      area,
      villageTownCity: villageTownCity || city,
      city: city || villageTownCity,
      district,
      state: formState,
      pincode: zip,
      zip,
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      locationSource: locationSource,
    });
  };

  const handleCopyCoords = () => {
    if (selectedLocation.lat && selectedLocation.lng) {
      navigator.clipboard.writeText(`${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`);
    }
  };

  const getDisplayLocation = () => {
    const primary = placeName || selectedLocation.placeName || street || area || villageTownCity || city || (selectedLocation.formattedAddress ? selectedLocation.formattedAddress.split(',')[0] : '');

    const subParts = [];
    if (area && area !== primary) subParts.push(area);
    if ((villageTownCity || city) && (villageTownCity || city) !== primary && (villageTownCity || city) !== area) subParts.push(villageTownCity || city);
    if (district && district !== primary && district !== (villageTownCity || city)) subParts.push(district);
    if (formState && formState !== primary) subParts.push(formState);
    if (zip && !subParts.includes(zip)) subParts.push(zip);

    let subtitle = subParts.join(', ');
    if (!subtitle && selectedLocation.formattedAddress) {
      const parts = selectedLocation.formattedAddress.split(',').map(s => s.trim());
      if (parts.length > 1) {
        subtitle = parts.slice(1).join(', ');
      }
    }

    return { primary, subtitle };
  };

  const { primary: displayTitle, subtitle: displaySubtitle } = getDisplayLocation();

  return (
    <div className="flex flex-col h-full w-full">
      {/* Search Bar & Controls */}
      <div className="px-4 pb-3 pt-2 flex-shrink-0">
        <div className="flex gap-2">
          <PlacesAutocomplete
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search area, street, school, hospital, city..."
            darkMode={true}
            className="flex-1"
          />
          {/* Follow Direction Button (Top Bar) */}
          <button
            type="button"
            onClick={toggleDirection}
            title={isDirectionActive ? 'Disable compass direction' : 'Follow phone direction'}
            className={`flex-shrink-0 flex items-center gap-1.5 text-[12px] font-bold py-2.5 px-3 rounded-xl cursor-pointer transition-all shadow-md ${
              isDirectionActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/40'
                : 'bg-white/10 hover:bg-white/15 text-white/80 border border-white/10'
            }`}
          >
            <Compass className={`w-4 h-4 ${isDirectionActive ? 'animate-pulse' : ''}`} />
            <span>{isDirectionActive ? 'Dir ON' : 'Dir'}</span>
          </button>
          {/* GPS Button */}
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
        ref={mapContainerRef}
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
          <>
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={mapCenter}
              zoom={mapZoom}
              options={MAP_OPTIONS}
              onLoad={onMapLoad}
              onUnmount={onMapUnmount}
            />
          </>
        )}

        {/* Phone Direction / Compass Cone Overlay (Rotates ONLY this overlay; Map stays North-Up) */}
        {isDirectionActive && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(-50%, -50%) rotate(${displayedHeading}deg)`,
              transformOrigin: '50% 50%',
            }}
          >
            <div className="relative flex flex-col items-center justify-center pointer-events-none" style={{ width: '160px', height: '160px' }}>
              <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="directionConeGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
                    <stop offset="70%" stopColor="#8b5cf6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* 50-degree FOV flashlight beam extending forward (upward = 0 deg) */}
                <path d="M80 80 L52 14 A74 74 0 0 1 108 14 Z" fill="url(#directionConeGrad)" />
                {/* Direction arrow / chevron */}
                <path d="M80 16 L73 32 L80 27 L87 32 Z" fill="#8b5cf6" opacity="0.9" />
              </svg>
            </div>
          </div>
        )}

        {/* Fixed Center Pin */}
        <div
          className="absolute pointer-events-none z-10"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex flex-col items-center" style={{ filter: 'drop-shadow(0 4px 14px rgba(252,128,25,0.65))' }}>
            <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 1C9.163 1 2 8.163 2 17c0 10.5 16 28 16 28S34 27.5 34 17C34 8.163 26.837 1 18 1z" fill="#FC8019" stroke="white" strokeWidth="2.5"/>
              <circle cx="18" cy="17" r="6" fill="white"/>
              <circle cx="18" cy="17" r="3" fill="#FC8019"/>
            </svg>
            <div style={{
              width: '14px', height: '5px', background: 'rgba(252,128,25,0.3)',
              borderRadius: '50%', marginTop: '-2px', filter: 'blur(3px)',
            }} />
          </div>
        </div>

        {/* Geocoding Overlay */}
        {isGeocoding && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 z-20 pointer-events-none">
            <div className="bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
              <Loader className="w-3 h-3 animate-spin text-violet-400" />
              Finding location...
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

        {/* Compass Heading Badge (When active) */}
        {isDirectionActive && (
          <div className="absolute top-3 right-3 z-20">
            <div className="bg-black/75 backdrop-blur-sm text-violet-300 text-[10px] font-bold font-mono px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md border border-violet-500/30">
              <Compass className="w-3.5 h-3.5 text-violet-400 animate-spin" style={{ animationDuration: '8s' }} />
              <span>{Math.round(displayedHeading)}°</span>
              <span className="text-white/60 text-[9px]">
                {displayedHeading >= 337.5 || displayedHeading < 22.5 ? 'N' :
                 displayedHeading >= 22.5 && displayedHeading < 67.5 ? 'NE' :
                 displayedHeading >= 67.5 && displayedHeading < 112.5 ? 'E' :
                 displayedHeading >= 112.5 && displayedHeading < 157.5 ? 'SE' :
                 displayedHeading >= 157.5 && displayedHeading < 202.5 ? 'S' :
                 displayedHeading >= 202.5 && displayedHeading < 247.5 ? 'SW' :
                 displayedHeading >= 247.5 && displayedHeading < 292.5 ? 'W' : 'NW'}
              </span>
            </div>
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
            {!isDirectionActive && (
              <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
                <div className={`text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-lg ${
                  selectedLocation.accuracy <= 20
                    ? 'bg-emerald-600'
                    : selectedLocation.accuracy <= 50
                      ? 'bg-violet-600'
                      : selectedLocation.accuracy <= 100
                        ? 'bg-amber-600'
                        : 'bg-red-600'
                }`}>
                  <MapPin className="w-3 h-3" />
                  ±{Math.round(selectedLocation.accuracy)}m ({
                    selectedLocation.accuracy <= 20
                      ? 'Excellent'
                      : selectedLocation.accuracy <= 50
                        ? 'Good'
                        : selectedLocation.accuracy <= 100
                          ? 'Moderate'
                          : 'Low accuracy'
                  })
                </div>
                {selectedLocation.accuracy > 100 && (
                  <div className="bg-black/80 backdrop-blur-sm text-amber-300 text-[9px] font-medium px-2 py-0.5 rounded-md shadow-md max-w-[200px] text-right">
                    Move pin manually to exact location
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Map Floating Controls (Bottom-Right) */}
        <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
          {/* Follow Direction Floating Button */}
          <button
            type="button"
            onClick={toggleDirection}
            title={isDirectionActive ? 'Disable compass direction' : 'Follow phone direction'}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
              transition: 'all 0.2s',
              background: isDirectionActive ? '#7c3aed' : 'rgba(20, 20, 20, 0.85)',
              color: isDirectionActive ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
              border: isDirectionActive ? '1.5px solid #a78bfa' : '1px solid rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <Compass className={`w-4 h-4 ${isDirectionActive ? 'text-white' : ''}`} />
          </button>

          {/* Zoom In & Out */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              onClick={() => mapRef.current && mapRef.current.setZoom((mapRef.current.getZoom() || HIGH_ZOOM) + 1)}
              style={{
                width: 32, height: 32, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17, color: '#374151', fontWeight: 700
              }}
            >+</button>
            <button
              type="button"
              onClick={() => mapRef.current && mapRef.current.setZoom((mapRef.current.getZoom() || HIGH_ZOOM) - 1)}
              style={{
                width: 32, height: 32, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 17, color: '#374151', fontWeight: 700
              }}
            >−</button>
          </div>
        </div>

        {/* Hint */}
        <div className="absolute bottom-3 left-3 z-20">
          <div className="bg-black/70 backdrop-blur-sm text-white/60 text-[10px] px-2.5 py-1 rounded-lg font-medium">
            Drag map to adjust pin
          </div>
        </div>
      </div>

      {/* Simplified Address Form */}
      <div className="overflow-y-auto flex-1 px-4 pt-3.5 pb-2" style={{ minHeight: 0 }}>
        {/* Detected Location Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-3.5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-[#FC8019] flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-[#FC8019]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-black text-[#FC8019] uppercase tracking-wider">
                Detected Location
              </span>
              {isGeocoding && (
                <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                  <Loader className="w-3 h-3 animate-spin text-[#FC8019]" />
                  Finding location...
                </span>
              )}
            </div>
            {displayTitle ? (
              <>
                <h4 className="text-[13px] sm:text-[14px] font-bold text-white leading-snug truncate">
                  {displayTitle}
                </h4>
                {displaySubtitle ? (
                  <p className="text-[11px] sm:text-[12px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                    {displaySubtitle}
                  </p>
                ) : null}
              </>
            ) : isGeocoding ? (
              <p className="text-[12px] text-zinc-400 animate-pulse">Finding location...</p>
            ) : selectedLocation.lat && selectedLocation.lng ? (
              <p className="text-[12px] text-zinc-300 font-mono">
                {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
              </p>
            ) : (
              <p className="text-[12px] text-zinc-400">Search or move map to pick location</p>
            )}
          </div>
        </div>

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
