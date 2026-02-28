'use client';

import type { ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { AuthProvider } from '@/hooks/use-auth';
import { NavigationProvider } from '@/hooks/use-navigation';
import {
  UIPreferencesProvider,
  useUIPreferences,
  type AccentPalette,
  type ThemeMode,
} from '@/hooks/use-ui-preferences';

type AccentTokens = {
  colorPrimary: string;
  colorPrimaryHover: string;
  colorPrimaryActive: string;
  colorPrimaryBg: string;
};

const accentTokens: Record<AccentPalette, AccentTokens> = {
  ocean: {
    colorPrimary: '#0f4cde',
    colorPrimaryHover: '#1a5ff0',
    colorPrimaryActive: '#0b3fb7',
    colorPrimaryBg: '#e8efff',
  },
  mint: {
    colorPrimary: '#0f9a8a',
    colorPrimaryHover: '#13b2a0',
    colorPrimaryActive: '#0a7f72',
    colorPrimaryBg: '#e7faf6',
  },
  sunset: {
    colorPrimary: '#c95f27',
    colorPrimaryHover: '#db733a',
    colorPrimaryActive: '#ac4d1d',
    colorPrimaryBg: '#fff2e9',
  },
  rose: {
    colorPrimary: '#d03f6c',
    colorPrimaryHover: '#e45681',
    colorPrimaryActive: '#b3335b',
    colorPrimaryBg: '#ffecf3',
  },
};

const modeSurfaceMap: Record<ThemeMode, { base: string; elevated: string; text: string; tableHeader: string }> = {
  light: {
    base: '#f4f6fb',
    elevated: '#ffffff',
    text: '#12203b',
    tableHeader: '#f1f5ff',
  },
  dark: {
    base: '#090f1d',
    elevated: '#111a2e',
    text: '#dbe6ff',
    tableHeader: '#18233d',
  },
};

function ThemedConfigProvider({ children }: { children: ReactNode }) {
  const { mode, accent } = useUIPreferences();
  const selectedAccent = accentTokens[accent];
  const selectedSurface = modeSurfaceMap[mode];

  return (
    <ConfigProvider
      theme={{
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          ...selectedAccent,
          borderRadius: 14,
          borderRadiusLG: 20,
          fontSize: 15,
          fontSizeSM: 13,
          fontSizeLG: 16,
          lineHeight: 1.55,
          lineHeightLG: 1.45,
          colorBgBase: selectedSurface.base,
          colorBgContainer: selectedSurface.elevated,
          colorTextBase: selectedSurface.text,
          fontFamily:
            'var(--font-body), ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
        components: {
          Modal: {
            borderRadiusLG: 24,
          },
          Table: {
            headerBg: selectedSurface.tableHeader,
            rowHoverBg: mode === 'dark' ? '#152342' : '#f7faff',
            borderColor: mode === 'dark' ? '#24375d' : '#d8e2f2',
          },
          Card: {
            colorBorderSecondary: mode === 'dark' ? '#24375d' : '#d8e2f2',
            borderRadiusLG: 20,
          },
          Input: {
            borderRadius: 12,
          },
          Select: {
            borderRadius: 12,
          },
          Button: {
            borderRadius: 12,
            fontWeight: 600,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NavigationProvider>
        <UIPreferencesProvider>
          <ThemedConfigProvider>{children}</ThemedConfigProvider>
        </UIPreferencesProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}
