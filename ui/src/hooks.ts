import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export function getPreferredTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore unavailable storage.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): Theme {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem('theme', theme);
  } catch {
    // Ignore unavailable storage.
  }
  return theme;
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => applyTheme(getPreferredTheme()));
  const toggle = useCallback(() => {
    setTheme(current => applyTheme(current === 'dark' ? 'light' : 'dark'));
  }, []);
  return [theme, toggle];
}

function getStoredPrivacy(): boolean {
  try {
    return localStorage.getItem('privacyMode') === 'on';
  } catch {
    return false;
  }
}

export function applyPrivacyMode(enabled: boolean): boolean {
  document.documentElement.classList.toggle('privacy-mode', enabled);
  try {
    localStorage.setItem('privacyMode', enabled ? 'on' : 'off');
  } catch {
    // Ignore unavailable storage.
  }
  return enabled;
}

export function usePrivacyMode(): [boolean, () => void] {
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => applyPrivacyMode(getStoredPrivacy()));
  const toggle = useCallback(() => {
    setPrivacyMode(current => applyPrivacyMode(!current));
  }, []);

  useEffect(() => {
    applyPrivacyMode(privacyMode);
  }, [privacyMode]);

  return [privacyMode, toggle];
}

export function getThemeColors() {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    text: isDark ? '#d1d5db' : '#374151',
    mutedText: isDark ? '#9ca3af' : '#6b7280',
    grid: isDark ? 'rgba(148, 163, 184, 0.18)' : '#e5e7eb',
    bg: isDark ? 'rgba(96, 165, 250, 0.16)' : 'rgba(59, 130, 246, 0.1)',
    border: isDark ? '#111827' : '#ffffff'
  };
}
