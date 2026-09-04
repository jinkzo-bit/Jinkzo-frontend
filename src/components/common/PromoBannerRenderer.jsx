import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getImageUrl, handleImageError } from '../../utils/uploadUtil';
import { computeBannerFontSize, getSingleImageUrl, getBannerLayoutMetrics } from '../../utils/bannerSizing';

export default function PromoBannerRenderer({
  slide,
  design = null,
  language = 'en',
  isEditor = false,
  forceMobile = false,
  effectiveWidth = null,
  activeLayer = null,
  onSelectLayer = null,
  onPointerDownElement = null,
  canvasRef = null
}) {
  const localContainerRef = useRef(null);
  const containerRef = canvasRef || localContainerRef;

  const [bannerHeight, setBannerHeight] = useState(240);
  const [bannerWidth, setBannerWidth] = useState(800);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setBannerHeight(entry.contentRect.height || 240);
          setBannerWidth(entry.contentRect.width || 800);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  // Calculate layout metrics based on effective simulated width (or measured container width)
  const currentWidth = effectiveWidth || bannerWidth;
  const metrics = getBannerLayoutMetrics(currentWidth);

  // Fallback slide properties
  const titleText = slide?.title || 'Special';
  const highlightText = slide?.highlight || slide?.title || 'Offer';
  const subtitleText = slide?.subtitle || 'Order karo';
  const buttonText = slide?.buttonText || 'Order Now';
  const linkTarget = slide?.link || '/restaurants';
  const defaultBgGradient = slide?.bgGradient || 'bg-gradient-to-r from-[#7B1FA2] via-[#E91E63] to-[#FF5722]';
  const defaultImage = slide?.image || slide?.imageUrl || '/assets/hero_delivery_banner.jpg';

  // Determine mode
  const mode = design?.mode || 'legacy';

  // ─────────────────────────────────────────────────────────────────────────
  // 1. LEGACY / DEFAULT RENDERER (Zero-Regression)
  // When no BannerDesign document exists or design is null
  // ─────────────────────────────────────────────────────────────────────────
  if (!design || mode === 'legacy') {
    return (
      <div
        ref={containerRef}
        style={{
          minHeight: `${metrics.minHeight}px`,
          height: `${metrics.minHeight}px`,
          maxHeight: `${metrics.minHeight}px`,
          padding: `${metrics.paddingPx}px`,
          borderRadius: `${metrics.borderRadiusPx}px`
        }}
        className={`relative overflow-hidden ${defaultBgGradient} text-white shadow-[0_8px_30px_rgba(123,31,162,0.25)] flex flex-row items-center justify-between transition-all duration-300 select-none w-full box-border`}
      >
        {/* Decorative Floating Shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
          <div className="absolute top-3 left-1/4 w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 bg-yellow-300 rounded-sm rotate-45" />
          <div className="absolute top-8 left-1/3 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-pink-200 rounded-full" />
          <div className="absolute bottom-4 left-1/5 w-3 sm:w-4 h-1.5 sm:h-2 bg-yellow-200 rounded-full rotate-12" />
          <div className="absolute top-4 right-1/3 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-yellow-300 rounded-sm rotate-12" />
          <div className="absolute bottom-6 right-1/4 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-white rounded-full" />
        </div>

        <div className="w-full h-full flex flex-row items-center justify-between z-10 overflow-hidden">
          <div className="flex flex-col items-start gap-1 sm:gap-2 z-10 w-[55%] flex-1 overflow-hidden">
            <span className="text-xs sm:text-base md:text-xl font-bold text-white/95 tracking-tight leading-none truncate">
              {titleText}
            </span>
            <h1 className="font-display font-black text-xl sm:text-3xl md:text-5xl text-[#FFEB3B] tracking-tight leading-none drop-shadow-sm truncate">
              {highlightText}
            </h1>
            <p className="text-[11px] sm:text-xs md:text-sm text-white/95 font-medium leading-tight max-w-xs line-clamp-2">
              {subtitleText}
            </p>

            <Link
              to={linkTarget}
              className="mt-1 sm:mt-2 inline-flex items-center gap-1 bg-[#FFEB3B] hover:bg-[#FDD835] text-gray-950 font-black text-xs px-3.5 py-1.5 rounded-full shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            >
              <span>{buttonText}</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </Link>
          </div>

          <div className="w-[45%] h-full flex items-center justify-end z-10 pl-2 overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <img
                src={getImageUrl(defaultImage, 'banner')}
                alt={highlightText || titleText}
                onError={(e) => handleImageError(e, 'banner')}
                style={{ maxHeight: `${metrics.artMaxHeightPx}px` }}
                className="w-auto h-auto object-contain rounded-2xl shadow-lg shadow-purple-950/30"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SINGLE CARD IMAGE MODE
  // finished graphic with desktop/mobile & language fallback chain
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === 'single') {
    const singleImageConfig = design.singleImage;
    const isMobileView = forceMobile || metrics.isMobile;
    const imageUrl = getSingleImageUrl(singleImageConfig, isMobileView, language, defaultImage);

    return (
      <div
        ref={containerRef}
        style={{
          minHeight: `${metrics.minHeight}px`,
          height: `${metrics.minHeight}px`,
          maxHeight: `${metrics.minHeight}px`,
          borderRadius: `${metrics.borderRadiusPx}px`
        }}
        className="relative overflow-hidden shadow-md flex items-center justify-center w-full box-border bg-black/5"
      >
        <Link to={linkTarget} className="w-full h-full block">
          <img
            src={getImageUrl(imageUrl, 'banner')}
            alt={titleText}
            onError={(e) => handleImageError(e, 'banner')}
            style={{ borderRadius: `${metrics.borderRadiusPx}px` }}
            className="w-full h-full object-cover"
          />
        </Link>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. LAYERED DESIGN MODE
  // Background + Artwork + Heading + Tagline + CTA button
  // Normalized percentage positioning & direct interactive visual drag/resize
  // ─────────────────────────────────────────────────────────────────────────
  const bg = design.background || {};
  const art = design.artwork || {};
  const head = design.heading || {};
  const tag = design.tagline || {};
  const cta = design.ctaStyle || {};

  const isMobileView = forceMobile || metrics.isMobile;
  const bgImageUrl = isMobileView
    ? (bg.mobileImageUrl || bg.desktopImageUrl || bg.imageUrl)
    : (bg.desktopImageUrl || bg.imageUrl || bg.mobileImageUrl);

  const backgroundStyle = bgImageUrl
    ? { backgroundImage: `url(${getImageUrl(bgImageUrl, 'banner')})`, backgroundSize: bg.fitMode || 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : { backgroundColor: bg.color || '#7B1FA2' };
  const backgroundClass = (!bgImageUrl && bg.gradient) ? bg.gradient : '';

  // Effective scale base height for typography calculation
  const effectiveScaleHeight = metrics.minHeight;
  const headingFontSize = computeBannerFontSize(effectiveScaleHeight, head.sizeRatio || 0.22, 14);
  const rawOutlineWidth = Number(head.outlineWidth) || 0;
  const headingOutlinePx = rawOutlineWidth > 0
    ? Math.max(0.5, Math.round(rawOutlineWidth * (headingFontSize / 32) * 10) / 10)
    : 0;

  const taglineFontSize = computeBannerFontSize(effectiveScaleHeight, tag.sizeRatio || 0.10, 11);
  const ctaFontSize = computeBannerFontSize(effectiveScaleHeight, cta.sizeRatio || 0.09, 10);

  const headingText = (language === 'te' && head.te) ? head.te : (head.en || titleText);
  const taglineText = (language === 'te' && tag.te) ? tag.te : (tag.en || subtitleText);
  const artworkUrl = art.imageUrl || defaultImage;

  // Normalized Percentage Coordinates (Defaults)
  const artX = art.x ?? 75;
  const artY = art.y ?? 50;
  const artWidth = art.width ?? 42;

  const headX = head.x ?? 8;
  const headY = head.y ?? 20;
  const headWidth = head.width ?? 50;

  const tagX = tag.x ?? 8;
  const tagY = tag.y ?? 52;
  const tagWidth = tag.width ?? 50;

  const ctaX = cta.x ?? 8;
  const ctaY = cta.y ?? 74;

  const handlePointerDown = (e, key, type = 'move') => {
    if (!isEditor) return;
    if (onPointerDownElement) {
      onPointerDownElement(e, key, type);
    } else if (onSelectLayer) {
      onSelectLayer(key);
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
        ...(bgImageUrl ? backgroundStyle : { backgroundColor: bg.color || '#7B1FA2' })
      }}
      className={`relative overflow-hidden ${backgroundClass} text-white shadow-[0_8px_30px_rgba(123,31,162,0.25)] transition-all duration-300 select-none w-full box-border`}
    >
      {/* Background Overlay Layer (Fixed, Non-Draggable) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
        <div className="absolute top-3 left-1/4 w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 bg-yellow-300 rounded-sm rotate-45" />
        <div className="absolute top-8 left-1/3 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-pink-200 rounded-full" />
        <div className="absolute bottom-4 left-1/5 w-3 sm:w-4 h-1.5 sm:h-2 bg-yellow-200 rounded-full rotate-12" />
        <div className="absolute top-4 right-1/3 w-2.5 sm:w-3 h-2.5 sm:h-3 bg-yellow-300 rounded-sm rotate-12" />
      </div>

      {/* ── HEADING LAYER ── */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'heading', 'move')}
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
            color: head.color || '#FFFFFF',
            fontWeight: head.weight || 900,
            textAlign: head.align || 'left',
            WebkitTextStroke: headingOutlinePx > 0 ? `${headingOutlinePx}px ${head.outlineColor || '#000000'}` : 'none'
          }}
          className="font-display tracking-tight leading-tight drop-shadow-md line-clamp-3 break-words"
        >
          {headingText}
        </h1>
      </div>

      {/* ── TAGLINE LAYER ── */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'tagline', 'move')}
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
            color: tag.color || '#FFFFFF',
            fontWeight: tag.weight || 500,
            textAlign: tag.align || 'left'
          }}
          className="font-medium leading-snug line-clamp-2 break-words"
        >
          {taglineText}
        </p>
      </div>

      {/* ── CTA BUTTON LAYER ── */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'ctaStyle', 'move')}
        style={{
          position: 'absolute',
          left: `${ctaX}%`,
          top: `${ctaY}%`,
          zIndex: 20
        }}
        className={`transition-all ${
          isEditor ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-violet-400/60 rounded-full' : ''
        } ${activeLayer === 'ctaStyle' ? 'ring-2 ring-primary rounded-full' : ''}`}
      >
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
          <span>{buttonText}</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
        </Link>
      </div>

      {/* ── ARTWORK GRAPHIC LAYER (WITH CORNER RESIZE HANDLES) ── */}
      <div
        onPointerDown={(e) => handlePointerDown(e, 'artwork', 'move')}
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
          style={{ maxHeight: `${metrics.artMaxHeightPx}px` }}
          className="w-full h-auto object-contain rounded-2xl shadow-lg shadow-purple-950/30 pointer-events-none"
        />

        {/* Corner Resize Handles for Selected Artwork */}
        {isEditor && activeLayer === 'artwork' && (
          <>
            <div
              onPointerDown={(e) => handlePointerDown(e, 'artwork', 'resize-corner')}
              className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md cursor-nwse-resize z-30"
              title="Drag to resize artwork"
            />
            <div
              onPointerDown={(e) => handlePointerDown(e, 'artwork', 'resize-corner')}
              className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-md cursor-nwse-resize z-30"
              title="Drag to resize artwork"
            />
          </>
        )}
      </div>
    </div>
  );
}
