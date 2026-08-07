import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap as GoogleMapComponent, Marker, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Loader, AlertTriangle } from 'lucide-react';

// ── Default location: Nandikotkur, Andhra Pradesh ────────────────────────────
const DEFAULT_LAT = 15.8567;
const DEFAULT_LNG = 78.2656;

const DEFAULT_CENTER = { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

// ── Google Maps base options ─────────────────────────────────────────────────
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

// Container style — fills parent; parent must have explicit height
const CONTAINER_STYLE = { width: '100%', height: '100%' };

/**
 * Reusable Google Map component.
 *
 * Props:
 *   latitude          number   — initial center latitude  (default: Nandikotkur)
 *   longitude         number   — initial center longitude (default: Nandikotkur)
 *   onLocationChange  fn(lat, lng) — called when marker is dragged or map clicked
 *   address           string   — (optional) descriptive address, unused for rendering
 *   zoom              number   — initial zoom level (default: 15)
 *   draggable         boolean  — whether the marker is draggable (default: true)
 *   showMarker        boolean  — whether to show the position marker (default: true)
 *   className         string   — extra class for the outer wrapper
 *   mapOptions        object   — extra Google Maps options to merge
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

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    id: 'google-map-script',
  });

  const mapRef = useRef(null);
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
      // No coords provided → try browser geolocation once
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
          }
          setGeoLocating(false);
        },
        () => {
          // Permission denied or timeout → use default
          setMarkerPos(DEFAULT_CENTER);
          setGeoLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
    // Only run when prop coords change
    // eslint-disable-next-line
  }, [latitude, longitude]);

  // ── Keep marker in sync when props change externally ──────────────────────
  useEffect(() => {
    if (propsCenter) setMarkerPos(propsCenter);
    // eslint-disable-next-line
  }, [latitude, longitude]);

  // ── Map load callback ──────────────────────────────────────────────────────
  const onLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
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
    <div className={`w-full h-full relative ${className}`}>
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
            animation={window.google?.maps?.Animation?.DROP}
          />
        )}
      </GoogleMapComponent>
    </div>
  );
}
