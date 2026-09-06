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

export const MAX_ACCEPTABLE_GPS_ACCURACY = 5000; // 5000 meters (5km) threshold for delivery location

/**
 * Validates GPS fix coordinates and accuracy.
 * Ensures lat and lng are finite and within range, and accuracy is positive and <= maxAccuracy.
 */
export function isValidGpsFix(lat, lng, accuracy, maxAccuracy = MAX_ACCEPTABLE_GPS_ACCURACY) {
  if (!isValidCoordinates(lat, lng)) return false;
  if (accuracy == null || !Number.isFinite(Number(accuracy))) return false;
  const acc = Number(accuracy);
  if (acc <= 0 || acc > maxAccuracy) return false;
  return true;
}

/**
 * Returns structured tier info for displaying GPS accuracy.
 * Never displays numeric value if accuracy exceeds 2000m.
 * Returns null if accuracy is invalid or exceeds MAX_ACCEPTABLE_GPS_ACCURACY (e.g. 2000000m).
 */
export function getGpsAccuracyTier(accuracy) {
  if (accuracy == null || !Number.isFinite(Number(accuracy))) return null;
  const acc = Number(accuracy);
  if (acc <= 0 || acc > MAX_ACCEPTABLE_GPS_ACCURACY) return null;

  if (acc <= 20) {
    return {
      level: 'Excellent',
      text: `±${Math.round(acc)}m (Excellent)`,
      colorClass: 'bg-emerald-600',
      showRadius: true,
      warning: null,
    };
  }
  if (acc <= 50) {
    return {
      level: 'Good',
      text: `±${Math.round(acc)}m (Good)`,
      colorClass: 'bg-violet-600',
      showRadius: true,
      warning: null,
    };
  }
  if (acc <= 100) {
    return {
      level: 'Moderate',
      text: `±${Math.round(acc)}m (Moderate)`,
      colorClass: 'bg-amber-600',
      showRadius: true,
      warning: null,
    };
  }
  if (acc <= 500) {
    return {
      level: 'Approximate',
      text: `±${Math.round(acc)}m (Approximate location)`,
      colorClass: 'bg-amber-600',
      showRadius: true,
      warning: 'Approximate location. Verify pin position on map.',
    };
  }
  if (acc <= 2000) {
    return {
      level: 'Low',
      text: `±${Math.round(acc)}m (Low accuracy)`,
      colorClass: 'bg-orange-600',
      showRadius: true,
      warning: 'Low accuracy. Move pin manually to exact location.',
    };
  }
  // 2000m to 5000m: do not show numeric value
  return {
    level: 'Very Low',
    text: 'Very low accuracy — move pin manually',
    colorClass: 'bg-red-600',
    showRadius: false,
    warning: 'Move pin manually to exact location',
  };
}
