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
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f7' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e0e0e0' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c6c6c6' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e8f5e9' }] },
    { featureType: 'park', elementType: 'geometry', stylers: [{ color: '#e5f2e5' }] },
    { featureType: 'park', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5f2e5' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#f2f2f2' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
  ],
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
    <circle cx="26" cy="26" r="22" fill="#E23744"/>
    <circle cx="26" cy="26" r="19" fill="#cc1f2d"/>
    <text x="26" y="32" text-anchor="middle" font-size="20" font-family="Arial">&#128691;</text>
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
    <circle cx="26" cy="26" r="19" fill="#1d4ed8"/>
    <text x="26" y="32" text-anchor="middle" font-size="20" font-family="Arial">&#128663;</text>
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

// Convert SVG string to Google Maps icon object
const svgToIcon = (svgString, width, height, anchorX, anchorY) => ({
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}`,
  scaledSize: { width, height },
  anchor: { x: anchorX, y: anchorY },
});



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
  showTraffic = false,      // NEW: traffic layer toggle
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

  // ── Build SVG icon objects once Maps API is loaded ─────────────────────────
  const restaurantIcon = isLoaded ? svgToIcon(RESTAURANT_SVG, 44, 56, 22, 52) : undefined;
  const homeIcon       = isLoaded ? svgToIcon(HOME_SVG, 44, 56, 22, 52)       : undefined;
  const riderIcon      = isLoaded ? svgToIcon(RIDER_SVG, 52, 52, 26, 26)      : undefined;
  const rideIcon       = isLoaded ? svgToIcon(RIDE_SVG, 52, 52, 26, 26)       : undefined;
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
  useEffect(() => {
    if (!isLoaded || mode !== 'tracking') return;

    // Clear picker state
    setPickerPos(null);

    const drawRoute = async () => {
      let restPos = (restaurantLat && restaurantLng) ? { lat: restaurantLat, lng: restaurantLng } : null;
      let custPos = (customerLat && customerLng) ? { lat: customerLat, lng: customerLng } : null;

      if (!restPos || !custPos) {
        console.warn('[GoogleMapContainer] Missing required coordinates for tracking map.');
        return;
      }

      // Safe fallback if totally unresolved
      let restLatLng = { lat: restPos.lat, lng: restPos.lng };
      let custLatLng = { lat: custPos.lat, lng: custPos.lng };

      // Avoid drawing extremely short routes (same location)
      const dist = Math.hypot(restLatLng.lat - custLatLng.lat, restLatLng.lng - custLatLng.lng);
      if (dist < 0.005) {
         console.warn('[GoogleMapContainer] Locations are identical, not drawing route.');
      }

      setRestaurantPos(restLatLng);
      setCustomerPos(custLatLng);

      // Route calculation via backend proxy (Google Routes API with traffic)
      try {
        const res = await fetch(`${API_BASE}/maps/routes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: restLatLng,
            destination: custLatLng,
            travelMode: 'DRIVE',
          }),
        });
        const data = await res.json();
        let routePoints = [];
        if (data.success && data.data) {
          routePoints = data.data.polyline || [
            restLatLng,
            { lat: restLatLng.lat, lng: (restLatLng.lng + custLatLng.lng) / 2 },
            { lat: custLatLng.lat, lng: (restLatLng.lng + custLatLng.lng) / 2 },
            custLatLng,
          ];
          if (onRouteInfo) {
            onRouteInfo({
              distanceKm: data.data.distanceKm,
              durationMinutes: data.data.durationMinutes,
            });
          }
        } else {
          routePoints = [
            restLatLng,
            { lat: restLatLng.lat, lng: (restLatLng.lng + custLatLng.lng) / 2 },
            { lat: custLatLng.lat, lng: (restLatLng.lng + custLatLng.lng) / 2 },
            custLatLng,
          ];
        }

        routePointsRef.current = routePoints;
        setRoutePath(routePoints);
      } catch (err) {
        console.error('[GoogleMapContainer] Route fetch failed:', err);
        const fallbackPoints = [
          restLatLng,
          { lat: restLatLng.lat, lng: (restLatLng.lng + custLatLng.lng) / 2 },
          { lat: custLatLng.lat, lng: (restLatLng.lng + custLatLng.lng) / 2 },
          custLatLng,
        ];
        routePointsRef.current = fallbackPoints;
        setRoutePath(fallbackPoints);
      }

      // Fit map to both markers
      if (mapRef.current && window.google) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(restLatLng);
        bounds.extend(custLatLng);
        mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      }
    };

    drawRoute();
  }, [isLoaded, mode, restaurantLat, restaurantLng, customerLat, customerLng, restaurantAddress, customerAddress]);

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

    socket.on('locationUpdated', ({ lat, lng }) => {
      console.log('[SOCKET] Rider coordinate update:', lat, lng);
      hasLiveGPS.current = true;
      setRiderPos({ lat, lng });
      if (status === 'Out for Delivery' && mapRef.current) {
        mapRef.current.panTo({ lat, lng });
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
    const lat = p1.lat + (p2.lat - p1.lat) * segProgress;
    const lng = p1.lng + (p2.lng - p1.lng) * segProgress;

    if (!hasLiveGPS.current) {
      setRiderPos({ lat, lng });

      if (status === 'Out for Delivery' && mapRef.current) {
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
            title="Restaurant"
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
                  🍽️ &nbsp;Restaurant · Kitchen
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
            title="Delivery Address"
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
                  🏠 &nbsp;Delivery Address
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
