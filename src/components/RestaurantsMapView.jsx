import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [15.8601, 78.2618];

const pulsingDotStyle = `
  .user-pulse-dot {
    width: 14px;
    height: 14px;
    background: #3b82f6;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
    animation: user-pulse 1.8s infinite;
    display: inline-block;
  }
  @keyframes user-pulse {
    0% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
    }
    100% {
      transform: scale(0.95);
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
    }
  }
`;

const geocodeAddress = async (address) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=in`;
    const res = await fetch(url, { 
      headers: { 
        'Accept-Language': 'en', 
        'User-Agent': 'Jinkzo-App/1.0 (support@Jinkzo.com)' 
      } 
    });
    const data = await res.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (_) {
    // Ignore geocoding errors
  }
  return null;
};

export default function RestaurantsMapView({ restaurants = [], userLocation = null }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerGroupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const [geocodedCache, setGeocodedCache] = useState({});

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = userLocation ? [userLocation.lat, userLocation.lng] : DEFAULT_CENTER;
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ prefix: '© OpenStreetMap' }).addTo(map);

    const markerGroup = L.layerGroup().addTo(map);
    markerGroupRef.current = markerGroup;

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Handle user location updates / centering
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    if (userLocation) {
      const userLatLng = [userLocation.lat, userLocation.lng];
      map.setView(userLatLng, map.getZoom());

      // Update or create user pulsing dot marker
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLatLng);
      } else {
        const userIcon = L.divIcon({
          html: '<div class="user-pulse-dot"></div>',
          className: '',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        userMarkerRef.current = L.marker(userLatLng, { icon: userIcon }).addTo(map);
      }
    }
  }, [userLocation]);

  // 3. Geocode and place restaurant markers
  useEffect(() => {
    if (!mapRef.current || !markerGroupRef.current) return;

    const markerGroup = markerGroupRef.current;
    markerGroup.clearLayers();

    const loadMarkers = async () => {
      const newCache = { ...geocodedCache };
      let cacheUpdated = false;

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
          // Geocode
          const coords = await geocodeAddress(restaurant.address);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            newCache[restaurant.address] = coords;
            cacheUpdated = true;
          }
        }

        if (lat !== null && lng !== null) {
          // Place marker
          const marker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#ff5a00',
            color: '#ffffff',
            weight: 2,
            fillOpacity: 0.9
          });

          const popupContent = `
            <div style="font-family: inherit; min-width: 180px; padding: 4px;">
              <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 850; color: #111827;">${restaurant.name}</h4>
              <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: #4b5563; margin-bottom: 6px;">
                <span style="color: #ff5a00;">⭐ ${restaurant.rating || '4.0'}</span>
                <span style="color: #e5e7eb;">•</span>
                <span>⏱️ ${restaurant.deliveryTime || '30'} mins</span>
              </div>
              <p style="margin: 0 0 8px 0; font-size: 10px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">
                ${(restaurant.cuisineTags || []).join(', ')}
              </p>
              <a href="/restaurant/${restaurant._id}" style="display: block; text-align: center; background: #ff5a00; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 800; padding: 7px 12px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px; transition: background 0.2s;">
                View Menu
              </a>
            </div>
          `;

          marker.bindPopup(popupContent);
          markerGroup.addLayer(marker);
        }
      }

      if (cacheUpdated) {
        setGeocodedCache(newCache);
      }
    };

    loadMarkers();
  }, [restaurants]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-line shadow-xs bg-surface" style={{ height: '550px' }}>
      <style>{pulsingDotStyle}</style>
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ minHeight: '100%' }} />
    </div>
  );
}
