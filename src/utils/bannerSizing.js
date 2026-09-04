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

  // 1. Direct string URL
  if (typeof singleImageConfig === 'string' && singleImageConfig.trim()) {
    return singleImageConfig.trim();
  }

  const langKey = language === 'te' ? 'te' : 'en';

  // 2. Mobile-specific priority if in mobile view
  if (isMobile) {
    const mob = singleImageConfig.mobile || singleImageConfig.mobileImage;
    if (typeof mob === 'string' && mob.trim()) return mob.trim();
    if (mob && typeof mob === 'object') {
      if (mob[langKey]?.imageUrl) return mob[langKey].imageUrl;
      if (mob.en?.imageUrl) return mob.en.imageUrl;
      if (mob.te?.imageUrl) return mob.te.imageUrl;
      if (mob.imageUrl) return mob.imageUrl;
      if (mob.url) return mob.url;
    }
    if (singleImageConfig.mobileImageUrl) return singleImageConfig.mobileImageUrl;
  }

  // 3. Desktop / General device configuration
  const desk = singleImageConfig.desktop || singleImageConfig.desktopImage;
  if (typeof desk === 'string' && desk.trim()) return desk.trim();
  if (desk && typeof desk === 'object') {
    if (desk[langKey]?.imageUrl) return desk[langKey].imageUrl;
    if (desk.en?.imageUrl) return desk.en.imageUrl;
    if (desk.te?.imageUrl) return desk.te.imageUrl;
    if (desk.imageUrl) return desk.imageUrl;
    if (desk.url) return desk.url;
  }

  // 4. Default image object fallbacks
  if (singleImageConfig.defaultImage?.imageUrl) return singleImageConfig.defaultImage.imageUrl;
  if (singleImageConfig.default?.imageUrl) return singleImageConfig.default.imageUrl;

  // 5. Direct properties on root single configuration
  if (singleImageConfig.imageUrl) return singleImageConfig.imageUrl;
  if (singleImageConfig.url) return singleImageConfig.url;
  if (singleImageConfig.image) return singleImageConfig.image;
  if (singleImageConfig.desktopImageUrl) return singleImageConfig.desktopImageUrl;

  return fallbackUrl;
}
