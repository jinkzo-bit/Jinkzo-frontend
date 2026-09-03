import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../utils/uploadUtil';
import {
  computeBannerFontSize,
  getSingleImageUrl,
  getHomeHeroMetrics,
  getFontFamilyCss
} from '../../utils/bannerSizing';

const DESTINATION_MAP = {
  food: '/restaurants',
  ride: '/ride',
  grocery: '/restaurants?category=grocery',
  bakery: '/restaurants?category=beverages',
  veg_fruits: '/restaurants?category=fruits-vegetables',
  meat: '/restaurants?category=meat',
  home: '/'
};

export default function HomeHeroBannerRenderer({
  config = null,
  language = 'en',
  isEditor = false,
  disableNavigation = false,
  forceMobile = false,
  effectiveWidth = null,
  activeLayer = null,
  onSelectLayer = null,
  onPointerDownElement = null,
  canvasRef = null
}) {
  const localContainerRef = useRef(null);
  const containerRef = canvasRef || localContainerRef;

  const [measuredHeight, setMeasuredHeight] = useState(240);
  const [measuredWidth, setMeasuredWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setMeasuredHeight(entry.contentRect.height || 240);
          setMeasuredWidth(entry.contentRect.width || 800);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  // Use the single unified metric helper for 100% WYSIWYG matching
  const currentWidth = effectiveWidth || measuredWidth;
  const metrics = getHomeHeroMetrics(currentWidth);

  // Fallback defaults
  const mode = config?.mode || 'layered';
  const layered = config?.layered || {};
  const single = config?.single || {};

  const isNavDisabled = isEditor || disableNavigation;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. SINGLE COMPLETE BANNER IMAGE MODE
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === 'single') {
    const isMobileView = forceMobile || metrics.isMobile;
    const imageUrl = getSingleImageUrl(single, isMobileView, language, '/assets/hero_delivery_banner.jpg');
    const linkTarget = DESTINATION_MAP.food;

    const singleFitMode = single.defaultImage?.fitMode || 'contain';

    const renderGraphic = (
      <img
        src={getImageUrl(imageUrl, 'banner')}
        alt="Home Hero Banner"
        onError={(e) => handleImageError(e, 'banner')}
        style={{
          borderRadius: `${metrics.borderRadiusPx}px`,
          objectFit: singleFitMode
        }}
        className="w-full h-full pointer-events-none transition-all duration-300"
      />
    );

    return (
      <div
        ref={containerRef}
        style={{
          minHeight: `${metrics.minHeight}px`,
          height: `${metrics.minHeight}px`,
          maxHeight: `${metrics.minHeight}px`,
          borderRadius: `${metrics.borderRadiusPx}px`
        }}
        className="relative overflow-hidden shadow-md flex items-center justify-center w-full box-border bg-black/5 select-none"
      >
        {isNavDisabled ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            {renderGraphic}
          </div>
        ) : (
          <Link to={linkTarget} className="w-full h-full block flex items-center justify-center overflow-hidden">
            {renderGraphic}
          </Link>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. LAYERED DESIGN MODE
  // Background + Artwork + Heading + Tagline + CTA button
  const isMobileView = forceMobile || metrics.isMobile;
  const bg = layered.background || {};
  const art = layered.artwork || {};
  const head = layered.heading || {};
  const tag = layered.tagline || {};
  const cta = layered.cta || {};

  const bgImageUrl = isMobileView
    ? (bg.mobileImageUrl || bg.desktopImageUrl || bg.imageUrl)
    : (bg.desktopImageUrl || bg.imageUrl || bg.mobileImageUrl);

  const bgFitMode = bg.fitMode || 'cover';
  const backgroundStyle = bgImageUrl
    ? {
        backgroundImage: `url(${getImageUrl(bgImageUrl, 'banner')})`,
        backgroundSize: bgFitMode,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : { backgroundColor: bg.color || '#7B1FA2' };
  const backgroundClass = (!bgImageUrl && bg.gradient) ? bg.gradient : '';

  const effectiveScaleHeight = metrics.minHeight;

  // Heading Typography Calculations
  const headingFontSize = computeBannerFontSize(effectiveScaleHeight, head.sizeRatio || 0.22, 14);
  const headFontFamilyCss = getFontFamilyCss(head.fontFamily || 'default', language);
  const headRawOutline = Number(head.outlineWidth) || 0;
  const headOutlinePx = headRawOutline > 0
    ? Math.max(0.5, Math.round(headRawOutline * (headingFontSize / 32) * 10) / 10)
    : 0;

  // Tagline Typography Calculations
  const taglineFontSize = computeBannerFontSize(effectiveScaleHeight, tag.sizeRatio || 0.10, 11);
  const tagFontFamilyCss = getFontFamilyCss(tag.fontFamily || 'default', language);
  const tagRawOutline = Number(tag.outlineWidth) || 0;
  const tagOutlinePx = tagRawOutline > 0
    ? Math.max(0.5, Math.round(tagRawOutline * (taglineFontSize / 16) * 10) / 10)
    : 0;

  // CTA Button Size Calculation
  const ctaFontSize = computeBannerFontSize(effectiveScaleHeight, cta.sizeRatio || 0.09, 10);

  const headingText = (language === 'te' && head.te) ? head.te : (head.en || 'Special Festival Offer');
  const taglineText = (language === 'te' && tag.te) ? tag.te : (tag.en || 'Order delicious food & essentials now');
  const ctaText = (language === 'te' && cta.te) ? cta.te : (cta.en || 'Order Now');
  const artworkUrl = art.imageUrl || '/assets/hero_delivery_banner.jpg';
  const linkTarget = DESTINATION_MAP[cta.destinationKey] || DESTINATION_MAP.food;

  const artX = art.x ?? 75;
  const artY = art.y ?? 50;
  const artWidth = art.width ?? 42;
  const artFitMode = art.fitMode || 'contain';

  const headX = head.x ?? 8;
  const headY = head.y ?? 20;
  const headWidth = head.width ?? 50;

  const tagX = tag.x ?? 8;
  const tagY = tag.y ?? 52;
  const tagWidth = tag.width ?? 50;

  const ctaX = cta.x ?? 8;
  const ctaY = cta.y ?? 74;

  const handlePointerDown = (e, key, type = 'move') => {
    if (isEditor) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isEditor) return;
    if (onPointerDownElement) {
      onPointerDownElement(e, key, type);
    } else if (onSelectLayer) {
      onSelectLayer(key);
    }
  };

  const handleLayerClick = (e, key) => {
    if (isEditor) {
      e.preventDefault();
      e.stopPropagation();
      if (onSelectLayer) onSelectLayer(key);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: `${metrics.minHeight}px`,
        height: `${metrics.minHeight}px`,
        maxHeight: `${metrics.minHeight}px`,
        borderRadius: `${metrics.borderRadiusPx}px`,
        ...(bg.imageUrl ? backgroundStyle : { backgroundColor: bg.color || '#7B1FA2' })
      }}
      className={`relative overflow-hidden ${backgroundClass} text-white shadow-[0_8px_30px_rgba(123,31,162,0.25)] transition-all duration-300 select-none w-full box-border`}
    >
      {/* Decorative Floating Shapes Background Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
        <div className="absolute top-3 left-1/4 w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 bg-yellow-300 rounded-sm rotate-45" />
        <div className="absolute top-8 left-1/3 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-pink-200 rounded-full" />
        <div className="absolute bottom-4 left-1/5 w-3 sm:w-4 h-1.5 sm:h-2 bg-yellow-200 rounded-full rotate-12" />
        <div className="absolute top-4 right-1/3 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-yellow-300 rounded-sm rotate-12" />
      </div>

      {/* ── HEADING LAYER ── */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'heading', 'move')}
        onClick={(e) => handleLayerClick(e, 'heading')}
        style={{
          position: 'absolute',
          left: `${headX}%`,
          top: `${headY}%`,
          width: `${headWidth}%`,
          zIndex: 20
        }}
        className={`transition-all ${
          isEditor ? 'cursor-grab active:cursor-grabbing p-1 rounded-lg hover:ring-2 hover:ring-violet-400/60' : ''
        } ${activeLayer === 'heading' ? 'ring-2 ring-primary bg-black/25 rounded-lg' : ''}`}
      >
        <h1
          style={{
            fontSize: `${headingFontSize}px`,
            fontFamily: headFontFamilyCss,
            color: head.color || '#FFFFFF',
            fontWeight: head.weight || 900,
            textAlign: head.align || 'left',
            lineHeight: head.lineHeight || 1.1,
            WebkitTextStroke: headOutlinePx > 0 ? `${headOutlinePx}px ${head.outlineColor || '#000000'}` : 'none'
          }}
          className="tracking-tight leading-tight drop-shadow-md line-clamp-3 break-words"
        >
          {headingText}
        </h1>
      </div>

      {/* ── TAGLINE LAYER ── */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'tagline', 'move')}
        onClick={(e) => handleLayerClick(e, 'tagline')}
        style={{
          position: 'absolute',
          left: `${tagX}%`,
          top: `${tagY}%`,
          width: `${tagWidth}%`,
          zIndex: 20
        }}
        className={`transition-all ${
          isEditor ? 'cursor-grab active:cursor-grabbing p-1 rounded-lg hover:ring-2 hover:ring-violet-400/60' : ''
        } ${activeLayer === 'tagline' ? 'ring-2 ring-primary bg-black/25 rounded-lg' : ''}`}
      >
        <p
          style={{
            fontSize: `${taglineFontSize}px`,
            fontFamily: tagFontFamilyCss,
            color: tag.color || '#FFFFFF',
            fontWeight: tag.weight || 500,
            textAlign: tag.align || 'left',
            lineHeight: tag.lineHeight || 1.1,
            WebkitTextStroke: tagOutlinePx > 0 ? `${tagOutlinePx}px ${tag.outlineColor || '#000000'}` : 'none'
          }}
          className="leading-snug line-clamp-2 break-words drop-shadow-sm"
        >
          {taglineText}
        </p>
      </div>

      {/* ── CTA BUTTON LAYER ── */}
      {cta.enabled !== false && (
        <div
          onPointerDown={(e) => handlePointerDown(e, 'cta', 'move')}
          onClick={(e) => handleLayerClick(e, 'cta')}
          style={{
            position: 'absolute',
            left: `${ctaX}%`,
            top: `${ctaY}%`,
            zIndex: 20
          }}
          className={`transition-all ${
            isEditor ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-violet-400/60 rounded-full' : ''
          } ${activeLayer === 'cta' ? 'ring-2 ring-primary rounded-full' : ''}`}
        >
          {isNavDisabled ? (
            <div
              style={{
                backgroundColor: cta.backgroundColor || '#FFEB3B',
                color: cta.textColor || '#1A1A1A',
                borderRadius: `${cta.borderRadius ?? 50}px`,
                fontSize: `${ctaFontSize}px`
              }}
              className="inline-flex items-center gap-1.5 font-black px-3.5 py-1.5 shadow-md shrink-0 select-none cursor-grab active:cursor-grabbing"
            >
              <span>{ctaText}</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          ) : (
            <Link
              to={linkTarget}
              style={{
                backgroundColor: cta.backgroundColor || '#FFEB3B',
                color: cta.textColor || '#1A1A1A',
                borderRadius: `${cta.borderRadius ?? 50}px`,
                fontSize: `${ctaFontSize}px`
              }}
              className="inline-flex items-center gap-1.5 font-black px-3.5 py-1.5 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            >
              <span>{ctaText}</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </Link>
          )}
        </div>
      )}

      {/* ── ARTWORK GRAPHIC LAYER (WITH RESIZE HANDLES & FIT CONTROL) ── */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'artwork', 'move')}
        onClick={(e) => handleLayerClick(e, 'artwork')}
        style={{
          position: 'absolute',
          left: `${artX}%`,
          top: `${artY}%`,
          transform: 'translate(-50%, -50%)',
          width: `${artWidth}%`,
          zIndex: 15
        }}
        className={`transition-all flex items-center justify-center ${
          isEditor ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-violet-400/60 rounded-2xl p-1' : ''
        } ${activeLayer === 'artwork' ? 'ring-2 ring-primary rounded-2xl p-1' : ''}`}
      >
        <img
          src={getImageUrl(artworkUrl, 'banner')}
          alt={headingText}
          onError={(e) => handleImageError(e, 'banner')}
          style={{
            maxHeight: `${metrics.artMaxHeightPx}px`,
            objectFit: artFitMode
          }}
          className="w-full h-auto rounded-2xl shadow-lg shadow-purple-950/30 pointer-events-none transition-all duration-300"
        />

        {/* Corner Resize Handles for Selected Artwork */}
        {isEditor && activeLayer === 'artwork' && (
          <>
            <div
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePointerDown(e, 'artwork', 'resize-corner');
              }}
              className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md cursor-nwse-resize z-30"
              title="Drag to resize artwork"
            />
            <div
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePointerDown(e, 'artwork', 'resize-corner');
              }}
              className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md cursor-nwse-resize z-30"
              title="Drag to resize artwork"
            />
          </>
        )}
      </div>
    </div>
  );
}
