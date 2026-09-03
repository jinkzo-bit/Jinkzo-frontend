import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Send, Eye, Palette, Image as ImageIcon,
  Type, Move, Maximize2, AlertTriangle, CheckCircle2, ChevronRight,
  Smartphone, Monitor, Tablet, Upload, Trash2, Sliders, Layers, Sparkles,
  Calendar, Clock, Check, RotateCcw, RotateCw, ChevronDown, ChevronUp
} from 'lucide-react';
import PromoBannerRenderer from '../common/PromoBannerRenderer';
import { API_BASE } from '../../config/api';
import { uploadFileToBackend } from '../../utils/uploadUtil';

const DEVICE_VIEWPORTS = [
  { id: 'mobile-320', name: 'Mobile (320px)', width: 320, icon: Smartphone, label: '320' },
  { id: 'mobile-360', name: 'Mobile (360px)', width: 360, icon: Smartphone, label: '360' },
  { id: 'mobile-390', name: 'Mobile (390px)', width: 390, icon: Smartphone, label: '390' },
  { id: 'mobile-430', name: 'Mobile (430px)', width: 430, icon: Smartphone, label: '430' },
  { id: 'tablet-768', name: 'Tablet (768px)', width: 768, icon: Tablet, label: '768' },
  { id: 'desktop-1024', name: 'Desktop (1024px)', width: 1024, icon: Monitor, label: '1024' },
  { id: 'desktop-1440', name: 'Desktop (1440px)', width: 1280, icon: Monitor, label: '1440' }
];

const SAFE_CTA_TARGETS = [
  { label: 'Food Delivery (/restaurants)', value: '/restaurants' },
  { label: 'Grocery (/restaurants?category=grocery)', value: '/restaurants?category=grocery' },
  { label: 'Bakery & Beverages (/restaurants?category=beverages)', value: '/restaurants?category=beverages' },
  { label: 'Veg & Fruits (/restaurants?category=fruits-vegetables)', value: '/restaurants?category=fruits-vegetables' },
  { label: 'Meat (/restaurants?category=meat)', value: '/restaurants?category=meat' },
  { label: 'Ride & Courier (/ride)', value: '/ride' },
  { label: 'Customer Home (/)', value: '/' }
];

export default function BannerDesigner({
  bannerId,
  banner: initialBanner,
  token,
  allBanners = [],
  allBannerDesigns = {},
  onBackToList = () => {},
  onDesignUpdated = () => {},
  onBannerUpdated = () => {},
  onSwitchBanner = () => {}
}) {
  const [activeBanner, setActiveBanner] = useState(initialBanner || {});
  const [designDoc, setDesignDoc] = useState(null);
  const [currentDesign, setCurrentDesign] = useState(null);
  const [isLoadingDesign, setIsLoadingDesign] = useState(true);

  // Studio UI state
  const [activeViewport, setActiveViewport] = useState('desktop-1440');
  const [languagePreview, setLanguagePreview] = useState('en');
  const [activeTab, setActiveTab] = useState('artwork'); // 'background', 'artwork', 'heading', 'tagline', 'ctaStyle'
  const [statusNotification, setStatusNotification] = useState(null);
  const [showAdvancedOverrides, setShowAdvancedOverrides] = useState(false);

  // Undo / Redo History Stack
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryActionRef = useRef(false);

  // Canvas Drag & Resize Engine Refs
  const canvasRef = useRef(null);
  const dragInteractionRef = useRef(null);

  // Modals
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Business / Schedule Form State
  const [scheduleForm, setScheduleForm] = useState({
    name: initialBanner?.name || '',
    title: initialBanner?.title || '',
    subtitle: initialBanner?.subtitle || '',
    buttonText: initialBanner?.buttonText || 'Order Now',
    link: initialBanner?.link || '/restaurants',
    isActive: initialBanner?.isActive !== false && initialBanner?.active !== false,
    alwaysActive: !initialBanner?.startDate && !initialBanner?.endDate,
    startDate: initialBanner?.startDate ? new Date(initialBanner.startDate).toISOString().slice(0, 16) : '',
    endDate: initialBanner?.endDate ? new Date(initialBanner.endDate).toISOString().slice(0, 16) : ''
  });

  const fileInputRef = useRef(null);
  const [uploadTargetSlot, setUploadTargetSlot] = useState(null); // 'background', 'artwork', 'default_single', 'desktop_en', 'desktop_te', 'mobile_en', 'mobile_te'

  // Fetch authoritatively lazy-initialized BannerDesign from Backend
  useEffect(() => {
    let isMounted = true;
    const fetchDesign = async () => {
      try {
        setIsLoadingDesign(true);
        const res = await fetch(`${API_BASE}/admin/banner-designs/${bannerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load banner design');
        const data = await res.json();
        if (isMounted) {
          setDesignDoc(data);
          const initialDraft = JSON.parse(JSON.stringify(data.draftConfig));
          setCurrentDesign(initialDraft);
          setHistory([JSON.parse(JSON.stringify(initialDraft))]);
          setHistoryIndex(0);
        }
      } catch (err) {
        console.error('Fetch design error:', err);
      } finally {
        if (isMounted) setIsLoadingDesign(false);
      }
    };

    fetchDesign();
    return () => { isMounted = false; };
  }, [bannerId, token]);

  // Sync initialBanner prop changes
  useEffect(() => {
    if (initialBanner) {
      setActiveBanner(initialBanner);
      setScheduleForm({
        name: initialBanner.name || '',
        title: initialBanner.title || '',
        subtitle: initialBanner.subtitle || '',
        buttonText: initialBanner.buttonText || 'Order Now',
        link: initialBanner.link || '/restaurants',
        isActive: initialBanner.isActive !== false && initialBanner.active !== false,
        alwaysActive: !initialBanner.startDate && !initialBanner.endDate,
        startDate: initialBanner.startDate ? new Date(initialBanner.startDate).toISOString().slice(0, 16) : '',
        endDate: initialBanner.endDate ? new Date(initialBanner.endDate).toISOString().slice(0, 16) : ''
      });
    }
  }, [initialBanner]);

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

  const updateDesign = (updater, shouldRecordHistory = true) => {
    setCurrentDesign((prev) => {
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
      setCurrentDesign(JSON.parse(JSON.stringify(targetState)));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryActionRef.current = true;
      const targetState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentDesign(JSON.parse(JSON.stringify(targetState)));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Canvas Mouse / Pointer Drag & Resize Engine (Categories Pattern)
  // Converts screen deltas against DOM bounding rect to percentage coordinates
  // ─────────────────────────────────────────────────────────────
  const handlePointerDown = (e, elementKey, handleType = 'move') => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTab(elementKey);

    if (!canvasRef.current || !currentDesign) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    dragInteractionRef.current = {
      elementKey,
      handleType,
      startX: e.clientX,
      startY: e.clientY,
      canvasRect,
      initialArtworkX: currentDesign.artwork?.x ?? 75,
      initialArtworkY: currentDesign.artwork?.y ?? 50,
      initialArtworkWidth: currentDesign.artwork?.width ?? 42,
      initialHeadingX: currentDesign.heading?.x ?? 8,
      initialHeadingY: currentDesign.heading?.y ?? 20,
      initialTaglineX: currentDesign.tagline?.x ?? 8,
      initialTaglineY: currentDesign.tagline?.y ?? 52,
      initialCtaX: currentDesign.ctaStyle?.x ?? 8,
      initialCtaY: currentDesign.ctaStyle?.y ?? 74
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
          updateDesign((d) => {
            if (!d.artwork) d.artwork = {};
            d.artwork.x = newX;
            d.artwork.y = newY;
          }, false);
        } else if (el === 'heading') {
          const newX = Math.max(0, Math.min(90, Math.round((initialHeadingX + deltaPercentX) * 10) / 10));
          const newY = Math.max(0, Math.min(90, Math.round((initialHeadingY + deltaPercentY) * 10) / 10));
          updateDesign((d) => {
            if (!d.heading) d.heading = {};
            d.heading.x = newX;
            d.heading.y = newY;
          }, false);
        } else if (el === 'tagline') {
          const newX = Math.max(0, Math.min(90, Math.round((initialTaglineX + deltaPercentX) * 10) / 10));
          const newY = Math.max(0, Math.min(90, Math.round((initialTaglineY + deltaPercentY) * 10) / 10));
          updateDesign((d) => {
            if (!d.tagline) d.tagline = {};
            d.tagline.x = newX;
            d.tagline.y = newY;
          }, false);
        } else if (el === 'ctaStyle') {
          const newX = Math.max(0, Math.min(90, Math.round((initialCtaX + deltaPercentX) * 10) / 10));
          const newY = Math.max(0, Math.min(90, Math.round((initialCtaY + deltaPercentY) * 10) / 10));
          updateDesign((d) => {
            if (!d.ctaStyle) d.ctaStyle = {};
            d.ctaStyle.x = newX;
            d.ctaStyle.y = newY;
          }, false);
        }
      } else if (type === 'resize-corner' && el === 'artwork') {
        const sizeDeltaPercent = (deltaPixelX / rect.width) * 100 * 2;
        const newWidth = Math.max(10, Math.min(95, Math.round((initialArtworkWidth + sizeDeltaPercent) * 10) / 10));
        updateDesign((d) => {
          if (!d.artwork) d.artwork = {};
          d.artwork.width = newWidth;
        }, false);
      }
    };

    const handlePointerUp = () => {
      if (dragInteractionRef.current) {
        dragInteractionRef.current = null;
        setCurrentDesign((latest) => {
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

  // ─────────────────────────────────────────────────────────────
  // Save Business & Schedule Fields (Authoritative Banner Doc)
  // ─────────────────────────────────────────────────────────────
  const handleSaveSchedule = async () => {
    try {
      setIsSavingSchedule(true);
      const start = scheduleForm.alwaysActive || !scheduleForm.startDate ? null : new Date(scheduleForm.startDate).toISOString();
      const end = scheduleForm.alwaysActive || !scheduleForm.endDate ? null : new Date(scheduleForm.endDate).toISOString();

      if (start && end && new Date(end) <= new Date(start)) {
        throw new Error('End date must be after start date');
      }

      const res = await fetch(`${API_BASE}/admin/banners/${bannerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: scheduleForm.name,
          title: scheduleForm.title,
          subtitle: scheduleForm.subtitle,
          buttonText: scheduleForm.buttonText,
          link: scheduleForm.link,
          isActive: scheduleForm.isActive,
          active: scheduleForm.isActive,
          startDate: start,
          endDate: end
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update schedule');
      }

      const updatedBanner = await res.json();
      setActiveBanner(updatedBanner);
      if (onBannerUpdated) onBannerUpdated(bannerId, updatedBanner);

      setStatusNotification({
        type: 'success',
        text: 'Banner schedule & business details updated successfully!'
      });
      setTimeout(() => setStatusNotification(null), 3500);
    } catch (err) {
      console.error('Save schedule error:', err);
      setStatusNotification({
        type: 'error',
        text: err.message || 'Failed to update schedule'
      });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Save Draft Visual Design API Call
  // ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      const res = await fetch(`${API_BASE}/admin/banner-designs/${bannerId}/draft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ draftConfig: currentDesign })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save draft design');
      }

      const result = await res.json();
      setDesignDoc(result.data);
      if (onDesignUpdated) onDesignUpdated(bannerId, result.data);

      setStatusNotification({
        type: 'success',
        text: 'Draft design saved successfully! (Customers see old design until Published)'
      });
      setTimeout(() => setStatusNotification(null), 4000);
    } catch (err) {
      console.error('Save draft error:', err);
      setStatusNotification({
        type: 'error',
        text: err.message || 'Failed to save draft design'
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Publish Visual Design API Call
  // ─────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const res = await fetch(`${API_BASE}/admin/banner-designs/${bannerId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ draftConfig: currentDesign })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to publish banner design');
      }

      const result = await res.json();
      setDesignDoc(result.data);
      setShowPublishModal(false);
      if (onDesignUpdated) onDesignUpdated(bannerId, result.data);

      setStatusNotification({
        type: 'success',
        text: '🚀 Banner design published live to Customer Home!'
      });
      setTimeout(() => setStatusNotification(null), 4500);
    } catch (err) {
      console.error('Publish error:', err);
      setStatusNotification({
        type: 'error',
        text: err.message || 'Failed to publish banner design'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Image Upload Handling
  // ─────────────────────────────────────────────────────────────
  const triggerImageUpload = (slot) => {
    setUploadTargetSlot(slot);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const uploadedUrl = await uploadFileToBackend(file, token, 'banner');

      // Calculate width/height/quality
      const img = new Image();
      img.src = uploadedUrl;
      await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });

      const w = img.naturalWidth || 2560;
      const h = img.naturalHeight || 600;
      const quality = w >= 2000 ? 'Excellent' : w >= 1200 ? 'Good' : 'Fair';

      updateDesign((d) => {
        if (uploadTargetSlot === 'background') {
          if (!d.background) d.background = {};
          d.background.imageUrl = uploadedUrl;
        } else if (uploadTargetSlot === 'artwork') {
          if (!d.artwork) d.artwork = {};
          d.artwork.imageUrl = uploadedUrl;
        } else if (uploadTargetSlot === 'default_single') {
          if (!d.singleImage) d.singleImage = {};
          if (!d.singleImage.default) d.singleImage.default = {};
          d.singleImage.default.imageUrl = uploadedUrl;
          d.singleImage.default.width = w;
          d.singleImage.default.height = h;
          d.singleImage.default.quality = quality;
        } else if (uploadTargetSlot?.startsWith('desktop_') || uploadTargetSlot?.startsWith('mobile_')) {
          const [device, lang] = uploadTargetSlot.split('_');
          if (!d.singleImage) d.singleImage = { desktop: { en: {}, te: {} }, mobile: { en: {}, te: {} } };
          if (!d.singleImage[device]) d.singleImage[device] = { en: {}, te: {} };
          if (!d.singleImage[device][lang]) d.singleImage[device][lang] = {};
          d.singleImage[device][lang].imageUrl = uploadedUrl;
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

  if (isLoadingDesign || !currentDesign) {
    return (
      <div className="bg-surface rounded-3xl p-12 border border-line flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-muted">Loading Banner Studio...</span>
      </div>
    );
  }

  const isSingleMode = currentDesign.mode === 'single';

  // Selected element title helper
  const getSelectedElementTitle = () => {
    if (activeTab === 'artwork') return 'Artwork Graphic';
    if (activeTab === 'heading') return 'Heading Text';
    if (activeTab === 'tagline') return 'Tagline Text';
    if (activeTab === 'ctaStyle') return 'CTA Button';
    if (activeTab === 'background') return 'Background';
    return 'None';
  };

  const singleDefaultImage = currentDesign.singleImage?.default?.imageUrl || '';
  const singleDefaultW = currentDesign.singleImage?.default?.width || 0;
  const singleDefaultH = currentDesign.singleImage?.default?.height || 0;
  const singleDefaultQuality = currentDesign.singleImage?.default?.quality || 'Excellent';

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Top Notification Toast */}
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

      {/* Header Bar */}
      <div className="bg-surface border border-line rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToList}
            className="p-2.5 rounded-2xl border border-line hover:bg-base text-muted hover:text-main transition-all cursor-pointer"
            title="Back to Banner List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-base text-main">
                {activeBanner.name || activeBanner.title || 'Promo Banner Studio'}
              </h3>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                designDoc?.publishedConfig ? 'bg-violet-50 text-primary border-violet-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {designDoc?.publishedConfig ? 'Published Active' : 'Draft Only'}
              </span>
            </div>
            <p className="text-xs text-muted font-medium mt-0.5">
              Direct drag & resize visual layers, upload single graphics, and manage live festival schedule windows.
            </p>
          </div>
        </div>

        {/* Action Buttons & Undo/Redo */}
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

      {/* Studio Layout: 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── COLUMN A: BANNER SELECTOR (2 cols) ── */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-3xl p-3 shadow-2xs flex flex-col gap-2">
          <span className="text-[10px] uppercase font-black tracking-wider text-muted px-2 py-1">
            All Banners ({allBanners.length})
          </span>
          <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1">
            {allBanners.map((b) => {
              const active = b._id === bannerId;
              const img = b.imageUrl || '/assets/hero_delivery_banner.jpg';
              return (
                <button
                  key={b._id}
                  type="button"
                  onClick={() => onSwitchBanner(b._id)}
                  className={`w-full p-2 rounded-2xl flex items-center gap-2.5 text-left transition-all cursor-pointer border ${
                    active
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                      : 'border-transparent text-muted hover:bg-base hover:text-main'
                  }`}
                >
                  <img src={img} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                  <span className="text-xs truncate font-semibold">{b.name || b.title || 'Untitled'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── COLUMN B: INTERACTIVE CANVAS (6 cols) ── */}
        <div className="lg:col-span-6 bg-surface border border-line rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col gap-4">
          {/* Canvas Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex items-center gap-1.5 bg-base p-1 rounded-2xl border border-line">
              <button
                type="button"
                onClick={() => updateDesign((d) => { d.mode = 'layered'; })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isSingleMode ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-main'
                }`}
              >
                Layered Studio
              </button>
              <button
                type="button"
                onClick={() => updateDesign((d) => { d.mode = 'single'; })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSingleMode ? 'bg-surface text-primary shadow-xs' : 'text-muted hover:text-main'
                }`}
              >
                Single Image Graphic
              </button>
            </div>

            {/* Language Toggle */}
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

          {/* Selected Element Bar Indicator */}
          {!isSingleMode && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-violet-500/10 border border-primary/20 rounded-2xl text-xs font-extrabold text-primary">
              <div className="flex items-center gap-2">
                <Move className="w-3.5 h-3.5 text-primary" />
                <span>Selected Element: <strong className="text-main">{getSelectedElementTitle()}</strong></span>
              </div>
              <span className="text-[10px] font-mono text-muted">Click & drag layer to move</span>
            </div>
          )}

          {/* Viewport Switcher Tabs */}
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

          {/* Canvas Wrapper */}
          <div className="w-full flex justify-center bg-base/50 p-3 rounded-2xl border border-line/60 overflow-hidden">
            <div
              style={{ width: `${activeViewportObj.width}px`, maxWidth: '100%' }}
              className="transition-all duration-300 relative"
            >
              <PromoBannerRenderer
                canvasRef={canvasRef}
                slide={{
                  title: scheduleForm.title || activeBanner.title || 'Special',
                  highlight: scheduleForm.title || activeBanner.title || 'Offer',
                  subtitle: scheduleForm.subtitle || activeBanner.subtitle || 'Order now',
                  buttonText: scheduleForm.buttonText || activeBanner.buttonText || 'Order Now',
                  link: scheduleForm.link || activeBanner.link || '/restaurants',
                  image: activeBanner.imageUrl
                }}
                design={currentDesign}
                language={languagePreview}
                isEditor={true}
                forceMobile={activeViewportObj.width < 640}
                effectiveWidth={activeViewportObj.width}
                activeLayer={activeTab}
                onSelectLayer={(layer) => setActiveTab(layer)}
                onPointerDownElement={handlePointerDown}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted px-1">
            <span>Direct canvas pointer drag & resize enabled.</span>
            <span className="font-mono">{activeViewportObj.name}</span>
          </div>
        </div>

        {/* ── COLUMN C: PROPERTY CONTROLS & SCHEDULE (4 cols) ── */}
        <div className="lg:col-span-4 bg-surface border border-line rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col gap-5">
          {/* Section 1: Business Schedule & Info */}
          <div className="flex flex-col gap-3.5 border-b border-line pb-4">
            <h4 className="font-display font-extrabold text-xs text-main uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Schedule & Business Info
            </h4>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold uppercase text-muted">Banner Name (Internal)</label>
              <input
                type="text"
                value={scheduleForm.name}
                onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                placeholder="e.g. Raksha Bandhan 2026 Special"
                className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Title</label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  placeholder="Special Offer"
                  className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-muted">Subtitle</label>
                <input
                  type="text"
                  value={scheduleForm.subtitle}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, subtitle: e.target.value })}
                  placeholder="Order karo"
                  className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-muted">CTA Destination</label>
              <select
                value={scheduleForm.link}
                onChange={(e) => setScheduleForm({ ...scheduleForm, link: e.target.value })}
                className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
              >
                {SAFE_CTA_TARGETS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Schedule Window Inputs */}
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id="alwaysActive"
                checked={scheduleForm.alwaysActive}
                onChange={(e) => setScheduleForm({ ...scheduleForm, alwaysActive: e.target.checked })}
                className="w-4 h-4 rounded text-primary"
              />
              <label htmlFor="alwaysActive" className="text-xs font-bold text-main cursor-pointer">
                Always Active (No Date Limit)
              </label>
            </div>

            {!scheduleForm.alwaysActive && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted">Start Date</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.startDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startDate: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-2 py-1.5 text-xs font-bold outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-extrabold uppercase text-muted">End Date</label>
                  <input
                    type="datetime-local"
                    value={scheduleForm.endDate}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endDate: e.target.value })}
                    className="bg-base border border-line-strong rounded-xl px-2 py-1.5 text-xs font-bold outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={isSavingSchedule}
              className="mt-1 w-full py-2 bg-violet-100 hover:bg-violet-200 text-primary text-xs font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSavingSchedule ? 'Updating Schedule...' : 'Save Schedule & Details'}
            </button>
          </div>

          {/* Section 2: Visual Controls depending on mode */}
          {!isSingleMode ? (
            /* LAYERED STUDIO CONTROLS */
            <div className="flex flex-col gap-4">
              <h4 className="font-display font-extrabold text-xs text-main uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                Layered Visual Controls
              </h4>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1 bg-base p-1 rounded-2xl border border-line overflow-x-auto">
                {[
                  { id: 'background', label: 'Background' },
                  { id: 'artwork', label: 'Artwork' },
                  { id: 'heading', label: 'Heading' },
                  { id: 'tagline', label: 'Tagline' },
                  { id: 'ctaStyle', label: 'CTA Style' }
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
                  <button
                    type="button"
                    onClick={() => triggerImageUpload('background')}
                    disabled={isUploading}
                    className="py-2.5 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Background Image'}</span>
                  </button>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Fallback Solid Color</label>
                    <input
                      type="color"
                      value={currentDesign.background?.color || '#7B1FA2'}
                      onChange={(e) => updateDesign((d) => { d.background.color = e.target.value; })}
                      className="w-full h-8 rounded-xl cursor-pointer border border-line"
                    />
                  </div>
                </div>
              )}

              {/* Artwork Panel */}
              {activeTab === 'artwork' && (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => triggerImageUpload('artwork')}
                    disabled={isUploading}
                    className="py-2.5 px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Artwork Graphic'}</span>
                  </button>

                  {/* Width & Position Sliders */}
                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-muted uppercase">
                      <span>Artwork Width</span>
                      <span>{currentDesign.artwork?.width ?? 42}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={currentDesign.artwork?.width ?? 42}
                      onChange={(e) => updateDesign((d) => { d.artwork.width = Number(e.target.value); })}
                      className="w-full cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Center X (%)</label>
                      <input
                        type="number"
                        min="5"
                        max="95"
                        value={currentDesign.artwork?.x ?? 75}
                        onChange={(e) => updateDesign((d) => { d.artwork.x = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Center Y (%)</label>
                      <input
                        type="number"
                        min="5"
                        max="95"
                        value={currentDesign.artwork?.y ?? 50}
                        onChange={(e) => updateDesign((d) => { d.artwork.y = Number(e.target.value); })}
                        className="bg-base border border-line-strong rounded-xl px-2 py-1 text-xs font-bold"
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
                      value={currentDesign.heading?.en || ''}
                      onChange={(e) => updateDesign((d) => { d.heading.en = e.target.value; })}
                      placeholder="e.g. Happy Rakshabandhan"
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Heading Telugu (TE)</label>
                    <input
                      type="text"
                      value={currentDesign.heading?.te || ''}
                      onChange={(e) => updateDesign((d) => { d.heading.te = e.target.value; })}
                      placeholder="ఉచిత పండుగ ఆఫర్లు"
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary"
                    />
                  </div>

                  {/* Responsive Heading Font Size Slider */}
                  <div className="flex flex-col gap-1.5 bg-base/60 p-2.5 rounded-2xl border border-line">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-muted">
                      <span>Responsive Heading Size</span>
                      <span className="font-mono text-primary font-bold">
                        {(((currentDesign.heading?.sizeRatio ?? 0.22)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.40"
                      step="0.01"
                      value={currentDesign.heading?.sizeRatio ?? 0.22}
                      onChange={(e) => updateDesign((d) => { d.heading.sizeRatio = Number(e.target.value); })}
                      className="w-full cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Font Weight Selector */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Font Weight</label>
                    <div className="grid grid-cols-6 gap-1">
                      {[400, 500, 600, 700, 800, 900].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => updateDesign((d) => { d.heading.weight = w; })}
                          className={`py-1 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer border ${
                            (currentDesign.heading?.weight ?? 900) === w
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-base text-muted border-line hover:border-primary'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color & Outline Color Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Text Color</label>
                      <div className="flex items-center gap-2 bg-base border border-line rounded-xl p-1">
                        <input
                          type="color"
                          value={currentDesign.heading?.color || '#FFFFFF'}
                          onChange={(e) => updateDesign((d) => { d.heading.color = e.target.value; })}
                          className="w-7 h-7 rounded-lg cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-[10px] font-mono font-bold text-main truncate">
                          {currentDesign.heading?.color || '#FFFFFF'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Outline Color</label>
                      <div className="flex items-center gap-2 bg-base border border-line rounded-xl p-1">
                        <input
                          type="color"
                          value={currentDesign.heading?.outlineColor || '#000000'}
                          onChange={(e) => updateDesign((d) => { d.heading.outlineColor = e.target.value; })}
                          className="w-7 h-7 rounded-lg cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-[10px] font-mono font-bold text-main truncate">
                          {currentDesign.heading?.outlineColor || '#000000'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Outline Width Slider */}
                  <div className="flex flex-col gap-1.5 bg-base/60 p-2.5 rounded-2xl border border-line">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase text-muted">
                      <span>Outline Width</span>
                      <span className="font-mono text-primary font-bold">
                        {(currentDesign.heading?.outlineWidth ?? 0) === 0 ? '0 (None)' : `${currentDesign.heading?.outlineWidth}px`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="0.5"
                      value={currentDesign.heading?.outlineWidth ?? 0}
                      onChange={(e) => updateDesign((d) => { d.heading.outlineWidth = Number(e.target.value); })}
                      className="w-full cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Text Block Width % */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-muted uppercase">
                      <span>Text Width %</span>
                      <span className="font-mono text-primary font-bold">{currentDesign.heading?.width ?? 50}%</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="90"
                      value={currentDesign.heading?.width ?? 50}
                      onChange={(e) => updateDesign((d) => { d.heading.width = Number(e.target.value); })}
                      className="w-full cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Text Alignment */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Alignment</label>
                    <div className="grid grid-cols-3 gap-1 bg-base p-1 rounded-2xl border border-line">
                      {['left', 'center', 'right'].map(align => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateDesign((d) => { d.heading.align = align; })}
                          className={`py-1 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                            (currentDesign.heading?.align || 'left') === align
                              ? 'bg-surface text-primary shadow-xs'
                              : 'text-muted hover:text-main'
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tagline Panel */}
              {activeTab === 'tagline' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">English Subtitle (EN)</label>
                    <input
                      type="text"
                      value={currentDesign.tagline?.en || ''}
                      onChange={(e) => updateDesign((d) => { d.tagline.en = e.target.value; })}
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-extrabold uppercase text-muted">Telugu Subtitle (TE)</label>
                    <input
                      type="text"
                      value={currentDesign.tagline?.te || ''}
                      onChange={(e) => updateDesign((d) => { d.tagline.te = e.target.value; })}
                      className="bg-base border border-line-strong rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] font-extrabold text-muted uppercase">
                      <span>Block Width</span>
                      <span>{currentDesign.tagline?.width ?? 50}%</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="90"
                      value={currentDesign.tagline?.width ?? 50}
                      onChange={(e) => updateDesign((d) => { d.tagline.width = Number(e.target.value); })}
                      className="w-full cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              )}

              {/* CTA Style Panel */}
              {activeTab === 'ctaStyle' && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">BG Color</label>
                      <input
                        type="color"
                        value={currentDesign.ctaStyle?.backgroundColor || '#FFEB3B'}
                        onChange={(e) => updateDesign((d) => { d.ctaStyle.backgroundColor = e.target.value; })}
                        className="w-full h-8 rounded-xl cursor-pointer border border-line"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase text-muted">Text Color</label>
                      <input
                        type="color"
                        value={currentDesign.ctaStyle?.textColor || '#1A1A1A'}
                        onChange={(e) => updateDesign((d) => { d.ctaStyle.textColor = e.target.value; })}
                        className="w-full h-8 rounded-xl cursor-pointer border border-line"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SINGLE IMAGE GRAPHIC CONTROLS (CATEGORY DESIGNER SIMPLE PATTERN) */
            <div className="flex flex-col gap-4">
              <h4 className="font-display font-extrabold text-xs text-main uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                Single Complete Banner Image
              </h4>

              {/* Primary Single Banner Upload Card */}
              <div className="bg-base border border-line rounded-2xl p-4 flex flex-col gap-3">
                <span className="text-[11px] font-bold text-main">Complete Finished Promotional Graphic</span>
                <p className="text-[10px] text-muted leading-relaxed">
                  Upload one finished banner graphic containing your artwork, heading, and CTA text baked into a single image.
                </p>

                {singleDefaultImage ? (
                  <div className="flex flex-col gap-2">
                    <div className="relative rounded-xl overflow-hidden border border-line bg-surface aspect-[16/6] flex items-center justify-center">
                      <img src={singleDefaultImage} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                        {singleDefaultQuality} Quality ({singleDefaultW} × {singleDefaultH})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => triggerImageUpload('default_single')}
                        disabled={isUploading}
                        className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl cursor-pointer"
                      >
                        Replace Image
                      </button>
                      <button
                        type="button"
                        onClick={() => updateDesign((d) => { d.singleImage.default.imageUrl = ''; })}
                        className="p-2 text-muted hover:text-red-600 rounded-xl cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => triggerImageUpload('default_single')}
                    disabled={isUploading}
                    className="py-3 px-4 bg-primary text-white hover:bg-primary-hover rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Complete Banner Image'}</span>
                  </button>
                )}
              </div>

              {/* Collapsible Advanced Device & Language Overrides */}
              <div className="bg-base border border-line rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOverrides(!showAdvancedOverrides)}
                  className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-main hover:bg-surface transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-primary" />
                    <span>Advanced Device & Language Overrides</span>
                  </div>
                  {showAdvancedOverrides ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedOverrides && (
                  <div className="p-3.5 border-t border-line flex flex-col gap-3">
                    <span className="text-[10px] font-extrabold uppercase text-muted">Desktop Overrides</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => triggerImageUpload('desktop_en')}
                        disabled={isUploading}
                        className="p-2.5 bg-surface border border-line rounded-xl text-left hover:border-primary transition-all cursor-pointer"
                      >
                        <span className="text-[9px] font-black uppercase text-primary block">Desktop EN</span>
                        <span className="text-[10px] font-bold text-main truncate block mt-0.5">
                          {currentDesign.singleImage?.desktop?.en?.imageUrl ? '✓ Uploaded' : '+ Upload'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerImageUpload('desktop_te')}
                        disabled={isUploading}
                        className="p-2.5 bg-surface border border-line rounded-xl text-left hover:border-primary transition-all cursor-pointer"
                      >
                        <span className="text-[9px] font-black uppercase text-primary block">Desktop TE</span>
                        <span className="text-[10px] font-bold text-main truncate block mt-0.5">
                          {currentDesign.singleImage?.desktop?.te?.imageUrl ? '✓ Uploaded' : '+ Upload'}
                        </span>
                      </button>
                    </div>

                    <span className="text-[10px] font-extrabold uppercase text-muted mt-1">Mobile Overrides</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => triggerImageUpload('mobile_en')}
                        disabled={isUploading}
                        className="p-2.5 bg-surface border border-line rounded-xl text-left hover:border-primary transition-all cursor-pointer"
                      >
                        <span className="text-[9px] font-black uppercase text-primary block">Mobile EN</span>
                        <span className="text-[10px] font-bold text-main truncate block mt-0.5">
                          {currentDesign.singleImage?.mobile?.en?.imageUrl ? '✓ Uploaded' : '+ Upload'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerImageUpload('mobile_te')}
                        disabled={isUploading}
                        className="p-2.5 bg-surface border border-line rounded-xl text-left hover:border-primary transition-all cursor-pointer"
                      >
                        <span className="text-[9px] font-black uppercase text-primary block">Mobile TE</span>
                        <span className="text-[10px] font-bold text-main truncate block mt-0.5">
                          {currentDesign.singleImage?.mobile?.te?.imageUrl ? '✓ Uploaded' : '+ Upload'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PREVIEW MODAL ── */}
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
                <PromoBannerRenderer
                  slide={{
                    title: scheduleForm.title || activeBanner.title || 'Special',
                    highlight: scheduleForm.title || activeBanner.title || 'Offer',
                    subtitle: scheduleForm.subtitle || activeBanner.subtitle || 'Order now',
                    buttonText: scheduleForm.buttonText || activeBanner.buttonText || 'Order Now',
                    link: scheduleForm.link || activeBanner.link || '/restaurants',
                    image: activeBanner.imageUrl
                  }}
                  design={currentDesign}
                  language={languagePreview}
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

      {/* ── PUBLISH CONFIRMATION MODAL ── */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-primary">
              <Send className="w-6 h-6" />
              <h3 className="font-display font-extrabold text-base text-main">Publish Banner Live?</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              This will publish your draft visual design configuration live to Customer Home. Old published design will be replaced.
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
