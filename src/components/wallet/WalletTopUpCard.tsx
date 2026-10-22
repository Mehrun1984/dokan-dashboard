'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import {
  createWalletTopUp,
  getWalletErrorCode,
  getWalletErrorMessage,
  getWalletTopUpStatus,
} from '@/services/wallet.service';
import type { WalletOverview } from '@/services/wallet.service';

const MIN_TOPUP = 2_000_000;
const STEP = 5_000_000;
const PRESETS = [5_000_000, 10_000_000, 30_000_000, 50_000_000];
const PENDING_STORAGE_KEY = 'vendor_wallet_pending_topup';
const FAILED_TOPUP_STATUSES = ['cancelled', 'failed', 'refunded'];

interface PendingTopUp {
  orderId: number;
  amount: number;
  paymentUrl?: string;
  createdAt: number;
}

interface WalletTopUpCardProps {
  overview: WalletOverview | null;
  isLoading: boolean;
  loadError: string | null;
  onRefresh: () => Promise<void> | void;
}

function formatToman(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return value.toLocaleString('fa-IR', { maximumFractionDigits: 0 });
}

function readPendingTopUp(): PendingTopUp | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PendingTopUp>;
    const orderId = Number(parsed.orderId);
    const amount = Number(parsed.amount);
    const createdAt = Number(parsed.createdAt) || Date.now();

    if (!Number.isFinite(orderId) || orderId <= 0 || !Number.isFinite(amount) || amount <= 0) {
      window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
      return null;
    }

    if (Date.now() - createdAt > 24 * 60 * 60 * 1000) {
      window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
      return null;
    }

    return {
      orderId,
      amount,
      paymentUrl: typeof parsed.paymentUrl === 'string' ? parsed.paymentUrl : undefined,
      createdAt,
    };
  } catch {
    return null;
  }
}

function storePendingTopUp(pending: PendingTopUp): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
  } catch {
    return;
  }
}

function clearStoredPendingTopUp(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(PENDING_STORAGE_KEY);
  } catch {
    return;
  }
}

export default function WalletTopUpCard({
  overview,
  isLoading,
  loadError,
  onRefresh,
}: WalletTopUpCardProps) {
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingTopUp | null>(null);
  const [isCheckingPending, setIsCheckingPending] = useState(false);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const pendingInitRef = useRef(false);

  const minAmount = Math.max(MIN_TOPUP, Math.ceil(Number(overview?.min_topup) || 0));
  const serverMax = Number(overview?.max_amount);
  const maxAmount = Number.isFinite(serverMax) && serverMax > 0
    ? serverMax
    : Number.POSITIVE_INFINITY;
  const maxKnown = Boolean(overview) && Number.isFinite(maxAmount);
  const topUpAvailable = Boolean(overview) && overview?.topup_available !== false;
  const numericAmount = Number(amount);
  const selectedPreset = PRESETS.find((preset) => preset === numericAmount) ?? null;

  const clampAmount = useCallback((value: number) => {
    const upperBound = Number.isFinite(maxAmount) ? Math.max(minAmount, maxAmount) : value;
    return Math.min(Math.max(value, minAmount), upperBound);
  }, [maxAmount, minAmount]);

  const amountError = useMemo(() => {
    if (!amount) {
      return submitAttempted ? 'مبلغ شارژ را وارد کنید.' : null;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return 'مبلغ وارد شده معتبر نیست.';
    }

    if (numericAmount < minAmount) {
      return `حداقل مبلغ شارژ ${formatToman(minAmount)} تومان است.`;
    }

    if (maxKnown && numericAmount > maxAmount) {
      return `حداکثر مبلغ شارژ ${formatToman(maxAmount)} تومان است.`;
    }

    return null;
  }, [amount, maxAmount, maxKnown, minAmount, numericAmount, submitAttempted]);

  const showAmountError = (amountTouched || submitAttempted) && Boolean(amountError);

  const checkPendingStatus = useCallback(async (target: PendingTopUp, attempt = 0) => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }

    setApiError(null);
    setIsCheckingPending(true);

    try {
      const status = await getWalletTopUpStatus(target.orderId);

      if (!mountedRef.current) {
        return;
      }

      if (status.credited) {
        clearStoredPendingTopUp();
        setPending(null);
        setApiError(null);
        setSuccessMessage(
          `مبلغ ${formatToman(target.amount)} تومان با موفقیت به کیف پول شما اضافه شد.`
        );
        await onRefresh();
        return;
      }

      if (status.paid && attempt < 3) {
        pollTimeoutRef.current = setTimeout(() => {
          void checkPendingStatus(target, attempt + 1);
        }, 2000);
        return;
      }

      if (FAILED_TOPUP_STATUSES.includes(status.status)) {
        clearStoredPendingTopUp();
        setPending(null);
        setApiError('پرداخت انجام نشد یا لغو شد. در صورت کسر مبلغ، با پشتیبانی تماس بگیرید.');
        return;
      }

      const updatedPending = {
        ...target,
        paymentUrl: status.payment_url || target.paymentUrl,
      };

      storePendingTopUp(updatedPending);
      setPending(updatedPending);

      if (status.paid) {
        setApiError('پرداخت انجام شده است و کیف پول در حال شارژ است. لطفاً دوباره وضعیت را بررسی کنید.');
      }
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      if (getWalletErrorCode(error) === 'topup_not_found') {
        clearStoredPendingTopUp();
        setPending(null);
        setApiError(getWalletErrorMessage(error));
        return;
      }

      setPending(target);
      setApiError(getWalletErrorMessage(error));
    } finally {
      if (mountedRef.current) {
        setIsCheckingPending(false);
      }
    }
  }, [onRefresh]);

  useEffect(() => {
    mountedRef.current = true;

    if (!pendingInitRef.current) {
      pendingInitRef.current = true;
      const storedPending = readPendingTopUp();

      if (storedPending) {
        setPending(storedPending);
        void checkPendingStatus(storedPending);
      }
    }

    return () => {
      mountedRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [checkPendingStatus]);

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/[^\d]/g, '').slice(0, 12);
    setAmount(digits === '' ? '' : String(Number(digits)));
    setAmountTouched(false);
    setApiError(null);
    setSuccessMessage(null);
  };

  const handleStep = (direction: 1 | -1) => {
    if (!topUpAvailable || !maxKnown || isSubmitting) {
      return;
    }

    let nextAmount: number;

    if (numericAmount <= 0) {
      nextAmount = direction > 0 ? clampAmount(PRESETS[0]) : clampAmount(minAmount);
    } else {
      nextAmount = clampAmount(numericAmount + direction * STEP);
    }

    setAmount(String(nextAmount));
    setAmountTouched(true);
    setApiError(null);
    setSuccessMessage(null);
  };

  const handlePreset = (preset: number) => {
    if (!topUpAvailable || !maxKnown || isSubmitting) {
      return;
    }

    if (preset < minAmount || preset > maxAmount) {
      return;
    }

    setAmount(String(preset));
    setAmountTouched(true);
    setApiError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setApiError(null);
    setSuccessMessage(null);

    if (
      amountError ||
      !overview ||
      !topUpAvailable ||
      !maxKnown ||
      isSubmitting ||
      numericAmount < minAmount ||
      numericAmount > maxAmount
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const order = await createWalletTopUp(numericAmount);

      if (!order.payment_url) {
        setApiError('لینک پرداخت دریافت نشد. لطفاً دوباره تلاش کنید.');
        setIsSubmitting(false);
        return;
      }

      const nextPending: PendingTopUp = {
        orderId: order.order_id,
        amount: numericAmount,
        paymentUrl: order.payment_url,
        createdAt: Date.now(),
      };

      storePendingTopUp(nextPending);
      setPending(nextPending);
      window.location.assign(order.payment_url);
    } catch (error) {
      setApiError(getWalletErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  const handleResumePayment = () => {
    if (pending?.paymentUrl) {
      window.location.assign(pending.paymentUrl);
    }
  };

  const handleDismissPending = () => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }

    clearStoredPendingTopUp();
    setPending(null);
    setApiError(null);
  };

  const canDecrease = Boolean(overview) && topUpAvailable && numericAmount > minAmount && !isSubmitting;
  const canIncrease = Boolean(overview) && topUpAvailable && maxKnown && numericAmount < maxAmount && !isSubmitting;
  const canSubmit = Boolean(overview)
    && topUpAvailable
    && maxKnown
    && !isSubmitting
    && !amountError
    && numericAmount >= minAmount
    && numericAmount <= maxAmount;

  return (
    <section className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 flex items-center justify-center shrink-0">
          <Wallet size={22} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">افزایش موجودی کیف پول</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            مبلغ مورد نظر خود را انتخاب کنید یا مبلغ دلخواه را وارد کنید.
          </p>
        </div>
      </div>

      {pending && (
        <div
          aria-live="polite"
          className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/40"
        >
          <div className="flex items-start gap-3">
            <RefreshCw
              size={20}
              className={`mt-0.5 shrink-0 text-blue-600 dark:text-blue-300 ${isCheckingPending ? 'animate-spin' : ''}`}
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                شارژ {formatToman(pending.amount)} تومانی در انتظار تأیید
              </p>
              <p className="mt-1 text-xs leading-6 text-blue-800/80 dark:text-blue-200/80">
                اگر پرداخت را کامل نکرده‌اید، از دکمه «ادامه پرداخت» استفاده کنید. پس از پرداخت، چند لحظه بعد وضعیت را بررسی کنید.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {pending.paymentUrl && (
              <button
                type="button"
                onClick={handleResumePayment}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
              >
                ادامه پرداخت
              </button>
            )}
            <button
              type="button"
              onClick={() => void checkPendingStatus(pending)}
              disabled={isCheckingPending}
              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-60 dark:border-blue-900/60 dark:bg-gray-900 dark:text-blue-300 dark:hover:bg-gray-800"
            >
              {isCheckingPending ? 'در حال بررسی...' : 'بررسی وضعیت'}
            </button>
            <button
              type="button"
              onClick={handleDismissPending}
              disabled={isCheckingPending}
              className="rounded-lg px-3 py-2 text-xs font-medium text-blue-700/70 transition-colors hover:bg-blue-100/60 disabled:opacity-60 dark:text-blue-300/70 dark:hover:bg-blue-900/30"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p className="text-sm leading-6">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            تلاش دوباره
          </button>
        </div>
      )}

      {overview && !topUpAvailable && (
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm leading-6">
            پرداخت آنلاین در حال حاضر فعال نیست. لطفاً بعداً دوباره تلاش کنید.
          </p>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300"
        >
          <Check size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm leading-6">{successMessage}</p>
        </div>
      )}

      {apiError && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm leading-6">{apiError}</p>
        </div>
      )}

      {isLoading && !overview ? (
        <div className="mt-6 animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
          <div className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">مبالغ پیشنهادی</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              حداقل {formatToman(minAmount)} تومان
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PRESETS.map((preset) => {
              const isActive = selectedPreset === preset;
              const isDisabled = !overview
                || !topUpAvailable
                || !maxKnown
                || preset < minAmount
                || preset > maxAmount
                || isSubmitting;

              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  disabled={isDisabled}
                  aria-pressed={isActive}
                  aria-label={`${formatToman(preset)} تومان`}
                  title={isDisabled ? 'این مبلغ در محدوده مجاز نیست.' : undefined}
                  className={`relative rounded-xl border px-3 py-3 text-center transition-all ${
                    isActive
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-800 dark:hover:bg-blue-900/20'
                  } disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:opacity-60 dark:disabled:border-gray-800 dark:disabled:bg-gray-900/60 dark:disabled:text-gray-600`}
                >
                  {isActive && (
                    <span className="absolute end-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <span className="block text-sm font-bold">{formatToman(preset)}</span>
                  <span className="mt-0.5 block text-[11px] font-normal opacity-70">تومان</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor="wallet-topup-amount"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                مبلغ دلخواه (تومان)
              </label>
              {maxKnown && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  حداکثر {formatToman(maxAmount)} تومان
                </span>
              )}
            </div>

            <div className="flex items-stretch gap-2" dir="ltr">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                disabled={!canDecrease}
                aria-label="کاهش مبلغ"
                className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Minus size={20} />
              </button>

              <input
                id="wallet-topup-amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={amount}
                onChange={handleAmountChange}
                onBlur={() => setAmountTouched(true)}
                aria-invalid={showAmountError && Boolean(amountError)}
                aria-describedby={showAmountError && amountError ? 'wallet-topup-amount-error' : undefined}
                placeholder={formatToman(Math.max(minAmount, PRESETS[0]))}
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-lg font-bold text-gray-900 outline-none transition-all placeholder:text-base placeholder:font-normal placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />

              <button
                type="button"
                onClick={() => handleStep(1)}
                disabled={!canIncrease}
                aria-label="افزایش مبلغ"
                className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Plus size={20} />
              </button>
            </div>

            {showAmountError && amountError && (
              <p
                id="wallet-topup-amount-error"
                role="alert"
                className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400"
              >
                <AlertCircle size={14} className="shrink-0" />
                {amountError}
              </p>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">مبلغ قابل پرداخت</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {numericAmount > 0 ? formatToman(numericAmount) : '—'}{' '}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">تومان</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                aria-busy={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
              >
                {isSubmitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CreditCard size={18} />
                )}
                {isSubmitting ? 'در حال انتقال به درگاه...' : 'پرداخت و افزایش موجودی'}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
