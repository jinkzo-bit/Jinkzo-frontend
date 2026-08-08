import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Loader, MapPin } from 'lucide-react';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../config/googleMapsLoader';

const DEFAULT_CENTER = { lat: 15.8601, lng: 78.2618 };

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

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

const googleGeocode = async (address, apiKey) => {
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url, { credentials: 'omit' });
    const data = await res.json();
    if (data.status === 'OK' && data.results?.[0]) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch (_) {
    // ignore
  }
  return null;
};

export default function RestaurantsMapView({ restaurants = [], userLocation = null }) {
  const mapRef = useRef(null);
  const [geocodedCache, setGeocodedCache] = useState({});
  const [restaurantMarkers, setRestaurantMarkers] = useState([]); // [{ restaurant, lat, lng }]
  const [activeInfoWindow, setActiveInfoWindow] = useState(null); // restaurant._id
  const [mapCenter, setMapCenter] = useState(
    userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : DEFAULT_CENTER
  );

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  // ── Map load callback ──────────────────────────────────────────────────────
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // ── Handle user location updates ──────────────────────────────────────────
  useEffect(() => {
    if (userLocation) {
      const newCenter = { lat: userLocation.lat, lng: userLocation.lng };
      setMapCenter(newCenter);
      if (mapRef.current) {
        mapRef.current.panTo(newCenter);
      }
    }
  }, [userLocation]);

  // ── Geocode and collect restaurant marker positions ────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    const loadMarkers = async () => {
      const newCache = { ...geocodedCache };
      let cacheUpdated = false;
      const markers = [];

      for (const restaurant of restaurants) {
        let lat = null;
        let lng = null;

        // Check if restaurant object already has coords
        if (restaurant.location?.lat && restaurant.location?.lng) {
          lat = restaurant.location.lat;
          lng = restaurant.location.lng;
        } else if (restaurant.latitude && restaurant.longitude) {
          lat = restaurant.latitude;
          lng = restaurant.longitude;
        } else if (newCache[restaurant.address]) {
          lat = newCache[restaurant.address].lat;
          lng = newCache[restaurant.address].lng;
        } else {
          // If address lacks lat/lng, attempt to geocode
          const coords = await googleGeocode(restaurant.address, apiKey);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            newCache[restaurant.address] = coords;
            cacheUpdated = true;
          }
        }

        if (lat !== null && lng !== null) {
          markers.push({ restaurant, lat, lng });
        }
      }

      setRestaurantMarkers(markers);
      if (cacheUpdated) {
        setGeocodedCache(newCache);
      }
    };

    loadMarkers();
  }, [restaurants, isLoaded]); // eslint-disable-line

  // ── Restaurant marker icon ─────────────────────────────────────────────────
  const restaurantIconDef = isLoaded && window.google ? {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 9,
    fillColor: '#ff5a00',
    fillOpacity: 0.9,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  } : undefined;

  // ── User location icon (pulsing blue dot simulation) ──────────────────────
  const userIconDef = isLoaded && window.google ? {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 8,
    fillColor: '#3b82f6',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
  } : undefined;

  // ── Render: missing API key ────────────────────────────────────────────────
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-line shadow-xs bg-amber-50 flex items-center justify-center flex-col gap-2 p-8" style={{ height: '550px' }}>
        <MapPin className="w-6 h-6 text-amber-600" />
        <span className="text-xs font-bold text-amber-700 text-center">
          Google Maps API key not configured.
          <br />
          Set <code className="font-mono bg-amber-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in <code className="font-mono bg-amber-100 px-1 rounded">.env</code>
        </span>
      </div>
    );
  }

  // ── Render: load error ─────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-red-100 bg-red-50 flex items-center justify-center flex-col gap-2 p-8" style={{ height: '550px' }}>
        <MapPin className="w-6 h-6 text-red-500" />
        <span className="text-xs font-bold text-red-500 text-center">Failed to load Google Maps. Check API key.</span>
      </div>
    );
  }

  // ── Render: loading ────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="relative w-full rounded-2xl overflow-hidden border border-line shadow-xs bg-surface flex items-center justify-center flex-col gap-2" style={{ height: '550px' }}>
        <Loader className="w-8 h-8 text-primary animate-spin" />
        <span className="text-xs text-muted font-bold">Loading Map...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-line shadow-xs bg-surface" style={{ height: '550px' }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={mapCenter}
        zoom={13}
        options={MAP_OPTIONS}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
      >
        {/* ── User location marker ── */}
        {userLocation && (
          <Marker
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            icon={userIconDef}
            title="Your Location"
            zIndex={10}
          />
        )}

        {/* ── Restaurant markers ── */}
        {restaurantMarkers.map(({ restaurant, lat, lng }) => (
          <Marker
            key={restaurant._id}
            position={{ lat, lng }}
            icon={restaurantIconDef}
            title={restaurant.name}
            onClick={() => setActiveInfoWindow(
              activeInfoWindow === restaurant._id ? null : restaurant._id
            )}
          >
            {activeInfoWindow === restaurant._id && (
              <InfoWindow onCloseClick={() => setActiveInfoWindow(null)}>
                <div style={{ fontFamily: 'inherit', minWidth: '180px', padding: '4px' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '850', color: '#111827' }}>
                    {restaurant.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: '#4b5563', marginBottom: '6px' }}>
                    <span style={{ color: '#ff5a00' }}>⭐ {restaurant.rating || '4.0'}</span>
                    <span style={{ color: '#e5e7eb' }}>•</span>
                    <span>⏱️ {restaurant.deliveryTime || '30'} mins</span>
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '10px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                    {(restaurant.cuisineTags || []).join(', ')}
                  </p>
                  <a
                    href={`/restaurant/${restaurant._id}`}
                    style={{ display: 'block', textAlign: 'center', background: '#ff5a00', color: '#ffffff', textDecoration: 'none', fontSize: '11px', fontWeight: '800', padding: '7px 12px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                  >
                    View Menu
                  </a>
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}
      </GoogleMap>
    </div>
  );
}
