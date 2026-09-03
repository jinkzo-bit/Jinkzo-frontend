import React, { useState, useEffect } from 'react';
import {
  Sparkles, Palette, Boxes, ExternalLink, Eye, Smartphone, Tablet, Monitor,
  Layers, ArrowRight, CheckCircle2, ShieldCheck, RefreshCw, AlertCircle
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import HomeHeroBannerRenderer from '../common/HomeHeroBannerRenderer';
import HomeBackgroundRenderer from '../common/HomeBackgroundRenderer';
import CategoryCardRenderer from '../common/CategoryCardRenderer';
import HomeHeroBannersTab from './HomeHeroBannersTab';
import HomeBackgroundTab from './HomeBackgroundTab';
import CategoryCardsTab from './CategoryCardsTab';
import { DEFAULT_CATEGORY_DESIGNS } from '../../utils/categoryDesignDefaults';

const CATEGORY_SERVICES = [
  { id: 'food', name: 'Food Delivery', title: 'Food Delivery', cardImage: '/assets/home/categories/cards/food-card.webp' },
  { id: 'ride', name: 'Ride & Courier', title: 'Ride & Courier', cardImage: '/assets/home/categories/cards/ride-card.webp' },
  { id: 'grocery', name: 'Grocery', title: 'Grocery', cardImage: '/assets/home/categories/cards/grocery-card.webp' },
  { id: 'bakery_beverages', name: 'Bakery & Beverages', title: 'Bakery & Beverages', cardImage: '/assets/home/categories/cards/bakery-card.webp' },
  { id: 'veg_fruits', name: 'Veg & Fruits', title: 'Veg & Fruits', cardImage: '/assets/home/categories/cards/veg-fruits-card.webp' },
  { id: 'meat', name: 'Meat', title: 'Meat', cardImage: '/assets/home/categories/cards/meat-card.webp' }
];

export default function HomeDesignDashboard({
  token,
  initialSubTab = 'overview',
  categoryDesigns: propCategoryDesigns,
  isCategoryDesignsLoading = false,
  onRefreshCategoryDesigns,
  onOpenHeroDesigner = () => {},
  onOpenCategoryDesigner = () => {}
}) {
  const [activeTab, setActiveTab] = useState(initialSubTab); // 'overview' | 'hero_banners' | 'home_background' | 'category_cards'
  const [previewViewport, setPreviewViewport] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'

  // Summary state for Overview tab
  const [heroBanners, setHeroBanners] = useState([]);
  const [backgroundConfig, setBackgroundConfig] = useState(null);
  const [internalCategoryDesigns, setInternalCategoryDesigns] = useState(DEFAULT_CATEGORY_DESIGNS);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);

  const categoryDesigns = propCategoryDesigns || internalCategoryDesigns || DEFAULT_CATEGORY_DESIGNS;

  useEffect(() => {
    setActiveTab(initialSubTab);
  }, [initialSubTab]);

  // Fetch summary data for overview management cards & live preview
  const fetchDashboardSummary = async () => {
    try {
      setIsLoadingSummary(true);
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Hero Banners
      const heroRes = await fetch(`${API_BASE}/home-hero-banners/admin`, { headers }).catch(() => null);
      if (heroRes && heroRes.ok) {
        const heroData = await heroRes.json();
        setHeroBanners(Array.isArray(heroData) ? heroData : []);
      }

      // 2. Fetch Home Background
      const bgRes = await fetch(`${API_BASE}/home-background/admin`, { headers }).catch(() => null);
      if (bgRes && bgRes.ok) {
        const bgData = await bgRes.json();
        setBackgroundConfig(bgData?.publishedConfig || bgData?.draftConfig || null);
      }

      // 3. Fetch Category Designs
      const catRes = await fetch(`${API_BASE}/admin/category-designs`, { headers }).catch(() => null);
      if (catRes && catRes.ok) {
        const catData = await catRes.json();
        if (catData && typeof catData === 'object') {
          setInternalCategoryDesigns(catData);
        }
      }
    } catch (err) {
      console.error('Fetch Home Design Dashboard summary error:', err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchDashboardSummary();
  }, [token]);

  const activeHero = heroBanners.find(b => b.enabled && b.publishedConfig) || heroBanners[0];
  const activeHeroCount = heroBanners.filter(b => b.enabled).length;

  const viewportWidth = previewViewport === 'mobile' ? 390 : (previewViewport === 'tablet' ? 768 : 1280);

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* ── DASHBOARD TOP HEADER ───────────────────────────────────────────── */}
      <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-xl text-main tracking-tight">
                Jinkzo Home Design
              </h1>
              <span className="bg-violet-100 text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full border border-violet-200 uppercase tracking-wider">
                Unified Hub
              </span>
            </div>
            <p className="text-xs text-muted font-medium mt-0.5">
              Manage the complete visual appearance, hero carousel, background layers, and service cards of the Customer Home page.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLivePreviewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-line-strong bg-base hover:bg-surface text-main text-xs font-extrabold shadow-2xs transition-all cursor-pointer hover:border-primary hover:text-primary"
          >
            <Eye className="w-4 h-4 text-primary" />
            <span>Preview Home</span>
          </button>
        </div>
      </div>

      {/* ── SUB-NAVIGATION TABS BAR ─────────────────────────────────────────── */}
      <div className="bg-surface border border-line p-1.5 rounded-2xl flex items-center gap-1 overflow-x-auto shadow-2xs">
        {[
          { id: 'overview', label: 'Overview & Live Preview', icon: Layers },
          { id: 'hero_banners', label: 'Hero Banners', icon: Sparkles, badge: heroBanners.length },
          { id: 'home_background', label: 'Home Background', icon: Palette, badge: backgroundConfig?.type || 'Default' },
          { id: 'category_cards', label: 'Category Cards', icon: Boxes, badge: 6 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-violet-500/20'
                  : 'text-muted hover:text-main hover:bg-base'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-base text-muted border border-line'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT CONTAINERS ────────────────────────────────────────── */}

      {/* TAB 1: OVERVIEW & UNIFIED DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-8">
          {/* THREE MANAGEMENT CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* MANAGEMENT CARD 1: HOME HERO BANNERS */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs flex flex-col justify-between gap-4 transition-all hover:border-violet-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-primary border border-violet-200">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-extrabold text-sm text-main">
                      Home Hero Banners
                    </h3>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-violet-50 text-primary border border-violet-200">
                    {activeHeroCount} Active
                  </span>
                </div>

                <p className="text-xs text-muted font-medium line-clamp-2">
                  Create and design layered or single-graphic promotional banners displayed at the top of Customer Home.
                </p>

                {/* Hero Banner Mini Live Preview */}
                <div className="rounded-2xl border border-line bg-base p-2 overflow-hidden shadow-inner">
                  {activeHero ? (
                    <HomeHeroBannerRenderer
                      config={activeHero.publishedConfig || activeHero.draftConfig}
                      forceMobile={false}
                      effectiveWidth={400}
                      disableNavigation={true}
                    />
                  ) : (
                    <div className="h-28 rounded-xl bg-violet-950/20 flex flex-col items-center justify-center text-muted gap-1">
                      <Sparkles className="w-6 h-6 text-primary/40 animate-pulse" />
                      <span className="text-xs font-bold">No Active Hero Banner</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('hero_banners')}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-50 hover:bg-violet-100 text-primary font-black text-xs border border-violet-200 flex items-center justify-center gap-2 transition-all cursor-pointer group"
              >
                <span>Manage Hero Banners</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* MANAGEMENT CARD 2: HOME BACKGROUND */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs flex flex-col justify-between gap-4 transition-all hover:border-violet-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 border border-purple-200">
                      <Palette className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-extrabold text-sm text-main">
                      Home Background
                    </h3>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 capitalize">
                    {backgroundConfig?.type || 'Default'}
                  </span>
                </div>

                <p className="text-xs text-muted font-medium line-clamp-2">
                  Customize solid colors, radial/linear gradients, or full background image artwork behind Customer Home.
                </p>

                {/* Home Background Mini Preview */}
                <div className="rounded-2xl border border-line bg-base h-28 p-2 overflow-hidden shadow-inner relative flex items-center justify-center">
                  <HomeBackgroundRenderer config={backgroundConfig}>
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <span className="font-black text-xs text-main drop-shadow-sm">
                        {backgroundConfig?.type ? `Active: ${backgroundConfig.type.toUpperCase()}` : 'Default Jinkzo Background'}
                      </span>
                    </div>
                  </HomeBackgroundRenderer>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('home_background')}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-black text-xs border border-purple-200 flex items-center justify-center gap-2 transition-all cursor-pointer group"
              >
                <span>Manage Home Background</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* MANAGEMENT CARD 3: CATEGORY CARDS */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs flex flex-col justify-between gap-4 transition-all hover:border-violet-300">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <h3 className="font-display font-extrabold text-sm text-main">
                      Category Cards
                    </h3>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    6 Services
                  </span>
                </div>

                <p className="text-xs text-muted font-medium line-clamp-2">
                  Customize card background colors, badges, titles, and layout for Food, Ride, Grocery, Bakery, Veg, and Meat.
                </p>

                {/* Category Cards Mini Previews Grid */}
                <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-base border border-line rounded-2xl overflow-hidden">
                  {CATEGORY_SERVICES.slice(0, 3).map((cat) => (
                    <div key={cat.id} className="scale-90 origin-center">
                      <CategoryCardRenderer
                        serviceKey={cat.id}
                        designConfig={categoryDesigns[cat.id]}
                        defaultTitle={cat.title}
                        defaultCardImage={cat.cardImage}
                        compact={true}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('category_cards')}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs border border-indigo-200 flex items-center justify-center gap-2 transition-all cursor-pointer group"
              >
                <span>Manage Category Cards</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

          </div>

          {/* ── LIVE CUSTOMER HOME PREVIEW SECTION ─────────────────────────── */}
          <div className="bg-surface border border-line rounded-3xl p-6 shadow-2xs flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <h2 className="font-display font-black text-lg text-main">
                  Live Customer Home Preview
                </h2>
                <p className="text-xs text-muted font-medium">
                  Real-time simulated composition combining published Hero Banner, Background layer, and Category Cards.
                </p>
              </div>

              {/* VIEWPORT DEVICE TOGGLES */}
              <div className="flex items-center gap-1.5 bg-base border border-line p-1 rounded-2xl self-start sm:self-auto">
                <button
                  onClick={() => setPreviewViewport('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    previewViewport === 'desktop'
                      ? 'bg-surface text-primary shadow-xs border border-line'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  <Monitor className="w-4 h-4" /> Desktop (1440)
                </button>
                <button
                  onClick={() => setPreviewViewport('tablet')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    previewViewport === 'tablet'
                      ? 'bg-surface text-primary shadow-xs border border-line'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  <Tablet className="w-4 h-4" /> Tablet (768)
                </button>
                <button
                  onClick={() => setPreviewViewport('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    previewViewport === 'mobile'
                      ? 'bg-surface text-primary shadow-xs border border-line'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  <Smartphone className="w-4 h-4" /> Mobile (390)
                </button>
              </div>
            </div>

            {/* PREVIEW CONTAINER STAGE */}
            <div className="w-full overflow-x-auto flex justify-center bg-base/60 border border-line rounded-2xl p-4 sm:p-8">
              <div
                style={{ width: `${viewportWidth}px` }}
                className="transition-all duration-500 rounded-3xl border border-line-strong shadow-xl overflow-hidden bg-surface flex flex-col shrink-0"
              >
                <HomeBackgroundRenderer config={backgroundConfig}>
                  <div className="p-4 sm:p-6 flex flex-col gap-6 min-h-[500px]">
                    {/* Simulated Header */}
                    <div className="flex items-center justify-between border-b border-line/40 pb-3">
                      <div className="font-black text-lg text-primary tracking-tight">JINKZO</div>
                      <div className="flex items-center gap-2 text-xs font-bold text-muted">
                        <span>Location: Hyderabad</span>
                      </div>
                    </div>

                    {/* Published Hero Banner Carousel Preview */}
                    {activeHero ? (
                      <HomeHeroBannerRenderer
                        config={activeHero.publishedConfig || activeHero.draftConfig}
                        forceMobile={previewViewport === 'mobile'}
                        effectiveWidth={viewportWidth}
                        disableNavigation={true}
                      />
                    ) : (
                      <div className="h-36 rounded-3xl bg-violet-950/20 flex flex-col items-center justify-center text-muted gap-1 border border-line">
                        <Sparkles className="w-6 h-6 text-primary/40" />
                        <span className="text-xs font-bold">No Published Hero Banner</span>
                      </div>
                    )}

                    {/* Published Category Cards Preview Grid */}
                    <div className="flex flex-col gap-3">
                      <h3 className="font-display font-black text-sm text-main">
                        Explore Platform Services
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {CATEGORY_SERVICES.map((cat) => (
                          <CategoryCardRenderer
                            key={cat.id}
                            serviceKey={cat.id}
                            designConfig={categoryDesigns[cat.id]}
                            defaultTitle={cat.title}
                            defaultCardImage={cat.cardImage}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </HomeBackgroundRenderer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HERO BANNERS EDITOR */}
      {activeTab === 'hero_banners' && (
        <HomeHeroBannersTab
          token={token}
          onOpenDesigner={onOpenHeroDesigner}
        />
      )}

      {/* TAB 3: HOME BACKGROUND EDITOR */}
      {activeTab === 'home_background' && (
        <HomeBackgroundTab
          token={token}
        />
      )}

      {/* TAB 4: CATEGORY CARDS EDITOR */}
      {activeTab === 'category_cards' && (
        <CategoryCardsTab
          categoryDesigns={categoryDesigns}
          isLoading={isCategoryDesignsLoading || isLoadingSummary}
          onRefresh={onRefreshCategoryDesigns || fetchDashboardSummary}
          onEditCategory={onOpenCategoryDesigner}
          onPreviewCategory={onOpenCategoryDesigner}
        />
      )}

      {/* ── FULL LIVE PREVIEW MODAL ────────────────────────────────────────── */}
      {showLivePreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-line flex items-center justify-between bg-base">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <h3 className="font-display font-black text-base text-main">
                  Customer Home Live Preview
                </h3>
              </div>
              <button
                onClick={() => setShowLivePreviewModal(false)}
                className="px-3 py-1.5 rounded-xl border border-line text-xs font-bold text-muted hover:bg-surface cursor-pointer"
              >
                Close Preview
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex justify-center bg-base/80">
              <div className="w-full max-w-3xl rounded-3xl border border-line bg-surface overflow-hidden shadow-2xl">
                <HomeBackgroundRenderer config={backgroundConfig}>
                  <div className="p-6 flex flex-col gap-6">
                    {activeHero && (
                      <HomeHeroBannerRenderer
                        config={activeHero.publishedConfig || activeHero.draftConfig}
                        disableNavigation={true}
                      />
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {CATEGORY_SERVICES.map((cat) => (
                        <CategoryCardRenderer
                          key={cat.id}
                          serviceKey={cat.id}
                          designConfig={categoryDesigns[cat.id]}
                          defaultTitle={cat.title}
                          defaultCardImage={cat.cardImage}
                        />
                      ))}
                    </div>
                  </div>
                </HomeBackgroundRenderer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
