'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { dokanService } from '@/services/dokan.service';

interface DashboardStoreContextValue {
  shopName: string;
  isLoadingShopName: boolean;
}

const DashboardStoreContext = createContext<DashboardStoreContextValue | undefined>(undefined);

const DEFAULT_SHOP_NAME = 'فروشگاه شما';

export function DashboardStoreProvider({ children }: { children: React.ReactNode }) {
  const [shopName, setShopName] = useState(DEFAULT_SHOP_NAME);
  const [isLoadingShopName, setIsLoadingShopName] = useState(true);

  useEffect(() => {
    const loadStoreSettings = async () => {
      try {
        const data = await dokanService.getStoreSettings();
        const resolvedName = (data?.store_name || '').trim();
        if (resolvedName) {
          setShopName(resolvedName);
        }
      } catch (error) {
        console.error('Failed to load store settings for header', error);
      } finally {
        setIsLoadingShopName(false);
      }
    };

    loadStoreSettings();
  }, []);

  const value = useMemo(
    () => ({ shopName, isLoadingShopName }),
    [shopName, isLoadingShopName]
  );

  return <DashboardStoreContext.Provider value={value}>{children}</DashboardStoreContext.Provider>;
}

export function useDashboardStore() {
  const context = useContext(DashboardStoreContext);

  if (!context) {
    throw new Error('useDashboardStore must be used inside DashboardStoreProvider.');
  }

  return context;
}
