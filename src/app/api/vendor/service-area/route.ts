import { NextRequest, NextResponse } from 'next/server';

const WP_API_URL = process.env.NEXT_PUBLIC_WP_API_URL;

function buildWpServiceAreaUrl() {
  if (!WP_API_URL) {
    return null;
  }

  const base = WP_API_URL.endsWith('/') ? WP_API_URL.slice(0, -1) : WP_API_URL;
  return `${base}/core-plugin/v1/vendor/service-area`;
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
  const targetUrl = buildWpServiceAreaUrl();

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
      return NextResponse.json(payload ?? { error: 'Failed to fetch service area' }, { status: res.status });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('Vendor service area proxy GET failed', error);
    return NextResponse.json({ error: 'Failed to fetch vendor service area' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get('vendor_jwt')?.value;
  const targetUrl = buildWpServiceAreaUrl();

  if (!token) {
    return unauthorizedResponse();
  }

  if (!targetUrl) {
    return NextResponse.json({ error: 'WP API URL is not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();

    const res = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await res.text();
    const payload = parseJsonSafely(text);

    if (!res.ok) {
      return NextResponse.json(payload ?? { error: 'Failed to update service area' }, { status: res.status });
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error('Vendor service area proxy PUT failed', error);
    return NextResponse.json({ error: 'Failed to update vendor service area' }, { status: 500 });
  }
}
