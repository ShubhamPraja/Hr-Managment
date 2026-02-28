'use client';

import type { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { AuthProvider } from '@/hooks/use-auth';
import { NavigationProvider } from '@/hooks/use-navigation';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 12,
          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Modal: {
            borderRadiusLG: 20,
          },
          Table: {
            headerBg: '#f8fafc',
          },
        },
      }}
    >
      <AuthProvider>
        <NavigationProvider>{children}</NavigationProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
