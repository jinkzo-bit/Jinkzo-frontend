import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Save, Send, RotateCcw, RotateCw, Eye, Upload, Trash2,
  CheckCircle2, AlertTriangle, Smartphone, Monitor, Tablet, Check, RefreshCw, Palette, Image as ImageIcon
} from 'lucide-react';
import HomeBackgroundRenderer from '../common/HomeBackgroundRenderer';
import { API_BASE } from '../../config/api';
import { uploadFileToBackend, getImageUrl } from '../../utils/uploadUtil';
import { useAuthStore } from '../../store/authStore';

const DEVICE_VIEWPORTS = [
  { id: 'mobile-320', name: 'Mobile (320px)', width: 320, icon: Smartphone, label: '320' },
  { id: 'mobile-360', name: 'Mobile (360px)', width: 360, icon: Smartphone, label: '360' },
  { id: 'mobile-390', name: 'Mobile (390px)', width: 390, icon: Smartphone, label: '390' },
  { id: 'mobile-430', name: 'Mobile (430px)', width: 430, icon: Smartphone, label: '430' },
  { id: 'tablet-768', name: 'Tablet (768px)', width: 768, icon: Tablet, label: '768' },
  { id: 'desktop-1024', name: 'Desktop (1024px)', width: 1024, icon: Monitor, label: '1024' },
  { id: 'desktop-1440', name: 'Desktop (1440px)', width: 1280, icon: Monitor, label: '1440' }
];

const DEFAULT_BACKGROUND_CONFIG = {
  type: 'default',
  solid: { color: '#FAFAFF' },
  gradient: {
    type: 'linear',
    color1: '#F3E8FF',
    color2: '#FFFFFF',
    color3: '#FFF3E0',
    direction: 'to-b'
  },
  image: {
    imageUrl: '',
    fitMode: 'cover',
    position: 'center',
    repeat: 'no-repeat',
    overlayColor: '#FFFFFF',
    overlayOpacity: 0,
    blurPx: 0,
    opacity: 100
  }
};

export default function HomeBackgroundTab({ token }) {
  const [backgroundDoc, setBackgroundDoc] = useState(null);
  const [draftConfig, setDraftConfig] = useState(DEFAULT_BACKGROUND_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [activeViewport, setActiveViewport] = useState('desktop-1440');
  const [statusNotification, setStatusNotification] = useState(null);

  // Modals & Loaders
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);

  // Studio column width for viewport scaling
  const studioContainerRef = useRef(null);
  const [studioColumnWidth, setStudioColumnWidth] = useState(600);

  useEffect(() => {
    if (!studioContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width > 0) {
          setStudioColumnWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(studioContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const getAuthToken = () => {
    return token || useAuthStore.getState().token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
  };

  // Fetch admin background document authoritatively from backend
  const fetchDoc = async () => {
    try {
      setIsLoading(true);
      const authToken = getAuthToken();
      const res = await fetch(`${API_BASE}/home-background/admin`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to load home background settings');
      const data = await res.json();
      setBackgroundDoc(data);
      if (data.draftConfig) {
        setDraftConfig(JSON.parse(JSON.stringify(data.draftConfig)));
      }
    } catch (err) {
      console.error('Fetch home background error:', err);
      setStatusNotification({ type: 'error', text: err.message || 'Failed to load background settings' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoc();
  }, [token]);

  const updateDraft = (updater) => {
    setDraftConfig((prev) => {
      const copy = JSON.parse(JSON.stringify(prev || DEFAULT_BACKGROUND_CONFIG));
      updater(copy);
      return copy;
    });
  };

  // Save Draft API Call
  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      const authToken = getAuthToken();
      const res = await fetch(`${API_BASE}/home-background/admin/draft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ draftConfig })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save background draft');
      }

      const result = await res.json();
      setBackgroundDoc(result.data);
      setStatusNotification({
        type: 'success',
        text: 'Background draft saved! (Customer Home remains unchanged until Published)'
      });
      setTimeout(() => setStatusNotification(null), 4000);
    } catch (err) {
      console.error('Save background draft error:', err);
      setStatusNotification({ type: 'error', text: err.message || 'Failed to save background draft' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Publish Live API Call
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const authToken = getAuthToken();
      const res = await fetch(`${API_BASE}/home-background/admin/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ draftConfig })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to publish home background');
      }

      const result = await res.json();
      setBackgroundDoc(result.data);
      setShowPublishModal(false);
      setStatusNotification({
        type: 'success',
        text: '🚀 Customer Home Background published live successfully!'
      });
      setTimeout(() => setStatusNotification(null), 4500);
    } catch (err) {
      console.error('Publish background error:', err);
      setStatusNotification({ type: 'error', text: err.message || 'Failed to publish home background' });
    } finally {
      setIsPublishing(false);
    }
  };

  // Reset API Call
  const handleReset = async (target) => {
    try {
      setIsResetting(true);
      const authToken = getAuthToken();
      const res = await fetch(`${API_BASE}/home-background/admin/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ target })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to reset background draft');
      }

      const result = await res.json();
      setBackgroundDoc(result.data);
      if (result.data.draftConfig) {
        setDraftConfig(JSON.parse(JSON.stringify(result.data.draftConfig)));
      }
      setStatusNotification({
        type: 'success',
        text: target === 'published' ? 'Draft reset to published background configuration' : 'Draft reset to default Jinkzo background'
      });
      setTimeout(() => setStatusNotification(null), 3500);
    } catch (err) {
      console.error('Reset background error:', err);
      setStatusNotification({ type: 'error', text: err.message || 'Failed to reset background' });
    } finally {
      setIsResetting(false);
    }
  };

  const [uploadSlot, setUploadSlot] = useState('desktop');

  const triggerUpload = (slot) => {
    setUploadSlot(slot);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Image Upload Handling
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const authToken = getAuthToken();
      const uploadedUrl = await uploadFileToBackend(file, authToken);

      updateDraft((c) => {
        if (!c.image) c.image = {};
        c.type = 'image';
        if (uploadSlot === 'mobile') {
          c.image.mobileImageUrl = uploadedUrl;
        } else {
          c.image.desktopImageUrl = uploadedUrl;
          c.image.imageUrl = uploadedUrl;
        }
        if (!c.image.fitMode) c.image.fitMode = 'cover';
        if (!c.image.position) c.image.position = 'center';
      });

      setStatusNotification({ type: 'success', text: `${uploadSlot === 'mobile' ? 'Mobile' : 'Desktop'} background image uploaded successfully!` });
      setTimeout(() => setStatusNotification(null), 3000);
    } catch (err) {
      console.error('Image upload error:', err);
      setStatusNotification({ type: 'error', text: err.message || 'Image upload failed' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applySoftJinkzoPreset = () => {
    updateDraft((c) => {
      c.type = 'gradient';
      c.gradient = {
        type: 'linear',
        color1: '#F3E8FF',
        color2: '#FFFFFF',
        color3: '#FFF3E0',
        direction: 'to-b'
      };
    });
  };

  const activeViewportObj = DEVICE_VIEWPORTS.find(v => v.id === activeViewport) || DEVICE_VIEWPORTS[6];
  const targetRenderWidth = Math.min(1280, activeViewportObj.width);
  const studioPadding = 32;
  const availableStudioWidth = Math.max(280, studioColumnWidth - studioPadding);
  const scaleFactor = targetRenderWidth > availableStudioWidth ? availableStudioWidth / targetRenderWidth : 1;

  if (isLoading || !draftConfig) {
    return (
      <div className="bg-surface rounded-3xl p-12 border border-line flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-muted">Loading Home Background Designer...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {statusNotification && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-fade-in ${
          statusNotification.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {statusNotification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{statusNotification.text}</span>
        </div>
      )}

      {/* Top Actions Header */}
      <div className="bg-surface border border-line rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-black text-base text-main">
              Customer Home Background Designer
            </h3>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
              backgroundDoc?.publishedConfig ? 'bg-violet-50 text-primary border-violet-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {backgroundDoc?.publishedConfig ? 'Published' : 'Draft Only'}
            </span>
          </div>
          <p className="text-xs text-muted font-medium mt-0.5">
            Configure the visual background of Customer Home (Default, Solid Color, Gradient, or Image).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleReset('published')}
            disabled={isResetting}
            className="px-3 py-1.5 rounded-xl border border-line text-xs font-bold text-muted hover:bg-base hover:text-main cursor-pointer disabled:opacity-50"
            title="Reset draft to current published background"
          >
            Reset to Published
          </button>

          <button
            type="button"
            onClick={() => handleReset('default')}
            disabled={isResetting}
            className="px-3 py-1.5 rounded-xl border border-line text-xs font-bold text-muted hover:bg-base hover:text-main cursor-pointer disabled:opacity-50"
            title="Reset draft to factory Jinkzo default"
          >
            Reset to Default
          </button>

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-line text-xs font-bold text-muted hover:bg-base hover:text-main cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-base border border-line-strong hover:bg-line text-main rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-primary" />
            <span>{isSavingDraft ? 'Saving Draft...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            disabled={isPublishing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Live</span>
          </button>
        </div>
      </div>

      {/* Main Studio 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COL 1: Live Interactive Mini-Preview (7 cols) */}
        <div
          ref={studioContainerRef}
          className="lg:col-span-7 bg-surface border border-line rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col gap-4 overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <span className="text-xs font-extrabold text-main uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              Live Home Background Simulation
            </span>
            <span className="text-[10px] text-muted font-mono">
              Mode: <strong className="text-primary uppercase">{draftConfig.type}</strong>
            </span>
          </div>

          {/* Viewport Simulation Selector */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {DEVICE_VIEWPORTS.map((vp) => {
              const Icon = vp.icon;
              const active = activeViewport === vp.id;
              return (
                <button
                  key={vp.id}
                  type="button"
                  onClick={() => setActiveViewport(vp.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer shrink-0 border ${
                    active ? 'bg-violet-50 text-primary border-violet-200' : 'border-line text-muted hover:bg-base'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{vp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Canvas Wrapper with Scaling */}
          <div className="w-full flex flex-col items-center justify-center bg-base/50 p-4 rounded-2xl border border-line/60 overflow-hidden min-h-[420px]">
            <div
              style={{
                width: `${targetRenderWidth}px`,
                transform: scaleFactor < 1 ? `scale(${scaleFactor})` : 'none',
                transformOrigin: 'top center'
              }}
              className="transition-all duration-300 relative flex justify-center"
            >
              <div className="w-full rounded-3xl border border-line/80 shadow-lg overflow-hidden">
                <HomeBackgroundRenderer config={draftConfig}>
                  {/* Simulated Customer Home Elements */}
                  <div className="p-4 flex flex-col gap-4 max-w-7xl mx-auto w-full box-border">
                    {/* Simulated Header */}
                    <div className="flex items-center justify-between bg-surface/80 backdrop-blur-md p-3 rounded-2xl border border-line/60">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white font-black text-xs">J</div>
                        <span className="font-display font-black text-xs text-main">Jinkzo Home</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted bg-base px-2 py-1 rounded-lg">Deliver to Home</span>
                    </div>

                    {/* Simulated Hero Banner */}
                    <div className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 rounded-3xl p-6 text-white shadow-md min-h-[160px] flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Festival Special</span>
                        <h2 className="font-display font-black text-lg sm:text-xl">Grand Festival Deals 50% OFF</h2>
                      </div>
                      <div className="inline-flex self-start bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-black">
                        Order Now
                      </div>
                    </div>

                    {/* Simulated "What would you like to order?" Header */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-primary font-black text-base">››</span>
                      <h3 className="font-display font-black text-xs text-main">What would you like to order?</h3>
                    </div>

                    {/* Simulated Category Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { title: 'Food', color: 'from-orange-500 to-amber-500' },
                        { title: 'Ride', color: 'from-violet-600 to-purple-600' },
                        { title: 'Grocery', color: 'from-emerald-500 to-teal-600' }
                      ].map((cat, idx) => (
                        <div key={idx} className={`bg-gradient-to-br ${cat.color} rounded-2xl p-4 text-white shadow-sm flex flex-col justify-between min-h-[90px]`}>
                          <span className="font-black text-xs">{cat.title}</span>
                          <span className="text-[9px] opacity-80">Explore Categories →</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </HomeBackgroundRenderer>
              </div>
            </div>
          </div>
        </div>

        {/* COL 2: Background Controls & Settings (5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-line rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col gap-5">
          {/* Section: Background Type Selector */}
          <div className="flex flex-col gap-3 border-b border-line pb-4">
            <h4 className="font-display font-extrabold text-xs text-main uppercase tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Background Type
            </h4>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'default', label: 'Default Jinkzo' },
                { id: 'solid', label: 'Solid Color' },
                { id: 'gradient', label: 'Gradient' },
                { id: 'image', label: 'Background Image' }
              ].map((bType) => (
                <button
                  key={bType.id}
                  type="button"
                  onClick={() => updateDraft((c) => { c.type = bType.id; })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center justify-center text-center ${
                    draftConfig.type === bType.id
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-base border-line text-muted hover:text-main'
                  }`}
                >
                  {bType.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode 1: Default Jinkzo Background */}
          {draftConfig.type === 'default' && (
            <div className="bg-base border border-line rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Default Jinkzo Background Active</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Uses the factory default Customer Home background styling. Customer Home will look exactly like standard app defaults.
              </p>
            </div>
          )}

          {/* Mode 2: Solid Color */}
          {draftConfig.type === 'solid' && (
            <div className="flex flex-col gap-3">
              <h5 className="text-[10px] font-extrabold uppercase text-muted">Solid Background Color</h5>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={draftConfig.solid?.color || '#FAFAFF'}
                  onChange={(e) => updateDraft((c) => {
                    if (!c.solid) c.solid = {};
                    c.solid.color = e.target.value;
                  })}
                  className="w-12 h-10 rounded-xl cursor-pointer border border-line"
                />
                <input
                  type="text"
                  value={draftConfig.solid?.color || '#FAFAFF'}
                  onChange={(e) => updateDraft((c) => {
                    if (!c.solid) c.solid = {};
                    c.solid.color = e.target.value;
                  })}
                  className="flex-1 bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none uppercase"
                />
              </div>
            </div>
          )}

          {/* Mode 3: Gradient */}
          {draftConfig.type === 'gradient' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-extrabold uppercase text-muted">Gradient Configuration</h5>
                <button
                  type="button"
                  onClick={applySoftJinkzoPreset}
                  className="px-2.5 py-1 bg-violet-100 text-primary hover:bg-violet-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  ✨ Apply "Soft Jinkzo" Preset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted">Gradient Type</label>
                  <select
                    value={draftConfig.gradient?.type || 'linear'}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.gradient) c.gradient = {};
                      c.gradient.type = e.target.value;
                    })}
                    className="bg-base border border-line-strong rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                  >
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted">Direction / Center</label>
                  <select
                    value={draftConfig.gradient?.direction || 'to-b'}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.gradient) c.gradient = {};
                      c.gradient.direction = e.target.value;
                    })}
                    className="bg-base border border-line-strong rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                  >
                    {draftConfig.gradient?.type === 'radial' ? (
                      <>
                        <option value="center">Center</option>
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="bottom-left">Bottom Left</option>
                        <option value="bottom-right">Bottom Right</option>
                      </>
                    ) : (
                      <>
                        <option value="to-b">Top → Bottom</option>
                        <option value="to-t">Bottom → Top</option>
                        <option value="to-r">Left → Right</option>
                        <option value="to-l">Right → Left</option>
                        <option value="to-br">Diagonal ↘</option>
                        <option value="to-bl">Diagonal ↙</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase text-muted">Color 1</label>
                  <input
                    type="color"
                    value={draftConfig.gradient?.color1 || '#F3E8FF'}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.gradient) c.gradient = {};
                      c.gradient.color1 = e.target.value;
                    })}
                    className="w-full h-8 rounded-xl cursor-pointer border border-line"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase text-muted">Color 2</label>
                  <input
                    type="color"
                    value={draftConfig.gradient?.color2 || '#FFFFFF'}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.gradient) c.gradient = {};
                      c.gradient.color2 = e.target.value;
                    })}
                    className="w-full h-8 rounded-xl cursor-pointer border border-line"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-extrabold uppercase text-muted">Color 3</label>
                  <input
                    type="color"
                    value={draftConfig.gradient?.color3 || '#FFF3E0'}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.gradient) c.gradient = {};
                      c.gradient.color3 = e.target.value;
                    })}
                    className="w-full h-8 rounded-xl cursor-pointer border border-line"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode 4: Background Image */}
          {draftConfig.type === 'image' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                {/* Desktop Background Slot */}
                <div className="flex flex-col gap-1.5 bg-base/60 p-3 rounded-2xl border border-line">
                  <span className="text-[10px] font-extrabold uppercase text-muted">1. Desktop / Website Background Image</span>
                  {draftConfig.image?.desktopImageUrl || draftConfig.image?.imageUrl ? (
                    <div className="flex flex-col gap-2">
                      <div className="relative rounded-xl overflow-hidden border border-line bg-base aspect-[16/7]">
                        <img
                          src={getImageUrl(draftConfig.image.desktopImageUrl || draftConfig.image.imageUrl, 'banner')}
                          alt="Desktop Background"
                          style={{
                            objectFit: draftConfig.image?.fitMode || 'cover',
                            objectPosition: draftConfig.image?.position || 'center'
                          }}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => triggerUpload('desktop')}
                          disabled={isUploading}
                          className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          Replace Desktop Image
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDraft((c) => { c.image.desktopImageUrl = ''; c.image.imageUrl = ''; })}
                          className="py-2 px-3 bg-red-50 text-red-600 font-bold text-xs rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerUpload('desktop')}
                      disabled={isUploading}
                      className="py-3 px-4 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isUploading ? 'Uploading...' : 'Upload Desktop Background Image'}</span>
                    </button>
                  )}
                </div>

                {/* Mobile Background Slot */}
                <div className="flex flex-col gap-1.5 bg-purple-50/50 dark:bg-purple-950/20 p-3 rounded-2xl border border-purple-200">
                  <span className="text-[10px] font-extrabold uppercase text-purple-700 dark:text-purple-300">2. Mobile Background Image (Optional)</span>
                  {draftConfig.image?.mobileImageUrl ? (
                    <div className="flex flex-col gap-2">
                      <div className="relative rounded-xl overflow-hidden border border-purple-200 bg-base aspect-[9/16] max-h-48 mx-auto w-full max-w-[140px]">
                        <img
                          src={getImageUrl(draftConfig.image.mobileImageUrl, 'banner')}
                          alt="Mobile Background"
                          style={{
                            objectFit: draftConfig.image?.fitMode || 'cover',
                            objectPosition: draftConfig.image?.position || 'center'
                          }}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => triggerUpload('mobile')}
                          disabled={isUploading}
                          className="flex-1 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:text-purple-200 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          Replace Mobile Image
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDraft((c) => { c.image.mobileImageUrl = ''; })}
                          className="py-2 px-3 bg-red-50 text-red-600 font-bold text-xs rounded-xl cursor-pointer hover:bg-red-100 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => triggerUpload('mobile')}
                        disabled={isUploading}
                        className="py-2.5 px-4 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:text-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Mobile Background Image</span>
                      </button>
                      <span className="text-[9px] text-muted italic px-1">Mobile automatically falls back to Desktop Background if no mobile image is uploaded.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 bg-base/60 p-2.5 rounded-2xl border border-line">
                <label className="text-[10px] font-extrabold uppercase text-muted">Image Fit Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateDraft((c) => {
                      if (!c.image) c.image = {};
                      c.image.fitMode = 'cover';
                    })}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold cursor-pointer border ${
                      (draftConfig.image?.fitMode || 'cover') === 'cover'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface border-line text-muted'
                    }`}
                  >
                    Cover (Fill)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDraft((c) => {
                      if (!c.image) c.image = {};
                      c.image.fitMode = 'contain';
                    })}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold cursor-pointer border ${
                      draftConfig.image?.fitMode === 'contain'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface border-line text-muted'
                    }`}
                  >
                    Contain (Fit)
                  </button>
                </div>
                <span className="text-[9px] text-muted italic mt-0.5">
                  {(draftConfig.image?.fitMode || 'cover') === 'cover'
                    ? 'Cover fills the Home background; edges may be cropped.'
                    : 'Contain shows the complete background image.'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted">Position</label>
                  <select
                    value={draftConfig.image?.position || 'center'}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.image) c.image = {};
                      c.image.position = e.target.value;
                    })}
                    className="bg-base border border-line-strong rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                  >
                    <option value="center">Center</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                    <option value="top left">Top Left</option>
                    <option value="top right">Top Right</option>
                    <option value="bottom left">Bottom Left</option>
                    <option value="bottom right">Bottom Right</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted">Repeat Mode</label>
                  <select
                    value={draftConfig.image?.repeat || 'no-repeat'}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.image) c.image = {};
                      c.image.repeat = e.target.value;
                    })}
                    className="bg-base border border-line-strong rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                  >
                    <option value="no-repeat">No Repeat</option>
                    <option value="repeat">Repeat Pattern</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted">Overlay Color</label>
                  <input
                    type="color"
                    value={draftConfig.image?.overlayColor || '#FFFFFF'}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.image) c.image = {};
                      c.image.overlayColor = e.target.value;
                    })}
                    className="w-full h-8 rounded-xl cursor-pointer border border-line"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-muted">
                    <span>Overlay Opacity</span>
                    <span className="font-mono text-primary">{draftConfig.image?.overlayOpacity ?? 0}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={draftConfig.image?.overlayOpacity ?? 0}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.image) c.image = {};
                      c.image.overlayOpacity = Number(e.target.value);
                    })}
                    className="w-full cursor-pointer accent-primary mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-muted">
                    <span>Background Blur</span>
                    <span className="font-mono text-primary">{draftConfig.image?.blurPx ?? 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={draftConfig.image?.blurPx ?? 0}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.image) c.image = {};
                      c.image.blurPx = Number(e.target.value);
                    })}
                    className="w-full cursor-pointer accent-primary mt-1"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-muted">
                    <span>Image Opacity</span>
                    <span className="font-mono text-primary">{draftConfig.image?.opacity ?? 100}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={draftConfig.image?.opacity ?? 100}
                    onChange={(e) => updateDraft((c) => {
                      if (!c.image) c.image = {};
                      c.image.opacity = Number(e.target.value);
                    })}
                    className="w-full cursor-pointer accent-primary mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-5xl w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-extrabold text-base text-main">
                Customer Home Live Background Simulation Preview
              </h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-2 rounded-full hover:bg-base text-muted hover:text-main cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="w-full overflow-y-auto max-h-[70vh] rounded-2xl border border-line">
              <HomeBackgroundRenderer config={draftConfig}>
                <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
                  <div className="p-4 bg-surface/80 backdrop-blur-md rounded-2xl border border-line">
                    <span className="font-display font-black text-sm text-main">Live Simulated Customer Home Content</span>
                  </div>
                </div>
              </HomeBackgroundRenderer>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-primary">
              <Send className="w-6 h-6" />
              <h3 className="font-display font-extrabold text-base text-main">Publish Home Background Live?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              This will publish your draft background configuration live to Customer Home.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="flex-1 py-2.5 border border-line text-xs font-bold text-muted rounded-xl hover:bg-base cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={handlePublish}
                className="flex-1 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? 'Publishing...' : 'Yes, Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
