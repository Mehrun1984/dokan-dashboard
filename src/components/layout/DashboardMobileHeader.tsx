'use client';

import React from 'react';
import { useDashboardStore } from '@/providers/DashboardStoreProvider';

export default function DashboardMobileHeader() {
  const { shopName, isLoadingShopName } = useDashboardStore();

  return (
    <header className="md:hidden bg-white dark:bg-gray-900 h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">داشبورد فروشنده</p>
        <h1 className="font-bold text-base text-gray-800 dark:text-gray-100 truncate">
          {isLoadingShopName ? 'در حال بارگذاری...' : shopName}
        </h1>
      </div>
    </header>
  );
}
