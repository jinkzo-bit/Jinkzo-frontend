import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Eye, Trash2, Copy, CheckCircle2, AlertTriangle, Sparkles,
  Calendar, Clock, ShieldCheck, Power, Layers, Image as ImageIcon
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import HomeHeroBannerRenderer from '../common/HomeHeroBannerRenderer';

export default function HomeHeroBannersTab({
  token,
  onOpenDesigner = () => {}
}) {
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewModalBanner, setPreviewModalBanner] = useState(null);
  const [deleteModalBanner, setDeleteModalBanner] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    displayOrder: 1,
    scheduleType: 'always',
    startAt: '',
    endAt: ''
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/home-hero-banners/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data || []);
      }
    } catch (err) {
      console.error('Fetch Home Hero Banners error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    try {
      setIsCreating(true);
      const res = await fetch(`${API_BASE}/home-hero-banners/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(createForm)
      });
      if (!res.ok) throw new Error('Failed to create hero banner');
      const created = await res.json();
      setShowCreateModal(false);
      setCreateForm({ name: '', displayOrder: 1, scheduleType: 'always', startAt: '', endAt: '' });
      await fetchBanners();
      onOpenDesigner(created._id, created);
    } catch (err) {
      console.error('Create hero banner error:', err);
      setNotification({ type: 'error', text: err.message || 'Create failed' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleEnable = async (banner) => {
    try {
      const res = await fetch(`${API_BASE}/home-hero-banners/admin/${banner._id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...banner,
          enabled: !banner.enabled
        })
      });
      if (res.ok) {
        await fetchBanners();
        setNotification({
          type: 'success',
          text: `Banner ${!banner.enabled ? 'Enabled' : 'Disabled'} successfully!`
        });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('Toggle enable error:', err);
    }
  };

  const handleDuplicate = async (bannerId) => {
    try {
      const res = await fetch(`${API_BASE}/home-hero-banners/admin/${bannerId}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchBanners();
        setNotification({ type: 'success', text: 'Hero Banner duplicated successfully!' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('Duplicate error:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalBanner) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`${API_BASE}/home-hero-banners/admin/${deleteModalBanner._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setDeleteModalBanner(null);
        await fetchBanners();
        setNotification({ type: 'success', text: 'Hero Banner deleted' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Derive status badge
  const getBannerStatusBadge = (b) => {
    if (!b.enabled) {
      return { label: 'Disabled', class: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
    if (!b.publishedConfig) {
      return { label: 'Draft Only', class: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    const now = new Date();
    if (b.scheduleType === 'scheduled') {
      if (b.startAt && new Date(b.startAt) > now) {
        return { label: 'Scheduled', class: 'bg-blue-50 text-blue-700 border-blue-200' };
      }
      if (b.endAt && new Date(b.endAt) < now) {
        return { label: 'Expired', class: 'bg-red-50 text-red-700 border-red-200' };
      }
    }
    return { label: 'Active Live', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Toast */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-surface border border-line rounded-3xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-black text-lg text-main">Home Hero Banners</h2>
            <span className="bg-violet-100 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
              Isolated System
            </span>
          </div>
          <p className="text-xs text-muted font-medium mt-1">
            Create, design, schedule, and publish promotional Hero Banners for Customer Home.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-2xl shadow-md shadow-primary/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Hero Banner</span>
        </button>
      </div>

      {/* Hero Banners Grid */}
      {isLoading ? (
        <div className="bg-surface rounded-3xl p-12 border border-line flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-muted">Loading Home Hero Banners...</span>
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-surface border border-line rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
          <Sparkles className="w-10 h-10 text-primary/40" />
          <h3 className="font-display font-bold text-base text-main">No Home Hero Banners Yet</h3>
          <p className="text-xs text-muted max-w-sm">
            Create your first Home Hero Banner to customize Customer Home. (Customer Home is currently using old fallback carousel).
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            + Create First Hero Banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {banners.map((b) => {
            const status = getBannerStatusBadge(b);
            const activeConfig = b.publishedConfig || b.draftConfig;
            const mode = activeConfig?.mode || 'layered';

            return (
              <div
                key={b._id}
                className="bg-surface border border-line rounded-3xl p-4 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-md transition-all"
              >
                <div className="flex flex-col gap-3">
                  {/* Banner Preview Thumbnail */}
                  <div className="w-full bg-base rounded-2xl border border-line overflow-hidden p-1.5 flex justify-center items-center">
                    <div className="w-full scale-95 origin-center">
                      <HomeHeroBannerRenderer
                        config={activeConfig}
                        isEditor={false}
                        disableNavigation={true}
                        effectiveWidth={360}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-black text-sm text-main truncate">
                      {b.name}
                    </h3>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border shrink-0 ${status.class}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted font-semibold">
                    <span className="uppercase font-extrabold text-primary">Mode: {mode}</span>
                    <span>Order: #{b.displayOrder || 1}</span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between border-t border-line pt-3 gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewModalBanner(b)}
                      className="p-2 rounded-xl border border-line text-muted hover:text-main hover:bg-base cursor-pointer"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(b._id)}
                      className="p-2 rounded-xl border border-line text-muted hover:text-main hover:bg-base cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleEnable(b)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        b.enabled ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'border-line text-muted hover:bg-base'
                      }`}
                      title={b.enabled ? 'Disable Banner' : 'Enable Banner'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteModalBanner(b)}
                      className="p-2 rounded-xl border border-line text-muted hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenDesigner(b._id, b)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Studio</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleCreate} className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <h3 className="font-display font-extrabold text-base text-main">Create New Home Hero Banner</h3>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-muted">Banner Name</label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. Vinayaka Chavithi Festival Hero"
                className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Display Order</label>
                <input
                  type="number"
                  min="1"
                  value={createForm.displayOrder}
                  onChange={(e) => setCreateForm({ ...createForm, displayOrder: Number(e.target.value) })}
                  className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Schedule Mode</label>
                <select
                  value={createForm.scheduleType}
                  onChange={(e) => setCreateForm({ ...createForm, scheduleType: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="always">Always Active</option>
                  <option value="scheduled">Scheduled Window</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 border border-line text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create & Open Studio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-4xl w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-extrabold text-base text-main">
                {previewModalBanner.name} — Live Simulation Preview
              </h3>
              <button
                type="button"
                onClick={() => setPreviewModalBanner(null)}
                className="p-2 rounded-full hover:bg-base text-muted hover:text-main cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="w-full flex justify-center py-4 bg-base rounded-2xl border border-line">
              <div className="w-full max-w-4xl">
                <HomeHeroBannerRenderer
                  config={previewModalBanner.publishedConfig || previewModalBanner.draftConfig}
                  disableNavigation={true}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewModalBanner(null)}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-display font-extrabold text-base text-main">Delete Hero Banner?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Are you sure you want to delete "{deleteModalBanner.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalBanner(null)}
                className="flex-1 py-2.5 border border-line text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
