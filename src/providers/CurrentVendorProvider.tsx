'use client';

import React, { createContext, useContext } from 'react';
import type { CurrentVendor } from '@/types/vendor';

const CurrentVendorContext = createContext<CurrentVendor | undefined>(undefined);

const EMPTY_VENDOR: CurrentVendor = {
  userId: null,
  name: '',
  roles: [],
  isVendor: false,
  isVendorStaff: false,
};

export function CurrentVendorProvider({
  vendor,
  children,
}: {
  vendor: CurrentVendor;
  children: React.ReactNode;
}) {
  return <CurrentVendorContext.Provider value={vendor}>{children}</CurrentVendorContext.Provider>;
}

export function useCurrentVendor() {
  return useContext(CurrentVendorContext) ?? EMPTY_VENDOR;
}
