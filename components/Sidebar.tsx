'use client';


import React from 'react';
import { usePathname, useRouter } from '../hooks/use-navigation';
import { useAuth } from '../hooks/use-auth';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const allMenuItems = [
    { path: '/', label: 'Dashboard', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z', roles: ['Admin', 'HR', 'Employee'] },
    { path: '/employees', label: 'Employees', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', roles: ['Admin', 'HR'] },
    { path: '/attendance', label: 'Attendance', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['Admin', 'HR', 'Employee'] },
    { path: '/leave', label: 'Leave Management', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', roles: ['Admin', 'HR', 'Employee'] },
    { path: '/payroll', label: 'Payroll', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['Admin', 'HR', 'Employee'] },
    { path: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', roles: ['Admin'] },
  ];

  const filteredItems = allMenuItems.filter(item => user && item.roles.includes(user.role));

  return (
    <aside className={`bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
      <div className="p-6 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-lg shadow-blue-200">Z</div>
        {isOpen && <span className="font-bold text-xl text-slate-800 tracking-tight whitespace-nowrap">ZingHR <span className="text-blue-600">Clone</span></span>}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {filteredItems.map((item) => (
          <button
            key={item.path}
            onClick={() => router.push(item.path as any)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
              pathname === item.path 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-100 translate-x-1' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <svg 
              className={`w-6 h-6 flex-shrink-0 ${pathname === item.path ? 'text-white' : 'text-slate-400'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {isOpen && <span className="font-semibold">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto">
        <button 
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className={`w-5 h-5 transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
