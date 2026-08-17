import { NextRequest, NextResponse } from 'next/server';

const WP_API_URL = process.env.NEXT_PUBLIC_WP_API_URL;

function buildWpStoreUrl() {
  if (!WP_API_URL) {
    return null;
  }

  const base = WP_API_URL.endsWith('/') ? WP_API_URL.slice(0, -1) : WP_API_URL;
  return `${base}/dokan/v1/store`;
}

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function parseJsonSafely(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('vendor_jwt')?.value;
  const targetUrl = buildWpStoreUrl();

  if (!token) {
    return unauthorizedResponse();
  }

  if (!targetUrl) {
    return NextResponse.json({ error: 'WP API URL is not configured' }, { status: 500 });
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

    const text = await res.text();
    const payload = parseJsonSafely(text);

    if (!res.ok) {
      return NextResponse.json(payload ?? { error: 'Failed to fetch store info' }, { status: res.status });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('Vendor store proxy GET failed', error);
    return NextResponse.json({ error: 'Failed to fetch vendor store info' }, { status: 500 });
  }
}