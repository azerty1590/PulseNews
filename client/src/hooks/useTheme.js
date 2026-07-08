import { useState, useEffect, useCallback } from 'react';

const KEY = 'newsboard:theme';

// Resolve the initial theme: saved preference → system preference → dark.
function initialTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

// Apply the theme to <html data-theme> and the color-scheme meta.
function apply(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme; // native form controls / scrollbars
}

export function useTheme() {
  const [theme, setThemeState] = useState(initialTheme);

  useEffect(() => { apply(theme); }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
