import React, { useState, useEffect, useRef } from 'react';

/**
 * Jinkzo Website Startup Logo Reveal Animation
 * 
 * Sequence (~1.25s–1.45s total):
 * - 0.00s–0.35s: Isolated Black J Emblem reveals (opacity 0->1, scale 0.85->1) on pure white.
 * - 0.35s–0.70s: Wordmark reveals — JINK from left (-30px->0), ZO from right (+30px->0).
 * - 0.70s–0.95s: Tagline "FOOD & RIDE DELIVERY" fades in subtly (translateY 6px->0).
 * - 0.95s–1.25s: Brand lockup hold.
 * - 1.25s–1.45s: Entire white overlay fades out smoothly and unmounts, revealing the website.
 */
export default function AppIntro({ onComplete }) {
  const [fading, setFading] = useState(false);
  const completedRef = useRef(false);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setFading(true);
    setTimeout(() => {
      onComplete?.();
    }, 200);
  };

  useEffect(() => {
    // Phase 5 trigger: Start fade-out at 1.25s
    const exitTimer = setTimeout(() => {
      handleFinish();
    }, 1250);

    // Fail-safe safety timeout (2.5s max in case of any animation stalls)
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 2500);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-white flex flex-col items-center justify-center select-none transition-opacity duration-200 ease-out ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Jinkzo Startup Screen"
    >
      <style>{`
        @keyframes jinkzo-emblem-reveal {
          0% {
            opacity: 0;
            transform: scale(0.85);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes jinkzo-wordmark-jink {
          0% {
            opacity: 0;
            transform: translateX(-30px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes jinkzo-wordmark-zo {
          0% {
            opacity: 0;
            transform: translateX(30px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes jinkzo-tagline-reveal {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .jinkzo-anim-emblem {
          animation: jinkzo-emblem-reveal 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }

        .jinkzo-anim-jink {
          animation: jinkzo-wordmark-jink 350ms cubic-bezier(0.16, 1, 0.3, 1) 350ms both;
          will-change: transform, opacity;
        }

        .jinkzo-anim-zo {
          animation: jinkzo-wordmark-zo 350ms cubic-bezier(0.16, 1, 0.3, 1) 350ms both;
          will-change: transform, opacity;
        }

        .jinkzo-anim-tagline {
          animation: jinkzo-tagline-reveal 250ms cubic-bezier(0.16, 1, 0.3, 1) 700ms both;
          will-change: transform, opacity;
        }
      `}</style>

      <div className="flex flex-col items-center justify-center">
        {/* Phase 1: Isolated Black J Emblem (no circular background) */}
        <img
          src="/branding/logo-emblem.png"
          alt="Jinkzo"
          className="jinkzo-anim-emblem w-[68px] h-[92px] object-contain"
          onError={handleFinish}
        />

        {/* Phase 2: Wordmark (JINK in black from left, ZO in orange from right) */}
        <div className="flex items-center justify-center mt-4">
          <img
            src="/branding/logo-wordmark-jink.png"
            alt="JINK"
            className="jinkzo-anim-jink w-[81px] h-[36px] object-contain"
            onError={handleFinish}
          />
          <img
            src="/branding/logo-wordmark-zo.png"
            alt="ZO"
            className="jinkzo-anim-zo w-[51px] h-[36px] object-contain"
            onError={handleFinish}
          />
        </div>

        {/* Phase 3: Tagline */}
        <img
          src="/branding/logo-tagline.png"
          alt="FOOD & RIDE DELIVERY"
          className="jinkzo-anim-tagline w-[146px] h-[10px] object-contain mt-3"
          onError={handleFinish}
        />
      </div>
    </div>
  );
}
