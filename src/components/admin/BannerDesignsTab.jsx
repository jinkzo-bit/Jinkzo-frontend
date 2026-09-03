import React from 'react';
import {
  ImagePlus, Plus, Pencil, Trash2, Calendar, Clock, CheckCircle2,
  AlertCircle, Sparkles, ExternalLink, RefreshCw, Layers, ShieldAlert
} from 'lucide-react';
import { getImageUrl, handleImageError } from '../../utils/uploadUtil';
import { formatAppDate, formatAppDateOnly } from '../../utils/dateUtils';

// Derived banner status computation helper
export function getBannerDerivedStatus(banner) {
  const now = new Date();
  const isActive = banner.active !== false && banner.isActive !== false;
  if (!isActive) return { code: 'DISABLED', label: 'Disabled', color: 'bg-gray-100 text-gray-600 border-gray-200' };

  if (banner.startDate && new Date(banner.startDate) > now) {
    return { code: 'SCHEDULED', label: 'Scheduled', color: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' };
  }
  if (banner.endDate && new Date(banner.endDate) < now) {
    return { code: 'EXPIRED', label: 'Expired', color: 'bg-red-50 text-red-700 border-red-200' };
  }
  return { code: 'ACTIVE', label: 'Live & Active', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

export default function BannerDesignsTab({
  banners = [],
  bannerDesigns = {},
  isLoading = false,
  onRefresh = () => {},
  onEditDesign = () => {},
  onToggle = () => {},
  onDelete = () => {},
  onAdd = () => {}
}) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-violet-500/10 text-primary flex items-center justify-center border border-primary/20">
              <ImagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg text-main">
                Customer Homepage Promo Banners & Studio
              </h3>
              <p className="text-xs text-muted font-medium">
                Configure visual branding, festival campaigns, bilingual typography, and automated schedule windows.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-line text-xs font-bold text-muted hover:bg-base hover:text-main transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-2xl text-xs font-bold shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Banner</span>
          </button>
        </div>
      </div>

      {/* Info notice about zero-regression legacy banner support */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200">
        <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="font-bold">Authoritative Schedule & Design Studio Architecture</span>
          <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            Banner display eligibility is authoritative in the database. Legacy banners with no custom studio design remain 100% visible on Customer Home. Editing a design in the Banner Studio creates a draft that is isolated from customers until explicitly published.
          </p>
        </div>
      </div>

      {/* Banners List / Table */}
      {isLoading ? (
        <div className="bg-surface rounded-3xl p-12 border border-line flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-muted">Loading promo banners & designs...</span>
        </div>
      ) : banners.length > 0 ? (
        <div className="bg-surface border border-line rounded-3xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-base/50 text-[10px] uppercase font-extrabold tracking-wider text-muted">
                  <th className="py-3.5 px-4">Banner & Details</th>
                  <th className="py-3.5 px-4">Design Mode</th>
                  <th className="py-3.5 px-4">Schedule Window</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs font-medium">
                {banners.map((b) => {
                  const status = getBannerDerivedStatus(b);
                  const designDoc = bannerDesigns[String(b._id)];
                  const hasPublishedDesign = Boolean(designDoc && designDoc.publishedConfig);
                  const hasDraftChanges = Boolean(
                    designDoc && designDoc.draftConfig &&
                    (!designDoc.publishedConfig || JSON.stringify(designDoc.draftConfig) !== JSON.stringify(designDoc.publishedConfig))
                  );

                  const previewImage = designDoc?.publishedConfig?.singleImage?.desktop?.en?.imageUrl ||
                    designDoc?.publishedConfig?.artwork?.imageUrl ||
                    b.imageUrl ||
                    '/assets/hero_delivery_banner.jpg';

                  return (
                    <tr key={b._id} className="hover:bg-base/30 transition-colors">
                      {/* Banner & Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-12 rounded-xl overflow-hidden bg-base border border-line flex-shrink-0 relative">
                            <img
                              src={getImageUrl(previewImage, 'banner')}
                              alt={b.title || b.name}
                              className="w-full h-full object-cover"
                              onError={(e) => handleImageError(e, 'banner')}
                            />
                          </div>
                          <div className="flex flex-col min-w-0 max-w-[240px]">
                            <span className="font-extrabold text-main truncate text-xs">
                              {b.name || b.title || 'Untitled Banner'}
                            </span>
                            {b.subtitle && (
                              <span className="text-[11px] text-muted truncate">{b.subtitle}</span>
                            )}
                            <span className="text-[10px] text-muted font-mono truncate mt-0.5">
                              CTA: {b.link || '/restaurants'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Design Mode Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {hasPublishedDesign ? (
                            <span className="inline-flex items-center gap-1 bg-violet-50 text-primary border border-violet-200 font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                              <Sparkles className="w-3 h-3" />
                              <span>Studio Design ({designDoc.publishedConfig.mode})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 border border-gray-200 font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                              <span>Legacy Banner</span>
                            </span>
                          )}

                          {hasDraftChanges && (
                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              ● Unpublished Draft
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Schedule Window */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          {b.startDate || b.endDate ? (
                            <>
                              <div className="flex items-center gap-1 text-muted">
                                <Calendar className="w-3 h-3 text-primary shrink-0" />
                                <span>
                                  {b.startDate ? formatAppDateOnly(b.startDate) : 'Start'} → {b.endDate ? formatAppDateOnly(b.endDate) : 'Indefinite'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-muted font-medium italic">Always Active (No Date Limit)</span>
                          )}
                        </div>
                      </td>

                      {/* Status Chip */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggle(b._id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer border ${status.color}`}
                          title="Click to toggle ON/OFF status"
                        >
                          <span>{status.label}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onEditDesign(b._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit Design</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDelete(b)}
                            className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                            title="Delete Banner"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-3xl p-10 text-center border border-line shadow-2xs flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <ImagePlus className="w-7 h-7" />
          </div>
          <h4 className="font-display font-extrabold text-base text-main">No Promo Banners Configured</h4>
          <p className="text-xs text-muted font-medium max-w-sm">
            Default system banners are currently active on the customer homepage. Create custom promo banners to schedule festival offers.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-2xl text-xs font-bold shadow-md shadow-primary/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Banner</span>
          </button>
        </div>
      )}
    </div>
  );
}
