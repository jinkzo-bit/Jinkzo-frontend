import React, { useState } from 'react';
import {
  Layers, Eye, Palette, CheckCircle2, Clock,
  RefreshCw, Sparkles, ExternalLink, AlertCircle
} from 'lucide-react';
import CategoryCardRenderer from '../common/CategoryCardRenderer';
import { CATEGORY_KEYS, CATEGORY_INFO, DEFAULT_CATEGORY_DESIGNS } from '../../utils/categoryDesignDefaults';
import { formatAppDate } from '../../utils/dateUtils';

export default function CategoryCardsTab({
  categoryDesigns = DEFAULT_CATEGORY_DESIGNS,
  isLoading = false,
  onRefresh = () => {},
  onEditCategory = () => {},
  onPreviewCategory = () => {}
}) {
  const safeCategoryDesigns = categoryDesigns || DEFAULT_CATEGORY_DESIGNS;
  const [previewModalCategory, setPreviewModalCategory] = useState(null);
  const [previewLanguage, setPreviewLanguage] = useState('en');

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-violet-500/10 text-primary flex items-center justify-center border border-primary/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg text-main">
                Customer Home Category Cards
              </h3>
              <p className="text-xs text-muted font-medium">
                Manage the visual design, artwork, typography, and translations for the 6 core customer home cards.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-line text-xs font-bold text-muted hover:bg-base hover:text-main transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Info notice about fixed business categories */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200">
        <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-bold">Fixed Platform Services Architecture</span>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            These 6 categories are permanent business service pillars in Jinkzo with dedicated ordering pipelines. Category routing, pricing, and restaurant listings remain locked to protect operational stability. The Category Designer gives Super Admin 100% control over visual branding, artwork positioning, and typography.
          </p>
        </div>
      </div>

      {/* 6 Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CATEGORY_KEYS.map((key) => {
          const info = CATEGORY_INFO[key] || { name: key, defaultLink: '/' };
          const designDoc = safeCategoryDesigns[key];
          const published = designDoc?.publishedConfig || null;
          const draft = designDoc?.draftConfig || null;
          const hasDraftChanges = Boolean(
            published && draft && JSON.stringify(published) !== JSON.stringify(draft)
          );
          const lastUpdated = designDoc?.updatedAt || designDoc?.publishedAt;

          return (
            <div
              key={key}
              className="bg-surface border border-line rounded-3xl p-4.5 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-xs hover:border-line-strong transition-all duration-200"
            >
              {/* Top: Header Info */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black text-sm sm:text-base text-main truncate">
                      {info.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-base text-muted border border-line">
                      /{key}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted font-medium mt-0.5 truncate">
                    Route: <span className="font-semibold text-main">{info.defaultLink}</span>
                  </span>
                </div>

                {hasDraftChanges ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                    <Clock className="w-3 h-3" />
                    Unpublished Draft
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    Published
                  </span>
                )}
              </div>

              {/* Middle: 1:1 Live Thumbnail Preview using shared renderer */}
              <div className="w-full max-w-[240px] mx-auto aspect-square rounded-2xl overflow-hidden shadow-2xs border border-line/80 relative">
                {published ? (
                  <CategoryCardRenderer
                    design={published}
                    language="en"
                    forcedCardWidth={240}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-base text-muted text-xs font-semibold">
                    Loading preview...
                  </div>
                )}
              </div>

              {/* Bottom: Meta Info & Action Buttons */}
              <div className="flex flex-col gap-3 pt-2 border-t border-line">
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>Last Updated:</span>
                  <span className="font-semibold text-main">
                    {lastUpdated ? formatAppDate(lastUpdated) : 'Default Factory Design'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewModalCategory(key)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-line hover:bg-base text-muted hover:text-main text-xs font-bold transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEditCategory(key)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Edit Design</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Preview Modal */}
      {previewModalCategory && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewModalCategory(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-scale-up"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h4 className="font-display font-black text-base text-main">
                  {CATEGORY_INFO[previewModalCategory]?.name} Card Preview
                </h4>
                <p className="text-xs text-muted">Exact Customer Home Render</p>
              </div>

              {/* Language Switcher in Preview Modal */}
              <div className="flex items-center p-0.5 bg-base border border-line rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewLanguage('en')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    previewLanguage === 'en' ? 'bg-primary text-white shadow-xs' : 'text-muted'
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLanguage('te')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    previewLanguage === 'te' ? 'bg-primary text-white shadow-xs' : 'text-muted'
                  }`}
                >
                  తెలుగు
                </button>
              </div>
            </div>

            <div className="w-full max-w-[320px] mx-auto aspect-square rounded-2xl overflow-hidden shadow-lg border border-line">
              {safeCategoryDesigns[previewModalCategory]?.publishedConfig && (
                <CategoryCardRenderer
                  design={safeCategoryDesigns[previewModalCategory].publishedConfig}
                  language={previewLanguage}
                  forcedCardWidth={320}
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setPreviewModalCategory(null)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-muted hover:bg-base cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const cat = previewModalCategory;
                  setPreviewModalCategory(null);
                  onEditCategory(cat);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-hover cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Open in Designer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
