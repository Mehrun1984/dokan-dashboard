'use server';

import { cookies } from 'next/headers';

const WP_API_URL = process.env.NEXT_PUBLIC_WP_API_URL?.trim();

function buildWpAuthUrl(path: string) {
  if (!WP_API_URL) {
    return null;
  }

  const base = WP_API_URL.endsWith('/') ? WP_API_URL.slice(0, -1) : WP_API_URL;
  return `${base}${path}`;
}

function parseJsonSafely(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractApiMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function createRequestId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractErrorCauseDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return {};
  }

  const cause = (error as Error & { cause?: unknown }).cause;
  if (!cause || typeof cause !== 'object') {
    return {};
  }

  const typedCause = cause as {
    code?: unknown;
    errno?: unknown;
    syscall?: unknown;
    hostname?: unknown;
    address?: unknown;
    port?: unknown;
  };

  return {
    causeCode: typedCause.code,
    causeErrno: typedCause.errno,
    causeSyscall: typedCause.syscall,
    causeHostname: typedCause.hostname,
    causeAddress: typedCause.address,
    causePort: typedCause.port,
  };
}

function logOtpFailure(action: 'send-otp' | 'verify-otp', details: Record<string, unknown>) {
  console.error(`[auth:${action}]`, details);
}

export async function sendOtpAction(phone: string) {
  const requestId = createRequestId();
  const targetUrl = buildWpAuthUrl('/core-plugin/v1/auth/send-otp');

  if (!targetUrl) {
    logOtpFailure('send-otp', {
      requestId,
      reason: 'missing_wp_api_url',
      env: process.env.NODE_ENV,
    });
    return { error: 'تنظیمات ارتباط با سرور کامل نیست.' };
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
      cache: 'no-store',
    });

    const rawText = await res.text();
    const data = parseJsonSafely(rawText);

    if (!res.ok) {
      logOtpFailure('send-otp', {
        requestId,
        reason: 'upstream_http_error',
        status: res.status,
        statusText: res.statusText,
        targetHost: new URL(targetUrl).host,
        responseSnippet: rawText.slice(0, 400),
      });
      return { error: extractApiMessage(data, 'خطا در ارسال پیامک.') };
    }

    return { success: true };
  } catch (error) {
    logOtpFailure('send-otp', {
      requestId,
      reason: 'network_or_runtime_exception',
      targetHost: new URL(targetUrl).host,
      targetUrl,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      ...extractErrorCauseDetails(error),
    });
    return { error: 'خطا در ارتباط با سرور.' };
  }
}

export async function verifyOtpAction(phone: string, code: string) {
  const requestId = createRequestId();
  const targetUrl = buildWpAuthUrl('/core-plugin/v1/auth/verify-otp');

  if (!targetUrl) {
    logOtpFailure('verify-otp', {
      requestId,
      reason: 'missing_wp_api_url',
      env: process.env.NODE_ENV,
    });
    return { error: 'تنظیمات ارتباط با سرور کامل نیست.' };
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
      cache: 'no-store',
    });

    const rawText = await res.text();
    const data = parseJsonSafely(rawText) as { token?: unknown; user_id?: unknown; message?: unknown } | null;

    if (!res.ok) {
      logOtpFailure('verify-otp', {
        requestId,
        reason: 'upstream_http_error',
        status: res.status,
        statusText: res.statusText,
        targetHost: new URL(targetUrl).host,
        responseSnippet: rawText.slice(0, 400),
      });
      return { error: extractApiMessage(data, 'کد نامعتبر است.') };
    }

    if (!data || typeof data.token !== 'string' || !data.token.trim()) {
      logOtpFailure('verify-otp', {
        requestId,
        reason: 'invalid_upstream_payload',
        targetHost: new URL(targetUrl).host,
        responseSnippet: rawText.slice(0, 400),
      });
      return { error: 'پاسخ نامعتبر از سرور دریافت شد.' };
    }

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
    logOtpFailure('verify-otp', {
      requestId,
      reason: 'network_or_runtime_exception',
      targetHost: new URL(targetUrl).host,
      targetUrl,
      errorName: error instanceof Error ? error.name : 'unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      ...extractErrorCauseDetails(error),
    });
    return { error: 'خطا در ارتباط با سرور.' };
  }
}

export async function logoutVendor() {
  const cookieStore = await cookies();
  cookieStore.delete('vendor_jwt');
}