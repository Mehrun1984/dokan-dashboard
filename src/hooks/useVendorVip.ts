'use client';

import { useEffect, useState } from 'react';
import { vendorVipService } from '@/services/vendorVip.service';

export function useVendorVip() {
  const [isVip, setIsVip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    vendorVipService
      .getCurrentStatus()
      .then((status) => {
        if (!cancelled) setIsVip(status.is_vip);
      })
      .catch(() => {
        if (!cancelled) setIsVip(false);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { isVip, isLoading };
}
