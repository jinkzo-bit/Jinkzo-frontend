/**
 * Returns true if lat and lng are valid finite coordinate numbers.
 */
export function isValidCoordinates(lat, lng) {
  return (
    lat != null &&
    lng != null &&
    isFinite(Number(lat)) &&
    isFinite(Number(lng)) &&
    Number(lat) >= -90 &&
    Number(lat) <= 90 &&
    Number(lng) >= -180 &&
    Number(lng) <= 180
  );
}

/**
 * Format coordinates for display.
 */
export function formatCoords(lat, lng, decimals = 5) {
  if (!isValidCoordinates(lat, lng)) return '';
  return `${Number(lat).toFixed(decimals)}°N ${Number(lng).toFixed(decimals)}°E`;
}
