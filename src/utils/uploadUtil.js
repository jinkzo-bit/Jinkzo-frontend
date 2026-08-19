import { useAuthStore } from '../store/authStore';
import { API_BASE } from '../config/api';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

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
    throw new Error('Invalid file format. Please select a valid image (JPG, PNG, WebP).');
  }
};

/**
 * Uploads a file to the backend and returns its generated URL.
 * Requires the user to be authenticated.
 *
 * @param {File} file - The file object to upload
 * @returns {Promise<string>} The URL of the uploaded image
 */
export const uploadFileToBackend = async (file) => {
  validateImageFile(file);

  const authState = useAuthStore.getState();
  const token = authState.token;
  if (!token && !authState.isAuthenticated) {
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
    if (!data.imageUrl) {
      throw new Error('Upload succeeded but no image URL was returned.');
    }
    return data.imageUrl;
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
    if (!data.imageUrl) {
      throw new Error('Upload succeeded but no image URL was returned.');
    }
    return data.imageUrl;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Upload timed out. Please try again.');
    }
    console.error('[PUBLIC UPLOAD] File upload error:', error.message);
    throw error;
  }
};
