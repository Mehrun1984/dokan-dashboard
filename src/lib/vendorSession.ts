import { cache } from 'react';
import type { CurrentVendor } from '@/types/vendor';

const WP_API_URL = process.env.NEXT_PUBLIC_WP_API_URL?.trim();

const EMPTY_VENDOR: CurrentVendor = {
  userId: null,
  name: '',
  roles: [],
  isVendor: false,
  isVendorStaff: false,
};

function buildWpUrl(path: string) {
  if (!WP_API_URL) {
    return null;
  }

  const base = WP_API_URL.endsWith('/') ? WP_API_URL.slice(0, -1) : WP_API_URL;
  return `${base}${path}`;
}

export const getCurrentVendor = cache(async (token: string): Promise<CurrentVendor> => {
  const targetUrl = buildWpUrl('/wp/v2/users/me?context=edit');

  if (!token || !targetUrl) {
    return EMPTY_VENDOR;
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return EMPTY_VENDOR;
    }

    const payload = await res.json().catch(() => null);
    const roles = Array.isArray(payload?.roles)
      ? payload.roles.filter((role: unknown): role is string => typeof role === 'string')
      : [];

    return {
      userId: Number.isFinite(Number(payload?.id)) ? Number(payload.id) : null,
      name: typeof payload?.name === 'string' ? payload.name : '',
      roles,
      isVendor: roles.includes('seller'),
      isVendorStaff: roles.includes('vendor_staff'),
    };
  } catch {
    return EMPTY_VENDOR;
  }
});
