import { NextRequest, NextResponse } from 'next/server';

const NESHAN_REVERSE_GEOCODE_URL = process.env.NESHAN_REVERSE_GEOCODE_URL ?? 'https://api.neshan.org/v5/reverse';
const NESHAN_API_KEY = "web.89984a660f2d4c178c040102d71ad703";

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

function parseCoordinate(input: unknown) {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null;
  }

  if (typeof input === 'string') {
    const value = Number(input.trim());
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

function buildAddress(payload: any) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (typeof payload.formatted_address === 'string' && payload.formatted_address.trim()) {
    return payload.formatted_address.trim();
  }

  const parts = [
    payload.route_name,
    payload.neighbourhood,
    payload.sub_locality,
    payload.locality,
    payload.city,
    payload.province,
  ]
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part) => String(part).trim());

  return parts.join('، ');
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('vendor_jwt')?.value;

  if (!token) {
    return unauthorizedResponse();
  }

  if (!NESHAN_API_KEY) {
    return NextResponse.json({ error: 'Neshan API key is not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const latitude = parseCoordinate(body?.latitude);
    const longitude = parseCoordinate(body?.longitude);

    if (latitude === null || longitude === null) {
      return NextResponse.json({ error: 'Invalid latitude/longitude' }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Latitude/longitude is out of range' }, { status: 400 });
    }

    const params = new URLSearchParams({
      lat: String(latitude),
      lng: String(longitude),
    });

    const targetUrl = `${NESHAN_REVERSE_GEOCODE_URL}?${params.toString()}`;

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Api-Key': NESHAN_API_KEY,
      },
      cache: 'no-store',
    });

    const text = await res.text();
    const payload = parseJsonSafely(text);

    if (!res.ok) {
      return NextResponse.json(payload ?? { error: 'Reverse geocoding failed' }, { status: res.status });
    }

    const address = buildAddress(payload);

    return NextResponse.json(
      {
        latitude: String(latitude),
        longitude: String(longitude),
        address,
      },
      { status: 200 }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error('Vendor reverse geocode proxy POST failed', error);
    return NextResponse.json({ error: 'Failed to reverse geocode location', detail }, { status: 500 });
  }
}
