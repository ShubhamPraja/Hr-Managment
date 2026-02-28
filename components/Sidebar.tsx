'use client';

import React, { useMemo } from 'react';
import { usePathname, useRouter } from '../hooks/use-navigation';
import { useAuth } from '../hooks/use-auth';
import { HR_MODULE_NAV_ITEMS, HR_MODULE_PATHS } from '@/constants/hr-module-catalog';

interface SidebarProps {
  isOpen: boolean;
  isDesktop: boolean;
  onToggle: () => void;
}

const modulePathSet = new Set<string>(HR_MODULE_PATHS);
const baseMenuItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
    roles: ['Admin', 'HR', 'Employee'],
  },
  {
    path: '/employees',
    label: 'Employees',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    roles: ['Admin', 'HR'],
  },
  {
    path: '/attendance',
    label: 'Attendance',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    roles: ['Admin', 'HR', 'Employee'],
  },
  {
    path: '/leave',
    label: 'Leave Management',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    roles: ['Admin', 'HR', 'Employee'],
  },
  {
    path: '/payroll',
    label: 'Payroll',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    roles: ['Admin', 'HR', 'Employee'],
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    roles: ['Admin'],
  },
];
const allMenuItems = [...baseMenuItems, ...HR_MODULE_NAV_ITEMS];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isDesktop, onToggle }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const filteredItems = useMemo(
    () => allMenuItems.filter((item) => user && item.roles.includes(user.role)),
    [user]
  );

  const coreItems = useMemo(
    () => filteredItems.filter((item) => !modulePathSet.has(item.path)),
    [filteredItems]
  );
  const suiteItems = useMemo(
    () => filteredItems.filter((item) => modulePathSet.has(item.path)),
    [filteredItems]
  );

  const isExpanded = isDesktop ? isOpen : true;
  const sidebarWidth = isDesktop ? (isOpen ? 'w-72' : 'w-24') : 'w-72';
  const sidebarTranslate = isDesktop ? 'translate-x-0' : isOpen ? 'translate-x-0' : '-translate-x-full';

  const renderItem = (
    item: (typeof allMenuItems)[number],
    index: number
  ) => {
    const isActive = pathname === item.path;

    return (
      <button
        key={item.path}
        title={!isExpanded ? item.label : undefined}
        onClick={() => {
          router.push(item.path as any);
          if (!isDesktop) onToggle();
        }}
        style={{ animationDelay: `${index * 30}ms` }}
        className={`group relative w-full motion-pop ${
          isExpanded ? 'px-3.5 py-2.5' : 'px-2 py-2.5'
        } rounded-2xl transition-transform duration-300 ${
          isActive ? 'translate-x-[2px]' : 'hover:translate-x-[2px]'
        }`}
      >
        <span
          className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
            isActive
              ? 'bg-[linear-gradient(130deg,var(--accent-600),var(--accent-700))] shadow-[0_12px_24px_-16px_var(--accent-700)]'
              : 'bg-transparent group-hover:bg-[color:color-mix(in_srgb,var(--surface-3)_76%,transparent)]'
          }`}
        />

        {!isActive && (
          <span className="absolute inset-y-2 left-0 w-1 rounded-r-full scale-y-0 bg-[var(--accent-500)] transition-transform duration-300 group-hover:scale-y-100" />
        )}

        <span className="relative flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
              isActive
                ? 'bg-white/20 text-white ring-1 ring-white/30'
                : 'text-[var(--color-text-soft)] group-hover:text-[var(--color-text)]'
            }`}
          >
            <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d={item.icon} />
            </svg>
          </span>
          {isExpanded && (
            <span className={`ui-nav-label ${isActive ? 'text-white' : 'text-[var(--color-text)]'}`}>
              {item.label}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:static md:z-20 md:shrink-0 ${sidebarWidth} ${sidebarTranslate}`}
    >
      <div className="panel-surface relative m-2 flex h-[calc(100%-1rem)] flex-col overflow-hidden rounded-[1.9rem] md:m-3 md:h-[calc(100%-1.5rem)]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_14%_10%,color-mix(in_srgb,var(--accent-200)_42%,transparent),transparent_42%),radial-gradient(circle_at_92%_2%,color-mix(in_srgb,var(--accent-100)_30%,transparent),transparent_38%)]" />

        <div className="relative p-4 md:p-5 flex items-center gap-3 overflow-hidden">
          <div className="h-11 w-11 bg-[linear-gradient(140deg,var(--accent-500),var(--accent-700))] rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-[0_12px_24px_-16px_var(--accent-700)]">
            Z
          </div>
          {isExpanded && (
            <div className="leading-tight motion-fade">
              <p className="font-heading ui-section-title text-[var(--color-text)] whitespace-nowrap">ZingHR Orbit</p>
              <p className="ui-overline text-[var(--color-text-soft)]">People Suite</p>
            </div>
          )}
          {!isDesktop && (
            <button
              onClick={onToggle}
              className="ml-auto h-8 w-8 rounded-lg panel-soft text-[var(--color-text-soft)] hover:text-[var(--color-text)]"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {isExpanded && user && (
          <div className="mx-4 mb-3 rounded-2xl glass-accent px-3 py-3 motion-rise">
            <p className="ui-label text-[var(--color-text-soft)] mb-1">Logged in</p>
            <p className="text-[0.92rem] font-semibold text-[var(--color-text)] truncate">{user.name}</p>
            <p className="text-[0.8rem] text-[var(--color-text-soft)]">{user.role}</p>
          </div>
        )}

        <nav className="relative flex-1 px-3 pb-4 overflow-y-auto scrollbar-hide">
          {isExpanded && (
            <p className="px-3 pb-1 pt-2 ui-overline text-[var(--color-text-soft)]">
              Core
            </p>
          )}
          <div className="space-y-1">
            {coreItems.map((item, index) => renderItem(item, index))}
          </div>

          {suiteItems.length > 0 && (
            <>
              {isExpanded && (
                <p className="px-3 pb-1 pt-5 ui-overline text-[var(--color-text-soft)]">
                  HR Suite
                </p>
              )}
              <div className="space-y-1">
                {suiteItems.map((item, index) => renderItem(item, coreItems.length + index))}
              </div>
            </>
          )}
        </nav>

        <div className="relative p-4 mt-auto">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl panel-soft text-[var(--color-text-soft)] hover:text-[var(--color-text)] transition-all"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${
                isDesktop && !isOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {isExpanded && <span className="text-[0.8rem] font-semibold">{isDesktop ? 'Collapse Sidebar' : 'Close Menu'}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
