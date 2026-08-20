import React, { useState, useEffect, useRef } from 'react';

/**
 * AppIntro component for Corior Web.
 * Plays the official Corior intro video (/intro/corior-intro.mp4) once per session.
 * Features:
 * - Responsive aspect ratio preservation (object-contain)
 * - Muted autoplay for maximum browser compatibility
 * - Graceful fade-out transition upon completion
 * - Immediate fallback on load error / timeout
 * - Skip option for user convenience
 */
export default function AppIntro({ onComplete }) {
  const [fading, setFading] = useState(false);
  const videoRef = useRef(null);
  const completedRef = useRef(false);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setFading(true);
    setTimeout(() => {
      onComplete?.();
    }, 450);
  };

  useEffect(() => {
    // Fallback safety timeout (8s max in case video fails or onEnded doesn't fire)
    const fallbackTimer = setTimeout(() => {
      handleFinish();
    }, 8000);

    // Attempt video playback
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.warn("[Corior Intro] Autoplay blocked or unavailable, falling back:", err);
        handleFinish();
      });
    }

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-500 ease-out select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Corior Intro Screen"
    >
      <div className="relative w-full h-full max-w-full max-h-full flex items-center justify-center">
        <video
          ref={videoRef}
          src="/intro/corior-intro.mp4"
          autoPlay
          muted
          playsInline
          onEnded={handleFinish}
          onError={handleFinish}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Skip button for user convenience */}
        <button
          type="button"
          onClick={handleFinish}
          className="absolute top-5 right-5 sm:top-8 sm:right-8 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all z-20 cursor-pointer border border-white/15"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
