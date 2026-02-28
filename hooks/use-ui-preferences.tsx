'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type AccentPalette = 'ocean' | 'mint' | 'sunset' | 'rose';

type UIPreferencesState = {
  mode: ThemeMode;
  accent: AccentPalette;
};

type UIPreferencesContextValue = UIPreferencesState & {
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setAccent: (accent: AccentPalette) => void;
};

const STORAGE_KEY = 'hrms-ui-preferences';

const DEFAULT_PREFERENCES: UIPreferencesState = {
  mode: 'light',
  accent: 'ocean',
};

const ALLOWED_MODES: ThemeMode[] = ['light', 'dark'];
const ALLOWED_ACCENTS: AccentPalette[] = ['ocean', 'mint', 'sunset', 'rose'];

const UIPreferencesContext = createContext<UIPreferencesContextValue | null>(null);

const isThemeMode = (value: unknown): value is ThemeMode => ALLOWED_MODES.includes(value as ThemeMode);
const isAccentPalette = (value: unknown): value is AccentPalette =>
  ALLOWED_ACCENTS.includes(value as AccentPalette);

const readStoredPreferences = (): UIPreferencesState => {
  try {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(raw) as Partial<UIPreferencesState>;
    return {
      mode: isThemeMode(parsed.mode) ? parsed.mode : DEFAULT_PREFERENCES.mode,
      accent: isAccentPalette(parsed.accent) ? parsed.accent : DEFAULT_PREFERENCES.accent,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export function UIPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UIPreferencesState>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPreferences(readStoredPreferences());
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(preferences.mode === 'dark' ? 'theme-dark' : 'theme-light');

    if (preferences.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.style.colorScheme = preferences.mode;
    root.setAttribute('data-accent', preferences.accent);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const value = useMemo<UIPreferencesContextValue>(
    () => ({
      mode: preferences.mode,
      accent: preferences.accent,
      setMode: (mode) => setPreferences((prev) => ({ ...prev, mode })),
      toggleMode: () =>
        setPreferences((prev) => ({ ...prev, mode: prev.mode === 'dark' ? 'light' : 'dark' })),
      setAccent: (accent) => setPreferences((prev) => ({ ...prev, accent })),
    }),
    [preferences]
  );

  return <UIPreferencesContext.Provider value={value}>{children}</UIPreferencesContext.Provider>;
}

export function useUIPreferences() {
  const context = useContext(UIPreferencesContext);
  if (!context) {
    throw new Error('useUIPreferences must be used within UIPreferencesProvider');
  }
  return context;
}

