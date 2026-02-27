'use client';

import type { ReactNode } from 'react';
import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation';

type Pathname =
  | '/'
  | '/employees'
  | '/attendance'
  | '/leave'
  | '/payroll'
  | '/settings'
  | '/register';

export function NavigationProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function usePathname() {
  return (useNextPathname() || '/') as Pathname;
}

export function useRouter() {
  const router = useNextRouter();

  return {
    push: (path: Pathname) => router.push(path),
    replace: (path: Pathname) => router.replace(path),
    back: () => router.back(),
  };
}
