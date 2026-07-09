'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { vendorNavLinks } from '@/lib/navigation';
import { logoutVendor } from '@/app/actions/auth';
import { ChevronRight, ChevronLeft, Moon, Sun, LogOut } from 'lucide-react';
import { useDashboardTheme } from '@/providers/DashboardThemeProvider';
import { useDashboardStore } from '@/providers/DashboardStoreProvider';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { effectiveTheme, toggleTheme } = useDashboardTheme();
  const { shopName, isLoadingShopName } = useDashboardStore();

  const onLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logoutVendor();
      router.replace('/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside 
      className={`hidden md:flex flex-col fixed top-0 bottom-0 start-0 bg-white dark:bg-gray-900 border-e border-gray-200 dark:border-gray-800 transition-all duration-300 z-50 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header & Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800 gap-2">
        {!isCollapsed && (
          <div className="min-w-0">
            <span className="text-[11px] text-gray-500 dark:text-gray-400">فروشگاه</span>
            <p className="font-bold text-sm text-blue-600 dark:text-blue-300 truncate">
              {isLoadingShopName ? 'در حال بارگذاری...' : shopName}
            </p>
          </div>
        )}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-300"
          aria-label="تغییر حالت نمایش"
          title={effectiveTheme === 'dark' ? 'حالت روشن' : 'حالت شب'}
        >
          {effectiveTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-300"
        >
          {/* RTL logic: Collapsing means pushing to the right (ChevronRight) */}
          {isCollapsed ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {vendorNavLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center rounded-lg px-3 py-3 transition-colors ${
                isActive 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              } ${isCollapsed ? 'justify-center' : 'justify-start'}`}
            >
              <Icon size={22} className={isCollapsed ? '' : 'me-3'} />
              {!isCollapsed && <span>{link.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className={`w-full flex items-center rounded-lg px-3 py-3 transition-colors text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-70 ${
            isCollapsed ? 'justify-center' : 'justify-start'
          }`}
          title="خروج از حساب"
          aria-label="خروج از حساب"
        >
          <LogOut size={22} className={isCollapsed ? '' : 'me-3'} />
          {!isCollapsed && <span>{isLoggingOut ? 'در حال خروج...' : 'خروج از حساب'}</span>}
        </button>
      </div>
    </aside>
  );
}