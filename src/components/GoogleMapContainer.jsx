import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Loader, Layers } from 'lucide-react';
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
// ── Swiggy/Zomato style clean map — minimal, light, food-delivery feel ────────
const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  gestureHandling: 'greedy',
  rotateControl: true,
  mapTypeId: 'roadmap',
  mapId: import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID',
};

// ── SVG marker builders (Swiggy/Zomato style pin markers) ────────────────────

// Restaurant marker — orange pin with fork & knife
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

// Home / customer marker — green pin with house
const HOME_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56" viewBox="0 0 44 56">
  <filter id="shadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.28)" />
  </filter>
  <g filter="url(#shadow)">
    <path d="M22 2C13.163 2 6 9.163 6 18c0 11.25 16 34 16 34s16-22.75 16-34C38 9.163 30.837 2 22 2z" fill="#3d9b2a"/>
    <circle cx="22" cy="18" r="9" fill="white"/>
    <text x="22" y="23" text-anchor="middle" font-size="12" font-family="Arial">&#127968;</text>
  </g>
</svg>`;

// Rider / scooter marker — red circle
const RIDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
  <filter id="rshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.32)" />
  </filter>
  <g filter="url(#rshadow)">
    <circle cx="26" cy="26" r="22" fill="#18181b"/>
    <circle cx="26" cy="26" r="20" fill="white"/>
    <text x="26" y="34" text-anchor="middle" font-size="22" font-family="Arial">&#127949;</text>
  </g>
</svg>`;

// Ride marker — blue circle with car
const RIDE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
  <filter id="cshadow" x="-30%" y="-10%" width="160%" height="140%">
    <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="rgba(0,0,0,0.32)" />
  </filter>
  <g filter="url(#cshadow)">
    <circle cx="26" cy="26" r="22" fill="#1e40af"/>
    <circle cx="26" cy="26" r="20" fill="white"/>
    <text x="26" y="34" text-anchor="middle" font-size="22" font-family="Arial">&#127949;</text>
  </g>
</svg>`;

// Pickup point marker — blue pin with person icon (for ride pickup location)
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

// Drop point marker — checkered flag
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
  restaurantAddress = '',
  restaurantLat = null,
  restaurantLng = null,
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
  showTraffic = false,      // traffic layer toggle
  // Ride-specific props (ride orders only; food orders leave these undefined/null)
  isRide = false,
  ridePickupLat = null,
  ridePickupLng = null,
  rideDropLat = null,
  rideDropLng = null,
  riderLat = null,
  riderLng = null,
}) {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  const mapRef = useRef(null);
  const routePointsRef = useRef([]);
  const trafficLayerRef = useRef(null);
  const hasLiveGPS = useRef(false);

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [pickerPos, setPickerPos] = useState(null);
  const [restaurantPos, setRestaurantPos] = useState(null);
  const [customerPos, setCustomerPos] = useState(null);
  const [riderPos, setRiderPos] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [activePopup, setActivePopup] = useState(null);
  const [error, setError] = useState(null);
  const [trafficOn, setTrafficOn] = useState(false);
  const [riderBearing, setRiderBearing] = useState(0);
  const [showFollowButton, setShowFollowButton] = useState(false);
  
  const isAutoFollowRef = useRef(true);
  const animationFrameRef = useRef(null);
  const previousRiderPosRef = useRef(null);

  // ── Build SVG icon objects once Maps API is loaded ─────────────────────────
  const isRideOrder = isRide || deliveryMethod === 'Ride';

  // isBeforePickup: determines whether the route target is the origin (restaurant/pickup)
  // Food: before pickup = Rider_Assigned, Rider_Accepted, Rider_At_Restaurant
  // Ride: before pickup = Rider_Assigned, Rider_Accepted (Rider_At_Restaurant is food-only)
  const isBeforePickup = isRideOrder
    ? ['Rider_Assigned', 'Rider_Accepted'].includes(status)
    : ['Placed', 'Accepted', 'Confirmed', 'Preparing', 'Ready_for_Pickup', 'Rider_Assigned', 'Rider_Accepted', 'Rider_At_Restaurant'].includes(status);

  // We don't render an origin icon because the rider marker will cover it
  const restaurantIcon = isLoaded ? { path: 'M0,0' } : undefined;
  // Destination icon:
  //   Food — swaps between restaurant pin (before pickup) and home pin (after pickup)
  //   Ride — swaps between pickup pin (blue person, phase 1) and home/drop pin (phase 2)
  const homeIcon = isLoaded
    ? (isRideOrder
        ? (isBeforePickup
            ? svgToIcon(PICKUP_SVG, 44, 56, 22, 52)   // ride phase 1: show pickup point
            : svgToIcon(DROP_SVG,   44, 56, 22, 52))  // ride phase 2: show destination
        : (isBeforePickup
            ? svgToIcon(RESTAURANT_SVG, 44, 56, 22, 52)  // food before pickup: restaurant
            : svgToIcon(HOME_SVG,       44, 56, 22, 52))) // food after pickup: home
    : undefined;

  const riderIcon      = isLoaded ? svgToIcon(RIDER_SVG, 52, 52, 26, 26, riderBearing)      : undefined;
  const rideIcon       = isLoaded ? svgToIcon(RIDE_SVG, 52, 52, 26, 26, riderBearing)       : undefined;
  const pickerIcon     = isLoaded ? svgToIcon(PICKER_SVG, 40, 52, 20, 50)     : undefined;

  // ── Map load callback ──────────────────────────────────────────────────────
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (window.google) {
      trafficLayerRef.current = new window.google.maps.TrafficLayer();
    }
  }, []);

  const onMapUnmount = useCallback(() => {
    if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
      trafficLayerRef.current = null;
    }
    mapRef.current = null;
  }, []);

  // ── Picker mode ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || mode !== 'picker') return;

    setRestaurantPos(null);
    setCustomerPos(null);
    setRiderPos(null);
    setRoutePath([]);

    const placeOrMovePicker = (lat, lng) => {
      setPickerPos({ lat, lng });
      setMapCenter({ lat, lng });
    };

    // Geocode initial address or use default
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

  // ── Picker — handle marker drag ────────────────────────────────────────────
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

  // ── Picker — handle map click ──────────────────────────────────────────────
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

  // ── Tracking mode ─────────────────────────────────────────────────────────
  const lastRouteCalcRef = useRef({ lat: null, lng: null, isBeforePickup: null, orderId: null });
  const isUserInteractingRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || mode !== 'tracking') return;

    // Clear picker state
    setPickerPos(null);

    const drawRoute = async () => {
      let restPos, custPos;
      const currentLivePos = (riderLat != null && riderLng != null) ? { lat: riderLat, lng: riderLng } : riderPos;
      
      if (isRideOrder && ridePickupLat != null && ridePickupLng != null && rideDropLat != null && rideDropLng != null) {
        if (isBeforePickup) {
          if (currentLivePos) {
            restPos = currentLivePos;
            custPos = { lat: ridePickupLat, lng: ridePickupLng };
          } else {
            // Safe fallback if GPS is missing: show full route
            restPos = { lat: ridePickupLat, lng: ridePickupLng };
            custPos = { lat: rideDropLat,   lng: rideDropLng   };
          }
        } else {
          restPos = currentLivePos || { lat: ridePickupLat, lng: ridePickupLng };
          custPos = { lat: rideDropLat,   lng: rideDropLng   };
        }
      } else {
        if (restaurantLat && restaurantLng && customerLat && customerLng) {
          if (isBeforePickup) {
            if (currentLivePos) {
              restPos = currentLivePos;
              custPos = { lat: restaurantLat, lng: restaurantLng };
            } else {
              restPos = { lat: restaurantLat, lng: restaurantLng };
              custPos = { lat: customerLat, lng: customerLng };
            }
          } else {
            restPos = currentLivePos || { lat: restaurantLat, lng: restaurantLng };
            custPos = { lat: customerLat, lng: customerLng };
          }
        } else {
          restPos = null;
          custPos = null;
        }
      }

      if (!restPos || !custPos) return;

      let restLatLng = { lat: restPos.lat, lng: restPos.lng };
      let custLatLng = { lat: custPos.lat, lng: custPos.lng };

      // Throttle route calculation (only calc if phase changed, order changed, or moved > 150m)
      const distFromLastCalc = lastRouteCalcRef.current.lat 
        ? Math.hypot(restLatLng.lat - lastRouteCalcRef.current.lat, restLatLng.lng - lastRouteCalcRef.current.lng) * 111000 // approx meters
        : 999999;
      
      const phaseChanged = lastRouteCalcRef.current.isBeforePickup !== isBeforePickup;
      const orderChanged = lastRouteCalcRef.current.orderId !== orderId;

      if (!orderChanged && !phaseChanged && distFromLastCalc < 150) {
        // Just update markers without hitting backend or resetting camera
        setRestaurantPos(restLatLng);
        setCustomerPos(custLatLng);
        return; 
      }

      lastRouteCalcRef.current = { lat: restLatLng.lat, lng: restLatLng.lng, isBeforePickup, orderId };
      setRestaurantPos(restLatLng);
      setCustomerPos(custLatLng);

      try {
        const res = await fetch(`${API_BASE}/maps/routes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: restLatLng, destination: custLatLng, travelMode: 'DRIVE' }),
        });
        const data = await res.json();
        let routePoints = [];
        if (data.success && data.data) {
          routePoints = data.data.polyline || [restLatLng, custLatLng];
          if (onRouteInfo) onRouteInfo({ distanceKm: data.data.distanceKm, durationMinutes: data.data.durationMinutes });
        } else {
          routePoints = [restLatLng, custLatLng];
        }
        routePointsRef.current = routePoints;
        setRoutePath(routePoints);
      } catch (err) {
        console.error('[GoogleMapContainer] Route fetch failed:', err);
        const fallbackPoints = [restLatLng, custLatLng];
        routePointsRef.current = fallbackPoints;
        setRoutePath(fallbackPoints);
      }

      // ONLY fitBounds if it's a new phase/order or if the user is auto-following
      if (mapRef.current && window.google && (!isUserInteractingRef.current || phaseChanged || orderChanged)) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(restLatLng);
        bounds.extend(custLatLng);
        mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
        
        window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
          if (mapRef.current.getZoom() > 17) {
            mapRef.current.setZoom(17);
          }
        });
      }
    };

    drawRoute();
  }, [isLoaded, mode, restaurantLat, restaurantLng, customerLat, customerLng, restaurantAddress, customerAddress, isRideOrder, ridePickupLat, ridePickupLng, rideDropLat, rideDropLng, status, riderLat, riderLng, orderId, isBeforePickup]);

  // ── Socket.IO Live Driver GPS tracking listener ────────────────────────────
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
      console.log('[SOCKET] Rider coordinate update:', lat, lng, 'heading:', heading);
      hasLiveGPS.current = true;
      const newPos = { lat, lng };

      if (heading !== null && heading !== undefined && !isNaN(heading)) {
        setRiderBearing(heading);
      }

      if (previousRiderPosRef.current) {
        const oldPos = previousRiderPosRef.current;
        const dist = Math.hypot(newPos.lat - oldPos.lat, newPos.lng - oldPos.lng);
        
        // Calculate bearing only if movement is meaningful and no valid hardware heading is provided
        if (dist > 0.0001 && (heading === null || heading === undefined || isNaN(heading))) {
          const dy = newPos.lat - oldPos.lat;
          const dx = Math.cos(Math.PI / 180 * oldPos.lat) * (newPos.lng - oldPos.lng);
          const angle = Math.atan2(dx, dy) * 180 / Math.PI;
          setRiderBearing(angle);
        }

        const startTime = performance.now();
        const duration = 1000;
        
        const animate = (time) => {
          let elapsed = time - startTime;
          let progress = Math.min(elapsed / duration, 1);
          progress = 1 - Math.pow(1 - progress, 3); // ease-out cubic

          const currentLat = oldPos.lat + (newPos.lat - oldPos.lat) * progress;
          const currentLng = oldPos.lng + (newPos.lng - oldPos.lng) * progress;
          setRiderPos({ lat: currentLat, lng: currentLng });

          if (isAutoFollowRef.current && ['Out for Delivery', 'Out_for_Delivery', 'Rider_Accepted', 'Rider_At_Pickup', 'Picked_Up'].includes(status) && mapRef.current) {
             mapRef.current.panTo({ lat: currentLat, lng: currentLng });
          }

          if (progress < 1) {
             animationFrameRef.current = requestAnimationFrame(animate);
          } else {
             previousRiderPosRef.current = newPos;
          }
        };

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setRiderPos(newPos);
        previousRiderPosRef.current = newPos;
        if (isAutoFollowRef.current && ['Out for Delivery', 'Out_for_Delivery', 'Rider_Accepted', 'Rider_At_Pickup', 'Picked_Up'].includes(status) && mapRef.current) {
          mapRef.current.panTo(newPos);
        }
      }
    });

    return () => {
      hasLiveGPS.current = false;
      socket.disconnect();
    };
  }, [isLoaded, orderId, mode, status]);

  // ── Update simulated rider position when progress changes ──────────────────
  useEffect(() => {
    if (mode !== 'tracking') return;
    const points = routePointsRef.current;
    if (!points || points.length < 2) return;

    // Interpolate position along the route (simulated rider fallback if no live GPS)
    const totalSegments = points.length - 1;
    const rawIndex = progress * totalSegments;
    const segIndex = Math.min(Math.floor(rawIndex), totalSegments - 1);
    const segProgress = rawIndex - segIndex;

    const p1 = points[segIndex];
    const p2 = points[Math.min(segIndex + 1, totalSegments)];

    const lat1 = typeof p1.lat === 'function' ? p1.lat() : p1.lat;
    const lng1 = typeof p1.lng === 'function' ? p1.lng() : p1.lng;
    const lat2 = typeof p2.lat === 'function' ? p2.lat() : p2.lat;
    const lng2 = typeof p2.lng === 'function' ? p2.lng() : p2.lng;

    const lat = lat1 + (lat2 - lat1) * segProgress;
    const lng = lng1 + (lng2 - lng1) * segProgress;

    if (!hasLiveGPS.current) {
      setRiderPos({ lat, lng });

      if (['Out for Delivery', 'Out_for_Delivery', 'Rider_Accepted', 'Rider_At_Pickup', 'Picked_Up'].includes(status) && mapRef.current) {
        mapRef.current.panTo({ lat, lng });
      }
    }
  }, [progress, status, mode]);

  // ── Polyline options — Swiggy/Zomato style orange dashed route ───────────────
  // Outer glow
  const glowPolylineOptions = {
    strokeColor: '#FC8019',
    strokeOpacity: 0.15,
    strokeWeight: 14,
    geodesic: true,
    zIndex: 1,
  };
  // Main solid orange route
  const mainPolylineOptions = {
    strokeColor: '#FC8019',
    strokeOpacity: 1,
    strokeWeight: 5,
    geodesic: true,
    zIndex: 2,
  };
  // White dashed overlay
  const dashedPolylineOptions = {
    strokeColor: '#FFFFFF',
    strokeOpacity: 0,
    strokeWeight: 4,
    geodesic: true,
    zIndex: 3,
    icons: [
      {
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: 0.9,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
          scale: 4,
        },
        offset: '0',
        repeat: '18px',
      },
    ],
  };

  // ── Render: load error ─────────────────────────────────────────────────────
  if (loadError || error) {
    return (
      <div className="w-full h-full min-h-[200px] bg-red-50 flex items-center justify-center flex-col gap-2 rounded-2xl border border-red-100 text-red-500 p-4">
        <MapPin className="w-6 h-6" />
        <span className="text-xs font-bold text-center">{error || 'Failed to load Google Maps.'}</span>
      </div>
    );
  }

  // ── Render: loading ────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[200px] bg-base flex items-center justify-center flex-col gap-2 rounded-2xl border border-line">
        <Loader className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs text-muted font-bold">Loading Map...</span>
      </div>
    );
  }

  // ── Picker mode marker icon ────────────────────────────────────────────────
  const pickerIconDef = isLoaded && window.google ? {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 10,
    fillColor: '#FF5A00',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2.5,
  } : undefined;

  // ── Restaurant marker icon ─────────────────────────────────────────────────
  const restaurantIconDef = isLoaded && window.google ? {
    path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
    scale: 8,
    fillColor: '#18181b',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2,
  } : undefined;

  // ── Customer marker icon ───────────────────────────────────────────────────
  const customerIconDef = isLoaded && window.google ? {
    path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
    scale: 8,
    fillColor: '#18181b',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2,
  } : undefined;

  // ── Rider marker icon ──────────────────────────────────────────────────────
  const riderIconDef = isLoaded && window.google ? {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 11,
    fillColor: '#e11d48',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2.5,
  } : undefined;

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-line shadow-inner">
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
            setShowFollowButton(true);
            isUserInteractingRef.current = true;
          }
        }}
        onZoomChanged={() => {
          if (mode === 'tracking' && mapRef.current) {
            // Google Maps initial load fires onZoomChanged.
            // Only disable auto-follow if user explicitly changed zoom (map bounds are fully loaded)
            if (mapRef.current.getBounds()) {
              isAutoFollowRef.current = false;
              setShowFollowButton(true);
              isUserInteractingRef.current = true;
            }
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

        {/* ── TRACKING MODE: Route polylines (glow + solid + dashed) ── */}
        {mode === 'tracking' && routePath.length > 1 && (
          <>
            <Polyline path={routePath} options={glowPolylineOptions} />
            <Polyline path={routePath} options={mainPolylineOptions} />
            <Polyline path={routePath} options={dashedPolylineOptions} />
          </>
        )}

        {/* ── TRACKING MODE: Restaurant marker ── */}
        {mode === 'tracking' && restaurantPos && (
          <Marker
            position={restaurantPos}
            icon={restaurantIcon}
            title={isRideOrder ? 'Pickup Point' : 'Restaurant'}
            zIndex={10}
            onClick={() => setActivePopup(activePopup === 'restaurant' ? null : 'restaurant')}
          >
            {activePopup === 'restaurant' && (
              <InfoWindow onCloseClick={() => setActivePopup(null)}>
                <div style={{
                  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#1a1a1a',
                  padding: '2px 4px',
                  whiteSpace: 'nowrap',
                }}>
                  {isRideOrder ? '📍\u00a0Pickup Point' : '🍽️\u00a0Restaurant · Kitchen'}
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* ── TRACKING MODE: Customer marker ── */}
        {mode === 'tracking' && customerPos && (
          <Marker
            position={customerPos}
            icon={homeIcon}
            title={isRideOrder ? (isBeforePickup ? 'Pickup Point' : 'Drop Location') : 'Delivery Address'}
            zIndex={10}
            onClick={() => setActivePopup(activePopup === 'customer' ? null : 'customer')}
          >
            {activePopup === 'customer' && (
              <InfoWindow onCloseClick={() => setActivePopup(null)}>
                <div style={{
                  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#1a1a1a',
                  padding: '2px 4px',
                  whiteSpace: 'nowrap',
                }}>
                  {isRideOrder
                    ? (isBeforePickup ? '📍\u00a0Pickup Point' : '🏁\u00a0Drop Location')
                    : '🏠\u00a0Delivery Address'}
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* ── TRACKING MODE: Rider marker ── */}
        {mode === 'tracking' && riderPos && (
          <Marker
            position={riderPos}
            icon={deliveryMethod === 'Ride' ? rideIcon : riderIcon}
            title={deliveryMethod === 'Ride' ? 'Ride Captain' : 'Delivery Rider'}
            zIndex={20}
            onClick={() => setActivePopup(activePopup === 'rider' ? null : 'rider')}
          >
            {activePopup === 'rider' && (
              <InfoWindow onCloseClick={() => setActivePopup(null)}>
                <div style={{
                  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#1a1a1a',
                  padding: '2px 4px',
                  whiteSpace: 'nowrap',
                }}>
                  {deliveryMethod === 'Ride' ? '🚗 Ride Captain' : '🛵 Delivery Rider'}
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}
      </GoogleMap>

      {/* ── Custom Zoom Controls (Swiggy/Zomato style — bottom right) ── */}
      <div style={{ position: 'absolute', bottom: 24, right: 16, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={() => mapRef.current && mapRef.current.setZoom((mapRef.current.getZoom() || 15) + 1)}
          style={{
            width: 36, height: 36,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 20, color: '#374151', fontWeight: 700,
            userSelect: 'none',
          }}
          title="Zoom in"
        >+</button>
        <button
          onClick={() => mapRef.current && mapRef.current.setZoom((mapRef.current.getZoom() || 15) - 1)}
          style={{
            width: 36, height: 36,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 20, color: '#374151', fontWeight: 700,
            userSelect: 'none',
          }}
          title="Zoom out"
        >−</button>
      </div>

      {/* ── Follow Rider Toggle (Tracking Mode) ── */}
      {mode === 'tracking' && showFollowButton && (
        <button
          onClick={() => {
            isAutoFollowRef.current = true;
            isUserInteractingRef.current = false;
            setShowFollowButton(false);
            if (riderPos && mapRef.current) mapRef.current.panTo(riderPos);
          }}
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            background: '#18181b',
            color: 'white',
            border: 'none',
            borderRadius: 20,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'all 0.18s ease',
          }}
          title="Follow Rider"
        >
          <MapPin style={{ width: 14, height: 14 }} />
          Follow Rider
        </button>
      )}

      {/* ── Traffic Layer Toggle (Tracking Mode) ── */}
      {mode === 'tracking' && (
        <button
          onClick={() => setTrafficOn(prev => !prev)}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 20,
            background: trafficOn ? '#FC8019' : 'white',
            color: trafficOn ? 'white' : '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
            transition: 'all 0.18s ease',
            userSelect: 'none',
          }}
          title="Toggle traffic layer"
        >
          <Layers style={{ width: 14, height: 14 }} />
          Traffic
        </button>
      )}
    </div>
  );
}
