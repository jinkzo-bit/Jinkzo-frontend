import { create } from 'zustand';

import { API_BASE } from '../config/api';

// ── Storage keys ──────────────────────────────────────────────────────────────
const ACCESS_KEY  = 'qb-auth-token';
const REFRESH_KEY = 'qb-refresh-token';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: localStorage.getItem(ACCESS_KEY) !== null,
  token: localStorage.getItem(ACCESS_KEY),
  loading: false,
  error: null,

  // ── Silent token refresh ────────────────────────────────────────────────────
  refreshAccessToken: async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.token) {
        localStorage.setItem(ACCESS_KEY, data.token);
        set({ token: data.token });
      }
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_KEY, data.refreshToken);
      }
      return data.token || null;
    } catch (err) {
      console.error('[Auth] Silent token refresh failed:', err);
      return null;
    }
  },

  // ── Session initialisation on page load ────────────────────────────────────
  initialize: async () => {
    const sessionToken = localStorage.getItem(ACCESS_KEY);
    if (!sessionToken) {
      set({ user: null, token: null, isAuthenticated: false, loading: false });
      return;
    }

    set({ loading: true });
    try {
      let res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });

      if (res.status === 401) {
        const newToken = await get().refreshAccessToken();
        if (newToken) {
          res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${newToken}` },
          });
        }
      }

      if (res.ok) {
        const data = await res.json();
        const currentToken = get().token || sessionToken;
        set({ user: data, token: currentToken, isAuthenticated: true, error: null });
      } else if (res.status === 401 || res.status === 403) {
        get().logout();
      } else {
        set({ error: 'Session initialization failed', isAuthenticated: false });
      }
    } catch (err) {
      console.error('Session initialization failed:', err);
      set({ error: err.message, isAuthenticated: false });
    } finally {
      set({ loading: false });
    }
  },

  // ── Email + Password Login ──────────────────────────────────────────────────
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      if (data.token) localStorage.setItem(ACCESS_KEY, data.token);
      if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      set({ user: data.user, token: data.token || 'cookie-auth-active', isAuthenticated: true, error: null });

      try {
        const { useFavoriteStore } = await import('./favoriteStore');
        useFavoriteStore.getState().fetchUserFavourites();
      } catch (e) {
        console.error('Failed to fetch favourites on login:', e);
      }

      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, message: err.message };
    } finally {
      set({ loading: false });
    }
  },

  // ── Send signup OTP for email verification ───────────────────────────────────
  sendSignupOtp: async (email, name) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/send-signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
      return { success: true, message: data.message };
    } catch (err) {
      set({ error: err.message });
      return { success: false, message: err.message };
    } finally {
      set({ loading: false });
    }
  },

  // ── Register ────────────────────────────────────────────────────────────────
  register: async (name, email, password, phone, role = 'customer', partnerDetails = {}) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, role, ...partnerDetails }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      if (data.token) localStorage.setItem(ACCESS_KEY, data.token);
      if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      set({ user: data.user, token: data.token || 'cookie-auth-active', isAuthenticated: true, error: null });

      try {
        const { useFavoriteStore } = await import('./favoriteStore');
        useFavoriteStore.getState().fetchUserFavourites();
      } catch (e) {
        console.error('Failed to fetch favourites on register:', e);
      }

      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, message: err.message };
    } finally {
      set({ loading: false });
    }
  },

  // ── Logout ──────────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      const token = get().token;
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken }),
      });
    } catch (e) {
      console.error('Logout request failed:', e);
    }

    try {
      const { useCartStore } = await import('./cartStore');
      useCartStore.getState().clearCart();
    } catch (e) {
      console.error('Failed to clear cart on logout:', e);
    }

    try {
      const { useFavoriteStore } = await import('./favoriteStore');
      useFavoriteStore.getState().clearFavourites();
    } catch (e) {
      console.error('Failed to clear favourites on logout:', e);
    }

    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  submitKyc: async (documentType, documentNumber) => {
    const { isAuthenticated, token } = get();
    if (!isAuthenticated) return { success: false, message: 'Not authenticated' };

    set({ loading: true });
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/auth/kyc`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ documentType, documentNumber }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'KYC submission failed');

      set({ user: data, error: null });
      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, message: err.message };
    } finally {
      set({ loading: false });
    }
  },

  addAddress: async (address) => {
    const { user, isAuthenticated, token } = get();
    if (!user || !isAuthenticated) return { success: false, message: 'Not authenticated' };

    set({ loading: true });
    try {
      const currentAddresses = user.addresses || [];
      let updatedAddresses = [...currentAddresses];
      if (address.isDefault) {
        updatedAddresses = updatedAddresses.map(addr => ({ ...addr, isDefault: false }));
      }
      updatedAddresses.push({ ...address });

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ addresses: updatedAddresses }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add address');

      set({ user: data, error: null });
      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, message: err.message };
    } finally {
      set({ loading: false });
    }
  },

  deleteAddress: async (addressId) => {
    const { user, isAuthenticated, token } = get();
    if (!user || !isAuthenticated) return;

    try {
      const updatedAddresses = (user.addresses || []).filter(
        addr => String(addr._id) !== String(addressId)
      );

      if (updatedAddresses.length > 0 && !updatedAddresses.some(addr => addr.isDefault)) {
        updatedAddresses[0].isDefault = true;
      }

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ addresses: updatedAddresses }),
      });

      if (res.ok) {
        const data = await res.json();
        set({ user: data });
      }
    } catch (err) {
      console.error('Delete address failed:', err);
    }
  },

  editAddress: async (addressId, updatedAddr) => {
    const { user, isAuthenticated, token } = get();
    if (!user || !isAuthenticated) return { success: false, message: 'Not authenticated' };

    try {
      const updatedAddresses = (user.addresses || []).map(addr =>
        String(addr._id) === String(addressId)
          ? { ...addr, ...updatedAddr }
          : addr
      );

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ addresses: updatedAddresses }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update address');
      set({ user: data });
      return { success: true };
    } catch (err) {
      console.error('Edit address failed:', err);
      return { success: false, message: err.message };
    }
  },

  // ── Send Login OTP (Phone passwordless login step 1) ──────────────────
  sendLoginOtp: async (phone) => {
    try {
      const res = await fetch(`${API_BASE}/auth/send-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'Failed to send OTP.' };
      return { success: true };
    } catch {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  },

  // ── Verify Login OTP (Phone passwordless login step 2) ────────────────
  verifyLoginOtp: async (phone, otp) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'OTP verification failed.');
      if (data.token) localStorage.setItem(ACCESS_KEY, data.token);
      if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      set({ user: data.user, token: data.token || 'cookie-auth-active', isAuthenticated: true, error: null });
      return { success: true };
    } catch (err) {
      set({ error: err.message });
      return { success: false, message: err.message };
    } finally {
      set({ loading: false });
    }
  },

  // ── Smart Forgot Password ──────────────────────────────────────────
  forgotPasswordSmart: async (identifier) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password-smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'Failed to send OTP.' };
      // Returns { success, channel: 'email'|'sms', maskedTo }
      return { success: true, channel: data.channel, maskedTo: data.maskedTo };
    } catch {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  },

  // ── Verify Smart OTP (for forgot-password-smart) ───────────────────
  verifySmartOtp: async (identifier, otp, channel) => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-smart-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, otp, channel }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'OTP verification failed.' };
      return { success: true, resetToken: data.resetToken };
    } catch {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  },

  // ── Forgot Password (Email) ─────────────────────────────────────────────────
  forgotPassword: async (email) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'Failed to send OTP.' };
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  },

  // ── Forgot Password (Phone / SMS) ───────────────────────────────────────────
  forgotPasswordPhone: async (phone) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'Failed to send OTP.' };
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  },

  // ── Verify Email OTP ────────────────────────────────────────────────────────
  verifyOtp: async (email, otp) => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'OTP verification failed.' };
      return { success: true, resetToken: data.resetToken };
    } catch (err) {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  },

  // ── Verify Phone OTP ────────────────────────────────────────────────────────
  verifyPhoneOtp: async (phone, otp) => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'OTP verification failed.' };
      return { success: true, resetToken: data.resetToken };
    } catch (err) {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  },

  // ── Reset Password ───────────────────────────────────────────────────────────
  resetPassword: async (resetToken, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.message || 'Password reset failed.' };
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  },
}));
