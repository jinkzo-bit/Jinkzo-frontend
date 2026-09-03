import React from 'react';
import { getImageUrl } from '../../utils/uploadUtil';

/**
 * Shared visual background renderer for Customer Home & Admin Studio.
 * Renders behind page content without blocking clicks (`pointer-events: none`).
 */
export default function HomeBackgroundRenderer({
  config = null,
  children = null,
  className = '',
  forceViewport = null // 'mobile' | 'desktop'
}) {
  const type = config?.type || 'default';
  const solid = config?.solid || {};
  const gradient = config?.gradient || {};
  const image = config?.image || {};

  // Device resolution for Mobile vs Desktop
  const isMobile = forceViewport === 'mobile'
    ? true
    : (forceViewport === 'desktop' ? false : (typeof window !== 'undefined' && window.innerWidth < 768));

  const activeImageUrl = isMobile
    ? (image.mobileImageUrl || image.mobile?.imageUrl || image.desktopImageUrl || image.desktop?.imageUrl || image.imageUrl)
    : (image.desktopImageUrl || image.desktop?.imageUrl || image.imageUrl || image.mobileImageUrl || image.mobile?.imageUrl);

  // If Default mode or null config: render children normally without custom background layer
  if (type === 'default') {
    return (
      <div className={`w-full min-h-full transition-colors duration-300 ${className}`}>
        {children}
      </div>
    );
  }

  // Calculate Solid style
  let backgroundStyle = {};
  if (type === 'solid') {
    backgroundStyle = {
      backgroundColor: solid.color || '#FAFAFF'
    };
  }

  // Calculate Gradient style
  if (type === 'gradient') {
    const c1 = gradient.color1 || '#F3E8FF';
    const c2 = gradient.color2 || '#FFFFFF';
    const c3 = gradient.color3 || '#FFF3E0';
    const isRadial = gradient.type === 'radial';
    const dir = gradient.direction || 'to-b';

    if (isRadial) {
      const radialPosMap = {
        'center': 'circle at center',
        'top-left': 'circle at top left',
        'top-right': 'circle at top right',
        'bottom-left': 'circle at bottom left',
        'bottom-right': 'circle at bottom right'
      };
      const radialPos = radialPosMap[dir] || 'circle at center';
      backgroundStyle = {
        backgroundImage: `radial-gradient(${radialPos}, ${c1}, ${c2}, ${c3})`
      };
    } else {
      const linearDirMap = {
        'to-b': 'to bottom',
        'to-t': 'to top',
        'to-r': 'to right',
        'to-l': 'to left',
        'to-br': 'to bottom right',
        'to-bl': 'to bottom left'
      };
      const linearDir = linearDirMap[dir] || 'to bottom';
      backgroundStyle = {
        backgroundImage: `linear-gradient(${linearDir}, ${c1}, ${c2}, ${c3})`
      };
    }
  }

  // Calculate Image style
  const isImage = type === 'image' && activeImageUrl;
  const imageStyle = isImage ? {
    backgroundImage: `url(${getImageUrl(activeImageUrl, 'banner')})`,
    backgroundSize: image.fitMode || 'cover',
    backgroundPosition: image.position || 'center',
    backgroundRepeat: image.repeat || 'no-repeat',
    opacity: (image.opacity ?? 100) / 100,
    filter: (image.blurPx && image.blurPx > 0) ? `blur(${image.blurPx}px)` : 'none'
  } : {};

  const overlayOpacity = isImage ? ((image.overlayOpacity || 0) / 100) : 0;
  const overlayColor = image.overlayColor || '#FFFFFF';

  return (
    <div className={`relative w-full min-h-full overflow-x-hidden ${className}`}>
      {/* ── BACKGROUND VISUAL DECORATIVE LAYER (STRICTLY POINTER-EVENTS-NONE, Z-0) ── */}
      <div
        style={type === 'image' ? { backgroundColor: '#FAFAFF' } : backgroundStyle}
        className="absolute inset-0 pointer-events-none z-0 transition-all duration-500 overflow-hidden"
      >
        {/* Background Image Sub-Layer with Blur & Opacity */}
        {isImage && (
          <div
            style={imageStyle}
            className="absolute inset-0 pointer-events-none transition-all duration-500 transform scale-105"
          />
        )}

        {/* Color Overlay Sub-Layer */}
        {isImage && overlayOpacity > 0 && (
          <div
            style={{
              backgroundColor: overlayColor,
              opacity: overlayOpacity
            }}
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          />
        )}
      </div>

      {/* ── FOREGROUND CONTENT LAYER (Z-10, FULLY INTERACTIVE) ── */}
      <div className="relative z-10 w-full min-h-full">
        {children}
      </div>
    </div>
  );
}
