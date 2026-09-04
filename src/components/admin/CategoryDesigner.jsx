import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Undo2, Redo2, RotateCcw, Save, Send, Eye, Palette, Image as ImageIcon,
  Type, Move, Maximize2, AlertTriangle, CheckCircle2, ChevronRight,
  Smartphone, Monitor, Tablet, ArrowLeft, Upload, Trash2, Sliders, Layers
} from 'lucide-react';
import CategoryCardRenderer from '../common/CategoryCardRenderer';
import {
  CATEGORY_KEYS,
  CATEGORY_INFO,
  DEFAULT_CATEGORY_DESIGNS
} from '../../utils/categoryDesignDefaults';
import { API_BASE } from '../../config/api';
import { uploadFileToBackend, getImageUrl, handleImageError } from '../../utils/uploadUtil';
import { useAuthStore } from '../../store/authStore';

const DEVICE_VIEWPORTS = [
  { id: 'mobile-320', name: 'Mobile (320px)', width: 140, icon: Smartphone, label: '320' },
  { id: 'mobile-360', name: 'Mobile (360px)', width: 160, icon: Smartphone, label: '360' },
  { id: 'mobile-390', name: 'Mobile (390px)', width: 175, icon: Smartphone, label: '390' },
  { id: 'mobile-430', name: 'Mobile (430px)', width: 195, icon: Smartphone, label: '430' },
  { id: 'tablet-768', name: 'Tablet (768px)', width: 220, icon: Tablet, label: '768' },
  { id: 'desktop-1440', name: 'Desktop (1440px)', width: 260, icon: Monitor, label: '1440' }
];

export default function CategoryDesigner({
  categoryKey,
  token,
  initialDesigns,
  onBackToList,
  onDesignUpdated
}) {
  const [activeCategory, setActiveCategory] = useState(categoryKey || 'food');
  const [activeTab, setActiveTab] = useState('artwork'); // 'background', 'artwork', 'heading', 'tagline'
  const [languagePreview, setLanguagePreview] = useState('en'); // 'en' or 'te'
  const [previewViewport, setPreviewViewport] = useState(DEVICE_VIEWPORTS[2]); // default 390px
  const [selectedElement, setSelectedElement] = useState('artwork'); // 'artwork', 'heading', 'tagline', or null

  // Current Design Working State
  const [currentDesign, setCurrentDesign] = useState(() => {
    const doc = initialDesigns ? initialDesigns[activeCategory] : null;
    if (doc && doc.draftConfig) {
      return JSON.parse(JSON.stringify(doc.draftConfig));
    }
    if (doc && (doc.designMode || doc.artwork || doc.singleImage)) {
      return JSON.parse(JSON.stringify(doc));
    }
    return JSON.parse(JSON.stringify(DEFAULT_CATEGORY_DESIGNS[activeCategory] || DEFAULT_CATEGORY_DESIGNS.food));
  });

  // History Stack for Undo / Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isHistoryActionRef = useRef(false);

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingCategorySwitch, setPendingCategorySwitch] = useState(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Modals & Feedback
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [resetTarget, setResetTarget] = useState('published'); // 'published' or 'default'
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [statusNotification, setStatusNotification] = useState(null); // { type: 'success'|'error', text: '' }
  const [imageQualityWarning, setImageQualityWarning] = useState('');

  // Canvas Reference
  const canvasRef = useRef(null);
  const dragInteractionRef = useRef(null);
  const singleFileInputRef = useRef(null);

  // Helper to push history state
  const pushHistory = useCallback((newDesign) => {
    if (isHistoryActionRef.current) {
      isHistoryActionRef.current = false;
      return;
    }
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      const updated = [...upToCurrent, JSON.parse(JSON.stringify(newDesign))];
      if (updated.length > 35) updated.shift();
      return updated;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 34));
    setHasUnsavedChanges(true);
  }, [historyIndex]);

  // Update design with auto history recording
  const updateDesign = useCallback((updater, recordHistory = true) => {
    setCurrentDesign((prev) => {
      const clone = JSON.parse(JSON.stringify(prev));
      updater(clone);
      if (recordHistory) {
        pushHistory(clone);
      } else {
        setHasUnsavedChanges(true);
      }
      return clone;
    });
  }, [pushHistory]);

  // Initialize design when switching category
  const loadCategory = useCallback((catKey) => {
    setActiveCategory(catKey);
    const doc = initialDesigns ? initialDesigns[catKey] : null;
    let base;
    if (doc && doc.draftConfig) {
      base = JSON.parse(JSON.stringify(doc.draftConfig));
    } else if (doc && (doc.designMode || doc.artwork || doc.singleImage)) {
      base = JSON.parse(JSON.stringify(doc));
    } else {
      base = JSON.parse(JSON.stringify(DEFAULT_CATEGORY_DESIGNS[catKey] || DEFAULT_CATEGORY_DESIGNS.food));
    }
    setCurrentDesign(base);
    setHistory([JSON.parse(JSON.stringify(base))]);
    setHistoryIndex(0);
    setHasUnsavedChanges(false);
    setImageQualityWarning('');
  }, [initialDesigns]);

  // Initial load
  useEffect(() => {
    loadCategory(activeCategory);
  }, []);

  // Category prop change sync
  useEffect(() => {
    if (categoryKey && categoryKey !== activeCategory) {
      loadCategory(categoryKey);
    }
  }, [categoryKey, loadCategory]);

  // External initialDesigns update sync (when API finishes fetching in dashboard and user has no unsaved changes)
  useEffect(() => {
    if (!hasUnsavedChanges && initialDesigns && initialDesigns[activeCategory]) {
      const doc = initialDesigns[activeCategory];
      const base = doc?.draftConfig
        ? JSON.parse(JSON.stringify(doc.draftConfig))
        : (doc?.designMode || doc?.artwork || doc?.singleImage)
          ? JSON.parse(JSON.stringify(doc))
          : null;
      if (base) {
        setCurrentDesign(base);
      }
    }
  }, [initialDesigns, activeCategory, hasUnsavedChanges]);

  // Category switch with unsaved changes guard
  const handleCategoryClick = (newCat) => {
    if (newCat === activeCategory) return;
    if (hasUnsavedChanges) {
      setPendingCategorySwitch(newCat);
      setShowUnsavedModal(true);
      return;
    }
    loadCategory(newCat);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      isHistoryActionRef.current = true;
      const targetState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setCurrentDesign(JSON.parse(JSON.stringify(targetState)));
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryActionRef.current = true;
      const targetState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setCurrentDesign(JSON.parse(JSON.stringify(targetState)));
      setHasUnsavedChanges(true);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Canvas Mouse / Pointer Drag & Resize Engine
  // Normalized center coordinates (0 - 100)
  // ─────────────────────────────────────────────────────────────
  const handlePointerDown = (e, elementKey, handleType = 'move') => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedElement(elementKey);

    if (elementKey === 'artwork') setActiveTab('artwork');
    else if (elementKey === 'heading') setActiveTab('heading');
    else if (elementKey === 'tagline') setActiveTab('tagline');

    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    dragInteractionRef.current = {
      elementKey,
      handleType,
      startX: e.clientX,
      startY: e.clientY,
      canvasRect,
      initialArtworkX: currentDesign.artwork?.x ?? 50,
      initialArtworkY: currentDesign.artwork?.y ?? 30,
      initialArtworkWidth: currentDesign.artwork?.width ?? 62,
      initialHeadingX: currentDesign.heading?.x ?? 50,
      initialHeadingY: currentDesign.heading?.y ?? 68,
      initialTaglineX: currentDesign.tagline?.x ?? 50,
      initialTaglineY: currentDesign.tagline?.y ?? 86
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
        initialTaglineY
      } = dragInteractionRef.current;

      const deltaPixelX = moveEvent.clientX - startX;
      const deltaPixelY = moveEvent.clientY - startY;
      const deltaPercentX = (deltaPixelX / rect.width) * 100;
      const deltaPercentY = (deltaPixelY / rect.height) * 100;

      if (type === 'move') {
        if (el === 'artwork') {
          const newX = Math.max(10, Math.min(90, Math.round((initialArtworkX + deltaPercentX) * 10) / 10));
          const newY = Math.max(10, Math.min(90, Math.round((initialArtworkY + deltaPercentY) * 10) / 10));
          updateDesign((d) => {
            if (!d.artwork) d.artwork = {};
            d.artwork.x = newX;
            d.artwork.y = newY;
          }, false);
        } else if (el === 'heading') {
          const newX = Math.max(15, Math.min(85, Math.round((initialHeadingX + deltaPercentX) * 10) / 10));
          const newY = Math.max(15, Math.min(90, Math.round((initialHeadingY + deltaPercentY) * 10) / 10));
          updateDesign((d) => {
            if (!d.heading) d.heading = {};
            d.heading.x = newX;
            d.heading.y = newY;
          }, false);
        } else if (el === 'tagline') {
          const newX = Math.max(15, Math.min(85, Math.round((initialTaglineX + deltaPercentX) * 10) / 10));
          const newY = Math.max(20, Math.min(95, Math.round((initialTaglineY + deltaPercentY) * 10) / 10));
          updateDesign((d) => {
            if (!d.tagline) d.tagline = {};
            d.tagline.x = newX;
            d.tagline.y = newY;
          }, false);
        }
      } else if (type === 'resize-corner' && el === 'artwork') {
        // Corner resize maintains aspect ratio
        const sizeDeltaPercent = (deltaPixelX / rect.width) * 100 * 2;
        const newWidth = Math.max(20, Math.min(95, Math.round((initialArtworkWidth + sizeDeltaPercent) * 10) / 10));
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
  // Image Upload Handling (Security & Resolution Validation)
  // ─────────────────────────────────────────────────────────────
  const handleImageUpload = async (e, targetField) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers change
    if (e.target) {
      e.target.value = '';
    }

    // Validate MIME Type & Extension
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.type && !validMimeTypes.includes(file.type)) {
      setStatusNotification({
        type: 'error',
        text: 'Invalid file format. Please upload a transparent PNG, JPEG, or WebP file.'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatusNotification({
        type: 'error',
        text: 'File size exceeds 5MB limit. Please upload an optimized image.'
      });
      return;
    }

    // Inspect image resolution before uploading safely
    let naturalWidth = 1080;
    let naturalHeight = 1080;
    try {
      const objectUrl = URL.createObjectURL(file);
      const imgTest = new Image();
      const dims = await new Promise((resolve) => {
        imgTest.onload = () => {
          const res = { width: imgTest.naturalWidth || 1080, height: imgTest.naturalHeight || 1080 };
          URL.revokeObjectURL(objectUrl);
          resolve(res);
        };
        imgTest.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve({ width: 1080, height: 1080 });
        };
        imgTest.src = objectUrl;
      });
      naturalWidth = dims.width;
      naturalHeight = dims.height;
    } catch {
      naturalWidth = 1080;
      naturalHeight = 1080;
    }

    if (naturalWidth < 400 || naturalHeight < 400) {
      setImageQualityWarning(
        `Uploaded image is only ${naturalWidth}×${naturalHeight}px. Recommended minimum is 800×800px for crisp high-density screens.`
      );
    } else {
      setImageQualityWarning('');
    }

    // Upload file to backend
    try {
      setIsUploadingImage(true);
      const authToken = token || useAuthStore.getState().token;
      const uploadedUrl = await uploadFileToBackend(file, authToken);

      if (targetField === 'background') {
        updateDesign((d) => {
          if (!d.background) d.background = {};
          d.background.imageUrl = uploadedUrl;
        });
      } else if (targetField === 'artwork') {
        updateDesign((d) => {
          if (!d.artwork) d.artwork = {};
          d.artwork.imageUrl = uploadedUrl;
        });
      } else if (targetField === 'singleImage') {
        const quality = naturalWidth >= 1000 ? 'Excellent' : naturalWidth >= 700 ? 'Good' : 'Fair';
        updateDesign((d) => {
          d.designMode = 'single';
          if (!d.singleImage) d.singleImage = {};
          d.singleImage.imageUrl = uploadedUrl;
          d.singleImage.width = naturalWidth;
          d.singleImage.height = naturalHeight;
          d.singleImage.quality = quality;
          if (!d.singleImage.fit) d.singleImage.fit = 'cover';
        });
      }

      setStatusNotification({
        type: 'success',
        text: 'Image uploaded successfully!'
      });
      setTimeout(() => setStatusNotification(null), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setStatusNotification({
        type: 'error',
        text: err.message || 'Image upload failed. Super Admin authorization required.'
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Save Draft API Call
  // ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      const res = await fetch(`${API_BASE}/admin/category-designs/${activeCategory}/draft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ draftConfig: currentDesign })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save draft');
      }

      const result = await res.json();
      setHasUnsavedChanges(false);
      if (onDesignUpdated) {
        onDesignUpdated(activeCategory, result.data);
      }

      setStatusNotification({
        type: 'success',
        text: `Draft saved successfully for ${CATEGORY_INFO[activeCategory]?.name}! (Customers will not see this until published)`
      });
      setTimeout(() => setStatusNotification(null), 4000);
    } catch (err) {
      console.error('Save draft error:', err);
      setStatusNotification({
        type: 'error',
        text: err.message || 'Failed to save draft'
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Publish Design API Call (Promotes Draft to Published)
  // ─────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const res = await fetch(`${API_BASE}/admin/category-designs/${activeCategory}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ draftConfig: currentDesign })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to publish category design');
      }

      const result = await res.json();
      setShowPublishModal(false);
      setHasUnsavedChanges(false);

      if (onDesignUpdated) {
        onDesignUpdated(activeCategory, result.data);
      }

      setStatusNotification({
        type: 'success',
        text: `🚀 ${CATEGORY_INFO[activeCategory]?.name} category design published live to Customer Home!`
      });
      setTimeout(() => setStatusNotification(null), 4500);
    } catch (err) {
      console.error('Publish error:', err);
      setStatusNotification({
        type: 'error',
        text: err.message || 'Failed to publish category design'
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Reset Configuration
  // ─────────────────────────────────────────────────────────────
  const handleResetConfirm = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/category-designs/${activeCategory}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ target: resetTarget })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Reset failed');
      }

      const result = await res.json();
      const newConfig = result.data.draftConfig;
      setCurrentDesign(JSON.parse(JSON.stringify(newConfig)));
      pushHistory(newConfig);
      setShowResetModal(false);
      setStatusNotification({
        type: 'success',
        text: `Reset to ${resetTarget === 'default' ? 'Default Factory Design' : 'Currently Published Design'} complete.`
      });
      setTimeout(() => setStatusNotification(null), 3000);
    } catch (err) {
      console.error('Reset error:', err);
      // Fallback local reset
      const fallback = resetTarget === 'default'
        ? DEFAULT_CATEGORY_DESIGNS[activeCategory]
        : (initialDesigns[activeCategory]?.publishedConfig || DEFAULT_CATEGORY_DESIGNS[activeCategory]);
      setCurrentDesign(JSON.parse(JSON.stringify(fallback)));
      pushHistory(fallback);
      setShowResetModal(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in w-full pb-16">
      {/* ── 1. TOP MASTER TOOLBAR ── */}
      <div className="bg-surface border border-line rounded-3xl p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-2xs">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToList}
            className="w-10 h-10 rounded-2xl border border-line flex items-center justify-center text-muted hover:text-main hover:bg-base transition-all cursor-pointer"
            title="Back to category cards overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-base sm:text-lg text-main">
                Home Category Designer
              </h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-50 text-primary border border-violet-200">
                1:1 Aspect Ratio
              </span>
            </div>
            <p className="text-xs text-muted font-medium">
              Editing: <span className="font-bold text-main">{CATEGORY_INFO[activeCategory]?.name}</span>
            </p>
          </div>
        </div>

        {/* Center: Language Toggle & Undo/Redo */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          {/* Telugu / English Preview */}
          <div className="flex items-center p-1 bg-base border border-line rounded-2xl">
            <button
              type="button"
              onClick={() => setLanguagePreview('en')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                languagePreview === 'en'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted hover:text-main'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguagePreview('te')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                languagePreview === 'te'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted hover:text-main'
              }`}
            >
              తెలుగు
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center border border-line rounded-2xl p-0.5 bg-base">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              className="p-2 rounded-xl text-muted hover:text-main hover:bg-surface disabled:opacity-30 transition-all cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
              className="p-2 rounded-xl text-muted hover:text-main hover:bg-surface disabled:opacity-30 transition-all cursor-pointer"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Reset Dropdown/Button */}
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-line text-xs font-bold text-muted hover:bg-base hover:text-main transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Right: Save Draft & Publish */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-line-strong hover:bg-base text-main text-xs font-bold transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-muted" />
            <span>{isSavingDraft ? 'Saving Draft...' : 'Save Draft'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            disabled={isPublishing}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* Status Toast Alert */}
      {statusNotification && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm animate-slide-down ${
            statusNotification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <span>{statusNotification.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotification(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Resolution Quality Warning */}
      {imageQualityWarning && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{imageQualityWarning}</span>
        </div>
      )}

      {/* ── 2. THREE-COLUMN WORKSPACE: SELECTOR | CANVAS | PROPERTIES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── COLUMN A: CATEGORY SELECTOR (2 cols) ── */}
        <div className="lg:col-span-3 bg-surface border border-line rounded-3xl p-3 shadow-2xs flex flex-col gap-1.5">
          <div className="px-3 py-2">
            <span className="text-[11px] font-black uppercase text-muted tracking-wider">
              Categories (Fixed 6)
            </span>
          </div>

          {CATEGORY_KEYS.map((key) => {
            const info = CATEGORY_INFO[key];
            const active = activeCategory === key;
            const doc = initialDesigns[key];
            const hasDraft = doc?.publishedConfig && doc?.draftConfig &&
              JSON.stringify(doc.publishedConfig) !== JSON.stringify(doc.draftConfig);

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCategoryClick(key)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-main hover:bg-base'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    style={{ backgroundColor: info.defaultBg }}
                    className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-black/5 flex items-center justify-center p-1"
                  >
                    <img
                      src={getImageUrl(`/assets/home/categories/png/${key === 'bakery_beverages' ? 'bakery' : key === 'veg_fruits' ? 'veg-fruits' : key}.png`, 'category')}
                      alt={info.name}
                      onError={(e) => handleImageError(e, 'category')}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold truncate leading-tight">
                      {info.name}
                    </span>
                    <span className={`text-[10px] mt-0.5 truncate ${active ? 'text-white/80' : 'text-muted'}`}>
                      {info.defaultLink}
                    </span>
                  </div>
                </div>

                {hasDraft && !active && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Draft changes pending" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── COLUMN B: INTERACTIVE CANVAS (5 cols) ── */}
        <div className="lg:col-span-5 flex flex-col items-center gap-3">
          <div className="w-full bg-surface border border-line rounded-3xl p-5 shadow-2xs flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-line mb-3">
              <span className="text-xs font-extrabold text-muted uppercase tracking-wider">
                1:1 Canvas (Drag & Resize)
              </span>
              <span className="text-[11px] font-bold text-primary">
                {selectedElement ? `Selected: ${selectedElement.toUpperCase()}` : 'Click item to select'}
              </span>
            </div>

            {/* 1:1 Large Square Canvas with Center Anchoring */}
            <div
              ref={canvasRef}
              style={{
                aspectRatio: '1 / 1',
                backgroundColor: currentDesign.background?.color || '#FFFFFF'
              }}
              onClick={() => setSelectedElement(null)}
              className="relative w-full max-w-[460px] aspect-square rounded-3xl overflow-hidden shadow-md border-2 border-line-strong select-none touch-none cursor-default"
            >
              {currentDesign.designMode === 'single' ? (
                /* Single Card Image Mode Canvas */
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-base">
                  {currentDesign.singleImage?.imageUrl ? (
                    <img
                      src={getImageUrl(currentDesign.singleImage.imageUrl, 'category')}
                      alt="Single Card Preview"
                      onError={(e) => handleImageError(e, 'category')}
                      draggable={false}
                      className={`w-full h-full select-none ${
                        currentDesign.singleImage.fit === 'contain' ? 'object-contain' : 'object-cover'
                      }`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-muted">
                      <ImageIcon className="w-12 h-12 stroke-[1.5] text-muted/50" />
                      <span className="text-xs font-bold">No single card image uploaded</span>
                      <span className="text-[10px]">Use the panel on the right to upload a 1080×1080 graphic</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Composite Layered Elements Canvas */
                <>
                  {/* Background Layer */}
                  {currentDesign.background?.imageUrl && (
                    <img
                      src={getImageUrl(currentDesign.background.imageUrl, 'category')}
                      alt=""
                      aria-hidden="true"
                      onError={(e) => handleImageError(e, 'category')}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
                    />
                  )}

                  {/* Readability Gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-white/30 via-white/10 to-transparent pointer-events-none z-1" />

                  {/* Main Artwork with Drag & Corner Resize Handles */}
                  {currentDesign.artwork?.imageUrl && (
                    <div
                      onPointerDown={(e) => handlePointerDown(e, 'artwork', 'move')}
                      style={{
                        left: `${currentDesign.artwork.x ?? 50}%`,
                        top: `${currentDesign.artwork.y ?? 33}%`,
                        width: `${currentDesign.artwork.width ?? 68}%`,
                        transform: 'translate(-50%, -50%)',
                        cursor: 'move'
                      }}
                      className={`absolute flex items-center justify-center z-10 pointer-events-auto transition-transform ${
                        selectedElement === 'artwork'
                          ? 'ring-2 ring-violet-500 ring-offset-2 rounded-xl bg-violet-500/5'
                          : 'hover:ring-1 hover:ring-violet-300 rounded-xl'
                      }`}
                    >
                      <img
                        src={getImageUrl(currentDesign.artwork.imageUrl, 'category')}
                        alt=""
                        onError={(e) => handleImageError(e, 'category')}
                        draggable={false}
                        className="w-full h-auto max-h-[90%] object-contain select-none pointer-events-none"
                      />

                      {/* Corner Resize Handles when Selected */}
                      {selectedElement === 'artwork' && (
                        <>
                          {/* Bottom-Right Corner Resize Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, 'artwork', 'resize-corner')}
                            className="absolute -bottom-2.5 -right-2.5 w-6 h-6 bg-white border-2 border-violet-600 rounded-full shadow-md flex items-center justify-center cursor-nwse-resize z-20 hover:scale-110 transition-transform"
                            title="Drag to resize (maintains aspect ratio)"
                          >
                            <div className="w-1.5 h-1.5 bg-violet-600 rounded-full" />
                          </div>

                          {/* Top-Right Corner Resize Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, 'artwork', 'resize-corner')}
                            className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-white border-2 border-violet-600 rounded-full shadow-md flex items-center justify-center cursor-nesw-resize z-20 hover:scale-110 transition-transform"
                            title="Drag to resize (maintains aspect ratio)"
                          >
                            <div className="w-1.5 h-1.5 bg-violet-600 rounded-full" />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Heading Element with Drag Handle */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'heading', 'move')}
                    style={{
                      left: `${currentDesign.heading?.x ?? 50}%`,
                      top: `${currentDesign.heading?.y ?? 68}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '92%',
                      cursor: 'move'
                    }}
                    className={`absolute z-20 pointer-events-auto px-2 py-1 rounded-xl transition-all ${
                      selectedElement === 'heading'
                        ? 'ring-2 ring-violet-500 ring-offset-2 bg-violet-500/10'
                        : 'hover:ring-1 hover:ring-violet-300'
                    }`}
                  >
                    <h3
                      style={{
                        color: currentDesign.heading?.color || '#FF4B16',
                        fontSize: `${Math.round(460 * (currentDesign.heading?.sizeRatio || 0.088))}px`,
                        fontWeight: currentDesign.heading?.weight || 900,
                        textAlign: currentDesign.heading?.align || 'center',
                        WebkitTextStroke: `${(currentDesign.heading?.outlineWidth || 0.8) * 1.5}px ${currentDesign.heading?.outlineColor || '#111111'}`,
                        paintOrder: 'stroke fill',
                        lineHeight: 1.08
                      }}
                      className="font-display tracking-tight break-words select-none"
                    >
                      {(languagePreview === 'te' && currentDesign.heading?.te)
                        ? currentDesign.heading.te
                        : (currentDesign.heading?.en || 'Food')}
                    </h3>
                  </div>

                  {/* Tagline Element with Drag Handle */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'tagline', 'move')}
                    style={{
                      left: `${currentDesign.tagline?.x ?? 50}%`,
                      top: `${currentDesign.tagline?.y ?? 83}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '92%',
                      cursor: 'move'
                    }}
                    className={`absolute z-20 pointer-events-auto px-2 py-1 rounded-xl transition-all ${
                      selectedElement === 'tagline'
                        ? 'ring-2 ring-violet-500 ring-offset-2 bg-violet-500/10'
                        : 'hover:ring-1 hover:ring-violet-300'
                    }`}
                  >
                    <p
                      style={{
                        color: currentDesign.tagline?.color || '#000000',
                        fontSize: `${Math.round(460 * (currentDesign.tagline?.sizeRatio || 0.038))}px`,
                        fontWeight: currentDesign.tagline?.weight || 600,
                        textAlign: currentDesign.tagline?.align || 'center',
                        lineHeight: 1.18
                      }}
                      className="font-sans leading-tight select-none break-words"
                    >
                      {(languagePreview === 'te' && currentDesign.tagline?.te)
                        ? currentDesign.tagline.te
                        : (currentDesign.tagline?.en || 'Subtitle')}
                    </p>
                  </div>
                </>
              )}
            </div>

            <p className="text-[11px] text-muted text-center mt-3 font-medium">
              {currentDesign.designMode === 'single'
                ? '💡 Tip: In Single Card Image mode, your 1080×1080 graphic fills or contains within the card cleanly.'
                : '💡 Tip: Click and drag artwork, heading, or tagline on the canvas. Drag corner handles to resize artwork.'}
            </p>
          </div>
        </div>

        {/* ── COLUMN C: PROPERTY CONTROLS (4 cols) ── */}
        <div className="lg:col-span-4 bg-surface border border-line rounded-3xl p-5 shadow-2xs flex flex-col gap-4">
          {/* Design Mode Switcher (Layered vs Single Card Image) */}
          <div className="flex p-1 bg-base border border-line rounded-2xl">
            <button
              type="button"
              onClick={() => updateDesign((d) => { d.designMode = 'layered'; })}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                currentDesign.designMode !== 'single'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted hover:text-main'
              }`}
            >
              Composite (Layered)
            </button>
            <button
              type="button"
              onClick={() => updateDesign((d) => { d.designMode = 'single'; })}
              className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                currentDesign.designMode === 'single'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-muted hover:text-main'
              }`}
            >
              Single Card Image
            </button>
          </div>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* SINGLE CARD IMAGE CONTROLS (Exact User Specification)        */}
          {/* ───────────────────────────────────────────────────────────── */}
          {currentDesign.designMode === 'single' ? (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <h3 className="font-extrabold text-sm text-main uppercase tracking-wider">
                  SINGLE CARD IMAGE
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  1080×1080 Mode
                </span>
              </div>

              {/* [ Upload / Replace Image ] */}
              <div>
                <input
                  ref={singleFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleImageUpload(e, 'singleImage')}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => singleFileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploadingImage ? 'Uploading...' : 'Upload / Replace Image'}</span>
                </button>
              </div>

              {/* Current image preview */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-muted">Current image preview</span>
                <div className="w-full max-w-[240px] mx-auto aspect-square rounded-2xl overflow-hidden border border-line bg-base shadow-2xs flex items-center justify-center relative">
                  {currentDesign.singleImage?.imageUrl ? (
                    <img
                      src={getImageUrl(currentDesign.singleImage.imageUrl, 'category')}
                      alt="Current preview"
                      onError={(e) => handleImageError(e, 'category')}
                      className={`w-full h-full ${
                        currentDesign.singleImage.fit === 'contain' ? 'object-contain' : 'object-cover'
                      }`}
                    />
                  ) : (
                    <span className="text-xs text-muted">No image uploaded</span>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-base rounded-2xl p-3 border border-line flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Image:</span>
                  <span className="font-mono font-bold text-main">
                    {currentDesign.singleImage?.width || 1080} × {currentDesign.singleImage?.height || 1080}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Quality:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {currentDesign.singleImage?.quality || 'Excellent'}
                  </span>
                </div>
              </div>

              {/* Fit: Fill Square / Contain */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-main">Fit:</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="imageFit"
                      value="cover"
                      checked={(currentDesign.singleImage?.fit || 'cover') === 'cover'}
                      onChange={() => updateDesign((d) => {
                        if (!d.singleImage) d.singleImage = {};
                        d.singleImage.fit = 'cover';
                      })}
                      className="accent-primary"
                    />
                    <span>Fill Square</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="imageFit"
                      value="contain"
                      checked={currentDesign.singleImage?.fit === 'contain'}
                      onChange={() => updateDesign((d) => {
                        if (!d.singleImage) d.singleImage = {};
                        d.singleImage.fit = 'contain';
                      })}
                      className="accent-primary"
                    />
                    <span>Contain</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons: [Save Draft] [Preview] [Publish] */}
              <div className="flex items-center gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-line hover:bg-base text-main text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 text-muted" />
                  <span>Save Draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-line hover:bg-base text-main text-xs font-bold transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-muted" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPublishModal(true)}
                  disabled={isPublishing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Sub-tabs for layered properties */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-base border border-line rounded-2xl">
                {[
                  { id: 'artwork', label: 'Artwork', icon: ImageIcon },
                  { id: 'background', label: 'Backdrop', icon: Palette },
                  { id: 'heading', label: 'Heading', icon: Type },
                  { id: 'tagline', label: 'Tagline', icon: Sliders }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (tab.id === 'artwork') setSelectedElement('artwork');
                        else if (tab.id === 'heading') setSelectedElement('heading');
                        else if (tab.id === 'tagline') setSelectedElement('tagline');
                      }}
                      className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-muted hover:text-main'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* 1. ARTWORK PROPERTY PANEL */}
          {activeTab === 'artwork' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-muted">Main Artwork Settings</span>
                <button
                  type="button"
                  onClick={() => {
                    updateDesign((d) => {
                      if (!d.artwork) d.artwork = {};
                      d.artwork.x = 50;
                      d.artwork.y = 30;
                      d.artwork.width = 62;
                    });
                  }}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  Reset Position
                </button>
              </div>

              {/* Artwork Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-main">Replace Artwork Image</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleImageUpload(e, 'artwork')}
                  disabled={isUploadingImage}
                  className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                />
                <span className="text-[10px] text-muted">
                  Recommended: 1080×1080px transparent PNG or WebP for optimal sharpness.
                </span>
              </div>

              {/* X Position Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span>Horizontal Position (X)</span>
                  <span className="font-mono text-primary">{currentDesign.artwork?.x ?? 50}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="0.5"
                  value={currentDesign.artwork?.x ?? 50}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateDesign((d) => { if (!d.artwork) d.artwork = {}; d.artwork.x = val; });
                  }}
                  className="w-full accent-primary"
                />
              </div>

              {/* Y Position Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span>Vertical Position (Y)</span>
                  <span className="font-mono text-primary">{currentDesign.artwork?.y ?? 30}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="0.5"
                  value={currentDesign.artwork?.y ?? 30}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateDesign((d) => { if (!d.artwork) d.artwork = {}; d.artwork.y = val; });
                  }}
                  className="w-full accent-primary"
                />
              </div>

              {/* Width / Scale Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span>Artwork Size (Width %)</span>
                  <span className="font-mono text-primary">{currentDesign.artwork?.width ?? 62}%</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="95"
                  step="0.5"
                  value={currentDesign.artwork?.width ?? 62}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateDesign((d) => { if (!d.artwork) d.artwork = {}; d.artwork.width = val; });
                  }}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )}

          {/* 2. BACKGROUND PROPERTY PANEL */}
          {activeTab === 'background' && (
            <div className="flex flex-col gap-4">
              <span className="text-xs font-extrabold uppercase text-muted">Card Background Settings</span>

              {/* Background Color Picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-main">Background Base Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={currentDesign.background?.color || '#FFFFFF'}
                    onChange={(e) => {
                      const color = e.target.value;
                      updateDesign((d) => { if (!d.background) d.background = {}; d.background.color = color; });
                    }}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-line bg-transparent"
                  />
                  <input
                    type="text"
                    value={currentDesign.background?.color || '#FFFFFF'}
                    onChange={(e) => {
                      const color = e.target.value;
                      updateDesign((d) => { if (!d.background) d.background = {}; d.background.color = color; });
                    }}
                    className="w-32 px-3 py-1.5 rounded-xl border border-line text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Category Color Quick Presets */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-muted">Jinkzo Identity Palettes</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: 'Food', color: '#FFF2E6' },
                    { label: 'Ride', color: '#EBF1FF' },
                    { label: 'Grocery', color: '#E6F9EE' },
                    { label: 'Bakery', color: '#FDECF3' },
                    { label: 'Veg', color: '#E6F6F5' },
                    { label: 'Meat', color: '#FFF1E8' },
                    { label: 'Pure White', color: '#FFFFFF' }
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        updateDesign((d) => { if (!d.background) d.background = {}; d.background.color = p.color; });
                      }}
                      style={{ backgroundColor: p.color }}
                      className="px-2.5 py-1 rounded-lg border border-line text-[10px] font-bold text-gray-800 shadow-3xs cursor-pointer hover:scale-105 transition-transform"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Image Upload */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-line">
                <label className="text-xs font-bold text-main">Background Image</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleImageUpload(e, 'background')}
                  disabled={isUploadingImage}
                  className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
                />

                {currentDesign.background?.imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      updateDesign((d) => { if (!d.background) d.background = {}; d.background.imageUrl = ''; });
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:underline self-start mt-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Background Image
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 3. HEADING PROPERTY PANEL */}
          {activeTab === 'heading' && (
            <div className="flex flex-col gap-3.5">
              <span className="text-xs font-extrabold uppercase text-muted">Heading Typography</span>

              {/* Text English */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-main">Heading (English)</label>
                <input
                  type="text"
                  value={currentDesign.heading?.en || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateDesign((d) => { if (!d.heading) d.heading = {}; d.heading.en = val; });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs font-semibold"
                />
              </div>

              {/* Text Telugu */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-main">Heading (తెలుగు - Telugu)</label>
                <input
                  type="text"
                  value={currentDesign.heading?.te || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateDesign((d) => { if (!d.heading) d.heading = {}; d.heading.te = val; });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs font-semibold"
                />
              </div>

              {/* Font Size Ratio */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Responsive Font Scale</span>
                  <span className="font-mono text-primary">
                    {Math.round((currentDesign.heading?.sizeRatio || 0.088) * 1000) / 10}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.13"
                  step="0.002"
                  value={currentDesign.heading?.sizeRatio ?? 0.088}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateDesign((d) => { if (!d.heading) d.heading = {}; d.heading.sizeRatio = val; });
                  }}
                  className="w-full accent-primary"
                />
              </div>

              {/* Font Color & Outline Color */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-main">Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentDesign.heading?.color || '#FF4B16'}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDesign((d) => { if (!d.heading) d.heading = {}; d.heading.color = val; });
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-line bg-transparent"
                    />
                    <span className="text-[10px] font-mono font-bold">{currentDesign.heading?.color}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-main">Outline Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={currentDesign.heading?.outlineColor || '#111111'}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDesign((d) => { if (!d.heading) d.heading = {}; d.heading.outlineColor = val; });
                      }}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-line bg-transparent"
                    />
                    <span className="text-[10px] font-mono font-bold">{currentDesign.heading?.outlineColor}</span>
                  </div>
                </div>
              </div>

              {/* Outline Thickness */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Outline Thickness</span>
                  <span className="font-mono text-primary">{currentDesign.heading?.outlineWidth ?? 0.8}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.5"
                  step="0.1"
                  value={currentDesign.heading?.outlineWidth ?? 0.8}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateDesign((d) => { if (!d.heading) d.heading = {}; d.heading.outlineWidth = val; });
                  }}
                  className="w-full accent-primary"
                />
              </div>

              {/* X / Y Position */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-main">Position X %</label>
                  <input
                    type="number"
                    min="15"
                    max="85"
                    value={currentDesign.heading?.x ?? 50}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 50;
                      updateDesign((d) => { if (!d.heading) d.heading = {}; d.heading.x = val; });
                    }}
                    className="px-2 py-1.5 rounded-xl border border-line text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-main">Position Y %</label>
                  <input
                    type="number"
                    min="20"
                    max="90"
                    value={currentDesign.heading?.y ?? 68}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 68;
                      updateDesign((d) => { if (!d.heading) d.heading = {}; d.heading.y = val; });
                    }}
                    className="px-2 py-1.5 rounded-xl border border-line text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. TAGLINE PROPERTY PANEL */}
          {activeTab === 'tagline' && (
            <div className="flex flex-col gap-3.5">
              <span className="text-xs font-extrabold uppercase text-muted">Tagline Subtitle Settings</span>

              {/* Text English */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-main">Tagline (English)</label>
                <input
                  type="text"
                  value={currentDesign.tagline?.en || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateDesign((d) => { if (!d.tagline) d.tagline = {}; d.tagline.en = val; });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs font-semibold"
                />
              </div>

              {/* Text Telugu */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-main">Tagline (తెలుగు - Telugu)</label>
                <input
                  type="text"
                  value={currentDesign.tagline?.te || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateDesign((d) => { if (!d.tagline) d.tagline = {}; d.tagline.te = val; });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-line text-xs font-semibold"
                />
              </div>

              {/* Font Size Ratio */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-bold">
                  <span>Responsive Tagline Scale</span>
                  <span className="font-mono text-primary">
                    {Math.round((currentDesign.tagline?.sizeRatio || 0.038) * 1000) / 10}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.025"
                  max="0.055"
                  step="0.001"
                  value={currentDesign.tagline?.sizeRatio ?? 0.038}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateDesign((d) => { if (!d.tagline) d.tagline = {}; d.tagline.sizeRatio = val; });
                  }}
                  className="w-full accent-primary"
                />
              </div>

              {/* Color */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-main">Tagline Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentDesign.tagline?.color || '#000000'}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateDesign((d) => { if (!d.tagline) d.tagline = {}; d.tagline.color = val; });
                    }}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-line bg-transparent"
                  />
                  <span className="text-[10px] font-mono font-bold">{currentDesign.tagline?.color}</span>
                </div>
              </div>

              {/* X / Y Position */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-main">Position X %</label>
                  <input
                    type="number"
                    min="15"
                    max="85"
                    value={currentDesign.tagline?.x ?? 50}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 50;
                      updateDesign((d) => { if (!d.tagline) d.tagline = {}; d.tagline.x = val; });
                    }}
                    className="px-2 py-1.5 rounded-xl border border-line text-xs font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-main">Position Y %</label>
                  <input
                    type="number"
                    min="30"
                    max="95"
                    value={currentDesign.tagline?.y ?? 83}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 83;
                      updateDesign((d) => { if (!d.tagline) d.tagline = {}; d.tagline.y = val; });
                    }}
                    className="px-2 py-1.5 rounded-xl border border-line text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. LOWER SECTION: LIVE DEVICE PREVIEWS & ALL CATEGORIES STRIP ── */}
      <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 shadow-2xs flex flex-col gap-6">
        {/* Header & Device Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h3 className="font-display font-black text-base text-main">
              Live Device Scalability Preview
            </h3>
            <p className="text-xs text-muted font-medium">
              Validate normalized responsive proportions and sharpness across real phone, tablet, and desktop widths.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-base border border-line rounded-2xl overflow-x-auto">
            {DEVICE_VIEWPORTS.map((vp) => {
              const Icon = vp.icon;
              const active = previewViewport.id === vp.id;
              return (
                <button
                  key={vp.id}
                  type="button"
                  onClick={() => setPreviewViewport(vp)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-muted hover:text-main'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{vp.label}px</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scaled Device Card Preview Display */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-4 bg-base/50 rounded-3xl border border-line/60">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold text-muted uppercase">
              {previewViewport.name} Card Simulation
            </span>
            <div
              style={{ width: `${previewViewport.width}px` }}
              className="aspect-square rounded-2xl overflow-hidden shadow-lg border border-line"
            >
              <CategoryCardRenderer
                design={currentDesign}
                language={languagePreview}
                forcedCardWidth={previewViewport.width}
              />
            </div>
            <span className="text-[10px] text-muted font-mono">
              Card Width: {previewViewport.width}px (1:1 Square)
            </span>
          </div>

          <div className="flex flex-col gap-2 max-w-xs text-xs text-muted">
            <span className="font-bold text-main">Responsive Rendering Rules:</span>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li>Artwork scales proportionally at exactly <span className="font-mono font-bold text-main">{currentDesign.artwork?.width}%</span> of card width.</li>
              <li>Heading text dynamically renders at <span className="font-mono font-bold text-main">{Math.round(previewViewport.width * (currentDesign.heading?.sizeRatio || 0.088))}px</span>.</li>
              <li>Tagline text scales to <span className="font-mono font-bold text-main">{Math.round(previewViewport.width * (currentDesign.tagline?.sizeRatio || 0.038))}px</span>.</li>
              <li>Zero distortion, zero clipping, and locked 1:1 square aspect ratio.</li>
            </ul>
          </div>
        </div>

        {/* All 6 Categories Comparative Preview Strip */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-muted tracking-wider">
              All 6 Categories Consistency Strip
            </span>
            <span className="text-[11px] text-muted">Click any card to switch</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORY_KEYS.map((key) => {
              const info = CATEGORY_INFO[key];
              const isSelected = activeCategory === key;
              const designToRender = isSelected
                ? currentDesign
                : (initialDesigns[key]?.draftConfig || initialDesigns[key]?.publishedConfig || DEFAULT_CATEGORY_DESIGNS[key]);

              return (
                <div
                  key={key}
                  onClick={() => handleCategoryClick(key)}
                  className={`flex flex-col gap-1.5 cursor-pointer group ${
                    isSelected ? 'scale-[1.03]' : 'opacity-80 hover:opacity-100'
                  } transition-all duration-200`}
                >
                  <div
                    className={`aspect-square rounded-2xl overflow-hidden shadow-2xs border-2 transition-all ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-line group-hover:border-line-strong'
                    }`}
                  >
                    <CategoryCardRenderer
                      design={designToRender}
                      language={languagePreview}
                      forcedCardWidth={160}
                    />
                  </div>
                  <span className={`text-[11px] font-bold text-center truncate ${
                    isSelected ? 'text-primary' : 'text-main'
                  }`}>
                    {info.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MODAL 1: CONFIRM PUBLISH ── */}
      {showPublishModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
              <Send className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-display font-black text-lg text-main">
                Publish this Home category design to customers?
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                This will immediately promote your current design to <span className="font-bold text-main">Published</span> status and update the <span className="font-bold text-main">{CATEGORY_INFO[activeCategory]?.name}</span> card on the Customer Home page for all users.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                disabled={isPublishing}
                className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-muted hover:bg-base cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-extrabold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPublishing ? 'Publishing...' : 'Confirm & Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: RESET DESIGN ── */}
      {showResetModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-display font-black text-lg text-main">
                Reset Category Design
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Choose which version of <span className="font-bold text-main">{CATEGORY_INFO[activeCategory]?.name}</span> you would like to reset your draft to. (This will not affect customers until published).
              </p>
            </div>

            <div className="flex flex-col gap-2 my-1">
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-line hover:bg-base cursor-pointer">
                <input
                  type="radio"
                  name="resetTarget"
                  value="published"
                  checked={resetTarget === 'published'}
                  onChange={() => setResetTarget('published')}
                  className="accent-primary"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-main">Reset to Currently Published Design</span>
                  <span className="text-[11px] text-muted">Revert any unsaved changes back to what is currently live.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl border border-line hover:bg-base cursor-pointer">
                <input
                  type="radio"
                  name="resetTarget"
                  value="default"
                  checked={resetTarget === 'default'}
                  onChange={() => setResetTarget('default')}
                  className="accent-primary"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-main">Reset to Factory Default Design</span>
                  <span className="text-[11px] text-muted">Restore original Jinkzo baseline artwork, positions, and colors.</span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-muted hover:bg-base cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleResetConfirm}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-xs cursor-pointer"
              >
                Reset Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: UNSAVED CHANGES CONFIRMATION ── */}
      {showUnsavedModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-display font-black text-lg text-main">
                You have unsaved changes
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                You have unsaved edits in <span className="font-bold text-main">{CATEGORY_INFO[activeCategory]?.name}</span>. Switching categories now will discard any unsaved draft modifications. Continue without saving?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => {
                  setShowUnsavedModal(false);
                  setPendingCategorySwitch(null);
                }}
                className="px-4 py-2 rounded-xl border border-line text-xs font-bold text-muted hover:bg-base cursor-pointer"
              >
                Keep Editing
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowUnsavedModal(false);
                  if (pendingCategorySwitch) {
                    loadCategory(pendingCategorySwitch);
                    setPendingCategorySwitch(null);
                  }
                }}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-xs cursor-pointer"
              >
                Discard & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL (Full simulation of Customer Home display) ── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <h3 className="font-display font-black text-base text-main">
                  Customer Home Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="w-8 h-8 rounded-full hover:bg-base flex items-center justify-center text-muted hover:text-main cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted">
              Live simulation of <span className="font-bold text-main">{CATEGORY_INFO[activeCategory]?.name}</span> card on customer home screen.
            </p>

            <div className="w-full max-w-[280px] mx-auto aspect-square rounded-2xl overflow-hidden shadow-md border border-line">
              <CategoryCardRenderer
                design={currentDesign}
                language={languagePreview}
                className="w-full h-full"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-extrabold shadow-xs cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
