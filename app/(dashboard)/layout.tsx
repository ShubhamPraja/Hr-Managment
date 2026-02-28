'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Login from '@/components/Login';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const syncByViewport = (matches: boolean) => {
      setIsDesktop(matches);
      setIsSidebarOpen(matches);
    };

    syncByViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => syncByViewport(event.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const initApp = async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Connection Refused');
        }
        setDbStatus('connected');
      } catch (err: any) {
        setErrorMessage(err.message || 'Connection Refused');
        setDbStatus('error');
      }
    };

    void initApp();
  }, []);

  if (authLoading || dbStatus === 'connecting') {
    return (
      <div className="h-screen w-full flex items-center justify-center px-4">
        <div className="panel-surface rounded-[2.3rem] px-8 py-10 md:px-12 md:py-12 flex flex-col items-center gap-8 motion-pop">
          <div className="relative">
            <div className="w-24 h-24 border-2 border-[var(--border-soft)] rounded-full" />
            <div className="absolute top-0 w-24 h-24 border-t-2 border-[var(--accent-600)] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-[var(--accent-600)] font-black text-2xl">
              Z
            </div>
          </div>
          <div className="text-center">
            <h2 className="font-heading ui-title-md text-[var(--color-text)] font-black mb-1 tracking-tight">ZingHR Enterprise</h2>
            <p className="ui-overline text-[var(--color-text-soft)] animate-pulse">
              Initializing Secure Environment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (dbStatus === 'error') {
    return (
      <div className="h-screen w-full flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full panel-surface p-12 rounded-[2.5rem] motion-rise">
          <div className="w-20 h-20 bg-[color:color-mix(in_srgb,var(--danger-500)_16%,transparent)] text-[var(--danger-500)] rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl font-bold">
            !
          </div>
          <h2 className="font-heading ui-title-md font-black text-[var(--color-text)] mb-4 text-center tracking-tight">System Offline</h2>

          <div className="rounded-2xl p-4 mb-8 border border-[var(--border-soft)] bg-[var(--surface-2)]">
            <p className="ui-label text-[var(--color-text-soft)] mb-2">Error Log:</p>
            <p className="text-xs text-[var(--danger-500)] font-mono break-all">{errorMessage}</p>
          </div>

          <div className="space-y-4 mb-10">
            <p className="ui-subtitle font-semibold text-[var(--color-text)]">Storage Issues:</p>
            <p className="text-[0.82rem] text-[var(--color-text-soft)] leading-relaxed">
              We encountered a critical error initializing the database driver. Please refresh or check
              your internet connection.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-5 bg-[var(--accent-600)] text-white rounded-2xl font-black hover:bg-[var(--accent-700)] transition-all active:scale-[0.98]"
          >
            Retry Session
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="relative flex h-screen overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_8%_6%,color-mix(in_srgb,var(--accent-200)_26%,transparent),transparent_32%),radial-gradient(circle_at_100%_0%,color-mix(in_srgb,var(--accent-100)_18%,transparent),transparent_40%)]" />

      {!isDesktop && isSidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-900/45 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 px-3 py-1.5 panel-surface rounded-full pointer-events-none">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="ui-label text-[var(--color-text-soft)]">
          Storage: MongoDB
        </span>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        isDesktop={isDesktop}
        onToggle={() => setIsSidebarOpen((value) => !value)}
      />

      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          isSidebarOpen={isSidebarOpen}
          isDesktop={isDesktop}
          onMenuToggle={() => setIsSidebarOpen((value) => !value)}
        />
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-3 md:p-6 max-w-[92rem] mx-auto w-full motion-fade">{children}</div>
        </main>
      </div>
    </div>
  );
}
