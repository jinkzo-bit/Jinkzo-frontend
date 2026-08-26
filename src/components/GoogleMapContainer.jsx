import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Loader, Layers, Crosshair } from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { io } from 'socket.io-client';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../config/googleMapsLoader';
import { API_BASE } from '../config/api';
import MapRotationControls from './maps/MapRotationControls';

// ── Default fallback coords (Nandikotkur, AP) ───────────────────────────────────
const DEFAULT_CENTER = { lat: 15.8562, lng: 78.2700 };
const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');

// ── Map container style — Guaranteed full container expansion ────────────────
const MAP_CONTAINER_STYLE = { 
  width: '100%', 
  height: '100%', 
  minHeight: '380px',
  position: 'relative'
};

// ── Map base options (matching the proven working LocationPicker) ──────────────
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

// Store marker — Purple/indigo pin with store icon
const STORE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
  <filter id="sshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.28)" />
  </filter>
  <g filter="url(#sshadow)">
    <path d="M22 2C13.163 2 6 9.163 6 18c0 11.25 16 34 16 34s16-22.75 16-34C38 9.163 30.837 2 22 2z" fill="#7C3AED"/>
    <circle cx="22" cy="18" r="9" fill="white"/>
    <text x="22" y="23" text-anchor="middle" font-size="12" font-family="Arial">&#127978;</text>
  </g>
</svg>`;

// Grocery marker — Purple pin with cart
const GROCERY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
  <filter id="gshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.28)" />
  </filter>
  <g filter="url(#gshadow)">
    <path d="M22 2C13.163 2 6 9.163 6 18c0 11.25 16 34 16 34s16-22.75 16-34C38 9.163 30.837 2 22 2z" fill="#7C3AED"/>
    <circle cx="22" cy="18" r="9" fill="white"/>
    <text x="22" y="23" text-anchor="middle" font-size="12" font-family="Arial">&#127978;</text>
  </g>
</svg>`;

// Meat marker — Rose/Red pin with meat icon
const MEAT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
  <filter id="mshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.28)" />
  </filter>
  <g filter="url(#mshadow)">
    <path d="M22 2C13.163 2 6 9.163 6 18c0 11.25 16 34 16 34s16-22.75 16-34C38 9.163 30.837 2 22 2z" fill="#E11D48"/>
    <circle cx="22" cy="18" r="9" fill="white"/>
    <text x="22" y="23" text-anchor="middle" font-size="12" font-family="Arial">&#129385;</text>
  </g>
</svg>`;

// Bakery marker — Amber pin with croissant
const BAKERY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
  <filter id="bshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.28)" />
  </filter>
  <g filter="url(#bshadow)">
    <path d="M22 2C13.163 2 6 9.163 6 18c0 11.25 16 34 16 34s16-22.75 16-34C38 9.163 30.837 2 22 2z" fill="#D97706"/>
    <circle cx="22" cy="18" r="9" fill="white"/>
    <text x="22" y="23" text-anchor="middle" font-size="12" font-family="Arial">&#129360;</text>
  </g>
</svg>`;

// Veg & Fruits marker — Emerald pin with broccoli
const VEG_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
  <filter id="vshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.28)" />
  </filter>
  <g filter="url(#vshadow)">
    <path d="M22 2C13.163 2 6 9.163 6 18c0 11.25 16 34 16 34s16-22.75 16-34C38 9.163 30.837 2 22 2z" fill="#059669"/>
    <circle cx="22" cy="18" r="9" fill="white"/>
    <text x="22" y="23" text-anchor="middle" font-size="12" font-family="Arial">&#129382;</text>
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
  supplierDeliveries = [],
  pickupStops = [],
  routeSequence = [],
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
  
  // Multi-stop routes state
  const [routeSegments, setRouteSegments] = useState([]);
  const [multiRouteTotals, setMultiRouteTotals] = useState({ distanceKm: 0, durationMinutes: 0 });
  const lastMultiRouteCalcHashRef = useRef('');

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

  const storeIcon   = isLoaded ? svgToIcon(STORE_SVG, 44, 56, 22, 52) : undefined;
  const groceryIcon = isLoaded ? svgToIcon(GROCERY_SVG, 44, 56, 22, 52) : undefined;
  const meatIcon    = isLoaded ? svgToIcon(MEAT_SVG, 44, 56, 22, 52) : undefined;
  const bakeryIcon  = isLoaded ? svgToIcon(BAKERY_SVG, 44, 56, 22, 52) : undefined;
  const vegIcon     = isLoaded ? svgToIcon(VEG_SVG, 44, 56, 22, 52) : undefined;
  const riderIcon   = isLoaded ? svgToIcon(RIDER_SVG, 52, 52, 26, 26, riderBearing)  : undefined;
  const rideIcon    = isLoaded ? svgToIcon(RIDE_SVG, 52, 52, 26, 26, riderBearing)   : undefined;
  const pickerIcon  = isLoaded ? svgToIcon(PICKER_SVG, 40, 52, 20, 50) : undefined;

  const getStopIcon = useCallback((category = '', sourceType = 'supplier') => {
    const cat = (category || '').toLowerCase();
    if (sourceType === 'restaurant' || cat === 'food') return restaurantIcon;
    if (cat.includes('meat') || cat.includes('chicken') || cat.includes('mutton') || cat.includes('fish') || cat.includes('egg') || cat.includes('seafood')) return meatIcon || storeIcon;
    if (cat.includes('bakery') || cat.includes('cake') || cat.includes('sweet') || cat.includes('beverage') || cat.includes('cool')) return bakeryIcon || storeIcon;
    if (cat.includes('veg') || cat.includes('fruit') || cat.includes('vegetable')) return vegIcon || storeIcon;
    if (cat.includes('grocery') || cat.includes('kiranam') || cat.includes('supermarket') || cat.includes('atta') || cat.includes('oil')) return groceryIcon || storeIcon;
    return storeIcon;
  }, [restaurantIcon, meatIcon, bakeryIcon, vegIcon, groceryIcon, storeIcon]);

  // ── Helper: Trigger Map Resize on lifecycle & dimension events ───────────────
  const triggerMapResize = useCallback(() => {
    if (mapRef.current && window.google?.maps?.event) {
      window.google.maps.event.trigger(mapRef.current, 'resize');
    }
  }, []);

  // ── Map load callback ──────────────────────────────────────────────────────
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    setMapInstance(map);
    if (window.google) {
      trafficLayerRef.current = new window.google.maps.TrafficLayer();
    }
    setTimeout(() => {
      if (window.google?.maps?.event) {
        window.google.maps.event.trigger(map, 'resize');
      }
    }, 100);
  }, []);

  const onMapUnmount = useCallback(() => {
    if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
      trafficLayerRef.current = null;
    }
    mapRef.current = null;
    setMapInstance(null);
  }, []);

  // ── ResizeObserver on container ───────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          triggerMapResize();
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [triggerMapResize]);

  // ── Multi-stage resize trigger ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance) return;

    triggerMapResize();
    const t1 = setTimeout(triggerMapResize, 60);
    const t2 = setTimeout(triggerMapResize, 180);
    const t3 = setTimeout(triggerMapResize, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [mapInstance, orderId, triggerMapResize]);

  // ── Picker mode ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || mode !== 'picker') return;

    setRestaurantPos(null);
    setCustomerPos(null);
    setRiderPos(null);
    setRouteSegments([]);

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

  // ── Update Physical Markers (Independent Authoritative Coordinates) ─────────
  useEffect(() => {
    if (!isLoaded || mode !== 'tracking') return;

    // Primary restaurant / pickup point
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

    // Real Rider GPS
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

  // ── Normalize Multi-Source Pickup Stops ─────────────────────────────────────
  const { orderedStopsWithCoords, addressOnlyStops } = React.useMemo(() => {
    const valid = [];
    const noCoords = [];
    const seenIds = new Set();

    // 1. From pickupStops (most authoritative)
    if (Array.isArray(pickupStops) && pickupStops.length > 0) {
      pickupStops.forEach((stop, idx) => {
        const id = String(stop._id || stop.stopId || stop.sourceId || `stop_${idx}`);
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const lat = Number(stop.latitude ?? stop.lat);
        const lng = Number(stop.longitude ?? stop.lng);
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);

        const normalized = {
          id,
          sourceId: stop.sourceId || id,
          sourceType: stop.sourceType || 'supplier',
          type: stop.sourceType || 'supplier',
          name: stop.sourceName || stop.name || (stop.sourceType === 'restaurant' ? 'Restaurant' : 'Store'),
          category: (stop.category || (stop.sourceType === 'restaurant' ? 'food' : 'catalog')).toLowerCase(),
          address: stop.address || '',
          status: stop.status || 'Pending',
          distanceKm: stop.distanceKm ?? null,
          durationMinutes: stop.durationMinutes ?? null,
          lat: hasCoords ? lat : null,
          lng: hasCoords ? lng : null,
        };

        if (hasCoords) {
          valid.push(normalized);
        } else if (stop.address && stop.address.trim()) {
          noCoords.push(normalized);
        }
      });
    } else if (Array.isArray(routeSequence) && routeSequence.length > 0) {
      // 2. Fallback to routeSequence
      routeSequence.filter(s => s.type !== 'customer').forEach((stop, idx) => {
        const id = String(stop.supplierId || stop.restaurantId || `rs_${idx}`);
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const lat = Number(stop.latitude ?? stop.lat);
        const lng = Number(stop.longitude ?? stop.lng);
        const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);

        const normalized = {
          id,
          sourceId: id,
          sourceType: stop.type || 'supplier',
          type: stop.type || 'supplier',
          name: stop.name || 'Store',
          category: (stop.category || (stop.type === 'restaurant' ? 'food' : 'catalog')).toLowerCase(),
          address: stop.address || '',
          status: stop.status || 'Pending',
          lat: hasCoords ? lat : null,
          lng: hasCoords ? lng : null,
        };

        if (hasCoords) valid.push(normalized);
        else if (stop.address) noCoords.push(normalized);
      });
    } else {
      // 3. Fallback: restaurantPos + supplierDeliveries
      if (restaurantPos) {
        valid.push({
          id: 'restaurant_primary',
          sourceId: 'restaurant_primary',
          sourceType: 'restaurant',
          type: 'restaurant',
          name: restaurantName || 'Restaurant',
          category: 'food',
          address: restaurantAddress || '',
          status: status || 'Pending',
          lat: restaurantPos.lat,
          lng: restaurantPos.lng,
        });
      }
      if (Array.isArray(supplierDeliveries) && supplierDeliveries.length > 0) {
        supplierDeliveries.forEach((sup, idx) => {
          const lat = Number(sup.latitude ?? sup.lat);
          const lng = Number(sup.longitude ?? sup.lng);
          const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (lat !== 0 || lng !== 0);
          const normalized = {
            id: String(sup._id || sup.supplierId || `sup_${idx}`),
            sourceId: String(sup.supplierId || `sup_${idx}`),
            sourceType: 'supplier',
            type: 'supplier',
            name: sup.supplierName || 'Store',
            category: (sup.category || 'catalog').toLowerCase(),
            address: sup.address || '',
            status: 'Ready',
            distanceKm: sup.distanceKm ?? null,
            durationMinutes: sup.durationMinutes ?? null,
            lat: hasCoords ? lat : null,
            lng: hasCoords ? lng : null,
          };
          if (hasCoords) valid.push(normalized);
          else if (sup.address) noCoords.push(normalized);
        });
      }
    }

    return { orderedStopsWithCoords: valid, addressOnlyStops: noCoords };
  }, [pickupStops, routeSequence, restaurantPos, restaurantName, restaurantAddress, status, supplierDeliveries]);

  // ── Multi-Stop Road Routing Calculation ───────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || mode !== 'tracking') return;

    // Construct ordered waypoints:
    // [ Rider (if live GPS), ...orderedStopsWithCoords, Customer (if customerPos) ]
    const waypoints = [];
    if (riderPos) {
      waypoints.push({
        lat: riderPos.lat,
        lng: riderPos.lng,
        name: 'Rider',
        type: 'rider',
        sourceType: 'rider'
      });
    }

    orderedStopsWithCoords.forEach(st => {
      waypoints.push({
        lat: st.lat,
        lng: st.lng,
        name: st.name,
        type: st.type,
        sourceType: st.sourceType,
        category: st.category
      });
    });

    if (customerPos) {
      waypoints.push({
        lat: customerPos.lat,
        lng: customerPos.lng,
        name: customerName || 'Customer',
        type: 'customer',
        sourceType: 'customer'
      });
    }

    if (waypoints.length < 2) {
      setRouteSegments([]);
      setMultiRouteTotals({ distanceKm: 0, durationMinutes: 0 });
      return;
    }

    const calcHash = `${orderId}_${waypoints.map(w => `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`).join('|')}`;
    if (lastMultiRouteCalcHashRef.current === calcHash) {
      return;
    }
    lastMultiRouteCalcHashRef.current = calcHash;

    const fetchMultiRoutes = async () => {
      try {
        const res = await fetch(`${API_BASE}/maps/multi-stop-routes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ waypoints, travelMode: 'DRIVE' })
        });
        const data = await res.json();
        if (data.success && data.data && Array.isArray(data.data.segments)) {
          setRouteSegments(data.data.segments);
          setMultiRouteTotals({
            distanceKm: data.data.totalDistanceKm,
            durationMinutes: data.data.totalDurationMinutes
          });
          if (onRouteInfo) {
            onRouteInfo({
              segments: data.data.segments,
              totalDistanceKm: data.data.totalDistanceKm,
              totalDurationMinutes: data.data.totalDurationMinutes
            });
          }
        }
      } catch (err) {
        console.error('[GoogleMapContainer] Multi-stop routes fetch failed:', err);
      }
    };

    fetchMultiRoutes();
  }, [isLoaded, mode, riderPos, orderedStopsWithCoords, customerPos, customerName, orderId, onRouteInfo]);

  // ── Auto-fit Camera Bounds around all coordinate-valid points ───────────────
  useEffect(() => {
    if (!isLoaded || mode !== 'tracking' || !mapRef.current || !window.google) return;
    if (hasFitBoundsInitialRef.current && isUserInteractingRef.current) return;

    const bounds = new window.google.maps.LatLngBounds();
    let count = 0;

    orderedStopsWithCoords.forEach(stop => {
      if (stop.lat && stop.lng) {
        bounds.extend({ lat: stop.lat, lng: stop.lng });
        count++;
      }
    });

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
  }, [isLoaded, mode, orderId, orderedStopsWithCoords, customerPos, riderPos]);

  // ── Socket.IO Live location subscriber (for secondary GPS sync) ─────────────
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

  // ── Render: Error / Loading ────────────────────────────────────────────────
  if (loadError || error) {
    return (
      <div className="w-full h-full min-h-[380px] bg-red-50 flex items-center justify-center flex-col gap-2 rounded-2xl border border-red-100 text-red-500 p-4">
        <MapPin className="w-6 h-6" />
        <span className="text-xs font-bold text-center">{error || 'Failed to load Google Maps. Please check your network connection.'}</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[380px] bg-base flex items-center justify-center flex-col gap-2 rounded-2xl border border-line">
        <Loader className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs text-muted font-bold">Loading Map & Routes...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[380px] relative rounded-2xl overflow-hidden border border-line shadow-inner flex flex-col justify-between">
      <div ref={containerRef} className="w-full h-full min-h-[320px] relative flex-1">
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

          {/* ── TRACKING MODE: Multi-Stop Road Route Segments ── */}
          {mode === 'tracking' && routeSegments.map((seg, sIdx) => {
            if (!seg.polyline || seg.polyline.length < 2) return null;
            const isRiderLeg = seg.fromType === 'rider' || seg.fromName === 'Rider';
            const strokeColor = isRiderLeg ? '#1A73E8' : '#16A34A';

            return (
              <React.Fragment key={`seg_${sIdx}`}>
                <Polyline
                  path={seg.polyline}
                  options={{
                    strokeColor,
                    strokeOpacity: 0.25,
                    strokeWeight: 12,
                    geodesic: true,
                    zIndex: isRiderLeg ? 2 : 1
                  }}
                />
                <Polyline
                  path={seg.polyline}
                  options={{
                    strokeColor,
                    strokeOpacity: 1,
                    strokeWeight: 5,
                    geodesic: true,
                    zIndex: isRiderLeg ? 3 : 2
                  }}
                />
              </React.Fragment>
            );
          })}

          {/* ── TRACKING MODE: Pickup Stops (Restaurant + Suppliers) ── */}
          {mode === 'tracking' && orderedStopsWithCoords.map((stop, sIdx) => {
            const stopPos = { lat: stop.lat, lng: stop.lng };
            const popupKey = `stop_${stop.id || sIdx}`;
            const icon = getStopIcon(stop.category, stop.sourceType);
            const isRest = stop.sourceType === 'restaurant';

            return (
              <Marker
                key={stop.id || sIdx}
                position={stopPos}
                icon={icon}
                title={stop.name}
                zIndex={12 + sIdx}
                onClick={() => setActivePopup(activePopup === popupKey ? null : popupKey)}
              >
                {activePopup === popupKey && (
                  <InfoWindow onCloseClick={() => setActivePopup(null)}>
                    <div style={{
                      fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                      fontSize: '12px',
                      color: '#1a1a1a',
                      padding: '2px 4px',
                      maxWidth: '220px'
                    }}>
                      <div style={{ fontWeight: '800', color: isRest ? '#EA580C' : '#7C3AED' }}>
                        {isRest ? '🍽️ Restaurant' : `🏪 ${stop.category.toUpperCase()} STORE`}
                      </div>
                      <div style={{ fontWeight: '700', marginTop: '2px' }}>
                        {stop.name}
                      </div>
                      {stop.address && (
                        <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '2px' }}>
                          📍 {stop.address}
                        </div>
                      )}
                      <div style={{ fontSize: '10px', fontWeight: '700', marginTop: '3px', color: stop.status === 'Ready' || stop.status === 'Collected' ? '#16A34A' : '#D97706' }}>
                        Status: {stop.status}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            );
          })}

          {/* ── TRACKING MODE: Customer Marker ── */}
          {mode === 'tracking' && customerPos && (
            <Marker
              position={customerPos}
              icon={homeIcon}
              title={isRideOrder ? 'Drop Location' : (customerName || 'Customer Location')}
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
              onClick={() => mapRef.current && mapRef.current.setZoom((mapRef.current.getZoom() || 15) + 1)}
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
              onClick={() => mapRef.current && mapRef.current.setZoom((mapRef.current.getZoom() || 15) - 1)}
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

        {/* ── Map Rotation, Compass & 3D Tilt Controls ── */}
        <MapRotationControls
          map={mapInstance}
          mapRef={mapRef}
          containerRef={containerRef}
          position="bottom-right"
          showStepButtons={false}
          show3DTilt={true}
          className={mode === 'tracking' ? '!bottom-[195px] !right-3' : '!bottom-16 !right-3'}
        />

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
        <div className="bg-surface/95 backdrop-blur-md border-t border-line px-4 py-2.5 z-20 flex flex-col gap-2 shadow-sm text-xs font-semibold">
          {/* Segments Carousel / List */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
            {routeSegments.length > 0 ? (
              routeSegments.map((seg, idx) => {
                const isRiderLeg = seg.fromType === 'rider' || seg.fromName === 'Rider';
                return (
                  <div key={idx} className="flex items-center gap-1.5 flex-shrink-0 bg-base/80 px-2.5 py-1.5 rounded-xl border border-line">
                    <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${isRiderLeg ? 'bg-[#1A73E8]' : 'bg-[#16A34A]'}`} />
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-wider text-muted font-extrabold truncate max-w-[140px]">
                        {seg.fromName} → {seg.toName}
                      </span>
                      <span className="text-[10px] font-black text-main leading-tight">
                        {seg.distanceKm} km • {seg.durationMinutes} min
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-[10px] text-muted font-bold py-1">
                Calculating road route segments...
              </div>
            )}
          </div>

          {/* Route Totals & Address-only indicator */}
          <div className="flex items-center justify-between border-t border-line/60 pt-1 text-[11px]">
            <div className="flex items-center gap-2 text-muted font-bold flex-wrap">
              <span>{orderedStopsWithCoords.length} Pickup Stop{orderedStopsWithCoords.length !== 1 ? 's' : ''}</span>
              {addressOnlyStops.length > 0 && (
                <span className="text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                  📍 {addressOnlyStops.length} Address-only ({addressOnlyStops.map(s => s.name).join(', ')})
                </span>
              )}
            </div>
            <div className="font-black text-main flex-shrink-0">
              Total: {multiRouteTotals.distanceKm > 0 ? `${multiRouteTotals.distanceKm.toFixed(1)} km • ${multiRouteTotals.durationMinutes} min` : '--'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
