import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  isDarkMode: localStorage.getItem('qb-theme') === 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = !state.isDarkMode;
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('qb-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('qb-theme', 'light');
    }
    return { isDarkMode: newTheme };
  }),
  initTheme: () => {
    const isDark = localStorage.getItem('qb-theme') === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ isDarkMode: isDark });
  }
}));
