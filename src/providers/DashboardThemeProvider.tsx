'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';
type EffectiveTheme = 'light' | 'dark';

interface DashboardThemeContextValue {
  preference: ThemePreference;
  effectiveTheme: EffectiveTheme;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'vendor-dashboard-theme';

const DashboardThemeContext = createContext<DashboardThemeContextValue | undefined>(undefined);

function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>('light');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      setPreference(saved);
    }
    setSystemTheme(getSystemTheme());
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      setSystemTheme(media.matches ? 'dark' : 'light');
    };

    updateSystemTheme();
    media.addEventListener('change', updateSystemTheme);
    return () => media.removeEventListener('change', updateSystemTheme);
  }, []);

  const effectiveTheme: EffectiveTheme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', effectiveTheme === 'dark');

    // Ensure dark class does not leak once dashboard layout unmounts.
    return () => {
      root.classList.remove('dark');
    };
  }, [effectiveTheme]);

  const value = useMemo(
    () => ({
      preference,
      effectiveTheme,
      setPreference,
      toggleTheme: () => {
        setPreference((current) => {
          const currentEffective = current === 'system' ? systemTheme : current;
          return currentEffective === 'dark' ? 'light' : 'dark';
        });
      },
    }),
    [preference, effectiveTheme, systemTheme]
  );

  return <DashboardThemeContext.Provider value={value}>{children}</DashboardThemeContext.Provider>;
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext);

  if (!context) {
    throw new Error('useDashboardTheme must be used inside DashboardThemeProvider.');
  }

  return context;
}