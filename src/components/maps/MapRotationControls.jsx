import React, { useEffect, useCallback } from 'react';

/**
 * MapRotationControls
 * Disabled globally per Jinkzo UI specification (2D normal map only).
 * Ensures camera tilt and heading remain locked to 0 and renders no controls.
 */
export default function MapRotationControls({ map, mapRef }) {
  const getActiveMap = useCallback(() => {
    return map || mapRef?.current || null;
  }, [map, mapRef]);

  useEffect(() => {
    const activeMap = getActiveMap();
    if (!activeMap) return;
    try {
      if (typeof activeMap.setTilt === 'function') activeMap.setTilt(0);
      if (typeof activeMap.setHeading === 'function') activeMap.setHeading(0);
    } catch (_) {}
  }, [getActiveMap]);

  return null;
}
