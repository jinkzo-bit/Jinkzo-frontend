export const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export const SOCKET_URL = (() => {
  const customSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (customSocketUrl && typeof customSocketUrl === 'string' && customSocketUrl.trim()) {
    const trimmed = customSocketUrl.trim();
    try {
      return new URL(trimmed).origin;
    } catch {
      return trimmed.replace(/\/api\/?$/, '');
    }
  }

  const rawApiBase = import.meta.env.VITE_API_BASE;
  if (rawApiBase && typeof rawApiBase === 'string' && rawApiBase.trim()) {
    const trimmed = rawApiBase.trim();
    try {
      return new URL(trimmed).origin;
    } catch {
      const stripped = trimmed.replace(/\/api\/?$/, '');
      if (stripped) return stripped;
    }
  }

  return 'http://localhost:5000';
})();
