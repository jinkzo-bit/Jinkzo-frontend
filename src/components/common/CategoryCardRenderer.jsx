import React, { useRef, useState, useEffect } from 'react';

/**
 * CategoryCardRenderer — Single Source of Truth for Category Card Visual Presentation.
 * Used in BOTH Customer Home and Admin Designer / Device Previews.
 *
 * All coordinates (x, y, width) are stored as normalized percentages (0 - 100).
 * Element anchor is the CENTER point: left: x%, top: y%, transform: translate(-50%, -50%).
 * Font sizes are dynamically scaled via cardWidth * sizeRatio with safe clamps.
 */
export default function CategoryCardRenderer({
  design,
  language = 'en',
  forcedCardWidth = null,
  isInteractive = false,
  selectedElement = null,
  onSelectElement = null,
  className = ''
}) {
  const containerRef = useRef(null);
  const [measuredWidth, setMeasuredWidth] = useState(300);

  useEffect(() => {
    if (forcedCardWidth) {
      setMeasuredWidth(forcedCardWidth);
      return;
    }

    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setMeasuredWidth(rect.width);
        }
      }
    };

    updateSize();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setMeasuredWidth(entry.contentRect.width);
        }
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [forcedCardWidth]);

  if (!design) return null;

  const bg = design.background || {};
  const artwork = design.artwork || { x: 50, y: 30, width: 62 };
  const heading = design.heading || {
    en: 'Food',
    te: 'ఫుడ్',
    x: 50,
    y: 68,
    sizeRatio: 0.088,
    weight: 900,
    color: '#FF4B16',
    outlineColor: '#111111',
    outlineWidth: 0.8,
    align: 'center'
  };
  const tagline = design.tagline || {
    en: 'Tasty meals from top restaurants',
    te: 'టాప్ రెస్టారెంట్ల నుండి రుచికరమైన భోజనం',
    x: 50,
    y: 86,
    sizeRatio: 0.038,
    weight: 600,
    color: '#000000',
    align: 'center'
  };

  // Text content based on language
  const headingText = (language === 'te' && heading.te) ? heading.te : (heading.en || '');
  const taglineText = (language === 'te' && tagline.te) ? tagline.te : (tagline.en || '');

  // Calculate responsive font sizes based on actual rendered card width
  const baseWidth = forcedCardWidth || measuredWidth || 300;
  const headingFontSize = Math.max(12, Math.min(46, Math.round(baseWidth * (heading.sizeRatio || 0.085))));
  const taglineFontSize = Math.max(9, Math.min(18, Math.round(baseWidth * (tagline.sizeRatio || 0.038))));

  // Outline scale with card size
  const normalizedOutlineWidth = Math.max(0.5, Math.min(2.5, ((heading.outlineWidth || 0.8) * (baseWidth / 300))));

  // Single Card Image Mode (Full 1080x1080 Image)
  const isSingleMode = design.designMode === 'single';
  const singleImage = design.singleImage || {};

  if (isSingleMode && singleImage.imageUrl) {
    const objectFitClass = singleImage.fit === 'contain' ? 'object-contain' : 'object-cover';
    return (
      <div
        ref={containerRef}
        style={{
          backgroundColor: bg.color || '#FFFFFF',
          aspectRatio: '1 / 1'
        }}
        className={`relative w-full aspect-square overflow-hidden select-none ${className}`}
      >
        <img
          src={singleImage.imageUrl}
          alt={headingText || 'Category Card'}
          loading="eager"
          decoding="async"
          draggable={false}
          className={`w-full h-full ${objectFitClass} select-none pointer-events-none`}
        />
        {/* Optional text overlay if enabled */}
        {singleImage.showTextOverlay && (
          <>
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-1" />
            <div
              style={{
                left: `${heading.x ?? 50}%`,
                top: `${heading.y ?? 68}%`,
                transform: 'translate(-50%, -50%)',
                width: '92%'
              }}
              className="absolute pointer-events-none z-10 flex flex-col justify-center px-1"
            >
              <h3
                style={{
                  color: heading.color || '#FFFFFF',
                  fontSize: `${headingFontSize}px`,
                  fontWeight: heading.weight || 900,
                  textAlign: heading.align || 'center'
                }}
                className="font-display tracking-tight leading-[1.08] break-words line-clamp-2 select-none"
              >
                {headingText}
              </h3>
            </div>
            <div
              style={{
                left: `${tagline.x ?? 50}%`,
                top: `${tagline.y ?? 86}%`,
                transform: 'translate(-50%, -50%)',
                width: '92%'
              }}
              className="absolute pointer-events-none z-10 flex flex-col justify-center px-1"
            >
              <p
                style={{
                  color: tagline.color || '#FFFFFF',
                  fontSize: `${taglineFontSize}px`,
                  fontWeight: tagline.weight || 600,
                  textAlign: tagline.align || 'center'
                }}
                className="font-sans leading-tight line-clamp-2 select-none break-words"
              >
                {taglineText}
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        backgroundColor: bg.color || '#FFFFFF',
        aspectRatio: '1 / 1'
      }}
      className={`relative w-full aspect-square overflow-hidden select-none ${className}`}
    >
      {/* 1. Background Image (if configured) */}
      {bg.imageUrl && (
        <img
          src={bg.imageUrl}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        />
      )}

      {/* Subtle bottom gradient to enhance text contrast */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-white/30 via-white/10 to-transparent pointer-events-none z-1" />

      {/* 2. Main Artwork / Product Image */}
      {artwork.imageUrl && (
        <div
          data-element="artwork"
          onClick={(e) => {
            if (isInteractive && onSelectElement) {
              e.stopPropagation();
              onSelectElement('artwork');
            }
          }}
          style={{
            left: `${artwork.x ?? 50}%`,
            top: `${artwork.y ?? 33}%`,
            width: `${artwork.width ?? 68}%`,
            transform: 'translate(-50%, -50%)',
            cursor: isInteractive ? 'move' : 'default'
          }}
          className={`absolute flex items-center justify-center pointer-events-auto z-5 transition-transform duration-75 ${
            isInteractive && selectedElement === 'artwork'
              ? 'ring-2 ring-violet-500 ring-offset-2 rounded-lg'
              : ''
          }`}
        >
          <img
            src={artwork.imageUrl}
            alt={headingText}
            loading="eager"
            decoding="async"
            draggable={false}
            className="w-full h-auto max-h-[90%] object-contain select-none pointer-events-none drop-shadow-sm"
          />
        </div>
      )}

      {/* 3. Heading Text */}
      <div
        data-element="heading"
        onClick={(e) => {
          if (isInteractive && onSelectElement) {
            e.stopPropagation();
            onSelectElement('heading');
          }
        }}
        style={{
          left: `${heading.x ?? 50}%`,
          top: `${heading.y ?? 68}%`,
          transform: 'translate(-50%, -50%)',
          width: '92%',
          maxWidth: '94%',
          cursor: isInteractive ? 'move' : 'default'
        }}
        className={`absolute pointer-events-auto z-10 flex flex-col justify-center px-1 transition-all ${
          isInteractive && selectedElement === 'heading'
            ? 'ring-2 ring-violet-500 ring-offset-2 rounded-lg bg-violet-500/10'
            : ''
        }`}
      >
        <h3
          style={{
            color: heading.color || '#FF4B16',
            fontSize: `${headingFontSize}px`,
            fontWeight: heading.weight || 900,
            textAlign: heading.align || 'center',
            WebkitTextStroke: `${normalizedOutlineWidth}px ${heading.outlineColor || '#111111'}`,
            paintOrder: 'stroke fill',
            textShadow: `
              -${normalizedOutlineWidth * 0.7}px -${normalizedOutlineWidth * 0.7}px 0 ${heading.outlineColor || '#111111'},
               ${normalizedOutlineWidth * 0.7}px -${normalizedOutlineWidth * 0.7}px 0 ${heading.outlineColor || '#111111'},
              -${normalizedOutlineWidth * 0.7}px  ${normalizedOutlineWidth * 0.7}px 0 ${heading.outlineColor || '#111111'},
               ${normalizedOutlineWidth * 0.7}px  ${normalizedOutlineWidth * 0.7}px 0 ${heading.outlineColor || '#111111'}
            `,
            lineHeight: 1.08,
            wordBreak: 'break-word'
          }}
          className="font-display tracking-tight leading-[1.08] break-words line-clamp-2 select-none"
        >
          {headingText}
        </h3>
      </div>

      {/* 4. Tagline Text */}
      <div
        data-element="tagline"
        onClick={(e) => {
          if (isInteractive && onSelectElement) {
            e.stopPropagation();
            onSelectElement('tagline');
          }
        }}
        style={{
          left: `${tagline.x ?? 50}%`,
          top: `${tagline.y ?? 83}%`,
          transform: 'translate(-50%, -50%)',
          width: '92%',
          maxWidth: '94%',
          cursor: isInteractive ? 'move' : 'default'
        }}
        className={`absolute pointer-events-auto z-10 flex flex-col justify-center px-1 transition-all ${
          isInteractive && selectedElement === 'tagline'
            ? 'ring-2 ring-violet-500 ring-offset-2 rounded-lg bg-violet-500/10'
            : ''
        }`}
      >
        <p
          style={{
            color: tagline.color || '#000000',
            fontSize: `${taglineFontSize}px`,
            fontWeight: tagline.weight || 600,
            textAlign: tagline.align || 'center',
            lineHeight: 1.18
          }}
          className="font-sans leading-tight line-clamp-2 select-none break-words"
        >
          {taglineText}
        </p>
      </div>
    </div>
  );
}
