import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap as GoogleMapComponent, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Loader, AlertTriangle } from 'lucide-react';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../../config/googleMapsLoader';

// ── Default location: Nandikotkur, Andhra Pradesh ────────────────────────────
const DEFAULT_LAT = 15.8567;
const DEFAULT_LNG = 78.2656;

const DEFAULT_CENTER = { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

// ── Swiggy/Zomato style clean map — minimal, light, food-delivery feel ────────
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
  ...(import.meta.env.VITE_GOOGLE_MAP_ID ? { mapId: import.meta.env.VITE_GOOGLE_MAP_ID } : {}),
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

// ── Picker SVG icon (Swiggy/Zomato orange pin) ────────────────────────────────
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

const PICKER_ICON = {
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PICKER_SVG)}`,
  scaledSize: { width: 40, height: 52 },
  anchor: { x: 20, y: 50 },
};

// Container style — fills parent; parent must have explicit height
const CONTAINER_STYLE = { width: '100%', height: '100%', position: 'relative' };

/**
 * Reusable Google Map component.
 */
export default function GoogleMap({
  latitude,
  longitude,
  onLocationChange,
  address,        // eslint-disable-line no-unused-vars
  zoom = 15,
  draggable = true,
  showMarker = true,
  className = '',
  mapOptions = {},
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);
  const [geoLocating, setGeoLocating] = useState(false);

  // Derive center from props or fall back to default
  const propsCenter =
    latitude != null && longitude != null
      ? { lat: Number(latitude), lng: Number(longitude) }
      : null;

  // ── Set initial marker position ────────────────────────────────────────────
  useEffect(() => {
    if (propsCenter) {
      setMarkerPos(propsCenter);
    } else {
      if (!navigator.geolocation) {
        setMarkerPos(DEFAULT_CENTER);
        return;
      }
      setGeoLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMarkerPos(loc);
          if (mapRef.current) {
            mapRef.current.panTo(loc);
            if (window.google?.maps?.event) {
              window.google.maps.event.trigger(mapRef.current, 'resize');
            }
          }
          setGeoLocating(false);
        },
        () => {
          setMarkerPos(DEFAULT_CENTER);
          setGeoLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
    // eslint-disable-next-line
  }, [latitude, longitude]);

  // ── Keep marker in sync when props change externally ──────────────────────
  useEffect(() => {
    if (propsCenter) setMarkerPos(propsCenter);
    // eslint-disable-next-line
  }, [latitude, longitude]);

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
  const onLoad = useCallback((map) => {
    mapRef.current = map;
    setMapInstance(map);
    try {
      if (typeof map.setTilt === 'function') map.setTilt(0);
      if (typeof map.setHeading === 'function') map.setHeading(0);
    } catch (_) {}

    if (window.google?.maps?.event) {
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

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMapInstance(null);
  }, []);

  // ── Marker drag end ────────────────────────────────────────────────────────
  const handleMarkerDragEnd = useCallback(
    (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPos({ lat, lng });
      if (onLocationChange) onLocationChange(lat, lng);
    },
    [onLocationChange]
  );

  // ── Map click (move marker) ────────────────────────────────────────────────
  const handleMapClick = useCallback(
    (e) => {
      if (!draggable) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPos({ lat, lng });
      if (onLocationChange) onLocationChange(lat, lng);
    },
    [draggable, onLocationChange]
  );

  // ── Error state ────────────────────────────────────────────────────────────
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div
        className={`w-full h-full min-h-[200px] bg-amber-50 flex items-center justify-center flex-col gap-2 rounded-2xl border border-amber-200 text-amber-700 p-4 ${className}`}
      >
        <AlertTriangle className="w-6 h-6" />
        <span className="text-xs font-bold text-center">
          Google Maps API key not configured.
          <br />
          Set <code className="font-mono bg-amber-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
          <code className="font-mono bg-amber-100 px-1 rounded">.env</code>
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className={`w-full h-full min-h-[200px] bg-red-50 flex items-center justify-center flex-col gap-2 rounded-2xl border border-red-100 text-red-500 p-4 ${className}`}
      >
        <MapPin className="w-6 h-6" />
        <span className="text-xs font-bold text-center">
          Failed to load Google Maps.
          <br />
          Check your API key and network connection.
        </span>
      </div>
    );
  }

  if (!isLoaded || geoLocating) {
    return (
      <div
        className={`w-full h-full min-h-[200px] bg-base flex items-center justify-center flex-col gap-2 rounded-2xl border border-line ${className}`}
      >
        <Loader className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs text-muted font-bold">
          {geoLocating ? 'Detecting location...' : 'Loading Map...'}
        </span>
      </div>
    );
  }

  const center = markerPos || DEFAULT_CENTER;

  return (
    <div ref={containerRef} className={`w-full h-full relative ${className}`} style={{ minHeight: '200px' }}>
      <GoogleMapComponent
        mapContainerStyle={CONTAINER_STYLE}
        center={center}
        zoom={zoom}
        options={{ ...MAP_OPTIONS, ...mapOptions }}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={draggable ? handleMapClick : undefined}
      >
        {showMarker && markerPos && (
          <Marker
            position={markerPos}
            draggable={draggable}
            onDragEnd={handleMarkerDragEnd}
            icon={PICKER_ICON}
          />
        )}
      </GoogleMapComponent>

      {/* Custom Zoom Controls */}
      <div style={{ position: 'absolute', bottom: 16, right: 12, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <button
          onClick={() => {
            if (mapRef.current) {
              const z = mapRef.current.getZoom() || zoom;
              mapRef.current.setZoom(Math.min(z + 1, 20));
            }
          }}
          style={{
            width: 32, height: 32,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 7,
            boxShadow: '0 2px 6px rgba(0,0,0,0.13)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 18, color: '#374151', fontWeight: 700,
            userSelect: 'none',
          }}
          title="Zoom in"
        >+</button>
        <button
          onClick={() => {
            if (mapRef.current) {
              const z = mapRef.current.getZoom() || zoom;
              mapRef.current.setZoom(Math.max(z - 1, 3));
            }
          }}
          style={{
            width: 32, height: 32,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 7,
            boxShadow: '0 2px 6px rgba(0,0,0,0.13)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 18, color: '#374151', fontWeight: 700,
            userSelect: 'none',
          }}
          title="Zoom out"
        >−</button>
      </div>
    </div>
  );
}
