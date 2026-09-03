import { useAuthStore } from '../store/authStore';
import { API_BASE } from '../config/api';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Standardized fallback image URLs by type
 */
export const FALLBACK_IMAGES = {
  food: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&h=400&q=80',
  menu: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&h=400&q=80',
  dish: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&h=400&q=80',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&h=400&q=80',
  grocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&h=400&q=80',
  meat: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&h=400&q=80',
  banner: '/assets/hero_delivery_banner.jpg',
  category: '/assets/cat_food.jpg',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200&q=80',
  default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&h=400&q=80'
};

/**
 * Gets the configured backend origin (e.g. http://localhost:5000, http://10.169.207.97:5000, or https://api.jinkzo.com)
 * Works consistently in localhost development, LAN mobile testing, production build, and deployed domains.
 * @returns {string}
 */
export const getBackendOrigin = () => {
  // 1. Explicit env variable override
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
  }

  // 2. Absolute API_BASE (e.g., https://api.jinkzo.com/api)
  if (API_BASE && (API_BASE.startsWith('http://') || API_BASE.startsWith('https://'))) {
    try {
      const parsed = new URL(API_BASE);
      if (
        typeof window !== 'undefined' &&
        parsed.origin !== window.location.origin &&
        !parsed.hostname.includes('localhost') &&
        !parsed.hostname.includes('127.0.0.1')
      ) {
        return parsed.origin;
      }
    } catch (e) {
      // ignore
    }
  }

  // 3. In local dev (Vite proxy active) or single-origin deployments,
  // return empty string so assets resolve relative to window.location.origin
  return '';
};

/**
 * Normalizes any image URL or upload path into a valid, browser-accessible URL.
 * Handles:
 * 1. Empty/null/undefined/file:// -> returns default fallback
 * 2. Blobs & Data URLs (from file picker previews) -> returns unchanged
 * 3. Absolute External URLs (https://..., http://...) -> returns unchanged directly
 * 4. Localhost / IP upload paths -> strips local host and converts to relative /uploads/... path
 * 5. Frontend public assets (/assets/...) -> returns unchanged
 * 6. Local uploads (/uploads/..., uploads/..., or bare filenames) -> returns relative /uploads/... path
 *
 * @param {string} url - The raw image path or URL
 * @param {string} type - 'food' | 'restaurant' | 'banner' | 'category' | 'avatar' | 'default'
 * @returns {string} Fully resolved, browser-accessible image URL
 */
export const getImageUrl = (url, type = 'default') => {
  const fallback = FALLBACK_IMAGES[type] || FALLBACK_IMAGES.default;

  if (!url || typeof url !== 'string') {
    return fallback;
  }

  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'none') {
    return fallback;
  }

  // Reject file:// or Windows/Unix disk paths safely
  if (trimmed.startsWith('file://') || /^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return fallback;
  }

  // 1. Data URLs & Blob URLs (for instant file picker previews)
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // 2. Fix accidental duplicate prefixes (e.g., http://localhost:5000/https://...)
  const httpIdx = trimmed.indexOf('http://');
  const httpsIdx = trimmed.indexOf('https://');
  if (httpsIdx > 0) {
    return trimmed.substring(httpsIdx);
  }
  if (httpIdx > 0 && !trimmed.startsWith('http://localhost') && !trimmed.startsWith('http://127.0.0.1')) {
    return trimmed.substring(httpIdx);
  }

  const backendOrigin = getBackendOrigin();

  // 3. Stored localhost / 127.0.0.1 / IP upload paths (e.g. http://localhost:5000/uploads/... or http://10.x.x.x:5000/uploads/...)
  // Dynamically normalize to relative /uploads/... path so mobile devices fetch via Vite proxy
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:\d+)?\/uploads\//i.test(trimmed)) {
    const relativePath = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:\d+)?/i, '');
    return backendOrigin ? `${backendOrigin}${relativePath}` : relativePath;
  }

  // 4. Absolute External HTTPS / HTTP URLs (https://images.unsplash.com/..., https://res.cloudinary.com/..., etc.)
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    if (trimmed.startsWith('http://localhost') || trimmed.startsWith('http://127.0.0.1')) {
      return fallback;
    }
    return trimmed;
  }

  // 5. Frontend public assets (e.g. /assets/cat_food.jpg)
  if (trimmed.startsWith('/assets/') || trimmed.startsWith('assets/')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }

  // 6. Backend uploaded images (/uploads/... or uploads/...)
  if (trimmed.startsWith('/uploads/')) {
    return backendOrigin ? `${backendOrigin}${trimmed}` : trimmed;
  }
  if (trimmed.startsWith('uploads/')) {
    return backendOrigin ? `${backendOrigin}/${trimmed}` : `/${trimmed}`;
  }

  // 7. Bare uploaded filenames (e.g. img-1781293812-123.jpg or image-123.jpg)
  if (trimmed.startsWith('img-') || trimmed.startsWith('image-')) {
    return backendOrigin ? `${backendOrigin}/uploads/${trimmed}` : `/uploads/${trimmed}`;
  }

  // 8. General relative path
  if (trimmed.startsWith('/')) {
    return backendOrigin ? `${backendOrigin}${trimmed}` : trimmed;
  }

  return backendOrigin ? `${backendOrigin}/uploads/${trimmed}` : `/uploads/${trimmed}`;
};

/**
 * Standard image error handler to replace broken images with safe fallbacks
 * and avoid infinite error firing loops.
 *
 * @param {Event} e - The image onError event
 * @param {string} type - 'food' | 'restaurant' | 'banner' | 'category' | 'avatar' | 'default'
 */
export const handleImageError = (e, type = 'default') => {
  if (!e || !e.target) return;
  if (e.target.dataset.errorHandled) return;

  e.target.dataset.errorHandled = 'true';
  const fallback = FALLBACK_IMAGES[type] || FALLBACK_IMAGES.default;
  e.target.src = fallback;
};

/**
 * Validates a file before sending to upload API
 * @param {File} file
 */
const validateImageFile = (file) => {
  if (!file) {
    throw new Error('No image file selected.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image file is too large. Maximum allowed size is 5MB.');
  }
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('Invalid file format. Please select a valid image (JPG, PNG, WebP, GIF).');
  }
};

/**
 * Uploads a file to the backend and returns its generated URL.
 * Requires the user to be authenticated.
 *
 * @param {File} file - The file object to upload
 * @returns {Promise<string>} The URL of the uploaded image
 */
export const uploadFileToBackend = async (file, customToken = null) => {
  validateImageFile(file);

  const authState = useAuthStore.getState();
  const token = customToken || authState.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
  if (!token) {
    throw new Error('You must be logged in to upload images.');
  }

  const formData = new FormData();
  formData.append('image', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

  try {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    const returnedUrl = data.imageUrl || data.url || (data.filename ? `/uploads/${data.filename}` : null);
    if (!returnedUrl) {
      throw new Error('Upload succeeded but no image URL was returned.');
    }
    return returnedUrl;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Upload timed out. Please try again with a smaller file or a faster connection.');
    }
    console.error('[UPLOAD] File upload error:', error.message);
    throw error;
  }
};

/**
 * Uploads a file publicly to the backend (e.g. during partner registration).
 * No authentication token required.
 *
 * @param {File} file - The file object to upload
 * @returns {Promise<string>} The URL of the uploaded image
 */
export const uploadPublicFileToBackend = async (file) => {
  validateImageFile(file);

  const formData = new FormData();
  formData.append('image', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

  try {
    const res = await fetch(`${API_BASE}/upload/public`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Public upload failed with status ${res.status}`);
    }

    const data = await res.json();
    const returnedUrl = data.imageUrl || data.url || (data.filename ? `/uploads/${data.filename}` : null);
    if (!returnedUrl) {
      throw new Error('Upload succeeded but no image URL was returned.');
    }
    return returnedUrl;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Upload timed out. Please try again.');
    }
    console.error('[PUBLIC UPLOAD] File upload error:', error.message);
    throw error;
  }
};

/**
 * Imports a remote image URL into Jinkzo storage via backend proxy.
 * Resolves external hotlinking issues and SSRF safely.
 *
 * @param {string} url - The remote image URL (http/https)
 * @returns {Promise<{ imageUrl: string, contentType?: string, size?: number }>}
 */
export const importImageFromUrl = async (url) => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error('Please enter a valid image URL.');
  }

  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new Error('Image URL must start with http:// or https://');
  }

  const authState = useAuthStore.getState();
  const token = authState.token;
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout

  try {
    const res = await fetch(`${API_BASE}/upload/from-url`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url: trimmed }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Image import failed with status ${res.status}`);
    }

    const data = await res.json();
    const finalUrl = data.imageUrl || data.url;
    if (!finalUrl) {
      throw new Error('Image import succeeded but no storage URL was returned.');
    }

    return {
      imageUrl: finalUrl,
      url: finalUrl,
      contentType: data.contentType,
      size: data.size
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Image import timed out. The remote website took too long to respond.');
    }
    console.error('[IMPORT FROM URL] Error:', error.message);
    throw error;
  }
};

