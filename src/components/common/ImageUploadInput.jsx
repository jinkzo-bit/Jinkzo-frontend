import React, { useState, useEffect, useRef } from 'react';
import { Upload, Link as LinkIcon, Image as ImageIcon, X, AlertCircle, CheckCircle2, Loader2, ArrowDownToLine } from 'lucide-react';
import { getImageUrl, handleImageError, importImageFromUrl } from '../../utils/uploadUtil';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

/**
 * Standard format bytes helper
 */
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Reusable Image Upload & URL Input Component
 *
 * @param {string} label - Form field label (e.g. "Dish Image *")
 * @param {string} imageType - 'food' | 'restaurant' | 'category' | 'banner' | 'avatar' | 'default'
 * @param {string} value - Current/initial image URL or backend path (e.g. "/uploads/img-1.jpg" or "https://...")
 * @param {File|null} file - Selected File object (controlled by parent)
 * @param {Function} onFileChange - Callback when file changes: (file: File | null) => void
 * @param {Function} onUrlChange - Callback when URL string changes: (url: string) => void
 * @param {Function} onSourceTypeChange - Callback when active mode changes: (type: 'file' | 'url') => void
 * @param {string} error - External validation error message from parent
 * @param {boolean} required - Whether image is required
 * @param {string} previewShape - 'square' | 'round' | 'wide' (default: 'square')
 * @param {string} helperText - Optional extra hint text
 */
export default function ImageUploadInput({
  label = 'Image',
  imageType = 'default',
  value = '',
  file = null,
  onFileChange,
  onUrlChange,
  onSourceTypeChange,
  error = '',
  required = false,
  previewShape = 'square',
  helperText = '',
}) {
  const fileInputRef = useRef(null);
  const [sourceType, setSourceType] = useState('file');
  const [urlInput, setUrlInput] = useState('');
  const [fileError, setFileError] = useState('');
  const [urlError, setUrlError] = useState('');
  const [blobPreview, setBlobPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importMetadata, setImportMetadata] = useState(null);

  // Sync urlInput when value changes from external source (e.g. edit modal)
  useEffect(() => {
    if (value && typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      setUrlInput(value);
    }
  }, [value]);

  // Manage blob preview lifecycle
  useEffect(() => {
    if (file && file instanceof File) {
      const objUrl = URL.createObjectURL(file);
      setBlobPreview(objUrl);
      return () => {
        URL.revokeObjectURL(objUrl);
      };
    } else {
      setBlobPreview(null);
    }
  }, [file]);

  const handleModeSwitch = (newMode) => {
    setSourceType(newMode);
    onSourceTypeChange?.(newMode);
    setFileError('');
    setUrlError('');
  };

  // ── File Selection & Validation ───────────────────────────────────────────
  const processSelectedFile = (selected) => {
    setFileError('');
    if (!selected) return;

    // 1. File type check
    const extension = selected.name.split('.').pop()?.toLowerCase();
    const isMimeValid = selected.type ? ALLOWED_MIME_TYPES.includes(selected.type) : true;
    const isExtValid = extension ? ALLOWED_EXTENSIONS.includes(extension) : false;

    if (!isMimeValid && !isExtValid) {
      setFileError('Please select a valid JPG, PNG, WebP, or GIF image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. File size check (5MB limit)
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFileError('Image is too large. Maximum allowed size is 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Valid file
    onFileChange?.(selected);
  };

  const handleFileInputChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processSelectedFile(selected);
    }
  };

  const handleClearFile = () => {
    onFileChange?.(null);
    setBlobPreview(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processSelectedFile(droppedFile);
    }
  };

  // ── URL Import Handling ───────────────────────────────────────────────────
  const handleImportUrl = async (urlToImport) => {
    const targetUrl = (urlToImport || urlInput || '').trim();
    setUrlError('');
    setImportSuccess(false);
    setImportMetadata(null);

    if (!targetUrl) {
      setUrlError('Please enter an image URL.');
      return;
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      setUrlError('Image URL must start with http:// or https://');
      return;
    }

    setIsImporting(true);
    try {
      const res = await importImageFromUrl(targetUrl);
      if (res && res.imageUrl) {
        onUrlChange?.(res.imageUrl);
        setImportSuccess(true);
        setImportMetadata({
          contentType: res.contentType,
          size: res.size
        });
        setUrlError('');
      }
    } catch (err) {
      setUrlError(err.message || 'Unable to import image. Please check the URL.');
      setImportSuccess(false);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearUrl = () => {
    setUrlInput('');
    setUrlError('');
    setImportSuccess(false);
    setImportMetadata(null);
    onUrlChange?.('');
  };

  // Determine current active preview
  const hasSelectedFile = Boolean(file && blobPreview);
  const hasExistingImage = Boolean(value && !hasSelectedFile);

  let previewSrc = null;
  let previewBadge = null;

  if (sourceType === 'file') {
    if (hasSelectedFile) {
      previewSrc = blobPreview;
      previewBadge = 'New File';
    } else if (hasExistingImage) {
      previewSrc = getImageUrl(value, imageType);
      previewBadge = 'Current Image';
    }
  } else {
    const activeUrl = urlInput.trim() || value;
    if (activeUrl) {
      previewSrc = getImageUrl(activeUrl, imageType);
      previewBadge = importSuccess ? 'Imported' : 'URL Preview';
    } else if (hasExistingImage) {
      previewSrc = getImageUrl(value, imageType);
      previewBadge = 'Current Image';
    }
  }

  const roundedClass = previewShape === 'round' ? 'rounded-full' : previewShape === 'wide' ? 'rounded-2xl aspect-video' : 'rounded-2xl';

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Header Label & Mode Selector Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-[11px] uppercase font-extrabold tracking-wider text-muted px-0.5 flex items-center gap-1">
          {label}
        </label>

        {/* Tab Toggle: Upload from Device vs Use Image URL */}
        <div className="inline-flex p-0.5 bg-base/80 border border-line-strong rounded-xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => handleModeSwitch('file')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              sourceType === 'file'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted hover:text-main'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>Upload from Device</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSwitch('url')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              sourceType === 'url'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted hover:text-main'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>Use Image URL</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-surface/50 border border-line-strong rounded-2xl">
        {/* Preview Container */}
        <div className={`relative ${previewShape === 'wide' ? 'w-24 h-16 sm:w-28 sm:h-18' : 'w-16 h-16 sm:w-18 sm:h-18'} ${roundedClass} overflow-hidden border border-line-strong bg-base flex-shrink-0 flex items-center justify-center shadow-xs`}>
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => handleImageError(e, imageType)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted/40 p-1">
              <ImageIcon className="w-6 h-6 mb-0.5" />
              <span className="text-[9px] font-bold uppercase tracking-tight">No image</span>
            </div>
          )}

          {previewBadge && previewSrc && (
            <span className="absolute bottom-0 inset-x-0 bg-black/75 backdrop-blur-xs text-[8px] font-bold text-white text-center py-0.5 truncate px-1">
              {previewBadge}
            </span>
          )}
        </div>

        {/* Dynamic Controls based on sourceType */}
        <div className="flex-1 w-full flex flex-col gap-2 min-w-0">
          {sourceType === 'file' ? (
            /* ── METHOD A: UPLOAD FROM DEVICE ─────────────────────────── */
            <div className="flex flex-col gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileInputChange}
                className="hidden"
                id={`file-input-${label.replace(/\s+/g, '-').toLowerCase()}`}
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex flex-wrap items-center gap-2 p-2 border-2 border-dashed rounded-xl transition-all ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-line-strong hover:border-muted/50 bg-base/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{file ? 'Change Image' : 'Choose Image'}</span>
                </button>

                {file ? (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs text-main font-medium truncate" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-[10px] text-muted font-mono flex-shrink-0">
                      ({formatFileSize(file.size)})
                    </span>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      title="Remove selected file"
                      className="p-1 text-muted hover:text-red-500 rounded-md transition-colors ml-auto cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-muted truncate">
                    JPG, PNG, WebP, GIF (Max 5MB)
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* ── METHOD B: USE IMAGE URL (SERVER-SIDE IMPORT) ─────────── */
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    placeholder="Paste image URL (https://...)"
                    value={urlInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUrlInput(val);
                      setUrlError('');
                      setImportSuccess(false);
                      onUrlChange?.(val.trim());
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleImportUrl();
                      }
                    }}
                    disabled={isImporting}
                    className={`w-full bg-base border ${
                      urlError ? 'border-red-500/70 focus:border-red-500' : 'border-line-strong focus:border-primary'
                    } rounded-xl pl-3 pr-8 py-2 text-xs text-main font-medium outline-none transition-colors placeholder:text-muted/60 disabled:opacity-50`}
                  />
                  {urlInput && !isImporting ? (
                    <button
                      type="button"
                      onClick={handleClearUrl}
                      title="Clear URL"
                      className="absolute right-2 p-1 text-muted hover:text-main rounded-md transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => handleImportUrl()}
                  disabled={isImporting || !urlInput.trim()}
                  className="flex items-center gap-1 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>Import</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status & Feedback */}
              {isImporting && (
                <span className="text-[11px] text-primary font-medium flex items-center gap-1 animate-pulse px-0.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Downloading and importing to Jinkzo storage...
                </span>
              )}

              {importSuccess && !urlError && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 font-bold px-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Image imported successfully</span>
                  {importMetadata?.size ? (
                    <span className="text-[10px] text-muted font-normal">
                      ({formatFileSize(importMetadata.size)})
                    </span>
                  ) : null}
                </div>
              )}

              <span className="text-[10px] text-muted/80 px-0.5">
                Tip: From Google Images, right-click the image and choose "Copy image address", then paste it here and click Import.
              </span>
            </div>
          )}

          {/* Feedback & Error Messages */}
          {fileError ? (
            <span className="text-[11px] text-red-500 font-medium flex items-center gap-1 px-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {fileError}
            </span>
          ) : urlError ? (
            <span className="text-[11px] text-red-500 font-medium flex items-center gap-1 px-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {urlError}
            </span>
          ) : error ? (
            <span className="text-[11px] text-red-500 font-medium flex items-center gap-1 px-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </span>
          ) : helperText ? (
            <span className="text-[10px] text-muted px-1">{helperText}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

