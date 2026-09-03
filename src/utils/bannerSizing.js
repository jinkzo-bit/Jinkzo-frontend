/**
 * bannerSizing.js
 * Shared banner container sizing rules, typography scale calculation, and font definitions.
 * Standardized across Customer Home, Admin Editing Canvas, and Device Previews.
 */

export const BANNER_CONTAINER_CLASSES =
  "relative rounded-3xl sm:rounded-[32px] overflow-hidden text-white p-4 sm:p-6 md:p-10 lg:p-12 shadow-[0_8px_30px_rgba(123,31,162,0.25)] flex flex-row items-center justify-between min-h-[160px] sm:min-h-[220px] md:min-h-[300px] transition-all duration-700 select-none w-full box-border";

/**
 * Curated list of typography font families.
 * Includes safe Telugu-capable fallbacks.
 */
export const HERO_FONT_FAMILIES = [
  { id: 'default', name: 'Jinkzo Default', fontCss: 'font-display, sans-serif', isTeluguCapable: true },
  { id: 'poppins', name: 'Poppins', fontCss: "'Poppins', sans-serif", isTeluguCapable: false },
  { id: 'inter', name: 'Inter', fontCss: "'Inter', sans-serif", isTeluguCapable: false },
  { id: 'montserrat', name: 'Montserrat', fontCss: "'Montserrat', sans-serif", isTeluguCapable: false },
  { id: 'roboto', name: 'Roboto', fontCss: "'Roboto', sans-serif", isTeluguCapable: false },
  { id: 'oswald', name: 'Oswald', fontCss: "'Oswald', sans-serif", isTeluguCapable: false },
  { id: 'playfair', name: 'Playfair Display', fontCss: "'Playfair Display', serif", isTeluguCapable: false },
  { id: 'bebas', name: 'Bebas Neue', fontCss: "'Bebas Neue', sans-serif", isTeluguCapable: false },
  { id: 'lato', name: 'Lato', fontCss: "'Lato', sans-serif", isTeluguCapable: false },
  { id: 'merriweather', name: 'Merriweather', fontCss: "'Merriweather', serif", isTeluguCapable: false },
  { id: 'noto_sans_te', name: 'Noto Sans Telugu', fontCss: "'Noto Sans Telugu', 'Poppins', sans-serif", isTeluguCapable: true },
  { id: 'noto_serif_te', name: 'Noto Serif Telugu', fontCss: "'Noto Serif Telugu', 'Merriweather', serif", isTeluguCapable: true }
];

/**
 * Resolves font-family CSS value with safe Telugu fallback
 */
export function getFontFamilyCss(fontKey, language = 'en') {
  const fontObj = HERO_FONT_FAMILIES.find(f => f.id === fontKey) || HERO_FONT_FAMILIES[0];
  if (language === 'te' && !fontObj.isTeluguCapable) {
    return "'Noto Sans Telugu', 'Poppins', sans-serif";
  }
  return fontObj.fontCss;
}

/**
 * Standardized layout metrics derived from EFFECTIVE SIMULATED VIEWPORT WIDTH.
 * Reused by Customer Home and Admin Studio for 100% WYSIWYG matching.
 */
export function getHomeHeroMetrics(viewportWidth) {
  const width = typeof viewportWidth === 'number' && viewportWidth > 0 ? viewportWidth : 1280;
  
  let horizontalPaddingPx = 64; // > 768px (md/lg px-8 = 32px left + 32px right)
  if (width < 640) {
    horizontalPaddingPx = 24; // < 640px (mobile px-3 = 12px left + 12px right)
  } else if (width < 768) {
    horizontalPaddingPx = 32; // 640-768px (sm px-4 = 16px left + 16px right)
  }

  const bannerContainerWidth = Math.max(280, Math.min(1280, width) - horizontalPaddingPx);

  let minHeight = 300;
  let borderRadiusPx = 32;
  let isMobile = false;
  let artMaxHeightPx = 260;

  if (width < 640) {
    minHeight = 160;
    borderRadiusPx = 24;
    isMobile = true;
    artMaxHeightPx = 135;
  } else if (width < 768) {
    minHeight = 220;
    borderRadiusPx = 32;
    isMobile = false;
    artMaxHeightPx = 190;
  }

  return {
    viewportWidth: width,
    horizontalPaddingPx,
    bannerWidth: bannerContainerWidth,
    minHeight,
    height: minHeight,
    borderRadiusPx,
    isMobile,
    artMaxHeightPx
  };
}

export function getBannerLayoutMetrics(effectiveWidth) {
  return getHomeHeroMetrics(effectiveWidth);
}

/**
 * Standardized typography scale base calculation.
 * Canonical formula: fontSize = Math.max(minPx, Math.round(scaleBase * sizeRatio))
 * scaleBase = bannerHeight (the actual rendered banner height in px)
 */
export function computeBannerFontSize(scaleBase, sizeRatio, minPx = 10) {
  if (!scaleBase || isNaN(scaleBase) || scaleBase <= 0) return minPx;
  const calculated = Math.round(scaleBase * sizeRatio);
  return Math.max(minPx, calculated);
}

/**
 * Single image asset selector with fallback chain
 */
export function getSingleImageUrl(singleImageConfig, isMobile, language, fallbackUrl) {
  if (!singleImageConfig) return fallbackUrl;

  const deviceKey = isMobile ? 'mobile' : 'desktop';
  const langKey = language === 'te' ? 'te' : 'en';

  const deviceObj = singleImageConfig[deviceKey] || singleImageConfig.desktop || {};
  
  if (deviceObj[langKey]?.imageUrl) return deviceObj[langKey].imageUrl;
  if (deviceObj['en']?.imageUrl) return deviceObj['en'].imageUrl;
  if (singleImageConfig.defaultImage?.imageUrl) return singleImageConfig.defaultImage.imageUrl;
  if (singleImageConfig.default?.imageUrl) return singleImageConfig.default.imageUrl;
  if (singleImageConfig.desktop?.[langKey]?.imageUrl) return singleImageConfig.desktop[langKey].imageUrl;
  if (singleImageConfig.desktop?.['en']?.imageUrl) return singleImageConfig.desktop['en'].imageUrl;

  return fallbackUrl;
}
