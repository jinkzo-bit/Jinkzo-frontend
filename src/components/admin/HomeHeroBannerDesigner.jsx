import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Send, Eye, Palette, Image as ImageIcon,
  Type, Move, Maximize2, AlertTriangle, CheckCircle2, ChevronRight,
  Smartphone, Monitor, Tablet, Upload, Trash2, Sliders, Layers, Sparkles,
  Calendar, Clock, Check, RotateCcw, RotateCw, ChevronDown, ChevronUp, Copy,
  Info
} from 'lucide-react';
import HomeHeroBannerRenderer from '../common/HomeHeroBannerRenderer';
import { API_BASE } from '../../config/api';
import { uploadFileToBackend, getImageUrl, handleImageError } from '../../utils/uploadUtil';
import { HERO_FONT_FAMILIES, getHomeHeroMetrics } from '../../utils/bannerSizing';

const DEVICE_VIEWPORTS = [
  { id: 'mobile-320', name: 'Mobile (320px)', width: 320, icon: Smartphone, label: '320' },
  { id: 'mobile-360', name: 'Mobile (360px)', width: 360, icon: Smartphone, label: '360' },
  { id: 'mobile-390', name: 'Mobile (390px)', width: 390, icon: Smartphone, label: '390' },
  { id: 'mobile-430', name: 'Mobile (430px)', width: 430, icon: Smartphone, label: '430' },
  { id: 'tablet-768', name: 'Tablet (768px)', width: 768, icon: Tablet, label: '768' },
  { id: 'desktop-1024', name: 'Desktop (1024px)', width: 1024, icon: Monitor, label: '1024' },
  { id: 'desktop-1440', name: 'Desktop (1440px)', width: 1280, icon: Monitor, label: '1440' }
];

const DESTINATIONS = [
  { label: 'Food Delivery (/restaurants)', value: 'food' },
  { label: 'Ride & Courier (/ride)', value: 'ride' },
  { label: 'Grocery (/restaurants?category=grocery)', value: 'grocery' },
  { label: 'Bakery & Beverages (/restaurants?category=beverages)', value: 'bakery' },
  { label: 'Veg & Fruits (/restaurants?category=fruits-vegetables)', value: 'veg_fruits' },
  { label: 'Meat (/restaurants?category=meat)', value: 'meat' },
  { label: 'Customer Home (/)', value: 'home' }
];

export default function HomeHeroBannerDesigner({
  bannerId,
  banner: initialBanner,
  token,
  allBanners = [],
  onBackToList = () => {},
  onBannerUpdated = () => {},
  onSwitchBanner = () => {}
}) {
  const [activeBanner, setActiveBanner] = useState(initialBanner || {});
  const [currentConfig, setCurrentConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Studio state
  const [activeViewport, setActiveViewport] = useState('desktop-1440');
  const [languagePreview, setLanguagePreview] = useState('en');
  const [activeTab, setActiveTab] = useState('artwork'); // 'background', 'artwork', 'heading', 'tagline', 'cta'
  const [statusNotification, setStatusNotification] = useState(null);

  // Studio Container Resize Observer for scaling wide viewports in narrow columns
  const studioContainerRef = useRef(null);
  const [studioColumnWidth, setStudioColumnWidth] = useState(550);

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

  // Undo / Redo History Stack
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryActionRef = useRef(false);

  // Canvas Drag & Resize Engine Refs
  const canvasRef = useRef(null);
  const dragInteractionRef = useRef(null);

  // Modals & Loaders
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    name: initialBanner?.name || '',
    enabled: initialBanner?.enabled || false,
    displayOrder: initialBanner?.displayOrder || 1,
    scheduleType: initialBanner?.scheduleType || 'always',
    startAt: initialBanner?.startAt ? new Date(initialBanner.startAt).toISOString().slice(0, 16) : '',
    endAt: initialBanner?.endAt ? new Date(initialBanner.endAt).toISOString().slice(0, 16) : ''
  });

  const fileInputRef = useRef(null);
  const uploadTargetSlotRef = useRef(null);
  const [uploadTargetSlot, setUploadTargetSlot] = useState(null);

  // Fetch authoritatively from Backend
  useEffect(() => {
    let isMounted = true;
    const fetchBanner = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${API_BASE}/home-hero-banners/admin/${bannerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load hero banner');
        const data = await res.json();
        if (isMounted) {
          setActiveBanner(data);
          setSettingsForm({
            name: data.name || '',
            enabled: data.enabled || false,
            displayOrder: data.displayOrder || 1,
            scheduleType: data.scheduleType || 'always',
            startAt: data.startAt ? new Date(data.startAt).toISOString().slice(0, 16) : '',
            endAt: data.endAt ? new Date(data.endAt).toISOString().slice(0, 16) : ''
          });
          const initialDraft = JSON.parse(JSON.stringify(data.draftConfig));
          
          // Ensure default fallbacks for new fields
          if (!initialDraft.layered) initialDraft.layered = {};
          if (!initialDraft.layered.background) initialDraft.layered.background = {};
          if (!initialDraft.layered.background.fitMode) initialDraft.layered.background.fitMode = 'cover';
          
          if (!initialDraft.layered.artwork) initialDraft.layered.artwork = {};
          if (!initialDraft.layered.artwork.fitMode) initialDraft.layered.artwork.fitMode = 'contain';
          
          if (!initialDraft.layered.heading) initialDraft.layered.heading = {};
          if (!initialDraft.layered.heading.fontFamily) initialDraft.layered.heading.fontFamily = 'default';
          if (!initialDraft.layered.heading.lineHeight) initialDraft.layered.heading.lineHeight = 1.1;

          if (!initialDraft.layered.tagline) initialDraft.layered.tagline = {};
          if (!initialDraft.layered.tagline.fontFamily) initialDraft.layered.tagline.fontFamily = 'default';
          if (!initialDraft.layered.tagline.outlineColor) initialDraft.layered.tagline.outlineColor = '#000000';
          if (initialDraft.layered.tagline.outlineWidth === undefined) initialDraft.layered.tagline.outlineWidth = 0;
          if (!initialDraft.layered.tagline.lineHeight) initialDraft.layered.tagline.lineHeight = 1.1;

          if (!initialDraft.single) initialDraft.single = {};
          if (!initialDraft.single.defaultImage) initialDraft.single.defaultImage = {};
          if (!initialDraft.single.defaultImage.fitMode) initialDraft.single.defaultImage.fitMode = 'contain';

          setCurrentConfig(initialDraft);
          setHistory([JSON.parse(JSON.stringify(initialDraft))]);
          setHistoryIndex(0);
        }
      } catch (err) {
        console.error('Fetch hero banner error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchBanner();
    return () => { isMounted = false; };
  }, [bannerId, token]);

  // Push to Undo/Redo history
  const pushHistory = (newState) => {
    if (isHistoryActionRef.current) {
      isHistoryActionRef.current = false;
      return;
    }
    setHistory((prevHistory) => {
      const sliced = prevHistory.slice(0, historyIndex + 1);
      return [...sliced, JSON.parse(JSON.stringify(newState))];
    });
    setHistoryIndex((prevIndex) => prevIndex + 1);
  };

  const updateConfig = (updater, shouldRecordHistory = true) => {
    setCurrentConfig((prev) => {
      const copy = JSON.parse(JSON.stringify(prev || {}));
      updater(copy);
      if (shouldRecordHistory) {
        pushHistory(copy);
      }
      return copy;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryActionRef.current = true;
      const targetState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentConfig(JSON.parse(JSON.stringify(targetState)));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryActionRef.current = true;
      const targetState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentConfig(JSON.parse(JSON.stringify(targetState)));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Canvas Mouse / Pointer Drag & Resize Engine
  // ─────────────────────────────────────────────────────────────
  const handlePointerDown = (e, elementKey, handleType = 'move') => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTab(elementKey);

    if (!canvasRef.current || !currentConfig) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const layered = currentConfig.layered || {};

    dragInteractionRef.current = {
      elementKey,
      handleType,
      startX: e.clientX,
      startY: e.clientY,
      canvasRect,
      initialArtworkX: layered.artwork?.x ?? 75,
      initialArtworkY: layered.artwork?.y ?? 50,
      initialArtworkWidth: layered.artwork?.width ?? 42,
      initialHeadingX: layered.heading?.x ?? 8,
      initialHeadingY: layered.heading?.y ?? 20,
      initialTaglineX: layered.tagline?.x ?? 8,
      initialTaglineY: layered.tagline?.y ?? 52,
      initialCtaX: layered.cta?.x ?? 8,
      initialCtaY: layered.cta?.y ?? 74
    };

    const handlePointerMove = (moveEvent) => {
      if (!dragInteractionRef.current) return;
      const {
        elementKey: el,
        handleType: type,
        startX,
        startY,
        canvasRect: rect,
        initialArtworkX,
        initialArtworkY,
        initialArtworkWidth,
        initialHeadingX,
        initialHeadingY,
        initialTaglineX,
        initialTaglineY,
        initialCtaX,
        initialCtaY
      } = dragInteractionRef.current;

      const deltaPixelX = moveEvent.clientX - startX;
      const deltaPixelY = moveEvent.clientY - startY;
      const deltaPercentX = (deltaPixelX / rect.width) * 100;
      const deltaPercentY = (deltaPixelY / rect.height) * 100;

      if (type === 'move') {
        if (el === 'artwork') {
          const newX = Math.max(5, Math.min(95, Math.round((initialArtworkX + deltaPercentX) * 10) / 10));
          const newY = Math.max(5, Math.min(95, Math.round((initialArtworkY + deltaPercentY) * 10) / 10));
          updateConfig((c) => {
            if (!c.layered.artwork) c.layered.artwork = {};
            c.layered.artwork.x = newX;
            c.layered.artwork.y = newY;
          }, false);
        } else if (el === 'heading') {
          const newX = Math.max(0, Math.min(90, Math.round((initialHeadingX + deltaPercentX) * 10) / 10));
          const newY = Math.max(0, Math.min(90, Math.round((initialHeadingY + deltaPercentY) * 10) / 10));
          updateConfig((c) => {
            if (!c.layered.heading) c.layered.heading = {};
            c.layered.heading.x = newX;
            c.layered.heading.y = newY;
          }, false);
        } else if (el === 'tagline') {
          const newX = Math.max(0, Math.min(90, Math.round((initialTaglineX + deltaPercentX) * 10) / 10));
          const newY = Math.max(0, Math.min(90, Math.round((initialTaglineY + deltaPercentY) * 10) / 10));
          updateConfig((c) => {
            if (!c.layered.tagline) c.layered.tagline = {};
            c.layered.tagline.x = newX;
            c.layered.tagline.y = newY;
          }, false);
        } else if (el === 'cta') {
          const newX = Math.max(0, Math.min(90, Math.round((initialCtaX + deltaPercentX) * 10) / 10));
          const newY = Math.max(0, Math.min(90, Math.round((initialCtaY + deltaPercentY) * 10) / 10));
          updateConfig((c) => {
            if (!c.layered.cta) c.layered.cta = {};
            c.layered.cta.x = newX;
            c.layered.cta.y = newY;
          }, false);
        }
      } else if (type === 'resize-corner' && el === 'artwork') {
        const sizeDeltaPercent = (deltaPixelX / rect.width) * 100 * 2;
        const newWidth = Math.max(10, Math.min(95, Math.round((initialArtworkWidth + sizeDeltaPercent) * 10) / 10));
        updateConfig((c) => {
          if (!c.layered.artwork) c.layered.artwork = {};
          c.layered.artwork.width = newWidth;
        }, false);
      }
    };

    const handlePointerUp = () => {
      if (dragInteractionRef.current) {
        dragInteractionRef.current = null;
        setCurrentConfig((latest) => {
          pushHistory(latest);
          return latest;
        });
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Save Settings (Name, Enabled, Schedule, Order)
  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      const res = await fetch(`${API_BASE}/home-hero-banners/admin/${bannerId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settingsForm)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update settings');
      }

      const updated = await res.json();
      setActiveBanner(updated);
      if (onBannerUpdated) onBannerUpdated(bannerId, updated);

      setStatusNotification({ type: 'success', text: 'Hero Banner settings updated successfully!' });
      setTimeout(() => setStatusNotification(null), 3500);
    } catch (err) {
      console.error('Save settings error:', err);
      setStatusNotification({ type: 'error', text: err.message || 'Failed to update settings' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Save Draft Visual Design API Call
  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      const res = await fetch(`${API_BASE}/home-hero-banners/admin/${bannerId}/draft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ draftConfig: currentConfig })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save draft design');
      }

      const result = await res.json();
      setActiveBanner(result.data);
      if (onBannerUpdated) onBannerUpdated(bannerId, result.data);

      setStatusNotification({
        type: 'success',
        text: 'Draft design saved! (Customer Home remains unchanged until Published)'
      });
      setTimeout(() => setStatusNotification(null), 4000);
    } catch (err) {
      console.error('Save draft error:', err);
      setStatusNotification({ type: 'error', text: err.message || 'Failed to save draft design' });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Publish Live API Call
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const res = await fetch(`${API_BASE}/home-hero-banners/admin/${bannerId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ draftConfig: currentConfig })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to publish hero banner');
      }

      const result = await res.json();
      setActiveBanner(result.data);
      setShowPublishModal(false);
      if (onBannerUpdated) onBannerUpdated(bannerId, result.data);

      setStatusNotification({
        type: 'success',
        text: '🚀 Home Hero Banner published live to Customer Home!'
      });
      setTimeout(() => setStatusNotification(null), 4500);
    } catch (err) {
      console.error('Publish error:', err);
      setStatusNotification({ type: 'error', text: err.message || 'Failed to publish hero banner' });
    } finally {
      setIsPublishing(false);
    }
  };

  // Image Upload Handling with safe default positioning (x: 70, y: 50, width: 30)
  const triggerImageUpload = (slot) => {
    uploadTargetSlotRef.current = slot;
    setUploadTargetSlot(slot);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetSlot = uploadTargetSlotRef.current || uploadTargetSlot;
    try {
      setIsUploading(true);
      const uploadedUrl = await uploadFileToBackend(file, token);

      const img = new Image();
      img.src = getImageUrl(uploadedUrl, 'banner');
      await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });

      const w = img.naturalWidth || 2560;
      const h = img.naturalHeight || 600;

      updateConfig((c) => {
        if (targetSlot === 'background' || targetSlot === 'desktop_background') {
          if (!c.layered) c.layered = {};
          if (!c.layered.background) c.layered.background = {};
          c.layered.background.imageUrl = uploadedUrl;
          c.layered.background.desktopImageUrl = uploadedUrl;
          if (!c.layered.background.fitMode) c.layered.background.fitMode = 'cover';
        } else if (targetSlot === 'mobile_background') {
          if (!c.layered) c.layered = {};
          if (!c.layered.background) c.layered.background = {};
          c.layered.background.mobileImageUrl = uploadedUrl;
          if (!c.layered.background.fitMode) c.layered.background.fitMode = 'cover';
        } else if (targetSlot === 'artwork') {
          if (!c.layered) c.layered = {};
          if (!c.layered.artwork) c.layered.artwork = {};
          c.layered.artwork.imageUrl = uploadedUrl;
          c.layered.artwork.x = 70;
          c.layered.artwork.y = 50;
          c.layered.artwork.width = 30;
          if (!c.layered.artwork.fitMode) c.layered.artwork.fitMode = 'contain';
        } else if (targetSlot === 'default_single' || targetSlot === 'desktop_single' || targetSlot === 'single' || c.mode === 'single') {
          if (!c.single) c.single = {};
          c.single.imageUrl = uploadedUrl;
          c.single.desktopImageUrl = uploadedUrl;
          if (!c.single.defaultImage) c.single.defaultImage = {};
          c.single.defaultImage.imageUrl = uploadedUrl;
          c.single.defaultImage.width = w;
          c.single.defaultImage.height = h;
          if (!c.single.defaultImage.fitMode) c.single.defaultImage.fitMode = 'contain';
          if (!c.single.desktop) c.single.desktop = {};
          c.single.desktop.imageUrl = uploadedUrl;
          if (!c.single.desktop.en) c.single.desktop.en = {};
          c.single.desktop.en.imageUrl = uploadedUrl;
          if (!c.single.desktop.te) c.single.desktop.te = {};
          c.single.desktop.te.imageUrl = uploadedUrl;
        } else if (targetSlot === 'mobile_single') {
          if (!c.single) c.single = {};
          c.single.mobileImageUrl = uploadedUrl;
          if (!c.single.mobile) c.single.mobile = {};
          c.single.mobile.imageUrl = uploadedUrl;
          if (!c.single.mobile.en) c.single.mobile.en = {};
          c.single.mobile.en.imageUrl = uploadedUrl;
          if (!c.single.mobile.te) c.single.mobile.te = {};
          c.single.mobile.te.imageUrl = uploadedUrl;
        }
      });

      setStatusNotification({ type: 'success', text: 'Asset uploaded successfully!' });
      setTimeout(() => setStatusNotification(null), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setStatusNotification({ type: 'error', text: err.message || 'Upload failed' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const activeViewportObj = DEVICE_VIEWPORTS.find(v => v.id === activeViewport) || DEVICE_VIEWPORTS[6];

  // Calculate WYSIWYG proportional layout dimensions
  const activeViewportMetrics = getHomeHeroMetrics(activeViewportObj.width);
  const targetRenderWidth = activeViewportMetrics.bannerWidth;
  const targetRenderHeight = activeViewportMetrics.minHeight;

  // Scale factor if target width exceeds column space in Studio
  const studioPadding = 32;
  const availableStudioWidth = Math.max(280, studioColumnWidth - studioPadding);
  const scaleFactor = targetRenderWidth > availableStudioWidth ? availableStudioWidth / targetRenderWidth : 1;

  if (isLoading || !currentConfig) {
    return (
      <div className="bg-surface rounded-3xl p-12 border border-line flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-muted">Loading Home Hero Banner Studio...</span>
      </div>
    );
  }

  const isSingleMode = currentConfig.mode === 'single';
  const layered = currentConfig.layered || {};
  const single = currentConfig.single || {};

  const getSelectedElementTitle = () => {
    if (activeTab === 'artwork') return 'Artwork Graphic';
    if (activeTab === 'heading') return 'Heading Text';
    if (activeTab === 'tagline') return 'Tagline Text';
    if (activeTab === 'cta') return 'CTA Button';
    if (activeTab === 'background') return 'Background';
    return 'None';
  };

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

      {/* Top Header */}
      <div className="bg-surface border border-line rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToList}
            className="p-2.5 rounded-2xl border border-line hover:bg-base text-muted hover:text-main transition-all cursor-pointer"
            title="Back to Hero Banner List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-base text-main">
                {activeBanner.name || 'Home Hero Banner'}
              </h3>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                activeBanner.publishedConfig ? 'bg-violet-50 text-primary border-violet-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {activeBanner.publishedConfig ? 'Published' : 'Draft Only'}
              </span>
            </div>
            <p className="text-xs text-muted font-medium mt-0.5">
              WYSIWYG Hero Banner Studio — Proportional device preview, image fit, and tagline typography.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center border border-line rounded-xl overflow-hidden bg-base">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-2 text-muted hover:text-main hover:bg-surface disabled:opacity-30 transition-colors cursor-pointer"
              title="Undo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 text-muted hover:text-main hover:bg-surface disabled:opacity-30 transition-colors cursor-pointer border-l border-line"
              title="Redo"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

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

      {/* Studio 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COL 1: Banners List (2 cols) */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-3xl p-3 shadow-2xs flex flex-col gap-2">
          <span className="text-[10px] uppercase font-black tracking-wider text-muted px-2 py-1">
            All Hero Banners ({allBanners.length})
          </span>
          <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1">
            {allBanners.map((b) => {
              const active = b._id === bannerId;
              return (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => onSwitchBanner(b._id)}
                  className={`w-full p-2 rounded-2xl flex items-center gap-2 text-left transition-all cursor-pointer border ${
                    active
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                      : 'border-transparent text-muted hover:bg-base hover:text-main'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0 bg-primary" />
                  <span className="text-xs truncate font-semibold">{b.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* COL 2: Interactive WYSIWYG Canvas (6 cols) */}
        <div
          ref={studioContainerRef}
          className="lg:col-span-6 bg-surface border border-line rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col gap-4 overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex items-center gap-1.5 bg-base p-1 rounded-2xl border border-line">
              <button
                type="button"
                onClick={() => updateConfig((c) => { c.mode = 'layered'; })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isSingleMode ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-main'
                }`}
              >
                Layered Studio
              </button>
              <button
                type="button"
                onClick={() => updateConfig((c) => { c.mode = 'single'; })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSingleMode ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-main'
                }`}
              >
                Single Image Graphic
              </button>
            </div>

            <div className="flex items-center gap-1 bg-base p-1 rounded-2xl border border-line self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setLanguagePreview('en')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                  languagePreview === 'en' ? 'bg-primary text-white' : 'text-muted'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguagePreview('te')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                  languagePreview === 'te' ? 'bg-primary text-white' : 'text-muted'
                }`}
              >
                TE (తెలుగు)
              </button>
            </div>
          </div>

          {!isSingleMode && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-violet-500/10 border border-primary/20 rounded-2xl text-xs font-extrabold text-primary">
              <div className="flex items-center gap-2">
                <Move className="w-3.5 h-3.5 text-primary" />
                <span>Selected Element: <strong className="text-main">{getSelectedElementTitle()}</strong></span>
              </div>
              <span className="text-[10px] font-mono text-muted">Click & drag layer to move</span>
            </div>
          )}

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

          {/* Proportional WYSIWYG Canvas Container */}
          <div className="w-full flex flex-col items-center justify-center bg-base/50 p-4 rounded-2xl border border-line/60 overflow-hidden">
            <div
              style={{
                width: `${targetRenderWidth}px`,
                transform: scaleFactor < 1 ? `scale(${scaleFactor})` : 'none',
                transformOrigin: 'top center',
                marginBottom: scaleFactor < 1 ? `-${(1 - scaleFactor) * targetRenderHeight}px` : '0px'
              }}
              className="transition-all duration-300 relative flex justify-center"
            >
              <HomeHeroBannerRenderer
                canvasRef={canvasRef}
                config={currentConfig}
                language={languagePreview}
                isEditor={true}
                forceMobile={activeViewportMetrics.isMobile}
                effectiveWidth={activeViewportObj.width}
                activeLayer={activeTab}
                onSelectLayer={(layer) => setActiveTab(layer)}
                onPointerDownElement={handlePointerDown}
              />
            </div>
          </div>
        </div>

        {/* COL 3: Property Controls & Settings (4 cols) */}
        <div className="lg:col-span-4 bg-surface border border-line rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col gap-5">
          {/* Section 1: Hero Banner Settings & Schedule */}
          <div className="flex flex-col gap-3.5 border-b border-line pb-4">
            <h4 className="font-display font-extrabold text-xs text-main uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Banner Settings & Schedule
            </h4>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-muted">Hero Banner Name</label>
              <input
                type="text"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                placeholder="e.g. Vinayaka Chavithi Special"
                className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Display Order</label>
                <input
                  type="number"
                  min="1"
                  value={settingsForm.displayOrder}
                  onChange={(e) => setSettingsForm({ ...settingsForm, displayOrder: Number(e.target.value) })}
                  className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Schedule Mode</label>
                <select
                  value={settingsForm.scheduleType}
                  onChange={(e) => setSettingsForm({ ...settingsForm, scheduleType: e.target.value })}
                  className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="always">Always Active</option>
                  <option value="scheduled">Scheduled Window</option>
                </select>
              </div>
            </div>

            {settingsForm.scheduleType === 'scheduled' && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted">Start At</label>
                  <input
                    type="datetime-local"
                    value={settingsForm.startAt}
                    onChange={(e) => setSettingsForm({ ...settingsForm, startAt: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-2 py-1.5 text-xs font-bold outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted">End At</label>
                  <input
                    type="datetime-local"
                    value={settingsForm.endAt}
                    onChange={(e) => setSettingsForm({ ...settingsForm, endAt: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-2 py-1.5 text-xs font-bold outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between bg-base p-2.5 rounded-xl border border-line">
              <span className="text-xs font-bold text-main">Enable Banner</span>
              <input
                type="checkbox"
                checked={settingsForm.enabled}
                onChange={(e) => setSettingsForm({ ...settingsForm, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="w-full py-2 bg-violet-100 hover:bg-violet-200 text-primary text-xs font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingSettings ? 'Saving Settings...' : 'Save Settings'}
            </button>
          </div>

          {/* Section 2: Visual Layer Controls */}
          {!isSingleMode ? (
            <div className="flex flex-col gap-4">
              <h4 className="font-display font-extrabold text-xs text-main uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                Layered Visual Controls
              </h4>

              <div className="flex items-center gap-1 bg-base p-1 rounded-2xl border border-line overflow-x-auto">
                {[
                  { id: 'background', label: 'Background' },
                  { id: 'artwork', label: 'Artwork' },
                  { id: 'heading', label: 'Heading' },
                  { id: 'tagline', label: 'Tagline' },
                  { id: 'cta', label: 'CTA' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                      activeTab === tab.id ? 'bg-surface text-primary shadow-xs' : 'text-muted'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Background Panel */}
              {activeTab === 'background' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2 bg-base/60 p-2.5 rounded-2xl border border-line">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-extrabold text-muted uppercase">Desktop Background Image</span>
                      <button
                        type="button"
                        onClick={() => triggerImageUpload('desktop_background')}
                        disabled={isUploading}
                        className="py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploading ? 'Uploading...' : (layered.background?.desktopImageUrl || layered.background?.imageUrl ? 'Replace Desktop Background' : 'Upload Desktop Background')}</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[10px] font-extrabold text-muted uppercase">Mobile Background Image (Optional)</span>
                      <button
                        type="button"
                        onClick={() => triggerImageUpload('mobile_background')}
                        disabled={isUploading}
                        className="py-2 px-3 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploading ? 'Uploading...' : (layered.background?.mobileImageUrl ? 'Replace Mobile Background' : 'Upload Mobile Background')}</span>
                      </button>
                      {!layered.background?.mobileImageUrl && (
                        <span className="text-[9px] text-muted italic px-1">Mobile uses Desktop background as fallback</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-base/60 p-2.5 rounded-2xl border border-line">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Background Fit Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateConfig((c) => { c.layered.background.fitMode = 'cover'; })}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold cursor-pointer border ${
                          (layered.background?.fitMode || 'cover') === 'cover'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-line text-muted'
                        }`}
                      >
                        Cover (Fill)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateConfig((c) => { c.layered.background.fitMode = 'contain'; })}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold cursor-pointer border ${
                          layered.background?.fitMode === 'contain'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-line text-muted'
                        }`}
                      >
                        Contain (Fit)
                      </button>
                    </div>
                    <span className="text-[9px] text-muted italic mt-0.5">
                      {(layered.background?.fitMode || 'cover') === 'cover'
                        ? 'Cover fills the banner but some edges may be cropped.'
                        : 'Contain keeps the complete background image visible.'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Fallback Solid Color</label>
                    <input
                      type="color"
                      value={layered.background?.color || '#7B1FA2'}
                      onChange={(e) => updateConfig((c) => { c.layered.background.color = e.target.value; })}
                      className="w-full h-8 rounded-xl cursor-pointer border border-line"
                    />
                  </div>
                </div>
              )}

              {/* Artwork Panel */}
              {activeTab === 'artwork' && (
                <div className="flex flex-col gap-3.5">
                  <button
                    type="button"
                    onClick={() => triggerImageUpload('artwork')}
                    disabled={isUploading}
                    className="py-2.5 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Artwork Graphic'}</span>
                  </button>

                  <div className="flex flex-col gap-1.5 bg-base/60 p-2.5 rounded-2xl border border-line">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Artwork Image Fit Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateConfig((c) => { c.layered.artwork.fitMode = 'contain'; })}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold cursor-pointer border ${
                          (layered.artwork?.fitMode || 'contain') === 'contain'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-line text-muted'
                        }`}
                      >
                        Contain (Full)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateConfig((c) => { c.layered.artwork.fitMode = 'cover'; })}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold cursor-pointer border ${
                          layered.artwork?.fitMode === 'cover'
                            ? 'bg-primary text-white border-primary'
                            : 'bg-surface border-line text-muted'
                        }`}
                      >
                        Cover (Fill)
                      </button>
                    </div>
                    <span className="text-[9px] text-muted italic mt-0.5">
                      {(layered.artwork?.fitMode || 'contain') === 'contain'
                        ? 'Contain keeps the complete artwork image visible.'
                        : 'Cover fills the artwork frame, cropping allowed.'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-muted uppercase">
                      <span>Artwork Width %</span>
                      <span className="font-mono text-primary font-bold">{layered.artwork?.width ?? 42}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={layered.artwork?.width ?? 42}
                      onChange={(e) => updateConfig((c) => { c.layered.artwork.width = Number(e.target.value); })}
                      className="w-full cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Position X %</label>
                      <input
                        type="number"
                        value={layered.artwork?.x ?? 75}
                        onChange={(e) => updateConfig((c) => { c.layered.artwork.x = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Position Y %</label>
                      <input
                        type="number"
                        value={layered.artwork?.y ?? 50}
                        onChange={(e) => updateConfig((c) => { c.layered.artwork.y = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Heading Panel */}
              {activeTab === 'heading' && (
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Heading English (EN)</label>
                    <input
                      type="text"
                      value={layered.heading?.en || ''}
                      onChange={(e) => updateConfig((c) => { c.layered.heading.en = e.target.value; })}
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Heading Telugu (TE)</label>
                    <input
                      type="text"
                      value={layered.heading?.te || ''}
                      onChange={(e) => updateConfig((c) => { c.layered.heading.te = e.target.value; })}
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Font Family</label>
                    <select
                      value={layered.heading?.fontFamily || 'default'}
                      onChange={(e) => updateConfig((c) => { c.layered.heading.fontFamily = e.target.value; })}
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    >
                      {HERO_FONT_FAMILIES.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-base/60 p-2.5 rounded-2xl border border-line">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-muted">
                      <span>Responsive Heading Size</span>
                      <span className="font-mono text-primary font-bold">
                        {(((layered.heading?.sizeRatio ?? 0.22)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.40"
                      step="0.01"
                      value={layered.heading?.sizeRatio ?? 0.22}
                      onChange={(e) => updateConfig((c) => { c.layered.heading.sizeRatio = Number(e.target.value); })}
                      className="w-full cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Font Weight</label>
                      <select
                        value={layered.heading?.weight || 900}
                        onChange={(e) => updateConfig((c) => { c.layered.heading.weight = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                      >
                        {[400, 500, 600, 700, 800, 900].map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Text Alignment</label>
                      <select
                        value={layered.heading?.align || 'left'}
                        onChange={(e) => updateConfig((c) => { c.layered.heading.align = e.target.value; })}
                        className="bg-base border border-line-strong rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Text Color</label>
                      <input
                        type="color"
                        value={layered.heading?.color || '#FFFFFF'}
                        onChange={(e) => updateConfig((c) => { c.layered.heading.color = e.target.value; })}
                        className="w-full h-8 rounded-xl cursor-pointer border border-line"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Outline Color</label>
                      <input
                        type="color"
                        value={layered.heading?.outlineColor || '#000000'}
                        onChange={(e) => updateConfig((c) => { c.layered.heading.outlineColor = e.target.value; })}
                        className="w-full h-8 rounded-xl cursor-pointer border border-line"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-base/60 p-2.5 rounded-2xl border border-line">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-muted">
                      <span>Outline Width</span>
                      <span className="font-mono text-primary font-bold">
                        {(layered.heading?.outlineWidth ?? 0) === 0 ? '0 (None)' : `${layered.heading?.outlineWidth}px`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="0.5"
                      value={layered.heading?.outlineWidth ?? 0}
                      onChange={(e) => updateConfig((c) => { c.layered.heading.outlineWidth = Number(e.target.value); })}
                      className="w-full cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Position X %</label>
                      <input
                        type="number"
                        value={layered.heading?.x ?? 8}
                        onChange={(e) => updateConfig((c) => { c.layered.heading.x = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-2 py-1 text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Position Y %</label>
                      <input
                        type="number"
                        value={layered.heading?.y ?? 20}
                        onChange={(e) => updateConfig((c) => { c.layered.heading.y = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-2 py-1 text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Width %</label>
                      <input
                        type="number"
                        value={layered.heading?.width ?? 50}
                        onChange={(e) => updateConfig((c) => { c.layered.heading.width = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-2 py-1 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tagline Panel (Complete Typography Controls) */}
              {activeTab === 'tagline' && (
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Tagline English (EN)</label>
                    <input
                      type="text"
                      value={layered.tagline?.en || ''}
                      onChange={(e) => updateConfig((c) => { c.layered.tagline.en = e.target.value; })}
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Tagline Telugu (TE)</label>
                    <input
                      type="text"
                      value={layered.tagline?.te || ''}
                      onChange={(e) => updateConfig((c) => { c.layered.tagline.te = e.target.value; })}
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Font Family</label>
                    <select
                      value={layered.tagline?.fontFamily || 'default'}
                      onChange={(e) => updateConfig((c) => { c.layered.tagline.fontFamily = e.target.value; })}
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    >
                      {HERO_FONT_FAMILIES.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-base/60 p-2.5 rounded-2xl border border-line">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-muted">
                      <span>Responsive Tagline Size</span>
                      <span className="font-mono text-primary font-bold">
                        {(((layered.tagline?.sizeRatio ?? 0.10)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.30"
                      step="0.01"
                      value={layered.tagline?.sizeRatio ?? 0.10}
                      onChange={(e) => updateConfig((c) => { c.layered.tagline.sizeRatio = Number(e.target.value); })}
                      className="w-full cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Font Weight</label>
                      <select
                        value={layered.tagline?.weight || 500}
                        onChange={(e) => updateConfig((c) => { c.layered.tagline.weight = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                      >
                        {[400, 500, 600, 700, 800, 900].map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Text Alignment</label>
                      <select
                        value={layered.tagline?.align || 'left'}
                        onChange={(e) => updateConfig((c) => { c.layered.tagline.align = e.target.value; })}
                        className="bg-base border border-line-strong rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Text Color</label>
                      <input
                        type="color"
                        value={layered.tagline?.color || '#FFFFFF'}
                        onChange={(e) => updateConfig((c) => { c.layered.tagline.color = e.target.value; })}
                        className="w-full h-8 rounded-xl cursor-pointer border border-line"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Outline Color</label>
                      <input
                        type="color"
                        value={layered.tagline?.outlineColor || '#000000'}
                        onChange={(e) => updateConfig((c) => { c.layered.tagline.outlineColor = e.target.value; })}
                        className="w-full h-8 rounded-xl cursor-pointer border border-line"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 bg-base/60 p-2.5 rounded-2xl border border-line">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-muted">
                      <span>Outline Width</span>
                      <span className="font-mono text-primary font-bold">
                        {(layered.tagline?.outlineWidth ?? 0) === 0 ? '0 (None)' : `${layered.tagline?.outlineWidth}px`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="0.5"
                      value={layered.tagline?.outlineWidth ?? 0}
                      onChange={(e) => updateConfig((c) => { c.layered.tagline.outlineWidth = Number(e.target.value); })}
                      className="w-full cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Position X %</label>
                      <input
                        type="number"
                        value={layered.tagline?.x ?? 8}
                        onChange={(e) => updateConfig((c) => { c.layered.tagline.x = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-2 py-1 text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Position Y %</label>
                      <input
                        type="number"
                        value={layered.tagline?.y ?? 52}
                        onChange={(e) => updateConfig((c) => { c.layered.tagline.y = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-2 py-1 text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Width %</label>
                      <input
                        type="number"
                        value={layered.tagline?.width ?? 50}
                        onChange={(e) => updateConfig((c) => { c.layered.tagline.width = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-2 py-1 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Panel */}
              {activeTab === 'cta' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between bg-base p-2 rounded-xl border border-line">
                    <span className="text-xs font-bold text-main">Show CTA Button</span>
                    <input
                      type="checkbox"
                      checked={layered.cta?.enabled !== false}
                      onChange={(e) => updateConfig((c) => { c.layered.cta.enabled = e.target.checked; })}
                      className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">CTA Destination</label>
                    <select
                      value={layered.cta?.destinationKey || 'food'}
                      onChange={(e) => updateConfig((c) => { c.layered.cta.destinationKey = e.target.value; })}
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    >
                      {DESTINATIONS.map(d => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Single Image Mode Controls */
            <div className="flex flex-col gap-4">
              <h4 className="font-display font-extrabold text-xs text-main uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                Single Complete Banner Image
              </h4>
              <div className="bg-base border border-line rounded-2xl p-4 flex flex-col gap-3.5">
                <span className="text-[11px] font-bold text-main">Complete Finished Promotional Graphic</span>

                <div className="flex flex-col gap-1.5 bg-surface p-2.5 rounded-2xl border border-line">
                  <label className="text-[10px] font-extrabold uppercase text-muted">Banner Image Fit Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateConfig((c) => { c.single.defaultImage.fitMode = 'contain'; })}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold cursor-pointer border ${
                        (single.defaultImage?.fitMode || 'contain') === 'contain'
                          ? 'bg-primary text-white border-primary'
                          : 'bg-base border-line text-muted'
                      }`}
                    >
                      Contain (Full)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateConfig((c) => { c.single.defaultImage.fitMode = 'cover'; })}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold cursor-pointer border ${
                        single.defaultImage?.fitMode === 'cover'
                          ? 'bg-primary text-white border-primary'
                          : 'bg-base border-line text-muted'
                      }`}
                    >
                      Cover (Fill)
                    </button>
                  </div>
                  <span className="text-[9px] text-muted italic mt-0.5">
                    {(single.defaultImage?.fitMode || 'contain') === 'contain'
                      ? 'Contain keeps the complete image visible.'
                      : 'Cover fills the banner but some edges may be cropped.'}
                  </span>
                </div>

                {/* Desktop & Mobile Image Upload Slots */}
                <div className="flex flex-col gap-3 border-t border-line pt-3">
                  {/* Slot 1: Desktop Banner Image */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-muted">1. Desktop / Website Banner Image</span>
                    {single.desktop?.en?.imageUrl || single.desktop?.imageUrl || single.defaultImage?.imageUrl || single.imageUrl ? (
                      <div className="flex flex-col gap-2">
                        <div className="relative rounded-xl overflow-hidden border border-line bg-surface aspect-[16/6]">
                          <img
                            src={getImageUrl(single.desktop?.en?.imageUrl || single.desktop?.imageUrl || single.defaultImage?.imageUrl || single.imageUrl, 'banner')}
                            alt="Desktop Banner"
                            onError={(e) => handleImageError(e, 'banner')}
                            style={{ objectFit: single.defaultImage?.fitMode || 'contain' }}
                            className="w-full h-full"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerImageUpload('desktop_single')}
                          disabled={isUploading}
                          className="py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          Replace Desktop Image
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => triggerImageUpload('desktop_single')}
                        disabled={isUploading}
                        className="py-3 px-4 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Desktop Banner Image</span>
                      </button>
                    )}
                  </div>

                  {/* Slot 2: Mobile Banner Image */}
                  <div className="flex flex-col gap-1.5 border-t border-line/60 pt-2.5">
                    <span className="text-[10px] font-extrabold uppercase text-muted">2. Mobile Banner Image (Optional)</span>
                    {single.mobile?.en?.imageUrl || single.mobile?.imageUrl || single.mobileImageUrl ? (
                      <div className="flex flex-col gap-2">
                        <div className="relative rounded-xl overflow-hidden border border-purple-200 bg-purple-50 dark:bg-purple-950/20 aspect-[16/9]">
                          <img
                            src={getImageUrl(single.mobile?.en?.imageUrl || single.mobile?.imageUrl || single.mobileImageUrl, 'banner')}
                            alt="Mobile Banner"
                            onError={(e) => handleImageError(e, 'banner')}
                            style={{ objectFit: single.defaultImage?.fitMode || 'contain' }}
                            className="w-full h-full"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerImageUpload('mobile_single')}
                          disabled={isUploading}
                          className="py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:text-purple-200 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          Replace Mobile Image
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => triggerImageUpload('mobile_single')}
                          disabled={isUploading}
                          className="py-2.5 px-4 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload Mobile Banner Image</span>
                        </button>
                        <span className="text-[9px] text-muted italic px-1">Mobile automatically uses Desktop image if no mobile image is uploaded.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-4xl w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-display font-extrabold text-base text-main">
                Customer Home Live Simulation Preview
              </h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-2 rounded-full hover:bg-base text-muted hover:text-main cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="w-full flex justify-center py-4 bg-base rounded-2xl border border-line">
              <div className="w-full max-w-4xl">
                <HomeHeroBannerRenderer
                  config={currentConfig}
                  language={languagePreview}
                  disableNavigation={true}
                />
              </div>
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
              <h3 className="font-display font-extrabold text-base text-main">Publish Home Hero Banner Live?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              This will publish your draft visual design configuration live to Customer Home.
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
