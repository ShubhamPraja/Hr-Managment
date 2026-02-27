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
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');

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
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-8">
          <div className="relative">
            <div className="w-24 h-24 border-2 border-slate-100 rounded-full" />
            <div className="absolute top-0 w-24 h-24 border-t-2 border-blue-600 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-black text-2xl">
              Z
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-slate-800 font-black text-xl mb-1 tracking-tight">ZingHR Enterprise</h2>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">
              Initializing Secure Environment...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (dbStatus === 'error') {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="max-w-md w-full bg-white p-12 rounded-[2.5rem] border border-red-100 shadow-2xl">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 text-3xl font-bold">
            !
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4 text-center tracking-tight">System Offline</h2>

          <div className="bg-slate-50 rounded-2xl p-4 mb-8 border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Error Log:</p>
            <p className="text-xs text-red-600 font-mono break-all">{errorMessage}</p>
          </div>

          <div className="space-y-4 mb-10">
            <p className="text-sm font-bold text-slate-700">Storage Issues:</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              We encountered a critical error initializing the database driver. Please refresh or check
              your internet connection.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all active:scale-[0.98] shadow-2xl shadow-slate-200"
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
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-lg pointer-events-none">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Storage: MongoDB</span>
      </div>

      <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((value) => !value)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700">{children}</div>
        </main>
      </div>
    </div>
  );
}
