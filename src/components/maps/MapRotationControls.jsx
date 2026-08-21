import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RotateCw, RotateCcw, Compass, Navigation } from 'lucide-react';

/**
 * Calculate standard 3D compass heading from Euler angles (alpha, beta, gamma).
 * Accurately models the forward-pointing vector of the device when held in hand.
 */
const getCompassHeadingFromEuler = (alpha, beta, gamma) => {
  const degToRad = Math.PI / 180;
  const _x = (beta || 0) * degToRad;
  const _y = (gamma || 0) * degToRad;
  const _z = (alpha || 0) * degToRad;

  const cX = Math.cos(_x);
  const cY = Math.cos(_y);
  const cZ = Math.cos(_z);
  const sX = Math.sin(_x);
  const sY = Math.sin(_y);
  const sZ = Math.sin(_z);

  // Components of the vector pointing out the top of the device
  const Vx = -cZ * sY - sZ * sX * cY;
  const Vy = -sZ * sY + cZ * sX * cY;

  let heading = Math.atan2(Vx, Vy) * (180 / Math.PI);
  if (heading < 0) heading += 360;
  return heading;
};

/**
 * Get screen orientation angle (0, 90, 180, 270) to adjust sensor heading for landscape/portrait.
 */
const getScreenOrientationAngle = () => {
  if (typeof window === 'undefined') return 0;
  if (window.screen?.orientation?.angle !== undefined) {
    return window.screen.orientation.angle;
  }
  if (typeof window.orientation === 'number') {
    return window.orientation;
  }
  return 0;
};

/**
 * Calculate the shortest angular difference in degrees (-180 to +180).
 */
const shortestAngleDiff = (target, current) => {
  let diff = (target - current) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
};

/**
 * MapRotationControls
 *
 * Connects directly to the active Google Maps instance for camera control:
 * 1. Two-finger touch gestures for bearing rotation and tilt/pitch
 * 2. Real Phone-Compass Follow Mode (DeviceOrientation API with iOS permission & Android Euler calc)
 * 3. Compass button showing current bearing with 1-tap North-up reset (heading=0, tilt=0)
 * 4. 3D / 2D perspective toggle button (tilt=45° ↔ tilt=0°)
 * 5. Optional -45° / +45° step rotation buttons for mouse/desktop interaction
 * 6. Viewport ResizeObserver ensuring vector map always fills 100% of container
 */
export default function MapRotationControls({
  map,
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
  const [isFollowingCompass, setIsFollowingCompass] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Active map reference helper
  const getActiveMap = useCallback(() => {
    return map || mapRef?.current || null;
  }, [map, mapRef]);

  // Touch gesture tracking refs
  const touchStateRef = useRef({
    startAngle: 0,
    startHeading: 0,
    startDistance: 0,
    startMidY: 0,
    startTilt: 0,
    isTwoFinger: false,
  });

  // Compass follow smoothing refs
  const smoothedHeadingRef = useRef(0);
  const targetHeadingRef = useRef(0);
  const animFrameRef = useRef(null);
  const lastAppliedHeadingRef = useRef(0);
  const isFollowingCompassRef = useRef(false);
  isFollowingCompassRef.current = isFollowingCompass;

  // Show transient user feedback
  const showFeedback = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setFeedbackToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setFeedbackToast(null);
    }, 2200);
  }, []);

  // ── Apply Camera Orientation to Google Maps ──────────────────────────────────
  const applyCamera = useCallback((newHeading, newTilt) => {
    const activeMap = getActiveMap();
    const cleanHeading = Math.round(((newHeading % 360) + 360) % 360);
    const cleanTilt = Math.max(0, Math.min(67.5, Math.round(newTilt)));

    if (activeMap) {
      // 1. Primary: moveCamera (Google Maps Camera API)
      try {
        if (typeof activeMap.moveCamera === 'function') {
          activeMap.moveCamera({
            heading: cleanHeading,
            tilt: cleanTilt,
          });
        }
      } catch (_) {}

      // 2. Secondary: setHeading
      try {
        if (typeof activeMap.setHeading === 'function') {
          activeMap.setHeading(cleanHeading);
        }
      } catch (_) {}

      // 3. Secondary: setTilt
      try {
        if (typeof activeMap.setTilt === 'function') {
          activeMap.setTilt(cleanTilt);
        }
      } catch (_) {}
    }

    setHeading(cleanHeading);
    setTilt(cleanTilt);
  }, [getActiveMap]);

  // ── Viewport Resize Observer: ensures map fills 100% of container without gray borders ──
  useEffect(() => {
    const container = containerRef?.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      const activeMap = getActiveMap();
      if (activeMap && window.google?.maps?.event) {
        window.google.maps.event.trigger(activeMap, 'resize');
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [containerRef, getActiveMap]);

  // ── Sync camera heading & tilt from live map instance ───────────────────────
  useEffect(() => {
    const activeMap = getActiveMap();
    if (!activeMap || !window.google) return;

    const updateCameraState = () => {
      if (typeof activeMap.getHeading === 'function') {
        const h = activeMap.getHeading();
        if (typeof h === 'number' && !isNaN(h)) {
          setHeading(Math.round(h));
        }
      }
      if (typeof activeMap.getTilt === 'function') {
        const t = activeMap.getTilt();
        if (typeof t === 'number' && !isNaN(t)) {
          setTilt(Math.round(t));
        }
      }
    };

    updateCameraState();

    const headingListener = activeMap.addListener('heading_changed', updateCameraState);
    const tiltListener = activeMap.addListener('tilt_changed', updateCameraState);

    return () => {
      if (window.google?.maps?.event) {
        window.google.maps.event.removeListener(headingListener);
        window.google.maps.event.removeListener(tiltListener);
      }
    };
  }, [map, mapRef?.current, getActiveMap]);

  // ── Device Orientation Listener for Phone Compass Follow Mode ───────────────
  useEffect(() => {
    if (!isFollowingCompass) return;

    const handleOrientationEvent = (e) => {
      if (!isFollowingCompassRef.current) return;
      let rawHeading = null;

      // 1. iOS Safari: webkitCompassHeading (0 = Magnetic North, clockwise)
      if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) {
        rawHeading = e.webkitCompassHeading;
      } else if (typeof e.alpha === 'number' && !isNaN(e.alpha)) {
        // 2. Android & W3C Standard: calculate 3D Euler compass heading
        rawHeading = getCompassHeadingFromEuler(e.alpha, e.beta, e.gamma);
      }

      if (rawHeading === null) return;

      // Compensate for screen orientation (landscape / portrait)
      const screenAngle = getScreenOrientationAngle();
      const adjustedHeading = (rawHeading + screenAngle + 360) % 360;

      targetHeadingRef.current = adjustedHeading;
    };

    // Prefer absolute device orientation where available
    const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventName, handleOrientationEvent, true);
    if (eventName !== 'deviceorientation') {
      window.addEventListener('deviceorientation', handleOrientationEvent, true);
    }

    return () => {
      window.removeEventListener(eventName, handleOrientationEvent, true);
      if (eventName !== 'deviceorientation') {
        window.removeEventListener('deviceorientation', handleOrientationEvent, true);
      }
    };
  }, [isFollowingCompass]);

  // ── Smooth Animation Loop for Compass Follow Mode ────────────────────────────
  useEffect(() => {
    if (!isFollowingCompass) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const loop = () => {
      if (!isFollowingCompassRef.current) return;

      const target = targetHeadingRef.current;
      const current = smoothedHeadingRef.current;
      const diff = shortestAngleDiff(target, current);

      // Apply low-pass smoothing filter (ignore noise < 0.4°, faster for big turns)
      if (Math.abs(diff) > 0.4) {
        const factor = Math.abs(diff) > 25 ? 0.35 : Math.abs(diff) > 8 ? 0.22 : 0.15;
        const nextHeading = (current + diff * factor + 360) % 360;
        smoothedHeadingRef.current = nextHeading;

        // Apply to Google Maps camera if change is perceptible (> 0.6°)
        if (Math.abs(shortestAngleDiff(nextHeading, lastAppliedHeadingRef.current)) >= 0.6) {
          lastAppliedHeadingRef.current = nextHeading;
          applyCamera(nextHeading, tilt);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isFollowingCompass, applyCamera, tilt]);

  // ── Toggle Follow Direction Mode ─────────────────────────────────────────────
  const toggleFollowCompass = async () => {
    if (isFollowingCompass) {
      setIsFollowingCompass(false);
      showFeedback('Direction follow off');
      return;
    }

    // iOS 13+ permission request
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          alert('Compass permission is required to follow your direction.');
          return;
        }
      } catch (err) {
        console.warn('Device orientation permission error:', err);
        alert('Compass permission is required to follow your direction.');
        return;
      }
    }

    smoothedHeadingRef.current = heading;
    targetHeadingRef.current = heading;
    lastAppliedHeadingRef.current = heading;
    setIsFollowingCompass(true);
    showFeedback('Following your direction');
  };

  // ── 2-Finger Touch Gesture Handling for Manual Rotation & Tilt ───────────────
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
        // Manual gesture automatically exits phone-compass follow mode
        if (isFollowingCompassRef.current) {
          setIsFollowingCompass(false);
          showFeedback('Direction follow off');
        }

        const activeMap = getActiveMap();
        const currentHeading = (activeMap && typeof activeMap.getHeading === 'function')
          ? (activeMap.getHeading() || 0)
          : heading;
        const currentTilt = (activeMap && typeof activeMap.getTilt === 'function')
          ? (activeMap.getTilt() || 0)
          : tilt;

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
        const currentAngle = getTouchAngle(e.touches[0], e.touches[1]);
        const angleDelta = currentAngle - touchStateRef.current.startAngle;

        let newHeading = (touchStateRef.current.startHeading - angleDelta) % 360;
        if (newHeading < 0) newHeading += 360;
        newHeading = Math.round(newHeading);

        const currentMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const dy = currentMidY - touchStateRef.current.startMidY;
        const distChange = Math.abs(getTouchDistance(e.touches[0], e.touches[1]) - touchStateRef.current.startDistance);

        let newTilt = touchStateRef.current.startTilt;
        if (distChange < 50 && Math.abs(dy) > 12) {
          const tiltDelta = -dy * 0.35;
          newTilt = Math.max(0, Math.min(67.5, Math.round(touchStateRef.current.startTilt + tiltDelta)));
        }

        applyCamera(newHeading, newTilt);
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
  }, [containerRef, getActiveMap, applyCamera, heading, tilt, showFeedback]);

  // ── Manual Actions ──────────────────────────────────────────────────────────

  // Reset to North (0° heading and 0° tilt)
  const resetNorth = useCallback(() => {
    if (isFollowingCompass) {
      setIsFollowingCompass(false);
      showFeedback('Direction follow off');
    }
    applyCamera(0, 0);
  }, [applyCamera, isFollowingCompass, showFeedback]);

  // Step rotation by delta degrees
  const rotateBy = useCallback((delta) => {
    if (isFollowingCompass) {
      setIsFollowingCompass(false);
      showFeedback('Direction follow off');
    }
    const newHeading = (heading + delta + 360) % 360;
    applyCamera(newHeading, tilt);
  }, [applyCamera, heading, tilt, isFollowingCompass, showFeedback]);

  // Toggle 3D tilt (0° flat ↔ 45° 3D perspective)
  const toggle3DTilt = useCallback(() => {
    const targetTilt = tilt > 0 ? 0 : 45;
    applyCamera(heading, targetTilt);
  }, [applyCamera, heading, tilt]);

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
      {/* ── Transient Status Toast / Pill ── */}
      {feedbackToast && (
        <div className="absolute -top-8 right-0 whitespace-nowrap bg-black/85 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm pointer-events-none animate-fade-in border border-white/15">
          {feedbackToast}
        </div>
      )}

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

      {/* ── 2. FOLLOW DIRECTION (PHONE COMPASS) TOGGLE BUTTON ── */}
      <button
        type="button"
        onClick={toggleFollowCompass}
        title={isFollowingCompass ? 'Following phone direction (Tap to turn off)' : 'Follow My Direction (Phone Compass)'}
        aria-label="Toggle follow phone direction"
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl backdrop-blur-md border shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer relative ${
          isFollowingCompass
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/30 ring-2 ring-emerald-400/50'
            : 'bg-white/95 dark:bg-[#141926]/95 border-gray-200/90 dark:border-white/10 text-gray-700 dark:text-gray-200'
        }`}
      >
        <Navigation
          className={`w-4 h-4 transition-transform duration-300 ${
            isFollowingCompass ? 'animate-pulse text-white rotate-45' : 'text-gray-700 dark:text-gray-200'
          }`}
        />
        {isFollowingCompass && (
          <span className="absolute -bottom-1 font-black text-[7px] bg-white text-emerald-700 px-1 rounded-full shadow-xs uppercase">
            Live
          </span>
        )}
      </button>

      {/* ── 3. OPTIONAL STEP ROTATION BUTTONS (Desktop / Click Friendly) ── */}
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

      {/* ── 4. 3D TILT / PITCH TOGGLE BUTTON (2D ↔ 3D 45° Perspective) ── */}
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

      {/* ── 5. Rotate Button (45° step) ── */}
      <button
        type="button"
        onClick={() => rotateBy(45)}
        title="Rotate map 45° clockwise"
        aria-label="Rotate map 45 degrees clockwise"
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/95 dark:bg-[#141926]/95 backdrop-blur-md border border-gray-200/90 dark:border-white/10 shadow-md hover:shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer ${
          'text-gray-700 dark:text-gray-200'
        }`}
        onMouseDown={(e) => {
          const interval = setInterval(() => rotateBy(5), 100);
          const stop = () => clearInterval(interval);
          e.currentTarget.addEventListener('mouseup', stop, { once: true });
          e.currentTarget.addEventListener('mouseleave', stop, { once: true });
        }}
      >
        <RotateCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
