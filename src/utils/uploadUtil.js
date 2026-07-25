import { useAuthStore } from '../store/authStore';

import { API_BASE } from '../config/api';

/**
 * Uploads a file to the backend and returns its generated URL.
 *
 * Requires the user to be authenticated. Cookie credentials automatically sent.
 *
 * @param {File} file - The file object to upload
 * @returns {Promise<string>} The URL of the uploaded image
 */
export const uploadFileToBackend = async (file) => {
  if (!file) throw new Error('No file provided');

  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  if (!isAuthenticated) {
    throw new Error('You must be logged in to upload files.');
  }

  const formData = new FormData();
  formData.append('image', file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

  try {
    const token = useAuthStore.getState().token;
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
      throw new Error(errorData.message || 'Image upload failed');
    }

    const data = await res.json();
    return data.imageUrl;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Upload timed out. Please try again with a smaller file or a faster connection.', { cause: error });
    }
    console.error('[UPLOAD] File upload error:', error.message);
    throw error;
  }
};

/**
 * Uploads a file publicly to the backend (e.g. during signup).
 * No authentication token required.
 *
 * @param {File} file - The file object to upload
 * @returns {Promise<string>} The URL of the uploaded image
 */
export const uploadPublicFileToBackend = async (file) => {
  if (!file) throw new Error('No file provided');

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
      throw new Error(errorData.message || 'Image upload failed');
    }

    const data = await res.json();
    return data.imageUrl;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Upload timed out. Please try again.', { cause: error });
    }
    console.error('[PUBLIC UPLOAD] File upload error:', error.message);
    throw error;
  }
};
