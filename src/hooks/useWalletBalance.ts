'use client';

import { useCallback, useEffect, useState } from 'react';
import { getWalletErrorMessage, getWalletOverview } from '@/services/wallet.service';

export function useWalletBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const overview = await getWalletOverview();
      const value = Number(overview.account.balance);
      setBalance(Number.isFinite(value) ? value : 0);
    } catch (err) {
      console.error('Failed to load wallet balance', err);
      setError(getWalletErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Refresh when the vendor comes back from the wallet page or another tab,
  // so a top-up is reflected without a full reload.
  useEffect(() => {
    const handleFocus = () => {
      void refresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh]);

  return { balance, isLoading, error, refresh };
}
