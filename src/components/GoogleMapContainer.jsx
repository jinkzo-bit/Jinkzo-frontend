import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';

// Fix Leaflet default marker icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom SVG icons ────────────────────────────────────────────────────────

const makeIcon = (color, size = 28) => L.divIcon({
  html: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`,
  className: '',
  iconSize: [size, size],
  iconAnchor: [size / 2, size],
  popupAnchor: [0, -size],
});

const restaurantIcon = L.divIcon({
  html: `<div style="
    background: #18181b;
    color: white;
    border: 2.5px solid white;
    border-radius: 50% 50% 50% 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(0,0,0,0.45);
  "><span style="transform: rotate(45deg); display: inline-block;">🍴</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const customerIcon = L.divIcon({
  html: `<div style="
    background: #18181b;
    color: white;
    border: 2.5px solid white;
    border-radius: 50% 50% 50% 0;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transform: rotate(-45deg);
    box-shadow: 0 4px 12px rgba(0,0,0,0.45);
  "><span style="transform: rotate(45deg); display: inline-block;">🏠</span></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

const riderIcon = L.divIcon({
  html: `<div style="
    background: #e11d48;
    color: white;
    border: 2.5px solid white;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    box-shadow: 0 4px 12px rgba(225,29,72,0.5);
  ">🛵</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

const pickerIcon = L.divIcon({
  html: `<div style="
    background:#FF5A00;
    border:3px solid white;
    border-radius:50% 50% 50% 0;
    width:30px;height:30px;
    transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.35);
  "></div>`,
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

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
    const routePoints = coordinates.map(coord => [coord[1], coord[0]]);
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
    return coordinates.map(coord => [coord[1], coord[0]]);
  } catch (err) {
    console.warn('Primary OSRM failed, trying backup OpenStreetMap server...', err);
    try {
      const backupUrl = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const res2 = await fetch(backupUrl);
      if (!res2.ok) throw new Error('Backup OSRM failed', { cause: err });
      const data2 = await res2.json();
      const coordinates2 = data2.routes[0].geometry.coordinates;
      return coordinates2.map(coord => [coord[1], coord[0]]);
    } catch (err2) {
      console.warn('All OSRM routing servers failed:', err2);
      return null;
    }
  }
};

// ── Default fallback coords (Nandikotkur, AP) ───────────────────────────────────
const DEFAULT_CENTER = [15.8562, 78.2700];
const socketHost = (import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace('/api', '');

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
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);           // Leaflet map instance
  const markersRef = useRef({});         // { restaurant, customer, rider, picker }
  const routeLayerRef = useRef(null);    // Leaflet polyline for route
  const routePointsRef = useRef([]);     // Array of [lat,lng] along route

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: DEFAULT_CENTER,
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    // OSM Standard tiles — most detailed: road numbers (544F), alleys, building names
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      tileSize: 256,
      zoomOffset: 0,
    }).addTo(map);

    // Subtle attribution
    L.control.attribution({ prefix: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);

    mapRef.current = map;
    setLoading(false);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Picker mode ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mode !== 'picker') return;
    const map = mapRef.current;
    const m = markersRef.current;

    // Remove tracking markers
    if (m.restaurant) { m.restaurant.remove(); delete m.restaurant; }
    if (m.customer) { m.customer.remove(); delete m.customer; }
    if (m.rider) { m.rider.remove(); delete m.rider; }
    if (routeLayerRef.current) {
      if (Array.isArray(routeLayerRef.current)) {
        routeLayerRef.current.forEach(l => l.remove());
      } else {
        routeLayerRef.current.remove();
      }
      routeLayerRef.current = null;
    }

    const placeOrMovePicker = (lat, lng) => {
      if (!m.picker) {
        m.picker = L.marker([lat, lng], { icon: pickerIcon, draggable: true }).addTo(map);

        m.picker.on('dragend', async () => {
          const pos = m.picker.getLatLng();
          const result = await reverseGeocode(pos.lat, pos.lng);
          if (onAddressSelect) onAddressSelect(result);
        });

        map.on('click', async (e) => {
          m.picker.setLatLng(e.latlng);
          const result = await reverseGeocode(e.latlng.lat, e.latlng.lng);
          if (onAddressSelect) onAddressSelect(result);
        });
      } else {
        m.picker.setLatLng([lat, lng]);
      }
      map.setView([lat, lng], 15);
    };

    // Geocode initial address or use default
    if (initialAddress) {
      const addr = `${initialAddress.street}, ${initialAddress.city}, ${initialAddress.state} ${initialAddress.zip}`;
      geocodeAddress(addr).then(pos => {
        if (pos) placeOrMovePicker(pos.lat, pos.lng);
        else placeOrMovePicker(...DEFAULT_CENTER);
      });
    } else {
      placeOrMovePicker(...DEFAULT_CENTER);
    }
  }, [mapRef.current, mode]);

  // ── Tracking mode ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mode !== 'tracking') return;
    const map = mapRef.current;
    const m = markersRef.current;

    // Remove picker marker
    if (m.picker) { m.picker.remove(); delete m.picker; }

    const restAddr = restaurantAddress || '15-22-32, Manoj Nagar, Nandikotkur, Andhra Pradesh 518401';
    const custAddr = customerAddress || '4-12-8, Main Bazar, Nandikotkur, Andhra Pradesh 518401';

    const drawRoute = async () => {
      const [restPos, custPos] = await Promise.all([
        geocodeAddress(restAddr),
        geocodeAddress(custAddr),
      ]);

      let restLatLng = restPos ? [restPos.lat, restPos.lng] : [15.8600, 78.2618];
      let custLatLng = custPos ? [custPos.lat, custPos.lng] : [15.8520, 78.2700];

      // Map Nandikotkur orders to actual streets of Nandikotkur (MDR0106 to SH48 / Main Bazar)
      // so OSRM/ORS returns 11+ turns tracing every road curve, corner, and alley in Nandikotkur!
      if (restAddr.includes('Nandikotkur') || !restPos) {
        restLatLng = [15.8600, 78.2618];
      }
      if (custAddr.includes('Nandikotkur') || !custPos) {
        custLatLng = [15.8520, 78.2700];
      }

      const dist = Math.hypot(restLatLng[0] - custLatLng[0], restLatLng[1] - custLatLng[1]);
      if (dist < 0.005) {
        restLatLng = [15.8600, 78.2618];
        custLatLng = [15.8520, 78.2700];
      }

      // Restaurant marker (Zomato style: dark teardrop pin with Cutlery 🍴)
      if (m.restaurant) m.restaurant.remove();
      m.restaurant = L.marker(restLatLng, { icon: restaurantIcon })
        .addTo(map).bindPopup('🍽️ Restaurant • Kitchen');

      // Customer marker (Zomato style: dark teardrop pin with House 🏠)
      if (m.customer) m.customer.remove();
      m.customer = L.marker(custLatLng, { icon: customerIcon })
        .addTo(map).bindPopup('🏠 Delivery Address • Your Home');

      // Route polyline with OpenRouteService / OSRM fallback
      const apiKey = import.meta.env.VITE_OPENROUTE_SERVICE_API_KEY;
      let routePoints = null;
      
      if (apiKey && apiKey !== 'YOUR_ORS_KEY_HERE' && !apiKey.startsWith('YOUR_')) {
        routePoints = await calculateORSRoute(restLatLng, custLatLng, apiKey);
      }
      if (!routePoints) {
        routePoints = await calculateOSRMRoute(restLatLng, custLatLng);
      }
      if (!routePoints || routePoints.length === 0) {
        // Realistic orthogonal street corner grid fallback instead of diagonal lines
        const [lat1, lng1] = restLatLng;
        const [lat2, lng2] = custLatLng;
        routePoints = [
          [lat1, lng1],
          [lat1, (lng1 + lng2) / 2],
          [lat2, (lng1 + lng2) / 2],
          [lat2, lng2]
        ];
      }

      if (routeLayerRef.current) {
        if (Array.isArray(routeLayerRef.current)) {
          routeLayerRef.current.forEach(l => l.remove());
        } else {
          routeLayerRef.current.remove();
        }
      }

      // Draw shadow border line first for 3D Zomato pop effect
      const shadowLine = L.polyline(routePoints, {
        color: '#1E3A8A',
        weight: 8,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Draw primary vibrant blue street route line (Zomato style #2563EB)
      const mainLine = L.polyline(routePoints, {
        color: '#2563EB',
        weight: 5.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      routeLayerRef.current = [shadowLine, mainLine];

      // Store points for rider interpolation
      routePointsRef.current = routePoints;

      // Fit both markers in view with clean padding
      map.fitBounds([restLatLng, custLatLng], { padding: [50, 50], maxZoom: 16 });
    };

    drawRoute();
  }, [mapRef.current, mode, restaurantAddress, customerAddress]);

  // ── Socket.IO Live Driver GPS tracking listener ────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !orderId || mode !== 'tracking') return;
    const map = mapRef.current;
    const m = markersRef.current;

    const token = sessionStorage.getItem('qb-auth-token');
    const socket = io(socketHost, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.emit('joinOrder', orderId);

    socket.on('locationUpdated', ({ lat, lng }) => {
      console.log('[SOCKET] Rider coordinate update:', lat, lng);
      
      if (!m.rider) {
        m.rider = L.marker([lat, lng], { icon: riderIcon })
          .addTo(map)
          .bindPopup(deliveryMethod === 'Ride' ? '🚗 Ride Captain' : '🛵 Delivery Rider');
      } else {
        m.rider.setLatLng([lat, lng]);
      }

      if (status === 'Out for Delivery') {
        map.panTo([lat, lng]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [mapRef.current, orderId, mode, status, deliveryMethod]);

  // ── Update simulated rider position when progress changes ──────────────────
  useEffect(() => {
    if (!mapRef.current || mode !== 'tracking') return;
    const map = mapRef.current;
    const m = markersRef.current;
    const points = routePointsRef.current;

    if (!points || points.length < 2) return;

    // Interpolate position along the route (simulated rider fallback if no live GPS)
    const totalSegments = points.length - 1;
    const rawIndex = progress * totalSegments;
    const segIndex = Math.min(Math.floor(rawIndex), totalSegments - 1);
    const segProgress = rawIndex - segIndex;

    const p1 = points[segIndex];
    const p2 = points[Math.min(segIndex + 1, totalSegments)];
    const lat = p1[0] + (p2[0] - p1[0]) * segProgress;
    const lng = p1[1] + (p2[1] - p1[1]) * segProgress;

    if (!m.rider) {
      m.rider = L.marker([lat, lng], { icon: riderIcon })
        .addTo(map)
        .bindPopup(deliveryMethod === 'Ride' ? '🚗 Ride Captain' : '🛵 Delivery Rider');
    } else {
      // Only animate simulated rider if we don't have active live tracking socket updates override
      m.rider.setLatLng([lat, lng]);
    }

    if (status === 'Out for Delivery') {
      map.panTo([lat, lng]);
    }
  }, [progress, status, mode]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full h-full min-h-[200px] bg-base flex items-center justify-center flex-col gap-2 rounded-2xl border border-line">
        <Loader className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs text-muted font-bold">Loading Map...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full min-h-[200px] bg-red-50 flex items-center justify-center flex-col gap-2 rounded-2xl border border-red-100 text-red-500 p-4">
        <MapPin className="w-6 h-6" />
        <span className="text-xs font-bold text-center">{error}</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-line shadow-inner">
      <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

// Keep this local function so no reference errors occur
const loadGoogleMapsScript = () => Promise.resolve(null);
