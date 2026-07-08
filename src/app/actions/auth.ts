'use server';

import { cookies } from 'next/headers';

const WP_API_URL = process.env.NEXT_PUBLIC_WP_API_URL;

export async function sendOtpAction(phone: string) {
  try {
    const res = await fetch(`${WP_API_URL}/core-plugin/v1/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();
    if (!res.ok) return { error: data.message || 'خطا در ارسال پیامک.' };
    return { success: true };
  } catch (error) {
    return { error: 'خطا در ارتباط با سرور.' };
  }
}

export async function verifyOtpAction(phone: string, code: string) {
  try {
    const res = await fetch(`${WP_API_URL}/core-plugin/v1/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });

    const data = await res.json();
    if (!res.ok) return { error: data.message || 'کد نامعتبر است.' };

    // FIX: Await the cookies() function
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'vendor_jwt',
      value: data.token,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 Week
    });

    return { success: true, userId: data.user_id };
  } catch (error) {
    return { error: 'خطا در ارتباط با سرور.' };
  }
}

export async function logoutVendor() {
  // FIX: Await the cookies() function
  const cookieStore = await cookies();
  cookieStore.delete('vendor_jwt');
}