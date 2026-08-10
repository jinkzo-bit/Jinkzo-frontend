import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { Loader, MapPin } from 'lucide-react';
import { GOOGLE_MAPS_LOADER_OPTIONS } from '../config/googleMapsLoader';
import { API_BASE } from '../config/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';

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


export default function RestaurantsMapView({ restaurants = [], userLocation = null }) {
  const mapRef = useRef(null);
  const clustererRef = useRef(null);
  const [restaurantMarkers, setRestaurantMarkers] = useState([]);
  const [activeInfoWindow, setActiveInfoWindow] = useState(null);
  const [mapCenter, setMapCenter] = useState(
    userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : DEFAULT_CENTER
  );

  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  // ── Map load callback ──────────────────────────────────────────────────────
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    // Initialize marker clusterer
    if (window.google && !clustererRef.current) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers: [],
        algorithm: {
          calculate: (input) => {
            const { markers } = input;
            const clusters = [];
            const visited = new Set();
            
            for (const marker of markers) {
              if (visited.has(marker)) continue;
              const cluster = { markers: [marker], bounds: null };
              visited.add(marker);
              
              for (const otherMarker of markers) {
                if (visited.has(otherMarker)) continue;
                const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
                  marker.getPosition(),
                  otherMarker.getPosition()
                );
                if (distance < 8000) { // 8km cluster radius
                  cluster.markers.push(otherMarker);
                  visited.add(otherMarker);
                }
              }
              clusters.push(cluster);
            }
            return clusters;
          },
          render: (cluster) => {
            const count = cluster.markers.length;
            if (count === 1) return null;
            
            const div = document.createElement('div');
            div.className = 'marker-cluster';
            div.style.cssText = `
              width: 40px; height: 40px; border-radius: 50%;
              background: #ff5a00; color: white;
              display: flex; align-items: center; justify-content: center;
              font-weight: 800; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 3px solid white;
            `;
            div.textContent = count > 99 ? '99+' : count;
            return div;
          },
        },
      });
    }
  }, []);

  const onMapUnmount = useCallback(() => {
    if (clustererRef.current) {
      clustererRef.current.setMap(null);
      clustererRef.current = null;
    }
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

  // ── Fetch restaurant markers from backend (with pre-geocoded coords) ────────
  useEffect(() => {
    if (!isLoaded || !restaurants.length) return;

    const loadMarkers = async () => {
      try {
        // Use backend batch geocode endpoint for any restaurants missing coords
        const addressesToGeocode = restaurants
          .filter(r => !r.lat && !r.lng && !r.location?.lat && !r.location?.lng && r.address)
          .map(r => r.address);
        
        let geocodedMap = {};
        if (addressesToGeocode.length > 0) {
          const res = await fetch(`${API_BASE}/maps/geocode-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ addresses: addressesToGeocode }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              geocodedMap = data.data.reduce((acc, item) => {
                if (item.success) acc[item.address] = { lat: item.lat, lng: item.lng };
                return acc;
              }, {});
            }
          }
        }

        const markers = restaurants.map((restaurant) => {
          let lat = restaurant.lat || restaurant.location?.lat;
          let lng = restaurant.lng || restaurant.location?.lng;
          
          if ((lat === undefined || lat === null) && restaurant.address) {
            const geo = geocodedMap[restaurant.address];
            if (geo) { lat = geo.lat; lng = geo.lng; }
          }
          
          if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
            return { restaurant, lat, lng };
          }
          return null;
        }).filter(Boolean);

        // Create Google Maps Marker objects for clustering
        const gMarkers = markers.map(({ restaurant, lat, lng }) => {
          const marker = new window.google.maps.Marker({
            position: { lat, lng },
            title: restaurant.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#ff5a00',
              fillOpacity: 0.9,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            zIndex: 1,
          });
          // Store restaurant data on marker for click handling
          marker.restaurantData = restaurant;
          return marker;
        });

        setRestaurantMarkers(markers);
        
        // Update clusterer
        if (clustererRef.current && mapRef.current) {
          clustererRef.current.setMarkers(gMarkers);
        }
      } catch (err) {
        console.error('[RestaurantsMapView] Error loading markers:', err);
      }
    };

    loadMarkers();
  }, [restaurants, isLoaded, API_BASE]);

  // ── Restaurant marker icon (for non-clustered markers) ──────────────────────
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

  // ── Handle marker click for InfoWindow ─────────────────────────────────────
  const handleMarkerClick = useCallback((marker) => {
    if (marker.restaurantData) {
      setActiveInfoWindow(activeInfoWindow === marker.restaurantData._id ? null : marker.restaurantData._id);
    }
  }, [activeInfoWindow]);

  // ── Render: missing API key ────────────────────────────────────────────────
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
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

        {/* ── Restaurant markers (clustered) ── */}
        {restaurantMarkers.map(({ restaurant, lat, lng }) => (
          <Marker
            key={restaurant._id}
            position={{ lat, lng }}
            icon={restaurantIconDef}
            title={restaurant.name}
            onClick={() => handleMarkerClick({ restaurantData: restaurant })}
            zIndex={2}
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
