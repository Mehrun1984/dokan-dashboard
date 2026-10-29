import axios from 'axios';
import apiClient from '@/lib/axios';

const NAMESPACE = '/core-plugin/v1/wallet';

export interface WalletAccount {
  id: number;
  user_id: number;
  currency: string;
  balance: string;
  balance_formatted: string;
  locked_balance: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface WalletOverview {
  account: WalletAccount;
  currency_label: string;
  min_topup: number;
  min_withdrawal: number;
  max_amount: number;
  topup_available: boolean;
  is_vendor: boolean;
}

export interface WalletTopUpOrder {
  order_id: number;
  amount: string;
  currency: string;
  payment_url: string;
}

export interface WalletTopUpStatus {
  order_id: number;
  status: string;
  paid: boolean;
  credited: boolean;
  amount: string;
  currency: string;
  payment_url: string;
}

export async function getWalletOverview(): Promise<WalletOverview> {
  const response = await apiClient.get<{ data: WalletOverview }>(NAMESPACE);
  return response.data.data;
}

export async function createWalletTopUp(amount: number, returnUrl?: string): Promise<WalletTopUpOrder> {
  const response = await apiClient.post<{ data: WalletTopUpOrder }>(`${NAMESPACE}/topup`, {
    amount,
    ...(returnUrl ? { return_url: returnUrl } : {}),
  });
  return response.data.data;
}

export async function getWalletTopUpStatus(orderId: number): Promise<WalletTopUpStatus> {
  const response = await apiClient.get<{ data: WalletTopUpStatus }>(`${NAMESPACE}/topup/${orderId}`);
  return response.data.data;
}

export function getWalletErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  const payload = error.response?.data as { code?: unknown } | undefined;
  return typeof payload?.code === 'string' ? payload.code : null;
}

export function getWalletErrorMessage(error: unknown): string {
  const messages: Record<string, string> = {
    invalid_amount: 'مبلغ وارد شده معتبر نیست.',
    amount_too_small: 'مبلغ وارد شده کمتر از حداقل مجاز است.',
    amount_too_large: 'مبلغ وارد شده بیشتر از سقف مجاز است.',
    woocommerce_inactive: 'درگاه پرداخت آنلاین در حال حاضر فعال نیست.',
    gateway_not_configured: 'درگاه پرداخت آنلاین پیکربندی نشده است.',
    gateway_error: 'خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش کنید.',
    gateway_unreachable: 'ارتباط با درگاه پرداخت برقرار نشد. لطفاً دوباره تلاش کنید.',
    invalid_user: 'خطا در شناسایی حساب کاربری. لطفاً دوباره وارد شوید.',
    order_failed: 'خطا در ایجاد سفارش پرداخت. لطفاً دوباره تلاش کنید.',
    wallet_error: 'خطا در انجام عملیات کیف پول. لطفاً دوباره تلاش کنید.',
    wallet_account_error: 'خطا در دسترسی به کیف پول. لطفاً دوباره تلاش کنید.',
    topup_not_found: 'سفارش شارژ کیف پول یافت نشد.',
    rest_no_route: 'سرویس کیف پول در حال حاضر در دسترس نیست.',
  };

  const code = getWalletErrorCode(error);
  if (code && messages[code]) {
    return messages[code];
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.';
    }

    if (error.response.status >= 500) {
      return 'خطا در سرور رخ داد. لطفاً کمی بعد دوباره تلاش کنید.';
    }
  }

  return 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';
}
