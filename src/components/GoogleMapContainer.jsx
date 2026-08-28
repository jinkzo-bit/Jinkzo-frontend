import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Loader, Layers, Crosshair } from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { io } from 'socket.io-client';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../config/googleMapsLoader';
import { API_BASE } from '../config/api';

// ── Default fallback coords (Nandikotkur, AP) ───────────────────────────────────
const DEFAULT_CENTER = { lat: 15.8562, lng: 78.2700 };
const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');

// ── Map container style ───────────────────────────────────────────────────────
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

// ── Map base options ──────────────────────────────────────────────────────────
const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  gestureHandling: 'greedy',
  rotateControl: false,
  cameraControl: false,
  tiltInteractionEnabled: false,
  headingInteractionEnabled: false,
  heading: 0,
  tilt: 0,
  minZoom: 3,
  maxZoom: 20,
  isFractionalZoomEnabled: true,
  mapTypeId: 'roadmap',
  ...(import.meta.env.VITE_GOOGLE_MAP_ID ? { mapId: import.meta.env.VITE_GOOGLE_MAP_ID } : {}),
};

// ── SVG marker builders ───────────────────────────────────────────────────────

// Restaurant marker — Orange pin with fork & knife
const RESTAURANT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
  <filter id="shadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.28)" />
  </filter>
  <g filter="url(#shadow)">
    <path d="M22 2C13.163 2 6 9.163 6 18c0 11.25 16 34 16 34s16-22.75 16-34C38 9.163 30.837 2 22 2z" fill="#FC8019"/>
    <circle cx="22" cy="18" r="9" fill="white"/>
    <text x="22" y="23" text-anchor="middle" font-size="12" font-family="Arial">&#127869;</text>
  </g>
</svg>`;

// Home / customer marker — Red pin with house
const HOME_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
  <filter id="shadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.28)" />
  </filter>
  <g filter="url(#shadow)">
    <path d="M22 2C13.163 2 6 9.163 6 18c0 11.25 16 34 16 34s16-22.75 16-34C38 9.163 30.837 2 22 2z" fill="#DC2626"/>
    <circle cx="22" cy="18" r="9" fill="white"/>
    <text x="22" y="23" text-anchor="middle" font-size="12" font-family="Arial">&#127968;</text>
  </g>
</svg>`;

// Rider / scooter marker — Green circular badge with motorcycle
const RIDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
  <filter id="rshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.32)" />
  </filter>
  <g filter="url(#rshadow)">
    <circle cx="26" cy="26" r="22" fill="#16A34A"/>
    <circle cx="26" cy="26" r="19" fill="#15803D"/>
    <circle cx="26" cy="26" r="15" fill="white"/>
    <text x="26" y="32" text-anchor="middle" font-size="16" font-family="Arial">&#127949;</text>
  </g>
</svg>`;

// Ride marker — Blue circle with vehicle
const RIDE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
  <filter id="cshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.32)" />
  </filter>
  <g filter="url(#cshadow)">
    <circle cx="26" cy="26" r="22" fill="#1E40AF"/>
    <circle cx="26" cy="26" r="20" fill="white"/>
    <text x="26" y="34" text-anchor="middle" font-size="22" font-family="Arial">&#127949;</text>
  </g>
</svg>`;

// Pickup point marker — Blue pin with person icon (for ride pickup)
const PICKUP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
  <filter id="pkshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.28)" />
  </filter>
  <g filter="url(#pkshadow)">
    <path d="M22 2C13.163 2 6 9.163 6 18c0 11.25 16 34 16 34s16-22.75 16-34C38 9.163 30.837 2 22 2z" fill="#2563eb"/>
    <circle cx="22" cy="18" r="9" fill="white"/>
    <text x="22" y="23" text-anchor="middle" font-size="12" font-family="Arial">&#128694;</text>
  </g>
</svg>`;

// Picker / location pin — brand color
const PICKER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
  <filter id="pshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.3)" />
  </filter>
  <g filter="url(#pshadow)">
    <path d="M20 2C11.163 2 4 9.163 4 18c0 11.25 16 32 16 32s16-20.75 16-32C36 9.163 28.837 2 20 2z" fill="#FC8019"/>
    <circle cx="20" cy="18" r="8" fill="white"/>
    <circle cx="20" cy="18" r="4" fill="#FC8019"/>
  </g>
</svg>`;

// Drop point marker — Checkered flag
const DROP_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
  <filter id="dpshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.28)" />
  </filter>
  <g filter="url(#dpshadow)">
    <path d="M22 2C13.163 2 6 9.163 6 18c0 11.25 16 34 16 34s16-22.75 16-34C38 9.163 30.837 2 22 2z" fill="#000000"/>
    <circle cx="22" cy="18" r="9" fill="white"/>
    <text x="22" y="23" text-anchor="middle" font-size="12" font-family="Arial">&#127937;</text>
  </g>
</svg>`;

// Convert SVG string to Google Maps icon object
const svgToIcon = (svgString, width, height, anchorX, anchorY, rotation = 0) => {
  let finalSvg = svgString;
  if (rotation !== 0) {
    finalSvg = svgString.replace('<g filter=', `<g transform="rotate(${rotation}, ${width/2}, ${height/2})" filter=`);
  }
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(finalSvg)}`,
    scaledSize: window.google ? new window.google.maps.Size(width, height) : { width, height },
    anchor: window.google ? new window.google.maps.Point(anchorX, anchorY) : { x: anchorX, y: anchorY },
  };
};

// ── Component ───────────────────────────────────────────────────────────────
export default function GoogleMapContainer({
  mode = 'tracking',        // 'tracking' | 'picker'
  restaurantName = '',
  restaurantAddress = '',
  restaurantLat = null,
  restaurantLng = null,
  customerName = '',
  customerAddress = '',
  customerLat = null,
  customerLng = null,
  status = '',
  progress = 0,
  onAddressSelect = null,
  initialAddress = null,
  deliveryMethod = 'Standard',
  orderId = null,
  onRouteInfo = null,
  // Ride-specific props (ride orders only; food orders leave these undefined/null)
  isRide = false,
  ridePickupLat = null,
  ridePickupLng = null,
  rideDropLat = null,
  rideDropLng = null,
  ridePickupAddress = '',
  rideDropAddress = '',
  riderLat = null,
  riderLng = null,
  gpsStatus = 'locating',   // 'live' | 'locating' | 'unavailable'
}) {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const trafficLayerRef = useRef(null);
  const isAutoFollowRef = useRef(true);
  const isUserInteractingRef = useRef(false);
  const previousRiderPosRef = useRef(null);
  const hasFitBoundsInitialRef = useRef(false);

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [pickerPos, setPickerPos] = useState(null);
  const [restaurantPos, setRestaurantPos] = useState(null);
  const [customerPos, setCustomerPos] = useState(null);
  const [riderPos, setRiderPos] = useState(null);
  
  // Dual routes state
  const [route1Path, setRoute1Path] = useState([]); // Rider -> Restaurant (Blue)
  const [route2Path, setRoute2Path] = useState([]); // Restaurant -> Customer (Green)
  const [route1Info, setRoute1Info] = useState({ distanceKm: null, durationMinutes: null });
  const [route2Info, setRoute2Info] = useState({ distanceKm: null, durationMinutes: null });

  const [activePopup, setActivePopup] = useState(null);
  const [error, setError] = useState(null);
  const [trafficOn, setTrafficOn] = useState(false);
  const [riderBearing, setRiderBearing] = useState(0);

  const isRideOrder = isRide || deliveryMethod === 'Ride';

  // ── Build SVG icons ────────────────────────────────────────────────────────
  const restaurantIcon = isLoaded 
    ? (isRideOrder ? svgToIcon(PICKUP_SVG, 44, 56, 22, 52) : svgToIcon(RESTAURANT_SVG, 44, 56, 22, 52))
    : undefined;
    
  const homeIcon = isLoaded
    ? (isRideOrder ? svgToIcon(DROP_SVG, 44, 56, 22, 52) : svgToIcon(HOME_SVG, 44, 56, 22, 52))
    : undefined;

  const riderIcon  = isLoaded ? svgToIcon(RIDER_SVG, 52, 52, 26, 26, riderBearing)  : undefined;
  const rideIcon   = isLoaded ? svgToIcon(RIDE_SVG, 52, 52, 26, 26, riderBearing)   : undefined;
  const pickerIcon = isLoaded ? svgToIcon(PICKER_SVG, 40, 52, 20, 50) : undefined;

  // ── ResizeObserver & Window Resize Handling ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current && window.google?.maps?.event) {
        window.google.maps.event.trigger(mapRef.current, 'resize');
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handleWindowResize = () => {
      if (mapRef.current && window.google?.maps?.event) {
        window.google.maps.event.trigger(mapRef.current, 'resize');
      }
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // ── Map load callback ──────────────────────────────────────────────────────
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapInstance(map);
    try {
      if (typeof map.setTilt === 'function') map.setTilt(0);
      if (typeof map.setHeading === 'function') map.setHeading(0);
    } catch (_) {}
    if (window.google) {
      trafficLayerRef.current = new window.google.maps.TrafficLayer();
      window.google.maps.event.trigger(map, 'resize');
      requestAnimationFrame(() => {
        if (mapRef.current && window.google?.maps?.event) {
          window.google.maps.event.trigger(mapRef.current, 'resize');
        }
      });
      setTimeout(() => {
        if (mapRef.current && window.google?.maps?.event) {
          window.google.maps.event.trigger(mapRef.current, 'resize');
        }
      }, 150);
    }
  }, []);

  const onMapUnmount = useCallback(() => {
    if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
      trafficLayerRef.current = null;
    }
    mapRef.current = null;
    setMapInstance(null);
  }, []);

  // ── Picker mode ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || mode !== 'picker') return;

    setRestaurantPos(null);
    setCustomerPos(null);
    setRiderPos(null);
    setRoute1Path([]);
    setRoute2Path([]);

    const placeOrMovePicker = (lat, lng) => {
      setPickerPos({ lat, lng });
      setMapCenter({ lat, lng });
    };

    if (initialAddress) {
      if (initialAddress.lat && initialAddress.lng) {
        placeOrMovePicker(initialAddress.lat, initialAddress.lng);
      } else {
        const addr = `${initialAddress.street}, ${initialAddress.city}, ${initialAddress.state} ${initialAddress.zip}`;
        fetch(`${API_BASE}/maps/geocode?address=${encodeURIComponent(addr)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              placeOrMovePicker(data.data.lat, data.data.lng);
            } else {
              placeOrMovePicker(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
            }
          })
          .catch(() => placeOrMovePicker(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng));
      }
    } else {
      placeOrMovePicker(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
    }
  }, [isLoaded, mode, initialAddress]);

  const handlePickerDragEnd = useCallback(async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPickerPos({ lat, lng });
    try {
      const res = await fetch(`${API_BASE}/maps/geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.success && onAddressSelect) onAddressSelect(data.data);
    } catch (err) {
      console.error('[GoogleMapContainer] Reverse geocode failed:', err);
    }
  }, [onAddressSelect]);

  const handlePickerMapClick = useCallback(async (e) => {
    if (mode !== 'picker') return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPickerPos({ lat, lng });
    try {
      const res = await fetch(`${API_BASE}/maps/geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      if (data.success && onAddressSelect) onAddressSelect(data.data);
    } catch (err) {
      console.error('[GoogleMapContainer] Reverse geocode failed:', err);
    }
  }, [mode, onAddressSelect]);

  // ── Traffic layer toggle ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!trafficLayerRef.current || !mapRef.current) return;
    if (trafficOn) {
      trafficLayerRef.current.setMap(mapRef.current);
    } else {
      trafficLayerRef.current.setMap(null);
    }
  }, [trafficOn]);

  // ── Update Physical Markers (Independent Coordinates) ──────────────────────
  useEffect(() => {
    if (!isLoaded || mode !== 'tracking') return;

    // Restaurant / Pickup point
    const rLat = isRideOrder ? (ridePickupLat ?? customerLat) : restaurantLat;
    const rLng = isRideOrder ? (ridePickupLng ?? customerLng) : restaurantLng;
    if (rLat != null && rLng != null && Number.isFinite(Number(rLat)) && Number(rLat) !== 0) {
      setRestaurantPos({ lat: Number(rLat), lng: Number(rLng) });
    } else {
      setRestaurantPos(null);
    }

    // Customer / Drop point
    const cLat = isRideOrder ? (rideDropLat ?? restaurantLat) : customerLat;
    const cLng = isRideOrder ? (rideDropLng ?? restaurantLng) : customerLng;
    if (cLat != null && cLng != null && Number.isFinite(Number(cLat)) && Number(cLat) !== 0) {
      setCustomerPos({ lat: Number(cLat), lng: Number(cLng) });
    } else {
      setCustomerPos(null);
    }

    // Real Rider GPS (NO fallback to restaurant or customer)
    if (riderLat != null && riderLng != null && Number.isFinite(Number(riderLat)) && Number(riderLat) !== 0) {
      const newPos = { lat: Number(riderLat), lng: Number(riderLng) };
      setRiderPos(newPos);

      // Bearing calculation
      if (previousRiderPosRef.current) {
        const oldPos = previousRiderPosRef.current;
        const dist = Math.hypot(newPos.lat - oldPos.lat, newPos.lng - oldPos.lng);
        if (dist > 0.00005) {
          const dy = newPos.lat - oldPos.lat;
          const dx = Math.cos(Math.PI / 180 * oldPos.lat) * (newPos.lng - oldPos.lng);
          const angle = Math.atan2(dx, dy) * 180 / Math.PI;
          setRiderBearing(angle);
        }
      }
      previousRiderPosRef.current = newPos;

      if (isAutoFollowRef.current && mapRef.current && !isUserInteractingRef.current) {
        mapRef.current.panTo(newPos);
      }
    }
  }, [isLoaded, mode, restaurantLat, restaurantLng, customerLat, customerLng, ridePickupLat, ridePickupLng, rideDropLat, rideDropLng, riderLat, riderLng, isRideOrder]);

  // ── Auto-fit Camera on Mount or Order Change ───────────────────────────────
  useEffect(() => {
    if (!isLoaded || mode !== 'tracking' || !mapRef.current || !window.google) return;
    if (hasFitBoundsInitialRef.current && isUserInteractingRef.current) return;

    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;

    if (restaurantPos) {
      bounds.extend(restaurantPos);
      count++;
    }
    if (customerPos) {
      bounds.extend(customerPos);
      count++;
    }
    if (riderPos) {
      bounds.extend(riderPos);
      count++;
    }

    if (count > 0) {
      mapRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 85, left: 50 });
      window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
        if (mapRef.current && mapRef.current.getZoom() > 17) {
          mapRef.current.setZoom(17);
        }
      });
      hasFitBoundsInitialRef.current = true;
    }
  }, [isLoaded, mode, orderId, restaurantPos, customerPos]);

  // ── Route 1: Dynamic Road Route (Rider GPS -> Restaurant/Pickup) ─────────────
  const lastRoute1CalcRef = useRef({ lat: null, lng: null, orderId: null });

  useEffect(() => {
    if (!isLoaded || mode !== 'tracking') return;
    if (!riderPos || !restaurantPos) {
      setRoute1Path([]);
      setRoute1Info({ distanceKm: null, durationMinutes: null });
      return;
    }

    const distFromLastCalc = lastRoute1CalcRef.current.lat 
      ? Math.hypot(riderPos.lat - lastRoute1CalcRef.current.lat, riderPos.lng - lastRoute1CalcRef.current.lng) * 111000
      : 999999;

    const orderChanged = lastRoute1CalcRef.current.orderId !== orderId;

    // Throttle: only recalculate Route 1 if rider moved > 100 meters or on order change
    if (!orderChanged && distFromLastCalc < 100) {
      return;
    }

    lastRoute1CalcRef.current = { lat: riderPos.lat, lng: riderPos.lng, orderId };

    const fetchRoute1 = async () => {
      try {
        const res = await fetch(`${API_BASE}/maps/routes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: riderPos, destination: restaurantPos, travelMode: 'DRIVE' }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setRoute1Path(data.data.polyline || [riderPos, restaurantPos]);
          setRoute1Info({ distanceKm: data.data.distanceKm, durationMinutes: data.data.durationMinutes });
          if (onRouteInfo) onRouteInfo({ route1: data.data });
        } else {
          setRoute1Path([riderPos, restaurantPos]);
        }
      } catch (err) {
        console.error('[GoogleMapContainer] Route 1 fetch failed:', err);
        setRoute1Path([riderPos, restaurantPos]);
      }
    };

    fetchRoute1();
  }, [isLoaded, mode, riderPos, restaurantPos, orderId, onRouteInfo]);

  // ── Route 2: Static Road Route (Restaurant/Pickup -> Customer/Drop) ─────────
  const lastRoute2CalcRef = useRef({ restLat: null, custLat: null, orderId: null });

  useEffect(() => {
    if (!isLoaded || mode !== 'tracking') return;
    if (!restaurantPos || !customerPos) {
      setRoute2Path([]);
      setRoute2Info({ distanceKm: null, durationMinutes: null });
      return;
    }

    const isSameCoords = 
      lastRoute2CalcRef.current.restLat === restaurantPos.lat &&
      lastRoute2CalcRef.current.custLat === customerPos.lat &&
      lastRoute2CalcRef.current.orderId === orderId;

    if (isSameCoords) return;

    lastRoute2CalcRef.current = {
      restLat: restaurantPos.lat,
      restLng: restaurantPos.lng,
      custLat: customerPos.lat,
      custLng: customerPos.lng,
      orderId
    };

    const fetchRoute2 = async () => {
      try {
        const res = await fetch(`${API_BASE}/maps/routes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: restaurantPos, destination: customerPos, travelMode: 'DRIVE' }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setRoute2Path(data.data.polyline || [restaurantPos, customerPos]);
          setRoute2Info({ distanceKm: data.data.distanceKm, durationMinutes: data.data.durationMinutes });
          if (onRouteInfo) onRouteInfo({ route2: data.data });
        } else {
          setRoute2Path([restaurantPos, customerPos]);
        }
      } catch (err) {
        console.error('[GoogleMapContainer] Route 2 fetch failed:', err);
        setRoute2Path([restaurantPos, customerPos]);
      }
    };

    fetchRoute2();
  }, [isLoaded, mode, restaurantPos, customerPos, orderId, onRouteInfo]);

  // ── Socket.IO Live location subscriber (for secondary sync) ────────────────
  useEffect(() => {
    if (!isLoaded || !orderId || mode !== 'tracking') return;

    const token = sessionStorage.getItem('qb-auth-token');
    const socket = io(socketHost, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.emit('joinOrder', orderId);

    socket.on('locationUpdated', ({ lat, lng, heading }) => {
      if (lat != null && lng != null && Number.isFinite(Number(lat)) && Number(lat) !== 0) {
        const newPos = { lat: Number(lat), lng: Number(lng) };
        setRiderPos(newPos);
        if (heading != null && !isNaN(heading)) setRiderBearing(heading);
        if (isAutoFollowRef.current && mapRef.current && !isUserInteractingRef.current) {
          mapRef.current.panTo(newPos);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isLoaded, orderId, mode]);

  // ── Polyline Options ───────────────────────────────────────────────────────
  // Route 1 (Rider -> Restaurant) — Blue (#1A73E8)
  const route1GlowOptions = {
    strokeColor: '#1A73E8',
    strokeOpacity: 0.25,
    strokeWeight: 12,
    geodesic: true,
    zIndex: 2,
  };
  const route1MainOptions = {
    strokeColor: '#1A73E8',
    strokeOpacity: 1,
    strokeWeight: 5,
    geodesic: true,
    zIndex: 3,
  };

  // Route 2 (Restaurant -> Customer) — Green (#16A34A)
  const route2GlowOptions = {
    strokeColor: '#16A34A',
    strokeOpacity: 0.25,
    strokeWeight: 12,
    geodesic: true,
    zIndex: 1,
  };
  const route2MainOptions = {
    strokeColor: '#16A34A',
    strokeOpacity: 1,
    strokeWeight: 5,
    geodesic: true,
    zIndex: 2,
  };

  // Compute Total Distance & ETA
  const totalDistanceKm = (route1Info.distanceKm || 0) + (route2Info.distanceKm || 0);
  const totalDurationMinutes = (route1Info.durationMinutes || 0) + (route2Info.durationMinutes || 0);

  // ── Render: Error / Loading ────────────────────────────────────────────────
  if (loadError || error) {
    return (
      <div className="w-full h-full min-h-[280px] bg-red-50 flex items-center justify-center flex-col gap-2 rounded-2xl border border-red-100 text-red-500 p-4">
        <MapPin className="w-6 h-6" />
        <span className="text-xs font-bold text-center">{error || 'Failed to load Google Maps.'}</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[280px] bg-base flex items-center justify-center flex-col gap-2 rounded-2xl border border-line">
        <Loader className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs text-muted font-bold">Loading Map & Routes...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-line shadow-inner flex flex-col justify-between">
      <div ref={containerRef} className="w-full h-full relative flex-1">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={mapCenter}
          zoom={15}
          options={MAP_OPTIONS}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          onClick={mode === 'picker' ? handlePickerMapClick : undefined}
          onDragStart={() => {
            if (mode === 'tracking') {
              isAutoFollowRef.current = false;
              isUserInteractingRef.current = true;
            }
          }}
          onZoomChanged={() => {
            if (mode === 'tracking' && mapRef.current && mapRef.current.getBounds()) {
              isAutoFollowRef.current = false;
              isUserInteractingRef.current = true;
            }
          }}
        >
          {/* ── PICKER MODE MARKER ── */}
          {mode === 'picker' && pickerPos && (
            <Marker
              position={pickerPos}
              draggable={true}
              onDragEnd={handlePickerDragEnd}
              icon={pickerIcon}
            />
          )}

          {/* ── TRACKING MODE: Route 1 (Rider -> Restaurant in Blue) ── */}
          {mode === 'tracking' && route1Path.length > 1 && (
            <>
              <Polyline path={route1Path} options={route1GlowOptions} />
              <Polyline path={route1Path} options={route1MainOptions} />
            </>
          )}

          {/* ── TRACKING MODE: Route 2 (Restaurant -> Customer in Green) ── */}
          {mode === 'tracking' && route2Path.length > 1 && (
            <>
              <Polyline path={route2Path} options={route2GlowOptions} />
              <Polyline path={route2Path} options={route2MainOptions} />
            </>
          )}

          {/* ── TRACKING MODE: Restaurant Marker ── */}
          {mode === 'tracking' && restaurantPos && (
            <Marker
              position={restaurantPos}
              icon={restaurantIcon}
              title={isRideOrder ? 'Pickup Point' : 'Restaurant Location'}
              zIndex={10}
              onClick={() => setActivePopup(activePopup === 'restaurant' ? null : 'restaurant')}
            >
              {activePopup === 'restaurant' && (
                <InfoWindow onCloseClick={() => setActivePopup(null)}>
                  <div style={{
                    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                    fontSize: '12px',
                    color: '#1a1a1a',
                    padding: '2px 4px',
                  }}>
                    <div style={{ fontWeight: '800', color: '#EA580C' }}>
                      {isRideOrder ? '📍 Pickup Point' : '🍽️ Restaurant Location'}
                    </div>
                    <div style={{ fontWeight: '600', marginTop: '2px' }}>
                      {restaurantName || (isRideOrder ? 'Pickup Location' : 'Restaurant')}
                    </div>
                    {route1Info.durationMinutes != null && (
                      <div style={{ fontSize: '11px', color: '#1A73E8', fontWeight: '700', marginTop: '2px' }}>
                        ETA: {route1Info.durationMinutes} min ({route1Info.distanceKm} km)
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Marker>
          )}

          {/* ── TRACKING MODE: Customer Marker ── */}
          {mode === 'tracking' && customerPos && (
            <Marker
              position={customerPos}
              icon={homeIcon}
              title={isRideOrder ? 'Drop Location' : 'Customer Location'}
              zIndex={10}
              onClick={() => setActivePopup(activePopup === 'customer' ? null : 'customer')}
            >
              {activePopup === 'customer' && (
                <InfoWindow onCloseClick={() => setActivePopup(null)}>
                  <div style={{
                    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                    fontSize: '12px',
                    color: '#1a1a1a',
                    padding: '2px 4px',
                  }}>
                    <div style={{ fontWeight: '800', color: '#DC2626' }}>
                      {isRideOrder ? '🏁 Drop Location' : '🏠 Customer Location'}
                    </div>
                    <div style={{ fontWeight: '600', marginTop: '2px', maxWidth: '200px' }}>
                      {customerAddress || customerName || 'Delivery Address'}
                    </div>
                    {route2Info.durationMinutes != null && (
                      <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '700', marginTop: '2px' }}>
                        ETA: {route2Info.durationMinutes} min ({route2Info.distanceKm} km)
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Marker>
          )}

          {/* ── TRACKING MODE: Rider Marker (Real GPS Only) ── */}
          {mode === 'tracking' && riderPos && (
            <Marker
              position={riderPos}
              icon={isRideOrder ? rideIcon : riderIcon}
              title="Rider Location"
              zIndex={25}
              onClick={() => setActivePopup(activePopup === 'rider' ? null : 'rider')}
            >
              {activePopup === 'rider' && (
                <InfoWindow onCloseClick={() => setActivePopup(null)}>
                  <div style={{
                    fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                    fontSize: '12px',
                    color: '#1a1a1a',
                    padding: '2px 4px',
                  }}>
                    <div style={{ fontWeight: '800', color: '#16A34A' }}>
                      🛵 Rider Location
                    </div>
                    <div style={{ fontSize: '11px', color: '#4B5563', fontWeight: '700', marginTop: '2px' }}>
                      ● Live GPS Active
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          )}
        </GoogleMap>

        {/* ── Top-Right: Traffic Toggle Button ── */}
        {mode === 'tracking' && (
          <button
            onClick={() => setTrafficOn(prev => !prev)}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 20,
              background: trafficOn ? '#FC8019' : 'rgba(255, 255, 255, 0.95)',
              color: trafficOn ? '#FFFFFF' : '#374151',
              border: '1px solid rgba(229, 231, 235, 0.8)',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              backdropFilter: 'blur(4px)',
              transition: 'all 0.15s ease',
              userSelect: 'none',
            }}
            title="Toggle traffic layer"
          >
            <Layers style={{ width: 14, height: 14 }} />
            Traffic
          </button>
        )}

        {/* ── Right-Side: Map Controls (+, -, Follow Rider) ── */}
        {mode === 'tracking' && (
          <div style={{
            position: 'absolute',
            bottom: 72,
            right: 12,
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            {/* Zoom In */}
            <button
              onClick={() => {
                if (mapRef.current) {
                  const z = mapRef.current.getZoom() || 15;
                  mapRef.current.setZoom(Math.min(z + 1, 20));
                }
              }}
              style={{
                width: 34,
                height: 34,
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                borderRadius: 8,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 18,
                color: '#374151',
                fontWeight: 800,
                userSelect: 'none',
              }}
              title="Zoom in"
            >+</button>

            {/* Zoom Out */}
            <button
              onClick={() => {
                if (mapRef.current) {
                  const z = mapRef.current.getZoom() || 15;
                  mapRef.current.setZoom(Math.max(z - 1, 3));
                }
              }}
              style={{
                width: 34,
                height: 34,
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                borderRadius: 8,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 18,
                color: '#374151',
                fontWeight: 800,
                userSelect: 'none',
              }}
              title="Zoom out"
            >−</button>

            {/* Center on Rider / Follow Rider */}
            <button
              onClick={() => {
                isAutoFollowRef.current = true;
                isUserInteractingRef.current = false;
                if (riderPos && mapRef.current) {
                  mapRef.current.panTo(riderPos);
                  mapRef.current.setZoom(16);
                }
              }}
              style={{
                width: 34,
                height: 34,
                background: isAutoFollowRef.current && !isUserInteractingRef.current ? '#16A34A' : 'rgba(255, 255, 255, 0.95)',
                color: isAutoFollowRef.current && !isUserInteractingRef.current ? '#FFFFFF' : '#374151',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                borderRadius: 8,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              title="Follow Rider / Center on live position"
            >
              <Crosshair style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}

        {/* ── Top-Left: Live GPS Status Badge ── */}
        {mode === 'tracking' && (
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 20,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(229, 231, 235, 0.8)',
            borderRadius: 20,
            padding: '5px 12px',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            {gpsStatus === 'live' && riderPos ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-800">Rider Position: <span className="text-green-600 font-extrabold">Live</span></span>
              </>
            ) : gpsStatus === 'locating' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-gray-800">Rider Position: <span className="text-amber-600 font-extrabold">Locating...</span></span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-800">Rider Position: <span className="text-red-500 font-extrabold">Location unavailable</span></span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Route Info Summary Bar ── */}
      {mode === 'tracking' && (
        <div className="bg-surface/95 backdrop-blur-md border-t border-line px-4 py-2.5 z-20 flex items-center justify-between shadow-sm text-xs font-semibold">
          {/* Leg 1: Rider -> Restaurant */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 bg-[#1A73E8] rounded-full inline-block flex-shrink-0" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted font-bold">
                {isRideOrder ? 'Rider → Pickup' : 'Rider → Restaurant'}
              </div>
              <div className="text-[11px] font-black text-main leading-tight">
                {route1Info.distanceKm != null ? `${route1Info.distanceKm} km • ${route1Info.durationMinutes} min` : (riderPos ? 'Calculating...' : 'GPS Pending')}
              </div>
            </div>
          </div>

          {/* Leg 2: Restaurant -> Customer */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1.5 bg-[#16A34A] rounded-full inline-block flex-shrink-0" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-muted font-bold">
                {isRideOrder ? 'Pickup → Drop' : 'Restaurant → Customer'}
              </div>
              <div className="text-[11px] font-black text-main leading-tight">
                {route2Info.distanceKm != null ? `${route2Info.distanceKm} km • ${route2Info.durationMinutes} min` : 'Calculating...'}
              </div>
            </div>
          </div>

          {/* Total Distance & Total ETA */}
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted font-bold text-right">
              Total Distance
            </div>
            <div className="text-[11px] font-black text-main leading-tight text-right">
              {totalDistanceKm > 0 ? `${totalDistanceKm.toFixed(1)} km • ${totalDurationMinutes} min` : '--'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
