import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Loader } from 'lucide-react';
import { useJsApiLoader, GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { io } from 'socket.io-client';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../config/googleMapsLoader';

// ── Geocode helper (Nominatim — free, no key) ───────────────────────────────
const geocodeAddress = async (address) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'Jinkzo-App/1.0 (support@Jinkzo.com)' } });
    const data = await res.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (_) {
    // Ignore geocoding errors
  }
  return null;
};

// ── Reverse Geocode with ORS and Nominatim Fallback ────────────────────────────
const reverseGeocode = async (lat, lng) => {
  const apiKey = import.meta.env.VITE_OPENROUTE_SERVICE_API_KEY;
  if (apiKey && apiKey !== 'YOUR_ORS_KEY_HERE') {
    try {
      const url = `https://api.openrouteservice.org/geocode/reverse?api_key=${apiKey}&point.lat=${lat}&point.lon=${lng}&size=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.features && data.features[0]) {
          const props = data.features[0].properties;
          return {
            street: props.name || props.street || 'Main Road',
            city: props.locality || props.county || 'Nandikotkur',
            state: props.region || 'Andhra Pradesh',
            zip: props.postalcode || '518401',
            lat,
            lng,
          };
        }
      }
    } catch (_) {
      // Ignore ORS reverse geocoding errors
    }
  }

  // Fallback to Nominatim reverse geocode
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.address) {
      const a = data.address;
      return {
        street: a.road || a.suburb || a.neighbourhood || a.quarter || 'Main Road',
        city: a.city || a.town || a.village || 'Nandikotkur',
        state: a.state || 'Andhra Pradesh',
        zip: a.postcode || '518401',
        lat,
        lng,
      };
    }
  } catch (_) {
    // Ignore Nominatim fallback reverse geocoding errors
  }
  return { street: 'Selected Location', city: 'Nandikotkur', state: 'Andhra Pradesh', zip: '518401', lat, lng };
};

// ── OpenRouteService Route Calculation ────────────────────────────────────────
const calculateORSRoute = async (start, end, apiKey) => {
  try {
    // 1) Try simple GET request first WITHOUT custom headers to avoid CORS OPTIONS Preflight errors in browser
    const getUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;
    let res = await fetch(getUrl);

    if (!res.ok) {
      // 2) Fallback to POST with Bearer header if GET rejected
      const body = {
        coordinates: [[start[1], start[0]], [end[1], end[0]]],
        format: 'geojson'
      };
      const isJwt = apiKey.startsWith('eyJ');
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, application/geo+json',
        'Authorization': isJwt ? `Bearer ${apiKey}` : apiKey
      };
      const postUrl = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;
      res = await fetch(postUrl, { method: 'POST', headers, body: JSON.stringify(body) });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Maps] ORS HTTP ${res.status}:`, errText.slice(0, 200));
      throw new Error(`ORS request failed: ${res.status}`);
    }

    const data = await res.json();
    const coordinates = data.features[0].geometry.coordinates;
    // Google Maps uses { lat, lng } objects
    const routePoints = coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
    console.log('[Maps] ✅ ORS route received:', routePoints.length, 'waypoints along real roads');
    return routePoints;
  } catch (err) {
    console.warn('[Maps] ORS Route failed, falling back to OSRM...', err.message);
    return null;
  }
};

// ── OSRM Route Calculation (Fallback) ────────────────────────────────────────
const calculateOSRMRoute = async (start, end) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM request failed');
    const data = await res.json();
    const coordinates = data.routes[0].geometry.coordinates;
    return coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
  } catch (err) {
    console.warn('Primary OSRM failed, trying backup OpenStreetMap server...', err);
    try {
      const backupUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const res2 = await fetch(backupUrl);
      if (!res2.ok) throw new Error('Backup OSRM failed', { cause: err });
      const data2 = await res2.json();
      const coordinates2 = data2.routes[0].geometry.coordinates;
      return coordinates2.map(coord => ({ lat: coord[1], lng: coord[0] }));
    } catch (err2) {
      console.warn('All OSRM routing servers failed:', err2);
      return null;
    }
  }
};

// ── Default fallback coords (Nandikotkur, AP) ───────────────────────────────────
const DEFAULT_CENTER = { lat: 15.8562, lng: 78.2700 };
const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');

// ── Map container style ───────────────────────────────────────────────────────
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

// ── Map base options ──────────────────────────────────────────────────────────
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

// ── Custom marker icon builders ───────────────────────────────────────────────
const makeMarkerIcon = (color, label) => ({
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
  fillColor: color,
  fillOpacity: 1,
  strokeColor: '#FFFFFF',
  strokeWeight: 1.5,
  scale: 1.5,
  anchor: { x: 12, y: 24 },
  labelOrigin: { x: 12, y: 9 },
  label,
});

// ── Component ───────────────────────────────────────────────────────────────
export default function GoogleMapContainer({
  mode = 'tracking',        // 'tracking' | 'picker'
  restaurantAddress = '',
  customerAddress = '',
  status = '',
  progress = 0,
  onAddressSelect = null,
  initialAddress = null,
  deliveryMethod = 'Standard',
  orderId = null
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  const mapRef = useRef(null);                  // Google Maps instance
  const pickerMarkerRef = useRef(null);         // picker mode draggable marker
  const restaurantMarkerRef = useRef(null);     // tracking restaurant marker
  const customerMarkerRef = useRef(null);       // tracking customer marker
  const riderMarkerRef = useRef(null);          // tracking rider marker
  const routePointsRef = useRef([]);            // Array of {lat,lng} along route

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [pickerPos, setPickerPos] = useState(null);
  const [restaurantPos, setRestaurantPos] = useState(null);
  const [customerPos, setCustomerPos] = useState(null);
  const [riderPos, setRiderPos] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [activePopup, setActivePopup] = useState(null); // 'restaurant' | 'customer' | 'rider'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // eslint-disable-line no-unused-vars

  // ── Map load callback ──────────────────────────────────────────────────────
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
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
      const addr = `${initialAddress.street}, ${initialAddress.city}, ${initialAddress.state} ${initialAddress.zip}`;
      geocodeAddress(addr).then(pos => {
        if (pos) placeOrMovePicker(pos.lat, pos.lng);
        else placeOrMovePicker(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
      });
    } else {
      placeOrMovePicker(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
    }
  }, [isLoaded, mode, initialAddress]);

  // ── Picker — handle marker drag ────────────────────────────────────────────
  const handlePickerDragEnd = useCallback(async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPickerPos({ lat, lng });
    const result = await reverseGeocode(lat, lng);
    if (onAddressSelect) onAddressSelect(result);
  }, [onAddressSelect]);

  // ── Picker — handle map click ──────────────────────────────────────────────
  const handlePickerMapClick = useCallback(async (e) => {
    if (mode !== 'picker') return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPickerPos({ lat, lng });
    const result = await reverseGeocode(lat, lng);
    if (onAddressSelect) onAddressSelect(result);
  }, [mode, onAddressSelect]);

  // ── Tracking mode ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || mode !== 'tracking') return;

    // Clear picker state
    setPickerPos(null);

    const restAddr = restaurantAddress || '15-22-32, Manoj Nagar, Nandikotkur, Andhra Pradesh 518401';
    const custAddr = customerAddress || '4-12-8, Main Bazar, Nandikotkur, Andhra Pradesh 518401';

    const drawRoute = async () => {
      const [restPos, custPos] = await Promise.all([
        geocodeAddress(restAddr),
        geocodeAddress(custAddr),
      ]);

      let restLatLng = restPos ? { lat: restPos.lat, lng: restPos.lng } : { lat: 15.8600, lng: 78.2618 };
      let custLatLng = custPos ? { lat: custPos.lat, lng: custPos.lng } : { lat: 15.8520, lng: 78.2700 };

      // Map Nandikotkur orders to actual streets so routing returns real road curves
      if (restAddr.includes('Nandikotkur') || !restPos) {
        restLatLng = { lat: 15.8600, lng: 78.2618 };
      }
      if (custAddr.includes('Nandikotkur') || !custPos) {
        custLatLng = { lat: 15.8520, lng: 78.2700 };
      }

      const dist = Math.hypot(restLatLng.lat - custLatLng.lat, restLatLng.lng - custLatLng.lng);
      if (dist < 0.005) {
        restLatLng = { lat: 15.8600, lng: 78.2618 };
        custLatLng = { lat: 15.8520, lng: 78.2700 };
      }

      setRestaurantPos(restLatLng);
      setCustomerPos(custLatLng);

      // Route calculation — ORS primary / OSRM fallback
      const orsApiKey = import.meta.env.VITE_OPENROUTE_SERVICE_API_KEY;
      const restArr = [restLatLng.lat, restLatLng.lng];
      const custArr = [custLatLng.lat, custLatLng.lng];

      let routePoints = null;
      if (orsApiKey && orsApiKey !== 'YOUR_ORS_KEY_HERE' && !orsApiKey.startsWith('YOUR_')) {
        routePoints = await calculateORSRoute(restArr, custArr, orsApiKey);
      }
      if (!routePoints) {
        routePoints = await calculateOSRMRoute(restArr, custArr);
      }
      if (!routePoints || routePoints.length === 0) {
        // Orthogonal street corner grid fallback
        routePoints = [
          restLatLng,
          { lat: restLatLng.lat, lng: (restLatLng.lng + custLatLng.lng) / 2 },
          { lat: custLatLng.lat, lng: (restLatLng.lng + custLatLng.lng) / 2 },
          custLatLng,
        ];
      }

      routePointsRef.current = routePoints;
      setRoutePath(routePoints);

      // Fit map to both markers
      if (mapRef.current && window.google) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(restLatLng);
        bounds.extend(custLatLng);
        mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      }
    };

    drawRoute();
  }, [isLoaded, mode, restaurantAddress, customerAddress]); // eslint-disable-line

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
      setRiderPos({ lat, lng });
      if (status === 'Out for Delivery' && mapRef.current) {
        mapRef.current.panTo({ lat, lng });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isLoaded, orderId, mode, status]); // eslint-disable-line

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

    setRiderPos({ lat, lng });

    if (status === 'Out for Delivery' && mapRef.current) {
      mapRef.current.panTo({ lat, lng });
    }
  }, [progress, status, mode]);

  // ── Polyline options ───────────────────────────────────────────────────────
  const shadowPolylineOptions = {
    strokeColor: '#1E3A8A',
    strokeOpacity: 0.25,
    strokeWeight: 8,
    geodesic: true,
  };
  const mainPolylineOptions = {
    strokeColor: '#2563EB',
    strokeOpacity: 0.95,
    strokeWeight: 5.5,
    geodesic: true,
  };

  // ── Render: missing API key ────────────────────────────────────────────────
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div className="w-full h-full min-h-[200px] bg-amber-50 flex items-center justify-center flex-col gap-2 rounded-2xl border border-amber-200 text-amber-700 p-4">
        <MapPin className="w-6 h-6" />
        <span className="text-xs font-bold text-center">
          Google Maps API key not set.
          <br />
          Add <code className="font-mono bg-amber-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">.env</code>
        </span>
      </div>
    );
  }

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading || !isLoaded) {
    return (
      <div className="w-full h-full min-h-[200px] bg-base flex items-center justify-center flex-col gap-2 rounded-2xl border border-line">
        <Loader className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs text-muted font-bold">Loading Map...</span>
      </div>
    );
  }

  // ── Render: load error ─────────────────────────────────────────────────────
  if (loadError || error) {
    return (
      <div className="w-full h-full min-h-[200px] bg-red-50 flex items-center justify-center flex-col gap-2 rounded-2xl border border-red-100 text-red-500 p-4">
        <MapPin className="w-6 h-6" />
        <span className="text-xs font-bold text-center">{error || 'Failed to load Google Maps.'}</span>
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
            icon={pickerIconDef}
          />
        )}

        {/* ── TRACKING MODE: Route polylines ── */}
        {mode === 'tracking' && routePath.length > 1 && (
          <>
            <Polyline path={routePath} options={shadowPolylineOptions} />
            <Polyline path={routePath} options={mainPolylineOptions} />
          </>
        )}

        {/* ── TRACKING MODE: Restaurant marker ── */}
        {mode === 'tracking' && restaurantPos && (
          <Marker
            position={restaurantPos}
            icon={restaurantIconDef}
            title="Restaurant"
            onClick={() => setActivePopup(activePopup === 'restaurant' ? null : 'restaurant')}
          >
            {activePopup === 'restaurant' && (
              <InfoWindow onCloseClick={() => setActivePopup(null)}>
                <div style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: '700' }}>
                  🍽️ Restaurant · Kitchen
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* ── TRACKING MODE: Customer marker ── */}
        {mode === 'tracking' && customerPos && (
          <Marker
            position={customerPos}
            icon={customerIconDef}
            title="Delivery Address"
            onClick={() => setActivePopup(activePopup === 'customer' ? null : 'customer')}
          >
            {activePopup === 'customer' && (
              <InfoWindow onCloseClick={() => setActivePopup(null)}>
                <div style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: '700' }}>
                  🏠 Delivery Address · Your Home
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* ── TRACKING MODE: Rider marker ── */}
        {mode === 'tracking' && riderPos && (
          <Marker
            position={riderPos}
            icon={riderIconDef}
            title={deliveryMethod === 'Ride' ? 'Ride Captain' : 'Delivery Rider'}
            onClick={() => setActivePopup(activePopup === 'rider' ? null : 'rider')}
          >
            {activePopup === 'rider' && (
              <InfoWindow onCloseClick={() => setActivePopup(null)}>
                <div style={{ fontFamily: 'inherit', fontSize: '13px', fontWeight: '700' }}>
                  {deliveryMethod === 'Ride' ? '🚗 Ride Captain' : '🛵 Delivery Rider'}
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}
      </GoogleMap>
    </div>
  );
}
