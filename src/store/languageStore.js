import { create } from 'zustand';
import { translations } from '../constants/translations';

const STORAGE_KEY = 'jinkzo_language';

export const useLanguageStore = create((set, get) => ({
  language: (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || 'en',

  setLanguage: (lang) => {
    const validLang = lang === 'te' ? 'te' : 'en';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, validLang);
      } catch (e) {
        console.warn('Failed to persist language in localStorage', e);
      }
    }
    set({ language: validLang });
  },

  t: (key, fallback = '') => {
    const currentLang = get().language || 'en';
    const dict = translations[currentLang] || translations.en;
    if (dict && dict[key] !== undefined) {
      return dict[key];
    }
    // Fallback to English dictionary if key is missing in selected language
    if (translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }
    return fallback || key;
  }
}));

export const useTranslation = () => {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const t = useLanguageStore((state) => state.t);

  return { language, setLanguage, t };
};
