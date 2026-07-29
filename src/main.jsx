import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { useAuthStore } from './store/authStore';
import { API_BASE } from './config/api';

// ────────────────────────────────────────────────────────
// Global Fetch Interceptor — Silent Token Refresh
// Access token: 30 min  |  Refresh token: 30 days
// On any 401 (non-auth route): silently calls /auth/refresh,
// saves the new tokens to localStorage, and retries the request.
// If refresh also fails (30-day token expired), clears session and
// redirects to /login.
// ────────────────────────────────────────────────────────
const ACCESS_KEY  = 'qb-auth-token';
const REFRESH_KEY = 'qb-refresh-token';

const originalFetch = window.fetch;
window.fetch = async function (resource, init = {}) {
  // Ensure credentials is set to 'include' so HttpOnly cookies are sent
  init.credentials = 'include';

  let response = await originalFetch(resource, init);

  // Skip auth routes to avoid infinite refresh loops
  const isAuthRoute = typeof resource === 'string' && (
    resource.includes('/auth/login') ||
    resource.includes('/auth/register') ||
    resource.includes('/auth/refresh') ||
    resource.includes('/auth/logout') ||
    resource.includes('/auth/forgot-password') ||
    resource.includes('/auth/verify-otp') ||
    resource.includes('/auth/reset-password')
  );

  // Silent Token Refresh: access token expired (401) → try refresh token
  if (response.status === 401 && !isAuthRoute) {
    try {
      const storedRefreshToken = localStorage.getItem(REFRESH_KEY);

      const refreshRes = await originalFetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData.token;
        const newRefreshToken = refreshData.refreshToken;

        if (newToken) {
          // Persist new access token (valid 30 min)
          localStorage.setItem(ACCESS_KEY, newToken);
          useAuthStore.setState({ token: newToken });

          if (!init.headers) init.headers = {};
          init.headers['Authorization'] = `Bearer ${newToken}`;
        }
        if (newRefreshToken) {
          // Persist rotated refresh token (valid 30 days)
          localStorage.setItem(REFRESH_KEY, newRefreshToken);
        }

        // Retry the original request with the fresh access token
        response = await originalFetch(resource, init);
      } else {
        // Refresh token expired/revoked → clear session and redirect to login
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } catch (refreshErr) {
      console.error('Silent token refresh failed:', refreshErr);
    }
  }

  return response;
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
