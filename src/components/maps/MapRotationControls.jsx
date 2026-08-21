import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Compass, RotateCw, RotateCcw } from 'lucide-react';

/**
 * MapRotationControls
 *
 * Provides Google Maps-style interactive map rotation, compass indicator with North-reset,
 * two-finger mobile rotation & tilt gestures, and 2D/3D pitch toggling.
 *
 * Props:
 *   mapRef: React ref object containing the google.maps.Map instance
 *   containerRef: React ref object containing the map DOM wrapper (for 2-finger touch gestures)
 *   position: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' (default: 'bottom-right')
 *   showStepButtons: boolean (show -45° / +45° rotate buttons, default: false)
 *   show3DTilt: boolean (show 2D/3D tilt toggle, default: true)
 *   className: string (custom styling overrides)
 */
export default function MapRotationControls({
  mapRef,
  containerRef,
  position = 'bottom-right',
  showStepButtons = false,
  show3DTilt = true,
  className = '',
}) {
  const [heading, setHeading] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [isRotating, setIsRotating] = useState(false);

  // Touch gesture tracking refs
  const touchStateRef = useRef({
    startAngle: 0,
    startHeading: 0,
    startDistance: 0,
    startMidY: 0,
    startTilt: 0,
    isTwoFinger: false,
  });

  // ── Sync heading & tilt from map instance ───────────────────────────────────
  useEffect(() => {
    const map = mapRef?.current;
    if (!map || !window.google) return;

    // Read initial heading/tilt
    if (typeof map.getHeading === 'function') {
      setHeading(map.getHeading() || 0);
    }
    if (typeof map.getTilt === 'function') {
      setTilt(map.getTilt() || 0);
    }

    // Listen for heading changes from user gestures or API calls
    const headingListener = map.addListener('heading_changed', () => {
      if (typeof map.getHeading === 'function') {
        setHeading(map.getHeading() || 0);
      }
    });

    // Listen for tilt changes
    const tiltListener = map.addListener('tilt_changed', () => {
      if (typeof map.getTilt === 'function') {
        setTilt(map.getTilt() || 0);
      }
    });

    return () => {
      if (window.google?.maps?.event) {
        window.google.maps.event.removeListener(headingListener);
        window.google.maps.event.removeListener(tiltListener);
      }
    };
  }, [mapRef]);

  // ── 2-Finger Touch Gesture Handling for Rotation & Tilt ──────────────────────
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const getTouchAngle = (t1, t2) => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.atan2(dy, dx) * (180 / Math.PI);
    };

    const getTouchDistance = (t1, t2) => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.hypot(dx, dy);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        const map = mapRef?.current;
        const currentHeading = (map && typeof map.getHeading === 'function') ? (map.getHeading() || 0) : heading;
        const currentTilt = (map && typeof map.getTilt === 'function') ? (map.getTilt() || 0) : tilt;

        touchStateRef.current = {
          startAngle: getTouchAngle(e.touches[0], e.touches[1]),
          startHeading: currentHeading,
          startDistance: getTouchDistance(e.touches[0], e.touches[1]),
          startMidY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          startTilt: currentTilt,
          isTwoFinger: true,
        };
        setIsRotating(true);
      } else {
        touchStateRef.current.isTwoFinger = false;
        setIsRotating(false);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && touchStateRef.current.isTwoFinger) {
        const map = mapRef?.current;
        if (!map) return;

        const currentAngle = getTouchAngle(e.touches[0], e.touches[1]);
        const angleDelta = currentAngle - touchStateRef.current.startAngle;

        // Calculate new bearing/heading
        let newHeading = (touchStateRef.current.startHeading - angleDelta) % 360;
        if (newHeading < 0) newHeading += 360;
        newHeading = Math.round(newHeading);

        if (typeof map.setHeading === 'function') {
          map.setHeading(newHeading);
          setHeading(newHeading);
        }

        // Two-finger vertical drag for pitch / tilt
        const currentMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const dy = currentMidY - touchStateRef.current.startMidY;
        const distChange = Math.abs(getTouchDistance(e.touches[0], e.touches[1]) - touchStateRef.current.startDistance);

        // If pinch is small and vertical drag is significant, adjust tilt
        if (distChange < 40 && Math.abs(dy) > 15) {
          const tiltDelta = -dy * 0.4;
          const newTilt = Math.max(0, Math.min(67.5, Math.round(touchStateRef.current.startTilt + tiltDelta)));
          if (typeof map.setTilt === 'function') {
            map.setTilt(newTilt);
            setTilt(newTilt);
          }
        }
      }
    };

    const handleTouchEnd = () => {
      touchStateRef.current.isTwoFinger = false;
      setIsRotating(false);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, mapRef, heading, tilt]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  // Reset to North (0° heading and 0° tilt)
  const resetNorth = useCallback(() => {
    const map = mapRef?.current;
    if (!map) return;

    if (typeof map.setHeading === 'function') {
      map.setHeading(0);
    }
    if (typeof map.setTilt === 'function') {
      map.setTilt(0);
    }
    setHeading(0);
    setTilt(0);
  }, [mapRef]);

  // Step rotation by delta degrees
  const rotateBy = useCallback((delta) => {
    const map = mapRef?.current;
    if (!map) return;

    const currentHeading = typeof map.getHeading === 'function' ? (map.getHeading() || 0) : heading;
    let newHeading = (currentHeading + delta) % 360;
    if (newHeading < 0) newHeading += 360;
    newHeading = Math.round(newHeading);

    if (typeof map.setHeading === 'function') {
      map.setHeading(newHeading);
    }
    setHeading(newHeading);
  }, [mapRef, heading]);

  // Toggle 3D tilt (0° flat ↔ 45° 3D perspective)
  const toggle3DTilt = useCallback(() => {
    const map = mapRef?.current;
    if (!map) return;

    const targetTilt = tilt > 0 ? 0 : 45;
    if (typeof map.setTilt === 'function') {
      map.setTilt(targetTilt);
    }
    setTilt(targetTilt);
  }, [mapRef, tilt]);

  // Position CSS mapping
  const positionClasses = {
    'top-right': 'top-3 right-3',
    'bottom-right': 'bottom-20 right-3 sm:bottom-24 sm:right-3.5',
    'top-left': 'top-3 left-3',
    'bottom-left': 'bottom-20 left-3 sm:bottom-24 sm:left-3.5',
  }[position] || 'bottom-20 right-3';

  const isNorth = Math.round(heading) === 0;

  return (
    <div
      className={`absolute ${positionClasses} z-20 flex flex-col items-center gap-1.5 pointer-events-auto select-none ${className}`}
    >
      {/* ── 1. COMPASS / NORTH RESET BUTTON (Google Maps Style) ── */}
      <button
        type="button"
        onClick={resetNorth}
        title={isNorth ? 'Map is facing North (0°)' : `Facing ${Math.round(heading)}° — Tap to reset to North`}
        aria-label="Reset map orientation to North"
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#141926]/95 backdrop-blur-md border border-gray-200/90 dark:border-white/10 shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer relative group ${
          !isNorth ? 'ring-2 ring-primary/40 bg-violet-50/80 dark:bg-violet-950/40' : ''
        }`}
      >
        {/* Animated Rotating Compass Dial */}
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
          style={{ transform: `rotate(${-heading}deg)` }}
        >
          {/* Custom Stylized High-Contrast Compass Needle */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* North Point (Vibrant Red) */}
            <polygon points="12,2 16,12 12,10" fill="#EF4444" stroke="#DC2626" strokeWidth="0.5" />
            <polygon points="12,2 8,12 12,10" fill="#F87171" stroke="#DC2626" strokeWidth="0.5" />
            {/* South Point (Dark Slate / Grey) */}
            <polygon points="12,22 16,12 12,14" fill="#64748B" stroke="#475569" strokeWidth="0.5" />
            <polygon points="12,22 8,12 12,14" fill="#94A3B8" stroke="#475569" strokeWidth="0.5" />
            {/* Center Pivot Ring */}
            <circle cx="12" cy="12" r="2.5" fill="white" stroke="#334155" strokeWidth="1" />
          </svg>
        </div>

        {/* Small "N" Badge at Top */}
        <span
          className="absolute -top-1 font-black text-[8px] sm:text-[9px] text-red-600 dark:text-red-400 bg-white/90 dark:bg-[#141926] px-1 rounded-full shadow-2xs border border-red-200/60 dark:border-red-900/40 pointer-events-none"
        >
          N
        </span>
      </button>

      {/* ── 2. OPTIONAL STEP ROTATION BUTTONS (Desktop / Click Friendly) ── */}
      {showStepButtons && (
        <div className="flex flex-col gap-1 bg-white/95 dark:bg-[#141926]/95 backdrop-blur-md border border-gray-200/90 dark:border-white/10 rounded-xl p-0.5 shadow-md">
          <button
            type="button"
            onClick={() => rotateBy(-45)}
            title="Rotate Left (-45°)"
            aria-label="Rotate map 45 degrees counter-clockwise"
            className="w-8 h-8 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => rotateBy(45)}
            title="Rotate Right (+45°)"
            aria-label="Rotate map 45 degrees clockwise"
            className="w-8 h-8 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 3. 3D TILT / PITCH TOGGLE BUTTON (2D ↔ 3D 45° Perspective) ── */}
      {show3DTilt && (
        <button
          type="button"
          onClick={toggle3DTilt}
          title={tilt > 0 ? `3D Perspective Active (${tilt}°) — Tap for 2D Flat view` : 'Switch to 3D Perspective (45° Tilt)'}
          aria-label="Toggle 3D map tilt"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#141926]/95 backdrop-blur-md border border-gray-200/90 dark:border-white/10 shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
            tilt > 0 ? 'bg-primary text-white border-primary shadow-primary/25 ring-2 ring-primary/40' : 'text-gray-700 dark:text-gray-200'
          }`}
        >
          <span className="font-display font-black text-[10px] sm:text-xs tracking-tight">
            {tilt > 0 ? '2D' : '3D'}
          </span>
        </button>
      )}
    </div>
  );
}
